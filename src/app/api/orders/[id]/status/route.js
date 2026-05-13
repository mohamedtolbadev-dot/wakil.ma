import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"
import { rateLimit } from "@/lib/rateLimit"
import {
  applyOrderCancellationSideEffects,
  applyOrderCountedSideEffects,
  isCountedStatus,
  validateStatusTransition,
} from "@/lib/orderLifecycle"
import {
  sendOrderStatusNotification,
  shouldTrackDeliveryNotification,
  updateOrderConversationMemory,
} from "@/lib/orderStatusNotifications"

export async function PATCH(request, { params }) {
  try {
    // ✅ Rate limiting — prevent status spam (max 30 updates per 15min per IP)
    const rateLimitResult = rateLimit(request)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "تم تجاوز الحد",
          message: `حاول بعد ${Math.ceil(rateLimitResult.retryAfter / 60)} دقيقة`,
        },
        { status: 429 }
      )
    }

    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    // Next.js can provide params as an object or a promise (depending on runtime/build)
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams || {}
    if (!id) {
      return NextResponse.json({ error: "معرف الطلبية غير صالح" }, { status: 400 })
    }
    const body = await request.json()
    const { status, sendMessage = true, trackingNumber } = body

    const validStatuses = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 })
    }

    const existing = await prisma.order.findFirst({
      where: { id, userId: decoded.userId },
      include: { customer: true },
    })
    if (!existing) return NextResponse.json({ error: "الطلبية غير موجودة" }, { status: 404 })

    // ✅ Enforce sequential status transitions
    //   Prevents shortcuts like PENDING → DELIVERED that skip confirmation/shipping.
    const transition = validateStatusTransition(existing.status, status)
    if (!transition.valid) {
      return NextResponse.json({
        error: transition.reason,
        code: "INVALID_TRANSITION",
        from: existing.status,
        to: status,
      }, { status: 400 })
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...(trackingNumber !== undefined && { trackingNumber }),
      },
    })

    // ✅ INTEGRITY: Apply side-effects when status transitions cross the "counted" boundary.
    //   - counted → CANCELLED   : restore stock + decrement customer + recompute tag
    //   - CANCELLED → counted   : deduct stock + increment customer + recompute tag
    // (counted = PENDING / CONFIRMED / SHIPPED / DELIVERED; drafts are excluded)
    const wasCounted    = isCountedStatus(existing.status)
    const becameCounted = isCountedStatus(status)

    if (!existing.isDraft && wasCounted && !becameCounted) {
      await applyOrderCancellationSideEffects(existing)
    } else if (!existing.isDraft && !wasCounted && becameCounted) {
      await applyOrderCountedSideEffects(existing)
    }

    await updateOrderConversationMemory({
      userId: decoded.userId,
      order: updated,
      status,
    })

    let messageSent = false
    let sentMessage = null
    let updatedOrder = updated

    if (sendMessage && existing.customerPhone) {
      const orderForMessage = {
        ...existing,
        ...updated,
        trackingNumber: trackingNumber !== undefined ? trackingNumber : updated.trackingNumber,
      }
      const notification = await sendOrderStatusNotification({
        userId: decoded.userId,
        order: orderForMessage,
        status,
      })

      if (notification.messageSent) {
        messageSent = true
        sentMessage = notification.sentMessage

        const deliveryNotificationPatch = shouldTrackDeliveryNotification(status)
          ? { lastNotifiedDeliveryStatus: status }
          : {}
        const sentPatch = {
          ...(notification.sentFlag || {}),
          ...deliveryNotificationPatch,
        }

        if (Object.keys(sentPatch).length > 0) {
          updatedOrder = await prisma.order.update({
            where: { id },
            data: sentPatch,
          })
        }
      }
    }

    return NextResponse.json({ data: updatedOrder, messageSent, sentMessage })
  } catch (error) {
    console.error("PATCH /api/orders/[id]/status error:", error)
    return NextResponse.json({ error: "فشل في تحديث الحالة" }, { status: 500 })
  }
}
