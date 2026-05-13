export function normalizePhone(phone) {
  if (!phone) return null

  let normalized = String(phone).replace(/\D/g, "")
  if (!normalized) return null

  if (normalized.startsWith("33") && normalized.length === 11) {
    return normalized
  }

  if (normalized.startsWith("1") && normalized.length === 11) {
    return normalized
  }

  if (normalized.startsWith("0")) {
    normalized = "212" + normalized.slice(1)
  }

  if (!normalized.startsWith("212") && normalized.length === 9) {
    normalized = "212" + normalized
  }

  return normalized
}

export function maskPhone(phone) {
  if (!phone) return "****"
  return phone.length > 4 ? `******${phone.slice(-4)}` : "****"
}
