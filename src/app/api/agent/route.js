import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import {
  successResponse,
  errorResponse,
  unauthorizedResponse
} from "@/lib/response"
import { decryptAgentSecrets, encryptSecret } from "@/lib/secretCrypto"

const ALLOWED_AGENT_LANGUAGES = new Set(["auto", "darija", "arabic", "french"])
const ALLOWED_REPLY_DELAY_MODES = new Set(["instant", "short", "natural", "custom"])

function clampReplyDelaySeconds(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(20, Math.max(0, Math.round(number)))
}

function normalizeReplyDelay({ mode, minSeconds, maxSeconds }) {
  const normalizedMode = ALLOWED_REPLY_DELAY_MODES.has(mode) ? mode : "instant"

  if (normalizedMode === "short") {
    return { replyDelayMode: "short", replyDelayMinSeconds: 3, replyDelayMaxSeconds: 7 }
  }

  if (normalizedMode === "natural") {
    return { replyDelayMode: "natural", replyDelayMinSeconds: 8, replyDelayMaxSeconds: 18 }
  }

  if (normalizedMode === "custom") {
    const min = clampReplyDelaySeconds(minSeconds)
    const max = Math.max(min, clampReplyDelaySeconds(maxSeconds))
    return { replyDelayMode: "custom", replyDelayMinSeconds: min, replyDelayMaxSeconds: max }
  }

  return { replyDelayMode: "instant", replyDelayMinSeconds: 0, replyDelayMaxSeconds: 0 }
}

export async function GET(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const agent = await prisma.agent.findUnique({
      where: { userId: user.id },
      include: {
        objectionReplies: {
          orderBy: { order: "asc" }
        }
      }
    })

    if (!agent) return errorResponse("Agent غير موجود", 404)

    return successResponse(decryptAgentSecrets(agent))
  } catch (error) {
    console.error("GET agent error:", error)
    return errorResponse("خطأ في جلب Agent", 500)
  }
}

export async function PUT(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const body = await request.json()
    const {
      name, domain, style, language,
      isActive, instructions, productInstructions,
      whatsappPhoneId, whatsappToken,
      selectedProductId,
      workHoursEnabled, workStart, workEnd, offlineMessage,
      welcomeMessage, postSaleMessage,
      orderConfirmMessage,
      orderShipMessage,
      orderDeliverMessage,
      orderCancelledMessage,
      trackingUrlTemplate,
      replyDelayMode,
      replyDelayMinSeconds,
      replyDelayMaxSeconds,
    } = body

    if (language !== undefined && !ALLOWED_AGENT_LANGUAGES.has(language)) {
      return errorResponse("لغة الوكيل غير مدعومة", 400)
    }

    if (replyDelayMode !== undefined && !ALLOWED_REPLY_DELAY_MODES.has(replyDelayMode)) {
      return errorResponse("Unsupported reply delay mode", 400)
    }

    const shouldUpdateReplyDelay = (
      replyDelayMode !== undefined ||
      replyDelayMinSeconds !== undefined ||
      replyDelayMaxSeconds !== undefined
    )
    const normalizedReplyDelay = shouldUpdateReplyDelay
      ? normalizeReplyDelay({
          mode: replyDelayMode,
          minSeconds: replyDelayMinSeconds,
          maxSeconds: replyDelayMaxSeconds,
        })
      : null

    const agent = await prisma.agent.update({
      where: { userId: user.id },
      include: {
        objectionReplies: {
          orderBy: { order: "asc" }
        }
      },
      data: {
        ...(name !== undefined && { name }),
        ...(domain !== undefined && { domain }),
        ...(style !== undefined && { style }),
        ...(language !== undefined && { language }),
        ...(isActive !== undefined && { isActive }),
        ...(instructions !== undefined && { instructions }),
        ...(productInstructions !== undefined && { productInstructions }),
        ...(whatsappPhoneId !== undefined && { whatsappPhoneId }),
        ...(whatsappToken !== undefined && { whatsappToken: encryptSecret(whatsappToken) }),
        ...(selectedProductId !== undefined && {
          selectedProductId: selectedProductId || null
        }),
        ...(workHoursEnabled !== undefined && { workHoursEnabled }),
        ...(workStart !== undefined && { workStart }),
        ...(workEnd !== undefined && { workEnd }),
        ...(offlineMessage !== undefined && { offlineMessage }),
        ...(welcomeMessage !== undefined && { welcomeMessage }),
        ...(postSaleMessage !== undefined && { postSaleMessage }),
        ...(orderConfirmMessage !== undefined && { orderConfirmMessage }),
        ...(orderShipMessage !== undefined && { orderShipMessage }),
        ...(orderDeliverMessage !== undefined && { orderDeliverMessage }),
        ...(orderCancelledMessage !== undefined && { orderCancelledMessage }),
        ...(trackingUrlTemplate !== undefined && { trackingUrlTemplate }),
        ...(normalizedReplyDelay || {}),
      }
    })

    return successResponse(decryptAgentSecrets(agent))
  } catch (error) {
    console.error("PUT agent error:", error)
    return errorResponse("خطأ في تحديث Agent", 500)
  }
}
