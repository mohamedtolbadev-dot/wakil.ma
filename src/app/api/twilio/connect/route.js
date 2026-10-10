import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
    return errorResponse("خطأ في حفظ إعدادات Twilio", 500)
  }
}
