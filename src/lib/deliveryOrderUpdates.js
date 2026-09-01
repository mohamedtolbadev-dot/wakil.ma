import { prisma } from "@/lib/prisma"
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

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ""
}

export async function applyDeliveryStatusUpdate({
  userId,
  order,
  mappedStatus,
  rawStatus,
  trackingNumber,
  sendMessage = true,
}) {
  if (!userId || !order) {
    return { skipped: true, reason: "missing_order" }
  }

  const nextStatus = mappedStatus || null
  const statusTransition =
    nextStatus && order.status !== nextStatus
      ? validateStatusTransition(order.status, nextStatus)
      : { valid: true }

  if (!statusTransition.valid) {
    return {
      skipped: true,
      reason: "invalid_delivery_transition",
      message: statusTransition.reason,
      orderId: order.id,
      currentStatus: order.status,
      nextStatus,
    }
  }

  const updateData = {}
  if (hasValue(trackingNumber)) updateData.trackingNumber = String(trackingNumber).trim()
  if (hasValue(rawStatus) || nextStatus) updateData.deliveryStatus = hasValue(rawStatus) ? String(rawStatus).trim() : nextStatus

  const statusChanged = Boolean(nextStatus && order.status !== nextStatus)
  if (statusChanged) updateData.status = nextStatus

  let updatedOrder = order
  if (Object.keys(updateData).length > 0) {
    updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    })
  }

  if (statusChanged && !order.isDraft) {
    const wasCounted = isCountedStatus(order.status)
    const becameCounted = isCountedStatus(nextStatus)
    if (wasCounted && !becameCounted) {
      await applyOrderCancellationSideEffects(order)
    } else if (!wasCounted && becameCounted) {
      await applyOrderCountedSideEffects(updatedOrder)
    }
  }

  if (Object.keys(updateData).length > 0 || statusChanged) {
    await updateOrderConversationMemory({
      userId,
      order: updatedOrder,
      status: updatedOrder.status,
    })
  }

  let messageSent = false
  let sentMessage = null
  let notificationSkipped = false

  const shouldNotify =
    Boolean(sendMessage) &&
    shouldTrackDeliveryNotification(nextStatus) &&
    order.lastNotifiedDeliveryStatus !== nextStatus

  if (shouldNotify) {
    const notification = await sendOrderStatusNotification({
      userId,
      order: updatedOrder,
      status: nextStatus,
    })

    if (notification.messageSent) {
      messageSent = true
      sentMessage = notification.sentMessage
      updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          ...(notification.sentFlag || {}),
          lastNotifiedDeliveryStatus: nextStatus,
        },
      })
    }
  } else if (nextStatus && order.lastNotifiedDeliveryStatus === nextStatus) {
    notificationSkipped = true
  }

  return {
    skipped: false,
    order: updatedOrder,
    statusChanged,
    messageSent,
    sentMessage,
    notificationSkipped,
  }
}
