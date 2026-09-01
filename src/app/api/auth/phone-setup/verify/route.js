import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { successResponse, errorResponse } from "@/lib/response"
import { normalizePhone } from "@/lib/phone"

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return errorResponse("fr:Non autorisé||ar:غير مصرح", 401)

    const { phone: rawPhone, code } = await request.json()
    const phone = normalizePhone(rawPhone)
    if (!phone || !code) return errorResponse("fr:Données manquantes||ar:بيانات ناقصة", 400)

    const record = await prisma.verificationToken.findFirst({
      where: { phone, code },
    })

    if (!record) return errorResponse("fr:Code incorrect, réessayez||ar:رمز التحقق غير صحيح", 400)

    if (new Date() > record.expiresAt) {
      await prisma.verificationToken.delete({ where: { id: record.id } })
      return errorResponse("fr:Code expiré. Renvoyez un nouveau code.||ar:انتهت صلاحية الرمز. أعد الإرسال.", 410)
    }

    const { userId } = JSON.parse(record.data)
    if (userId !== user.id) return errorResponse("fr:Code non valide||ar:رمز التحقق غير صالح", 400)

    await prisma.user.update({
      where: { id: user.id },
      data:  { phone },
    })

    await prisma.verificationToken.delete({ where: { id: record.id } })

    return successResponse({ phone })
  } catch (error) {
    console.error("phone-setup/verify error:", error)
    return errorResponse("fr:Erreur lors de la vérification||ar:خطأ في التحقق", 500)
  }
}
