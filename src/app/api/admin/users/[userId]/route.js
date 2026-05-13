import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"
import { currentMonthKey, estimateCostUsd, getPlanLimits, getEffectivePlan } from "@/lib/usageLimits"

// GET /api/admin/users/[userId]
export async function GET(request, { params }) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const admin = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { role: true } })
    if (admin?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const resolvedParams = await Promise.resolve(params)
    const { userId } = resolvedParams || {}
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 })

    const month = currentMonthKey()

    const [user, orders, conversations, monthlyUsage] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, email: true, phone: true,
          storeName: true, plan: true, planExpiresAt: true, isActive: true, createdAt: true,
          agent: {
            select: {
              isActive: true,
              whatsappPhoneId: true,
              workHoursEnabled: true,
            },
          },
        },
      }),
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true, customerName: true, customerPhone: true,
          productName: true, quantity: true, totalAmount: true,
          status: true, createdAt: true, address: true, trackingNumber: true,
        },
      }),
      prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true, stage: true,
          isRead: true, updatedAt: true, createdAt: true,
          customer: { select: { name: true, phone: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.monthlyUsage.findUnique({
        where: { userId_month: { userId, month } },
        select: {
          aiReplies: true,
          aiTokensInput: true,
          aiTokensOutput: true,
          conversations: true,
        },
      }),
    ])

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const usage = monthlyUsage || {
      aiReplies: 0,
      aiTokensInput: 0,
      aiTokensOutput: 0,
      conversations: 0,
    }
    const effectivePlan = getEffectivePlan(user)
    const limits = getPlanLimits(effectivePlan)
    const percentUsed = limits.aiReplies > 0
      ? Math.min(100, Math.round((usage.aiReplies / limits.aiReplies) * 100))
      : 0

    return NextResponse.json({
      data: {
        user,
        effectivePlan,
        orders,
        conversations,
        usage: {
          month,
          aiReplies: usage.aiReplies,
          aiTokensInput: usage.aiTokensInput,
          aiTokensOutput: usage.aiTokensOutput,
          conversations: usage.conversations,
          limit: limits.aiReplies,
          percentUsed,
          remaining: Math.max(0, limits.aiReplies - usage.aiReplies),
          costUsd: Number(estimateCostUsd(usage.aiTokensInput, usage.aiTokensOutput).toFixed(4)),
        },
      },
    })
  } catch (error) {
    console.error("GET /api/admin/users/[userId] error:", error)
    return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 })
  }
}
