export const CANONICAL_APP_URL = "https://www.wakil.ma"
export const WHATSAPP_WEBHOOK_PATH = "/api/webhook/whatsapp"
export const TWILIO_WEBHOOK_PATH   = "/api/webhook/twilio"

export function getPublicAppUrl() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/+$/, "")

  if (!configured || configured.includes("wa-kil.vercel.app")) {
    return CANONICAL_APP_URL
  }

  return configured
}

export function getWhatsAppWebhookUrl(baseUrl = getPublicAppUrl()) {
  return `${String(baseUrl).replace(/\/+$/, "")}${WHATSAPP_WEBHOOK_PATH}`
}

export function getTwilioWebhookUrl(baseUrl = getPublicAppUrl()) {
  return `${String(baseUrl).replace(/\/+$/, "")}${TWILIO_WEBHOOK_PATH}`
}
