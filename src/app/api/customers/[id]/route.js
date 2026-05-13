import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import {
  successResponse,
  errorResponse,
  unauthorizedResponse
} from "@/lib/response"

export async function GET(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  const resolvedParams = await Promise.resolve(params)
  const { id } = resolvedParams || {}
  if (!id) return errorResponse("معرف الزبون غير صالح", 400)

  try {
    const customer = await prisma.customer.findFirst({
      where: { id, userId: user.id },
      include: {
        conversations: {
          orderBy: { updatedAt: "desc" },
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            }
          }
        },
      }
    })

    if (!customer) {
      return errorResponse("الزبون غير موجود", 404)
    }

    // Some legacy records may not have customerId set; fallback to customerPhone match.
    const orders = await prisma.order.findMany({
      where: {
        userId: user.id,
        OR: [
          { customerId: id },
          { customerPhone: customer.phone },
        ],
      },
      orderBy: { createdAt: "desc" },
    })

    return successResponse({ ...customer, orders })
  } catch (error) {
    console.error("GET customer error:", error)
    return errorResponse("خطأ في جلب الزبون", 500)
  }
}

export async function DELETE(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  const resolvedParams = await Promise.resolve(params)
  const { id } = resolvedParams || {}
  if (!id) return errorResponse("معرف الزبون غير صالح", 400)

  try {
    // Verify ownership before any destructive operation
    const customer = await prisma.customer.findFirst({
      where: { id, userId: user.id }
    })
    if (!customer) return errorResponse("الزبون غير موجود", 404)

    // Get short ID for safe logging
    const shortId = id.slice(-6)
    console.log(`🗑️ [DELETE] Starting deletion for customer: ${shortId}`)

    // Get conversation IDs first
    const convIds = (await prisma.conversation.findMany({
      where: { customerId: id },
      select: { id: true }
    })).map(c => c.id)

    // ✅ Atomic transaction: all succeed or all rollback
    const [msgDel, convDel, orderDel, customerDel] = await prisma.$transaction([
      convIds.length > 0
        ? prisma.message.deleteMany({ where: { conversationId: { in: convIds } } })
        : prisma.message.deleteMany({ where: { id: "__none__" } }), // no-op
      prisma.conversation.deleteMany({ where: { customerId: id } }),
      prisma.order.deleteMany({ where: { customerId: id } }),
      prisma.customer.deleteMany({ where: { id, userId: user.id } }),
    ])

    if (customerDel.count === 0) {
      return errorResponse("الزبون غير موجود", 404)
    }
    console.log(`✅ [DELETE] Customer ${shortId} deleted: ${msgDel.count} msgs, ${convDel.count} convs, ${orderDel.count} orders`)

    return successResponse({ deleted: true })
  } catch (error) {
    console.error("DELETE customer error:", error?.message || error)
    return errorResponse("خطأ في حذف الزبون", 500)
  }
}

export async function PATCH(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  const resolvedParams = await Promise.resolve(params)
  const { id } = resolvedParams || {}
  if (!id) return errorResponse("معرف الزبون غير صالح", 400)

  try {
    const { tag } = await request.json()

    // ✅ Tag whitelist validation
    const VALID_TAGS = ["NEW", "REGULAR", "VIP", "PROSPECT"]
    if (tag !== undefined && tag !== null && !VALID_TAGS.includes(tag)) {
      return errorResponse(`الوسم غير صالح. القيم المسموحة: ${VALID_TAGS.join(", ")}`, 400)
    }

    // Verify ownership
    const customer = await prisma.customer.findFirst({
      where: { id, userId: user.id }
    })
    if (!customer) {
      return errorResponse("الزبون غير موجود", 404)
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { tag }
    })

    return successResponse(updated)
  } catch (error) {
    console.error("PATCH customer error:", error?.message || error)
    return errorResponse("خطأ في تحديث الزبون", 500)
  }
}
