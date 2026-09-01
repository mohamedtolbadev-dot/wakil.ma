import { prisma } from "@/lib/prisma"
import {
  analyzeWhatsAppImage,
  parseAllIncomingMessages,
  sendWhatsAppMessage,
  transcribeWhatsAppAudio,
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
import crypto from "crypto"

const PROFILE_NAME_SENTENCE_RE = /\b(?:rah|ra|rani|hani|sift|syft|siftlik|syftlik|siftlek|smyti|smiti|smiyti|smitiya|name|nom|sent|send|already|deja|déjà|عطيتك|رسلت|رسلتلك|صيفطت|صيفطتلك|سميتي|الاسم|الإسم|قبل|من\s*قبل|راه|ها|هادي|هدا)\b/i
const REPLY_DELAY_MODES = new Set(["instant", "short", "natural", "custom"])

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function clampDelaySeconds(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(20, Math.max(0, Math.round(number)))
}

function randomSecondsBetween(min, max) {
  const safeMin = clampDelaySeconds(min)
  const safeMax = Math.max(safeMin, clampDelaySeconds(max))
  return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1))
}

function resolveReplyDelayMs(agent) {
  const mode = REPLY_DELAY_MODES.has(agent?.replyDelayMode) ? agent.replyDelayMode : "instant"

  if (mode === "short") {
    return randomSecondsBetween(3, 7) * 1000
  }

  if (mode === "natural") {
    return randomSecondsBetween(8, 18) * 1000
  }

  if (mode === "custom") {
    return randomSecondsBetween(agent.replyDelayMinSeconds, agent.replyDelayMaxSeconds) * 1000
  }

  return 0
}

function isUsableProfileName(name) {
  const text = sanitizeInput(name || "").trim()
  if (!text) return false
  if (text.length < 3 || text.length > 60) return false
  if (!/[\p{L}]/u.test(text)) return false
  if (/^\d+$/.test(text.replace(/\s+/g, ""))) return false
  if (/[؟?!]/.test(text)) return false
  if (PROFILE_NAME_SENTENCE_RE.test(text.toLowerCase())) return false
  return true
}

function maskPhone(phone) {
  if (!phone) return "****"
  return phone.length > 4 ? `******${phone.slice(-4)}` : "****"
}

async function hasProcessedInboundMessage(messageId) {
  if (!messageId) return false

  const existing = await prisma.message.findFirst({
    where: { whatsappMessageId: messageId },
    select: { id: true },
  })

  return Boolean(existing)
}

async function getOrCreateConversationForInbound({ agent, incoming }) {
  const normalizedPhone = normalizePhone(incoming.from)
  if (!normalizedPhone) return null

  const incomingName = sanitizeInput(incoming.customerName || "")
  const fallbackName = isUsableProfileName(incomingName) ? incomingName : normalizedPhone

  const customer = await prisma.customer.upsert({
    where: {
      userId_phone: {
        userId: agent.userId,
        phone: normalizedPhone,
      },
    },
    update: {
      lastSeen: new Date(),
    },
    create: {
      userId: agent.userId,
      phone: normalizedPhone,
      name: fallbackName,
      tag: "NEW",
    },
  })

  let conversation = await prisma.conversation.findFirst({
    where: {
      userId: agent.userId,
      customerId: customer.id,
      stage: { notIn: ["ARCHIVED"] },
    },
    orderBy: { updatedAt: "desc" },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId: agent.userId,
        customerId: customer.id,
        stage: "GREETING",
        score: 10,
        context: {},
      },
    })
  }

  return { customer, conversation }
}

async function saveInboundWithoutAi({ agent, incoming, messageText, whatsappMediaId }) {
  const cleanContent = sanitizeInput(messageText)
  if (!cleanContent) return null

  const resolved = await getOrCreateConversationForInbound({ agent, incoming })
  if (!resolved) return null

  try {
    await prisma.message.create({
      data: {
        conversationId: resolved.conversation.id,
        role: "USER",
        content: cleanContent,
        ...(incoming.messageId ? { whatsappMessageId: incoming.messageId } : {}),
        ...(whatsappMediaId ? { whatsappMediaId } : {}),
      },
    })
  } catch (error) {
    if (error?.code === "P2002") {
      return { ...resolved, duplicate: true }
    }
    throw error
  }

  const conversation = await prisma.conversation.update({
    where: { id: resolved.conversation.id },
    data: { isRead: false, updatedAt: new Date() },
  })

  return { ...resolved, conversation, duplicate: false }
}

async function saveAgentConversationReply({ conversationId, content }) {
  const cleanContent = sanitizeInput(content)
  if (!conversationId || !cleanContent) return null

  const message = await prisma.message.create({
    data: {
      conversationId,
      role: "AGENT",
      content: cleanContent,
    },
  })

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  })

  return message
}

function verifySignature(body, signature, appSecret) {
  if (!signature || !appSecret) return false

  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(body, "utf8")
    .digest("hex")

  const sig = signature.replace("sha256=", "")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expectedSignature, "hex")
    )
  } catch {
    return false
  }
}

function isInsideWorkHours(agent, now = new Date()) {
  const moroccoTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Casablanca",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now)

  const currentHour = Number.parseInt(moroccoTime.find(p => p.type === "hour")?.value || "0", 10)
  const currentMinute = Number.parseInt(moroccoTime.find(p => p.type === "minute")?.value || "0", 10)
  const currentTime = currentHour * 60 + currentMinute

  const [startHour, startMinute] = String(agent.workStart || "00:00").split(":").map(Number)
  const [endHour, endMinute] = String(agent.workEnd || "23:59").split(":").map(Number)
  const workStartMinutes = startHour * 60 + startMinute
  const workEndMinutes = endHour * 60 + endMinute

  if (workStartMinutes <= workEndMinutes) {
    return currentTime >= workStartMinutes && currentTime <= workEndMinutes
  }

  return currentTime >= workStartMinutes || currentTime <= workEndMinutes
}

function buildOptOutConfirmation(agent) {
  if (String(agent?.language || "").toLowerCase().includes("fr")) {
    return "C'est noté. Les messages promotionnels sont arrêtés pour ce numéro."
  }

  return "صافي، حبسنا الرسائل الترويجية لهاد الرقم."
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const agent = await prisma.agent.findFirst({
    where: { verifyToken: token },
    select: { id: true },
  })

  if (mode === "subscribe" && agent) {
    console.log(`âœ… WhatsApp webhook verified for agent: ${agent.id}`)
    return new Response(challenge, { status: 200 })
  }

  return new Response("Verification failed", { status: 403 })
}

export async function POST(request) {
  const signature = request.headers.get("x-hub-signature-256")
  const appSecret = process.env.WHATSAPP_APP_SECRET

  let parsedBody

  if (appSecret) {
    const body = await request.text()

    if (!verifySignature(body, signature, appSecret)) {
      console.error("Invalid WhatsApp webhook signature")
      return new Response("Invalid signature", { status: 403 })
    }

    try {
      parsedBody = JSON.parse(body)
    } catch {
      return new Response("OK", { status: 200 })
    }
  } else {
    if (process.env.NODE_ENV === "production") {
      console.error("WHATSAPP_APP_SECRET is required in production")
      return new Response("Webhook signature secret missing", { status: 500 })
    }

    console.warn("WHATSAPP_APP_SECRET not configured; skipping webhook signature verification")
    try {
      parsedBody = await request.json()
    } catch {
      return new Response("OK", { status: 200 })
    }
  }

  const incomingMessages = parseAllIncomingMessages(parsedBody)
  if (!incomingMessages.length) {
    return new Response("OK", { status: 200 })
  }

  console.log(`ðŸ“© WhatsApp inbound messages: ${incomingMessages.length}`)

  await Promise.allSettled(
    incomingMessages.map(async (incoming) => {
      const maskedIncomingPhone = maskPhone(incoming.from)

      try {
        if (await hasProcessedInboundMessage(incoming.messageId)) {
          console.log(`â†©ï¸ [${maskedIncomingPhone}] duplicate inbound skipped`)
          return
        }

        const agent = decryptAgentSecrets(await prisma.agent.findFirst({
          where: { whatsappPhoneId: incoming.phoneId },
          include: { user: true },
        }))

        if (!agent) {
          console.log(`âš ï¸ [${maskedIncomingPhone}] no agent for phoneId ${incoming.phoneId}`)
          return
        }

        const incomingMediaId = incoming.mediaId || incoming.audioId || null
        const messageText = incoming.type === "audio"
          ? "[\u0631\u0633\u0627\u0644\u0629 \u0635\u0648\u062A\u064A\u0629]"
          : incoming.text
        const sanitizedText = sanitizeInput(messageText)
        if (!sanitizedText) {
          console.log(`â­ï¸ [${maskedIncomingPhone}] empty inbound skipped after sanitization`)
          return
        }

        await markCampaignReplyFromInbound({
          userId: agent.userId,
          phone: incoming.from,
        })

        if (isMarketingOptOutMessage(sanitizedText)) {
          const saved = await saveInboundWithoutAi({
            agent,
            incoming,
            messageText: sanitizedText,
            whatsappMediaId: incomingMediaId,
          })

          if (saved?.duplicate) {
            return
          }

          await unsubscribeCustomerFromCampaigns({
            userId: agent.userId,
            phone: incoming.from,
          })

          const confirmationMessage = buildOptOutConfirmation(agent)
          const optOutSent = await sendWhatsAppMessage({
            phoneId: agent.whatsappPhoneId,
            token: agent.whatsappToken,
            to: incoming.from,
            message: confirmationMessage,
          })

          if (optOutSent.success && saved?.conversation?.id) {
            await saveAgentConversationReply({
              conversationId: saved.conversation.id,
              content: confirmationMessage,
            })
          }

          console.log(`🛑 [${maskedIncomingPhone}] marketing opt-out handled`)
          return
        }

        // Track if this was originally a voice message
        const wasVoice = incoming.type === "audio"

        // ── Check agent status BEFORE processing voice ─────────────────────
        // If agent is inactive or outside work hours, save voice without transcription
        if (!agent.isActive) {
          const saved = await saveInboundWithoutAi({
            agent,
            incoming,
            messageText: sanitizedText,
            whatsappMediaId: incomingMediaId,
          })
          if (!saved?.duplicate) {
            console.log(`💾 [${maskedIncomingPhone}] inbound saved while agent inactive`)
          }
          return
        }

        if (agent.workHoursEnabled && !isInsideWorkHours(agent)) {
          const saved = await saveInboundWithoutAi({
            agent,
            incoming,
            messageText: sanitizedText,
            whatsappMediaId: incomingMediaId,
          })

          if (!saved || saved.duplicate) return

          if (agent.offlineMessage) {
            const offlineSent = await sendWhatsAppMessage({
              phoneId: agent.whatsappPhoneId,
              token: agent.whatsappToken,
              to: incoming.from,
              message: agent.offlineMessage,
            })

            if (offlineSent.success) {
              await saveAgentConversationReply({
                conversationId: saved.conversation.id,
                content: agent.offlineMessage,
              })
              console.log(`📤 [${maskedIncomingPhone}] offline message sent and saved`)
            } else {
              console.error(`❌ [${maskedIncomingPhone}] offline message send failed`, offlineSent.error)
            }
          }
          return
        }

        // ── Voice path: download → transcribe → use as text ─────────────────────
        // Only transcribe if agent is active and within work hours
        let aiInputText = sanitizedText
        let transcribedFromVoice = false

        if (wasVoice && incoming.audioId) {
          try {
            const transcription = await transcribeWhatsAppAudio({
              token: agent.whatsappToken,
              audioId: incoming.audioId,
            })

            if (transcription) {
              aiInputText = sanitizeInput(transcription)
              transcribedFromVoice = true
              console.log(`🎙️ [Webhook] Voice transcribed: "${aiInputText.slice(0, 80)}${aiInputText.length > 80 ? "…" : ""}"`)
            } else {
              // ✅ Whisper couldn't transcribe — save silently without forced reply
              // AI agent will not send any forced message; conversation stays open
              await saveInboundWithoutAi({
                agent,
                incoming,
                messageText: sanitizedText,
                whatsappMediaId: incomingMediaId,
              })
              console.log(`🎙️ [Webhook] Voice empty/silent — saved without reply`)
              return
            }
          } catch (err) {
            console.error("❌ [Webhook] Voice processing failed:", err.message)
            // Fail silently — don't return error to WhatsApp (causes retry loop)
            return
          }
        }

        if (incoming.type === "image" && incoming.mediaId) {
          const imageCaption = sanitizedText.replace(/^\[[^\]]+\]\s*/u, "").trim()
          const imageDescription = await analyzeWhatsAppImage({
            token: agent.whatsappToken,
            imageId: incoming.mediaId,
            caption: imageCaption,
          })

          if (imageDescription) {
            const customerQuestion = imageCaption || "واش عندكم هاد المنتج أو شي منتج مشابه؟"
            aiInputText = [
              `[صورة من العميل] ${customerQuestion}`,
              "",
              `وصف الصورة لتحليل المنتج: ${imageDescription}`,
              "",
              "تعليمات للوكيل: قارن وصف الصورة مع المنتجات المتوفرة في الكاتالوغ. إذا وجدت نفس المنتج أو منتجاً مشابهاً فاذكر ذلك بوضوح وأرسل صور المنتج فقط إذا كان مطابقاً أو قريباً. إذا لم تكن متأكداً، قل إنك ستقترح الأقرب ولا تدّعي أنه نفس المنتج.",
            ].join("\n")
            console.log(`🖼️ [Webhook] Image analyzed: "${imageDescription.slice(0, 100)}${imageDescription.length > 100 ? "…" : ""}"`)
          } else {
            aiInputText = [
              sanitizedText,
              "تعليمات للوكيل: العميل أرسل صورة، لكن لم نتمكن من تحليلها تقنياً. اطلب منه اسم المنتج أو تفاصيل أكثر مثل النوع/اللون/العلامة.",
            ].join("\n")
            console.log(`🖼️ [Webhook] Image analysis unavailable; asking for details`)
          }
        }

        const result = await processIncomingMessage({
          userId: agent.userId,
          customerPhone: incoming.from,
          customerName: incoming.customerName,
          messageText: aiInputText,
          whatsappMessageId: incoming.messageId,
          whatsappMediaId: incomingMediaId,
          whatsappTimestamp: incoming.timestamp,
        })

        if (!result || result.skipped || !result.reply) {
          console.log(`â„¹ï¸ [${maskedIncomingPhone}] AI reply skipped`)
          return
        }

        const safeReply = result.reply
          .replace(/\[STAGE:\w+\]/g, "")
          .replace(/\[ORDER_CONFIRMED\]/g, "")
          .replace(/\[SEND[_ ]IMAGES?\]/gi, "")
          .trim()

        // ─── Send reply (text, even if original was voice) ──────────────────
        let sent

        const replyDelayMs = resolveReplyDelayMs(agent)
        if (replyDelayMs > 0) {
          console.log(`⏳ [${maskedIncomingPhone}] delaying AI reply ${replyDelayMs}ms`)
          await sleep(replyDelayMs)
        }

        console.log("📤 [AI Reply] sending:", {
          conversationId: result.conversationId,
          to: incoming.from,
          reply: safeReply?.slice(0, 120),
        })
        sent = await sendWhatsAppMessage({
          phoneId: agent.whatsappPhoneId,
          token: agent.whatsappToken,
          to: incoming.from,
          message: safeReply,
        })

        if (sent.success) {
          console.log(`âœ… [${maskedIncomingPhone}] AI reply sent`)
        } else if (sent.isTokenExpired) {
          console.error(`ðŸš¨ WhatsApp token expired for agent ${agent.id}`)
          try {
            await prisma.notification.create({
              data: {
                userId: agent.userId,
                type: "SYSTEM",
                title: "fr:ðŸš¨ ProblÃ¨me WhatsApp Token||ar:ðŸš¨ Ù…Ø´ÙƒÙ„ ÙÙŠ WhatsApp Token",
                message: "fr:Le token d'accÃ¨s a expirÃ©. Mettez Ã  jour WhatsApp dans les paramÃ¨tres.||ar:Ø§Ù†ØªÙ‡Øª ØµÙ„Ø§Ø­ÙŠØ© Token Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨. Ø§Ù„Ù…Ø±Ø¬Ùˆ ØªØ­Ø¯ÙŠØ«Ù‡ Ù…Ù† Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª.",
                isRead: false,
              },
            })
          } catch (notificationError) {
            console.error("Failed to create WhatsApp token notification:", notificationError?.message || notificationError)
          }
        } else {
          console.error(`âŒ [${maskedIncomingPhone}] AI reply send failed:`, sent.error)
        }

        const validImageUrls = [...new Set(
          (result.imageUrls || [])
            .filter(url => typeof url === "string")
            .map(url => url.trim())
            .filter(url => /^https?:\/\//i.test(url))
        )]

        for (const [index, imageUrl] of validImageUrls.entries()) {
          let sentImage = false

          for (let attempt = 1; attempt <= 3; attempt++) {
            const imageResult = await sendWhatsAppMessage({
              phoneId: agent.whatsappPhoneId,
              token: agent.whatsappToken,
              to: incoming.from,
              message: imageUrl,
              type: "image",
            })

            if (imageResult.success) {
              sentImage = true
              console.log(`ðŸ“¸ [${maskedIncomingPhone}] AI image ${index + 1}/${validImageUrls.length} sent`)
              break
            }

            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
            }
          }

          if (!sentImage) {
            console.error(`âŒ [${maskedIncomingPhone}] failed to send AI image ${index + 1}/${validImageUrls.length}`)
          }

          await new Promise(resolve => setTimeout(resolve, 2500))
        }
      } catch (error) {
        console.error(`âŒ [${maskedIncomingPhone}] inbound processing error:`, error?.message || error)
      }
    })
  )

  return new Response("OK", { status: 200 })
}

