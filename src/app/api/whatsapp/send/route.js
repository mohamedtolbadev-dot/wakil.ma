// API لإرسال رسالة يدوية من الداشبورد

import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { successResponse, errorResponse,
         unauthorizedResponse } from "@/lib/response"
import { decryptAgentSecrets } from "@/lib/secretCrypto"

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { phone, message } = await request.json()

    if (!phone || !message) {
      return errorResponse("الرقم والرسالة مطلوبان")
    }

    const agent = decryptAgentSecrets(await prisma.agent.findUnique({
      where: { userId: user.id }
    }))

    if (!agent?.whatsappPhoneId || !agent?.whatsappToken) {
      return errorResponse(
        "WhatsApp غير مربوط — أضف Phone ID و Token في الإعدادات"
      )
    }

    const result = await sendWhatsAppMessage({
      phoneId: agent.whatsappPhoneId,
      token: agent.whatsappToken,
      to: phone,
      message,
    })

    if (!result.success) {
      if (result.isTokenExpired) {
        return errorResponse("❌ انتهت صلاحية WhatsApp Token! يجب تحديث Token من جديد في الإعدادات.", 401)
      }
      return errorResponse("فشل في إرسال الرسالة")
    }

    return successResponse({ sent: true })
  } catch (error) {
    console.error("Send message error:", error)
    return errorResponse("خطأ في إرسال الرسالة", 500)
  }
}
