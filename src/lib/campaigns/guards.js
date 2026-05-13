import { normalizePhone } from "@/lib/phone"
import { DEFAULT_EXCLUDE_CONTACT_DAYS, RECIPIENT_SKIP_REASONS } from "./constants"

export function evaluateCampaignCandidate({ candidate, seenPhones, filters }) {
  const normalizedPhone = normalizePhone(
    candidate.phone || candidate.customer?.phone || candidate.latestOrder?.customerPhone
  )

  if (!normalizedPhone) {
    return {
      status: "SKIPPED",
      skipReason: RECIPIENT_SKIP_REASONS.MISSING_PHONE,
      normalizedPhone: null,
    }
  }

  if (candidate.customer?.outboundBlocked || candidate.customer?.marketingOptOutAt) {
    return {
      status: "OPTED_OUT",
      skipReason: RECIPIENT_SKIP_REASONS.OPTED_OUT,
      normalizedPhone,
    }
  }

  const excludeDays = Math.max(
    Number.parseInt(filters.excludeContactedWithinDays, 10) || DEFAULT_EXCLUDE_CONTACT_DAYS,
    0
  )

  if (
    excludeDays > 0 &&
    candidate.customer?.lastMarketingSentAt &&
    new Date(candidate.customer.lastMarketingSentAt) >= new Date(Date.now() - excludeDays * 24 * 60 * 60 * 1000)
  ) {
    return {
      status: "SKIPPED",
      skipReason: RECIPIENT_SKIP_REASONS.RECENTLY_CONTACTED,
      normalizedPhone,
    }
  }

  if (seenPhones.has(normalizedPhone)) {
    return {
      status: "SKIPPED",
      skipReason: RECIPIENT_SKIP_REASONS.DUPLICATE_PHONE,
      normalizedPhone,
    }
  }

  return {
    status: "PENDING",
    skipReason: null,
    normalizedPhone,
  }
}
