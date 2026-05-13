/**
 * Customer tag progression logic — single source of truth.
 *
 *   0 orders    → NEW
 *   1-2 orders  → REGULAR
 *   3+ orders   → VIP
 *
 * Keep in sync with CustomerTag enum in prisma/schema.prisma.
 */
export function computeCustomerTag(ordersCount) {
  const n = Number(ordersCount) || 0
  if (n <= 0) return "NEW"
  if (n >= 3) return "VIP"
  return "REGULAR"
}
