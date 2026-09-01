import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"
import { successResponse, errorResponse } from "@/lib/response"
import { sendOTPEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rateLimit"
import { randomInt } from "crypto"

function generateOTP() {
  return randomInt(100000, 1000000).toString()
}

export async function POST(request) {
  try {
    const rateLimitResult = rateLimit(request, true)
    if (!rateLimitResult.success) {
      return errorResponse(`fr:Trop de tentatives. Réessayez dans ${Math.ceil(rateLimitResult.retryAfter / 60)} min||ar:حاول مرة أخرى بعد ${Math.ceil(rateLimitResult.retryAfter / 60)} دقيقة`, 429)
    }

    const raw      = await request.json()
    const name     = raw.name?.trim()
    const email    = raw.email?.trim().toLowerCase()
    const password = raw.password
    const mode     = raw.mode || "product"

    if (!name || !email || !password) {
      return errorResponse("fr:Tous les champs sont obligatoires||ar:جميع الحقول مطلوبة", 400)
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return errorResponse("fr:Format d'e-mail invalide||ar:صيغة الإيميل غير صحيحة", 400)
    if (password.length < 8)    return errorResponse("fr:Le mot de passe doit contenir au moins 8 caractères||ar:كلمة المرور يجب أن تكون 8 أحرف على الأقل", 400)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return errorResponse("fr:Cet e-mail est déjà enregistré||ar:الإيميل مسجل مسبقاً", 400)

    const hashedPassword = await hashPassword(password)
    const code           = generateOTP()
    const expiresAt      = new Date(Date.now() + 15 * 60 * 1000)

    // Use email as the identifier in the phone field (normalized for consistency)
    const normalizedEmail = email.toLowerCase()
    await prisma.verificationToken.deleteMany({ where: { phone: normalizedEmail } })
    await prisma.verificationToken.create({
      data: {
        phone: normalizedEmail,
        code,
        data: JSON.stringify({ name, email, hashedPassword, mode }),
        expiresAt,
      },
    })

    await sendOTPEmail({ to: email, code })

    const [localPart, domain] = email.split("@")
    const masked = localPart.slice(0, 2) + "***@" + domain

    const isDev = process.env.NODE_ENV !== "production" && !process.env.EMAIL_USER
    return successResponse({
      masked,
      ...(isDev ? { devCode: code } : {}),
    })
  } catch (error) {
    console.error("send-otp error:", error)
    return errorResponse("fr:Erreur lors de l'envoi du code||ar:خطأ في إرسال رمز التحقق", 500)
  }
}
