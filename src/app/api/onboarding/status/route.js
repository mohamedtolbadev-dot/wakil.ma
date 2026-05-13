import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/response"

// GET /api/onboarding/status
// يرجّع حالة كل خطوة في onboarding
export async function GET(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const [fullUser, agent, productsCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, storeName: true, phone: true },
      }),
      prisma.agent.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          domain: true,
          style: true,
          language: true,
          whatsappPhoneId: true,
          whatsappToken: true,
        },
      }),
      prisma.product.count({ where: { userId: user.id } }),
    ])

    const steps = {
      storeInfo: Boolean(fullUser?.storeName && agent?.name && agent?.domain),
      whatsapp: Boolean(agent?.whatsappPhoneId && agent?.whatsappToken),
      product: productsCount > 0,
    }

    const completed = steps.storeInfo && steps.whatsapp && steps.product

    return successResponse({
      completed,
      steps,
      user: fullUser,
      agent,
      productsCount,
    })
  } catch (error) {
    console.error("GET onboarding status error:", error.message)
    return errorResponse("خطأ في جلب حالة الإعداد", 500)
  }
}
