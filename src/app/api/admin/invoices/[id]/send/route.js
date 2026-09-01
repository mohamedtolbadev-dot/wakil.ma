import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { getInvoicePlanLabel } from "@/lib/invoiceHelpers"
import { decryptAgentSecrets } from "@/lib/secretCrypto"
import { normalizePhone } from "@/lib/phone"

async function getSuperAdmin(request) {
  const token = request.headers.get("authorization")?.split(" ")[1]
  if (!token) return null
  const decoded = verifyToken(token)
  if (!decoded) return null
  const admin = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { role: true },
  })
  if (admin?.role !== "SUPER_ADMIN") return null
  return decoded
}

// POST /api/admin/invoices/[id]/send
// Sends only the WhatsApp text message. The PDF remains available inside the app.
export async function POST(request, { params }) {
  try {
    const decoded = await getSuperAdmin(request)
    if (!decoded) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams || {}
    if (!id) return NextResponse.json({ error: "Invoice ID required" }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const locale = body.locale?.startsWith("ar") ? "ar" : "fr"
    const isFr = locale === "fr"

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    })
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

    const clientPhone = normalizePhone(invoice.client?.phone)
    if (!clientPhone) {
      return NextResponse.json({ error: "Client has no phone number" }, { status: 400 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { agent: true },
    })
    const adminAgent = decryptAgentSecrets(adminUser?.agent)
    const whatsappConfig = {
      phoneId: process.env.SYSTEM_WA_PHONE_ID || process.env.WHATSAPP_PHONE_ID || adminAgent?.whatsappPhoneId,
      token: process.env.SYSTEM_WA_TOKEN || process.env.WHATSAPP_TOKEN || adminAgent?.whatsappToken,
    }

    if (!whatsappConfig.phoneId || !whatsappConfig.token) {
      return NextResponse.json(
        { error: "WhatsApp not configured for invoice sending" },
        { status: 503 }
      )
    }

    const dueDateLocale = new Date(invoice.dueDate).toLocaleDateString(
      isFr ? "fr-MA" : "ar-MA",
      { day: "numeric", month: "long", year: "numeric" }
    )
    const planLabel = getInvoicePlanLabel(invoice.plan, locale)

    let message
    if (isFr) {
      message = `Bonjour ${invoice.client.name}!\n\n`
      message += `Facture N: ${invoice.invoiceNumber}\n`
      message += `Boutique: ${invoice.client.storeName || "-"}\n`
      message += `Plan: ${planLabel}\n`
      message += `Montant: ${invoice.amount} DH\n`
      message += `Echeance: ${dueDateLocale}\n`
      if (invoice.notes) message += `\nNotes: ${invoice.notes}\n`
      if (invoice.bankInfo) message += `\nInformations de paiement:\n${invoice.bankInfo}\n`
      message += "\nLe PDF est disponible dans votre espace factures sur la plateforme."
    } else {
      message = `مرحبا ${invoice.client.name}!\n\n`
      message += `فاتورة رقم: ${invoice.invoiceNumber}\n`
      message += `المتجر: ${invoice.client.storeName || "-"}\n`
      message += `الخطة: ${planLabel}\n`
      message += `المبلغ: ${invoice.amount} درهم\n`
      message += `تاريخ الاستحقاق: ${dueDateLocale}\n`
      if (invoice.notes) message += `\nملاحظات: ${invoice.notes}\n`
      if (invoice.bankInfo) message += `\nمعلومات الدفع:\n${invoice.bankInfo}\n`
      message += "\nملف PDF متاح داخل صفحة الفواتير في المنصة."
    }

    const textResult = await sendWhatsAppMessage({
      phoneId: whatsappConfig.phoneId,
      token: whatsappConfig.token,
      to: clientPhone,
      message,
    })

    if (!textResult.success) {
      return NextResponse.json(
        { error: "Failed to send WhatsApp message", detail: textResult.error },
        { status: 500 }
      )
    }

    await prisma.invoice.update({
      where: { id },
      data: { whatsappSent: true },
    })

    const dueLabelFr = new Date(invoice.dueDate).toLocaleDateString("fr-MA", { month: "long", year: "numeric" })
    const dueLabelAr = new Date(invoice.dueDate).toLocaleDateString("ar-MA", { month: "long", year: "numeric" })
    await prisma.notification.create({
      data: {
        userId: invoice.clientId,
        type: "SYSTEM",
        title: `fr:Facture envoyee - ${dueLabelFr}||ar:تم إرسال فاتورتك - ${dueLabelAr}`,
        message:
          `fr:La facture N ${invoice.invoiceNumber} de ${invoice.amount} DH a ete envoyee sur WhatsApp. Le PDF est disponible dans votre espace factures.||` +
          `ar:تم إرسال الفاتورة رقم ${invoice.invoiceNumber} بمبلغ ${invoice.amount} درهم عبر واتساب. ملف PDF متاح داخل صفحة الفواتير في المنصة.`,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Invoice text sent via WhatsApp",
      pdfDelivery: "platform",
    })
  } catch (error) {
    console.error("POST /api/admin/invoices/[id]/send error:", error)
    return NextResponse.json({ error: "Failed to send invoice" }, { status: 500 })
  }
}
