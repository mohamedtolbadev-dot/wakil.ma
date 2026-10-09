// تنسيق المبلغ بالدرهم المغربي
export function formatAmount(amount, locale = "ar-MA") {
  if (amount === undefined || amount === null) return locale === "fr-FR" ? "0 DH" : "0 درهم"
  const currency = locale === "fr-FR" ? " DH" : " درهم"
  return amount.toLocaleString(locale) + currency
}

// وقت نسبي بالعربية
export function timeAgo(dateStr, t = null) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 2) return t ? t('time.now') : "الآن"
  if (minutes < 60) return t ? t('time.minutes').replace('{n}', minutes) : `منذ ${minutes} دقيقة`
  if (hours < 24) return t ? t('time.hours').replace('{n}', hours) : `منذ ${hours} ساعة`
  return t ? t('time.days').replace('{n}', days) : `منذ ${days} يوم`
}

// لون وتسمية مرحلة المحادثة
export function getStageConfig(stage, t = null) {
  if (stage === "CLOSED") {
    return {
      label: t ? t('conv.stage_ordered') : "تم الطلب",
      className: "bg-brand-600/10 text-brand-700 border-brand-600/20"
    }
  }

  const configs = {
    GREETING: { label: t ? t('stage.greeting') : "ترحيب", className: "bg-secondary text-muted-foreground border-border" },
    DISCOVERY: { label: t ? t('stage.discovery') : "استكشاف", className: "bg-blue-100 text-blue-800 border-blue-200" },
    PITCHING: { label: t ? t('stage.pitching') : "إقناع", className: "bg-brand-600/10 text-brand-800 border-brand-600/20" },
    OBJECTION: { label: t ? t('stage.objection') : "اعتراض", className: "bg-red-100 text-red-800 border-red-200" },
    ABANDONED: { label: t ? t('stage.abandoned') : "مهجورة", className: "bg-gray-100 text-gray-500 border-gray-200" },
  }
  return configs[stage] || configs.GREETING
}

// ✅ دالة تعيد label حسب stage
export function getStageLabel(stage, t = null) {
  if (stage === "CLOSED") {
    return t ? t('conv.stage_ordered') : "تم الطلب ✅"
  }
  return getStageConfig(stage, t).label
}

// ✅ دالة تعيد className حسب stage
export function getStageClassName(stage) {
  return getStageConfig(stage).className
}

// لون score حسب النسبة
export function getScoreColor(score) {
  if (score >= 70) return "#712DDE"
  if (score >= 40) return "#BA7517"
  return "#E24B4A"
}

// لون وتسمية تصنيف الزبون
export function getCustomerTagConfig(tag, t = null) {
  const configs = {
    VIP: { label: "VIP", className: "bg-teal-100 text-teal-800 border-teal-200" },
    NEW: { label: t ? t('customers.tag_new') : "جديد", className: "bg-brand-600/10 text-brand-800 border-brand-600/20" },
    REGULAR: { label: t ? t('customers.tag_regular') : "عادي", className: "bg-green-100 text-green-800 border-green-200" },
    PROSPECT: { label: t ? t('customers.tag_prospect') : "محتمل", className: "bg-amber-100 text-amber-800 border-amber-200" },
  }
  return configs[tag] || configs.REGULAR
}

// توليد الحرف الأول من الاسم
export function getInitials(name) {
  if (!name || typeof name !== 'string') return "؟"
  return name.charAt(0).toUpperCase()
}

// ✅ دالة ترجم أسباب الاعتراض
export function translateObjectionReason(reason, t) {
  if (!t) return reason
  
  // Map common objection reason patterns to translation keys
  const reasonMap = {
    // Price related
    "السعر غالي": "objection.expensive",
    "سعر غالي": "objection.expensive",
    "prix": "objection.price",
    "cher": "objection.expensive",
    "expensive": "objection.expensive",
    "price": "objection.price",
    // Quality
    "الجودة": "objection.quality",
    "جودة": "objection.quality",
    "qualité": "objection.quality",
    "quality": "objection.quality",
    // Size
    "الحجم": "objection.size",
    "حجم": "objection.size",
    "taille": "objection.size",
    "size": "objection.size",
    // Color
    "اللون": "objection.color",
    "لون": "objection.color",
    "couleur": "objection.color",
    "color": "objection.color",
    // Delivery
    "التوصيل": "objection.delivery",
    "توصيل": "objection.delivery",
    "livraison": "objection.delivery",
    "delivery": "objection.delivery",
    // Trust/Doubt
    "الثقة": "objection.trust",
    "ثقة": "objection.trust",
    "confiance": "objection.trust",
    "الشك": "objection.doubt",
    "شك": "objection.doubt",
    "doute": "objection.doubt",
    "doubt": "objection.doubt",
    // Comparison
    "المقارنة": "objection.compare",
    "مقارنة": "objection.compare",
    "comparaison": "objection.compare",
    "compare": "objection.compare",
    // Time
    "الوقت": "objection.time",
    "وقت": "objection.time",
    "délai": "objection.time",
    "time": "objection.time",
    // Availability
    "التوفر": "objection.availability",
    "توفر": "objection.availability",
    "disponibilité": "objection.availability",
    "availability": "objection.availability",
    // Guarantee
    "الضمان": "objection.guarantee",
    "ضمان": "objection.guarantee",
    "garantie": "objection.guarantee",
    "guarantee": "objection.guarantee",
  }
  
  // Try exact match first
  if (reasonMap[reason]) {
    return t(reasonMap[reason])
  }
  
  // Try case-insensitive match
  const lowerReason = reason?.toLowerCase()
  if (reasonMap[lowerReason]) {
    return t(reasonMap[lowerReason])
  }
  
  // Try partial match
  for (const [key, translationKey] of Object.entries(reasonMap)) {
    if (lowerReason?.includes(key.toLowerCase())) {
      return t(translationKey)
    }
  }
  
  // Return original if no translation found
  return reason
}

// ✅ دالة تنظيف المدخلات — تمنع Prompt Injection
export function sanitizeInput(text) {
  if (!text || typeof text !== "string") return ""
  return text
    .replace(/[<>]/g, "")
    .replace(/\[STAGE:\w+\]/g, "")
    .replace(/\[ORDER_CONFIRMED\]/g, "")
    .replace(/\[SEND_IMAGES\]/g, "")
    .slice(0, 1000)
    .trim()
}

// ✅ دالة آمنة لجلب token — تدعم SSR
export function getToken() {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("token")
    const token = typeof raw === "string" ? raw.trim() : ""
    if (!token || token === "undefined" || token === "null") return null
    return token
  } catch {
    return null
  }
}
