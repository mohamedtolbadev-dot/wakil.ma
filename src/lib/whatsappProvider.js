import { sendTwilioWhatsAppMessage, sendWhatsAppMessage } from "@/lib/whatsapp"

export function hasAgentWhatsAppConfig(agent) {
  if (!agent) return false
  return agent.waProvider === "twilio"
    ? Boolean(agent.twilioAccountSid && agent.twilioAuthToken && agent.twilioPhoneNumber)
    : Boolean(agent.whatsappPhoneId && agent.whatsappToken)
}

export async function sendAgentWhatsAppMessage(agent, {
  to,
  message = "",
  type = "text",
  document = null,
  mediaUrl = null,
  ...options
}) {
  if (agent?.waProvider === "twilio") {
    const resolvedMediaUrl = mediaUrl ||
      document?.link ||
      options.videoUrl ||
      (type === "image" && /^https?:\/\//i.test(message) ? message : null)

    if (["image", "document", "video"].includes(type) && !resolvedMediaUrl) {
      return { success: false, error: "Twilio requires a public media URL" }
    }
    if (type === "audio") {
      return { success: false, error: "Twilio audio upload is not supported" }
    }

    return sendTwilioWhatsAppMessage({
      accountSid: agent.twilioAccountSid,
      authToken: agent.twilioAuthToken,
      from: agent.twilioPhoneNumber,
      to,
      message: resolvedMediaUrl && type === "image" && message === resolvedMediaUrl ? "" : message,
      mediaUrl: resolvedMediaUrl,
    })
  }

  return sendWhatsAppMessage({
    phoneId: agent?.whatsappPhoneId,
    token: agent?.whatsappToken,
    to,
    message,
    type,
    document,
    ...options,
  })
}
