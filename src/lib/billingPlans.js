export const BILLING_PLANS = {
  FREE: {
    key: "FREE",
    label: "Free",
    priceDh: 0,
    aiReplies: 100,
    dailyHardCap: 50,
    selfService: false,
  },
  PRO: {
    key: "PRO",
    label: "Pro",
    priceDh: 199,
    aiReplies: 5000,
    dailyHardCap: 500,
    selfService: true,
  },
  BUSINESS: {
    key: "BUSINESS",
    label: "Business",
    priceDh: 399,
    aiReplies: 12000,
    dailyHardCap: 1200,
    selfService: true,
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    label: "Enterprise",
    priceDh: null,
    aiReplies: 50000,
    dailyHardCap: 5000,
    selfService: false,
  },
}

export const SELF_SERVICE_PLAN_KEYS = Object.keys(BILLING_PLANS).filter(
  (key) => BILLING_PLANS[key].selfService
)

export const PLAN_TRANSLATION_KEYS = {
  FREE: "invoices.plan_free",
  PRO: "invoices.plan_pro",
  BUSINESS: "invoices.plan_business",
  ENTERPRISE: "invoices.plan_enterprise",
}

export function getBillingPlan(plan) {
  return BILLING_PLANS[plan] || BILLING_PLANS.FREE
}

export function getEffectivePlan(user, now = new Date()) {
  const plan = user?.plan || "FREE"
  if (plan === "FREE") return "FREE"
  if (plan === "ENTERPRISE") return "ENTERPRISE"

  const expiresAt = user?.planExpiresAt ? new Date(user.planExpiresAt) : null
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) return plan
  return expiresAt > now ? plan : "FREE"
}

export function addBillingMonths(date = new Date(), months = 1) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}
