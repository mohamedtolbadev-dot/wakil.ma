import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response"
import { encryptSecret } from "@/lib/secretCrypto"
import { normalizeTwilioPhoneNumber, verifyTwilioCredentials } from "@/lib/twilioAccount"

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { accountSid, authToken, phoneNumber } = await request.json()
    const normalizedPhone = normalizeTwilioPhoneNumber(phoneNumber)

    if (!accountSid || !authToken || !normalizedPhone) {
      return errorResponse("بيانات Twilio أو رقم الهاتف غير صالحة")
    }

    const verification = await verifyTwilioCredentials({ accountSid, authToken })
    if (!verification.success) {
      return errorResponse(verification.error, verification.status)
    }

    const agent = await prisma.agent.update({
      where: { userId: user.id },
      data: {
        waProvider: "twilio",
        twilioAccountSid: accountSid.trim(),
        twilioAuthToken: encryptSecret(authToken.trim()),
        twilioPhoneNumber: normalizedPhone,
      },
    })

    return successResponse({ connected: true, waProvider: agent.waProvider, phoneNumber: agent.twilioPhoneNumber })
  } catch (error) {
    console.error("Twilio connect error:", error)
    return errorResponse("خطأ في حفظ إعدادات Twilio", 500)
  }
}
