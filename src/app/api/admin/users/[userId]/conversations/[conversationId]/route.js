import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSuperAdminFromRequest } from "@/lib/adminAuth"

export async function GET(request, { params }) {
  try {
    const admin = await getSuperAdminFromRequest(request)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams?.userId
    const conversationId = resolvedParams?.conversationId

    if (!userId || !conversationId) {
      return NextResponse.json({ error: "User ID and conversation ID are required" }, { status: 400 })
    }

    const [conversation, relatedOrders] = await Promise.all([
      prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.order.findMany({
        where: { userId, conversationId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          productName: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      }),
    ])

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        ...conversation,
        relatedOrders,
      },
    })
  } catch (error) {
    console.error("GET /api/admin/users/[userId]/conversations/[conversationId] error:", error)
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 })
  }
}
