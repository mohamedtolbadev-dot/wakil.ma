// app/api/auth/register/route.js
import { prisma } from "@/lib/prisma"
import { hashPassword, generateToken } from "@/lib/auth"
import { getEffectivePlan } from "@/lib/billingPlans"
import { successResponse, errorResponse } from "@/lib/response"
import { rateLimit } from "@/lib/rateLimit"

export async function POST(request) {
  try {
    // ✅ Rate limiting
    const rateLimitResult = rateLimit(request, true)
    if (!rateLimitResult.success) {
      return errorResponse(
        `تم تجاوز الحد المسموح به. حاول مرة أخرى بعد ${Math.ceil(rateLimitResult.retryAfter / 60)} دقيقة`,
        429
      )
    }

    const raw      = await request.json()
    const name     = raw.name?.trim()
    const email    = raw.email?.trim().toLowerCase()
    const password = raw.password
    const phone    = raw.phone?.trim() || undefined
    const mode     = raw.mode || "product"

    // ✅ التحقق من الحقول المطلوبة
    if (!name || !email || !password) {
      return errorResponse("كل الحقول مطلوبة", 400)
    }

    // ✅ التحقق من صحة الإيميل
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return errorResponse("صيغة الإيميل غير صحيحة", 400)
    }

    // ✅ التحقق من قوة كلمة المرور
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!strongPassword.test(password)) {
      return errorResponse(
        "كلمة المرور: 8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم",
        400
      )
    }

    // ✅ التحقق من عدم وجود الإيميل — 409 Conflict
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return errorResponse("الإيميل مسجل مسبقاً", 409)
    }

    const hashedPassword = await hashPassword(password)

    // ✅ storeName قابل للتخصيص
    const storeName = raw.storeName?.trim() || name

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        storeName,
        agent: {
          create: {
            name: "Agent",
            domain: "تجارة عامة",
            style: "friendly",
            language: "darija",
            isActive: true,
            mode,
          },
        },
      },
      include: { agent: true },
    })

    const token       = generateToken(user.id)
    const effectivePlan = getEffectivePlan(user)

    return successResponse({
      token,
      user: {
        id:            user.id,
        name:          user.name,
        email:         user.email,
        storeName:     user.storeName,
        plan:          effectivePlan,
        rawPlan:       user.plan,
        planExpiresAt: user.planExpiresAt,
      },
    }, 201)
  } catch (error) {
    console.error("Register error:", error)
    return errorResponse("خطأ في التسجيل", 500)
  }
}