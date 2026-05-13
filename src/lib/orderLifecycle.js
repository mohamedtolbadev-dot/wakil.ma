/**
 * Order lifecycle integrity helpers.
 *
 * These functions keep Product.stock and Customer aggregates (ordersCount,
 * totalSpent, tag) consistent when an order is placed, edited, cancelled,
 * deleted, or reopened.
 *
 * Every function is non-throwing: stock/customer errors are logged but never
 * propagated, so an integrity hiccup never breaks the main order flow.
 */

import { prisma } from "@/lib/prisma"
import { computeCustomerTag } from "@/lib/customerTag"

/** Adjust a product's stock by delta (positive to restore, negative to deduct). */
export async function adjustProductStock(productId, delta) {
  if (!productId || !Number.isFinite(delta) || delta === 0) return
  try {
    if (delta > 0) {
      await prisma.product.update({
        where: { id: productId },
        data:  { stock: { increment: delta } },
      })
    } else {
      // Read-modify-write so stock cannot go below 0
      const current = await prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true },
      })
      if (!current || current.stock === null || current.stock === undefined) return
      const newStock = Math.max(0, current.stock + delta)
      await prisma.product.update({
        where: { id: productId },
        data:  { stock: newStock },
      })
    }
  } catch (err) {
    console.error(`⚠️ adjustProductStock(${productId}, ${delta}) failed:`, err.message)
  }
}

/**
 * Apply the side-effects of cancelling/removing a previously-counted order:
 *   - Restore stock (+quantity)
 *   - Decrement customer.ordersCount + totalSpent
 *   - Recompute customer.tag
 *
 * Caller is responsible for actually updating Order.status.
 * Only call once for a given lifecycle transition.
 */
export async function applyOrderCancellationSideEffects(order) {
  if (!order) return

  // 1) Stock
  if (order.productId && order.quantity) {
    await adjustProductStock(order.productId, order.quantity)
  }

  // 2) Customer aggregates + tag
  if (order.customerId) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: order.customerId },
        select: { ordersCount: true, totalSpent: true },
      })
      if (customer) {
        const newOrdersCount = Math.max(0, (customer.ordersCount || 0) - 1)
        const newTotalSpent  = Math.max(0, (customer.totalSpent  || 0) - (order.totalAmount || 0))
        await prisma.customer.update({
          where: { id: order.customerId },
          data: {
            ordersCount: newOrdersCount,
            totalSpent:  newTotalSpent,
            tag:         computeCustomerTag(newOrdersCount),
          },
        })
      }
    } catch (err) {
      console.error(`⚠️ customer side-effect on cancel failed:`, err.message)
    }
  }
}

/**
 * Apply the side-effects of (re)counting an order:
 *   - Deduct stock (-quantity)
 *   - Increment customer.ordersCount + totalSpent
 *   - Recompute customer.tag
 *
 * Used on new order creation, draft completion, and reopening a cancelled order.
 */
export async function applyOrderCountedSideEffects(order) {
  if (!order) return

  if (order.productId && order.quantity) {
    await adjustProductStock(order.productId, -order.quantity)
  }

  if (order.customerId) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: order.customerId },
        select: { ordersCount: true, totalSpent: true },
      })
      if (customer) {
        const newOrdersCount = (customer.ordersCount || 0) + 1
        const newTotalSpent  = (customer.totalSpent  || 0) + (order.totalAmount || 0)
        await prisma.customer.update({
          where: { id: order.customerId },
          data: {
            ordersCount: newOrdersCount,
            totalSpent:  newTotalSpent,
            tag:         computeCustomerTag(newOrdersCount),
          },
        })
      }
    } catch (err) {
      console.error(`⚠️ customer side-effect on count failed:`, err.message)
    }
  }
}

/**
 * Apply side-effects when quantity/product/amount changes on an already-counted
 * order. Does not change ordersCount; it only reconciles stock and totalSpent.
 */
export async function applyOrderEditSideEffects(previousOrder, nextOrder) {
  if (!previousOrder || !nextOrder) return

  const previousProductId = previousOrder.productId || null
  const nextProductId = nextOrder.productId || null
  const previousQty = Number(previousOrder.quantity) || 0
  const nextQty = Number(nextOrder.quantity) || 0

  if (previousProductId === nextProductId) {
    const qtyDelta = previousQty - nextQty
    if (previousProductId && qtyDelta !== 0) {
      await adjustProductStock(previousProductId, qtyDelta)
    }
  } else {
    if (previousProductId && previousQty > 0) {
      await adjustProductStock(previousProductId, previousQty)
    }
    if (nextProductId && nextQty > 0) {
      await adjustProductStock(nextProductId, -nextQty)
    }
  }

  if (previousOrder.customerId) {
    const amountDelta = (Number(nextOrder.totalAmount) || 0) - (Number(previousOrder.totalAmount) || 0)
    if (amountDelta !== 0) {
      try {
        const customer = await prisma.customer.findUnique({
          where: { id: previousOrder.customerId },
          select: { totalSpent: true },
        })
        if (customer) {
          await prisma.customer.update({
            where: { id: previousOrder.customerId },
            data: { totalSpent: Math.max(0, (customer.totalSpent || 0) + amountDelta) },
          })
        }
      } catch (err) {
        console.error(`⚠️ customer side-effect on order edit failed:`, err.message)
      }
    }
  }
}

/** Status values considered "counted" for integrity purposes. */
export const COUNTED_STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"]

/** Whether a status is counted (deducts stock, bumps customer). */
export const isCountedStatus = (status) => COUNTED_STATUSES.includes(status)

/**
 * Valid status transitions graph.
 * Rules:
 *   - Forward progression only (no SHIPPED → CONFIRMED back)
 *   - Any active status can → CANCELLED
 *   - CANCELLED can be reverted to PENDING only (then forward again)
 */
export const STATUS_TRANSITIONS = {
  PENDING:   ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED",   "CANCELLED"],
  SHIPPED:   ["DELIVERED", "CANCELLED"],
  DELIVERED: [],                          // terminal (only admin can force-change)
  CANCELLED: ["PENDING"],                 // reopen
}

/**
 * Check whether a status transition is valid.
 * Returns { valid: boolean, reason?: string }
 */
export function validateStatusTransition(from, to) {
  if (from === to) {
    return { valid: false, reason: "نفس الحالة — لا تغيير" }
  }
  const allowed = STATUS_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    return {
      valid: false,
      reason: `لا يمكن الانتقال من ${from} إلى ${to}. المسموح: ${allowed.join(", ") || "لا شيء"}`,
    }
  }
  return { valid: true }
}
