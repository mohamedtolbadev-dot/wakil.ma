import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/response"
import { withConversationRecovery } from "@/lib/conversationRecovery"

export const dynamic = "force-dynamic"

const VALID_STAGES = new Set([
  "GREETING",
  "DISCOVERY",
  "PITCHING",
  "OBJECTION",
  "CLOSING",
  "CLOSED",
  "ABANDONED",
  "ARCHIVED",
])

async function getConversationId(params) {
  const resolvedParams = await Promise.resolve(params)
  return resolvedParams?.id || null
}

export async function GET(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const id = await getConversationId(params)
    if (!id) return errorResponse("معرف المحادثة غير صالح", 400)

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: user.id },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!conversation) {
      return errorResponse("المحادثة غير موجودة", 404)
    }

    return successResponse(withConversationRecovery(conversation))
  } catch (error) {
    console.error("GET conversation error:", error?.message || error)
    return errorResponse("خطأ في جلب المحادثة", 500)
  }
}

export async function PATCH(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const id = await getConversationId(params)
    if (!id) return errorResponse("معرف المحادثة غير صالح", 400)

    const body = await request.json()
    const { isRead, stage, score } = body || {}

    if (isRead !== undefined && typeof isRead !== "boolean") {
      return errorResponse("حالة القراءة غير صالحة", 400)
    }

    if (stage !== undefined && !VALID_STAGES.has(stage)) {
      return errorResponse("مرحلة المحادثة غير صالحة", 400)
    }

    if (score !== undefined) {
      const parsedScore = Number(score)
      if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        return errorResponse("نقطة المحادثة يجب أن تكون بين 0 و 100", 400)
      }
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: user.id },
    })
    if (!conversation) {
      return errorResponse("المحادثة غير موجودة", 404)
    }

    const data = {
      ...(isRead !== undefined ? { isRead } : {}),
      ...(stage !== undefined ? { stage } : {}),
      ...(score !== undefined ? { score: Number(score) } : {}),
    }

    if (Object.keys(data).length === 0) {
      return successResponse(withConversationRecovery(conversation))
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data,
    })

    return successResponse(withConversationRecovery(updated))
  } catch (error) {
    console.error("PATCH conversation error:", error?.message || error)
    return errorResponse("خطأ في تحديث المحادثة", 500)
  }
}

export async function DELETE(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const id = await getConversationId(params)
    if (!id) return errorResponse("معرف المحادثة غير صالح", 400)

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    })

    if (!conversation) {
      return errorResponse("المحادثة غير موجودة", 404)
    }

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { conversationId: id } }),
      prisma.conversation.delete({ where: { id } }),
    ])

    return successResponse({ message: "تم حذف المحادثة بنجاح" })
  } catch (error) {
    console.error("DELETE conversation error:", error?.message || error)
    return errorResponse("خطأ في حذف المحادثة", 500)
  }
}
