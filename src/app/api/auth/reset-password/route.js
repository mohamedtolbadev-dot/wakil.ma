import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/response"
import bcrypt from "bcryptjs"

// POST /api/auth/reset-password
// Body: { token, password }
export async function POST(request) {
  try {
    const { token, password } = await request.json()

    if (!token || typeof token !== "string") {
      return errorResponse("رمز الإعادة مفقود أو غير صالح", 400)
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return errorResponse("كلمة السر يجب أن تكون 8 أحرف على الأقل", 400)
    }

    // البحث عن token صالح
    const resetRecord = await prisma.verificationToken.findFirst({
      where: {
        code: token,
        phone: { startsWith: "reset:" },
        expiresAt: { gt: new Date() },
      },
    })

    if (!resetRecord) {
      return errorResponse("رمز الإعادة منتهي أو غير صالح", 400)
    }

    let parsedData
    try {
      parsedData = JSON.parse(resetRecord.data)
    } catch {
      return errorResponse("بيانات الرمز فاسدة", 400)
    }

    if (parsedData?.type !== "password_reset" || !parsedData?.userId) {
      return errorResponse("نوع الرمز غير صالح", 400)
    }

    // التحقق من وجود المستخدم
    const user = await prisma.user.findUnique({
      where: { id: parsedData.userId },
      select: { id: true, email: true },
    })

    if (!user) {
      return errorResponse("المستخدم غير موجود", 404)
    }

    // تحديث كلمة السر
    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      // حذف الـ token المستعمل
      prisma.verificationToken.delete({
        where: { id: resetRecord.id },
      }),
      // حذف أي tokens أخرى لنفس المستخدم
      prisma.verificationToken.deleteMany({
        where: { phone: `reset:${user.id}` },
      }),
    ])

    console.log(`✅ [reset-password] Password reset for user ${user.id.slice(0, 6)}...`)

    return successResponse({
      message: "تم تحديث كلمة السر بنجاح. يمكنك الآن تسجيل الدخول.",
    })
  } catch (error) {
    console.error("POST reset-password error:", error.message)
    return errorResponse("خطأ في إعادة تعيين كلمة السر", 500)
  }
}
