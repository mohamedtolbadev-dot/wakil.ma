import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"
import { addBillingMonths, getBillingPlan } from "@/lib/billingPlans"
import { getInvoicePlanLabel } from "@/lib/invoiceHelpers"

async function getSuperAdmin(request) {
  const token = request.headers.get("authorization")?.split(" ")[1]
  if (!token) return null
  const decoded = verifyToken(token)
  if (!decoded) return null
  const admin = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { role: true } })
  if (admin?.role !== "SUPER_ADMIN") return null
  return decoded
}

// PATCH /api/admin/invoices/[id]
export async function PATCH(request, { params }) {
  try {
    const decoded = await getSuperAdmin(request)
    if (!decoded) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams || {}
    if (!id) return NextResponse.json({ error: "Invoice ID required" }, { status: 400 })
    const body = await request.json()
    const { status, amount, dueDate, notes, bankInfo, plan } = body

    const existing = await prisma.invoice.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

    // Detect PAID transition — only trigger auto-upgrade on status flip, not on idempotent PATCH
    const isTransitioningToPaid = status === "PAID" && existing.status !== "PAID"
    const finalInvoicePlan = getBillingPlan(plan || existing.plan).key

    // Atomic: invoice update + (if PAID transition) user plan upgrade + notification
    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(isTransitioningToPaid && { paidAt: new Date() }),
          ...(amount !== undefined && { amount: Number(amount) }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(notes !== undefined && { notes }),
          ...(bankInfo !== undefined && { bankInfo }),
          ...(plan && { plan: finalInvoicePlan }),
        },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true, storeName: true, plan: true, planExpiresAt: true } },
        },
      })

      if (isTransitioningToPaid && finalInvoicePlan && finalInvoicePlan !== "FREE") {
        const currentExpiry = inv.client.planExpiresAt ? new Date(inv.client.planExpiresAt) : null
        const startsAt = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date()
        const planExpiresAt = finalInvoicePlan === "ENTERPRISE" ? null : addBillingMonths(startsAt, 1)

        await tx.user.update({
          where: { id: inv.clientId },
          data: { plan: finalInvoicePlan, planExpiresAt },
        })

        const planLabelFr = getInvoicePlanLabel(finalInvoicePlan, "fr")
        const planLabelAr = getInvoicePlanLabel(finalInvoicePlan, "ar")
        await tx.notification.create({
          data: {
            userId:  inv.clientId,
            type:    "SYSTEM",
            title:   "fr:Paiement confirmé||ar:تم تأكيد الدفع",
            message: `fr:Votre plan ${planLabelFr} est actif jusqu'au ${planExpiresAt ? planExpiresAt.toLocaleDateString("fr-MA") : "renouvellement manuel"}.||ar:تم تفعيل خطة ${planLabelAr} حتى ${planExpiresAt ? planExpiresAt.toLocaleDateString("ar-MA") : "تجديد يدوي"}.`,
          },
        })

        console.log(
          `[Invoice->Plan] userId=${inv.clientId.slice(0, 8)} invoice=${inv.invoiceNumber} plan=${finalInvoicePlan}`
        )
      }

      return inv
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("PATCH /api/admin/invoices/[id] error:", error)
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
  }
}

// DELETE /api/admin/invoices/[id]
export async function DELETE(request, { params }) {
  try {
    const decoded = await getSuperAdmin(request)
    if (!decoded) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams || {}
    if (!id) return NextResponse.json({ error: "Invoice ID required" }, { status: 400 })
    const existing = await prisma.invoice.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

    await prisma.invoice.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/admin/invoices/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 })
  }
}
