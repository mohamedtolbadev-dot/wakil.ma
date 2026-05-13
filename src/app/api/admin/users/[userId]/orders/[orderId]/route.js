import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSuperAdminFromRequest } from "@/lib/adminAuth"

export async function GET(request, { params }) {
  try {
    const admin = await getSuperAdminFromRequest(request)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams?.userId
    const orderId = resolvedParams?.orderId

    if (!userId || !orderId) {
      return NextResponse.json({ error: "User ID and order ID are required" }, { status: 400 })
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            tag: true,
            totalSpent: true,
            ordersCount: true,
            lastSeen: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ data: order })
  } catch (error) {
    console.error("GET /api/admin/users/[userId]/orders/[orderId] error:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}
