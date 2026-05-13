import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response"
import {
  applyOrderCancellationSideEffects,
  applyOrderCountedSideEffects,
  applyOrderEditSideEffects,
  isCountedStatus,
} from "@/lib/orderLifecycle"
import { withOrderConfidence } from "@/lib/orderConfidence"

function safeObj(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

function buildOrderMemory(order) {
  if (!order) return null
  return {
    orderId: order.id,
    productId: order.productId || null,
    productName: order.productName || null,
    quantity: order.quantity || null,
    status: order.status || null,
    trackingNumber: order.trackingNumber || null,
    deliveryReference: order.deliveryReference || null,
    deliveryStatus: order.deliveryStatus || null,
    createdAt: order.createdAt || null,
    variant: order.variant || null,
    city: order.city || null,
    address: order.address || null,
    customerName: order.customerName || null,
    totalAmount: order.totalAmount ?? null,
    updatedAt: new Date().toISOString(),
  }
}

async function updateConversationOrderMemory({ order, userId }) {
  const conversationId = order?.conversationId || order?.notes?.match(/المحادثة: ([a-z0-9-]+)$/i)?.[1]
  const orderMemory = buildOrderMemory(order)
  if (!conversationId || !orderMemory) return

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true, context: true },
    })
    if (!conversation) return

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        context: {
          ...safeObj(conversation.context),
          currentOrder: orderMemory,
          lastOrderSnapshot: orderMemory,
          lastOrderEditedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    })
  } catch (err) {
    console.warn("[OrderUpdate] Could not update conversation memory:", err?.message || err)
  }
}

export async function GET(request, { params }) {
  const { id } = await params
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const order = await prisma.order.findFirst({
      where: { id, userId: user.id },
      include: { customer: { select: { name: true, phone: true, tag: true } } },
    })
    if (!order) return errorResponse("الطلبية غير موجودة", 404)
    return successResponse(withOrderConfidence(order))
  } catch (error) {
    return errorResponse("خطأ في جلب الطلبية", 500)
  }
}

export async function PUT(request, { params }) {
  const { id } = await params
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const body = await request.json()
    const { customerName, customerPhone, productName, quantity, totalAmount, city, address, notes, trackingNumber } = body

    const existing = await prisma.order.findFirst({ where: { id, userId: user.id } })
    if (!existing) return errorResponse("الطلبية غير موجودة", 404)

    // ✅ Validate quantity if provided
    let finalQuantity = existing.quantity
    if (quantity !== undefined) {
      finalQuantity = Number(quantity)
      if (!Number.isFinite(finalQuantity) || finalQuantity < 1 || finalQuantity > 100) {
        return errorResponse("الكمية يجب أن تكون بين 1 و 100", 400)
      }
    }

    if (quantity !== undefined && existing.productId) {
      const product = await prisma.product.findUnique({
        where: { id: existing.productId },
        select: { stock: true },
      })
      if (product && product.stock !== null && product.stock !== undefined) {
        const alreadyReserved = !existing.isDraft && isCountedStatus(existing.status)
          ? existing.quantity || 0
          : 0
        const available = product.stock + alreadyReserved
        if (finalQuantity > available) {
          return errorResponse(
            `المخزون غير كافٍ. المتاح: ${available}، المطلوب: ${finalQuantity}`,
            400
          )
        }
      }
    }

    let finalTotalAmount = existing.totalAmount
    if (totalAmount !== undefined) {
      finalTotalAmount = Number(totalAmount)
      if (!Number.isFinite(finalTotalAmount) || finalTotalAmount < 0) {
        return errorResponse("المبلغ غير صالح", 400)
      }
    }

    // Merge new values with existing for completeness check
    const merged = {
      customerName:  customerName  !== undefined ? customerName  : existing.customerName,
      customerPhone: customerPhone !== undefined ? customerPhone : existing.customerPhone,
      city:          city          !== undefined ? city          : existing.city,
      address:       address       !== undefined ? address       : existing.address,
      quantity:      finalQuantity,
    }

    // ✅ Auto-flip isDraft if all required fields are now present
    //    A draft becomes a real order once city + address + quantity are filled.
    const isNowComplete =
      !!merged.customerName?.trim() &&
      !!merged.customerPhone?.trim() &&
      !!merged.city?.trim() &&
      !!merged.address?.trim() &&
      Number(merged.quantity) >= 1
    const shouldClearDraft = existing.isDraft && isNowComplete

    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(customerName !== undefined && { customerName }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(productName !== undefined && { productName }),
        ...(quantity !== undefined && { quantity: finalQuantity }),
        ...(totalAmount !== undefined && { totalAmount: finalTotalAmount }),
        ...(city !== undefined && { city }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(shouldClearDraft && { isDraft: false, missingFields: null }),
      },
    })

    if (shouldClearDraft) {
      await applyOrderCountedSideEffects(updated)
    } else if (!existing.isDraft && isCountedStatus(existing.status)) {
      await applyOrderEditSideEffects(existing, updated)
    }

    await updateConversationOrderMemory({ order: updated, userId: user.id })

    return successResponse(withOrderConfidence(updated))
  } catch (error) {
    console.error("PUT /api/orders/[id] error:", error)
    return errorResponse("خطأ في تعديل الطلبية", 500)
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const existing = await prisma.order.findFirst({ where: { id, userId: user.id } })
    if (!existing) return errorResponse("الطلبية غير موجودة", 404)

    if (!existing.isDraft && isCountedStatus(existing.status)) {
      await applyOrderCancellationSideEffects(existing)
    }

    await prisma.order.delete({ where: { id } })
    return successResponse({ deleted: true })
  } catch (error) {
    console.error("DELETE /api/orders/[id] error:", error)
    return errorResponse("خطأ في حذف الطلبية", 500)
  }
}
