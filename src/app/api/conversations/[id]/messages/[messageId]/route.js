import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function DELETE(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const resolvedParams = await Promise.resolve(params)
    const conversationId = resolvedParams?.id
    const messageId = resolvedParams?.messageId

    if (!conversationId || !messageId) {
      return errorResponse("معرّف غير صالح", 400)
    }

    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
        conversation: { userId: user.id },
      },
      select: { id: true, conversationId: true },
    })

    if (!message) {
      return errorResponse("الرسالة غير موجودة", 404)
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.message.delete({
        where: { id: messageId },
      })

      const [lastMessage, messagesCount, updatedConversation] = await Promise.all([
        tx.message.findFirst({
          where: { conversationId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            role: true,
            content: true,
            whatsappMediaId: true,
            createdAt: true,
          },
        }),
        tx.message.count({
          where: { conversationId },
        }),
        tx.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
          select: {
            id: true,
            updatedAt: true,
          },
        }),
      ])

      return {
        deletedMessageId: messageId,
        conversation: {
          id: updatedConversation.id,
          updatedAt: updatedConversation.updatedAt,
          lastMessage,
          messagesCount,
        },
      }
    })

    return successResponse(result)
  } catch (error) {
    console.error("DELETE message error:", error?.message || error)
    return errorResponse("خطأ في حذف الرسالة", 500)
  }
}
