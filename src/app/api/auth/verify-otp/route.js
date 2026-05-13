import { prisma } from "@/lib/prisma"
import { generateToken } from "@/lib/auth"
import { getEffectivePlan } from "@/lib/billingPlans"
import { successResponse, errorResponse } from "@/lib/response"

export async function POST(request) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) return errorResponse("fr:Données manquantes||ar:بيانات ناقصة", 400)

    const normalizedEmail = email.trim().toLowerCase()
    const record = await prisma.verificationToken.findFirst({
      where: { phone: normalizedEmail, code },
      orderBy: { createdAt: 'desc' }
    })

    if (!record) {
      console.warn(`[verify-otp] No verification record found for email: ${normalizedEmail}`)
      return errorResponse("fr:Code incorrect, réessayez||ar:رمز التحقق غير صحيح", 400)
    }

    if (new Date() > record.expiresAt) {
      await prisma.verificationToken.delete({ where: { id: record.id } })
      return errorResponse("fr:Code expiré. Renvoyez un nouveau code.||ar:انتهت صلاحية الرمز. أعد الإرسال.", 410)
    }

    let parsedData
    try {
      parsedData = JSON.parse(record.data)
    } catch (parseErr) {
      console.error(`[verify-otp] Failed to parse record data for email: ${normalizedEmail}`, parseErr)
      await prisma.verificationToken.delete({ where: { id: record.id } })
      return errorResponse("fr:Données corrompues||ar:بيانات تالفة", 500)
    }
    
    const { name, email: recordEmail, hashedPassword, mode, phone } = parsedData
    const resolvedEmail = (recordEmail || email).toLowerCase().trim()

    const existing = await prisma.user.findUnique({ where: { email: resolvedEmail } })
    if (existing) {
      await prisma.verificationToken.delete({ where: { id: record.id } })
      return errorResponse("fr:Cet e-mail est déjà enregistré||ar:الإيميل مسجل مسبقاً", 400)
    }

    let user
    try {
      user = await prisma.user.create({
        data: {
          name,
          email: resolvedEmail,
          password: hashedPassword,
          phone: phone || null,
          storeName: name.trim(),
          agent: {
            create: {
              name: "Agent",
              domain: "تجارة عامة",
              style: "friendly",
              language: "darija",
              isActive: true,
              // ✅ بدون رسائل مفروضة — التعليمات تأتي من Settings > Instructions personnalisées (Produits)
            },
          },
        },
        include: { agent: true },
      })
    } catch (createErr) {
      console.error(`[verify-otp] Failed to create user for email: ${resolvedEmail}`)
      console.error(`[verify-otp] Error details:`, {
        message: createErr.message,
        code: createErr.code,
        meta: createErr.meta,
      })
      return errorResponse("fr:Erreur lors de la création du compte||ar:خطأ في إنشاء الحساب", 500)
    }

    await prisma.verificationToken.delete({ where: { id: record.id } })

    const token = generateToken(user.id)
    const effectivePlan = getEffectivePlan(user)

    return successResponse({
      token,
      user: {
        id:        user.id,
        name:      user.name,
        email:     user.email,
        storeName: user.storeName,
        plan:      effectivePlan,
        rawPlan:   user.plan,
        planExpiresAt: user.planExpiresAt,
      },
    }, 201)
  } catch (error) {
    console.error("verify-otp error:", error.message, error.code)
    console.error("Stack trace:", error.stack)
    return errorResponse("fr:Erreur lors de la vérification||ar:خطأ في التحقق", 500)
  }
}
