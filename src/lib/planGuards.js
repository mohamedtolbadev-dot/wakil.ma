import { getEffectivePlanEntitlements } from "@/lib/billingPlans"

export function requireCampaignsEntitlement(user) {
  const entitlements = getEffectivePlanEntitlements(user)
  if (entitlements.campaignsEnabled) return { allowed: true, entitlements }

  return {
    allowed: false,
    entitlements,
    message: `Campaigns are not included in the ${entitlements.plan} plan. Upgrade to Pro or Business to use WhatsApp campaigns.`,
  }
}
