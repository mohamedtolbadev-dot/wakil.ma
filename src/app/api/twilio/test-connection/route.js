import { getUserFromRequest } from "@/lib/auth"
import { successResponse, unauthorizedResponse } from "@/lib/response"
import { normalizeTwilioPhoneNumber, verifyTwilioCredentials } from "@/lib/twilioAccount"

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  const { accountSid, authToken, phoneNumber } = await request.json()
  const normalizedPhone = normalizeTwilioPhoneNumber(phoneNumber)
  if (!normalizedPhone) {
    return Response.json({ success: false, error: "رقم Twilio غير صالح", code: "INVALID_PHONE_NUMBER" }, { status: 400 })
  }

  const result = await verifyTwilioCredentials({ accountSid, authToken })
  if (!result.success) {
    return Response.json({ success: false, error: result.error, code: result.code }, { status: result.status })
  }

  return successResponse({
    ...result,
    phoneNumber: normalizedPhone,
    message: "تم التحقق من بيانات Twilio بنجاح",
  })
}
