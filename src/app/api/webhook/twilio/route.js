import { prisma } from "@/lib/prisma"
import {
  parseTwilioIncomingMessage,
  verifyTwilioSignature,
  sendTwilioWhatsAppMessage,
  downloadTwilioMedia,
} from "@/lib/whatsapp"
import { processIncomingMessage } from "@/lib/aiAgent"
import {
  isMarketingOptOutMessage,
  markCampaignReplyFromInbound,
  unsubscribeCustomerFromCampaigns,
} from "@/lib/campaigns/engagement"
import { sanitizeInput } from "@/lib/helpers"
import { normalizePhone } from "@/lib/phone"
import { decryptAgentSecrets } from "@/lib/secretCrypto"

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function clampDelay(v) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(20, Math.max(0, Math.round(n))) : 0
}

function randomBetween(min, max) {
  const a = clampDelay(min), b = Math.max(a, clampDelay(max))
  return (a + Math.floor(Math.random() * (b - a + 1))) * 1000
}

function resolveDelayMs(agent) {
  const mode = agent?.replyDelayMode || "instant"
  if (mode === "short")   return randomBetween(3, 7)
  if (mode === "natural") return randomBetween(8, 18)
  if (mode === "custom")  return randomBetween(agent.replyDelayMinSeconds, agent.replyDelayMaxSeconds)
  return 0
}

function isInsideWorkHours(agent, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Casablanca", hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(now)
  const h = Number(parts.find(p => p.type === "hour")?.value || 0)
  const m = Number(parts.find(p => p.type === "minute")?.value || 0)
  const cur = h * 60 + m
  const [sh, sm] = String(agent.workStart || "00:00").split(":").map(Number)
  const [eh, em] = String(agent.workEnd   || "23:59").split(":").map(Number)
  const start = sh * 60 + sm, end = eh * 60 + em
  return start <= end ? cur >= start && cur <= end : cur >= start || cur <= end
}

function buildOptOutReply(agent) {
  return String(agent?.language || "").includes("fr")
    ? "C'est noté. Les messages promotionnels sont arrêtés pour ce numéro."
    : "صافي، حبسنا الرسائل الترويجية لهاد الرقم."
}

async function sendReply(agent, to, message) {
  return sendTwilioWhatsAppMessage({
    accountSid: agent.twilioAccountSid,
    authToken:  agent.twilioAuthToken,
    from:       agent.twilioPhoneNumber,
    to,
    message,
  })
}

export async function GET() {
  return new Response("Twilio webhook active", { status: 200 })
}

export async function POST(request) {
  const rawBody = await request.text()
  const formData = new URLSearchParams(rawBody)
  const formObj  = Object.fromEntries(formData.entries())

  // التحقق من التوقيع في production فقط
  if (process.env.NODE_ENV === "production" && process.env.TWILIO_AUTH_TOKEN) {
    const signature = request.headers.get("x-twilio-signature") || ""
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/twilio`
    if (!verifyTwilioSignature({
      authToken: process.env.TWILIO_AUTH_TOKEN,
      url,
      params: formObj,
      signature,
    })) {
      console.error("Invalid Twilio webhook signature")
      return new Response("Invalid signature", { status: 403 })
    }
  }

  const incoming = parseTwilioIncomingMessage(new URLSearchParams(rawBody))
  if (!incoming.from) {
    return new Response("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    })
  }

  // معالجة غير متزامنة — نرجع 200 فوراً لـ Twilio
  processInbound(incoming).catch(err =>
    console.error("[Twilio Webhook] unhandled error:", err?.message)
  )

  return new Response("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  })
}

async function processInbound(incoming) {
  try {
    // إيجاد الـ agent عبر رقم Twilio
    const agent = decryptAgentSecrets(
      await prisma.agent.findFirst({
        where: { twilioPhoneNumber: incoming.toPhone, waProvider: "twilio" },
        include: { objectionReplies: { orderBy: { order: "asc" } } },
      })
    )

    if (!agent) {
      console.log(`[Twilio] No agent for toPhone ${incoming.toPhone}`)
      return
    }

    // dedup بـ MessageSid
    if (incoming.messageId) {
      const exists = await prisma.message.findFirst({
        where: { whatsappMessageId: incoming.messageId },
        select: { id: true },
      })
      if (exists) return
    }

    const sanitizedText = sanitizeInput(
      incoming.type === "audio" ? "[رسالة صوتية]" : incoming.text
    )
    if (!sanitizedText) return

    await markCampaignReplyFromInbound({ userId: agent.userId, phone: incoming.from })

    // Opt-out
    if (isMarketingOptOutMessage(sanitizedText)) {
      await saveInboundOnly(agent, incoming, sanitizedText)
      await unsubscribeCustomerFromCampaigns({ userId: agent.userId, phone: incoming.from })
      await sendReply(agent, incoming.from, buildOptOutReply(agent))
      return
    }

    // Agent غير نشط
    if (!agent.isActive) {
      await saveInboundOnly(agent, incoming, sanitizedText)
      return
    }

    // خارج ساعات العمل
    if (agent.workHoursEnabled && !isInsideWorkHours(agent)) {
      await saveInboundOnly(agent, incoming, sanitizedText)
      if (agent.offlineMessage) {
        await sendReply(agent, incoming.from, agent.offlineMessage)
      }
      return
    }

    let aiInputText = sanitizedText

    // معالجة الصوت
    if (incoming.type === "audio" && incoming.mediaUrl) {
      try {
        const downloaded = await downloadTwilioMedia({
          accountSid: agent.twilioAccountSid,
          authToken:  agent.twilioAuthToken,
          mediaUrl:   incoming.mediaUrl,
        })
        if (downloaded) {
          const transcription = await transcribeFromBuffer(downloaded.buffer, downloaded.mimeType)
          if (transcription) {
            aiInputText = sanitizeInput(transcription)
            console.log(`[Twilio] Voice transcribed: "${aiInputText.slice(0, 80)}"`)
          } else {
            await saveInboundOnly(agent, incoming, sanitizedText)
            return
          }
        }
      } catch (err) {
        console.error("[Twilio] Voice processing failed:", err?.message)
        return
      }
    }

    // معالجة الصور
    if (incoming.type === "image" && incoming.mediaUrl) {
      const caption = sanitizedText.replace(/^\[[^\]]+\]\s*/u, "").trim()
      const imageDescription = await analyzeImageFromUrl({
        imageUrl:   incoming.mediaUrl,
        accountSid: agent.twilioAccountSid,
        authToken:  agent.twilioAuthToken,
        caption,
      })

      if (imageDescription) {
        aiInputText = [
          `[صورة من العميل] ${caption || "واش عندكم هاد المنتج؟"}`,
          "",
          `وصف الصورة لتحليل المنتج: ${imageDescription}`,
          "",
          "تعليمات للوكيل: قارن وصف الصورة مع المنتجات المتوفرة.",
        ].join("\n")
      }
    }

    // AI
    const result = await processIncomingMessage({
      userId:            agent.userId,
      customerPhone:     incoming.from,
      customerName:      incoming.customerName,
      messageText:       aiInputText,
      whatsappMessageId: incoming.messageId,
      whatsappTimestamp: incoming.timestamp,
    })

    if (!result || result.skipped || !result.reply) return

    const safeReply = result.reply
      .replace(/\[STAGE:\w+\]/g, "")
      .replace(/\[ORDER_CONFIRMED\]/g, "")
      .replace(/\[SEND[_ ]IMAGES?\]/gi, "")
      .trim()

    const delayMs = resolveDelayMs(agent)
    if (delayMs > 0) await sleep(delayMs)

    const sent = await sendReply(agent, incoming.from, safeReply)
    if (!sent.success) {
      console.error(`[Twilio] Reply send failed:`, sent.error)
    }

    // إرسال الصور
    const validImages = [...new Set(
      (result.imageUrls || []).filter(u => typeof u === "string" && /^https?:\/\//i.test(u.trim()))
    )]

    for (const imageUrl of validImages) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const r = await sendTwilioWhatsAppMessage({
          accountSid: agent.twilioAccountSid,
          authToken:  agent.twilioAuthToken,
          from:       agent.twilioPhoneNumber,
          to:         incoming.from,
          message:    "",
          mediaUrl:   imageUrl,
        })
        if (r.success) break
        if (attempt < 3) await sleep(2000 * attempt)
      }
      await sleep(2500)
    }

  } catch (error) {
    console.error(`[Twilio] processInbound error:`, error?.message)
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateConvId(agent, incoming) {
  const normalizedPhone = normalizePhone(incoming.from)
  if (!normalizedPhone) return null

  const customer = await prisma.customer.upsert({
    where: { userId_phone: { userId: agent.userId, phone: normalizedPhone } },
    update: { lastSeen: new Date() },
    create: {
      userId: agent.userId,
      phone:  normalizedPhone,
      name:   incoming.customerName || normalizedPhone,
      tag:    "NEW",
    },
  })

  let conv = await prisma.conversation.findFirst({
    where: { userId: agent.userId, customerId: customer.id, stage: { notIn: ["ARCHIVED"] } },
    orderBy: { updatedAt: "desc" },
  })

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { userId: agent.userId, customerId: customer.id, stage: "GREETING", score: 10, context: {} },
    })
  }

  return conv.id
}

async function saveInboundOnly(agent, incoming, text) {
  const convId = await getOrCreateConvId(agent, incoming)
  if (!convId) return null

  await prisma.message.create({
    data: {
      conversationId: convId,
      role:           "USER",
      content:        text,
      ...(incoming.messageId ? { whatsappMessageId: incoming.messageId } : {}),
    },
  }).catch(err => { if (err?.code !== "P2002") throw err })

  await prisma.conversation.update({
    where: { id: convId },
    data:  { isRead: false, updatedAt: new Date() },
  })

  return convId
}

async function transcribeFromBuffer(buffer, mimeType) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_KEY || !buffer) return null

  try {
    const ext = mimeType?.includes("ogg")  ? "ogg"
      : mimeType?.includes("mp4")  ? "mp4"
      : mimeType?.includes("webm") ? "webm"
      : mimeType?.includes("wav")  ? "wav"
      : mimeType?.includes("mpeg") ? "mp3"
      : "ogg"

    const buf  = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
    const form = new FormData()
    form.append("file", new Blob([new Uint8Array(buf)], { type: mimeType }), `voice.${ext}`)
    form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe")
    form.append("prompt", "Moroccan Arabic Darija, Arabic, French, or English mix.")

    const res  = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method:  "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body:    form,
    })
    const data = await res.json().catch(() => ({}))
    return String(data?.text || "").trim() || null
  } catch (e) {
    console.error("[Twilio] transcribeFromBuffer error:", e?.message)
    return null
  }
}

async function analyzeImageFromUrl({ imageUrl, accountSid, authToken, caption }) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_KEY || !imageUrl) return null

  try {
    const imgRes = await fetch(imageUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
    })
    if (!imgRes.ok) return null

    const mimeType = imgRes.headers.get("content-type") || "image/jpeg"
    const buf = Buffer.from(await imgRes.arrayBuffer())
    if (!buf.length || !mimeType.startsWith("image/")) return null

    const dataUrl = `data:${mimeType};base64,${buf.toString("base64")}`
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:  "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "Describe the product in this image concisely for catalog matching." },
          { role: "user", content: [
            { type: "text", text: `Caption: ${caption || "(none)"}` },
            { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
          ]},
        ],
        max_tokens: 220,
        temperature: 0.2,
      }),
    })
    const data = await res.json().catch(() => ({}))
    return data?.choices?.[0]?.message?.content?.trim() || null
  } catch (e) {
    console.error("[Twilio] image analysis error:", e?.message)
    return null
  }
}
