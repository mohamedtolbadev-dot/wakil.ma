import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import { successResponse, errorResponse } from "@/lib/response"
import crypto from "crypto"

// POST /api/auth/forgot-password
// Body: { email }
// Response: successResponse (موحّد — ما يفضحش إذا الحساب موجود)
export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return errorResponse("البريد الإلكتروني مطلوب", 400)
    }

    const normalizedEmail = email.trim().toLowerCase()

    // البحث عن المستخدم (نرجع نفس الرد دائماً لحماية الخصوصية)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, password: true },
    })

    // ✅ حماية ضد enumeration: نرجع success حتى لو المستخدم ما كاينش
    if (!user) {
      console.log(`🔐 [forgot-password] Unknown email: ${normalizedEmail}`)
      return successResponse({
        message: "إذا كان البريد مسجّلاً، ستصلك رسالة لإعادة التعيين.",
      })
    }

    // المستخدمون المسجّلون عبر Google فقط (بدون password) لا يمكنهم إعادة التعيين
    if (!user.password) {
      console.log(`🔐 [forgot-password] Google-only account: ${normalizedEmail}`)
      return successResponse({
        message: "إذا كان البريد مسجّلاً، ستصلك رسالة لإعادة التعيين.",
      })
    }

    // إنشاء token عشوائي آمن
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // ساعة واحدة

    // حذف أي tokens سابقة لنفس المستخدم
    await prisma.verificationToken.deleteMany({
      where: { phone: `reset:${user.id}` },
    })

    // تخزين token جديد (نستعمل VerificationToken model مع phone prefix "reset:")
    await prisma.verificationToken.create({
      data: {
        phone: `reset:${user.id}`,
        code: token,
        data: JSON.stringify({ userId: user.id, email: user.email, type: "password_reset" }),
        expiresAt,
      },
    })

    // إرسال إيميل
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wakil.ma"
    const resetUrl = `${appUrl}/reset-password?token=${token}`

    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
    })

    if (!emailResult.success) {
      console.error(`❌ [forgot-password] Email send failed:`, emailResult.error)
      // لا نفضح الفشل للعميل
    }

    return successResponse({
      message: "إذا كان البريد مسجّلاً، ستصلك رسالة لإعادة التعيين.",
    })
  } catch (error) {
    console.error("POST forgot-password error:", error.message)
    return errorResponse("خطأ في معالجة الطلب", 500)
  }
}
