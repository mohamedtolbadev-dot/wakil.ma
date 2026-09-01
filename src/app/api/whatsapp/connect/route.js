// API لربط WhatsApp بالحساب

import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { successResponse, errorResponse,
         unauthorizedResponse } from "@/lib/response"
import { encryptSecret } from "@/lib/secretCrypto"

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { phoneId, token } = await request.json()

    if (!phoneId || !token) {
      return errorResponse("Phone ID و Token مطلوبان")
    }

    // اختبار الاتصال بإرسال رسالة للنفس
    const testResult = await sendWhatsAppMessage({
      phoneId,
      token,
      to: phoneId,
      message: "✅ تم ربط wakil.ma بنجاح!"
    })

    if (testResult.isTokenExpired) {
      return errorResponse("❌ Token غير صحيح أو منتهي الصلاحية! يرجى التحقق من Token في Meta Dashboard")
    }

    // حفظ بيانات WhatsApp في Agent
    await prisma.agent.update({
      where: { userId: user.id },
      data: { whatsappPhoneId: phoneId, whatsappToken: encryptSecret(token) }
    })

    return successResponse({
      connected: true,
      tested: testResult.success,
    })
  } catch (error) {
    console.error("WhatsApp connect error:", error)
    return errorResponse("خطأ في ربط WhatsApp", 500)
  }
}
