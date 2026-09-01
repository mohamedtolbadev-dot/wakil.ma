import { createHmac, timingSafeEqual } from "crypto"

const TOKEN_VERSION = "v1"

function getSecret() {
  return process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dev-invoice-pdf-secret"
}

function base64url(value) {
  return Buffer.from(value).toString("base64url")
}

function signPayload(payload) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url")
}

export function createInvoicePdfToken({ invoiceId, locale = "fr", expiresInSeconds = 15 * 60 }) {
  const payload = base64url(JSON.stringify({
    v: TOKEN_VERSION,
    invoiceId,
    locale,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  }))
  return `${payload}.${signPayload(payload)}`
}

export function verifyInvoicePdfToken(token, expectedInvoiceId) {
  if (!token || typeof token !== "string") return null

  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null

  const expectedSignature = signPayload(payload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (signatureBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null

  let data
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
  } catch {
    return null
  }

  if (data.v !== TOKEN_VERSION) return null
  if (data.invoiceId !== expectedInvoiceId) return null
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null

  return data
}
