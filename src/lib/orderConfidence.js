const FIELD_LABELS = {
  customerName: "name",
  customerPhone: "phone",
  productName: "product",
  quantity: "quantity",
  city: "city",
  address: "address",
  totalAmount: "total",
}

function hasValue(value) {
  if (value === null || value === undefined) return false
  return String(value).trim().length > 0
}

function parseMissingFields(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean)

  const text = String(value).trim()
  if (!text) return []

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed.map(String).map(v => v.trim()).filter(Boolean)
  } catch {}

  return text
    .split(/[,،|;/]+/)
    .map(v => v.trim())
    .filter(Boolean)
}

function normalizeMissingField(field) {
  const value = String(field || "").trim()
  return FIELD_LABELS[value] || value
}

export function getOrderConfidence(order = {}) {
  const missing = new Set(parseMissingFields(order.missingFields).map(normalizeMissingField))
  const warnings = []

  if (!hasValue(order.customerName)) missing.add("name")
  if (!hasValue(order.customerPhone)) missing.add("phone")
  if (!hasValue(order.productName)) missing.add("product")
  if (!Number.isFinite(Number(order.quantity)) || Number(order.quantity) < 1) missing.add("quantity")
  if (!hasValue(order.city)) missing.add("city")
  if (!hasValue(order.address)) missing.add("address")
  if (!Number.isFinite(Number(order.totalAmount)) || Number(order.totalAmount) < 0) missing.add("total")

  const address = String(order.address || "").trim()
  if (address && address.length < 6) warnings.push("address_short")

  const phoneDigits = String(order.customerPhone || "").replace(/\D/g, "")
  if (phoneDigits && phoneDigits.length < 9) warnings.push("phone_short")

  let score = 100
  const penalties = {
    name: 10,
    phone: 15,
    product: 20,
    quantity: 15,
    city: 15,
    address: 20,
    total: 10,
  }

  for (const field of missing) {
    score -= penalties[field] || 8
  }
  if (warnings.includes("address_short")) score -= 8
  if (warnings.includes("phone_short")) score -= 8
  if (order.isDraft) score = Math.min(score, 65)

  score = Math.max(0, Math.min(100, Math.round(score)))

  const level = score >= 85 ? "high" : score >= 65 ? "medium" : "low"

  return {
    score,
    level,
    missingFields: Array.from(missing),
    warnings,
    needsReview: order.isDraft === true || missing.size > 0 || warnings.length > 0 || score < 85,
  }
}

export function withOrderConfidence(order) {
  if (!order) return order
  return {
    ...order,
    confidence: getOrderConfidence(order),
  }
}
