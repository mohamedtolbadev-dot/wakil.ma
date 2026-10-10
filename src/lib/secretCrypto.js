import crypto from "crypto"

const ENCRYPTION_PREFIX = "enc:v1:"
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function getEncryptionSecret() {
  return process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || null
}

function deriveKey(secret) {
  return crypto.createHash("sha256").update(String(secret)).digest()
}

function toBase64Url(buffer) {
  return Buffer.from(buffer).toString("base64url")
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url")
}

export function isEncryptedSecret(value) {
  return typeof value === "string" && value.startsWith(ENCRYPTION_PREFIX)
}

export function encryptSecret(value) {
  if (value === undefined) return undefined
  if (value === null || value === "") return null

  const plainText = String(value)
  if (isEncryptedSecret(plainText)) return plainText

  const secret = getEncryptionSecret()
  if (!secret) return plainText

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(secret), iv)
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    ENCRYPTION_PREFIX,
    toBase64Url(iv),
    toBase64Url(authTag),
    toBase64Url(encrypted),
  ].join(".")
}

export function decryptSecret(value) {
  if (!value || typeof value !== "string") return value || null
  if (!isEncryptedSecret(value)) return value

  const secret = getEncryptionSecret()
  if (!secret) return null

  try {
    const [, ivPart, tagPart, encryptedPart] = value.split(".")
    if (!ivPart || !tagPart || !encryptedPart) return null

    const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(secret), fromBase64Url(ivPart))
    decipher.setAuthTag(fromBase64Url(tagPart))
    const decrypted = Buffer.concat([
      decipher.update(fromBase64Url(encryptedPart)),
      decipher.final(),
    ])

    return decrypted.toString("utf8")
  } catch {
    return null
  }
}

export function decryptAgentSecrets(agent) {
  if (!agent) return agent
  return {
    ...agent,
    whatsappToken:    decryptSecret(agent.whatsappToken),
    twilioAuthToken:  decryptSecret(agent.twilioAuthToken),
  }
}
