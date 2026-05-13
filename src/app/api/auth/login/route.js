import { prisma } from "@/lib/prisma"
import { comparePassword, generateToken, AUTH_USER_SELECT } from "@/lib/auth"
import { getEffectivePlan } from "@/lib/billingPlans"
import { successResponse, errorResponse } from "@/lib/response"
import { rateLimit } from "@/lib/rateLimit"
import { validators, ValidationError } from "@/lib/validation"

export async function POST(request) {
  try {
    // Rate limiting - 10 attempts per 15 minutes
    const rateLimitResult = rateLimit(request, true)
    if (!rateLimitResult.success) {
      return errorResponse(`تم تجاوز الحد المسموح به. حاول مرة أخرى بعد ${Math.ceil(rateLimitResult.retryAfter / 60)} دقيقة`, 429)
    }

    const raw = await request.json()

    // ✅ Validation على email و password
    let email, password
    try {
      email = validators.email(raw.email)
      password = raw.password
      if (!password || typeof password !== 'string') {
        return errorResponse("كلمة المرور مطلوبة", 400)
      }
      // منع bcrypt DoS
      if (password.length > 128) {
        return errorResponse("كلمة المرور طويلة جداً", 400)
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        return errorResponse(err.message, 400)
      }
      throw err
    }

    // البحث عن المستخدم
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        ...AUTH_USER_SELECT,
        password: true,
      }
    })

    if (!user) {
      return errorResponse("الإيميل أو كلمة المرور غير صحيحة", 401)
    }

    // التحقق من كلمة المرور
    const isValid = await comparePassword(password, user.password)
    if (!isValid) {
      return errorResponse("الإيميل أو كلمة المرور غير صحيحة", 401)
    }

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
        role:      user.role,
        agent: user.agent ? {
          id:       user.agent.id,
          name:     user.agent.name,
          isActive: user.agent.isActive,
        } : null,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    // رسائل مختلفة حسب نوع الخطأ
    if (error.code === "P2021") {
      return errorResponse("قاعدة البيانات غير متوفرة", 503)
    }
    if (error.code === "ECONNREFUSED") {
      return errorResponse("مشكلة في الاتصال بالسيرفر", 503)
    }
    return errorResponse("حدث خطأ غير متوقع", 500)
  }
}
