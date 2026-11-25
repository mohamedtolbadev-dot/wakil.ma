export const META_GRAPH_API_VERSION = "v27.0"

const configuredApiUrl = String(process.env.WHATSAPP_API_URL || "")
  .trim()
  .replace(/\/+$/, "")

const graphApiBaseUrl = configuredApiUrl
  ? configuredApiUrl.replace(/\/v\d+(?:\.\d+)?$/i, "")
  : "https://graph.facebook.com"

export const META_GRAPH_API_URL = `${graphApiBaseUrl}/${META_GRAPH_API_VERSION}`
