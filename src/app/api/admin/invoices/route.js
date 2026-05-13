import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"
import { getBillingPlan } from "@/lib/billingPlans"
import { createUniqueInvoiceNumber, getInvoicePlanLabel } from "@/lib/invoiceHelpers"

async function requireSuperAdmin(request) {
  const token = request.headers.get("authorization")?.split(" ")[1]
  if (!token) return null
  const decoded = verifyToken(token)
  if (!decoded) return null
  const admin = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { role: true } })
  if (admin?.role !== "SUPER_ADMIN") return null
  return decoded
}

// GET /api/admin/invoices
export async function GET(request) {
  try {
    const decoded = await requireSuperAdmin(request)
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const clientId = searchParams.get("clientId")

    const where = {}
    if (status) where.status = status
    if (clientId) where.clientId = clientId

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, storeName: true, plan: true } },
      },
    })

    return NextResponse.json({ data: invoices })
  } catch (error) {
    console.error("GET /api/admin/invoices error:", error)
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
  }
}

// POST /api/admin/invoices
export async function POST(request) {
  try {
    const decoded = await requireSuperAdmin(request)
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { clientId, amount, plan, dueDate, notes, bankInfo } = body

    if (!clientId || !amount || !dueDate) {
      return NextResponse.json({ error: "clientId, amount, dueDate are required" }, { status: 400 })
    }

    const client = await prisma.user.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })
    const invoicePlan = getBillingPlan(plan || client.plan).key

    const invoiceNumber = await createUniqueInvoiceNumber(prisma)

    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        invoiceNumber,
        amount: Number(amount),
        plan: invoicePlan,
        dueDate: new Date(dueDate),
        notes,
        bankInfo,
        status: "PENDING",
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, storeName: true, plan: true } },
      },
    })

    const planLabelFr = getInvoicePlanLabel(invoice.plan, "fr")
    const planLabelAr = getInvoicePlanLabel(invoice.plan, "ar")
    const dueLabelFr = new Date(dueDate).toLocaleDateString("fr-MA", { month: "long", year: "numeric" })
    const dueLabelAr = new Date(dueDate).toLocaleDateString("ar-MA", { month: "long", year: "numeric" })
    await prisma.notification.create({
      data: {
        userId:  clientId,
        type:    "SYSTEM",
        title:   `fr:Nouvelle facture - ${dueLabelFr}||ar:فاتورة جديدة - ${dueLabelAr}`,
        message: `fr:Facture N° ${invoiceNumber} — ${Number(amount)} DH (${planLabelFr}). Échéance: ${dueLabelFr}.||ar:فاتورة رقم ${invoiceNumber} — ${Number(amount)} درهم (${planLabelAr}). الاستحقاق: ${dueLabelAr}.`,
      },
    })

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error) {
    console.error("POST /api/admin/invoices error:", error)
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
  }
}
