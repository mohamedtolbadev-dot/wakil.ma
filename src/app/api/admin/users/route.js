import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"
import { getPlanLimits, currentMonthKey, estimateCostUsd, getEffectivePlan } from "@/lib/usageLimits"

// GET /api/admin/users
export async function GET(request) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const admin = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { role: true } })
    if (admin?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const month = currentMonthKey()

    // Fetch users + this-month usage in parallel
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        storeName: true,
        plan: true,
        planExpiresAt: true,
        isActive: true,
        createdAt: true,
        agent: {
          select: {
            isActive: true,
            whatsappPhoneId: true,
          },
        },
        _count: {
          select: { invoices: true, conversations: true, orders: true },
        },
        monthlyUsage: {
          where: { month },
          select: {
            aiReplies: true,
            aiTokensInput: true,
            aiTokensOutput: true,
            conversations: true,
          },
        },
      },
    })

    // Enrich each user with quota + cost summary
    const enriched = users.map(u => {
      const usage = u.monthlyUsage?.[0] || { aiReplies: 0, aiTokensInput: 0, aiTokensOutput: 0, conversations: 0 }
      const effectivePlan = getEffectivePlan(u)
      const limits = getPlanLimits(effectivePlan)
      const costUsd = estimateCostUsd(usage.aiTokensInput, usage.aiTokensOutput)
      const percentUsed = limits.aiReplies > 0
        ? Math.min(100, Math.round((usage.aiReplies / limits.aiReplies) * 100))
        : 0

      // Drop raw relation, attach flat summary
      const { monthlyUsage, ...rest } = u
      return {
        ...rest,
        effectivePlan,
        usage: {
          month,
          aiReplies:      usage.aiReplies,
          aiTokensInput:  usage.aiTokensInput,
          aiTokensOutput: usage.aiTokensOutput,
          costUsd:        Number(costUsd.toFixed(4)),
          limit:          limits.aiReplies,
          percentUsed,
        },
      }
    })

    // Platform totals for the superadmin header strip
    const totals = enriched.reduce((acc, u) => {
      acc.users += 1
      acc.aiReplies     += u.usage.aiReplies
      acc.aiTokensInput += u.usage.aiTokensInput
      acc.aiTokensOutput += u.usage.aiTokensOutput
      acc.costUsd       += u.usage.costUsd
      acc.conversations += u._count.conversations
      acc.orders        += u._count.orders
      if (u.usage.percentUsed >= 80) acc.nearQuota += 1
      if (u.usage.percentUsed >= 100) acc.overQuota += 1
      return acc
    }, {
      users: 0, aiReplies: 0, aiTokensInput: 0, aiTokensOutput: 0,
      costUsd: 0, conversations: 0, orders: 0, nearQuota: 0, overQuota: 0,
    })
    totals.costUsd = Number(totals.costUsd.toFixed(4))

    return NextResponse.json({ data: enriched, totals, month })
  } catch (error) {
    console.error("GET /api/admin/users error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

// DELETE /api/admin/users?id=xxx
export async function DELETE(request) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const admin = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { role: true } })
    if (admin?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 })

    if (userId === decoded.userId) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })

    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("DELETE /api/admin/users error:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
