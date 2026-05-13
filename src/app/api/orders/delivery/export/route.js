import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response"
import { rateLimit } from "@/lib/rateLimit"
import {
  buildDeliveryCsv,
  buildDeliveryReference,
} from "@/lib/deliveryCsvWorkflow"

async function ensureUniqueDeliveryReference(order) {
  if (order.deliveryReference) return order.deliveryReference

  const cleanId = String(order.id || "").replace(/[^a-z0-9]/gi, "").toUpperCase()
  const candidates = [
    buildDeliveryReference(order),
    `WK-${cleanId.slice(-10)}`,
    `WK-${cleanId.slice(0, 4)}${cleanId.slice(-6)}`,
  ].filter((value, index, arr) => value && arr.indexOf(value) === index)

  for (const candidate of candidates) {
    const conflict = await prisma.order.findFirst({
      where: {
        deliveryReference: candidate,
        NOT: { id: order.id },
      },
      select: { id: true },
    })
    if (!conflict) return candidate
  }

  return `WK-${cleanId.slice(-6)}${Date.now().toString(36).slice(-4).toUpperCase()}`
}

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  const rateLimitResult = rateLimit(request)
  if (!rateLimitResult.success) {
    return errorResponse(
      `Rate limit exceeded. Try after ${Math.ceil(rateLimitResult.retryAfter / 60)} minutes`,
      429
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const orderIds = Array.isArray(body.orderIds)
      ? body.orderIds.map((id) => String(id || "").trim()).filter(Boolean)
      : []
    const providerName = String(body.providerName || "").trim() || null

    const orders = await prisma.order.findMany({
      where: {
        userId: user.id,
        status: "CONFIRMED",
        isDraft: false,
        ...(orderIds.length > 0 ? { id: { in: orderIds } } : {}),
      },
      orderBy: { createdAt: "asc" },
    })

    if (orders.length === 0) {
      return errorResponse("No confirmed orders to export", 400)
    }

    const exportedAt = new Date()
    const exportedOrders = []

    for (const order of orders) {
      const deliveryReference = await ensureUniqueDeliveryReference(order)
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          deliveryReference,
          deliveryStatus: "EXPORTED",
          sentToDeliveryAt: exportedAt,
          deliveryProviderName: providerName,
        },
      })
      exportedOrders.push(updated)
    }

    const csv = buildDeliveryCsv(exportedOrders)
    const today = new Date().toISOString().slice(0, 10)

    return successResponse({
      csv,
      count: exportedOrders.length,
      filename: `delivery-orders-${today}.csv`,
      rows: exportedOrders.map((order) => ({
        id: order.id,
        deliveryReference: order.deliveryReference,
        deliveryStatus: order.deliveryStatus,
        sentToDeliveryAt: order.sentToDeliveryAt,
        deliveryProviderName: order.deliveryProviderName,
      })),
    })
  } catch (error) {
    console.error("POST /api/orders/delivery/export error:", error)
    return errorResponse("Failed to export delivery CSV", 500)
  }
}
