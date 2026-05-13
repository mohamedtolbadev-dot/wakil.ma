import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { sanitizeInput } from "@/lib/helpers"
import { rateLimit } from "@/lib/rateLimit"

export const dynamic = "force-dynamic"

function maskPhone(phone) {
  if (!phone) return "****"
  return phone.length > 4 ? `******${phone.slice(-4)}` : "****"
}

export async function POST(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  // ✅ Rate limiting — prevent spam (5 replies per minute per user)
  const rateLimitResult = rateLimit(request)
  if (!rateLimitResult.success) {
    return errorResponse(
      `تم تجاوز الحد. حاول بعد ${Math.ceil(rateLimitResult.retryAfter / 60)} دقيقة`,
      429
    )
  }

  try {
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams || {}
    if (!id) return errorResponse("معرف المحادثة غير صالح", 400)
    const { message } = await request.json()

    const cleanMessage = sanitizeInput(message)
    if (!cleanMessage) return errorResponse("الرسالة فارغة", 400)
    if (cleanMessage.length > 1000) return errorResponse("الرسالة طويلة جداً", 400)

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: user.id },
      include: { customer: true },
    })
    if (!conversation) return errorResponse("المحادثة غير موجودة", 404)

    const agent = await prisma.agent.findUnique({
      where: { userId: user.id },
    })
    if (!agent) return errorResponse("Agent غير موجود", 404)

    // رفض الرد اليدوي إذا AI شغال
    if (agent.isActive) {
      return errorResponse("Agent is active — manual reply not allowed", 403)
    }

    // ✅ WhatsApp config guards
    if (!agent.whatsappPhoneId || !agent.whatsappToken) {
      return errorResponse("إعدادات واتساب غير مكتملة (Phone ID أو Token مفقود)", 400)
    }
    if (!conversation.customer?.phone) {
      return errorResponse("رقم هاتف العميل غير متوفر", 400)
    }

    const maskedPhone = maskPhone(conversation.customer.phone)
    console.log(`✅ [reply] Sending to customer ${maskedPhone}...`)

    const sent = await sendWhatsAppMessage({
      phoneId: agent.whatsappPhoneId,
      token: agent.whatsappToken,
      to: conversation.customer.phone,
      message: cleanMessage,
    })

    if (!sent.success) {
      console.error(`❌ [reply] WhatsApp send failed:`, sent)
      return errorResponse("فشل إرسال الرسالة عبر واتساب", 500)
    }

    console.log(`✅ [reply] Message sent successfully to ${maskedPhone}`)

    // ✅ After WhatsApp send succeeds, DB save failures should NOT surface as "send failed"
    // We return success with saved=false so the UI doesn't show a scary error.
    try {
      const savedMessage = await prisma.message.create({
        data: {
          conversationId: id,
          role: "AGENT",
          content: cleanMessage,
        },
      })

      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      })

      return successResponse(savedMessage, 201)
    } catch (dbErr) {
      console.error("POST reply DB save error:", dbErr?.message || dbErr)
      // Minimal message object to allow optimistic UI update
      return successResponse(
        {
          id: `local_${Date.now()}`,
          conversationId: id,
          role: "AGENT",
          content: cleanMessage,
          createdAt: new Date().toISOString(),
          _saved: false,
        },
        200
      )
    }
  } catch (error) {
    console.error("POST reply error:", error?.message || error)
    return errorResponse("خطأ في إرسال الرسالة", 500)
  }
}
