export function normalizeTwilioPhoneNumber(value) {
  const raw = String(value || "").trim().replace(/^whatsapp:/i, "")
  const digits = raw.replace(/\D/g, "")
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null
  return `+${digits}`
}

export async function verifyTwilioCredentials({ accountSid, authToken }) {
  const sid = String(accountSid || "").trim()
  const token = String(authToken || "").trim()
  if (!sid || !token) {
    return { success: false, status: 400, code: "MISSING_CREDENTIALS", error: "Account SID و Auth Token مطلوبين" }
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    const data = await response.json().catch(() => ({}))

    if (response.status === 401) {
      return { success: false, status: 401, code: "INVALID_CREDENTIALS", error: "Account SID أو Auth Token غير صحيح" }
    }
    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        code: "TWILIO_API_ERROR",
        error: data?.message || "فشل الاتصال بـ Twilio",
      }
    }

    return { success: true, accountName: data.friendly_name, status: data.status }
  } catch {
    return { success: false, status: 502, code: "TWILIO_UNREACHABLE", error: "تعذر الاتصال بـ Twilio" }
  }
}
