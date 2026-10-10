import { getUserFromRequest } from "@/lib/auth"
import { successResponse, unauthorizedResponse } from "@/lib/response"

function testError(message, status, code) {
  return Response.json({ success: false, error: message, code }, { status })
}

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { accountSid, authToken, phoneNumber } = await request.json()

    if (!accountSid || !authToken || !phoneNumber) {
      return testError("Account SID, Auth Token, و Phone Number مطلوبين", 400, "MISSING_CREDENTIALS")
    }

    // التحقق من صحة الـ credentials عبر Twilio REST API
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
      }
    )

    if (res.status === 401) {
      return testError("Account SID أو Auth Token غير صحيح", 401, "INVALID_CREDENTIALS")
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return testError(data?.message || "فشل الاتصال بـ Twilio", res.status, "TWILIO_API_ERROR")
    }

    const data = await res.json()

    return successResponse({
      success:     true,
      accountName: data.friendly_name,
      status:      data.status,
      phoneNumber,
      message:     "تم التحقق من بيانات Twilio بنجاح",
    })
  } catch (error) {
    console.error("Twilio test-connection error:", error)
    return testError("خطأ في الاتصال بالسيرفر", 500, "SERVER_ERROR")
  }
}
