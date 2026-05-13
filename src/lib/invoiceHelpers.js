export function generateInvoiceNumber(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `INV-${y}${m}-${rand}`
}

export async function createUniqueInvoiceNumber(prisma, { attempts = 10 } = {}) {
  let invoiceNumber = generateInvoiceNumber()
  let existing = await prisma.invoice.findUnique({ where: { invoiceNumber } })
  let attempt = 0

  while (existing && attempt < attempts) {
    invoiceNumber = generateInvoiceNumber()
    existing = await prisma.invoice.findUnique({ where: { invoiceNumber } })
    attempt += 1
  }

  if (existing) throw new Error("Failed to generate unique invoice number")
  return invoiceNumber
}

const PLAN_LABELS = {
  fr: {
    FREE: "Gratuit",
    PRO: "Pro",
    BUSINESS: "Business",
    ENTERPRISE: "Entreprise",
  },
  ar: {
    FREE: "مجاني",
    PRO: "احترافي",
    BUSINESS: "Business",
    ENTERPRISE: "مؤسسي",
  },
  en: {
    FREE: "Free",
    PRO: "Pro",
    BUSINESS: "Business",
    ENTERPRISE: "Enterprise",
  },
}

export function getInvoicePlanLabel(plan, locale = "fr") {
  const value = String(locale)
  const lang = value.startsWith("ar") ? "ar" : value.startsWith("en") ? "en" : "fr"
  return PLAN_LABELS[lang]?.[plan] || plan
}
