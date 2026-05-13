import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response"
import { rateLimit } from "@/lib/rateLimit"
import {
  mapDeliveryStatus,
  parseCsvRows,
  readCsvField,
} from "@/lib/deliveryCsvWorkflow"
import { applyDeliveryStatusUpdate } from "@/lib/deliveryOrderUpdates"

async function findOrderByReference(userId, reference) {
  const ref = String(reference || "").trim()
  if (!ref) return null

  return prisma.order.findFirst({
    where: {
      userId,
      OR: [
        { deliveryReference: ref },
        { id: ref },
      ],
    },
  })
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
    const csvText = String(body.csvText || "")
    const sendMessage = body.sendMessage !== false
    const rows = parseCsvRows(csvText)

    if (rows.length === 0) {
      return errorResponse("CSV file is empty or invalid", 400)
    }

    const summary = {
      totalRows: rows.length,
      updated: 0,
      notified: 0,
      skipped: 0,
      errors: [],
    }

    for (const row of rows) {
      const rowNumber = row._rowNumber
      const reference = readCsvField(row, [
        "reference",
        "deliveryReference",
        "delivery_reference",
        "orderId",
        "order_id",
        "id",
      ])
      const trackingNumber = readCsvField(row, [
        "trackingNumber",
        "tracking_number",
        "tracking",
        "trackingCode",
        "tracking_code",
        "code",
        "code_colis",
      ])
      const rawStatus = readCsvField(row, [
        "status",
        "deliveryStatus",
        "delivery_status",
        "etat",
        "state",
        "statut",
      ])

      if (!reference) {
        summary.skipped += 1
        summary.errors.push({ row: rowNumber, reason: "missing_reference" })
        continue
      }

      const order = await findOrderByReference(user.id, reference)
      if (!order) {
        summary.skipped += 1
        summary.errors.push({ row: rowNumber, reference, reason: "order_not_found" })
        continue
      }

      const mappedStatus = mapDeliveryStatus(rawStatus, { hasTracking: Boolean(trackingNumber) })
      if (!mappedStatus && !trackingNumber && !rawStatus) {
        summary.skipped += 1
        summary.errors.push({ row: rowNumber, reference, reason: "missing_tracking_or_status" })
        continue
      }

      const result = await applyDeliveryStatusUpdate({
        userId: user.id,
        order,
        mappedStatus,
        rawStatus,
        trackingNumber,
        sendMessage,
      })

      if (result.skipped) {
        summary.skipped += 1
        summary.errors.push({
          row: rowNumber,
          reference,
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
    console.error("POST /api/orders/delivery/import error:", error)
    return errorResponse("Failed to import delivery tracking CSV", 500)
  }
}
