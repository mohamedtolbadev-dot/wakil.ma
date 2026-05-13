// منطق AI Agent — يحلل ويرد على الرسائل
import { prisma } from "@/lib/prisma"
import { TAGS, stageTag, cleanReply as cleanReplyTags, hasOrderConfirmed, hasCancelOrder, hasSendImages } from "@/lib/aiTags"
import { applyOrderCancellationSideEffects, applyOrderCountedSideEffects, applyOrderEditSideEffects, isCountedStatus } from "@/lib/orderLifecycle"
import {
  detectOrderedProduct,
  extractLatestQuantity,
  parseTotalFromReply,
  extractDeliveryNotes,
  isWeakCustomerName,
  extractRealName,
  extractSelectedVariant,
} from "@/lib/orderExtraction"
import { reserveAIReply, releaseAIReplyReservation, recordAIUsage, estimateCostUsd, getEffectivePlan } from "@/lib/usageLimits"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
// دالة تطبيع رقم الهاتف (منع التكرار)
export function normalizePhone(phone) {
  if (!phone) return null
  let normalized = phone.replace(/\D/g, "")
  // ✅ [FIX] دعم الأرقام الدولية (فرنسا، أمريكا/كندا)
  if (normalized.startsWith("33") && normalized.length === 11) {
    // Phone normalized (FR)
    return normalized
  }
  if (normalized.startsWith("1") && normalized.length === 11) {
    // Phone normalized (US/CA)
    return normalized
  }
  if (normalized.startsWith("0")) {
    normalized = "212" + normalized.substring(1)
  }
  if (!normalized.startsWith("212") && normalized.length === 9) {
    normalized = "212" + normalized
  }
  return normalized
}
/**
 * Render template with variable substitution
 * Supports: {name}, {{name}}, {product}, {{product}}, {price}, {{price}}, {amount}, {{amount}}
 * Also: {tracking}, {{tracking}}, {trackingUrl}, {{trackingUrl}}, {agent}, {{agent}}, {item}, {{item}}, {message}, {{message}}
 * Falls back to empty string if template is null/undefined or empty after trim
 */
export function renderTemplate(template, vars) {
  // Hardened: check for null/undefined/empty after trim
  if (!template || typeof template !== 'string' || !template.trim()) return null
  let result = template
  const mappings = {
    // Support both {var} and {{var}} formats for backward compatibility
    '\\{\\{name\\}\\}': vars.customerName || vars.name || '',
    '\\{name\\}': vars.customerName || vars.name || '',
    '\\{\\{product\\}\\}': vars.productName || vars.product || '',
    '\\{product\\}': vars.productName || vars.product || '',
    '\\{\\{price\\}\\}': String(vars.price ?? vars.totalAmount ?? vars.amount ?? ''),
    '\\{price\\}': String(vars.price ?? vars.totalAmount ?? vars.amount ?? ''),
    '\\{\\{date\\}\\}': vars.date || '',
    '\\{date\\}': vars.date || '',
    '\\{\\{time\\}\\}': vars.time || '',
    '\\{time\\}': vars.time || '',
    '\\{\\{status\\}\\}': vars.status || '',
    '\\{status\\}': vars.status || '',
    '\\{\\{amount\\}\\}': String(vars.totalAmount || vars.amount || ''),
    '\\{amount\\}': String(vars.totalAmount || vars.amount || ''),
    '\\{\\{tracking\\}\\}': vars.trackingNumber || vars.tracking || '',
    '\\{tracking\\}': vars.trackingNumber || vars.tracking || '',
    '\\{\\{trackingUrl\\}\\}': vars.trackingUrl || '',
    '\\{trackingUrl\\}': vars.trackingUrl || '',
    '\\{\\{agent\\}\\}': vars.agentName || vars.agent || '',
    '\\{agent\\}': vars.agentName || vars.agent || '',
    '\\{\\{item\\}\\}': vars.itemName || vars.item || vars.productName || vars.product || '',
    '\\{item\\}': vars.itemName || vars.item || vars.productName || vars.product || '',
    '\\{\\{message\\}\\}': vars.customerMessage || vars.message || '',
    '\\{message\\}': vars.customerMessage || vars.message || '',
    '\\{\\{customerMessage\\}\\}': vars.customerMessage || vars.message || '',
    '\\{customerMessage\\}': vars.customerMessage || vars.message || '',
  }
  for (const [pattern, value] of Object.entries(mappings)) {
    result = result.replace(new RegExp(pattern, 'g'), value)
  }
  return result.trim()
}
// دالة آمنة لجلب الصور
function parseImages(imagesField) {
  if (!imagesField) return []
  const normalizeImageList = (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map((img) => {
        if (typeof img === "string") return img
        if (img && typeof img === "object") {
          return img.secure_url || img.url || img.src || img.link || ""
        }
        return ""
      })
      .map((img) => String(img || "").trim())
      .filter(Boolean)
  }
  try {
    if (typeof imagesField === 'string') {
      const parsed = JSON.parse(imagesField)
      if (typeof parsed === "string") return parseImages(parsed)
      return normalizeImageList(parsed)
    }
    return normalizeImageList(imagesField)
  } catch (e) {
    console.error("Error parsing images:", e)
  }
  return []
}
function normalizeImageUrlForWhatsApp(url) {
  const cleanUrl = String(url || "").trim()
  if (!/^https?:\/\//i.test(cleanUrl)) return ""
  try {
    const parsed = new URL(cleanUrl)
    const isCloudinaryImage = parsed.hostname.includes("res.cloudinary.com") && parsed.pathname.includes("/image/upload/")
    if (isCloudinaryImage) {
      parsed.pathname = parsed.pathname
        .replace("/image/upload/", "/image/upload/f_jpg,q_auto/")
        .replace(/\.(webp|gif|avif)(?=$|\?)/i, ".jpg")
      return parsed.toString()
    }
  } catch {
    return cleanUrl
  }
  return cleanUrl
}
/* ------------------------------------------------
   استخراج التاريخ من رسائل المحادثة
   يفهم: الدارجة + العربية + الأرقام
------------------------------------------------ */
function extractDateFromMessages(allMessages) {
  const text = allMessages
  // DEBUG (sanitized)
  console.log(`🔍 [extractDateFromMessages] Input length: ${text?.length || 0}`)
  // --- 1. أرقام صريحة: 2024-01-15 أو 15/01/2024 أو 15-01-2024 ---
  const numericPatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{2}\/\d{2}\/\d{4})/,
    /(\d{2}-\d{2}-\d{4})/,
  ]
  for (const pattern of numericPatterns) {
    const match = text.match(pattern)
    if (match) {
      // تحويل 15/01/2024 لـ 2024-01-15
      const normalized = match[1].includes("/")
        ? match[1].split("/").reverse().join("-")
        : match[1].includes("-") && match[1].length === 10 && !match[1].startsWith("20")
          ? match[1].split("-").reverse().join("-")
          : match[1]
      const parsed = new Date(normalized)
      const now = new Date()
      if (!isNaN(parsed.getTime()) && parsed >= now) {
        console.log(`📅 [extractDate] Numeric pattern matched`)
        return parsed
      } else if (!isNaN(parsed.getTime())) {
        console.log(`⚠️ [extractDate] Date is in the past, will use fallback`)
      }
    }
  }
  // --- 2. "اليوم" / "today" ---
  if (/اليوم|today/i.test(text)) {
    console.log(`📅 [extractDate] Matched: اليوم`)
    return new Date()
  }
  // --- 3. "غدا" / "بكرة" / "غدًا" / "tomorrow" ---
  if (/غد[اً]|بكرة|بكره|tomorrow/i.test(text)) {
    console.log(`📅 [extractDate] Matched: غدا/بكرة`)
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d
  }
  // --- 4. "بعد غد" / "بعد بكرة" / "day after tomorrow" ---
  if (/بعد غد|بعد بكرة|بعد بكره|day after tomorrow/i.test(text)) {
    console.log(`📅 [extractDate] Matched: بعد غد`)
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d
  }
  // --- 5. أيام الأسبوع ---
  // الأقرب في المستقبل (إذا فات يرجع للأسبوع الجاي)
  const dayMap = [
    { names: ["الأحد", "الحد", "حد", "sunday"],       day: 0 },
    { names: ["الاثنين", "التنين", "تنين", "monday"],  day: 1 },
    { names: ["الثلاثاء", "التلات", "تلات", "ثلاثا", "tuesday"], day: 2 },
    { names: ["الأربعاء", "الربع", "ربع", "wednesday"], day: 3 },
    { names: ["الخميس", "خميس", "خاميس", "thursday"], day: 4 },
    { names: ["الجمعة", "جمعة", "الجمعه", "جمعه", "friday"], day: 5 },
    { names: ["السبت", "سبت", "saturday"],             day: 6 },
  ]
  for (const { names, day } of dayMap) {
    if (names.some(n => text.includes(n))) {
      const today = new Date()
      const todayDay = today.getDay()
      let diff = day - todayDay
      // إذا نفس اليوم أو فات → الأسبوع الجاي
      if (diff <= 0) diff += 7
      const d = new Date()
      d.setDate(today.getDate() + diff)
      console.log(`📅 [extractDate] Day name matched: day=${day}, diff=${diff}`)
      return d
    }
  }
  // DEBUG: Log if no day matched (sanitized)
  console.log(`🔍 [extractDate] No day matched, checked ${dayMap.length} day patterns`)
  // --- 6. "هذا الأسبوع" / "الأسبوع الجاي" ---
  if (/هذا الأسبوع|هاد الأسبوع|هاد لأسبوع/i.test(text)) {
    console.log(`📅 [extractDate] Matched: هذا الأسبوع`)
    const d = new Date()
    d.setDate(d.getDate() + 3) // منتصف الأسبوع كافتراضي
    return d
  }
  if (/الأسبوع الجاي|الأسبوع الجاي|الجمعة الجاية/i.test(text)) {
    console.log(`📅 [extractDate] Matched: الأسبوع الجاي`)
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d
  }
  // --- 7. "بعد أسبوع" ---
  if (/بعد أسبوع|بعد اسبوع|next week/i.test(text)) {
    console.log(`📅 [extractDate] Matched: بعد أسبوع`)
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d
  }
  console.log(`📅 [extractDate] No date pattern found — will use fallback`)
  return null
}
/* ------------------------------------------------
    تنظيف العنوان المستخرج
------------------------------------------------ */
const MOJIBAKE_TEXT_RE = /[\u00C3\u00C2\u00D8\u00D9\u00E2\u00EF\u00F0\u0153\u017E\u2122\u20AC]/u
const MOJIBAKE_TEXT_RE_GLOBAL = /[\u00C3\u00C2\u00D8\u00D9\u00E2\u00EF\u00F0\u0153\u017E\u2122\u20AC]/gu
const ADDRESS_LOCATION_HINT_RE = /(?:^|[\s,،;:\-])(?:\u062D\u064A|\u062D\u0648\u0645\u0629|\u062F\u0631\u0628|\u0634\u0627\u0631\u0639|\u0632\u0646\u0642\u0629|\u062A\u062C\u0632\u0626\u0629|\u0625?\u0642\u0627\u0645\u0629|\u0639\u0645\u0627\u0631\u0629|\u0628\u0644\u0648\u0643|\u062F\u0648\u0627\u0631|\u0627\u0644\u0645\u0631\u0643\u0632|\u0631\u0642\u0645|\u062F\u0627\u0631|\u0645\u0646\u0632\u0644|\u0642\u0631\u0628|\u062D\u062F\u0627|\u0633\u0643\u0646|\u0633\u0627\u0643\u0646|\u0627\u0644\u062A\u0648\u0635\u064A\u0644|rue|av\.?|avenue|bd\.?|boulevard|quartier|residence|r[eé]sidence|lotissement|lot|immeuble|appt|appartement|bloc|block|derb|douar|dr|centre|center|markaz|souk|near|pr[eè]s|9rb|7da|hay|hayn|hayy|haye|hey|7ay|ra9m|rakm|rqm|num|n[°º]|numero|no\.?|dar|maison)(?=$|[\s,،;:\-]|\d)/i
const CITY_ONLY_REJECT_RE = /(?:\d|^ok$|^okay$|^oui$|^yes$|^non$|^no$|^واخا$|^صافي$|^نعم$|^لا$|confirm|commande|order|\u0637\u0644\u0628|\u0637\u0644\u0628\u064A\u0629|\u0628\u063A\u064A|\u0628\u063A\u064A\u062A|bghit|bgit|quantity|quantit[eé]|\u0643\u0645\u064A\u0629|\u062D\u0628\u0629|piece|pcs|\u062B\u0645\u0646|\u0633\u0639\u0631|\u062F\u0631\u0647\u0645|\bdh\b)/i
function repairMojibakeText(value) {
  if (typeof value !== "string" || !value || !MOJIBAKE_TEXT_RE.test(value)) {
    return value || ""
  }
  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8")
    if (!repaired || repaired.includes("\uFFFD")) {
      return value
    }
    const originalArabicScore = (value.match(/[\u0600-\u06FF]/g) || []).length
    const repairedArabicScore = (repaired.match(/[\u0600-\u06FF]/g) || []).length
    const originalMojibakeScore = (value.match(MOJIBAKE_TEXT_RE_GLOBAL) || []).length
    const repairedMojibakeScore = (repaired.match(MOJIBAKE_TEXT_RE_GLOBAL) || []).length
    if (repairedArabicScore > originalArabicScore || repairedMojibakeScore < originalMojibakeScore) {
      return repaired
    }
  } catch {
    return value
  }
  return value
}
function normalizeCustomerText(value, { keepNewlines = false } = {}) {
  if (value == null) return ""
  let text = repairMojibakeText(String(value))
  text = keepNewlines ? text.replace(/\r\n?/g, "\n") : text.replace(/\s+/g, " ")
  return text.trim()
}
const CUSTOMER_NAME_SENTENCE_RE = /\b(?:rah|ra|rani|hani|sift|syft|siftlik|syftlik|siftlek|smyti|smiti|smiyti|smitiya|name|nom|sent|send|already|deja|déjà|عطيتك|رسلت|رسلتلك|صيفطت|صيفطتلك|سميتي|الاسم|الإسم|قبل|من\s*قبل|راه|ها|هادي|هدا)\b/i
function isRejectedCustomerNamePhrase(value) {
  const text = normalizeCustomerText(value).toLowerCase()
  if (!text) return true
  if (CUSTOMER_NAME_SENTENCE_RE.test(text)) return true
  if (/[؟?!]/.test(text)) return true
  if (/(?:بغيت|اريد|نريد|عندي|خصني|طلب|طلبية|منتج|وصل|لغي|أكد|اكد|واش|شنو|فين|كيفاش|merci|thanks|thank)/i.test(text)) return true
  return false
}
function stripCityLabelPrefix(value) {
  return normalizeCustomerText(value)
    .replace(/^\s*(?:ville|\u0627\u0644\u0645\u062F\u064A\u0646\u0629|\u0645\u062F\u064A\u0646\u0629)\s*[::\-?,]?\s*/i, "")
    .trim()
}
function hasCityLabelPrefix(value) {
  return /^\s*(?:ville|\u0627\u0644\u0645\u062F\u064A\u0646\u0629|\u0645\u062F\u064A\u0646\u0629)\s*[::\-?,]?/i.test(normalizeCustomerText(value))
}
function cleanCityCandidate(value) {
  return stripCityLabelPrefix(value)
    .replace(/^[\s,?؟;:\-]+|[\s,?؟;:\-.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
function isPlausibleCityCandidate(value, { allowLocationWords = false } = {}) {
  const city = cleanCityCandidate(value)
  if (!city) return false
  if (!/[\p{L}]/u.test(city)) return false
  if (city.length < 2 || city.length > 45) return false
  if (city.split(/\s+/).length > 5) return false
  if (!allowLocationWords && ADDRESS_LOCATION_HINT_RE.test(city)) return false
  if (CITY_ONLY_REJECT_RE.test(city)) return false
  return true
}
function inferCityBeforeAddressHint(value) {
  const text = stripCityLabelPrefix(value)
  let match = ADDRESS_LOCATION_HINT_RE.exec(text)
  // Some places start with words that can also be address hints. In that case,
  // use the next hint as the split point instead of rejecting the city.
  if (match && match.index === 0) {
    const nextOffset = match[0].length
    const nextMatch = ADDRESS_LOCATION_HINT_RE.exec(text.slice(nextOffset))
    if (nextMatch) {
      match = { index: nextOffset + nextMatch.index }
    }
  }
  if (!match || match.index <= 0) return null
  const candidate = cleanCityCandidate(text.slice(0, match.index))
  return isPlausibleCityCandidate(candidate, { allowLocationWords: true }) ? candidate : null
}
function inferCityOnlyResponse(value, { allowLocationWords = false } = {}) {
  const candidate = cleanCityCandidate(value)
  return isPlausibleCityCandidate(candidate, { allowLocationWords }) ? candidate : null
}
function detectCityFromUserLine(value, { previousAgentMessage = "", allowCityOnly = false } = {}) {
  const text = normalizeCustomerText(value)
  if (!text) return null
  const combinedCity = inferCityBeforeAddressHint(text)
  if (combinedCity) return combinedCity
  const shouldAcceptCityOnly =
    allowCityOnly ||
    hasCityLabelPrefix(text) ||
    isCityQuestion(previousAgentMessage)
  return shouldAcceptCityOnly
    ? inferCityOnlyResponse(text, { allowLocationWords: true })
    : null
}
function getMessageText(message) {
  return typeof message?.content === "string"
    ? normalizeCustomerText(message.content, { keepNewlines: true })
    : ""
}
function isUserMessage(message) {
  return !message?.role || message.role === "USER"
}
function findPreviousAgentMessage(messages, index) {
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i]?.role === "AGENT") return getMessageText(messages[i])
  }
  return ""
}
function isCityQuestion(text) {
  return /(?:ville|city|lmdina|mdina|المدينة|مدينة|مدينتك|مدينتكم|شنو\s+هي\s+المدينة|شنو\s+المدينة|فين\s+ساكن|فين\s+نوصلك|فين\s+نوصل|فين\s+نوصلو|فين\s+نوصلو\s+ليك|فين\s+نوصلوها|فين\s+نوصلوها\s+ليك|فين\s+نوصلهالك|فين\s+بغيتي\s+نوصلوها|فين\s+بغيتنا\s+نوصلوها|فين\s+بغيتنا\s+نوصلوها\s+ليك|فين\s+بغيت\s+نوصلوها|فين\s+بغيت\s+نوصلهالك|فين\s+غادي\s+نوصلو|منين\s+نتا|فين\s+ساكن|فاش\s+من\s+مدينة|عطيني\s+المدينة|المدينة\s*(?:\+|و|et|and)\s*العنوان|العنوان\s*(?:\+|و|et|and)\s*المدينة|quelle\s+ville|tu\s+es\s+dans\s+quelle\s+ville|ville\s*(?:et|\/|\+)\s*adresse|adresse\s*(?:compl[eè]te|et\s+ville))/i.test(text || "")
}
function isAddressQuestion(text) {
  return /(?:adresse|address|العنوان|عنوان|العنوان\s+الكامل|عنوانك|العنوان\s+ديالك|الحي|الزنقة|الشارع|رقم\s+الدار|تفاصيل\s+التوصيل|عطيني\s+العنوان|العنوان\s+كامل|فين\s+بالضبط|الحي\s+والزنقة|شي\s+علامة\s+قريبة|فين\s+نلقاك|فين\s+يوصلك\s+ livreur|adresse\s+compl[eè]te|full\s+address|quartier|rue|house\s+number)/i.test(text || "")
}
function isNameQuestion(text) {
  return /(?:nom\s+complet|c['’]est\s+quoi\s+ton\s+nom|ton\s+nom|full\s+name|your\s+name|name\s+for\s+delivery|الاسم\s+الكامل|اسمك\s+الكامل|شنو\s+سميتك|سميتك|سمية|الإسم|الاسم)/i.test(text || "")
}
function isShortLocationReply(value) {
  const candidate = cleanCityCandidate(value)
  const tokens = candidate.split(/[\s,?]+/).filter(Boolean)
  return (
    tokens.length >= 1 &&
    tokens.length <= 3 &&
    tokens[0].length >= 2 &&
    /[\p{L}]/u.test(candidate) &&
    !CITY_ONLY_REJECT_RE.test(candidate)
  )
}
function isConfirmationOnlyReply(value) {
  return /^(?:ok|okay|oui|yes|yep|wa5a|wakha|safi|aked|akked|akid|mouafaq|confirm|confirmed|confirm[eé]|ah|aah|shih|shi+h?|s7i7|sahi+h?|واخا|صافي|نعم|ايه|إيه|اه|آه|تمام|تم|أكد|اكد|أكدها|اكدها|اكيد|أؤكد|أاكد|نأكد|ناكد|اعتمد|اعتمدها|موافق|ديرها|سجل|سجلها|سجل الطلب|سجل الطلبية|أكد الطلب|أكدها ليا|توكل على الله|يلا|صيفطو|كلشي صحيح|هادشي صحيح|كلشي واضح|هادشي واضح)$/i.test(
    normalizeCustomerText(value)
  )
}
function isOrderConfirmationReply(value) {
  const text = normalizeCustomerText(value).toLowerCase()
  if (!text) return false
  if (isConfirmationOnlyReply(text)) return true
  return /^(?:ok\s*)?(?:aked|akked|akid|confirm|confirmed|valide|valid[eé]|oui|yes|shih|shi+h?|s7i7|sahi+h?|ah|aah|na3am|n3am|naam|اه|آه|ايه|إيه|نعم|واخا|صافي|تمام|موافق|أكد|اكد|أكدها|اكدها|اكيد|نأكد|ناكد|اعتمد|اعتمدها)(?:\s+(?:shih|shi+h|s7i7|sahi+h|talabya|talbia|commande|order|kolchi\s+shi+h?|kolchi\s+s7i7|كلشي\s+صحيح|الطلبية|الطلب))?[\s!?،.]*$/i.test(text)
}
// ✅ FIXED — strict explicit confirmation (only confirm/اكد/aked words, no generic yes/ok)
function isExplicitConfirmation(text) {
  const t = normalizeCustomerText(text).trim()
  return /^(?:اكد|aked|akked|أكد|أكدها|اكدها|أؤكد|اعتمد|اعتمدها|نأكد|confirm|confirmed)[\s!?،.]*$/i.test(t)
}
function cleanNameCandidate(value) {
  return normalizeCustomerText(value)
    .replace(/^(?:nom\s+complet|nom|name|full\s+name|الاسم\s+الكامل|الاسم|اسمك|سميتك|سميت|سميتي|السمية)\s*[::\-?,]?\s*/i, "")
    .replace(/[\s،,.\-:؟?!]+$/g, "")
    .trim()
}
function isPlausibleFullName(value) {
  const name = cleanNameCandidate(value)
  if (!name || isConfirmationOnlyReply(name)) return false
  if (isRejectedCustomerNamePhrase(name)) return false
  if (name.length < 5 || name.length > 60) return false
  if (!/[\p{L}]/u.test(name)) return false
  if (/\d/.test(name)) return false
  const tokens = name.split(/\s+/).filter(Boolean)
  if (tokens.length < 2 || tokens.length > 5) return false
  if (tokens.some(token => token.length < 2)) return false
  if (ADDRESS_LOCATION_HINT_RE.test(name)) return false
  if (CITY_ONLY_REJECT_RE.test(name)) return false
  if (/(?:commande|order|produit|product|quantity|quantit[eé]|prix|price|dh|درهم|طلب|طلبية|مدينة|العنوان|adresse|address|ville|city)/i.test(name)) {
    return false
  }
  return !isWeakCustomerName(name)
}
const FAKE_ORDER_FIELD_RE = /(?:hhhh+|mdr+|lol+|haha+|test|testing|asdf|qwerty|xxx+|zzz+|batman|superman|spiderman|joker|mickey|fake|spam|robot|bot|القمر|المريخ|زحل|الفضاء|كوكب|واكاندا|مجهول|فينما|فين\s*ما\s*كان|والو|لاشيء|لا\s*شيء|غير\s*هاكا)/i
function hasKeyboardMash(value) {
  const text = normalizeCustomerText(value).toLowerCase().replace(/\s+/g, "")
  if (!text) return true
  if (/(.)\1{4,}/u.test(text)) return true
  if (/^[a-z]{4,}$/i.test(text) && !/[aeiouy]/i.test(text)) return true
  return false
}
function isSuspiciousOrderField(value) {
  const text = normalizeCustomerText(value)
  if (!text) return true
  if (FAKE_ORDER_FIELD_RE.test(text)) return true
  if (hasKeyboardMash(text)) return true
  return false
}
function isPlausibleOrderAddress(value, city = null) {
  const address = cleanExtractedAddress(value)
  if (!address) return false
  if (isSuspiciousOrderField(address)) return false
  if (city && normalizeCustomerText(address).toLowerCase() === normalizeCustomerText(city).toLowerCase()) return false
  if (address.length < 8 || address.length > 180) return false
  const tokens = address.split(/\s+/).filter(Boolean)
  if (tokens.length < 2) return false
  const hasAddressSignal = /(?:حي|حومة|درب|شارع|زنقة|تجزئة|إقامة|اقامة|عمارة|بلوك|دوار|رقم|دار|منزل|قرب|حدا|سكن|ساكن|rue|avenue|bd|boulevard|quartier|residence|résidence|lotissement|immeuble|appt|appartement|bloc|block|derb|douar|near|près|9rb|7da|hay|ra9m|num|numero|dar|maison|\d)/i.test(address)
  return hasAddressSignal
}
function isPlausibleOrderCity(value) {
  const city = cleanExtractedCity(value)
  if (!city) return false
  if (isSuspiciousOrderField(city)) return false
  if (city.length < 2 || city.length > 60) return false
  if (!/[\p{L}]/u.test(city)) return false
  if (/\d/.test(city)) return false
  const tokens = city.split(/\s+/).filter(Boolean)
  return tokens.length <= 4
}
function validateOrderQuality({ selectedItem, quantity, city, address, customerName } = {}) {
  const issues = []
  if (!selectedItem?.id) {
    issues.push({ field: "product", reason: "invalid_product" })
  }
  if (!Number.isFinite(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 50) {
    issues.push({ field: "quantity", reason: "invalid_quantity" })
  }
  if (!isPlausibleOrderCity(city)) {
    issues.push({ field: "city", reason: "invalid_city" })
  }
  if (!isPlausibleOrderAddress(address, city)) {
    issues.push({ field: "address", reason: "invalid_address" })
  }
  if (!isPlausibleFullName(customerName)) {
    issues.push({ field: "name", reason: "invalid_name" })
  }
  return issues
}
function buildOrderQualityReply(issue, agent, replyMode = null) {
  const field = issue?.field || "address"
  const lang = replyMode || getAgentLang(agent?.language)
  if (lang === "french") {
    if (field === "name") return "⚠️ Pour éviter une erreur de livraison, donne-moi ton vrai nom complet s'il te plaît."
    if (field === "address") return "⚠️ Je ne peux pas confirmer la commande avec cette adresse.\n📍 Donne-moi une adresse claire: quartier/rue, numéro de maison ou un repère proche."
    if (field === "city") return "⚠️ La ville n'est pas claire.\n🏙️ Donne-moi la ville ou la région correcte pour la livraison."
    if (field === "quantity") return "⚠️ La quantité n'est pas claire.\n🔢 Combien de pièces tu veux exactement ?"
    return "⚠️ Je veux juste confirmer le produit exact avant de créer la commande."
  }
  if (lang === "darija" || lang === "darija_arabic") {
    if (field === "name") return "⚠️ عطيني السمية الكاملة ديالك باش يوصل الطلب بلا مشكل."
    if (field === "address") return "⚠️ العنوان ما واضحش مزيان.\n📍 عافاك عطيني الحي، الزنقة، رقم الدار إلا كاين، وشي علامة قريبة."
    if (field === "city") return "⚠️ المدينة ما بايناش مزيان.\n🏙️ عافاك عطيني المدينة فين نوصلو ليك."
    if (field === "quantity") return "⚠️ الكمية ما بايناش مزيان.\n🔢 شحال بغيتي من وحدة بالضبط؟"
    return "⚠️ خاصني غير نأكد معاك شنو المنتج اللي بغيتي."
  }
  if (field === "name") return "⚠️ أحتاج إلى اسمك الكامل الحقيقي لتفادي خطأ في التوصيل."
  if (field === "address") return "⚠️ لا يمكنني تأكيد الطلب بهذا العنوان لأنه غير واضح.\n📍 أرسل عنوانا واضحا: الحي/الشارع ورقم المنزل أو معلم قريب."
  if (field === "city") return "⚠️ المدينة غير واضحة.\n🏙️ أرسل المدينة أو المنطقة الصحيحة للتوصيل."
  if (field === "quantity") return "⚠️ الكمية غير واضحة.\n🔢 كم قطعة تريد بالضبط؟"
  return "⚠️ أحتاج فقط لتأكيد المنتج الصحيح قبل إنشاء الطلب."
}
function extractCustomerFullNameFromMessages(messages) {
  const allMessages = Array.isArray(messages) ? messages : []
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const message = allMessages[i]
    if (!isUserMessage(message)) continue
    const text = getMessageText(message)
    if (!text) continue
    const explicitName = normalizeCustomerText(extractRealName([{ content: text }]))
    if (explicitName && isPlausibleFullName(explicitName)) return explicitName
    const previousAgentMessage = findPreviousAgentMessage(allMessages, i)
    if (isNameQuestion(previousAgentMessage) && isPlausibleFullName(text)) {
      return cleanNameCandidate(text)
    }
  }
  // Fallback: read the customer name from the last agent summary message.
  // If the AI already wrote the name in a summary like "الاسم: محمد العلوي",
  // extract it from there so we don't ask again.
  for (let i = allMessages.length - 1; i >= 0; i--) {
    if (allMessages[i]?.role !== "AGENT") continue
    const agentText = getMessageText(allMessages[i])
    if (!agentText) continue
    // Match patterns like "الاسم: X", "Nom: X", "Name: X" inside a summary
    const nameMatch = agentText.match(
      /(?:nom(?:\s+complet)?|name|full\s+name|smitk|smit|\u0627\u0644\u0627\u0633\u0645(?:\s+\u0627\u0644\u0643\u0627\u0645\u0644)?|\u0627\u0633\u0645)\s*[::]\s*([^\n\r\ud83d\udce6\ud83d\udd22\ud83c\udfd9\ud83c\udfe0\ud83d\udcb0\u2705]+)/iu
    )
    if (nameMatch) {
      const candidate = cleanNameCandidate(nameMatch[1])
      if (isPlausibleFullName(candidate)) return candidate
    }
    // Also recover names from natural agent openings like "Merci, Mohamed Tolba".
    const greetingNameMatch = agentText.match(
      /(?:merci|mrhba|marhba|shukran|bonjour|salam)\s*[,?\s]+\s*([^\n\r📦🔢🏙🏠💰✅,?.!؟!]{2,50})/iu
    )
    if (greetingNameMatch) {
      const candidate = cleanNameCandidate(greetingNameMatch[1])
      if (isPlausibleFullName(candidate)) return candidate
    }
  }
  return null
}
function cleanSummaryFieldValue(value) {
  return normalizeCustomerText(value)
    .replace(/[📦🔢🏙️🏠💰✅]/gu, "")
    .replace(/^[\s::\-?,]+|[\s::\-?,.!؟!]+$/g, "")
    .trim()
}
function extractLocationFromAgentSummary(text) {
  const normalized = normalizeCustomerText(text, { keepNewlines: true })
  if (!normalized) return { city: null, address: null }
  const cityMatch = normalized.match(/(?:ville|city|lmdina|\u0627\u0644\u0645\u062F\u064A\u0646\u0629|\u0645\u062F\u064A\u0646\u0629)\s*[::]\s*([^\n\r]+)/i)
  const addressMatch = normalized.match(/(?:adresse|address|\u0627\u0644\u0639\u0646\u0648\u0627\u0646|\u0639\u0646\u0648\u0627\u0646)\s*[::]\s*([^\n\r]+)/i)
  return {
    city: cityMatch ? cleanExtractedCity(cleanSummaryFieldValue(cityMatch[1])) : null,
    address: addressMatch ? cleanExtractedAddress(cleanSummaryFieldValue(addressMatch[1])) : null,
  }
}
function findLatestAgentSummaryLocation(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role !== "AGENT") continue
    const location = extractLocationFromAgentSummary(getMessageText(messages[i]))
    if (location.city || location.address) return location
  }
  return { city: null, address: null }
}
function extractOrderSummaryField(text, labels = []) {
  const normalized = normalizeCustomerText(text, { keepNewlines: true })
  if (!normalized) return null
  const escapedLabels = labels
    .map(label => String(label || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean)
  if (escapedLabels.length === 0) return null
  const labelRe = new RegExp(`^(?:${escapedLabels.join("|")})\\s*[:：=\\-]?\\s*(.+)$`, "iu")
  for (const rawLine of normalized.split("\n")) {
    const line = cleanSummaryFieldValue(rawLine)
    if (!line) continue
    const match = line.match(labelRe)
    if (!match?.[1]) continue
    const value = cleanSummaryFieldValue(match[1])
    if (value) return value
  }
  return null
}
function parseSummaryNumber(value) {
  const match = String(value || "").match(/\d{1,6}/)
  if (!match) return null
  const number = Number.parseInt(match[0], 10)
  return Number.isFinite(number) ? number : null
}
function extractOrderSummaryFields(text) {
  return {
    productName: extractOrderSummaryField(text, ["المنتج", "المُنتج", "produit", "product"]),
    quantity: parseSummaryNumber(extractOrderSummaryField(text, ["الكمية", "العدد", "quantity", "quantité", "quantite", "l3adad", "l3dad"])),
    city: extractOrderSummaryField(text, ["المدينة", "مدينة", "ville", "city", "lmdina", "mdina"]),
    address: extractOrderSummaryField(text, ["العنوان", "عنوان", "adresse", "address"]),
    customerName: extractOrderSummaryField(text, ["السمية", "الاسم", "الإسم", "اسم", "nom", "name", "full name", "nom complet", "smitk", "smiti"]),
    totalAmount: parseTotalFromReply(text),
  }
}
function getPendingOrderSummaryMissingFields(summary, selectedItem = null) {
  const draft = summary && typeof summary === "object" ? summary : {}
  const missing = []
  if (!(selectedItem?.id || draft.productId || draft.productName)) missing.push("product")
  const qty = Number(draft.quantity)
  if ((!Number.isFinite(qty) || qty < 1) && selectedItem?.askQuantity !== false) missing.push("quantity")
  if (!cleanExtractedCity(draft.city) || cleanExtractedCity(draft.city).length < 2) missing.push("city")
  if (!cleanExtractedAddress(draft.address) || cleanExtractedAddress(draft.address).length < 8) missing.push("address")
  if (!isPlausibleFullName(draft.customerName)) missing.push("name")
  return missing
}
function hasReadyPendingOrderSummary(summary, selectedItem = null) {
  return getPendingOrderSummaryMissingFields(summary, selectedItem).length === 0
}
function buildPendingOrderSummarySnapshot({ reply = "", conversation = null, selectedItem = null } = {}) {
  const conversationMessages = Array.isArray(conversation?.messages) ? conversation.messages : []
  const messagesWithSummary = [
    ...conversationMessages,
    { role: "AGENT", content: reply },
  ]
  const summaryFields = extractOrderSummaryFields(reply)
  const userMessages = messagesWithSummary
    .filter(isUserMessage)
    .map(message => ({ content: getMessageText(message) }))
  const location = extractCityAndAddressFromUserMessages(messagesWithSummary.slice(-30))
  const summaryName = cleanNameCandidate(summaryFields.customerName)
  const extractedName = normalizeCustomerText(extractCustomerFullNameFromMessages(messagesWithSummary))
  const quantity =
    summaryFields.quantity ||
    extractLatestQuantity(userMessages.slice(-12)) ||
    (selectedItem?.askQuantity === false ? 1 : null)
  const snapshot = {
    at: new Date().toISOString(),
    productId: selectedItem?.id || null,
    productName: selectedItem?.name || summaryFields.productName || null,
    quantity,
    city: cleanExtractedCity(summaryFields.city) || cleanExtractedCity(location.city) || null,
    address: cleanExtractedAddress(summaryFields.address) || cleanExtractedAddress(location.address) || null,
    customerName: isPlausibleFullName(summaryName) ? summaryName : extractedName || null,
    totalAmount: summaryFields.totalAmount || null,
  }
  snapshot.missingFields = getPendingOrderSummaryMissingFields(snapshot, selectedItem)
  snapshot.ready = snapshot.missingFields.length === 0
  return snapshot
}
function sameLocationValue(a, b) {
  const normalize = (value) => normalizeCustomerText(value).toLowerCase()
  return normalize(a) && normalize(a) === normalize(b)
}
function getStillMissingFieldsAfterCurrentReply(pendingFields, currentMessage, previousAgentMessage, items = [], selectedItem = null) {
  if (!Array.isArray(pendingFields) || pendingFields.length === 0) return []
  const currentText = normalizeCustomerText(currentMessage, { keepNewlines: true })
  return pendingFields.filter((field) => {
    if (field === "product") {
      if (selectedItem) return false
      return !detectOrderedProduct(items, [{ role: "USER", content: currentText }], null)
    }
    if (field === "quantity") {
      return !extractLatestQuantity([{ content: currentText }])
    }
    if (field === "city") {
      if (isConfirmationOnlyReply(currentText)) return true
      const cityFromMessage = detectCityFromUserLine(currentText, {
        previousAgentMessage,
        allowCityOnly: true,
      })
      return !(cityFromMessage || (isCityQuestion(previousAgentMessage) && isShortLocationReply(currentText)))
    }
    if (field === "address") {
      const address = cleanExtractedAddress(currentText)
      const isCityOnlyAnswer =
        isCityQuestion(previousAgentMessage) &&
        isShortLocationReply(currentText) &&
        !inferCityBeforeAddressHint(currentText)
      const hasAddressSignal =
        !isCityOnlyAnswer &&
        (isAddressQuestion(previousAgentMessage) ||
          ADDRESS_LOCATION_HINT_RE.test(currentText) ||
          Boolean(inferCityBeforeAddressHint(currentText)))
      return !(hasAddressSignal && address && !isConfirmationOnlyReply(currentText))
    }
    if (field === "name") {
      const explicitName = extractRealName([{ content: currentText }])
      const nameFromReply =
        explicitName ||
        (isNameQuestion(previousAgentMessage) && isPlausibleFullName(currentText)
          ? cleanNameCandidate(currentText)
          : null)
      return !nameFromReply
    }
    return true
  })
}
function computeMissingFieldsFromConversation(messages = [], items = [], selectedItem = null) {
  const userMessages = (messages || []).filter(isUserMessage)
  const allMessages = messages || []
  const missing = []
  // 1. Product
  const detectedProduct = detectOrderedProduct(items, allMessages, selectedItem)
  if (!detectedProduct) {
    missing.push("product")
  }
  // 2. Quantity
  const latestQty = extractLatestQuantity(userMessages)
  const effectiveProduct = detectedProduct || selectedItem
  if (!latestQty && effectiveProduct?.askQuantity !== false) {
    missing.push("quantity")
  }
  // 3. City & Address
  const location = extractCityAndAddressFromUserMessages(allMessages)
  const extractedCity = cleanExtractedCity(location.city)
  const extractedAddress = cleanExtractedAddress(location.address)
  if (!extractedCity) missing.push("city")
  if (!extractedAddress) missing.push("address")
  // 4. Name
  const extractedName = normalizeCustomerText(extractCustomerFullNameFromMessages(allMessages))
  if (!extractedName) missing.push("name")
  return missing
}
function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
function stripDetectedCityFromStart(value, city) {
  let text = stripCityLabelPrefix(value)
  if (city) {
    text = text.replace(new RegExp(`^\\s*${escapeRegExp(city)}\\s*`, "i"), "")
  }
  return text.replace(/^[\s,?;\-:]+/, "").trim()
}
function cleanExtractedAddress(raw) {
  let addr = repairMojibakeText(String(raw ?? "")).replace(/\r\n?/g, "\n").trim()
  if (!addr) return null
  addr = addr
    .replace(/^\s*(?:adresse|address|\u0627\u0644\u0639\u0646\u0648\u0627\u0646|\u0639\u0646\u0648\u0627\u0646)\s*[::\-?,]?\s*/i, "")
    .trim()
  addr = addr.replace(/[\s?؟,.\-:!]+$/, "").trim()
  if (!addr || /^(?:adresse|address|\u0627\u0644\u0639\u0646\u0648\u0627\u0646|\u0639\u0646\u0648\u0627\u0646)$/i.test(addr)) {
    return null
  }
  return addr.length >= 2 ? addr : null
}
function cleanExtractedCity(raw) {
  let city = repairMojibakeText(String(raw ?? "")).replace(/\r\n?/g, "\n").trim()
  if (!city) return null
  city = city
    .replace(/^\s*(?:ville|\u0627\u0644\u0645\u062F\u064A\u0646\u0629|\u0645\u062F\u064A\u0646\u0629)\s*[::\-?,]?\s*/i, "")
    .replace(/[\s?؟,.\-:!]+$/u, "")
    .trim()
  return city.length >= 2 ? city : null
}
/* ------------------------------------------------
    استخراج العنوان كما كتبه الزبون (نهائي)
   الهدف: نخزنو نفس النص بدون إضافة/نقصان
------------------------------------------------ */
function extractLiteralAddressFromUserMessages(userMsgs) {
  const msgs = Array.isArray(userMsgs) ? userMsgs : []
  if (msgs.length === 0) return null
  const MARKETING_HINT = /(?:promo|offer|discount|\u0646\u0635\u064A\u062D\u0629|\u0628\u0627\u0642\u0629|\u062F\u0631\u0647\u0645|\u062A\u0648\u0641\u064A\u0631|\u0647\u062F\u064A\u0629|\u0639\u0631\u0636|\u062A\u062E\u0641\u064A\u0636)/i
  const ADDRESS_HINT = /(?:^|\b)(?:adresse|address|\u0627\u0644\u0639\u0646\u0648\u0627\u0646|\u0639\u0646\u0648\u0627\u0646|\u062D\u064A|\u062D\u0648\u0645\u0629|\u062F\u0631\u0628|\u0634\u0627\u0631\u0639|\u0632\u0646\u0642\u0629|\u062A\u062C\u0632\u0626\u0629|\u0625?\u0642\u0627\u0645\u0629|\u0639\u0645\u0627\u0631\u0629|\u0628\u0644\u0648\u0643|\u062F\u0648\u0627\u0631|\u0627\u0644\u0645\u0631\u0643\u0632|\u0631\u0642\u0645|\u062F\u0627\u0631|\u0645\u0646\u0632\u0644|\u0642\u0631\u0628|\u062D\u062F\u0627|\u0633\u0643\u0646|\u0633\u0627\u0643\u0646|\u0627\u0644\u062A\u0648\u0635\u064A\u0644|rue|av\.?|avenue|bd\.?|boulevard|quartier|residence|r[eé]sidence|lotissement|lot|immeuble|appt|appartement|bloc|block|derb|douar|dr|centre|center|markaz|souk|near|pr[eè]s|9rb|7da|hay|hayy|haye|hey|ra9m|rakm|rqm|num|n[°º]|numero|no\.?|dar|maison)(?:\b|:)/i
  for (let i = msgs.length - 1; i >= 0; i--) {
    const raw = typeof msgs[i]?.content === "string" ? normalizeCustomerText(msgs[i].content, { keepNewlines: true }) : ""
    if (!raw.trim()) continue
    if (MARKETING_HINT.test(raw)) continue
    // خذ أول سطر غير فارغ (الزبون كيرسل سطر واحد غالباً)
    const firstLine = raw.split("\n").map(s => s.trim()).find(Boolean) || ""
    if (!firstLine) continue
    if (ADDRESS_HINT.test(firstLine) || inferCityBeforeAddressHint(firstLine)) {
      // فقط حذف prefix إذا كان label، بدون لمس باقي النص
      const cleaned = cleanExtractedAddress(firstLine)
      return cleaned || firstLine.trim()
    }
  }
  return null
}
/* ------------------------------------------------
    استخراج (المدينة + العنوان) بشكل منفصل
   - المدينة: إذا قدرنا نعرفها من نفس الرسالة
   - العنوان: نفس نص الزبون (بدون "Adresse:" فقط) ثم نحيد المدينة من البداية إذا كانت مكتوبة
------------------------------------------------ */
function extractCityAndAddressFromUserMessages(userMsgs) {
  const allMessages = Array.isArray(userMsgs) ? userMsgs : []
  const summaryLocation = findLatestAgentSummaryLocation(allMessages)
  const msgs = allMessages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => isUserMessage(message))
  if (msgs.length === 0) return { city: null, address: null }
  const MARKETING_HINT = /(?:promo|offer|discount|\u0646\u0635\u064A\u062D\u0629|\u0628\u0627\u0642\u0629|\u062F\u0631\u0647\u0645|\u062A\u0648\u0641\u064A\u0631|\u0647\u062F\u064A\u0629|\u0639\u0631\u0636|\u062A\u062E\u0641\u064A\u0636)/i
  // 1) Find latest address-like user message (keep it as-is)
  let addressRaw = null
  let addressIdx = -1
  for (let i = msgs.length - 1; i >= 0; i--) {
    const { message, index } = msgs[i]
    const raw = getMessageText(message)
    if (!raw) continue
    if (MARKETING_HINT.test(raw)) continue
    const firstLine = raw.split("\n").map(s => s.trim()).find(Boolean) || ""
    if (!firstLine) continue
    const cityFromCombinedLine = inferCityBeforeAddressHint(firstLine)
    const previousAgentMessage = findPreviousAgentMessage(allMessages, index)
    if (isCityQuestion(previousAgentMessage) && isShortLocationReply(firstLine) && !cityFromCombinedLine) {
      continue
    }
    if (ADDRESS_LOCATION_HINT_RE.test(firstLine) || cityFromCombinedLine) {
      addressRaw = cleanExtractedAddress(firstLine) || firstLine
      addressIdx = index
      break
    }
  }
  // 2) Find city from "city + address" text, city labels, or city-only answers.
  let city = summaryLocation.city || null
  for (let i = msgs.length - 1; i >= 0; i--) {
    const { message, index } = msgs[i]
    const raw = getMessageText(message)
    if (!raw) continue
    if (MARKETING_HINT.test(raw)) continue
    const firstLine = raw.split("\n").map(s => s.trim()).find(Boolean) || ""
    if (!firstLine) continue
    if (isConfirmationOnlyReply(firstLine)) continue
    const previousAgentMessage = findPreviousAgentMessage(allMessages, index)
    const canUseCityOnly = hasCityLabelPrefix(firstLine) || isCityQuestion(previousAgentMessage)
    const detected =
      detectCityFromUserLine(firstLine, {
        previousAgentMessage,
        allowCityOnly: canUseCityOnly,
      })
    if (!city && detected) { city = detected; break }
  }
  // 3) If we didn't find an address message, fall back to literal (may be city+address in one line)
  if (!addressRaw) {
    const literal = summaryLocation.address || extractLiteralAddressFromUserMessages(msgs.map(({ message }) => message))
    if (!literal) return { city, address: null }
    addressRaw = literal.trim()
  }
  // 4) If address line contains a city token at the beginning, strip it (keep address only)
  const cityInAddress = inferCityBeforeAddressHint(addressRaw)
  let addressOnly = addressRaw
  if (cityInAddress && (!city || sameLocationValue(city, cityInAddress))) {
    city = city || cityInAddress
    addressOnly = stripDetectedCityFromStart(addressOnly, cityInAddress)
  }
  // Fallback: if no city detected yet but we have an address-like string,
  // treat the first 1-2 words as the city. GPT knows Moroccan geography,
  // so local code should not reject unknown towns, regions, or douars.
  if (!city && addressRaw) {
    const tokens = addressRaw.trim().split(/[\s,?]+/).filter(Boolean)
    if (tokens.length >= 1 && tokens[0].length >= 2 && !CITY_ONLY_REJECT_RE.test(tokens[0])) {
      city = tokens.slice(0, 2).join(" ")
      addressRaw = tokens.length <= 2 ? null : tokens.slice(2).join(" ")
      addressOnly = addressRaw
    }
  }
  return {
    city: cleanExtractedCity(city) || "",
    address: cleanExtractedAddress(addressOnly || addressRaw) || "",
  }
}
function selectRelevantProducts(products, currentMessage, recentMessages, maxCount = 15) {
  const activeProducts = Array.isArray(products)
    ? products.filter(product => product?.isActive)
    : []
  if (activeProducts.length <= maxCount) return activeProducts
  const contextText = [
    currentMessage,
    ...(Array.isArray(recentMessages) ? recentMessages.slice(-8).map(message => message?.content || "") : []),
  ].join(" ")
  const normalizedText = normalizeProductLookupText(contextText)
  if (!normalizedText) return activeProducts.slice(0, maxCount)
  const scored = activeProducts.map(product => ({
    product,
    score: productLookupScore(product, normalizedText),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, maxCount).map(item => item.product)
}
function normalizeProductLookupText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}
const PRODUCT_LOOKUP_STOPWORDS = new Set([
  "original", "originale", "الأصلي", "الاصلي",
  "pour", "for", "produit", "product",
])
function getProductLookupTokens(value) {
  return normalizeProductLookupText(value)
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3)
    .filter(token => !/^\d+(?:ml|g|kg|l|cm)?$/i.test(token))
    .filter(token => !/^(?:ml|g|kg|l|cm)$/i.test(token))
    .filter(token => !PRODUCT_LOOKUP_STOPWORDS.has(token))
}
function productLookupScore(product, normalizedText) {
  const name = normalizeProductLookupText(product?.name)
  if (!name || !normalizedText) return 0
  if (normalizedText.includes(name)) return 1000 + name.length
  const tokens = getProductLookupTokens(product?.name)
  if (tokens.length === 0) return 0
  const matched = tokens.filter(token => normalizedText.includes(token))
  if (matched.length >= 2) return matched.length * 100 + matched.join(" ").length
  const only = matched[0]
  if (only && only.length >= 6) return 60 + only.length
  return 0
}
function findProductsMentionedInText(products, text) {
  if (!Array.isArray(products) || products.length === 0) return []
  const normalizedText = normalizeProductLookupText(text)
  if (!normalizedText) return []
  return products
    .map(product => {
      const score = productLookupScore(product, normalizedText)
      if (score <= 0) return null
      const name = normalizeProductLookupText(product?.name)
      const directIndex = normalizedText.indexOf(name)
      const tokenIndexes = getProductLookupTokens(product?.name)
        .map(token => normalizedText.indexOf(token))
        .filter(index => index >= 0)
      const index = directIndex >= 0 ? directIndex : Math.min(...tokenIndexes)
      return { product, index: Number.isFinite(index) ? index : 9999, score }
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index || b.score - a.score)
    .map(item => item.product)
}
function getRequestedProductCount(text, fallback = 3) {
  const raw = String(text || "").toLowerCase()
  const digit = raw.match(/(?:^|[^\d])([1-9]|10)(?:[^\d]|$)/)
  if (digit) return Math.max(1, Math.min(6, Number(digit[1])))
  if (/(?:جوج|زوج|اثنين|اتنين|deux|two)\b/i.test(raw)) return 2
  if (/(?:ثلاثة|تلاتة|trois|three)\b/i.test(raw)) return 3
  if (/(?:أربعة|اربعة|ربعة|quatre|four)\b/i.test(raw)) return 4
  if (/(?:خمسة|cinq|five)\b/i.test(raw)) return 5
  if (/(?:ستة|ست|six)\b/i.test(raw)) return 6
  return fallback
}
function isCatalogProductRequest(text) {
  return /(منتجات|المنتجات|produits|products|catalogue|catalog|شنو\s+كتبيع|شنو\s+عندكم|اش\s+كتبيع|كاتالوغ|قائمة|list|liste|عرض|show|chno\s+k?tbi3o|ach\s+k?tbi3o|chno\s+3ndkom|ach\s+3ndkom|katalog|catalog)/i.test(
    String(text || "")
  )
}
function isProductImageRequest(text) {
  const t = String(text || "")
  // Explicit media/send words across Darija, Arabizi, Arabic, French, and English.
  if (/(?:\b(?:photo|photos|image|images|picture|pictures|pic|pics|video|vid[eé]o|screenshot|tswira|tswirto|tsawer|sowar|swr|s[yi]ft(?:li?|i)?|send|show|voir|montrer|envoyer|vois)\b|تصويرة|تصويرتو|صورتو|صورة|صور|تصاور|تصاورو|فيديو|صيفط|صيفطلي|صيفطليا|صيفطلي|وريني|ورينيه|ورينيها|عطيني\s+تصويرة|عافاك\s+صورة|شي\s+تصويرة|شي\s+صور|بغيت\s+نشوف|نشوفو|نشوف|نشوفها|كيفاش\s+كيبان|كيفاش\s+كيبانا|صيفطلي\s+تصاور|صيفطلي\s+صورة|واش\s+كاينة\s+صورة|واش\s+عندك\s+صور|نعاين|تعاين|بيناتو|بيناتها)/i.test(t)) {
    return true
  }
  // "Show me / let me see" style requests without an explicit image word.
  if (/(?:\bshow\s*me\b|\blet\s*me\s*see\b|montrez?\s*moi|faites?\s*voir|partage[rz]?|dis\s*moi\s*(?:comment|à\s*quoi)|كيبان|كيشوف|كيتفرج|نتفرج|نشوف|نعاين|بغيت\s*نشوف|واش\s*عندك\s*صور|واش\s*كاين\s*صور|فاشكاين|فاش\s*كاين)/i.test(t)) {
    return true
  }
  // Appearance/shape questions usually mean the customer wants to inspect the product.
  if (/(?:what\s*does\s*it\s*look|how\s*does\s*it\s*look|à\s*quoi\s*(?:ça\s*)?ressemble|comment\s*(?:il|elle|ça)\s*(?:est|ressemble|se\s*présente)|كيفاش\s*كيبان|كيفاش\s*هو|كيفاش\s*هي|شكلو|شكلها|واش\s*زوين|واش\s*زوينة|كيف\s*(?:هو|هي)|قداش\s*كبير)/i.test(t)) {
    return true
  }
  // Arabizi variants for showing/sending/checking appearance.
  if (/(?:\bwri(?:ni|li)\b|\bnwri\b|\bwari\b|\bwarili\b|\b9olili\s*(?:wach|kifach)\b|dir\s*liya\s*(?:tswira|photo)|3afak\s*(?:s[yi]ft|wri)|bghit\s*n(?:shof|3ayen|tfrej))/i.test(t)) {
    return true
  }
  return false
}
function collectImageUrlsForProducts(products, { perProductLimit = 1, totalLimit = 6 } = {}) {
  const urls = []
  const seen = new Set()
  for (const product of products || []) {
    const productImages = parseImages(product?.images).slice(0, perProductLimit)
    for (const url of productImages) {
      const cleanUrl = normalizeImageUrlForWhatsApp(url)
      if (!cleanUrl || seen.has(cleanUrl)) continue
      seen.add(cleanUrl)
      urls.push(cleanUrl)
      if (urls.length >= totalLimit) return urls
    }
  }
  return urls
}
function getCurrencyLabelForAI(agentLanguage) {
  const lang = getAgentLang(agentLanguage)
  return lang === "darija" || lang === "arabic" ? "درهم" : "DH"
}
function getLastAgentMessage(conversationHistory = []) {
  return [...(conversationHistory || [])]
    .reverse()
    .find(message => message?.role === "AGENT" && message?.content)
}
function hasOrderSummaryDetails(text) {
  const content = String(text || "")
  if (!content) return false
  const summaryLabels = [
    /(?:📦|🛍️|produit|product|المنتج|المُنتج)/i,
    /(?:🔢|l3adad|l3dad|lعدد|quantity|quantit[eé]|الكمية|العدد)/i,
    /(?:🏙️|lmdina|ville|city|المدينة|مدينة)/i,
    /(?:🏠|adresse|address|العنوان|عنوان)/i,
    /(?:💰|total|المجموع|الثمن|\bdh\b|درهم)/i,
  ]
  return summaryLabels.filter((pattern) => pattern.test(content)).length >= 3
}
function asksForOrderSummaryConfirmation(text) {
  const content = String(text || "")
  if (!content) return false
  return /(واش\s+ن[أا]?كدو|واش\s+نأكد(?:\s+(?:ليك|ليكم|ليها))?(?:\s+(?:الطلبية|الطلب|الكوموند|commande|order))?|نأكد\??|هادشي\s+صحيح|هاد\s*شي\s+صحيح|كلشي\s+صحيح|واش\s+كلشي\s+صحيح|صحيح\s+باش\s+نسجلو|باش\s+نسجلو\s+الطلبية|نسجلو\s+الطلبية|نثبتو\s+الطلبية|نعتمدو\s+الطلبية|نمررو\s+الطلبية|هل\s+المعلومات\s+صحيحة|هل\s+هاد(?:ه|ي)\s+المعلومات\s+صحيحة|wach\s+hadchi\s+s[7h]i+h?|hadchi\s+s[7h]i+h?|wach\s+kolchi\s+s[7h]i+h?|kolchi\s+s[7h]i+h?|bach\s+n(?:s|z)jlo\s+(?:commande|talabya|talbia|order)|nsjlo\s+(?:commande|talabya|talbia|order)|tu\s+confirmes?|tout\s+est\s+correct|c['’]est\s+correct|on\s+valide|confirmer|confirm\??|valider\??|validate\??)/i.test(content)
}
function hasPendingOrderSummary(lastAgentMessage) {
  const content = String(lastAgentMessage?.content || "")
  if (!content) return false
  return hasOrderSummaryDetails(content) && asksForOrderSummaryConfirmation(content)
}
// ✅ FIXED — removed stage-based fallback; only strict summary check
function isPendingOrderSummaryContext(lastAgentMessage) {
  return hasPendingOrderSummary(lastAgentMessage)
}
function formatRuntimeOrderValue(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  return text || null
}
function isIdentityQuestion(text) {
  return /(chkon nta|chkon nti|wach nta bot|شكون نتا|شكون نتي|من أنت|qui es tu|who are you)/i.test(
    String(text || "")
  )
}
function isHumanHandoffRequest(text) {
  return /(bghit nhder m3a chi wahed|بغيت نهضر مع شي واحد|بغيت شي واحد|appel|اتصلو بيا|عيطو ليا|admin|مسؤول|human|personne)/i.test(
    String(text || "")
  )
}
function canStartCheckout(intentId) {
  return [
    "buying_intent",
    "new_order",
    "order_confirmation",
    "confirmation_reply",
  ].includes(intentId)
}
function classifyCustomerIntent({
  messageText = "",
  conversation = null,
  lastAgentBeforeAI = null,
  selectedItem = null,
  stillMissingForAI = [],
} = {}) {
  const text = normalizeCustomerText(messageText, { keepNewlines: true })
  const lower = text.toLowerCase()
  const missing = Array.isArray(stillMissingForAI) ? stillMissingForAI.filter(Boolean) : []
  const postOrderAction = detectPostOrderActionIntent(text)
  const hasPendingSummary = isPendingOrderSummaryContext(lastAgentBeforeAI, conversation?.stage)
  const hasSelectedProduct = Boolean(selectedItem?.id)
  if (!text) {
    return {
      id: "empty",
      label: "Empty/unsupported message",
      confidence: "high",
      action: "Ask the customer to resend the message clearly.",
      avoid: "Do not invent intent.",
    }
  }
  if (isHumanHandoffRequest(text)) {
    return {
      id: "human_handoff",
      label: "Human handoff request",
      confidence: "high",
      action: "Pause AI for this conversation and notify the admin.",
      avoid: "Do not continue selling or confirming the order.",
    }
  }
  // ✅ FIXED — ابقي isOrderConfirmationReply (مرن) مش isExplicitConfirmation
  if (hasPendingSummary && isOrderConfirmationReply(text)) {
    return {
      id: "order_confirmation",
      label: "Final order confirmation",
      confidence: "high",
      action: "Create/confirm the order immediately if required fields are complete.",
      avoid: "Do not repeat the summary and do not ask again for known fields.",
    }
  }
  if (postOrderAction.cancel) {
    return {
      id: "cancel_order",
      label: "Cancel active order",
      confidence: "high",
      action: "Cancel the relevant active order or ask which order if there are multiple active orders.",
      avoid: "Do not treat this as a new sale.",
    }
  }
  if (postOrderAction.address || postOrderAction.quantity || postOrderAction.variant) {
    const fields = [
      postOrderAction.address ? "address/city" : null,
      postOrderAction.quantity ? "quantity" : null,
      postOrderAction.variant ? "variant" : null,
    ].filter(Boolean).join(", ")
    return {
      id: "edit_order",
      label: `Edit active order (${fields})`,
      confidence: "high",
      action: "Update only the requested field on the active order, then confirm the update.",
      avoid: "Do not restart discovery and do not create a duplicate order.",
    }
  }
  if (detectNewOrderIntent(text)) {
    return {
      id: "new_order",
      label: "New/additional order",
      confidence: "high",
      action: "Keep existing active orders in memory, but start collecting details for a separate new order.",
      avoid: "Do not overwrite or forget the previous active order.",
    }
  }
  if (detectOrderFollowUpIntent(text)) {
    return {
      id: "order_follow_up",
      label: "Order status/follow-up",
      confidence: "high",
      action: "Answer using ACTIVE ORDERS / DB order memory. If several orders match, ask a short clarification.",
      avoid: "Do not start selling a new product unless the customer asks for one.",
    }
  }
  if (isProductImageRequest(text)) {
    return {
      id: "product_media",
      label: "Product image/media request",
      confidence: hasSelectedProduct ? "high" : "medium",
      action: hasSelectedProduct
        ? "Send/show images for the selected product only."
        : "Identify which product the customer means, then send its images.",
      avoid: "Do not send images of a different product.",
    }
  }
  if (/\b(ch7al|chhal|bch7al|prix|price|combien|taman|tman|thaman)\b|(?:الثمن|السعر|بكم|بشحال|شحال|بشحالها|قداش|ثمن|تمن)/i.test(lower)) {
    return {
      id: "price_question",
      label: "Price question",
      confidence: "high",
      action: "Answer the price from product data/settings, then ask at most one relevant next question.",
      avoid: "Do not ask for name/address before clear buying intent.",
    }
  }
  if (/\b(ghali|ghalia|trop\s*cher|expensive|cher|rkhis|rkhi9|cheap)\b|(?:غالي|غالية|الثمن بزاف|السعر مرتفع|رخيص|ثمن ناقص)/i.test(lower)) {
    return {
      id: "price_objection",
      label: "Price objection/comparison",
      confidence: "high",
      action: "Use only product data and custom settings to answer the objection.",
      avoid: "Do not invent discounts, guarantees, competitor claims, or store policies.",
    }
  }
  if (/\b(remise|discount|promo|promotion|nkss|n9ss|ne9ess|takhfid)\b|(?:نقص|تنقص|تخفيض|خصم|عرض)/i.test(lower)) {
    return {
      id: "discount_request",
      label: "Discount request",
      confidence: "high",
      action: "Use only salePrice, product data, or custom settings for discounts/promos.",
      avoid: "Do not invent a discount.",
    }
  }
  if (/\b(original|qualit[eé]|garantie|trust|scam|arnaque|confiance|paiement|verif|nchouf)\b|(?:أصلي|اصلية|الجودة|ضمان|ثقة|نصب|الدفع|الأداء|نشوف|نقلب)/i.test(lower)) {
    return {
      id: "trust_quality",
      label: "Trust/quality concern",
      confidence: "high",
      action: "Answer only from product data and custom store policy.",
      avoid: "Do not make fake guarantees or claim originality unless it is in product data/settings.",
    }
  }
  if (/\b(livraison|delivery|shipping|delai|d[eé]lai|tawsil|tawssil)\b|(?:توصيل|التوصيل|ثمن التوصيل|وقت التوصيل|الشحن|الديليفري)/i.test(lower)) {
    return {
      id: "delivery_question",
      label: "Delivery question",
      confidence: "high",
      action: "Answer only from custom delivery settings. If city is needed, ask only for city.",
      avoid: "Do not invent delivery times or fees.",
    }
  }
  if (isCatalogProductRequest(text)) {
    return {
      id: "catalog_request",
      label: "Catalog/product list request",
      confidence: "high",
      action: "Show a short list of available products with prices. Ask what type the customer prefers.",
      avoid: "Do not ask for order confirmation details.",
    }
  }
  if (isIdentityQuestion(text)) {
    return {
      id: "identity_question",
      label: "Identity question",
      confidence: "high",
      action: "Introduce yourself briefly as the shop assistant and explain what the store sells.",
      avoid: "Do not ask for product confirmation.",
    }
  }
  if (/\b(bghit|bgit|baghi|nakhd|nakhod|commande|order|buy|acheter|je\s*veux|sift|nsift|nsif)\b|(?:بغيت|باغي|نبغي|نبي|ناخد|نخد|نطلب|نوصي|طلبية|الطلب|شراء|نشري|بغيت نشري)/i.test(lower)) {
    return {
      id: "buying_intent",
      label: "Buying intent",
      confidence: "high",
      action: missing.length > 0
        ? `Collect the next missing field only: ${missing[0]}.`
        : "Move toward summary/confirmation if all fields are ready.",
      avoid: "Do not over-explain the product again.",
    }
  }
  if (/^(?:hi|hello|salam|salut|ola|مرحبا|هاي|سلام|صباح|مساء|labas|lbas|cv|ça\s*va)[\s!?،.]*$/i.test(lower)) {
    return {
      id: "greeting",
      label: "Greeting",
      confidence: "high",
      action: "Reply briefly and guide toward products or active order context if present.",
      avoid: "Do not send a long generic welcome.",
    }
  }
  if (/[\p{L}]/u.test(text) && text.length >= 2) {
    return {
      id: "general_message",
      label: "General customer message",
      confidence: "medium",
      action: "Answer naturally, infer intent from conversation state, and ask one useful question if needed.",
      avoid: "Do not force checkout unless there is clear buying intent.",
    }
  }
  return {
    id: "unclear",
    label: "Unclear message",
    confidence: "medium",
    action: "Ask a short clarification in the customer's language.",
    avoid: "Do not invent order details.",
  }
}
function buildAgentThinkingContext({
  messageText = "",
  conversation = null,
  items = [],
  selectedItem = null,
  pendingMissingFields = [],
  lastAgentBeforeAI = null,
}) {
  const customerIntent = classifyCustomerIntent({
    messageText,
    conversation,
    lastAgentBeforeAI,
    selectedItem,
    stillMissingForAI: pendingMissingFields,
  })
  const checkoutAllowed = canStartCheckout(customerIntent?.id)
  let safePendingMissingFields = Array.isArray(pendingMissingFields)
    ? pendingMissingFields.filter(Boolean)
    : []
  if (!checkoutAllowed) {
    safePendingMissingFields = []
  }
  let stillMissingForAI = getStillMissingFieldsAfterCurrentReply(
    safePendingMissingFields,
    messageText,
    lastAgentBeforeAI?.content || "",
    items,
    selectedItem
  )
  if (!checkoutAllowed) {
    stillMissingForAI = []
  }
  const replyMode = detectRecentCustomerCommunicationMode([
    ...(conversation?.messages || []),
    { role: "USER", content: messageText },
  ])
  const shouldSendImages =
    customerIntent?.id === "product_media" &&
    Boolean(selectedItem?.id)
  const shouldPauseForHuman =
    customerIntent?.id === "human_handoff"
  const nextMissingField = stillMissingForAI[0] || null
  return {
    customerIntent,
    checkoutAllowed,
    pendingMissingFields: safePendingMissingFields,
    stillMissingForAI,
    nextMissingField,
    replyMode,
    shouldSendImages,
    shouldPauseForHuman,
  }
}
function buildIntentClassifierBlock(intent) {
  if (!intent?.id) return ""
  return [
    "CUSTOMER INTENT ROUTE:",
    `- Intent: ${intent.label} (${intent.id}, ${intent.confidence})`,
    `- Action: ${intent.action}`,
    `- Avoid: ${intent.avoid}`,
  ].filter(Boolean).join("\n")
}
function buildRuntimeOrderStateBlock({
  conversation = null,
  messageText = "",
  selectedItem = null,
  stillMissingForAI = [],
  lastAgentBeforeAI = null,
  customerIntent = null,
  agentLanguage = null,
}) {
  const conversationMessages = Array.isArray(conversation?.messages) ? conversation.messages : []
  const runtimeMessages = [
    ...conversationMessages,
    { role: "USER", content: messageText },
  ]
  const missing = Array.isArray(stillMissingForAI) ? stillMissingForAI.filter(Boolean) : []
  const pendingSummary = conversation?.context?.pendingOrderSummary &&
    typeof conversation.context.pendingOrderSummary === "object"
    ? conversation.context.pendingOrderSummary
    : null
  const likelyConfirmationMode = isPendingOrderSummaryContext(lastAgentBeforeAI, conversation?.stage)
  const agentForcedLang = getAgentLang(agentLanguage || "")
  const replyMode = agentForcedLang === "darija"
    ? "darija_arabic"
    : detectRecentCustomerCommunicationMode(runtimeMessages)
  const intentBlock = buildIntentClassifierBlock(
    customerIntent || classifyCustomerIntent({
      messageText,
      conversation,
      lastAgentBeforeAI,
      selectedItem,
      stillMissingForAI,
    })
  )
  const userMessages = runtimeMessages
    .filter(isUserMessage)
    .map((message) => ({ content: getMessageText(message) }))
  const location = extractCityAndAddressFromUserMessages(runtimeMessages.slice(-30))
  const knownProduct = formatRuntimeOrderValue(selectedItem?.name)
  const knownQty = extractLatestQuantity(userMessages.slice(-12))
  const knownCity = formatRuntimeOrderValue(cleanExtractedCity(location.city))
  const knownAddress = formatRuntimeOrderValue(cleanExtractedAddress(location.address))
  const knownName = formatRuntimeOrderValue(extractCustomerFullNameFromMessages(runtimeMessages))
  const nextMissing = ["product", "quantity", "city", "address", "name"]
    .find((field) => missing.includes(field)) || null
    // Language-aware labels for runtime context
  const labels = (() => {
    if (replyMode === "darija_arabic") {
      return {
        product: "المنتج",
        quantity: "الكمية",
        city: "المدينة",
        address: "العنوان",
        name: "السمية",
        stateHeader: "📋 حالة الطلب الحالية:",
        nextQuestion: (field) => `→ السؤال الجاي: سول غير على ${field === "product" ? "المنتج" : field === "quantity" ? "الكمية" : field === "city" ? "المدينة" : field === "address" ? "العنوان" : field === "name" ? "السمية الكاملة" : field}.`,
        nextAction: "→ الخطوة الجاية: إذا الزبون وافق على الملخص، خرج [ORDER_CONFIRMED].",
        missingLock: (fields) => `⚠️ معلومات ناقصة: ${fields.map(f => f === "product" ? "المنتج" : f === "quantity" ? "الكمية" : f === "city" ? "المدينة" : f === "address" ? "العنوان" : f === "name" ? "السمية" : f).join(", ")}`,
        missingDesc: "- هاد المعلومات باقي ناقصة. سول غير على المعلومة الجاية. ما تخرجش [ORDER_CONFIRMED] حتى تجمع كلشي.",
        confirmationMode: "✅ وضع تأكيد الطلب:",
        confirmInstructions: [
          "- آخر رد ديال AI هو ملخص الطلبية.",
          "- إذا الزبون وافق، خرج [ORDER_CONFIRMED] + [STAGE:CLOSED] فوراً.",
          "- ما تسولش على معلومة راه كاينة فالملخص ولا فالمحادثة.",
          "- إذا الزبون بدل شي معلومة، بدل غير هي وعاود الملخص.",
        ],
      }
    }
    // French (default)
    return {
      product: "Produit",
      quantity: "Quantité",
      city: "Ville",
      address: "Adresse",
      name: "Nom",
      stateHeader: "📋 ÉTAT DE LA COMMANDE:",
      nextQuestion: (field) => `→ Prochaine question: demande seulement ${field}.`,
      nextAction: "→ Action suivante: si le client confirme le résumé, créez la commande.",
      missingLock: (fields) => `⚠️ CHAMPS MANQUANTS: ${fields.join(", ")}`,
      missingDesc: "- Ces champs sont encore manquants. Demandez seulement le champ suivant. Ne envoyez pas [ORDER_CONFIRMED] tant que les infos sont incomplètes.",
      confirmationMode: "✅ MODE CONFIRMATION ACTIF:",
      confirmInstructions: [
        "- La dernière réponse de l'agent est un résumé de commande.",
        "- Si le client confirme, sortez [ORDER_CONFIRMED] + [STAGE:CLOSED] immédiatement.",
        "- Ne redemandez pas un champ déjà présent dans le résumé ou l'historique.",
        "- Si le client change un champ, mettez à jour uniquement ce champ, montrez un nouveau résumé.",
      ],
    }
  })()
  const fieldLine = (label, value, field) => {
    if (value) return `- ${label}: ${value} ✅`
    if (missing.includes(field)) return `- ${label}: ❌ MISSING`
    return `- ${label}: unknown`
  }
  const languageLock = buildRuntimeLanguageLock(replyMode)
  const confirmationBlock = likelyConfirmationMode
    ? [labels.confirmationMode, ...labels.confirmInstructions].join("\n")
    : ""
  const pendingSummaryBlock = pendingSummary?.productName
    ? [
        replyMode === "darija_arabic" ? "🧾 طلبية واجدة كتسنى التأكيد:" : "🧾 COMMANDE EN ATTENTE DE CONFIRMATION:",
        pendingSummary.productName ? `- ${labels.product}: ${pendingSummary.productName}` : null,
        pendingSummary.quantity ? `- ${labels.quantity}: ${pendingSummary.quantity}` : null,
        pendingSummary.city ? `- ${labels.city}: ${pendingSummary.city}` : null,
        pendingSummary.address ? `- ${labels.address}: ${pendingSummary.address}` : null,
        pendingSummary.customerName ? `- ${labels.name}: ${pendingSummary.customerName}` : null,
        pendingSummary.totalAmount ? `- Total: ${pendingSummary.totalAmount}` : null,
        replyMode === "darija_arabic"
          ? "- إلا الزبون سول شي سؤال، جاوبو وخلي هاد الطلبية محفوظة. من بعد رجع سول: واش نأكد ليك الطلبية دابا؟"
          : "- Si le client pose une question, réponds sans oublier cette commande, puis redemande la confirmation.",
      ].filter(Boolean).join("\n")
    : ""
  if (!intentBlock && !languageLock && !pendingSummaryBlock && !likelyConfirmationMode && missing.length === 0 && !knownProduct) return ""
  const missingRule = missing.length > 0
    ? [labels.missingLock(missing), labels.missingDesc].join("\n")
    : ""
  return [
    intentBlock,
    languageLock,
    confirmationBlock,
    pendingSummaryBlock,
    labels.stateHeader,
    fieldLine(labels.product, knownProduct, "product"),
    fieldLine(labels.quantity, knownQty, "quantity"),
    fieldLine(labels.city, knownCity, "city"),
    fieldLine(labels.address, knownAddress, "address"),
    fieldLine(labels.name, knownName, "name"),
    nextMissing
      ? labels.nextQuestion(nextMissing)
      : labels.nextAction,
    missingRule,
  ].filter(Boolean).join("\n")
}
function formatPromptText(value, maxLength = 1200) {
  const text = String(value || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim()

  if (!text) return ""
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text
}
function formatProductForPrompt(product, currencyLabel) {
  if (!product) return ""
  const price = product.salePrice && product.salePrice < product.price
    ? `~~${product.price}~~ ${product.salePrice} ${currencyLabel}`
    : `${product.price} ${currencyLabel}`
  const stock = product.stock === 0
    ? " ⚠️ نفد"
    : product.stock > 0
      ? ` (المخزون: ${product.stock})`
      : ""
  const description = formatPromptText(product.description, 180)
  return `- ${product.name}: ${price}${stock}${description ? ` — ${description}` : ""}`
}
function formatObjectionGuidanceForPrompt(objectionReplies = []) {
  const rows = (Array.isArray(objectionReplies) ? objectionReplies : [])
    .map((item) => ({
      trigger: formatPromptText(item?.trigger, 90),
      guidance: formatPromptText(item?.reply, 240),
    }))
    .filter((item) => item.trigger && item.guidance)
    .slice(0, 8)

  if (rows.length === 0) return ""

  return [
    "## 🧭 توجيهات الاعتراضات من صفحة الإعدادات:",
    "- هاد التوجيهات غير باش تفهم المعنى، ما تنسخش الجواب حرفياً.",
    "- صيغ جواب جديد قصير وطبيعي حسب سياق المحادثة ولغة الزبون.",
    ...rows.map((item, index) => [
      `${index + 1}. إلا قال الزبون شي حاجة بحال: ${item.trigger}`,
      `   التوجيه: ${item.guidance}`,
    ].join("\n")),
  ].join("\n")
}
function buildSystemPrompt(
  agent,
  items,
  selectedItem,
  currentStage = null,
  customerName = null,
  activeOrdersMemory = null,
  runtimeContextBlock = ""
) {
  const currencyLabel = getCurrencyLabelForAI(agent.language)
  const agentLang = getAgentLang(agent?.language)
  const domain = formatPromptText(agent?.domain, 120) || "تجارة عامة"
  const generalInstructions = formatPromptText(agent?.instructions, 1400)
  const productInstructions = formatPromptText(agent?.productInstructions, 1400)
  const objectionGuidance = formatObjectionGuidanceForPrompt(agent?.objectionReplies)
  const promptItems = selectedItem?.id
    ? items.filter(item => item?.id !== selectedItem.id)
    : items
  const activeProducts = promptItems.filter(i => i.isActive).slice(0, selectedItem ? 14 : 10)
  const productsList = activeProducts.map(p => formatProductForPrompt(p, currencyLabel)).join("\n") ||
    (selectedItem ? "لا توجد منتجات أخرى متوفرة" : "لا توجد منتجات متوفرة")
  const selectedProductBlock = selectedItem
    ? [
        "## ⭐ المنتج الحالي / المختار:",
        formatProductForPrompt(selectedItem, currencyLabel),
      ].join("\n")
    : ""
  const languageInstructions = (() => {
    if (agentLang === "french") {
      return "- رد دائماً بالفرنسية المغربية البسيطة"
    }
    if (agentLang === "darija") {
      return [
        "- جاوب غير بالدارجة المغربية القحة، مكتوبة بالحروف العربية.",
        "- إلا كتب الزبون دارجة بحروف لاتينية، فهمو ولكن رد عليه بالدارجة بالحروف العربية.",
        "- خليك بحال واتساب: جملة ولا جوج، بلا مقدمات طوال.",
        "- ممنوع العربية الفصحى ولا أسلوب إداري بحال: أحتاج، يرجى، من فضلك، المنطقة الصحيحة، هل يمكنك، أرسل، المطلوبة، لإكمال الطلب.",
        "- استعمل كلمات مغربية طبيعية: عافاك، واش، شنو، فين، شحال، بغيتي، نعطيك، نوصلو ليك، الطلبية، الكمية، السمية.",
        "- ما تخلطش الفرنسية إلا فالكلمات اللي المغاربة كيستعملوها بزاف بحال: livraison, produit, commande.",
        "- كل مرة سول غير على معلومة وحدة",
      ].join("\n")
    }
    if (agentLang === "arabic") {
      return "- رد بالعربية الفصحى البسيطة"
    }
    return [
      "- إذا كتب فرنسية → رد فرنسية.",
      "- إذا كتب دارجة، سواء بالعربية ولا بحروف لاتينية → رد بدارجة مغربية قحة بالحروف العربية.",
      "- إذا كتب عربية فصحى → رد عربية بسيطة.",
    ].join("\n")
  })()
  const stockRule = selectedItem?.stock !== undefined
    ? selectedItem.stock === 0
      ? "\nحالة المنتج المختار: نفد من المخزون."
      : "\nحالة المنتج المختار: متوفر في المخزون."
    : ""
  const settingsBlock = [
    `- اسم الوكيل: ${agent.name || "وكيل مبيعات"}`,
    `- مجال النشاط: ${domain}`,
    `- الأسلوب المختار من الإعدادات: ${agent.style || "friendly"}`,
    `- اللغة المختارة: ${agent.language || "auto"}`,
    currentStage ? `- مرحلة المحادثة الحالية: ${currentStage}` : "",
    customerName ? `- اسم الزبون المعروف: ${customerName}` : "",
  ].filter(Boolean).join("\n")
  const customInstructionsBlock = [
    generalInstructions ? `## 🧾 تعليمات عامة من صفحة الإعدادات:\n${generalInstructions}` : "",
    productInstructions ? `## 🛍️ تعليمات المنتجات من صفحة الإعدادات:\n${productInstructions}` : "",
    objectionGuidance,
  ].filter(Boolean).join("\n\n")

  return `أنت ${agent.name || "وكيل مبيعات"}، وكيل مبيعات كتخدم عبر واتساب مع متجر إلكتروني في المغرب.

## ⚙️ إعدادات Agent المطبقة:
${settingsBlock}

${customInstructionsBlock ? `${customInstructionsBlock}\n\n` : ""}## 🧱 قواعد الخدمة:
- تعليمات صفحة الإعدادات كتحكم فالطون، سياسة المتجر، العروض، الضمان، FAQ، وطريقة الإقناع.
- إلا كان شي تعارض، طبق هاد القواعد هنا.
- جاوب غير من بيانات المنتجات، ذاكرة الطلب، وتعليمات صفحة الإعدادات. ما تخترع لا ثمن، لا عرض، لا ضمان، لا مدة ديال التوصيل، لا صفة بحال "أصلي".
- إلا اختار الزبون شي منتج، خليك معاه. ما تقترحش منتج آخر إلا هو طلب بديل، مقارنة، ولا ثمن ناقص.
- إلا ناقصة شي معلومة، سول غير سؤال واحد.
- ما تأكدش الطلبية حتى يكونو هادشي كاملين: المنتج، الكمية، المدينة، العنوان، والسمية الكاملة.
- إلا المنتج سالا من المخزون، قولها للزبون وما تأكدش الطلبية عليه.
- فملخص الطلبية، كتب اسم المنتج كيفما هو بالضبط فقائمة المنتجات، بلا ترجمة وبلا اختصار.
- من بعد ملخص الطلبية، سول سؤال تأكيد مباشر: "واش نأكد ليك الطلبية دابا؟"
- ما تختمش ملخص الطلبية بسؤال عام بحال "واش كلشي صحيح؟".
- ما تكتبش التفكير الداخلي، وما تشرحش القواعد للزبون.

## 🗣️ اللغة:
${languageInstructions}

${selectedProductBlock ? `${selectedProductBlock}\n\n` : ""}${activeOrdersMemory ? `## 🧠 ذاكرة الطلبات النشطة:\n${activeOrdersMemory}\n\n` : ""}## 📦 المنتجات المتوفرة:
${productsList}${stockRule}

${runtimeContextBlock ? `## 📋 معلومات الطلب الحالي:\n${runtimeContextBlock}\n` : ""}
## 📋 ملخص الطلبية عند اكتمال المعلومات:
📦 المنتج: [المنتج]
🔢 الكمية: [الكمية]
🏙️ المدينة: [المدينة]
🏠 العنوان: [العنوان]
👤 السمية: [السمية الكاملة]
💰 المجموع: [المجموع] ${currencyLabel}
واش نأكد ليك الطلبية دابا؟

## 🏷️ Tags:
عند التأكيد: ${TAGS.ORDER_CONFIRMED} و [STAGE:CLOSED]`
}
const SCORE_MAP = {
  GREETING:  10,
  DISCOVERY: 35,
  OBJECTION: 25,
  PITCHING:  55,
  CLOSING:   80,
  CLOSED:    100,
}
// توليد رد AI عبر OpenAI
function normalizeEnvToken(value) {
  const normalized = String(value || "").trim()
  if (!normalized) return ""
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    return normalized.slice(1, -1).trim()
  }
  return normalized
}
function sanitizeProviderErrorField(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  if (!text) return ""
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .slice(0, 180)
}
function getProviderErrorSummary(rawText = "") {
  const text = String(rawText || "").trim()
  if (!text) return ""
  try {
    const parsed = JSON.parse(text)
    const code = sanitizeProviderErrorField(parsed?.error?.code ?? parsed?.code)
    const message = sanitizeProviderErrorField(
      parsed?.error?.message ??
      parsed?.message ??
      parsed?.detail ??
      parsed?.title
    )
    return [code, message].filter(Boolean).join(": ")
  } catch {
    return ""
  }
}
function getOpenAIRuntimeConfig() {
  const key = normalizeEnvToken(process.env.OPENAI_API_KEY)
  const model =
    normalizeEnvToken(process.env.OPENAI_MODEL || process.env.AI_MODEL) ||
    "gpt-4o"
  return {
    key,
    keySource: key ? "OPENAI_API_KEY" : null,
    model,
  }
}
export async function generateAIReply({
  agent,
  items,
  conversationHistory,
  userMessage,
  selectedItem,
  currentStage = null,
  customerName = null,
  activeOrdersMemory = null,
  runtimeContextBlock = "",
}) {
  const {
    key: openaiKey,
    keySource: openaiKeySource,
    model: openaiModel,
  } = getOpenAIRuntimeConfig()
  const lang = getAgentLang(agent?.language)
  const fallbackStage = "GREETING"
  const technicalErrorReply = lang === "french"
    ? "Service temporairement indisponible. Réessayez plus tard."
    : "الخدمة متوقفة مؤقتاً. جرب مرة أخرى."
  if (!openaiKey) {
    console.warn("⚠️ OPENAI_API_KEY not set — skipping AI reply generation")
    return {
      reply: lang === "french"
        ? "Service temporairement indisponible. Réessayez plus tard."
        : "الخدمة متوقفة مؤقتاً. جرب مرة أخرى.",
      stage: fallbackStage,
      score: SCORE_MAP[fallbackStage] || 10,
      orderConfirmed: false,
      sendImages: false,
      cancelOrder: false,
    }
  }
  let quotaReservation = null
  // ✅ Quota gate — reserve the monthly AI reply before the paid provider call.
  // This avoids spending OpenAI credits when the account has already hit its cap.
  if (agent?.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: agent.userId },
        select: { plan: true, planExpiresAt: true },
      })
      const plan = getEffectivePlan(user)
      const quota = await reserveAIReply({
        userId: agent.userId,
        plan,
      })
      if (!quota.allowed) {
        console.warn(`[AI Quota] userId=${agent.userId.slice(0, 8)} plan=${plan} reason=${quota.reason} used=${quota.usage.aiReplies}/${quota.limits.aiReplies}`)
        // Graceful fallback — customer doesn't see a system error, just a neutral pause.
        // The dashboard will surface quota usage separately so the owner knows to upgrade.
        return {
          reply: technicalErrorReply,
          stage: fallbackStage,
          score: SCORE_MAP[fallbackStage] || 10,
          orderConfirmed: false,
          sendImages: false,
          cancelOrder: false,
          quotaExceeded: true,
        }
      }
      quotaReservation = quota
    } catch (err) {
      // If quota check fails (DB issue), fail-open — don't block real users over bookkeeping.
      console.error("Quota check failed, proceeding without gate:", err?.message)
    }
  }
  let attempts = 0
  const maxAttempts = 2
  let providerSucceeded = false
  while (attempts < maxAttempts) {
    attempts++
    try {
      const systemPrompt = buildSystemPrompt(
        agent, items, selectedItem, currentStage, customerName, activeOrdersMemory, runtimeContextBlock
      )
      // DEBUG: Log when custom instructions are being used
      if (agent.instructions?.trim()) {
        console.log(`[generateAIReply] Using custom instructions for agent: ${agent.name}`)
      }
      console.log(`[generateAIReply] Provider=OpenAI model=${openaiModel} keySource=${openaiKeySource}`)
      // Sliding window: send only last 10 messages to save tokens
      const HISTORY_WINDOW = 10
      const recentHistory = conversationHistory.length > HISTORY_WINDOW
        ? conversationHistory.slice(-HISTORY_WINDOW)
        : conversationHistory
      const messages = [
        ...recentHistory.map(msg => ({
          role: msg.role === "AGENT" ? "assistant" : "user",
          content: msg.content,
        })),
        { role: "user", content: userMessage },
      ]
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // OpenAI Chat Completions
            model: openaiModel,
            messages: [
              { role: "system", content: systemPrompt },
              ...messages,
            ],
            // ✅ ردود أقصر وأكثر طبيعية
            max_tokens: 500,
            temperature: 0.85,
            top_p: 0.9,
            frequency_penalty: 0.3,
          }),
        }
      )
      // Validate HTTP response before parsing
      if (!response.ok) {
        const responseText = await response.text()
        const providerSummary = getProviderErrorSummary(responseText)
        const suffix = providerSummary ? `: ${providerSummary}` : ""
        console.error(`OpenAI HTTP ${response.status}${suffix} model=${openaiModel} keySource=${openaiKeySource}`)
        throw new Error(`OpenAI HTTP ${response.status}${suffix}`)
      }
      const data = await response.json()
      // Validate response structure
      if (!data || typeof data !== 'object') {
        console.error('Invalid JSON response from OpenAI')
        throw new Error('Invalid JSON response')
      }
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        console.error('Empty or missing choices array:', Object.keys(data))
        throw new Error('Empty choices array')
      }
      if (!data.choices[0]?.message?.content) {
        console.error('Missing message content in response')
        throw new Error('Missing message content')
      }
      providerSucceeded = true
      let reply = data.choices[0].message.content
      // ✅ Token usage logging + persistence — track real cost per AI call
      if (data.usage) {
        const { prompt_tokens = 0, completion_tokens = 0, total_tokens = 0 } = data.usage
        const estCostUsd = estimateCostUsd(prompt_tokens, completion_tokens, openaiModel)
        console.log(
          `[AI Usage] userId=${agent?.userId?.slice(0, 8) || "?"} ` +
          `in=${prompt_tokens} out=${completion_tokens} total=${total_tokens} ` +
          `cost=$${estCostUsd.toFixed(5)} model=${openaiModel}`
        )
        // Persist to MonthlyUsage so quota + billing dashboards stay accurate
        if (agent?.userId) {
          await recordAIUsage({
            userId: agent.userId,
            promptTokens: prompt_tokens,
            completionTokens: completion_tokens,
            countReply: !quotaReservation?.reserved,
          })
        }
      } else if (agent?.userId) {
        // Count the reply even if the provider didn't return token stats
        await recordAIUsage({
          userId: agent.userId,
          countReply: !quotaReservation?.reserved,
        })
      }
      console.log(`[generateAIReply] RAW AI RESPONSE`)
      // استخراج المرحلة
      const stageMatch = reply.match(/\[STAGE:(\w+)\]/)
      let stage = stageMatch ? stageMatch[1] : null
      console.log(`[generateAIReply] Stage detected: ${stage} from match: ${stageMatch?.[0]}`)
      // اكتشاف المرحلة من رد AI إذا نسي الـ tag
      if (!stage && conversationHistory.length > 0) {
        const userLower = userMessage.toLowerCase()
        if (userLower.includes("غدا") || userLower.includes("اليوم") ||
            userLower.includes("الساعة") || userLower.includes("مع") ||
            userLower.match(/\d{1,2}:\d{2}/)) {
          stage = "CLOSING"
        }
        else if (userLower.includes("نعم") || userLower.includes("أكيد") ||
                 userLower.includes("تمام") || userLower.includes("حسنا") ||
                 userLower === "ايه" || userLower === "ok") {
          stage = "CLOSED"
        }
        else if (userLower.includes("بغيت نحجز") || userLower.includes("بغيت نشر") ||
                 userLower.includes("حجز") || userLower.includes("شراء")) {
          stage = "PITCHING"
        }
      }
      // اكتشاف التأكيد
      let orderConfirmed = hasOrderConfirmed(reply)
      console.log(`[generateAIReply] Initial orderConfirmed=${orderConfirmed}, stage=${stage}`)
      // ✅ FIXED — removed loose confirmation fallback in generateAIReply; rely on strict canAutoConfirm in processIncomingMessage
      console.log(`[generateAIReply] Final orderConfirmed=${orderConfirmed}`)
      const lastAgentMessages = conversationHistory
        .filter(m => m.role === "AGENT")
        .slice(-3)
      const isDuplicateReply = lastAgentMessages.some(m =>
        m.content && reply &&
        m.content.length > 120 && reply.length > 120 &&
        (
          m.content.substring(0, 120) === reply.substring(0, 120) ||
          m.content === reply
        )
      )
      if (isDuplicateReply && !orderConfirmed) {
        console.warn("⚠️ AI كرر نفس الرد - نطلب الانتقال للمرحلة التالية.")
        if (!stage || stage === "GREETING") {
          reply = reply + "\n[STAGE:DISCOVERY]"
        } else if (stage === "DISCOVERY") {
          reply = reply + "\n[STAGE:PITCHING]"
        } else if (stage === "PITCHING") {
          reply = reply + "\n[STAGE:CLOSING]"
        }
      }
      const sendImages = hasSendImages(reply)
      const cancelOrder = hasCancelOrder(reply)
      const finalReply = cleanReplyTags(reply)
      return {
        reply: finalReply,
        stage: stage || fallbackStage,
        score: SCORE_MAP[stage || fallbackStage] || 10,
        orderConfirmed,
        sendImages,
        cancelOrder,
      }
    } catch (error) {
      const safeErrorLabel = getSafeAIErrorLabel(error)
      console.error(`❌ generateAIReply error (محاولة ${attempts}/${maxAttempts}): ${safeErrorLabel}`)
      if (attempts >= maxAttempts) {
        if (quotaReservation?.reserved && !providerSucceeded && agent?.userId) {
          await releaseAIReplyReservation({ userId: agent.userId }).catch(() => null)
        }
        return {
          reply: technicalErrorReply,
          stage: fallbackStage,
          score: SCORE_MAP[fallbackStage] || 10,
          orderConfirmed: false,
          sendImages: false,
          cancelOrder: false,
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}
function detectReorderIntent(text) {
  const t = String(text || "").toLowerCase()
  if (!t.trim()) return false
  // Darija/Arabic/French/English common patterns
  return (
    /(\b(again|re-?order|another)\b)/i.test(t) ||
    /(مرة\s*أخرى|مره\s*اخرى|بغيت\s*نطلب\s*مرة\s*أخرى|بغيت\s*نطلب\s*مره\s*اخرى|عاود|عاودت|زيد|زيدي|نفس|نفسو|نفسها|نفس\s*منتج|نفس\s*المنتج)/i.test(t) ||
    /(encore|recommander|même\s+produit|la\s+même)/i.test(t)
  )
}
function detectSameProductIntent(text) {
  const t = String(text || "").toLowerCase()
  return /(نفس|نفسو|نفسها|نفس\s*منتج|نفس\s*المنتج|same|même\s+produit)/i.test(t)
}
function detectTrackingIntent(text) {
  const t = String(text || "").toLowerCase()
  if (!t.trim()) return false
  return /(فين\s*وصل|فين\s*واصلة|فين\s*جات|واش\s*وصلات|واش\s*وصل|واش\s*جات|واش\s*جا\b|wach\s*ja|w?ach\s*ja|elle\s*est\s*l[aà]|is\s*it\s*here|has\s*it\s*arrived|وصل\s*ولا|arrived|livr[eé]|حالة\s*(?:الطلب|الطلبية)|ما\s*خبار\s*(?:الطلب|الطلبية)|الطلب(?:ية)?\s*ديالي\s*فين\s*وصل(?:ت)?|status|statut|تتبع|تراكن|tracking|suivi|où\s*est|ou\s*en\s*est|elle\s*est\s*où)/i.test(t)
}
function detectNewOrderIntent(text) {
  const t = String(text || "").toLowerCase()
  if (!t.trim()) return false
  return /(طلب(?:ية)?\s*(?:جديد|جديدة|اخرى|أخرى)|بغيت\s+(?:واحد|وحدة|شي\s+حاجة|منتج)\s*(?:آخر|اخر|أخرى|اخرى)|زيدني\s+(?:واحد|وحدة|طلبية)|نعمل\s+طلب(?:ية)?\s*(?:اخر|آخر|جديد)|another\s+(?:one|order|product)|new\s+order|other\s+product|produit\s+(?:autre|nouveau)|autre\s+commande)/i.test(t)
}
function detectDifferentProductNewOrderIntent(text) {
  const t = String(text || "").toLowerCase()
  return /(منتج\s*(?:آخر|اخر|أخرى|اخرى)|شي\s+منتج\s*(?:آخر|اخر)|other\s+product|another\s+product|produit\s+autre|autre\s+produit)/i.test(t)
}
function isSimpleGreetingWithActiveOrder(text) {
  const t = normalizeCustomerText(text).trim()
  if (!t) return false
  return /^(?:hi|hello|salam|salut|ola|مرحبا|هاي|سلام|صباح|مساء|كيفاش|labas|lbas|شكون|wach|واش\s+كاين)[\s!?،.]*$/i.test(t)
}
function detectOrderRecallIntent(text) {
  const t = String(text || "").toLowerCase()
  if (!t.trim()) return false
  return [
    /(?:أنا|انا)\s*(?:لي|اللي)\s*(?:درت|طلبت)\s*طلب(?:ية|يه)?/i,
    /(?:وش|واش)\s*(?:عقلتي|كتعقل|تتفكر|تفتكر)\s*عليا/i,
    /(?:عقلتي|كتعقل|تتفكر|تفتكر)\s*عليا/i,
    /(?:راني|راه|كنت|سبق\s*ليا)\s*طلبت/i,
    /(?:طلبي|طلبيتي|الطلب\s*ديالي|الطلبية\s*ديالي|عندي\s*طلبية)/i,
    /(?:بالنسبة|بخصوص)\s*(?:ل)?(?:الطلب|الطلبية)/i,
    /(?:طلبية|commande|order)\s*(?:سابقة|السابقة|قديمة|قديم(?:ة)?|pr[ée]c[ée]dente|ancienne|previous|old)/i,
    /j[’']?ai\s+command[ée]/i,
    /ma\s+commande/i,
    /tu\s+te\s+rappelles?\s+de\s+moi/i,
    /\bi\s+ordered\b/i,
    /\bmy\s+order\b/i,
    /\bdo\s+you\s+remember\s+me\b/i,
  ].some((pattern) => pattern.test(t))
}
function detectOrderFollowUpIntent(text) {
  return detectTrackingIntent(text) || detectOrderRecallIntent(text)
}
function formatOrderStatusLabel(status, lang = "darija") {
  const ar = {
    PENDING: "في الانتظار ⏳",
    CONFIRMED: "مؤكدة ✅",
    SHIPPED: "في الشحن 🚚",
    DELIVERED: "تم التسليم ✅",
    CANCELLED: "ملغية ❌",
  }
  const fr = {
    PENDING: "En attente ⏳",
    CONFIRMED: "Confirmée ✅",
    SHIPPED: "Expédiée 🚚",
    DELIVERED: "Livrée ✅",
    CANCELLED: "Annulée ❌",
  }
  const map = lang === "french"
    ? fr
    : ar
  return map[status] || status
}
function formatKnownOrderDate(value, locale = "ar-MA") {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(locale)
}
function normalizeOrderMemoryRecord(order = {}) {
  const obj = safeObj(order)
  const quantity = Number(obj.quantity)
  if (!obj.productName && !obj.orderId && !obj.id) return null
  return {
    orderId: obj.orderId || obj.id || null,
    productId: obj.productId || null,
    productName: obj.productName || null,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    status: obj.status || null,
    trackingNumber: obj.trackingNumber || null,
    deliveryReference: obj.deliveryReference || null,
    deliveryStatus: obj.deliveryStatus || null,
    createdAt: obj.createdAt || obj.at || null,
    variant: obj.variant || null,
    city: obj.city || null,
    address: obj.address || null,
    customerName: obj.customerName || null,
    totalAmount: obj.totalAmount ?? null,
  }
}
function buildOrderContextMemory(order = {}) {
  const normalized = normalizeOrderMemoryRecord(order)
  if (!normalized) return null
  return {
    ...(normalized.orderId ? { orderId: normalized.orderId } : {}),
    ...(normalized.productId ? { productId: normalized.productId } : {}),
    ...(normalized.productName ? { productName: normalized.productName } : {}),
    ...(normalized.quantity ? { quantity: normalized.quantity } : {}),
    ...(normalized.status ? { status: normalized.status } : {}),
    ...(normalized.trackingNumber ? { trackingNumber: normalized.trackingNumber } : {}),
    ...(normalized.deliveryReference ? { deliveryReference: normalized.deliveryReference } : {}),
    ...(normalized.deliveryStatus ? { deliveryStatus: normalized.deliveryStatus } : {}),
    ...(normalized.createdAt ? { createdAt: normalized.createdAt } : {}),
    ...(normalized.variant ? { variant: normalized.variant } : {}),
    ...(normalized.city ? { city: normalized.city } : {}),
    ...(normalized.address ? { address: normalized.address } : {}),
    ...(normalized.customerName ? { customerName: normalized.customerName } : {}),
    ...(normalized.totalAmount !== null ? { totalAmount: normalized.totalAmount } : {}),
    updatedAt: new Date().toISOString(),
  }
}
function getLatestKnownOrderMemory(context = {}) {
  const ctx = safeObj(context)
  return (
    normalizeOrderMemoryRecord(ctx.currentOrder) ||
    normalizeOrderMemoryRecord(ctx.lastConfirmed) ||
    normalizeOrderMemoryRecord(ctx.lastOrderSnapshot)
  )
}
function buildConversationOrderMemory(context = {}) {
  const ctx = safeObj(context)
  const lines = []
  const seen = new Set()
  const pushLine = (label, value) => {
    const order = normalizeOrderMemoryRecord(value)
    if (!order) return
    const key = JSON.stringify([
      order.orderId,
      order.productName,
      order.quantity,
      order.status,
      order.trackingNumber,
      order.deliveryReference,
      order.deliveryStatus,
      order.variant,
      order.createdAt,
    ])
    if (seen.has(key)) return
    seen.add(key)
    const statusLabel = order.status ? formatOrderStatusLabel(order.status, "darija") : null
    const dateLabel = formatKnownOrderDate(order.createdAt, "ar-MA")
    const parts = []
    if (order.productName) parts.push(`${order.productName}${order.quantity ? ` × ${order.quantity}` : ""}`)
    if (order.variant) parts.push(`الخيار: ${order.variant}`)
    if (statusLabel) parts.push(`الحالة: ${statusLabel}`)
    if (dateLabel) parts.push(`التاريخ: ${dateLabel}`)
    if (order.city) parts.push(`المدينة: ${order.city}`)
    if (order.trackingNumber) parts.push(`التتبع: ${order.trackingNumber}`)
    if (order.deliveryReference) parts.push(`مرجع التوصيل: ${order.deliveryReference}`)
    if (order.deliveryStatus) parts.push(`حالة التوصيل: ${order.deliveryStatus}`)
    lines.push(`- ${label}: ${parts.join(" — ")}`)
  }
  pushLine("آخر طلبية مؤكدة", ctx.lastConfirmed)
  pushLine("الطلبية الجارية", ctx.currentOrder)
  pushLine("آخر حالة طلب محفوظة", ctx.lastOrderSnapshot)
  return lines.length > 0 ? lines.join("\n") : null
}
async function findLatestCustomerOrder(userId, customerId) {
  if (!userId || !customerId) return null
  return prisma.order.findFirst({
    where: { userId, customerId, isDraft: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      productId: true,
      productName: true,
      quantity: true,
      totalAmount: true,
      status: true,
      trackingNumber: true,
      deliveryReference: true,
      deliveryStatus: true,
      createdAt: true,
      variant: true,
      city: true,
      address: true,
      customerName: true,
    },
  })
}
async function findActiveCustomerOrders(userId, customerId, take = 5) {
  if (!userId || !customerId) return []
  return prisma.order.findMany({
    where: {
      userId,
      customerId,
      isDraft: false,
      status: { in: ["PENDING", "CONFIRMED", "SHIPPED"] },
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      customerId: true,
      productId: true,
      productName: true,
      quantity: true,
      totalAmount: true,
      status: true,
      trackingNumber: true,
      deliveryReference: true,
      deliveryStatus: true,
      createdAt: true,
      updatedAt: true,
      variant: true,
      city: true,
      address: true,
      customerName: true,
    },
  })
}
function buildActiveOrdersMemory(orders = [], agent = null) {
  const activeOrders = Array.isArray(orders) ? orders.filter(Boolean) : []
  if (activeOrders.length === 0) return null
  const lang = getAgentLang(agent?.language)
  return activeOrders.map((order, index) => {
    const status = order.status ? formatOrderStatusLabel(order.status, lang) : order.status
    const quantity = order.quantity ? ` × ${order.quantity}` : ""
    const tracking = order.trackingNumber ? ` — tracking: ${order.trackingNumber}` : ""
    const deliveryRef = order.deliveryReference ? ` — deliveryRef: ${order.deliveryReference}` : ""
    const deliveryStatus = order.deliveryStatus ? ` — deliveryStatus: ${order.deliveryStatus}` : ""
    const variant = order.variant ? ` — option: ${order.variant}` : ""
    const city = order.city ? ` — city: ${order.city}` : ""
    return `${index + 1}. ${order.productName || "طلبية"}${quantity} — ${status}${variant}${city}${tracking}${deliveryRef}${deliveryStatus} — orderId: ${order.id}`
  }).join("\n")
}
function findOrderMentionedInText(orders = [], text = "") {
  const normalizedText = normalizeProductLookupText(text)
  if (!normalizedText) return null
  const sortedOrders = [...(orders || [])].sort((a, b) => (b.productName?.length || 0) - (a.productName?.length || 0))
  return sortedOrders.find((order) => {
    const name = normalizeProductLookupText(order?.productName)
    return name && name.length >= 3 && normalizedText.includes(name)
  }) || null
}
async function updateConversationOrderMemory({ conversationId, userId, order, extraContext = {} } = {}) {
  if (!conversationId || !userId || !order) return
  const orderMemory = buildOrderContextMemory(order)
  if (!orderMemory) return
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true, context: true },
    })
    if (!conversation) return
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        context: {
          ...safeObj(conversation.context),
          currentOrder: orderMemory,
          lastOrderSnapshot: orderMemory,
          ...extraContext,
        },
        updatedAt: new Date(),
      },
    })
  } catch (err) {
    console.warn("[OrderMemory] Could not update conversation memory:", err?.message || err)
  }
}
function detectPostOrderActionIntent(text) {
  const t = String(text || "").trim()
  const lower = t.toLowerCase()
  const hasOrderWord = /(طلب|طلبية|commande|order|colis|parcel)/i.test(t)
  const editWord = /(بدل|بدلي|غيّر|غير|نبدل|تبدل|خلي|دير|زيد|نقص|change|changer|modif|modifier|update|corrige|corriger)/i
  const hasOrderReference = hasOrderWord || /(هادي|هدي|ديالي|dyali|hadik|this|it|la|le|ها\b)/i.test(t)
  const cancel = hasOrderReference && /(لغي|لغيها|لغيتها|لغاها|نلغي|تلغى|تلغي|إلغاء|الغاء|كنسل|كانسل|cancel|annul|annuler)/i.test(t)
  const address = editWord.test(t) && /(عنوان|العنوان|adresse|address|حي|زنقة|شارع|دار|منزل|city|ville|مدينة|المدينة|douar|hay|rue)/i.test(t)
  const quantity = editWord.test(t) && /(كمية|الكمية|عدد|حبة|حبات|وحدة|وحدات|piece|pieces|pcs|quantity|qte|qty|\b\d{1,2}\b)/i.test(t)
  const variant = editWord.test(t) && /(مقاس|القياس|taille|size|لون|couleur|color|option|variant|xl|xxl|\bl\b|\bm\b|\bs\b)/i.test(lower)
  return {
    cancel,
    address,
    quantity,
    variant,
    any: cancel || address || quantity || variant,
  }
}
function cleanPostOrderEditText(text) {
  return String(text || "")
    .replace(/(?:بغيت|اريد|نريد|واخا|ok|okay)?\s*(?:ن?بدل|بدلي|غيّر|غير|خلي|دير|زيد|نقص|change|changer|modif(?:ier)?|update|corrige(?:r)?)\s*(?:لي|ليا|la|le|l'|the)?/ig, " ")
    .replace(/(?:العنوان|عنوان|adresse|address|المدينة|مدينة|ville|city|الكمية|كمية|quantity|qty|qte|المقاس|مقاس|taille|size|اللون|لون|couleur|color)\s*(?:ديالي|dyali|to|à|a|ل|:)?/ig, " ")
    .replace(/\s+/g, " ")
    .trim()
}
function isCancellationConfirmationQuestion(text) {
  const normalized = normalizeCustomerText(text).toLowerCase()
  if (!normalized) return false
  const hasCancel = /(تلغي|نلغي|إلغاء|الغاء|لغي|لغيت|cancel|annul|annuler)/i.test(normalized)
  const hasOrder = /(طلب|طلبية|commande|order|colis|parcel)/i.test(normalized)
  return hasCancel && hasOrder
}
async function cancelCustomerOrder({
  userId,
  customer,
  conversation,
  agent,
  messageText,
  activeOrders = [],
} = {}) {
  let targetOrder = findOrderMentionedInText(activeOrders, messageText)
  // If multiple orders and no specific one mentioned, let AI handle via context
  if (!targetOrder && activeOrders.length > 1 && !/(آخر|اخر|الأخيرة|الاخيرة|latest|last|derni[eè]re)/i.test(messageText)) {
    return null // Fall through to AI generation with activeOrdersMemory context
  }
  const latestOrder = targetOrder || await prisma.order.findFirst({
    where: {
      userId,
      customerId: customer.id,
      isDraft: false,
      status: { in: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"] },
    },
    orderBy: { updatedAt: "desc" },
  })
  // If no order found, let AI handle it with context
  if (!latestOrder) {
    return null
  }
  // If order already delivered, let AI explain via context
  if (latestOrder.status === "DELIVERED") {
    return null
  }
  const updated = await prisma.order.update({
    where: { id: latestOrder.id },
    data: { status: "CANCELLED" },
  })
  if (isCountedStatus(latestOrder.status)) {
    await applyOrderCancellationSideEffects(latestOrder)
  }
  await updateConversationOrderMemory({
    conversationId: conversation.id,
    userId,
    order: updated,
    extraContext: { lastHumanLikeAction: { type: "cancel_order", at: new Date().toISOString() } },
  })
  await prisma.notification.create({
    data: {
      userId,
      type: "SYSTEM",
      title: `fr:Commande annulée ❌||ar:طلبية ملغاة ❌`,
      message: `fr:${customer.name} a annulé sa commande||ar:${customer.name} ألغى طلبيته`,
    },
  }).catch((err) => {
    console.warn("[OrderCancel] Could not create notification:", err?.message || err)
  })
  // Return direct confirmation reply with proper language detection.
  const replyLang = getAgentLang(agent?.language)
  const cancelReply = (() => {
    if (replyLang === "french") {
      return `✅ Commande annulée avec succès.\n\nProduit: ${updated.productName}${updated.quantity ? ` × ${updated.quantity}` : ""}`
    }
    // Arabic / Darija (default)
    return `✅ تم إلغاء طلبيتك بنجاح.\n\nالمنتج: ${updated.productName}${updated.quantity ? ` × ${updated.quantity}` : ""}`
  })()
  return {
    reply: cancelReply,
    stage: "CLOSING",
    score: SCORE_MAP.CLOSING,
    orderConfirmed: false,
    orderCancelled: true,
    cancelledOrderId: updated.id,
  }
}
async function handlePostOrderAction({
  userId,
  customer,
  conversation,
  agent,
  messageText,
  activeOrders = [],
} = {}) {
  const intent = detectPostOrderActionIntent(messageText)
  if (!intent.any) return null
  if (intent.cancel) {
    return cancelCustomerOrder({ userId, customer, conversation, agent, messageText, activeOrders })
  }
  let targetOrder = findOrderMentionedInText(activeOrders, messageText)
  // If multiple orders and no specific one mentioned, let AI handle via context
  if (!targetOrder && activeOrders.length > 1 && !/(آخر|اخر|الأخيرة|الاخيرة|latest|last|derni[eè]re)/i.test(messageText)) {
    return null
  }
  const latestOrder = targetOrder || await prisma.order.findFirst({
    where: {
      userId,
      customerId: customer.id,
      isDraft: false,
      status: { in: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"] },
    },
    orderBy: { updatedAt: "desc" },
  })
  if (!latestOrder) return null
  // If order already shipped/delivered, let AI explain via context
  if (!["PENDING", "CONFIRMED"].includes(latestOrder.status)) {
    return null
  }
  const lang = getAgentLang(agent?.language)
  const cleanText = cleanPostOrderEditText(messageText)
  const data = {}
  const changed = []
  if (intent.address) {
    const extracted = extractCityAndAddressFromUserMessages([{ role: "USER", content: cleanText || messageText }])
    const city = cleanExtractedCity(extracted.city)
    const address = cleanExtractedAddress(extracted.address || cleanText)
    if (city) {
      data.city = city
      changed.push(lang === "french" ? "la ville" : "المدينة")
    }
    if (address) {
      data.address = address
      changed.push(lang === "french" ? "l'adresse" : "العنوان")
    }
  }
  if (intent.quantity) {
    const qty = extractLatestQuantity([{ content: cleanText || messageText }])
    if (qty && qty >= 1) {
      if (latestOrder.productId) {
        const product = await prisma.product.findUnique({
          where: { id: latestOrder.productId },
          select: { stock: true },
        })
        if (product && product.stock !== null && product.stock !== undefined) {
          const available = product.stock + (latestOrder.quantity || 0)
          if (qty > available) {
            // Let AI handle stock error via context
            return null
          }
        }
      }
      const unitPrice = latestOrder.quantity > 0 ? Number(latestOrder.totalAmount || 0) / latestOrder.quantity : 0
      data.quantity = qty
      if (unitPrice > 0) data.totalAmount = unitPrice * qty
      changed.push(lang === "french" ? "la quantité" : "الكمية")
    }
  }
  if (intent.variant && latestOrder.productId) {
    const product = await prisma.product.findUnique({
      where: { id: latestOrder.productId },
      select: { variants: true },
    })
    const selectedVariant = extractSelectedVariant(product, [{ role: "USER", content: cleanText || messageText }])
    const safeVariant = normalizeCustomerText(selectedVariant || cleanText)
    if (safeVariant) {
      data.variant = safeVariant
      changed.push(lang === "french" ? "l'option" : "الخيار")
    }
  }
  if (Object.keys(data).length === 0) return null
  const updated = await prisma.order.update({
    where: { id: latestOrder.id },
    data,
  })
  if (isCountedStatus(latestOrder.status)) {
    await applyOrderEditSideEffects(latestOrder, updated)
  }
  await updateConversationOrderMemory({
    conversationId: conversation.id,
    userId,
    order: updated,
    extraContext: {
      lastHumanLikeAction: {
        type: "update_order",
        fields: Object.keys(data),
        changedLabels: changed, // Pass field names in correct language for AI
        at: new Date().toISOString()
      }
    },
  })
  // Return null to let AI handle the response with updated order context
  return null
}
// ...
function safeObj(x) {
  if (!x || typeof x !== "object") return {}
  if (Array.isArray(x)) return {}
  return x
}
function normalizeComparableMessageText(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}
function normalizeWhatsAppTimestamp(value) {
  const normalized = String(value || "").trim()
  return /^\d+$/.test(normalized) ? normalized : null
}
function isDuplicateMessageInsertError(error, fieldName = "whatsappMessageId") {
  if (!error || error.code !== "P2002") return false
  const target = Array.isArray(error.meta?.target)
    ? error.meta.target
    : [error.meta?.target].filter(Boolean)
  return target.some((value) => String(value).includes(fieldName))
}
function getAgentLang(agentLanguage) {
  if (agentLanguage === "french") return "french"
  if (agentLanguage === "darija") return "darija"
  if (agentLanguage === "arabic") return "arabic"
  // auto / undefined / legacy darija_latin → "auto" (AI يتبع لغة الزبون، والدارجة ديما بالعربية)
  return "auto"
}
function detectCustomerCommunicationMode(text = "") {
  const value = normalizeCustomerText(text).toLowerCase()
  if (!value) return "unknown"
  const hasArabic = /[\u0600-\u06FF]/.test(value)
  const hasLatin = /[a-z]/i.test(value)
  // Priority 1: If Arabic chars present with ratio > 30%, treat as Darija Arabic.
  if (hasArabic) {
    const arabicRatio = (value.match(/[\u0600-\u06FF]/g) || []).length / value.length
    if (arabicRatio > 0.3) return "darija_arabic"
  }
  // Priority 2: Latin + known Darija keywords, treat as Darija Arabic.
  if (hasLatin && /\b(bghit|bghiti|bghina|baghi|bagha|baghin|kayn|kayna|kaynin|wach|chno|ach|chnowa|chhal|bchhal|fin|fayn|fen|fina|3afak|lahyhfdk|siftli|sifto|syftli|wrini|wari|warini|tswira|tsawer|sowra|swr|tawsil|twssil|livraison|lmdina|mdina|zn9a|zen9a|dar|ra9m|hay|7ay|derb|darb|9rib|7da|ghali|n9ss|nqss|rkhis|akid|aked|akked|s7i7|kolchi|mzyan|mezian|ana|nta|ntiya|dyal|dial|diale|diali|dialk|dialo|dialhom|dialna|bgit|sift|tsift|3tini|bazzaf|kifach|chni|chnu|chhal|wach|fen|fayn|nta|ntiya|safi|wa5a|wa5ha|shih|sahi|smiti|smitk|nwaslo|nwaslha|syft|l'adresse|adresse|commande|produit|thaman|taman|raqem)\b/i.test(value)) {
    return "darija_arabic"
  }
  // Priority 3: Latin + French keywords means French.
  if (hasLatin && /\b(bonjour|salut|merci|svp|je|veux|combien|livraison|quelle|ville|tu|confirmes|d'accord|qualité|produit|commande|adresse|nom|prénom|c'est|ça|comment|pourquoi|quand|où|combien|cher|pas|cher|trop|très|peu|beaucoup|toujours|jamais|souvent|rarement|maintenant|avant|après|pendant|depuis|jusqu'à|vers|chez|avec|sans|pour|contre|entre|parmi|durant|malgré|selon|suivant|concernant|touchant|quant|à|de|des|du|le|la|les|un|une|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leur|leurs|ce|cette|ces|cet)\b/i.test(value)) {
    return "french"
  }
  // Fallback: Latin-heavy text is treated as Darija Arabic.
  if (hasLatin) return "darija_arabic"
  // Pure Arabic without Darija keywords means formal Arabic.
  if (hasArabic) return "arabic"
  return "unknown"
}
function detectRecentCustomerCommunicationMode(messages = []) {
  const allMessages = Array.isArray(messages) ? messages : []
  for (let i = allMessages.length - 1; i >= 0; i--) {
    if (!isUserMessage(allMessages[i])) continue
    const text = getMessageText(allMessages[i])
    if (!text) continue
    const hasLetters = /[\p{L}]/u.test(text)
    if (!hasLetters) continue
    const mode = detectCustomerCommunicationMode(text)
    if (mode && mode !== "unknown") return mode
  }
  return "unknown"
}
function buildRuntimeLanguageLock(mode = "unknown") {
  if (mode === "darija_arabic") {
    return [
      "🔒 LANGUAGE LOCK — MANDATORY:",
      "- جاوب غير بالدارجة المغربية القحة وبالحروف العربية.",
      "- إلا الزبون كتب Darija بحروف لاتينية، فهمو ولكن رد عليه بالدارجة وبالحروف العربية.",
      "- ممنوع تستعمل العربية الفصحى ولا أسلوب إداري.",
      "- ممنوع كلمات بحال: أحتاج، يرجى، من فضلك، المنطقة الصحيحة، هل يمكنك، أرسل، المطلوبة، لإكمال الطلب.",
      "- استعمل كلمات مغربية: عافاك، واش، شنو، فين، شحال، بغيتي، نعطيك، نوصلو ليك، الطلبية، الكمية، السمية.",
      "- خليك قصير بحال واتساب: جملة ولا جوج.",
      "- سول غير سؤال واحد فكل رد.",
    ].join("\n")
  }
  if (mode === "french") {
    return [
      "🔒 LANGUAGE LOCK — MANDATORY:",
      "- The customer writes in FRENCH.",
      "- You MUST reply in simple Moroccan French.",
      "- NEVER switch to Arabic or Darija unless the customer does.",
    ].join("\n")
  }
  if (mode === "arabic") {
    return [
      "🔒 LANGUAGE LOCK — MANDATORY:",
      "- The customer writes in formal ARABIC (Fusha).",
      "- You MUST reply in clear Arabic.",
      "- NEVER switch to Latin letters unless the customer does.",
    ].join("\n")
  }
  return ""
}
function resolveReplyCommunicationMode(agentLanguage, text = "") {
  const lang = getAgentLang(agentLanguage)
  if (lang === "french") return "french"
  if (lang === "darija") return "darija_arabic"
  if (lang === "arabic") return "arabic"
  const mode = detectCustomerCommunicationMode(text)
  return mode !== "unknown" ? mode : "darija_arabic"
}
function getSafeAIErrorLabel(error) {
  const rawMessage = String(error?.message || "").trim()
  if (!rawMessage) return "unknown"
  if (/^OpenAI HTTP \d+(?:: .+)?$/i.test(rawMessage)) return rawMessage.slice(0, 220)
  const knownSafeMessages = new Set([
    "Invalid JSON response",
    "Empty choices array",
    "Missing message content",
    "fetch failed",
  ])
  if (knownSafeMessages.has(rawMessage)) return rawMessage
  if (error?.name === "AbortError") return "AbortError"
  if (/timeout/i.test(rawMessage)) return "timeout"
  return error?.name ? String(error.name) : "unknown"
}
function buildInboundMessageGuardContext(context, {
  whatsappMessageId = null,
  whatsappTimestamp = null,
  messageText = "",
} = {}) {
  const currentContext = safeObj(context)
  const currentGuards = safeObj(currentContext.messageGuards)
  const normalizedTimestamp = normalizeWhatsAppTimestamp(whatsappTimestamp)
  const normalizedText = normalizeComparableMessageText(messageText)
  return {
    ...currentContext,
    messageGuards: {
      ...currentGuards,
      ...(whatsappMessageId ? { lastInboundMessageId: whatsappMessageId } : {}),
      ...(normalizedTimestamp ? { lastInboundTimestamp: normalizedTimestamp } : {}),
      ...(normalizedText ? { lastInboundText: normalizedText } : {}),
      lastInboundProcessedAt: new Date().toISOString(),
    },
  }
}
function hasHandledEquivalentInbound({
  conversation = null,
  messageText = "",
  whatsappMessageId = null,
  whatsappTimestamp = null,
} = {}) {
  const latestMessage = Array.isArray(conversation?.messages) && conversation.messages.length > 0
    ? conversation.messages[conversation.messages.length - 1]
    : null
  if (latestMessage?.role !== "AGENT") {
    return false
  }
  const guards = safeObj(safeObj(safeObj(conversation).context).messageGuards)
  const normalizedText = normalizeComparableMessageText(messageText)
  const normalizedTimestamp = normalizeWhatsAppTimestamp(whatsappTimestamp)
  if (whatsappMessageId && guards.lastInboundMessageId && guards.lastInboundMessageId === whatsappMessageId) {
    return true
  }
  if (
    normalizedTimestamp &&
    guards.lastInboundTimestamp === normalizedTimestamp &&
    (!normalizedText || guards.lastInboundText === normalizedText)
  ) {
    return true
  }
  return false
}
// معالجة رسالة واردة كاملة
export async function processIncomingMessage({
  userId,
  customerPhone,
  customerName,
  messageText,
  whatsappMessageId = null,
  whatsappMediaId = null,
  whatsappTimestamp = null,
}) {
  try {
    customerName = normalizeCustomerText(customerName)
    messageText = normalizeCustomerText(messageText, { keepNewlines: true })
    const hasTrackingIntent = detectTrackingIntent(messageText)
    const hasOrderRecallIntent = detectOrderRecallIntent(messageText)
    const hasOrderFollowUpIntent = detectOrderFollowUpIntent(messageText)
    const hasReorderIntent = detectReorderIntent(messageText)
    const hasNewOrderIntent = detectNewOrderIntent(messageText)
    const wantsDifferentProductOrder = detectDifferentProductNewOrderIntent(messageText)
    // Collect mentioned orders from Tracking/Order Recall to pass to AI.
    const mentionedOrdersFromIntent = []
    console.log(`[processIncomingMessage] userId=${userId}, hasPhone=${!!customerPhone}, hasName=${!!customerName}`)
    // 1. جلب Agent مع المنتجات والردود
    const agent = await prisma.agent.findUnique({
      where: { userId },
      include: {
        objectionReplies: {
          orderBy: { order: "asc" }
        }
      }
    })
    if (!agent || !agent.isActive) {
      console.log(`[processIncomingMessage] Agent not found or inactive`)
      return { reply: null, skipped: true, imageUrls: [] }
    }
    console.log(`[processIncomingMessage] Agent found: ${agent.id}`)
    // تطبيع رقم الهاتف
    const normalizedPhone = normalizePhone(customerPhone)
    if (!normalizedPhone) {
      console.error(`[processIncomingMessage] Invalid phone number provided`)
      return { reply: null, skipped: true, imageUrls: [] }
    }
    console.log(`[processIncomingMessage] Phone normalized`)
    // 2. إيجاد أو إنشاء الزبون
    let customer = await prisma.customer.findFirst({
      where: { userId, phone: normalizedPhone }
    })
    if (!customer) {
      const initialCustomerName = !isRejectedCustomerNamePhrase(customerName) && !isWeakCustomerName(customerName)
        ? customerName
        : normalizedPhone
      customer = await prisma.customer.create({
        data: {
          userId,
          name: initialCustomerName,
          phone: normalizedPhone,
          tag: "NEW",
        }
      })
      console.log(`[processIncomingMessage] Created new customer: ${customer.id}`)
    } else {
      console.log(`[processIncomingMessage] Found existing customer: ${customer.id}`)
      await prisma.customer.update({
        where: { id: customer.id },
        data: { lastSeen: new Date() }
      })
    }
    // 3. إيجاد أو إنشاء محادثة نشطة
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    let conversation = null
    if (!conversation) {
      conversation = await prisma.conversation.findFirst({
        where: {
          userId,
          customerId: customer.id,
          stage: { notIn: ["CLOSED", "ABANDONED", "ARCHIVED"] },
          updatedAt: { gte: oneDayAgo }
        },
        include: {
          messages: { orderBy: { createdAt: "asc" }, take: 50 }
        },
        orderBy: { updatedAt: "desc" }
      })
    }
    if (!conversation) {
      const duplicateCustomers = await prisma.customer.findMany({
        where: { userId, phone: normalizedPhone },
        select: { id: true }
      })
      const customerIds = duplicateCustomers.map(c => c.id)
      if (customerIds.length > 0) {
        for (const withDateFilter of [true, false]) {
          conversation = await prisma.conversation.findFirst({
            where: {
              userId,
              customerId: { in: customerIds },
              stage: { notIn: ["CLOSED", "ABANDONED", "ARCHIVED"] },
              ...(withDateFilter && { updatedAt: { gte: oneDayAgo } }),
            },
            include: {
              messages: { orderBy: { createdAt: "asc" }, take: 50 }
            },
            orderBy: { updatedAt: "desc" }
          })
          if (conversation) break
        }
        if (conversation && conversation.customerId !== customer.id) {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { customerId: customer.id }
          })
        }
      }
    }
    if (!conversation) {
      // FIX: استعمل آخر محادثة CLOSED قريبة (أقل من 24 ساعة) لتفادي فتح محادثة جديدة.
      const recentClosedConversation = await prisma.conversation.findFirst({
        where: {
          userId,
          customerId: customer.id,
          stage: "CLOSED",
          updatedAt: { gte: oneDayAgo }
        },
        include: {
          messages: { orderBy: { createdAt: "asc" }, take: 50 }
        },
        orderBy: { updatedAt: "desc" }
      })
      if (recentClosedConversation) {
        // إعادة فتح المحادثة المغلقة حديثاً
        conversation = await prisma.conversation.update({
          where: { id: recentClosedConversation.id },
          data: {
            stage: hasOrderFollowUpIntent ? "CLOSING" : "DISCOVERY",
            score: hasOrderFollowUpIntent
              ? Math.max(recentClosedConversation.score || 0, SCORE_MAP.CLOSING)
              : recentClosedConversation.score,
            updatedAt: new Date(),
            context: {
              ...safeObj(recentClosedConversation.context),
              ...(hasOrderFollowUpIntent ? {
                followUp: {
                  reopenedAt: new Date().toISOString(),
                  reason: hasTrackingIntent ? "tracking" : hasOrderRecallIntent ? "order_recall" : "follow_up",
                },
              } : {}),
            },
          }
          // ✅ [FIX] لا نحمل messages هنا، نحملهم منفصلاً باش نضمن freshness
        })
        // ✅ [FIX] إعادة تحميل الرسائل بشكل منفصل من DB للتأكد من freshness
        const freshMessages = await prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "asc" },
          take: 50
        })
        conversation.messages = freshMessages
        console.log(`[processIncomingMessage] Reopened recent CLOSED conversation: ${conversation.id} | Loaded ${freshMessages.length} fresh messages`)
      } else {
        // أرشفة المحادثات القديمة وإنشاء محادثة جديدة
        const archivedCount = await prisma.conversation.updateMany({
          where: { userId, customerId: customer.id, stage: "CLOSED" },
          data: { stage: "ARCHIVED" }
        })
        if (archivedCount.count > 0) {
          console.log(`Archived ${archivedCount.count} old CLOSED conversation(s)`)
        }
        conversation = await prisma.conversation.create({
          data: {
            userId,
            customerId: customer.id,
            stage: "GREETING",
            score: 10,
            context: {},
          },
          include: { messages: true }
        })
        console.log(`Created new conversation: ${conversation.id}`)
      }
    }
    // Ensure context is always an object
    conversation.context = safeObj(conversation.context)
    let currentOrderFromDb = null
    let activeOrdersFromDb = []
    try {
      ;[currentOrderFromDb, activeOrdersFromDb] = await Promise.all([
        findLatestCustomerOrder(userId, customer.id),
        findActiveCustomerOrders(userId, customer.id),
      ])
    } catch (err) {
      console.error("[processIncomingMessage] Error fetching current order:", err?.message || err)
    }
    if (hasHandledEquivalentInbound({
      conversation,
      messageText,
      whatsappMessageId,
      whatsappTimestamp,
    })) {
      console.warn(`[processIncomingMessage] Equivalent inbound already answered, skipping replay`)
      return {
        reply: null,
        skipped: true,
        duplicateInbound: true,
        imageUrls: [],
        conversationId: conversation.id,
      }
    }
    // 4. حفظ رسالة الزبون
    try {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "USER",
          content: messageText,
          ...(whatsappMessageId ? { whatsappMessageId } : {}),
          ...(whatsappMediaId ? { whatsappMediaId } : {}),
        }
      })
    } catch (error) {
      if (isDuplicateMessageInsertError(error)) {
        console.warn(`[processIncomingMessage] Duplicate inbound WhatsApp message skipped: ${whatsappMessageId}`)
        return {
          reply: null,
          skipped: true,
          duplicateInbound: true,
          imageUrls: [],
          conversationId: conversation.id,
        }
      }
      throw error
    }
    // ✅ إضافة الرسالة الجديدة للـ context لضمان دخولها في الاستخراج
    conversation.messages = [...(conversation.messages || []), { role: "USER", content: messageText }]
    // Track product questions: increment `questions` counter for products mentioned in user message.
    // Non-blocking — runs in background, won't affect reply flow
    ;(async () => {
      try {
        const allProducts = await prisma.product.findMany({
          where: { userId, isActive: true },
          select: { id: true, name: true },
        })
        const lowerMsg = String(messageText || "").toLowerCase()
        const mentioned = allProducts.filter(p => {
          if (!p.name) return false
          const productTerm = p.name.toLowerCase().trim()
          if (!productTerm || productTerm.length < 3) return false
          return lowerMsg.includes(productTerm)
        })
        if (mentioned.length > 0) {
          await prisma.product.updateMany({
            where: { id: { in: mentioned.map(p => p.id) } },
            data: { questions: { increment: 1 } },
          })
        }
      } catch (err) {
        // silent
      }
    })()
    conversation.context = buildInboundMessageGuardContext(conversation.context, {
      whatsappMessageId,
      whatsappTimestamp,
      messageText,
    })
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        context: conversation.context,
        isRead: false,
        updatedAt: new Date(),
      },
    })
    const previousAgentForCancellation = getLastAgentMessage(conversation.messages || [])
    if (
      previousAgentForCancellation?.content &&
      isCancellationConfirmationQuestion(previousAgentForCancellation.content) &&
      isOrderConfirmationReply(messageText)
    ) {
      const cancellation = await cancelCustomerOrder({
        userId,
        customer,
        conversation,
        agent,
        messageText: `${messageText}\n${previousAgentForCancellation.content}`,
        activeOrders: activeOrdersFromDb,
      })
      // If cancellation returned a direct reply (legacy), use it; otherwise let AI handle
      if (cancellation?.reply) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            stage: cancellation.stage || "CLOSING",
            score: cancellation.score || Math.max(conversation.score || 0, SCORE_MAP.CLOSING),
            updatedAt: new Date(),
            isRead: false,
          },
        })
        return {
          reply: cancellation.reply,
          stage: cancellation.stage || "CLOSING",
          score: cancellation.score || Math.max(conversation.score || 0, SCORE_MAP.CLOSING),
          orderConfirmed: false,
          imageUrls: [],
          conversationId: conversation.id,
        }
      }
      // If null, fall through to AI generation with updated context
    }
    const hasActiveOrder = currentOrderFromDb &&
      ["PENDING", "CONFIRMED", "SHIPPED"].includes(currentOrderFromDb.status)
    // Multiple active orders on greeting - let AI handle via context
    if (isSimpleGreetingWithActiveOrder(messageText) && activeOrdersFromDb.length > 1 && !hasTrackingIntent) {
      // Skip - AI will handle via activeOrdersMemory context
    }
    // Proactive greeting with active order - let AI handle via context
    if (isSimpleGreetingWithActiveOrder(messageText) && hasActiveOrder && !hasTrackingIntent) {
      // Skip - AI will handle via activeOrdersMemory context
    }
    // Deterministic intent: "Where is my order?" / tracking.
    if (hasTrackingIntent) {
      try {
        const mentionedOrder = findOrderMentionedInText(activeOrdersFromDb, messageText)
        // Multiple orders mentioned - let AI handle via context
        if (!mentionedOrder && activeOrdersFromDb.length > 1) {
          // Continue to AI generation with activeOrdersMemory context
        }
        const latest = mentionedOrder || currentOrderFromDb || await findLatestCustomerOrder(userId, customer.id)
        const latestKnownOrder = latest || getLatestKnownOrderMemory(conversation.context)
        // Add mentioned order to context for AI to see.
        if (latestKnownOrder) {
          const orderMemory = buildOrderContextMemory(latestKnownOrder)
          if (orderMemory) {
            mentionedOrdersFromIntent.push(orderMemory)
          }
        }
      } catch (e) {
        console.error("[processIncomingMessage] tracking intent error:", e?.message || e)
      }
      // If no order found, fall back to normal AI flow
    }
    if (hasOrderRecallIntent && !hasReorderIntent) {
      try {
        const mentionedOrder = findOrderMentionedInText(activeOrdersFromDb, messageText)
        // Multiple orders mentioned - let AI handle via context
        if (!mentionedOrder && activeOrdersFromDb.length > 1) {
          // Continue to AI generation with activeOrdersMemory context
        }
        const latest = mentionedOrder || currentOrderFromDb || await findLatestCustomerOrder(userId, customer.id)
        const latestKnownOrder = latest || getLatestKnownOrderMemory(conversation.context)
        if (latestKnownOrder) {
          const orderMemory = buildOrderContextMemory(latestKnownOrder)
          if (orderMemory) {
            mentionedOrdersFromIntent.push(orderMemory)
          }
        }
      } catch (e) {
        console.error("[processIncomingMessage] order recall intent error:", e?.message || e)
      }
    }
    try {
      const postOrderAction = await handlePostOrderAction({
        userId,
        customer,
        conversation,
        agent,
        messageText,
        activeOrders: activeOrdersFromDb,
      })
      if (postOrderAction?.reply) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            stage: postOrderAction.stage || "CLOSING",
            score: postOrderAction.score || Math.max(conversation.score || 0, SCORE_MAP.CLOSING),
            updatedAt: new Date(),
            isRead: false,
          },
        })
        return {
          reply: postOrderAction.reply,
          stage: postOrderAction.stage || "CLOSING",
          score: postOrderAction.score || Math.max(conversation.score || 0, SCORE_MAP.CLOSING),
          orderConfirmed: false,
          imageUrls: [],
          conversationId: conversation.id,
        }
      }
    } catch (err) {
      console.error("[processIncomingMessage] post-order action error:", err?.message || err)
    }
    // ✅ 4.5 + 4.7: تم حذف customerHistory و ordersHistory لتوفير DB queries والتوكن
    // الزبون كيتعامل معاه من خلال المحادثة الحالية فقط
    const freshOrderMemory = currentOrderFromDb
      ? buildConversationOrderMemory({
          lastOrderSnapshot: buildOrderContextMemory(currentOrderFromDb),
        })
      : null
    const staleContextOrderMemory = buildConversationOrderMemory(conversation.context)
    const conversationOrderMemory = freshOrderMemory || staleContextOrderMemory || null
    // Build memory for mentioned orders from Tracking/Order Recall (includes delivered orders).
    const mentionedOrdersMemory = mentionedOrdersFromIntent.length > 0
      ? `--- REFERENCED ORDERS (from customer question) ---\n${mentionedOrdersFromIntent.map((o, i) => {
        const status = o.status ? formatOrderStatusLabel(o.status, getAgentLang(agent?.language)) : o.status
        return `${i + 1}. ${o.productName || "طلبية"}${o.quantity ? ` × ${o.quantity}` : ""} — ${status}${o.city ? ` — ${o.city}` : ""}${o.trackingNumber ? ` — tracking: ${o.trackingNumber}` : ""}`
      }).join("\n")}`
      : null
    const activeOrdersMemory = [
      buildActiveOrdersMemory(activeOrdersFromDb, agent),
      mentionedOrdersMemory,
      hasNewOrderIntent
        ? "CUSTOMER REQUESTED A NEW/ADDITIONAL ORDER: keep existing active orders in memory, but collect details for a separate new order."
        : null,
    ].filter(Boolean).join("\n") || null
    // 5. جلب المنتجات
    let items = []
    let selectedItem = null
    const hasCustomerImageAnalysis = /\[صورة من العميل\]|وصف الصورة لتحليل المنتج|customer sent an image/i.test(messageText)
    items = await prisma.product.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
    })
    if (!selectedItem && agent.selectedProductId && !wantsDifferentProductOrder && !hasCustomerImageAnalysis) {
      selectedItem = await prisma.product.findFirst({
        where: {
          id: agent.selectedProductId,
          userId,
          isActive: true,
        },
      })
    }
    if (!selectedItem && items.length === 1 && !wantsDifferentProductOrder) selectedItem = items[0]
    // In general catalog mode, keep every active product in context but put likely matches first.
    const PRODUCT_PRIORITY_COUNT = 15
    if (!selectedItem && items.length > PRODUCT_PRIORITY_COUNT) {
      const originalCount = items.length
      const relevantItems = selectRelevantProducts(items, messageText, conversation.messages || [], PRODUCT_PRIORITY_COUNT)
      const relevantIds = new Set(relevantItems.map(item => item.id))
      items = [
        ...relevantItems,
        ...items.filter(item => !relevantIds.has(item.id)),
      ]
      console.log(`[ProductFilter] Prioritized ${relevantItems.length} of ${originalCount} active products`)
    }
    const explicitlyMentionedProduct = detectOrderedProduct(
      items,
      [{ role: "USER", content: messageText }],
      null
    )
    if (explicitlyMentionedProduct && (!selectedItem || explicitlyMentionedProduct.id !== selectedItem.id)) {
      console.log(`[Product] Current user message selected: ${explicitlyMentionedProduct.name}`)
      selectedItem = explicitlyMentionedProduct
    }
    // ✅ FIX 1: إذا selectedItem ما زال null، ابحث في تاريخ المحادثة كامل
    if (!selectedItem && !wantsDifferentProductOrder && !hasCustomerImageAnalysis) {
      const productFromHistory = detectOrderedProduct(
        items,
        conversation.messages.slice(-10),
        null
      )
      if (productFromHistory) {
        selectedItem = productFromHistory
        console.log(`[Product] Resolved from conversation history: ${productFromHistory.name}`)
      }
    }
    if (!selectedItem && !wantsDifferentProductOrder && !hasCustomerImageAnalysis) {
      const pendingSummaryProductId = safeObj(conversation.context).pendingOrderSummary?.productId
      const productFromPendingSummary = pendingSummaryProductId
        ? items.find(item => item?.id === pendingSummaryProductId)
        : null
      if (productFromPendingSummary) {
        selectedItem = productFromPendingSummary
        console.log(`[Product] Resolved from pending order summary: ${productFromPendingSummary.name}`)
      }
    }
    if (isProductImageRequest(messageText) && selectedItem && !isCatalogProductRequest(messageText)) {
      const productImageUrls = collectImageUrlsForProducts([selectedItem], {
        perProductLimit: 3,
        totalLimit: 3,
      })
      const lang = getAgentLang(agent?.language)
      const imageReply = productImageUrls.length > 0
    ? lang === "french"
      ? `📸 Bien sûr, voilà les photos de *${selectedItem.name}*.`
      : `📸 هاهي الصور ديال *${selectedItem.name}*، تفضل.`
    : lang === "french"
      ? `🙏 Désolé, je n'ai pas de photos pour *${selectedItem.name}* pour le moment.\nTu veux que je t'envoie les détails ?`
      : `🙏 ما كايناش صور دابا لـ *${selectedItem.name}*.\nنقدر نرسل لك التفاصيل والثمن.`;
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "AGENT",
          content: imageReply,
        },
      })
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          stage: "PITCHING",
          score: Math.max(conversation.score || 0, SCORE_MAP.PITCHING),
          updatedAt: new Date(),
          isRead: false,
          context: {
            ...safeObj(conversation.context),
            lastImageProductId: selectedItem.id,
            lastImageProductName: selectedItem.name,
            lastImageRequestAt: new Date().toISOString(),
          },
        },
      })
      console.log(`[Images] Deterministic image request for "${selectedItem.name}" -> ${productImageUrls.length} image(s)`)
      return {
        reply: imageReply,
        stage: "PITCHING",
        score: Math.max(conversation.score || 0, SCORE_MAP.PITCHING),
        orderConfirmed: false,
        imageUrls: productImageUrls,
        conversationId: conversation.id,
      }
    }
    // Custom greeting message for first interaction.
    const isFirstMessage = !conversation.messages?.some(m => m.role === "AGENT")
    const customGreeting = agent.welcomeMessage?.trim()
    if (isFirstMessage && customGreeting && !hasOrderFollowUpIntent && !hasReorderIntent) {
      // Use custom greeting template with placeholder replacement
      let greetingReply = customGreeting.replace(/\{name\}/g, customer.name || "عزيزي")
      console.log(`Custom greeting used for first message`)
      // Save the greeting as AGENT message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "AGENT",
          content: greetingReply,
        }
      })
      // Update conversation stage
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          stage: "GREETING",
          updatedAt: new Date(),
        }
      })
      return {
        reply: greetingReply,
        stage: "GREETING",
        score: 10,
        orderConfirmed: false,
        imageUrls: [],
        conversationId: conversation.id,
      }
    }
    // Re-order flow: if customer wants to order again, reuse last confirmed details.
    if (hasReorderIntent) {
      try {
        const lastOrder = await prisma.order.findFirst({
          where: {
            userId,
            customerId: customer.id,
            status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED", "PENDING"] },
          },
          orderBy: { createdAt: "desc" },
          select: {
            productId: true,
            productName: true,
            customerName: true,
            city: true,
            address: true,
            quantity: true,
          },
        })
        const wantsSame = detectSameProductIntent(messageText)
        const hasLast = Boolean(lastOrder?.productName)
        if (hasLast && wantsSame) {
          const lastCity = String(lastOrder.city || "").trim()
          const lastAddress = String(lastOrder.address || "").trim()
          const prodName = lastOrder.productName
          let nextQuestion = ""
          if (lastCity && lastAddress) {
            nextQuestion = `واش نخلي نفس المدينة (${lastCity}) ونفس العنوان (${lastAddress})؟`
          } else if (lastCity && !lastAddress) {
            nextQuestion = `نخلي نفس المدينة (${lastCity})؟`
          } else if (!lastCity && lastAddress) {
            nextQuestion = `شنو المدينة أو المنطقة ديالك؟`
          } else {
            nextQuestion = `شنو المدينة أو المنطقة ديالك؟`
          }
          const replyText = `مزيان، بغيتي نفس المنتج "${prodName}".\n${nextQuestion}`
          // Save assistant message + update conversation stage so the UI/state stays consistent
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "AGENT",
              content: replyText,
            },
          })
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              stage: "DISCOVERY",
              updatedAt: new Date(),
              isRead: false,
              score: Math.max(conversation.score || 0, 55),
              context: {
                ...safeObj(conversation.context),
                reorder: {
                  startedAt: new Date().toISOString(),
                  base: {
                    productId: lastOrder.productId || null,
                    productName: lastOrder.productName || null,
                    customerName: lastOrder.customerName || null,
                    city: lastCity || null,
                    address: lastAddress || null,
                  },
                },
              },
            },
          })
          return {
            reply: replyText,
            stage: "DISCOVERY",
            score: Math.max(conversation.score || 0, 55),
            orderConfirmed: false,
            imageUrls: [],
            conversationId: conversation.id,
          }
        }
      } catch (e) {
        console.error("[processIncomingMessage] Reorder flow error:", e?.message || e)
        // If anything fails, fall back to normal AI flow
      }
    }
    // 6. توليد رد AI
    let pendingMissingFields = safeObj(conversation.context).pendingMissingFields
    const lastAgentBeforeAI = getLastAgentMessage(conversation.messages || [])
    const pendingOrderSummaryBeforeAI = safeObj(conversation.context).pendingOrderSummary
    const isFinalConfirmationReply =
      (isPendingOrderSummaryContext(lastAgentBeforeAI) ||
        hasReadyPendingOrderSummary(pendingOrderSummaryBeforeAI, selectedItem)) &&
      isOrderConfirmationReply(messageText)
    if (isFinalConfirmationReply) {
      pendingMissingFields = []
    }
    let thinking
    try {
      thinking = buildAgentThinkingContext({
        messageText,
        conversation,
        items,
        selectedItem,
        pendingMissingFields,
        lastAgentBeforeAI,
      })
    } catch (err) {
      console.error("[AI Thinking] failed:", err)
      thinking = {
        customerIntent: {
          id: "general_message",
          label: "Fallback general message",
          confidence: "low",
          action: "Answer naturally.",
          avoid: "Do not force checkout.",
        },
        checkoutAllowed: false,
        pendingMissingFields: [],
        stillMissingForAI: [],
        nextMissingField: null,
        replyMode: "auto",
        shouldSendImages: false,
        shouldPauseForHuman: false,
      }
    }
    console.log("[AI Thinking]", {
      intent: thinking.customerIntent?.id,
      checkoutAllowed: thinking.checkoutAllowed,
      nextMissingField: thinking.nextMissingField,
      replyMode: thinking.replyMode,
      shouldSendImages: thinking.shouldSendImages,
      shouldPauseForHuman: thinking.shouldPauseForHuman,
    })
    if (thinking.shouldPauseForHuman) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          context: {
            ...safeObj(conversation.context),
            needsHuman: true,
            handoffReason: "customer_requested_human",
            aiPausedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        },
      })
      return {
        reply: "سمح ليا، وقع مشكل مؤقت في النظام. عاود كتب لي.",
        stage: conversation.stage || "DISCOVERY",
        score: 0,
        orderConfirmed: false,
        sendImages: false,
        cancelOrder: false,
        quotaExceeded: false,
        imageUrls: [],
        conversationId: conversation.id,
      }
    }
    if (
      thinking.checkoutAllowed &&
      !isFinalConfirmationReply &&
      (!Array.isArray(pendingMissingFields) || pendingMissingFields.length === 0)
    ) {
      const proactiveMissing = computeMissingFieldsFromConversation(
        conversation.messages,
        items,
        selectedItem
      )
      if (proactiveMissing.length > 0) {
        pendingMissingFields = proactiveMissing
        const nextContext = {
          ...safeObj(conversation.context),
          pendingMissingFields: proactiveMissing,
        }
        conversation.context = nextContext
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { context: nextContext },
        })
      }
      try {
        thinking = buildAgentThinkingContext({
          messageText,
          conversation,
          items,
          selectedItem,
          pendingMissingFields,
          lastAgentBeforeAI,
        })
      } catch (err) {
        console.error("[AI Thinking] proactive re-eval failed:", err)
      }
    }
    if (!thinking.checkoutAllowed) {
      pendingMissingFields = []
    }
    const stillMissingForAI = thinking.stillMissingForAI
    if (Array.isArray(pendingMissingFields) && pendingMissingFields.length > 0) {
      const nextContext = {
        ...safeObj(conversation.context),
        pendingMissingFields: stillMissingForAI.length > 0 ? stillMissingForAI : null,
      }
      conversation.context = nextContext
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { context: nextContext },
      })
    }
    // ✅ FIXED — مسار واحد فقط عبر AI tag: AI وحده يقرر عبر [ORDER_CONFIRMED]
    const pendingSummaryMissingFields = pendingOrderSummaryBeforeAI
      ? getPendingOrderSummaryMissingFields(pendingOrderSummaryBeforeAI, selectedItem)
      : null
    const finalConfirmationMessages = [
      ...(conversation.messages || []),
      { role: "USER", content: messageText },
    ]
    const finalConfirmationMissingFields = isFinalConfirmationReply
      ? (
          pendingSummaryMissingFields?.length === 0
            ? []
            : computeMissingFieldsFromConversation(
                finalConfirmationMessages,
                items,
                selectedItem
              )
        )
      : []

    const canAutoConfirm =
      isFinalConfirmationReply &&
      finalConfirmationMissingFields.length === 0

    const runtimeContextBlock = buildRuntimeOrderStateBlock({
      conversation,
      messageText,
      selectedItem,
      stillMissingForAI,
      lastAgentBeforeAI,
      customerIntent: thinking.customerIntent,
      agentLanguage: agent?.language,
    })
    const aiResult = canAutoConfirm
      ? {
          reply: getAgentLang(agent?.language) === "french"
            ? "Parfait, je confirme ta commande maintenant."
            : "واخا، غادي نأكد ليك الطلب دابا ✅",
          stage: "CLOSED",
          score: 100,
          orderConfirmed: true,
          sendImages: false,
          cancelOrder: false,
          quotaExceeded: false,
        }
      : await generateAIReply({
        agent,
        items,
        conversationHistory: conversation.messages,
        userMessage: messageText,
        selectedItem,
        activeOrdersMemory,
        currentStage: conversation.stage,
        customerName: customer.name,
        runtimeContextBlock,
      })
    let { reply, stage, score, orderConfirmed, sendImages, cancelOrder, quotaExceeded } = aiResult
    if (quotaExceeded) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { isRead: false, updatedAt: new Date() },
      })
      return {
        reply: null,
        skipped: true,
        quotaExceeded: true,
        imageUrls: [],
        conversationId: conversation.id,
      }
    }
    console.log(`AI result: confirmed=${orderConfirmed}, stage=${stage}, cancelOrder=${cancelOrder}`)
    // ✅ GUARD: Only block DANGEROUS AI behavior — confirming or presenting summary with missing fields.
    // NEVER override normal conversation replies (the AI knows how to collect fields naturally).
    if (stillMissingForAI.length > 0) {
      const aiPresentedSummary = hasOrderSummaryDetails(reply) && asksForOrderSummaryConfirmation(reply)
      if (orderConfirmed || aiPresentedSummary) {
        console.warn(`[MissingFieldGuard] AI ${orderConfirmed ? "confirmed" : "summarized"} with missing fields: ${stillMissingForAI.join(", ")}. Forcing ask reply.`)
        const nextMissing = stillMissingForAI[0]
        const replyMode = resolveReplyCommunicationMode(agent?.language, messageText)
        const forcedAsk = (() => {
          if (replyMode === "french") {
            if (nextMissing === "name") return "Dernière chose: c'est quoi ton nom complet pour la livraison ?"
            if (nextMissing === "product") return "Quel produit veux-tu confirmer exactement ?"
            if (nextMissing === "quantity") return "Combien de pièces tu veux exactement ?"
            if (nextMissing === "city") return "Parfait. Tu es dans quelle ville ?"
            if (nextMissing === "address") return "Top. Donne-moi l'adresse complète pour la livraison."
            return "Il me manque juste une info pour confirmer la commande."
          }
          if (replyMode === "darija_arabic") {
            if (nextMissing === "name") return "باقي غير السمية الكاملة ديالك باش نكملو الطلبية."
            if (nextMissing === "product") return "شنو هو المنتج اللي بغيتي نأكد ليك بالضبط؟"
            if (nextMissing === "quantity") return "شحال من وحدة بغيتي بالضبط؟"
            if (nextMissing === "city") return "فين نوصلوها ليك؟ عطيني المدينة."
            if (nextMissing === "address") return "عافاك عطيني العنوان مزيان: الحي، الزنقة، وشي علامة قريبة."
            return "باقي خاصني معلومة وحدة باش نكملو الطلبية."
          }
          // Arabic
          if (nextMissing === "name") return "بقي فقط الاسم الكامل لإكمال الطلب."
          if (nextMissing === "product") return "ما هو المنتج الذي تريد تأكيده بالضبط؟"
          if (nextMissing === "quantity") return "كم الكمية المطلوبة بالضبط؟"
          if (nextMissing === "city") return "ممتاز. ما هي المدينة أو المنطقة؟"
          if (nextMissing === "address") return "ممتاز. ما هو العنوان الكامل للتوصيل؟"
          return "تنقصنا معلومة واحدة لإكمال الطلب."
        })()
        reply = forcedAsk
        stage = "CLOSING"
        score = Math.max(score || 0, 80)
        orderConfirmed = false
        sendImages = false
      }
    }
    // 6.5 معالجة طلب الإلغاء من الزبون
    if (cancelOrder) {
      try {
        const cancellation = await cancelCustomerOrder({
          userId,
          customer,
          conversation,
          agent,
          messageText,
          activeOrders: activeOrdersFromDb,
        })
        // If cancellation returned a direct reply (legacy), use it; otherwise let AI handle
        if (cancellation?.reply) {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              stage: cancellation.stage || "CLOSING",
              score: cancellation.score || Math.max(conversation.score || 0, SCORE_MAP.CLOSING),
              updatedAt: new Date(),
              isRead: false,
            },
          })
          console.log(`[OrderCancel] Cancellation handled from AI marker${cancellation.order?.id ? ` order=${cancellation.order.id.slice(0, 6)}...` : ""}`)
          return {
            reply: cancellation.reply,
            stage: cancellation.stage || "CLOSING",
            score: cancellation.score || Math.max(conversation.score || 0, SCORE_MAP.CLOSING),
            orderConfirmed: false,
            imageUrls: [],
            conversationId: conversation.id,
          }
        }
        // If null, continue to AI generation with updated context
      } catch (err) {
        console.error(`[processIncomingMessage] Error cancelling order:`, err.message)
      }
    }
    // حساب قيمة الطلب
    const EXTRACTION_WINDOW = 10
    let totalAmount = null
    let extractedCity = null
    let extractedAddress = null
    let extractedCustomerName = null
    let extractedQty = null
    let freshMessages = []
    const pendingOrderSummaryForConfirmation = safeObj(conversation.context).pendingOrderSummary
    if (orderConfirmed) {
      freshMessages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
      })
      const userMessages = freshMessages.filter(m => m.role === 'USER')
      const recentUserMsgs = userMessages.slice(-EXTRACTION_WINDOW)
      console.log(` [Extraction] Using ${recentUserMsgs.length} USER messages from ${userMessages.length} total`)
      // ✅ FIX #1 — Detect the product the customer ACTUALLY discussed,
      //   not just agent.selectedProductId (which may be the wrong product).
      const detectedProduct = detectOrderedProduct(items, freshMessages, selectedItem)
      if (detectedProduct && (!selectedItem || detectedProduct.id !== selectedItem.id)) {
        console.log(`[Product] Corrected: ${selectedItem?.name || "none"} -> ${detectedProduct.name}`)
        selectedItem = detectedProduct
      }
      if (!selectedItem) {
        const productFromPendingSummary = pendingOrderSummaryForConfirmation?.productId
          ? items.find(item => item?.id === pendingOrderSummaryForConfirmation.productId)
          : null
        if (productFromPendingSummary) {
          console.log(`[Product] From pending summary: ${productFromPendingSummary.name}`)
          selectedItem = productFromPendingSummary
        }
      }
      if (!selectedItem) {
        const productFromAgentSummary = findProductsMentionedInText(
          items,
          freshMessages.filter(m => m.role === "AGENT").slice(-3).map(m => m.content).join("\n")
        )[0]
        if (productFromAgentSummary) {
          console.log(`[Product] From agent summary: ${productFromAgentSummary.name}`)
          selectedItem = productFromAgentSummary
        }
      }
      const extractionMessages = freshMessages.slice(-30)
      const extracted = extractCityAndAddressFromUserMessages(extractionMessages)
      extractedCity =
        cleanExtractedCity(extracted.city) ||
        cleanExtractedCity(pendingOrderSummaryForConfirmation?.city) ||
        null
      extractedAddress =
        cleanExtractedAddress(extracted.address) ||
        cleanExtractedAddress(pendingOrderSummaryForConfirmation?.address) ||
        null
      if (extractedAddress) {
        console.log(`[Address] city="${extractedCity || '-'}" addr="${extractedAddress.slice(0, 60)}"`)
      } else {
        console.warn(`[Address] No address found in last ${recentUserMsgs.length} user messages`)
      }
      const pendingSummaryName = normalizeCustomerText(pendingOrderSummaryForConfirmation?.customerName)
      extractedCustomerName =
        normalizeCustomerText(extractCustomerFullNameFromMessages(freshMessages)) ||
        (isPlausibleFullName(pendingSummaryName) ? pendingSummaryName : null)
      // ✅ FIX #3 — Take the LATEST quantity mention (handles corrections).
      // Only default to 1 for products configured as single-unit.
      const latestQty = extractLatestQuantity(recentUserMsgs)
      const pendingSummaryQty = Number(pendingOrderSummaryForConfirmation?.quantity)
      extractedQty =
        latestQty ||
        (Number.isFinite(pendingSummaryQty) && pendingSummaryQty >= 1 ? pendingSummaryQty : null) ||
        (selectedItem?.askQuantity === false ? 1 : null)
      // ✅ FIX #4 — Prefer total parsed from AI's own summary (handles discounts).
      //   Use salePrice if set as the effective unit price (automatic discount).
      if (selectedItem && extractedQty) {
      const effectiveUnitPrice = (selectedItem.salePrice != null && selectedItem.salePrice < selectedItem.price)
        ? selectedItem.salePrice
        : selectedItem.price
      const pendingSummaryTotal = Number(pendingOrderSummaryForConfirmation?.totalAmount)
      const totalFromReply =
        parseTotalFromReply(reply) ||
        (Number.isFinite(pendingSummaryTotal) && pendingSummaryTotal > 0 ? pendingSummaryTotal : null)
      const computedTotal  = effectiveUnitPrice * extractedQty
      if (totalFromReply && Math.abs(totalFromReply - computedTotal) >= 1) {
        console.log(`📊 [Total] AI summary: ${totalFromReply} DH (overrides computed ${computedTotal} DH — discount?)`)
        totalAmount = totalFromReply
      } else {
        totalAmount = computedTotal
      }
      } else if (!selectedItem) {
        console.warn("[Product] No product detected for confirmed order")
      } else {
        console.warn("[Quantity] No explicit quantity detected")
      }
      console.log(`[Quantity] Extracted: ${extractedQty} | Total: ${totalAmount || "-"} DH`)
    }
    // ✅ FIXED — FINAL GUARD صلب 100%
    if (orderConfirmed) {
      const missing = []

      if (!selectedItem) missing.push("product")
      if (!extractedCity || extractedCity.length < 2) missing.push("city")
      if (!extractedAddress || extractedAddress.length < 8) missing.push("address")
      if (!extractedQty || extractedQty < 1) missing.push("quantity")
      if (!extractedCustomerName) missing.push("name")

      // ✅ إذا أي حقل ناقص → اسأل فوراً، ما تسجلش
      if (missing.length > 0) {
        console.warn(`[FINAL GUARD] Blocked: missing ${missing.join(", ")}`)
        const nextMissing = ["product", "quantity", "city", "address", "name"]
          .find(f => missing.includes(f)) || missing[0]
        const replyMode = resolveReplyCommunicationMode(agent?.language, messageText)
        const ask = (() => {
          if (replyMode === "french") {
            if (nextMissing === "product") return "Quel produit veux-tu confirmer exactement ?"
            if (nextMissing === "quantity") return "Combien de pièces tu veux exactement ?"
            if (nextMissing === "city") return "Parfait. Tu es dans quelle ville ?"
            if (nextMissing === "address") return "Top. Donne-moi l'adresse complète pour la livraison."
            if (nextMissing === "name") return "Dernière chose: c'est quoi ton nom complet ?"
            return "Il me manque juste une info pour confirmer."
          }
          if (replyMode === "darija_arabic") {
            if (nextMissing === "product") return "شنو المنتج اللي بغيتي تطلب بالضبط؟"
            if (nextMissing === "quantity") return "شحال بغيتي من وحدة؟"
            if (nextMissing === "city") return "فين نوصلو ليك؟ عطيني المدينة."
            if (nextMissing === "address") return "عافاك عطيني العنوان مزيان: الحي، الزنقة، ورقم الدار إلا كاين."
            if (nextMissing === "name") return "باقي غير السمية الكاملة ديالك باش نأكد الطلب."
            return "باقي خاصني غير معلومة وحدة ونكمل ليك الطلب."
          }
          if (nextMissing === "product") return "ما هو المنتج الذي تريده بالضبط؟"
          if (nextMissing === "quantity") return "كم الكمية المطلوبة؟"
          if (nextMissing === "city") return "ما هي المدينة؟"
          if (nextMissing === "address") return "ما هو العنوان الكامل للتوصيل؟"
          if (nextMissing === "name") return "بقي فقط الاسم الكامل."
          return "تنقصنا معلومة واحدة."
        })()

        const pendingContext = {
          ...safeObj(conversation.context),
          pendingMissingFields: missing,
        }
        conversation.context = pendingContext
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { context: pendingContext },
        })

        reply = ask
        stage = "CLOSING"
        score = Math.max(score || 0, 80)
        orderConfirmed = false
      } else {
        // ✅ كل البيانات موجودة → تحقق من الجودة
        const qualityIssues = validateOrderQuality({
          selectedItem,
          quantity: extractedQty,
          city: extractedCity,
          address: extractedAddress,
          customerName: extractedCustomerName,
        })

        if (qualityIssues.length > 0) {
          const firstIssue = qualityIssues[0]
          const qualityReplyMode = resolveReplyCommunicationMode(agent?.language, messageText)
          reply = buildOrderQualityReply(firstIssue, agent, qualityReplyMode)
          stage = "CLOSING"
          score = Math.max(score || 0, 75)
          orderConfirmed = false
          console.warn(`[FINAL GUARD Quality] Blocked: ${qualityIssues.map(i => `${i.field}:${i.reason}`).join(", ")}`)
        }
        // ✅ إذا qualityIssues فارغة → سجل الطلبية (الكود الموجود يكمل)
      }
    }
    // إعداد الصور
    // Detect which product the customer is asking about (not just default).
    // Fixes case: customer asks about Jeans but selectedItem = T-Shirt -> wrong images.
    let imageUrls = []
    if (sendImages) {
      // Re-fetch conversation messages to identify the product in context.
      const allMessages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
        take: 30,
      })
      const directlyRequestedProduct = detectOrderedProduct(
        items,
        [{ role: "USER", content: messageText }],
        null
      )
      if (directlyRequestedProduct) {
        imageUrls = collectImageUrlsForProducts([directlyRequestedProduct], {
          perProductLimit: 3,
          totalLimit: 6,
        })
        console.log(`[Images] Direct product: "${directlyRequestedProduct.name}" -> ${imageUrls.length} image(s)`)
      } else {
        const requestedCount = getRequestedProductCount(messageText, isCatalogProductRequest(messageText) ? 3 : 1)
        const productsFromReply = findProductsMentionedInText(items, reply).slice(0, requestedCount)
        const productsFromUser = findProductsMentionedInText(items, messageText).slice(0, requestedCount)
        const catalogProducts = isCatalogProductRequest(messageText)
          ? (productsFromReply.length > 0 ? productsFromReply : items.filter(item => item.isActive).slice(0, requestedCount))
          : []
        const multiProductCandidates = productsFromReply.length > 0
          ? productsFromReply
          : productsFromUser.length > 0
            ? productsFromUser
            : catalogProducts
        if (multiProductCandidates.length > 0) {
          imageUrls = collectImageUrlsForProducts(multiProductCandidates, {
            perProductLimit: 1,
            totalLimit: Math.max(1, Math.min(6, requestedCount)),
          })
          console.log(`[Images] Product list: ${multiProductCandidates.map(p => `"${p.name}"`).join(", ")} -> ${imageUrls.length} image(s)`)
        }
      }
      const productForImages = imageUrls.length === 0
        ? detectOrderedProduct(items, allMessages, selectedItem)
        : null
      if (productForImages) {
        imageUrls = collectImageUrlsForProducts([productForImages], {
          perProductLimit: 3,
          totalLimit: 6,
        })
        console.log(`[Images] Product: "${productForImages.name}" -> ${imageUrls.length} image(s) to send`)
        if (imageUrls.length === 0) {
          console.warn(`[Images] Product "${productForImages.name}" has no valid images; not sending another product's images`)
        }
      }
    }
    // 7. حفظ رد Agent
    let savedAgentReply = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "AGENT",
        content: reply,
      }
    })
    // 8. تحديث المحادثة
    // لا نحفظ CLOSED إلا مع orderConfirmed — وإلا الواجهة تعرض "طلب/حجز مؤكد" بلا طلبية فعلية
    let finalStage = stage || conversation.stage
    let finalScore = Math.max(conversation.score || 0, score || 0)
    // Track if the custom confirmation message was sent to avoid duplicate replies.
    let confirmMessageSent = false
    if (!orderConfirmed && stage === "CLOSED" && conversation.stage !== "CLOSED") {
      finalStage = "CLOSING"
      finalScore = Math.min(finalScore, SCORE_MAP.CLOSING)
    }
    const replyHasPendingOrderSummary =
      !orderConfirmed &&
      hasOrderSummaryDetails(reply) &&
      asksForOrderSummaryConfirmation(reply)
    let pendingOrderSummaryAfterReply = replyHasPendingOrderSummary
      ? buildPendingOrderSummarySnapshot({
          reply,
          conversation,
          selectedItem,
        })
      : null
    if (replyHasPendingOrderSummary) {
      finalStage = "CLOSING"
      finalScore = Math.max(finalScore || 0, SCORE_MAP.CLOSING)
    }
    if (replyHasPendingOrderSummary && pendingOrderSummaryAfterReply) {
      try {
        const draftQty = Number(pendingOrderSummaryAfterReply.quantity)
        const safeDraftQty = Number.isFinite(draftQty) && draftQty >= 1 ? draftQty : 1
        const draftTotal = Number(pendingOrderSummaryAfterReply.totalAmount)
        const effectiveUnitPrice = selectedItem
          ? (selectedItem.salePrice != null && selectedItem.salePrice < selectedItem.price
              ? selectedItem.salePrice
              : selectedItem.price)
          : null
        const safeDraftTotal = Number.isFinite(draftTotal) && draftTotal >= 0
          ? draftTotal
          : Number.isFinite(Number(effectiveUnitPrice))
            ? Number(effectiveUnitPrice) * safeDraftQty
            : 0
        const draftMissingFields = Array.isArray(pendingOrderSummaryAfterReply.missingFields)
          ? pendingOrderSummaryAfterReply.missingFields.filter(Boolean)
          : getPendingOrderSummaryMissingFields(pendingOrderSummaryAfterReply, selectedItem)
        const previousDraftId = safeObj(conversation.context).pendingOrderSummary?.orderId
        let existingPendingDraft = previousDraftId
          ? await prisma.order.findFirst({
              where: {
                id: previousDraftId,
                userId,
                customerId: customer.id,
                conversationId: conversation.id,
                isDraft: true,
              },
              select: { id: true },
            })
          : null
        if (!existingPendingDraft) {
          existingPendingDraft = await prisma.order.findFirst({
            where: {
              userId,
              customerId: customer.id,
              conversationId: conversation.id,
              isDraft: true,
              status: "PENDING",
            },
            orderBy: { updatedAt: "desc" },
            select: { id: true },
          })
        }
        const draftOrderData = {
          customerName: normalizeCustomerText(pendingOrderSummaryAfterReply.customerName) || customer.name || "زبون واتساب",
          customerPhone: customer.phone,
          productId: selectedItem?.id || pendingOrderSummaryAfterReply.productId || null,
          productName: selectedItem?.name || pendingOrderSummaryAfterReply.productName || "طلبية واتساب",
          quantity: safeDraftQty,
          totalAmount: safeDraftTotal,
          city: cleanExtractedCity(pendingOrderSummaryAfterReply.city) || null,
          address: cleanExtractedAddress(pendingOrderSummaryAfterReply.address) || null,
          status: "PENDING",
          isDraft: true,
          missingFields: draftMissingFields.length > 0 ? JSON.stringify(draftMissingFields) : null,
          notes: `طلبية كتسنى تأكيد الزبون - المحادثة: ${conversation.id}`,
        }
        const pendingDraftOrder = existingPendingDraft
          ? await prisma.order.update({
              where: { id: existingPendingDraft.id },
              data: draftOrderData,
            })
          : await prisma.order.create({
              data: {
                userId,
                customerId: customer.id,
                conversationId: conversation.id,
                ...draftOrderData,
              },
            })
        pendingOrderSummaryAfterReply = {
          ...pendingOrderSummaryAfterReply,
          orderId: pendingDraftOrder.id,
          totalAmount: safeDraftTotal,
          quantity: safeDraftQty,
          missingFields: draftMissingFields,
          ready: draftMissingFields.length === 0,
        }
        console.log(`[OrderDraft] ${existingPendingDraft ? "Updated" : "Created"} draft ${pendingDraftOrder.id.slice(0, 6)}... from pending summary`)
      } catch (draftErr) {
        console.warn("[OrderDraft] Could not persist pending order summary:", draftErr?.message || draftErr)
      }
    }
    const contextAfterReply = {
      ...safeObj(conversation.context),
      ...(replyHasPendingOrderSummary ? {
        pendingOrderSummary: pendingOrderSummaryAfterReply,
      } : {}),
      ...(orderConfirmed ? {
        pendingMissingFields: null,
        pendingOrderSummary: null,
      } : {}),
    }
    conversation.context = contextAfterReply
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        stage: finalStage,
        score: finalScore,
        isRead: false,
        updatedAt: new Date(),
        context: contextAfterReply,
        ...(orderConfirmed && {
          stage: "CLOSED",
          score: 100,
          totalAmount,
        }),
      },
    })
    // 9. تحديث الزبون + إنشاء الموعد
    if (orderConfirmed) {
      if (selectedItem) {
        try {
          console.log(` [Address] Saving to DB: city="${extractedCity || '—'}" addr="${extractedAddress || '⚠️ NULL'}"`)
          console.log(`[Quantity] Using pre-extracted qty: ${extractedQty}`)
          // ✅ FIX #5 — Capture delivery instructions from customer messages
          const userMsgsForNotes = (await prisma.message.findMany({
            where: { conversationId: conversation.id, role: "USER" },
            orderBy: { createdAt: "asc" },
            select: { content: true },
            take: 50,
          })).slice(-EXTRACTION_WINDOW)
          const deliveryNotes = extractDeliveryNotes(userMsgsForNotes.map(m => ({ content: m.content })))
          // Use only the delivery name provided in chat, not the WhatsApp profile name.
          const resolvedName = extractedCustomerName
          if (resolvedName && resolvedName !== customer.name) {
            try {
              await prisma.customer.update({
                where: { id: customer.id },
                data: { name: resolvedName },
              })
              console.log(`[Name] Saved delivery name from chat for customer ${customer.id.slice(0, 6)}...`)
            } catch (err) {
              console.warn(`[Name] Could not update customer:`, err.message)
            }
          }
          // ✅ Variants — extract selected variant from conversation
          const convMessagesForVariant = await prisma.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: "asc" },
            select: { role: true, content: true },
            take: 40,
          })
          const selectedVariant = extractSelectedVariant(selectedItem, convMessagesForVariant)
          if (selectedVariant) {
            console.log(`[Variant] Detected: "${selectedVariant}"`)
          }
          const safeResolvedName = normalizeCustomerText(resolvedName) || customer.name
          const safeVariant = normalizeCustomerText(selectedVariant) || null
          const safeCity = cleanExtractedCity(extractedCity) || null
          const safeAddress = cleanExtractedAddress(extractedAddress) || null
          const safeDeliveryNotes = normalizeCustomerText(deliveryNotes, { keepNewlines: true })
          const baseNote = safeAddress
            ? `\u0637\u0644\u0628 \u062A\u0644\u0642\u0627\u0626\u064A \u0645\u0646 \u0648\u0627\u062A\u0633\u0627\u0628 - \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629: ${conversation.id}`
            : `\u0637\u0644\u0628 \u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646 - \u064A\u062D\u062A\u0627\u062C \u0645\u062A\u0627\u0628\u0639\u0629 \u064A\u062F\u0648\u064A\u0629 - \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629: ${conversation.id}`
          const combinedNotes = safeDeliveryNotes
            ? `\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0627\u0644\u0632\u0628\u0648\u0646: ${safeDeliveryNotes}\n${baseNote}`
            : baseNote
          // Guard: look for existing draft/pending order for this conversation to avoid duplicates.
          const existingDraft = await prisma.order.findFirst({
            where: {
              userId,
              customerId: customer.id,
              conversationId: conversation.id,
              isDraft: true,
              status: "PENDING",
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true },
          })
          const orderData = {
            customerName: safeResolvedName,
            customerPhone: customer.phone,
            productId: selectedItem.id,
            productName: selectedItem.name,
            variant: safeVariant,
            quantity: extractedQty,
            totalAmount: totalAmount || (selectedItem.price * extractedQty),
            city: safeCity,
            address: safeAddress,
            status: "PENDING",
            isDraft: false,
            missingFields: null,
            notes: combinedNotes,
          }
          let order
          if (existingDraft) {
            order = await prisma.order.update({
              where: { id: existingDraft.id },
              data: orderData,
            })
            console.log(`[Order] Updated existing draft -> confirmed: ${order.id.slice(0, 6)}... | Addr: "${order.address?.slice(0, 30)}..." | Qty: ${order.quantity} | Total: ${order.totalAmount}`)
          } else {
            order = await prisma.order.create({
              data: {
                userId,
                customerId: customer.id,
                conversationId: conversation.id,
                ...orderData,
              },
            })
            console.log(`[Order] Created new confirmed order: ${order.id.slice(0, 6)}... | Addr: "${order.address?.slice(0, 30)}..." | Qty: ${order.quantity} | Total: ${order.totalAmount}`)
          }
          await applyOrderCountedSideEffects(order)
          try {
            const confirmTemplate = agent.orderConfirmMessage?.trim()
            let customConfirmSent = false
            if (confirmTemplate && agent.whatsappPhoneId && agent.whatsappToken) {
              const trackingUrl = agent.trackingUrlTemplate && order.trackingNumber
                ? agent.trackingUrlTemplate.replace(/{tracking}/g, order.trackingNumber)
                : ""
              const confirmMessage = renderTemplate(confirmTemplate, {
                customerName: order.customerName,
                productName: order.productName,
                totalAmount: order.totalAmount,
                trackingNumber: order.trackingNumber,
                trackingUrl,
                agentName: agent.name,
              })
              if (confirmMessage) {
                const sendResult = await sendWhatsAppMessage({
                  phoneId: agent.whatsappPhoneId,
                  token: agent.whatsappToken,
                  to: customer.phone,
                  message: confirmMessage,
                })
                if (sendResult.success) {
                  await prisma.message.create({
                    data: {
                      conversationId: conversation.id,
                      role: "AGENT",
                      content: confirmMessage,
                    },
                  })
                  confirmMessageSent = true
                  customConfirmSent = true
                  if (savedAgentReply?.id) {
                    try {
                      await prisma.message.delete({ where: { id: savedAgentReply.id } })
                      savedAgentReply = null
                    } catch (deleteErr) {
                      console.warn("[AutoConfirm] Could not remove unsent AI confirmation reply:", deleteErr?.message || deleteErr)
                    }
                  }
                  console.log(`[AutoConfirm] Sent custom confirm message for order ${order.id.slice(0, 6)}`)
                }
              }
            }
            const confirmedOrder = await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "CONFIRMED",
                ...(customConfirmSent ? { confirmSent: true } : {}),
              },
            })
            console.log(`[AutoConfirm] Order ${order.id.slice(0, 6)} promoted: PENDING -> CONFIRMED`)
            Object.assign(order, {
              status: confirmedOrder.status,
              confirmSent: confirmedOrder.confirmSent,
              updatedAt: confirmedOrder.updatedAt,
            })
          } catch (confirmErr) {
            console.error("[AutoConfirm] Failed:", confirmErr.message)
          }
          // ✅ Persist “memory” for next turns (re-order / follow-up questions)
          try {
            const orderMemory = buildOrderContextMemory(order)
            await prisma.conversation.update({
              where: { id: conversation.id },
              data: {
                context: {
                  ...safeObj(conversation.context),
                  pendingMissingFields: null,
                  pendingOrderSummary: null,
                  lastConfirmed: {
                    at: new Date().toISOString(),
                    productId: selectedItem.id,
                    productName: selectedItem.name,
                    quantity: extractedQty,
                    city: safeCity,
                    address: safeAddress,
                    customerName: safeResolvedName || customer.name || null,
                    orderId: order.id,
                    status: order.status,
                    trackingNumber: order.trackingNumber || null,
                    totalAmount: order.totalAmount,
                    createdAt: order.createdAt,
                  },
                  ...(orderMemory ? {
                    currentOrder: orderMemory,
                    lastOrderSnapshot: orderMemory,
                  } : {}),
                  ...(order.status === "CONFIRMED" ? {
                    followUpScheduled: {
                      orderId: order.id,
                      scheduledAfter: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                      type: "post_delivery_check",
                    },
                  } : {}),
                },
              },
            })
          } catch (e) {
            console.error("[processIncomingMessage] context save error:", e?.message || e)
          }
        } catch (err) {
          console.error(`[processIncomingMessage] Error creating order:`, err.message)
          orderConfirmed = false
          confirmMessageSent = false
          stage = "CLOSING"
          finalStage = "CLOSING"
          finalScore = Math.max(finalScore || 0, SCORE_MAP.CLOSING)
          reply = getAgentLang(agent?.language) === "french"
  ? "⚠️ Je n'ai pas pu enregistrer la commande maintenant. Réessaie de confirmer dans un instant s'il te plaît."
  : "⚠️ ما قدرتش نسجل الطلب دابا. عاود أكد ليا من بعد لحظة عافاك."
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              stage: "CLOSING",
              score: Math.max(conversation.score || 0, SCORE_MAP.CLOSING),
              isRead: false,
              updatedAt: new Date(),
              context: {
                ...safeObj(conversation.context),
                lastOrderCreateErrorAt: new Date().toISOString(),
              },
            },
          }).catch((updateErr) => {
            console.warn("[OrderCreate] Could not reopen conversation after create failure:", updateErr?.message || updateErr)
          })
          if (savedAgentReply?.id) {
            await prisma.message.update({
              where: { id: savedAgentReply.id },
              data: { content: reply },
            }).catch((messageErr) => {
              console.warn("[OrderCreate] Could not replace failed confirmation reply:", messageErr?.message || messageErr)
            })
          }
        }
      }
      await prisma.notification.create({
        data: {
          userId,
          type: "NEW_ORDER",
          title: `fr:Nouvelle commande! 🎉||ar:طلب جديد! 🎉`,
          message: `fr:${customerName} a confirmé une commande de ${totalAmount || 0} DH||ar:${customerName} أكد طلب بقيمة ${totalAmount || 0} درهم`,
        }
      })
    }
    // 10. إشعار اعتراض
    if (stage === "OBJECTION") {
      await prisma.notification.create({
        data: {
          userId,
          type: "OBJECTION_ALERT",
          title: `fr:Objection à suivre ⚠️||ar:اعتراض يحتاج متابعة ⚠️`,
          message: `fr:${customerName} — Score ${score}%||ar:${customerName} — Score ${score}%`,
        }
      })
    }
    const shouldSkipReply = orderConfirmed && confirmMessageSent
    return {
      reply: shouldSkipReply ? null : reply,
      stage: orderConfirmed ? "CLOSED" : finalStage,
      score: orderConfirmed ? 100 : finalScore,
      orderConfirmed,
      imageUrls,
      conversationId: conversation.id,
    }
  } catch (error) {
    console.error("processIncomingMessage error:", error)
    return {
      reply: "سمح ليا، وقع خطأ. حاول مرة أخرى.",
      imageUrls: [],
      error: true,
      conversationId: null,
    }
  }
}
