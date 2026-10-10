// دوال التواصل مع WhatsApp Cloud API + Twilio

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL ||
  "https://graph.facebook.com/v19.0"

const TWILIO_API_URL = "https://api.twilio.com/2010-04-01"

// ─── Twilio: إرسال رسالة واتساب ───────────────────────────────
export async function sendTwilioWhatsAppMessage({
  accountSid,
  authToken,
  from,   // e.g. "whatsapp:+16204072940"
  to,     // e.g. "whatsapp:+212600000000"
  message,
  mediaUrl = null,
}) {
  if (!accountSid || !authToken || !from || !to) {
    return { success: false, error: "Missing Twilio credentials" }
  }

  const fromWa = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`
  const toWa   = to.startsWith("whatsapp:")   ? to   : `whatsapp:${to}`

  const params = new URLSearchParams({ From: fromWa, To: toWa, Body: message || "" })
  if (mediaUrl) params.append("MediaUrl", mediaUrl)

  try {
    const response = await fetch(
      `${TWILIO_API_URL}/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    )

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const isAuthError = response.status === 401 || data?.code === 20003
      console.error(`❌ Twilio error ${response.status}:`, data?.message || data?.code)
      return { success: false, error: data?.message || "Twilio error", isAuthError }
    }

    console.log(`✅ Twilio message sent (SID: ${data.sid})`)
    return { success: true, data, messageSid: data.sid }
  } catch (error) {
    console.error("❌ sendTwilioWhatsAppMessage error:", error?.message)
    return { success: false, error: error?.message || "Unknown error" }
  }
}

// ─── Twilio: تحميل ميديا (صوت/صورة) ──────────────────────────
export async function downloadTwilioMedia({ accountSid, authToken, mediaUrl }) {
  if (!mediaUrl) return null
  try {
    const response = await fetch(mediaUrl, {
      headers: {
        "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
    })
    if (!response.ok) {
      console.error("❌ downloadTwilioMedia:", response.status)
      return null
    }
    const mimeType = response.headers.get("content-type") || "application/octet-stream"
    const buffer = await response.arrayBuffer()
    return { buffer, mimeType }
  } catch (e) {
    console.error("❌ downloadTwilioMedia:", e?.message)
    return null
  }
}

// ─── Twilio: تحليل webhook الوارد ─────────────────────────────
export function parseTwilioIncomingMessage(formData) {
  // Twilio يبعث Form data
  const messageSid  = formData.get("MessageSid") || ""
  const from        = formData.get("From") || ""        // "whatsapp:+212600000000"
  const to          = formData.get("To") || ""          // "whatsapp:+16204072940"
  const body        = formData.get("Body") || ""
  const numMedia    = parseInt(formData.get("NumMedia") || "0", 10)
  const profileName = formData.get("ProfileName") || ""
  const mediaUrl    = numMedia > 0 ? formData.get("MediaUrl0") || null : null
  const mediaType   = numMedia > 0 ? formData.get("MediaContentType0") || "" : ""

  // نزيل prefix "whatsapp:"
  const fromPhone = from.replace("whatsapp:", "")
  const toPhone   = to.replace("whatsapp:", "")

  let type = "text"
  if (numMedia > 0) {
    if (mediaType.startsWith("audio/")) type = "audio"
    else if (mediaType.startsWith("image/")) type = "image"
    else if (mediaType.startsWith("video/")) type = "video"
    else type = "document"
  }

  return {
    messageId:    messageSid,
    from:         fromPhone,
    toPhone,
    customerName: profileName || fromPhone,
    text:         body.trim(),
    type,
    mediaUrl,
    mediaType,
    timestamp:    String(Math.floor(Date.now() / 1000)),
  }
}

// ─── Twilio: التحقق من التوقيع ─────────────────────────────────
export function verifyTwilioSignature({ authToken, url, params, signature }) {
  if (!authToken || !signature) return false
  try {
    const crypto = require("crypto")
    // Twilio signature: HMAC-SHA1 على URL + params مرتبة أبجدياً
    const sortedKeys = Object.keys(params).sort()
    const str = url + sortedKeys.map(k => k + params[k]).join("")
    const expected = crypto.createHmac("sha1", authToken).update(str).digest("base64")
    return expected === signature
  } catch {
    return false
  }
}
const OPENAI_AUDIO_API_URL = "https://api.openai.com/v1/audio"
const OPENAI_AUDIO_UPLOAD_LIMIT_BYTES = 25 * 1024 * 1024
const OPENAI_CHAT_API_URL = "https://api.openai.com/v1/chat/completions"
const OPENAI_IMAGE_ANALYSIS_LIMIT_BYTES = 8 * 1024 * 1024

function toBuffer(value) {
  if (!value) return Buffer.alloc(0)
  if (Buffer.isBuffer(value)) return value
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  return Buffer.from(value)
}

function audioExtensionFromMime(mimeType = "") {
  const normalized = String(mimeType).toLowerCase()
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3"
  if (normalized.includes("mp4")) return "mp4"
  if (normalized.includes("mpga")) return "mpga"
  if (normalized.includes("m4a")) return "m4a"
  if (normalized.includes("wav")) return "wav"
  if (normalized.includes("webm")) return "webm"
  if (normalized.includes("ogg") || normalized.includes("opus")) return "ogg"
  return "bin"
}

// Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
// WhatsApp sends ogg/opus — works directly, no conversion needed.
function isOpenAITranscriptionSupportedMime(mimeType = "") {
  const ext = audioExtensionFromMime(mimeType)
  return ["mp3", "mp4", "mpga", "m4a", "wav", "webm", "ogg"].includes(ext)
}

// 🔧 FIX: Added imageId parameter for media upload support
// 📍 LOCATION: sendWhatsAppMessage signature
export async function sendWhatsAppMessage({
  phoneId,
  token,
  to,
  message,
  type = "text",
  document = null,
  audioId = null,
  imageId = null,
  videoId = null,
  videoUrl = null,
  documentUrl = null,
}) {
  // التحقق من المدخلات
  if (!phoneId || !token || !to) {
    console.error("❌ Missing required parameters:", { phoneId: !!phoneId, token: !!token, to: !!to })
    return { success: false, error: "Missing required parameters" }
  }

  // ✅ Input validation improvements
  if (type === "document" && document && !document.id && !document.link) {
    console.error("❌ Document type requires document.id or document.link")
    return { success: false, error: "Document ID or link is required for document type" }
  }
  if (type === "image" && message && !message.match(/^https?:\/\//)) {
    console.error("❌ Image type requires a valid URL")
    return { success: false, error: "Valid image URL is required for image type" }
  }

  // ✅ Sanitize WhatsApp formatting before sending
  if (message && type === "text") {
    message = message
      .replace(/\*\*\*(.+?)\*\*\*/g, '*$1*')   // ***text*** → *text*
      .replace(/\*\*(.+?)\*\*/g, '*$1*')         // **text** → *text*
      .replace(/^(\s*)\*\s+/gm, '$1• ')          // * bullet → • bullet
      .replace(/\*\s*\*([^*]+)\*/g, '• *$1*')    // * *bold* → • *bold*
  }

  try {
    let body
    if (type === "document" && document) {
      // إرسال مستند (by media ID or URL)
      const docObj = { filename: document.filename || "file" }
      if (document.id) docObj.id = document.id
      else if (document.link) docObj.link = document.link
      if (message) docObj.caption = message
      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "document",
        document: docObj,
      }
    } else if (type === "image") {
      // Support both URL and media ID for images, with optional caption
      const imageObj = imageId
        ? { id: imageId }
        : { link: message }
      if (message && imageId) imageObj.caption = message
      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "image",
        image: imageObj,
      }
    } else if (type === "video" && (videoId || videoUrl)) {
      // إرسال فيديو (by media ID or URL)
      const videoObj = videoId ? { id: videoId } : { link: videoUrl }
      if (message) videoObj.caption = message
      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "video",
        video: videoObj,
      }
    } else if (type === "audio" && audioId) {
      // إرسال رسالة صوتية
      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "audio",
        audio: { id: audioId }
      }
      console.log(`🔍 DEBUG sendWhatsAppMessage audio body:`, JSON.stringify(body, null, 2))
    } else {
      // إرسال نص
      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: message }
      }
    }

    // ✅ Sanitized log: mask phone number
    const maskedTo = to.length > 4 ? "******" + to.slice(-4) : "****"
    console.log(`📤 Sending ${type} message to ${maskedTo}...`)

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )

    // ✅ Safe response parsing
    const raw = await response.text()
    let data = null
    try {
      data = JSON.parse(raw)
    } catch (parseErr) {
      data = { raw: raw.substring(0, 200) }
    }

    if (!response.ok) {
      // ✅ Robust token-expired detection (case-insensitive)
      const msg = (data?.error?.message || "").toLowerCase()
      const isTokenExpired = 
        response.status === 401 || 
        data?.error?.code === 190 ||
        msg.includes("token") ||
        msg.includes("expired") ||
        msg.includes("invalid")

      if (isTokenExpired) {
        console.error("❌ ⚠️ WhatsApp TOKEN EXPIRED - يجب تحديث Token من جديد!")
        console.error("Error details:", {
          status: response.status,
          code: data?.error?.code,
          msg: "Token validation failed",
        })
      } else {
        console.error("❌ WhatsApp API error:", {
          status: response.status,
          error: "API request failed",
        })
      }
      return { success: false, error: data, isTokenExpired }
    }

    const msgId = data?.messages?.[0]?.id || "unknown"
    console.log(`✅ Message sent successfully (ID: ${msgId})`)
    return { success: true, data }
  } catch (error) {
    console.error("❌ sendWhatsAppMessage error:", error?.message || error)
    return { success: false, error: error?.message || "Unknown error" }
  }
}

// ✅ إرسال OTP عبر Template Message (يعمل مع أي رقم، حتى الجديدة)
export async function sendWhatsAppOTPTemplate({ phoneId, token, to, code }) {
  if (!phoneId || !token || !to || !code) {
    console.error("❌ sendWhatsAppOTPTemplate: Missing parameters")
    return { success: false, error: "Missing parameters" }
  }

  const templateName = process.env.SYSTEM_WA_OTP_TEMPLATE
  const templateLang = process.env.SYSTEM_WA_OTP_TEMPLATE_LANG || "fr"

  // ── إذا لم يُعيَّن Template → fallback لنص عادي (يعمل فقط مع أرقام نشطة) ──
  if (!templateName) {
    console.warn("⚠️ SYSTEM_WA_OTP_TEMPLATE not set — falling back to text message")
    return sendWhatsAppMessage({
      phoneId,
      token,
      to,
      message:
        `🔐 Code de vérification *wakil.ma*:\n\n` +
        `*${code}*\n\n` +
        `⏱ Valide 15 min\n` +
        `Ne partagez pas ce code / لا تشارك هذا الرمز`,
    })
  }

  try {
    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLang },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: code }],
          },
        ],
      },
    }

    // ✅ Sanitized log: mask phone
    const maskedTo = to.length > 4 ? "******" + to.slice(-4) : "****"
    console.log(`📤 Sending OTP template "${templateName}" to ${maskedTo}...`)

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )

    // ✅ Safe response parsing
    const raw = await response.text()
    let data = null
    try {
      data = JSON.parse(raw)
    } catch (parseErr) {
      data = { raw: raw.substring(0, 200) }
    }

    if (!response.ok) {
      console.error("❌ OTP Template error:", { status: response.status, error: "Template send failed" })
      return { success: false, error: data }
    }

    const msgId = data?.messages?.[0]?.id || "unknown"
    console.log(`✅ OTP Template sent (ID: ${msgId})`)
    return { success: true, data }
  } catch (error) {
    console.error("❌ sendWhatsAppOTPTemplate error:", error?.message || error)
    return { success: false, error: error?.message || "Unknown error" }
  }
}

export async function sendWhatsAppTemplateMessage({
  phoneId,
  token,
  to,
  templateName,
  language = "fr",
  bodyParameters = [],
}) {
  if (!phoneId || !token || !to || !templateName) {
    console.error("❌ sendWhatsAppTemplateMessage: Missing parameters")
    return { success: false, error: "Missing parameters" }
  }

  try {
    const components = []
    if (Array.isArray(bodyParameters) && bodyParameters.length > 0) {
      components.push({
        type: "body",
        parameters: bodyParameters.map((value) => ({
          type: "text",
          text: String(value ?? ""),
        })),
      })
    }

    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language || "fr" },
        ...(components.length ? { components } : {}),
      },
    }

    const maskedTo = to.length > 4 ? "******" + to.slice(-4) : "****"
    console.log(`📤 Sending template "${templateName}" to ${maskedTo}...`)

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )

    const raw = await response.text()
    let data = null
    try {
      data = JSON.parse(raw)
    } catch {
      data = { raw: raw.substring(0, 200) }
    }

    if (!response.ok) {
      const msg = (data?.error?.message || "").toLowerCase()
      const isTokenExpired =
        response.status === 401 ||
        data?.error?.code === 190 ||
        msg.includes("token") ||
        msg.includes("expired") ||
        msg.includes("invalid")

      console.error("❌ Template send error:", {
        status: response.status,
        code: data?.error?.code,
      })

      return { success: false, error: data, isTokenExpired }
    }

    return { success: true, data }
  } catch (error) {
    console.error("❌ sendWhatsAppTemplateMessage error:", error?.message || error)
    return { success: false, error: error?.message || "Unknown error" }
  }
}

// إرسال رسالة مع أزرار (Quick Reply)
export async function sendWhatsAppButtons({
  phoneId,
  token,
  to,
  message,
  buttons
}) {
  if (!phoneId || !token || !to || !message || !Array.isArray(buttons) || buttons.length === 0) {
    console.error("❌ sendWhatsAppButtons: Missing required parameters")
    return { success: false, error: "Missing required parameters" }
  }

  // ✅ Buttons validation: max 3, title max 20 chars, trim empty
  const cleanButtons = buttons
    .map(btn => (typeof btn === "string" ? btn.trim() : ""))
    .filter(btn => btn.length > 0)
    .slice(0, 3)
    .map(btn => btn.substring(0, 20))

  if (cleanButtons.length === 0) {
    console.error("❌ sendWhatsAppButtons: No valid buttons after filtering")
    return { success: false, error: "No valid buttons (max 3, non-empty, max 20 chars each)" }
  }

  try {
    // ✅ Sanitized log
    const maskedTo = to.length > 4 ? "******" + to.slice(-4) : "****"
    console.log(`📤 Sending buttons message to ${maskedTo} (${cleanButtons.length} buttons)`)

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: message },
            action: {
              buttons: cleanButtons.map((btn, i) => ({
                type: "reply",
                reply: {
                  id: `btn_${i}`,
                  title: btn
                }
              }))
            }
          }
        }),
      }
    )

    // ✅ Safe response parsing
    const raw = await response.text()
    let data = null
    try {
      data = JSON.parse(raw)
    } catch (parseErr) {
      data = { raw: raw.substring(0, 200) }
    }

    return response.ok
      ? { success: true, data }
      : { success: false, error: data }
  } catch (error) {
    console.error("sendWhatsAppButtons error:", error?.message || error)
    return { success: false, error: error?.message || "Unknown error" }
  }
}

// ✅ تحليل كل الرسائل من كل الزبائن
export function parseAllIncomingMessages(body) {
  try {
    const results = []
    const entries = body?.entry || []

    for (const entry of entries) {
      const changes = entry?.changes || []

      for (const change of changes) {
        const value = change?.value

        if (!value?.messages?.length) continue

        const phoneId = value.metadata?.phone_number_id

        // لوف على كل الرسائل في هذا الـ change
        for (const message of value.messages) {
          // إيجاد contact المرتبط بهذه الرسالة
          const contact = value.contacts?.find(
            c => c.wa_id === message.from
          ) || value.contacts?.[0]

          // نص الرسالة حسب النوع
          let text = ""
          let mediaId = null
          if (message.type === "text") {
            text = message.text?.body || ""
          } else if (message.type === "interactive") {
            text =
              message.interactive?.button_reply?.title ||
              message.interactive?.list_reply?.title ||
              ""
          } else if (message.type === "button") {
            text = message.button?.text || ""
          } else if (message.type === "image") {
            const caption = message.image?.caption || ""
            text = caption ? `[صورة] ${caption}` : "[صورة]"
            mediaId = message.image?.id || null
          } else if (message.type === "document") {
            const docName = message.document?.filename || "document"
            const caption = message.document?.caption || ""
            text = caption ? `[مستند: ${docName}] ${caption}` : `[مستند: ${docName}]`
            mediaId = message.document?.id || null
          } else if (message.type === "video") {
            const caption = message.video?.caption || ""
            text = caption ? `[فيديو] ${caption}` : "[فيديو]"
            mediaId = message.video?.id || null
          } else if (message.type === "audio") {
            text = "[رسالة صوتية]"
            mediaId = message.audio?.id || null
          }

          if (!text.trim() && !["image", "document", "video"].includes(message.type)) {
            continue // تجاهل الرسائل الفارغة
          }

          results.push({
            messageId: message.id,
            from: message.from,
            phoneId,
            customerName: contact?.profile?.name || "زبون",
            text: text.trim(),
            timestamp: message.timestamp,
            type: message.type,
            audioId: mediaId,
            mediaId,
          })
        }
      }
    }

    return results
  } catch (error) {
    console.error("parseAllIncomingMessages error:", error)
    return []
  }
}

/** تحميل بايتات ميديا من واتساب (بدون تكلفة إضافية — نفس API واتساب) */
export async function downloadWhatsAppMedia({ token, mediaId }) {
  if (!token || !mediaId) return null
  try {
    const mediaRes = await fetch(`${WHATSAPP_API_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!mediaRes.ok) {
      console.error("❌ downloadWhatsAppMedia meta:", mediaRes.status)
      return null
    }
    const mediaData = await mediaRes.json()
    const mediaUrl = mediaData.url
    const mimeType = mediaData.mime_type || "application/octet-stream"
    if (!mediaUrl) {
      console.error("❌ No media URL in WhatsApp response")
      return null
    }
    const binRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!binRes.ok) {
      console.error("❌ downloadWhatsAppMedia binary:", binRes.status)
      return null
    }
    const buffer = await binRes.arrayBuffer()
    return { buffer, mimeType }
  } catch (e) {
    console.error("❌ downloadWhatsAppMedia:", e?.message || e)
    return null
  }
}

export async function analyzeWhatsAppImage({ token, imageId, caption = "" }) {
  if (!token || !imageId) return null

  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    console.warn("⚠️ OPENAI_API_KEY not set - image analysis skipped")
    return null
  }

  try {
    const downloaded = await downloadWhatsAppMedia({ token, mediaId: imageId })
    if (!downloaded) {
      console.error("❌ [Vision] Failed to download WhatsApp image")
      return null
    }

    const imageBuffer = toBuffer(downloaded.buffer)
    const mimeType = downloaded.mimeType || "image/jpeg"
    if (!imageBuffer.length || !mimeType.startsWith("image/")) {
      console.warn(`⚠️ [Vision] Unsupported media for image analysis: ${mimeType}`)
      return null
    }

    if (imageBuffer.length > OPENAI_IMAGE_ANALYSIS_LIMIT_BYTES) {
      console.warn(`⚠️ [Vision] Image too large (${imageBuffer.length} bytes) - skipped`)
      return null
    }

    const dataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`
    const response = await fetch(OPENAI_CHAT_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You analyze customer product photos for a WhatsApp sales agent. Return a concise factual description in French/Darija-friendly wording. Include visible product type, brand/text, color, material, shape, size hints, packaging, and any uncertainty. Do not invent exact matches.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Customer caption: ${caption || "(none)"}\nDescribe the product in this image for catalog matching.`,
              },
              {
                type: "image_url",
                image_url: { url: dataUrl, detail: "low" },
              },
            ],
          },
        ],
        max_tokens: 220,
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error(`❌ [Vision] OpenAI API Error (${response.status}): ${errorText.slice(0, 400)}`)
      return null
    }

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content?.trim()
    return text || null
  } catch (error) {
    console.error("❌ [Vision] Image analysis failed:", error?.message || error)
    return null
  }
}

// 🎤 تحويل رسالة صوتية لنص عبر Google Cloud Speech-to-Text (مجاني — 60 دقيقة/شهر)
export async function transcribeWhatsAppAudioGoogleLegacy({ token, audioId }) {
  if (!token || !audioId) {
    console.error("❌ transcribeWhatsAppAudio: Missing token or audioId")
    return null
  }

  // استخدم Google API بدل OpenAI (مجاني!)
  const googleApiKey = process.env.GOOGLE_CLOUD_SPEECH_API_KEY
  if (!googleApiKey) {
    console.warn("⚠️ GOOGLE_CLOUD_SPEECH_API_KEY not set — using fallback")
    return null
  }

  try {
    console.log(`🎤 [Whisper] Starting transcription for audioId: ${audioId}`)

    const downloaded = await downloadWhatsAppMedia({ token, mediaId: audioId })
    if (!downloaded) {
      console.error("❌ [Whisper] Failed to download media from WhatsApp")
      return null
    }

    const { buffer: audioBuffer, mimeType } = downloaded
    console.log(`📦 [Whisper] Downloaded: ${audioBuffer.length} bytes, MIME: ${mimeType}`)

    // تحويل الصوت لـ base64 (معالجة جميع أنواع البيانات)
    let audioContent
    if (typeof audioBuffer === 'string') {
      audioContent = audioBuffer
    } else if (Buffer.isBuffer(audioBuffer)) {
      audioContent = audioBuffer.toString('base64')
    } else if (audioBuffer instanceof ArrayBuffer) {
      audioContent = Buffer.from(audioBuffer).toString('base64')
    } else {
      // Uint8Array أو أي نوع آخر
      audioContent = Buffer.from(new Uint8Array(audioBuffer)).toString('base64')
    }

    console.log(`📝 [Whisper] Base64 encoded: ${audioContent.substring(0, 50)}...`)

    console.log(`🔄 [Whisper] Sending to Google Cloud Speech API...`)

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            encoding: "OGG_OPUS", // WhatsApp format
            sampleRateHertz: 48000,
            languageCode: "ar-SA", // عربي
            alternativeLanguageCodes: ["ar", "en-US"],
          },
          audio: { content: audioContent },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const errorMsg = err?.error?.message || JSON.stringify(err)
      console.error(`❌ [Whisper] API Error (${response.status}): ${errorMsg}`)

      if (response.status === 403) {
        console.error("🚨 Google API key invalid or quota exceeded!")
      }

      return null
    }

    const data = await response.json()
    const transcription = data.results
      ?.map((result) => result.alternatives?.[0]?.transcript)
      ?.filter(Boolean)
      ?.join(" ")
      ?.trim()

    if (transcription) {
      console.log(`✅ [Whisper] Success! Transcribed ${transcription.length} chars`)
      console.log(`📝 [Whisper] Text: "${transcription.substring(0, 50)}..."`)
    } else {
      console.warn(`⚠️ [Whisper] Empty transcription returned`)
    }

    return transcription || null
  } catch (error) {
    console.error(`❌ [Whisper] Fatal error: ${error.message}`)
    console.error(`Stack: ${error.stack}`)
    return null
  }
}

export async function transcribeWhatsAppAudio({ token, audioId }) {
  if (!token || !audioId) {
    console.error("❌ transcribeWhatsAppAudio: Missing token or audioId")
    return null
  }

  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    console.warn("⚠️ OPENAI_API_KEY not set - voice transcription skipped")
    return null
  }

  try {
    console.log(`🎤 [OpenAI STT] Starting transcription for audioId: ${audioId}`)

    const downloaded = await downloadWhatsAppMedia({ token, mediaId: audioId })
    if (!downloaded) {
      console.error("❌ [OpenAI STT] Failed to download media from WhatsApp")
      return null
    }

    let audioBuffer = toBuffer(downloaded.buffer)
    let mimeType = downloaded.mimeType || "application/octet-stream"
    let extension = audioExtensionFromMime(mimeType)

    console.log(`📦 [OpenAI STT] Downloaded: ${audioBuffer.length} bytes, MIME: ${mimeType}`)

    if (audioBuffer.length > OPENAI_AUDIO_UPLOAD_LIMIT_BYTES) {
      console.error("❌ [OpenAI STT] Audio is larger than 25MB")
      return null
    }

    if (!isOpenAITranscriptionSupportedMime(mimeType)) {
      console.warn(`⚠️ [OpenAI STT] Unsupported MIME type: ${mimeType}. Skipping transcription.`)
      return null
    }

    const formData = new FormData()
    const uint8Array = new Uint8Array(audioBuffer)
    const blob = new Blob([uint8Array], { type: mimeType })
    formData.append("file", blob, `whatsapp-voice.${extension}`)
    formData.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe")
    formData.append(
      "prompt",
      "The audio may contain Moroccan Arabic Darija, Arabic, French, English, or a mix. Preserve product names, city names, quantities, and phone numbers."
    )

    const response = await fetch(`${OPENAI_AUDIO_API_URL}/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiApiKey}` },
      body: formData,
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const errorMessage = data?.error?.message || JSON.stringify(data)
      console.error(`❌ [OpenAI STT] API Error (${response.status}): ${errorMessage}`)
      return null
    }

    const transcription = String(data?.text || "").trim()
    if (transcription) {
      console.log(`✅ [OpenAI STT] Success! Transcribed ${transcription.length} chars`)
      console.log(`📝 [OpenAI STT] Text: "${transcription.substring(0, 50)}..."`)
    } else {
      console.warn("⚠️ [OpenAI STT] Empty transcription returned")
    }

    return transcription || null
  } catch (error) {
    console.error(`❌ [OpenAI STT] Fatal error: ${error.message}`)
    return null
  }
}

export async function synthesizeOpenAISpeech({ text }) {
  const input = String(text || "").trim()
  if (!input) return null

  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    console.warn("⚠️ OPENAI_API_KEY not set - voice reply skipped")
    return null
  }

  try {
    const response = await fetch(`${OPENAI_AUDIO_API_URL}/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: process.env.OPENAI_TTS_VOICE || "alloy",
        input: input.slice(0, 4096),
        response_format: "mp3",
        instructions: "Speak naturally and clearly in the same language as the input. Keep a friendly WhatsApp sales tone.",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error(`❌ [OpenAI TTS] API Error (${response.status}): ${errorText.slice(0, 500)}`)
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (!buffer.length) {
      console.warn("⚠️ [OpenAI TTS] Empty audio returned")
      return null
    }

    return {
      buffer,
      mimeType: "audio/mpeg",
      filename: `ai-reply-${Date.now()}.mp3`,
    }
  } catch (error) {
    console.error(`❌ [OpenAI TTS] Fatal error: ${error.message}`)
    return null
  }
}

export async function uploadWhatsAppMedia({
  phoneId,
  token,
  fileBuffer,
  filename,
  mimeType = "application/pdf"
}) {
  try {
    if (!phoneId || !token || !fileBuffer) {
      console.error("❌ uploadWhatsAppMedia: Missing required parameters")
      return { success: false, error: "Missing parameters" }
    }

    const formData = new FormData()
    formData.append("messaging_product", "whatsapp")
    formData.append("type", mimeType)
    
    //  Convert Buffer to Uint8Array for proper Blob creation in Node.js
    const uint8Array = new Uint8Array(fileBuffer)
    const blob = new Blob([uint8Array], { type: mimeType })
    formData.append("file", blob, filename)

    console.log(`📤 Uploading ${mimeType} media (${fileBuffer.length} bytes) to WhatsApp...`)

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneId}/media`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      }
    )

    const raw = await response.text()
    let data = null
    try {
      data = JSON.parse(raw)
    } catch (parseErr) {
      data = { raw: raw.substring(0, 200) }
    }

    if (!response.ok) {
      const errMsg = data?.error?.message || data?.error?.code || "Upload failed"
      console.error("❌ WhatsApp Media Upload failed:", {
        status: response.status,
        error: errMsg,
        errorCode: data?.error?.code,
        errorSubcode: data?.error?.error_subcode,
        errorType: data?.error?.type,
        fbTraceId: data?.error?.fbtrace_id,
        details: data?.error || data,
        rawResponse: raw.substring(0, 500)
      })

      // Check for token expiration
      if (response.status === 401 || data?.error?.code === 190) {
        console.error("❌ ⚠️ WhatsApp TOKEN EXPIRED or INVALID!")
      }

      return { success: false, error: data }
    }

    const mediaId = data?.id
    if (!mediaId) {
      console.error("❌ Media uploaded but no ID returned:", data)
      return { success: false, error: "No media ID in response" }
    }

    console.log(`✅ Media uploaded successfully (ID: ${mediaId})`)
    return { success: true, mediaId }
  } catch (error) {
    console.error("❌ uploadWhatsAppMedia error:", error?.message || error)
    return { success: false, error: error?.message || "Unknown error" }
  }
}
