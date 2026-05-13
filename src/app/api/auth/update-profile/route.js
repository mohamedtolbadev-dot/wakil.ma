import { getUserFromRequest } from "@/lib/auth"
import { successResponse, unauthorizedResponse, errorResponse } from "@/lib/response"
import { prisma } from "@/lib/prisma"

export async function PUT(request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const { name, email, phone } = body

    // Validate required fields
    if (!name || !email) {
      return errorResponse("الاسم والبريد مطلوبان", 400)
    }

    // Check if email is already taken (if changed)
    if (email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })
      if (existingUser) {
        return errorResponse("البريد الإلكتروني مستخدم بالفعل", 400)
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
        phone: phone || null,
      }
    })

    return successResponse({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      plan: updatedUser.plan
    })
  } catch (err) {
    console.error("Error updating profile:", err)
    return errorResponse("خطأ في تحديث البيانات", 500)
  }
}

// PATCH — partial profile update (used by onboarding)
export async function PATCH(request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const data = {}

    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
    if (typeof body.storeName === "string" && body.storeName.trim()) data.storeName = body.storeName.trim()
    if (typeof body.phone === "string") data.phone = body.phone.trim() || null

    if (typeof body.email === "string" && body.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: body.email } })
      if (existing) return errorResponse("البريد الإلكتروني مستخدم بالفعل", 400)
      data.email = body.email
    }

    if (Object.keys(data).length === 0) {
      return errorResponse("لا يوجد حقول للتحديث", 400)
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true, name: true, email: true, phone: true, storeName: true, plan: true,
      },
    })

    return successResponse(updated)
  } catch (err) {
    console.error("PATCH update-profile error:", err)
    return errorResponse("خطأ في تحديث البيانات", 500)
  }
}
