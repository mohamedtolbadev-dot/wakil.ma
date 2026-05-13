/**
 * Order extraction helpers — used by AI agent when creating an order.
 *
 * Goals:
 *   - Pick the right product (NOT just agent.selectedProductId)
 *   - Take the LATEST quantity if customer changed their mind
 *   - Parse total/discount from AI's own summary
 *   - Capture delivery notes from customer messages
 *   - Detect weak WhatsApp profile names that need clarification
 */

/* ─────────────────────────────────────────────────────────
   Product detection from conversation
   ───────────────────────────────────────────────────────── */

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const PRODUCT_TOKEN_STOPWORDS = new Set([
  "original", "originale", "الأصلي", "الاصلي",
  "pour", "for", "produit", "product",
])

function getProductMatchTokens(value) {
  return normalize(value)
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3)
    .filter(token => !/^\d+(?:ml|g|kg|l|cm)?$/i.test(token))
    .filter(token => !/^(?:ml|g|kg|l|cm)$/i.test(token))
    .filter(token => !PRODUCT_TOKEN_STOPWORDS.has(token))
}

function productMentionScore(product, normalizedText) {
  const name = normalize(product?.name)
  if (!name || !normalizedText) return 0
  if (normalizedText.includes(name)) return 1000

  const tokens = getProductMatchTokens(product?.name)
  if (tokens.length === 0) return 0

  const matched = tokens.filter(token => normalizedText.includes(token))
  if (matched.length >= 2) return matched.length * 100 + matched.join(" ").length

  const only = matched[0]
  if (only && only.length >= 6) return 60 + only.length

  return 0
}

/**
 * Detect which product was actually discussed in the conversation.
 * Gives direct customer mentions priority, then falls back to recent AGENT
 * messages. This prevents a previous/default product from stealing image/order
 * requests when the customer explicitly names another product.
 *
 * @param {Array} products - list of { id, name, ... } active products
 * @param {Array} messages - full conversation history [{role, content}]
 * @param {Object} fallback - product to use if no match
 * @returns {Object|null} matched product
 */
export function detectOrderedProduct(products, messages, fallback = null) {
  if (!Array.isArray(products) || products.length === 0) return fallback
  if (products.length === 1) return products[0]

  const recent = (messages || []).slice(-10)
  const recentUserMsgs = recent.filter(m => m.role === "USER").slice(-4).reverse()
  const recentAgentMsgs = recent.filter(m => m.role === "AGENT").slice(-3).reverse()
  const sortedProducts = [...products].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0))

  const scan = (msgList, { requireExplicitName = true } = {}) => {
    for (const m of msgList) {
      const text = normalize(m.content)
      for (const p of sortedProducts) {
        if (productMentionScore(p, text) > 0) {
          return p
        }
      }
      if (!requireExplicitName) continue
    }
    return null
  }

  return scan(recentUserMsgs) || scan(recentAgentMsgs) || fallback
}

/* ─────────────────────────────────────────────────────────
   Quantity — take the LAST mention (customer may correct)
   ───────────────────────────────────────────────────────── */

const NUMBER_WORDS = {
  "واحد": 1, "واحدة": 1, "une": 1, "un": 1, "one": 1,
  "جوج": 2, "اثنين": 2, "اثنتين": 2, "deux": 2, "two": 2,
  "تلاتة": 3, "ثلاثة": 3, "trois": 3, "three": 3,
  "ربعة": 4, "أربعة": 4, "quatre": 4, "four": 4,
  "خمسة": 5, "cinq": 5, "five": 5,
}

/**
 * Extract quantity, prioritizing the LAST user message with a valid quantity.
 * Returns null when the customer never gave an explicit quantity.
 * Rationale: if user said "2" then corrected to "3", we want 3.
 */
export function extractLatestQuantity(userMessages) {
  const msgs = Array.isArray(userMessages) ? userMessages : []
  // Walk from newest to oldest
  for (let i = msgs.length - 1; i >= 0; i--) {
    const text = String(msgs[i].content || "")
    const qty = extractQtyFromText(text)
    if (qty != null) return qty
  }
  return null
}

function extractQtyFromText(text) {
  const raw = String(text || "").trim()
  const lower = raw.toLowerCase()

  // ── 1. "3 حبات / 2 pcs" — explicit unit (strong signal) ──
  const unitMatch = lower.match(/(\d+)\s*(?:حبة|حبات|قطعة|قطع|وحدة|وحدات|pieces?|pcs)/i)
  if (unitMatch) {
    const n = parseInt(unitMatch[1], 10)
    if (n >= 1 && n <= 20) return n
  }

  // ── 2. Buy context + number: "بغيت 3" / "bghit 3" ──
  const buyCtx = /(?:بغيت|اريد|نبغي|خود|اعطيني|طلب|نحتاج|ناخذ|bgit|bghit|bghiti|nbghi|nbi|khdini|3tini)\s*(?:حبة|حبات|قطعة|قطع|وحدة|وحدات|pieces?|pcs)?\s*(\d+)/i
  const m1 = lower.match(buyCtx)
  if (m1) {
    const n = parseInt(m1[1], 10)
    if (n >= 1 && n <= 20) return n
  }

  // ── 3. Buy context + word: "بغيت جوج" ──
  const buyCtxWord = /(?:بغيت|اريد|نبغي|خود|اعطيني|طلب|bgit|bghit|bghiti|nbghi|nbi)\s+(\S+)/i
  const m2 = lower.match(buyCtxWord)
  if (m2) {
    for (const [word, qty] of Object.entries(NUMBER_WORDS)) {
      if (m2[1].includes(word)) return qty
    }
  }

  // ── 4. ✅ Bare number in short reply ──
  //   Covers the common case where AI asks "شحال بغيتي؟" and customer
  //   replies just "3" or "3 عافاك" or "واخا 2". We only accept this
  //   when the message is short (no ambiguity with other numbers).
  //   Skip if the text contains 5+ digits total (likely phone / address).
  const digitCount = (raw.match(/\d/g) || []).length
  if (raw.length <= 25 && digitCount <= 4) {
    // Pure number: "3", "٣"
    const pureDigit = raw.match(/^[\s\p{P}]*(\d{1,2})[\s\p{P}]*$/u)
    if (pureDigit) {
      const n = parseInt(pureDigit[1], 10)
      if (n >= 1 && n <= 20) return n
    }
    // Short message containing a number, excluding phone-like / address-like
    //   e.g. "واخا 3", "ok 2", "خليها 4"
    const shortNum = lower.match(/(?:^|\s)(\d{1,2})(?:\s|$)/)
    if (shortNum) {
      const n = parseInt(shortNum[1], 10)
      if (n >= 1 && n <= 20) return n
    }
    // Bare number word: "جوج", "ثلاثة", "deux"
    for (const [word, qty] of Object.entries(NUMBER_WORDS)) {
      // word boundary check — avoid matching "جوج" inside "جوجل"
      const re = new RegExp(`(?:^|[\\s\\p{P}])${word}(?:$|[\\s\\p{P}])`, "iu")
      if (re.test(raw)) return qty
    }
  }

  return null
}

/* ─────────────────────────────────────────────────────────
   Total/discount parsing from AI's own summary
   ───────────────────────────────────────────────────────── */

/**
 * Parse the total amount from the AI's reply (its order summary).
 * AI usually writes a summary line like "💰 270 درهم" or "Total: 270 DH".
 * Returns the number or null if not found.
 */
export function parseTotalFromReply(reply) {
  if (!reply || typeof reply !== "string") return null

  // Patterns: prioritize labelled totals (reduces false positives like "السعر 100 للقطعة")
  const patterns = [
    /(?:💰|total|مجموع|المجموع|majmou|المبلغ\s*الإجمالي|مبلغ\s*الإجمالي)\s*[:：=]?\s*(\d{2,6})(?:[.,]\d{1,2})?\s*(?:dh|درهم|mad)?/i,
    /(\d{2,6})(?:[.,]\d{1,2})?\s*(?:dh|درهم|mad)\s*(?:المجموع|total|مجموع)?/i,
  ]

  for (const re of patterns) {
    const m = reply.match(re)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n >= 10 && n <= 1000000) return n
    }
  }
  return null
}

/* ─────────────────────────────────────────────────────────
   Delivery notes from customer messages
   ───────────────────────────────────────────────────────── */

const DELIVERY_HINTS = [
  // Arabic / Darija
  "اتصل قبل", "عيط قبل", "قبل التوصيل",
  "على باب الدار", "عند الباب",
  "بعد الساعة", "قبل الساعة",
  "من بعد", "صباحا", "مساءا", "مساء",
  "بدون زهور", "هدية",
  "على اسم", "على سمية",
  // French
  "appelez", "appeler avant", "avant la livraison",
  "à la porte", "devant la porte",
  "après", "avant",
  "au nom de",
  // English
  "call before", "ring", "at the door",
  "after", "before",
]

/**
 * Extract delivery notes from the last user messages.
 * Returns a compact string (max 200 chars) or null.
 */
export function extractDeliveryNotes(userMessages) {
  const msgs = Array.isArray(userMessages) ? userMessages : []
  const found = []

  for (const m of msgs) {
    const text = String(m.content || "").trim()
    if (!text) continue
    const lower = text.toLowerCase()
    const hit = DELIVERY_HINTS.some(h => lower.includes(h.toLowerCase()))
    if (hit) {
      // Keep original text (not lower) but trimmed
      if (!found.includes(text)) found.push(text)
    }
  }

  if (found.length === 0) return null
  const joined = found.join(" | ").slice(0, 200)
  return joined
}

/* ─────────────────────────────────────────────────────────
   Weak name detection
   ───────────────────────────────────────────────────────── */

/**
 * Detect whether a WhatsApp profile name is too weak for delivery.
 * Reasons: empty, emoji-only, single char, all numbers, generic like "Papa".
 */
export function isWeakCustomerName(name) {
  if (!name) return true
  const trimmed = String(name).trim()
  if (trimmed.length < 3) return true

  // Strip emojis/symbols; check what's left
  const alnum = trimmed.replace(/[^\p{L}\p{N}\s]/gu, "").trim()
  if (alnum.length < 3) return true          // emoji-only
  if (/^\d+$/.test(alnum)) return true       // all numbers

  // Generic placeholders that aren't real names
  const generics = ["papa", "maman", "bro", "sis", "user", "client", "customer", "me", "moi", "أنا"]
  if (generics.includes(alnum.toLowerCase())) return true

  return false
}

/**
 * Detect which variant options the customer selected.
 * Given a product's variants (JSON string or array of {name, options}) and the
 * full conversation, return a string like "المقاس: L — اللون: أحمر" or null.
 *
 * Looks at last AGENT messages (confirmation summary usually contains variant)
 * and last USER messages (they may have said "خذ لي L بالأحمر").
 */
export function extractSelectedVariant(product, messages) {
  if (!product) return null
  let variantGroups = []
  try {
    variantGroups = typeof product.variants === "string"
      ? JSON.parse(product.variants || "[]")
      : (Array.isArray(product.variants) ? product.variants : [])
  } catch { variantGroups = [] }
  if (!Array.isArray(variantGroups) || variantGroups.length === 0) return null

  const recent = (messages || []).slice(-10)
  const searchText = recent
    .map(m => String(m.content || ""))
    .join(" ")
    .toLowerCase()
  if (!searchText.trim()) return null

  const selected = []
  for (const group of variantGroups) {
    if (!group?.name || !Array.isArray(group.options)) continue
    // Longest option first (avoid "L" matching inside "XL")
    const sortedOpts = [...group.options].sort((a, b) => (b?.length || 0) - (a?.length || 0))
    for (const opt of sortedOpts) {
      const optNorm = String(opt || "").toLowerCase().trim()
      if (!optNorm) continue
      // Match as whole word when possible
      const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(optNorm)}(?:$|[^\\p{L}\\p{N}])`, "iu")
      if (re.test(searchText)) {
        selected.push(`${group.name}: ${opt}`)
        break
      }
    }
  }

  return selected.length > 0 ? selected.join(" — ") : null
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Try to extract the customer's real full name from their recent messages.
 * Looks for explicit patterns like "اسمي X" / "je m'appelle X" / "my name is X".
 * Returns trimmed name (2-50 chars) or null.
 */
export function extractRealName(userMessages) {
  const msgs = Array.isArray(userMessages) ? userMessages : []
  const patterns = [
    /(?:اسمي|إسمي|سميتي|سميتي\s*هي)\s+([^\n.,،]{2,50})/i,
    /(?:je\s+m['’]appelle|mon\s+nom\s+(?:est|c['’]est))\s+([^\n.,]{2,50})/i,
    /(?:my\s+name\s+is|i\s+am)\s+([^\n.,]{2,50})/i,
    /(?:على\s+اسم|على\s+سمية)\s+([^\n.,،]{2,50})/i, // "على اسم X" (delivery)
  ]
  // Walk newest-first so latest stated name wins
  for (let i = msgs.length - 1; i >= 0; i--) {
    const text = String(msgs[i].content || "")
    for (const re of patterns) {
      const m = text.match(re)
      if (m && m[1]) {
        const name = m[1].trim().replace(/\s+/g, " ")
        if (name.length >= 2 && name.length <= 50 && !isWeakCustomerName(name)) {
          return name
        }
      }
    }
  }
  return null
}
