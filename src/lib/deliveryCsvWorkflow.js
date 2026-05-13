export const DELIVERY_CSV_HEADERS = [
  "reference",
  "customerName",
  "phone",
  "city",
  "address",
  "product",
  "quantity",
  "total",
  "notes",
]

const SHIPPED_STATUSES = new Set([
  "sent",
  "send",
  "shipped",
  "ship",
  "shipping",
  "in_delivery",
  "in delivery",
  "in-delivery",
  "out_for_delivery",
  "out for delivery",
  "dispatched",
  "ready",
  "ready_for_shipping",
  "ready for shipping",
  "pret pour expedition",
  "prêt pour expédition",
  "expedie",
  "expediee",
  "expedié",
  "expédié",
  "expédiée",
  "en livraison",
  "ramasse",
  "ramassé",
  "collecte",
  "collecté",
  "collected",
  "picked_up",
  "picked up",
])

const DELIVERED_STATUSES = new Set([
  "delivered",
  "livre",
  "livré",
  "livree",
  "livrée",
  "delivre",
  "delivré",
  "delivree",
  "delivrée",
  "تم التسليم",
  "تسلم",
  "توصل",
  "وصل",
])

const CANCELLED_STATUSES = new Set([
  "returned",
  "return",
  "retour",
  "returned_to_sender",
  "returned to sender",
  "cancelled",
  "canceled",
  "annule",
  "annulé",
  "annulee",
  "annulée",
  "refuse",
  "refusé",
  "refused",
  "رفض",
  "راجع",
  "رجع",
  "ملغي",
  "ملغية",
])

export function escapeCsvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function buildDeliveryCsv(orders) {
  const rows = (Array.isArray(orders) ? orders : []).map((order) => [
    order.deliveryReference || "",
    order.customerName || "",
    order.customerPhone || "",
    order.city || "",
    order.address || "",
    order.productName || "",
    order.quantity || 1,
    order.totalAmount || 0,
    "COD",
  ])

  return [
    DELIVERY_CSV_HEADERS.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\r\n")
}

export function buildDeliveryReference(order) {
  const cleanId = String(order?.id || "").replace(/[^a-z0-9]/gi, "").toUpperCase()
  const suffix = cleanId.slice(-8) || String(Date.now()).slice(-8)
  return `WK-${suffix}`
}

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
}

export function mapDeliveryStatus(rawStatus, { hasTracking = false } = {}) {
  const normalized = normalizeValue(rawStatus)
  if (!normalized && hasTracking) return "SHIPPED"
  if (!normalized) return null
  if (SHIPPED_STATUSES.has(normalized)) return "SHIPPED"
  if (DELIVERED_STATUSES.has(normalized)) return "DELIVERED"
  if (CANCELLED_STATUSES.has(normalized)) return "CANCELLED"

  if (/^(sent|ship|shipp|exped|livraison|collect|pick|dispatch)/i.test(normalized)) {
    return "SHIPPED"
  }
  if (/^(deliver|livr|delivr)/i.test(normalized)) {
    return "DELIVERED"
  }
  if (/^(return|retour|cancel|annul|refus)/i.test(normalized)) {
    return "CANCELLED"
  }

  return null
}

export function canApplyDeliveryStatus(currentStatus, nextStatus) {
  if (!nextStatus || currentStatus === nextStatus) return true
  if (currentStatus === "CANCELLED" && nextStatus !== "CANCELLED") return false
  if (currentStatus === "DELIVERED" && nextStatus !== "DELIVERED") return false
  return ["SHIPPED", "DELIVERED", "CANCELLED"].includes(nextStatus)
}

function parseCsvLine(line, delimiter = ",") {
  const cells = []
  let current = ""
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      i += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === delimiter && !quoted) {
      cells.push(current)
      current = ""
      continue
    }

    current += char
  }

  cells.push(current)
  return cells.map((cell) => cell.trim())
}

export function parseCsvRows(csvText) {
  const text = String(csvText || "").replace(/^\uFEFF/, "")
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const delimiter = lines[0].split(";").length > lines[0].split(",").length ? ";" : ","
  const headers = parseCsvLine(lines[0], delimiter).map((header) => normalizeCsvHeader(header))
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, delimiter)
    const row = { _rowNumber: index + 2 }
    headers.forEach((header, cellIndex) => {
      row[header] = values[cellIndex] || ""
    })
    return row
  })
}

export function normalizeCsvHeader(header) {
  return normalizeValue(header)
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function readCsvField(row, names) {
  for (const name of names) {
    const value = row[normalizeCsvHeader(name)]
    if (value !== undefined && String(value).trim()) return String(value).trim()
  }
  return ""
}
