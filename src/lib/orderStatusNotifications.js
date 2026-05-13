import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

const DELIVERY_NOTIFY_STATUSES = new Set(["SHIPPED", "DELIVERED", "CANCELLED"])

function safeObj(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

export function shouldTrackDeliveryNotification(status) {
  return DELIVERY_NOTIFY_STATUSES.has(status)
}

export function getSentFlagForOrderStatus(status) {
  if (status === "CONFIRMED") return { confirmSent: true }
  if (status === "SHIPPED") return { shipSent: true }
  if (status === "DELIVERED") return { deliverSent: true }
  return null
}

export function resolveOrderConversationId(order) {
  if (!order) return null
  if (order.conversationId) return order.conversationId
  const match = String(order.notes || "").match(/(?:المحادثة|conversation)\s*:\s*([a-z0-9-]+)/i)
  return match?.[1] || null
}

export function buildOrderMemory(order) {
  if (!order) return null
  return {
    orderId: order.id,
    productId: order.productId || null,
    productName: order.productName || null,
    quantity: order.quantity || null,
    status: order.status || null,
    trackingNumber: order.trackingNumber || null,
    deliveryReference: order.deliveryReference || null,
    deliveryStatus: order.deliveryStatus || null,
    createdAt: order.createdAt || null,
    variant: order.variant || null,
    city: order.city || null,
    address: order.address || null,
    customerName: order.customerName || null,
    totalAmount: order.totalAmount ?? null,
    updatedAt: new Date().toISOString(),
  }
}

function detectCustomerStatusReplyLanguage(text = "") {
  const value = String(text || "").toLowerCase().trim()
  if (!value) return null
  const hasArabic = /[\u0600-\u06FF]/.test(value)
  const hasLatin = /[a-z]/i.test(value)

  if (hasLatin && /\b(bghit|bgit|baghi|wach|chno|chnu|chhal|bchhal|fin|fayn|fen|3afak|sift|siftli|tsift|tawsil|twssil|lmdina|mdina|hay|7ay|derb|darb|zn9a|zen9a|safi|wa5a|waxa|aked|akid|s7i7|mzyan|mezian|taman|thaman|commande)\b/i.test(value)) {
    return "darija"
  }

  if (hasLatin && /\b(bonjour|salut|merci|svp|je|veux|combien|livraison|quelle|ville|adresse|commande|produit|confirm|confirme|d'accord)\b/i.test(value)) {
    return "french"
  }

  if (hasArabic) {
    const darijaHints = /(?:واش|شنو|فين|شحال|بغيت|باغي|عافاك|صيفط|طلبية|ثمن|توصيل|السمية|زنقة|حي|درب|غالي|رخيص|مزيان)/i
    return darijaHints.test(value) ? "darija" : "arabic"
  }

  if (hasLatin) return "darija"
  return null
}

function resolveOrderStatusReplyLanguage(agentLanguage, recentMessages = []) {
  const forced = String(agentLanguage || "").toLowerCase()
  if (forced === "french" || forced === "darija" || forced === "arabic") return forced

  const messages = Array.isArray(recentMessages) ? recentMessages : []
  for (const message of messages) {
    if (message?.role !== "USER") continue
    const detected = detectCustomerStatusReplyLanguage(message.content)
    if (detected) return detected
  }

  return "darija"
}

function getTrackingUrl(trackingUrlTemplate, trackingNumber) {
  const tracking = String(trackingNumber || "").trim()
  if (!trackingUrlTemplate || !tracking) return ""
  return String(trackingUrlTemplate).replace(/{tracking}/g, tracking)
}

export function renderOrderStatusTemplate(template, order, trackingUrlTemplate) {
  const input = String(template || "").trim()
  if (!input) return ""
  const tracking = order.trackingNumber || ""
  const trackingUrl = getTrackingUrl(trackingUrlTemplate, tracking)

  return input
    .replace(/\{\{?name\}?\}/g, order.customerName || "")
    .replace(/\{\{?product\}?\}/g, order.productName || "")
    .replace(/\{\{?amount\}?\}/g, String(order.totalAmount || ""))
    .replace(/\{\{?tracking\}?\}/g, tracking)
    .replace(/\{\{?trackingUrl\}?\}/g, trackingUrl)
}

function getOrderFallbackMessage(status, order, agentLanguage, trackingUrlTemplate) {
  const name = order.customerName || ""
  const product = order.productName || ""
  const amount = order.totalAmount || ""
  const tracking = order.trackingNumber || ""
  const trackingUrl = getTrackingUrl(trackingUrlTemplate, tracking)

  const messages = {
    french: {
      CONFIRMED: `Bonjour ${name} !\nVotre commande (${product}) a ete confirmee.\nMontant : ${amount} DH\nMerci pour votre confiance.`,
      SHIPPED: `Bonjour ${name} !\nVotre commande (${product}) est en route.${tracking ? `\nNumero de suivi : ${tracking}` : ""}${trackingUrl ? `\nLien de suivi : ${trackingUrl}` : ""}\nLivraison sous 24-48h.`,
      DELIVERED: `Bonjour ${name} !\nVotre commande (${product}) a ete livree.\nMerci pour votre confiance.`,
      CANCELLED: `Bonjour ${name},\nVotre commande (${product}) a ete annulee.\nContactez-nous si vous avez besoin d'aide.`,
    },
    arabic: {
      CONFIRMED: `مرحبا ${name}!\nتم تأكيد طلبك (${product}) بنجاح.\nالمبلغ: ${amount} درهم\nشكرا على ثقتك.`,
      SHIPPED: `مرحبا ${name}!\nطلبك (${product}) في الطريق إليك.${tracking ? `\nرقم التتبع: ${tracking}` : ""}${trackingUrl ? `\nرابط التتبع: ${trackingUrl}` : ""}\nالتوصيل خلال 24-48 ساعة.`,
      DELIVERED: `مرحبا ${name}!\nتم تسليم طلبك (${product}) بنجاح.\nشكرا على ثقتك.`,
      CANCELLED: `مرحبا ${name},\nتم إلغاء طلبك (${product}).\nتواصل معنا إذا احتجت أي مساعدة.`,
    },
    darija: {
      CONFIRMED: `مرحبا ${name}!\nأكدنا ليك الطلبية ديالك (${product}).\nالمجموع: ${amount} درهم\nشكرا على الثقة.`,
      SHIPPED: `مرحبا ${name}!\nطلبية (${product}) خرجات للتوصيل.${tracking ? `\nرقم التتبع: ${tracking}` : ""}${trackingUrl ? `\nرابط التتبع: ${trackingUrl}` : ""}\nغادي توصلك قريبا.`,
      DELIVERED: `مرحبا ${name}!\nتوصلتي بطلبية (${product}).\nشكرا على الثقة ديالك.`,
      CANCELLED: `مرحبا ${name},\nلغينا ليك الطلبية ديال (${product}).\nإلى بغيتي شي حاجة أخرى راسلنا.`,
    },
  }

  const lang = agentLanguage === "french"
    ? "french"
    : agentLanguage === "darija"
      ? "darija"
      : "arabic"

  return messages[lang][status] || messages.french[status] || ""
}

export async function updateOrderConversationMemory({ userId, order, status = order?.status }) {
  const conversationId = resolveOrderConversationId(order)
  const orderMemory = buildOrderMemory({ ...order, status })
  if (!conversationId || !orderMemory) return false

  try {
    const linkedConversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true, context: true },
    })

    if (!linkedConversation) return false

    await prisma.conversation.update({
      where: { id: linkedConversation.id },
      data: {
        context: {
          ...safeObj(linkedConversation.context),
          currentOrder: orderMemory,
          lastOrderSnapshot: orderMemory,
          lastOrderStatusUpdatedAt: new Date().toISOString(),
          ...(status === "DELIVERED" ? {
            followUpScheduled: {
              orderId: order.id,
              scheduledAfter: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              type: "post_delivery_check",
            },
          } : {}),
        },
        updatedAt: new Date(),
      },
    })
    return true
  } catch (error) {
    console.warn("[OrderStatus] Could not update conversation memory:", error?.message || error)
    return false
  }
}

export async function sendOrderStatusNotification({ userId, order, status }) {
  if (!userId || !order?.customerPhone || !status) {
    return { messageSent: false, sentMessage: null, sentFlag: null }
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { userId },
      select: {
        language: true,
        whatsappPhoneId: true,
        whatsappToken: true,
        orderConfirmMessage: true,
        orderShipMessage: true,
        orderDeliverMessage: true,
        orderCancelledMessage: true,
        trackingUrlTemplate: true,
      },
    })

    if (!agent?.whatsappPhoneId || !agent?.whatsappToken) {
      return { messageSent: false, sentMessage: null, sentFlag: null }
    }

    const conversationId = resolveOrderConversationId(order)
    const recentMessages = conversationId
      ? await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { role: true, content: true },
        })
      : []

    const fallbackLanguage = resolveOrderStatusReplyLanguage(agent.language, recentMessages)
    const templateMap = {
      CONFIRMED: agent.orderConfirmMessage,
      SHIPPED: agent.orderShipMessage,
      DELIVERED: agent.orderDeliverMessage,
      CANCELLED: agent.orderCancelledMessage,
    }

    const templateMessage = renderOrderStatusTemplate(templateMap[status], order, agent.trackingUrlTemplate)
    const message = templateMessage || getOrderFallbackMessage(status, order, fallbackLanguage, agent.trackingUrlTemplate)
    if (!message) return { messageSent: false, sentMessage: null, sentFlag: null }

    const result = await sendWhatsAppMessage({
      phoneId: agent.whatsappPhoneId,
      token: agent.whatsappToken,
      to: order.customerPhone,
      message,
    })

    if (!result.success) {
      return { messageSent: false, sentMessage: null, sentFlag: null, error: result.error }
    }

    if (conversationId) {
      await prisma.message.create({
        data: { conversationId, role: "AGENT", content: message },
      })
    }

    return {
      messageSent: true,
      sentMessage: message,
      sentFlag: getSentFlagForOrderStatus(status),
    }
  } catch (error) {
    console.error("Error sending order status message:", error?.message || error)
    return { messageSent: false, sentMessage: null, sentFlag: null, error }
  }
}
