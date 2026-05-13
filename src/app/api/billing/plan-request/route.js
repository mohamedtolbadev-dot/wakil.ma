import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { getBillingPlan, SELF_SERVICE_PLAN_KEYS } from "@/lib/billingPlans"
import { createUniqueInvoiceNumber } from "@/lib/invoiceHelpers"

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { plan } = await request.json()
    const billingPlan = getBillingPlan(plan)

    if (!SELF_SERVICE_PLAN_KEYS.includes(billingPlan.key)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const existingPending = await prisma.invoice.findFirst({
      where: {
        clientId: user.id,
        plan: { in: SELF_SERVICE_PLAN_KEYS },
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    })

    if (existingPending) {
      return NextResponse.json({ data: existingPending, existing: true })
    }

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    const invoiceNumber = await createUniqueInvoiceNumber(prisma)
    const invoice = await prisma.invoice.create({
      data: {
        clientId: user.id,
        invoiceNumber,
        amount: billingPlan.priceDh,
        plan: billingPlan.key,
        dueDate,
        status: "PENDING",
        notes: `Manual payment request for ${billingPlan.label}. Activate after admin marks this invoice as PAID.`,
      },
    })

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "fr:Demande de plan recue||ar:تم تسجيل طلب الباقة",
        message: `fr:Votre facture ${invoiceNumber} pour ${billingPlan.label} (${billingPlan.priceDh} DH) est en attente de paiement manuel.||ar:فاتورة ${invoiceNumber} لخطة ${billingPlan.label} (${billingPlan.priceDh} درهم) في انتظار الدفع اليدوي.`,
      },
    })

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error) {
    console.error("POST /api/billing/plan-request error:", error)
    return NextResponse.json({ error: "Failed to create plan request" }, { status: 500 })
  }
}
