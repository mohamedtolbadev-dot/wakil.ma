import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { successResponse, errorResponse } from "@/lib/response"
import { sendWhatsAppOTPTemplate } from "@/lib/whatsapp"
import { rateLimit } from "@/lib/rateLimit"
import { normalizePhone } from "@/lib/phone"

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request) {
  try {
    const rateLimitResult = rateLimit(request, true)
    if (!rateLimitResult.success) {
      return errorResponse(`fr:Trop de tentatives. Réessayez dans ${Math.ceil(rateLimitResult.retryAfter / 60)} min||ar:حاول مرة أخرى بعد ${Math.ceil(rateLimitResult.retryAfter / 60)} دقيقة`, 429)
    }

    const user = await getUserFromRequest(request)
    if (!user) return errorResponse("fr:Non autorisé||ar:غير مصرح", 401)

    const { phone: rawPhone } = await request.json()
    const phone = normalizePhone(rawPhone)
    if (!phone) return errorResponse("fr:Numéro de téléphone requis||ar:رقم الهاتف مطلوب", 400)
    if (phone.replace(/\D/g, "").length < 7) return errorResponse("fr:Numéro de téléphone invalide||ar:رقم الهاتف غير صحيح", 400)

    const code      = generateOTP()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.verificationToken.deleteMany({ where: { phone } })
    await prisma.verificationToken.create({
      data: {
        phone,
        code,
        data: JSON.stringify({ userId: user.id }),
        expiresAt,
      },
    })

    const phoneId = process.env.SYSTEM_WA_PHONE_ID || process.env.WHATSAPP_PHONE_ID
    const token   = process.env.SYSTEM_WA_TOKEN || process.env.WHATSAPP_TOKEN

    if (phoneId && token) {
      await sendWhatsAppOTPTemplate({ phoneId, token, to: phone, code })
    } else {
      console.warn("⚠️ SYSTEM_WA credentials not configured")
    }

    const masked =
      phone.slice(0, 4) +
      phone.slice(4, -3).replace(/\d/g, "X") +
      phone.slice(-3)

    return successResponse({
      masked,
      ...(process.env.NODE_ENV !== "production" && !phoneId ? { devCode: code } : {}),
    })
  } catch (error) {
    console.error("phone-setup/send error:", error)
    return errorResponse("fr:Erreur lors de l'envoi du code||ar:خطأ في إرسال رمز التحقق", 500)
  }
}
