function parseJsonArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getProductInsight(product = {}) {
  const questions = Number(product.questions || 0)
  const stock = Number(product.stock || 0)
  const imagesCount = parseJsonArray(product.images).length
  const issues = []

  if (product.isActive && stock === 0) issues.push("out_of_stock")
  if (imagesCount === 0) issues.push("missing_images")

  let action = "none"
  let priority = "low"

  if (questions > 0 && stock === 0) {
    action = "restock"
    priority = questions >= 5 ? "high" : "medium"
  } else if (!product.isActive && questions > 0) {
    action = "reactivate"
    priority = "medium"
  } else if (product.isActive && stock > 0 && questions >= 10) {
    action = "launch_campaign"
    priority = "high"
  } else if (product.isActive && stock > 0 && questions >= 3) {
    action = "watch_demand"
    priority = "medium"
  }

  return {
    priority,
    action,
    questions,
    issues,
    imagesCount,
    hasDemand: questions > 0,
  }
}

export function withProductInsight(product) {
  if (!product) return product
  return {
    ...product,
    insight: getProductInsight(product),
  }
}
