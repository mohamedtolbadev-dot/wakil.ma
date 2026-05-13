import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response"
import { rateLimit } from "@/lib/rateLimit"
import { mapDeliveryStatus } from "@/lib/deliveryCsvWorkflow"
import { applyDeliveryStatusUpdate } from "@/lib/deliveryOrderUpdates"

function normalizeBulkStatus(status) {
  const raw = String(status || "").trim()
  const upper = raw.toUpperCase()
  if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(upper)) return upper
  return mapDeliveryStatus(raw)
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
    const mappedStatus = normalizeBulkStatus(body.status)
    const sendMessage = body.sendMessage !== false

    if (orderIds.length === 0) {
      return errorResponse("No orders selected", 400)
    }
    if (!mappedStatus) {
      return errorResponse("Invalid delivery status", 400)
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: user.id,
        id: { in: orderIds },
        isDraft: false,
      },
    })

    const summary = {
      totalRequested: orderIds.length,
      updated: 0,
      notified: 0,
      skipped: 0,
      errors: [],
    }

    const foundIds = new Set(orders.map((order) => order.id))
    for (const id of orderIds) {
      if (!foundIds.has(id)) {
        summary.skipped += 1
        summary.errors.push({ orderId: id, reason: "order_not_found" })
      }
    }

    for (const order of orders) {
      const result = await applyDeliveryStatusUpdate({
        userId: user.id,
        order,
        mappedStatus,
        rawStatus: mappedStatus,
        sendMessage,
      })

      if (result.skipped) {
        summary.skipped += 1
        summary.errors.push({
          orderId: order.id,
          reason: result.reason,
          currentStatus: result.currentStatus,
          nextStatus: result.nextStatus,
        })
        continue
      }

      summary.updated += 1
      if (result.messageSent) summary.notified += 1
    }

    return successResponse(summary)
  } catch (error) {
    console.error("POST /api/orders/delivery/bulk-status error:", error)
    return errorResponse("Failed to update delivery statuses", 500)
  }
}
