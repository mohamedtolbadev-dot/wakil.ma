const RECOVERY_THRESHOLDS_HOURS = {
  GREETING: 24,
  DISCOVERY: 24,
  PITCHING: 18,
  OBJECTION: 12,
  CLOSING: 6,
}

const CLOSED_STAGES = new Set(["CLOSED", "ARCHIVED", "ABANDONED", "CLOSED_ONLY"])

function getLatestMessage(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null
  return messages.reduce((latest, message) => {
    if (!latest) return message
    return new Date(message.createdAt || 0) > new Date(latest.createdAt || 0)
      ? message
      : latest
  }, null)
}

function hoursSince(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return 0
  return Math.max(0, (Date.now() - date.getTime()) / 36e5)
}

export function getConversationRecoveryState(conversation = {}) {
  const stage = conversation.stage || "GREETING"
  if (CLOSED_STAGES.has(stage)) {
    return { needsRecovery: false, priority: "none", reason: null, ageHours: 0 }
  }

  const latestMessage = getLatestMessage(conversation.messages)
  const lastActivityAt = latestMessage?.createdAt || conversation.updatedAt
  const ageHours = hoursSince(lastActivityAt)
  const lastRole = latestMessage?.role || null
  const score = Number(conversation.score || 0)

  const threshold = lastRole === "USER"
    ? 2
    : RECOVERY_THRESHOLDS_HOURS[stage] || 24

  const needsRecovery = ageHours >= threshold
  if (!needsRecovery) {
    return {
      needsRecovery: false,
      priority: "none",
      reason: null,
      ageHours: Math.round(ageHours),
      thresholdHours: threshold,
      lastRole,
    }
  }

  const reason = lastRole === "USER"
    ? "unanswered_customer"
    : stage === "CLOSING"
      ? "almost_closed"
      : "stale_conversation"

  const priority = stage === "CLOSING" || score >= 80 || ageHours >= 24
    ? "high"
    : stage === "OBJECTION" || score >= 60
      ? "medium"
      : "low"

  return {
    needsRecovery: true,
    priority,
    reason,
    ageHours: Math.round(ageHours),
    thresholdHours: threshold,
    lastRole,
  }
}

export function withConversationRecovery(conversation) {
  if (!conversation) return conversation
  return {
    ...conversation,
    recovery: getConversationRecoveryState(conversation),
  }
}
