export const CANONICAL_APP_URL = "https://wakil.ma"
export const WHATSAPP_WEBHOOK_PATH = "/api/webhook/whatsapp"
export const TWILIO_WEBHOOK_PATH   = "/api/webhook/twilio"

function normalizeAppUrl(url) {
  const value = String(url).replace(/\/+$/, "")

  try {
    const parsed = new URL(value)
    if (parsed.hostname.toLowerCase() === "www.wakil.ma") {
      parsed.hostname = "wakil.ma"
      return parsed.toString().replace(/\/$/, "")
    }
  } catch {
    // Keep the configured value intact so existing validation can handle it.
  }

  return value
}

export function getPublicAppUrl() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/+$/, "")

  if (!configured || configured.includes("wa-kil.vercel.app")) {
    return CANONICAL_APP_URL
  }

  return normalizeAppUrl(configured)
}

export function getWhatsAppWebhookUrl(baseUrl = getPublicAppUrl()) {
  return `${normalizeAppUrl(baseUrl)}${WHATSAPP_WEBHOOK_PATH}`
}

export function getTwilioWebhookUrl(baseUrl = getPublicAppUrl()) {
  return `${normalizeAppUrl(baseUrl)}${TWILIO_WEBHOOK_PATH}`
}
