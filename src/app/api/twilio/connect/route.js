import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendTwilioWhatsAppMessage } from "@/lib/whatsapp"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response"
import { encryptSecret } from "@/lib/secretCrypto"

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { accountSid, authToken, phoneNumber } = await request.json()

    if (!accountSid || !authToken || !phoneNumber) {
      return errorResponse("Account SID, Auth Token, و Phone Number مطلوبين")
    }

    // اختبار الاتصال عبر Twilio API
    const testRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
      }
    )

    if (testRes.status === 401) {
      return errorResponse("Account SID أو Auth Token غير صحيح", 401)
    }
    if (!testRes.ok) {
      return errorResponse("فشل الاتصال بـ Twilio API", 400)
    }

    // حفظ بيانات Twilio مع تشفير الـ token
    await prisma.agent.update({
      where: { userId: user.id },
      data: {
        waProvider:        "twilio",
        twilioAccountSid:  accountSid.trim(),
        twilioAuthToken:   encryptSecret(authToken.trim()),
        twilioPhoneNumber: phoneNumber.trim(),
      },
    })

    return successResponse({ connected: true })
  } catch (error) {
    console.error("Twilio connect error:", error)
    return errorResponse("خطأ في ربط Twilio", 500)
  }
}
