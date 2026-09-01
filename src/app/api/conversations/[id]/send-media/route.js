import { prisma } from "@/lib/prisma"
import { uploadWhatsAppMedia, sendWhatsAppMessage } from "@/lib/whatsapp"
import { getUserFromRequest } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response"
import { rateLimit } from "@/lib/rateLimit"
import { decryptAgentSecrets } from "@/lib/secretCrypto"

function normalizePhoneForWhatsApp(phone) {
  if (!phone) return null
  let normalized = phone.replace(/\D/g, "")
  if (normalized.startsWith("0")) normalized = "212" + normalized.substring(1)
  if (!normalized.startsWith("212") && normalized.length === 9) normalized = "212" + normalized
  if (normalized.startsWith("33") && normalized.length === 11) return normalized
  if (normalized.startsWith("1") && normalized.length === 11) return normalized
  return normalized
}

// WhatsApp supported MIME types
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_IMAGE_SIZE = 5 * 1024 * 1024    // 5MB
const MAX_DOC_SIZE = 100 * 1024 * 1024    // 100MB

export const dynamic = "force-dynamic"

export async function POST(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  // ✅ Rate limiting — media messages are expensive (slower rate than text)
  const rateLimitResult = rateLimit(request)
  if (!rateLimitResult.success) {
    return errorResponse(
      `تم تجاوز الحد. حاول بعد ${Math.ceil(rateLimitResult.retryAfter / 60)} دقيقة`,
      429
    )
  }

  try {
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams || {}
    if (!id) return errorResponse("معرف المحادثة غير صالح", 400)

    // Detect request type: JSON (Cloudinary URL) vs FormData (direct file)
    const contentType = request.headers.get("content-type") || ""
    const isJsonRequest = contentType.includes("application/json")

    let mediaType, fileName, mediaUrl, file, fileType

    if (isJsonRequest) {
      // ── PATH A: Large file uploaded to Cloudinary first ──
      const body = await request.json()
      mediaUrl = body.mediaUrl
      mediaType = body.type
      fileName = body.fileName || "file"

      if (!mediaUrl || !mediaUrl.startsWith("https://")) {
        return errorResponse("رابط الملف غير صالح", 400)
      }
      if (!mediaType || !["image", "document"].includes(mediaType)) {
        return errorResponse("نوع الملف غير صالح", 400)
      }
      console.log(`📤 Sending ${mediaType} via URL: "${fileName}"`)
    } else {
      // ── PATH B: Small file sent directly via FormData ──
      const formData = await request.formData()
      file = formData.get("file")
      mediaType = formData.get("type")

      if (!file) return errorResponse("الملف مطلوب", 400)
      if (!mediaType || !["image", "document"].includes(mediaType)) {
        return errorResponse("Invalid media type (image or document)", 400)
      }

      fileType = file.type || "application/octet-stream"
      fileName = file.name || "file"

      if (mediaType === "image") {
        if (!IMAGE_TYPES.includes(fileType)) {
          return errorResponse("صيغة الصورة غير مدعومة (JPG, PNG, WebP فقط)", 400)
        }
        if (file.size > MAX_IMAGE_SIZE) {
          return errorResponse("حجم الصورة يتجاوز 5MB", 400)
        }
      } else if (mediaType === "document") {
        if (file.size > MAX_DOC_SIZE) {
          return errorResponse("حجم المستند يتجاوز 100MB", 400)
        }
      }
      console.log(`📤 Uploading ${mediaType}: "${fileName}" (${fileType}, ${(file.size / 1024).toFixed(0)} KB)`)
    }

    // Fetch conversation + agent in parallel
    const [conversation, rawAgent] = await Promise.all([
      prisma.conversation.findFirst({
        where: { id, userId: user.id },
        include: { customer: true },
      }),
      prisma.agent.findUnique({ where: { userId: user.id } }),
    ])
    const agent = decryptAgentSecrets(rawAgent)
    if (!conversation) return errorResponse("المحادثة غير موجودة", 404)
    if (!agent) return errorResponse("Agent غير موجود", 404)
    if (!agent.whatsappPhoneId || !agent.whatsappToken) {
      return errorResponse("إعدادات واتساب غير مكتملة", 400)
    }
    if (!conversation.customer?.phone) {
      return errorResponse("رقم هاتف العميل غير متوفر", 400)
    }

    const normalizedPhone = normalizePhoneForWhatsApp(conversation.customer.phone)
    if (!normalizedPhone) return errorResponse("رقم هاتف العميل غير صالح", 400)

    // ── Send via WhatsApp ──
    let sentResult
    let mediaId = null  // ✅ Declare mediaId at top level for both paths

    if (mediaUrl) {
      // URL path — send Cloudinary link directly to WhatsApp (no upload needed)
      if (mediaType === "image") {
        sentResult = await sendWhatsAppMessage({
          phoneId: agent.whatsappPhoneId, token: agent.whatsappToken,
          to: normalizedPhone, type: "image", message: mediaUrl,
        })
      } else {
        sentResult = await sendWhatsAppMessage({
          phoneId: agent.whatsappPhoneId, token: agent.whatsappToken,
          to: normalizedPhone, type: "document",
          document: { link: mediaUrl, filename: fileName },
        })
      }
    } else {
      // File path — upload to WhatsApp Media first, then send
      const buffer = Buffer.from(await file.arrayBuffer())
      if (!buffer || buffer.length < 100) {
        return errorResponse("الملف فارغ أو غير صالح", 400)
      }

      const uploadResult = await uploadWhatsAppMedia({
        phoneId: agent.whatsappPhoneId, token: agent.whatsappToken,
        fileBuffer: buffer, filename: fileName, mimeType: fileType,
      })
      if (!uploadResult.success || !uploadResult.mediaId) {
        const errMsg = uploadResult.error?.error?.message || "فشل رفع الملف"
        console.error("❌ Media upload failed:", errMsg)
        return errorResponse(errMsg, 500)
      }

      mediaId = uploadResult.mediaId  // ✅ Use existing mediaId variable
      console.log(`✅ Media uploaded (ID: ${mediaId})`)

      if (mediaType === "image") {
        sentResult = await sendWhatsAppMessage({
          phoneId: agent.whatsappPhoneId, token: agent.whatsappToken,
          to: normalizedPhone, type: "image", imageId: mediaId,
        })
      } else {
        sentResult = await sendWhatsAppMessage({
          phoneId: agent.whatsappPhoneId, token: agent.whatsappToken,
          to: normalizedPhone, type: "document",
          document: { id: mediaId, filename: fileName },
        })
      }
    }

    if (!sentResult.success) {
      const errMsg = sentResult.error?.error?.message || "فشل إرسال الملف"
      console.error("❌ WhatsApp send failed:", errMsg)
      return errorResponse(errMsg, 500)
    }

    console.log(`✅ ${mediaType} sent to WhatsApp`)

    // Save to DB
    const content = mediaType === "image"
      ? mediaUrl ? `[صورة] ${mediaUrl}` : "[صورة]"
      : mediaUrl ? `[مستند: ${fileName}] ${mediaUrl}` : `[مستند: ${fileName}]`

    const [saved] = await Promise.all([
      prisma.message.create({
        data: { 
          conversationId: id, 
          role: "AGENT", 
          content,
          whatsappMediaId: mediaId || null  // Save mediaId for uploaded media
        }
      }),
      prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ])

    return successResponse(saved, 201)
  } catch (error) {
    console.error("❌ send-media error:", error?.message)
    return errorResponse("خطأ في إرسال الملف", 500)
  }
}
