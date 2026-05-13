import { parseVariableList } from "./helpers"
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp"

export async function sendCampaignTemplateMessage({ agent, template, recipient }) {
  const bodyVariableKeys = parseVariableList(template?.bodyVariables)
  const bodyParameters = bodyVariableKeys.map((key) => recipient.variablesJson?.[key] || "")

  return sendWhatsAppTemplateMessage({
    phoneId: agent.whatsappPhoneId,
    token: agent.whatsappToken,
    to: recipient.phone,
    templateName: template.metaTemplateName,
    language: template.language || "fr",
    bodyParameters,
  })
}
