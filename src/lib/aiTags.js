/**
 * Magic tags used in AI agent replies.
 * Centralized here to avoid string duplication and typos.
 */

export const TAGS = {
  ORDER_CONFIRMED: "[ORDER_CONFIRMED]",
  CANCEL_ORDER:    "[CANCEL_ORDER]",
  SEND_IMAGES:     "[SEND_IMAGES]",
}

/** Build a stage marker: [STAGE:CLOSED], [STAGE:PITCHING], ... */
export const stageTag = (stage) => `[STAGE:${stage}]`

/** Strip all internal tags from a reply before sending to the customer.
 *  ✅ STRICT: AI must NEVER leak placeholders. Removes ALL bracket tags.
 *  Customer should never see [SEND_IMAGES], [إرسال الصور], [PLACEHOLDER], etc.
 */
export function cleanReply(reply) {
  if (!reply || typeof reply !== "string") return ""

  let cleaned = reply
    // Known internal tags
    .replace(/\n?\[STAGE:\w+\]/gi, "")
    .replace(/\n?\[ORDER_CONFIRMED\]/gi, "")
    .replace(/\n?\[CANCEL_ORDER\]/gi, "")
    .replace(/\n?\[SEND[_ ]IMAGES?\]/gi, "")
    .replace(/\n?\[IMAGES?\]/gi, "")
    .replace(/\n?\[ENVOYER[_ ]IMAGES?\]/gi, "")
    // Arabic translations of SEND_IMAGES
    .replace(/\n?\[(?:إرسال|أرسل|ارسل|بعث|إبعث|ابعث)[\s_]?(?:الصور|التصاور|صور|تصاور)\]/g, "")
    .replace(/\n?\[(?:الصور|التصاور)\]/g, "")

  // ✅ SAFETY NET: remove ANY remaining [BRACKET_PLACEHOLDER] that looks like a tag.
  // Pattern: short uppercase/Arabic phrases inside brackets (placeholders only, not URLs/citations).
  // Allowed exceptions: brackets with prices like [320 درهم] or [size: M] are unlikely from AI.
  cleaned = cleaned.replace(/\[[A-Z_]{2,30}\]/g, "")  // English tags like [WHATEVER]
  cleaned = cleaned.replace(/\[\s*(?:[A-Za-z]+[\s_]+)*[A-Za-z]+\s*\]/g, (match) => {
    // Remove if looks like a placeholder (all letters, no digits/punctuation other than _ space)
    const inner = match.slice(1, -1).trim()
    if (inner.length === 0 || inner.length > 40) return match
    // Keep brackets that contain spaces with multiple real words (might be legitimate quotes)
    return ""
  })
  // Remove Arabic placeholder brackets: [أي نص قصير غالبا placeholder]
  cleaned = cleaned.replace(/\[\s*[\u0600-\u06FF\s_]{2,40}\s*\]/g, "")

  // Cleanup: remove orphan empty lines created by tag removal
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim()

  return cleaned
}

/** Extract stage from reply text (returns null if not found). */
export function extractStage(reply) {
  if (!reply || typeof reply !== "string") return null
  const m = reply.match(/\[STAGE:(\w+)\]/)
  return m ? m[1] : null
}

/** Check if reply contains order confirmation tag. */
export const hasOrderConfirmed = (reply) =>
  typeof reply === "string" && /\[ORDER[_ ]CONFIRMED\]/i.test(reply)

/** Check if reply contains cancel tag. */
export const hasCancelOrder = (reply) =>
  typeof reply === "string" && /\[CANCEL[_ ]ORDER\]/i.test(reply)

/** Check if reply contains send-images tag.
 *  ✅ FIX: detect English tag + Arabic/French translations AI might generate.
 */
export const hasSendImages = (reply) => {
  if (typeof reply !== "string") return false
  // English: [SEND_IMAGES], [SEND IMAGES], [IMAGES]
  if (/\[SEND[_ ]IMAGES?\]/i.test(reply)) return true
  if (/\[IMAGES?\]/i.test(reply)) return true
  // French: [ENVOYER_IMAGES], [ENVOYER IMAGES]
  if (/\[ENVOYER[_ ]IMAGES?\]/i.test(reply)) return true
  // Arabic: [إرسال الصور], [أرسل الصور], [بعث الصور], [الصور], [التصاور]
  if (/\[(?:إرسال|أرسل|ارسل|بعث|إبعث|ابعث)[\s_]?(?:الصور|التصاور|صور|تصاور)\]/.test(reply)) return true
  if (/\[(?:الصور|التصاور)\]/.test(reply)) return true
  return false
}
