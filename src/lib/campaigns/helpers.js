import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_EXCLUDE_CONTACT_DAYS,
  MARKETING_STOP_KEYWORDS,
  MAX_BATCH_SIZE,
  TEMPLATE_VARIABLE_KEYS,
} from "./constants"

function safeNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function clampBatchSize(value) {
  return Math.min(Math.max(safeNumber(value, DEFAULT_BATCH_SIZE), 1), MAX_BATCH_SIZE)
}

export function normalizeCampaignFilters(input = {}) {
  const tag = typeof input.tag === "string" ? input.tag.trim().toUpperCase() : null
  const normalizedTag = ["NEW", "REGULAR", "VIP", "PROSPECT"].includes(tag) ? tag : null

  const lastOrderWithinDays = Math.max(safeNumber(input.lastOrderWithinDays, 0), 0)
  const excludeContactedWithinDays = Math.max(
    safeNumber(input.excludeContactedWithinDays, DEFAULT_EXCLUDE_CONTACT_DAYS),
    0
  )

  return {
    tag: normalizedTag,
    lastOrderWithinDays,
    excludeContactedWithinDays,
  }
}

export function parseVariableList(value) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed : value.split(",")
          } catch {
            return value.split(",")
          }
        })()
      : []

  return [...new Set(
    source
      .map((item) => String(item || "").trim())
      .filter((item) => TEMPLATE_VARIABLE_KEYS.includes(item))
  )]
}

export function formatCampaignAmount(amount) {
  const parsed = Number.parseFloat(amount)
  if (!Number.isFinite(parsed)) return ""
  return `${parsed.toLocaleString("fr-FR")} DH`
}

export function buildCampaignName({ product, audienceType }) {
  const baseName = product?.name ? `Nouveau produit - ${product.name}` : "Campagne produit"
  if (audienceType === "SAME_CATEGORY_BUYERS" && product?.category) {
    return `${baseName} (${product.category})`
  }
  if (audienceType === "RECENT_BUYERS") {
    return `${baseName} (clients récents)`
  }
  if (audienceType === "TAG_BUYERS") {
    return `${baseName} (segment client)`
  }
  return baseName
}

export function resolveTemplateVariables({
  variableKeys,
  user,
  customer,
  fallbackCustomerName,
  product,
  latestOrder,
}) {
  const customerName = customer?.name || fallbackCustomerName || "Client"
  const productPrice = product?.price ?? latestOrder?.totalAmount ?? null
  const productSalePrice = product?.salePrice ?? null

  const values = {
    customer_name: customerName,
    product_name: product?.name || latestOrder?.productName || "",
    product_price: formatCampaignAmount(productPrice),
    product_sale_price: formatCampaignAmount(productSalePrice),
    store_name: user?.storeName || user?.name || "",
    customer_tag: customer?.tag || "",
    category: product?.category || "",
    last_order_total: formatCampaignAmount(latestOrder?.totalAmount),
  }

  return variableKeys.reduce((acc, key) => {
    acc[key] = values[key] || ""
    return acc
  }, {})
}

export function isMarketingOptOutMessage(text) {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

  if (!normalized) return false
  return MARKETING_STOP_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

export function chunkArray(items, size = 100) {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
