import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response"
import { checkAIQuota, getPlanLimits, currentMonthKey, estimateCostUsd, getEffectivePlan } from "@/lib/usageLimits"

export const dynamic = "force-dynamic"

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return unauthorizedResponse()

    const plan = getEffectivePlan(user)
    const quota = await checkAIQuota(user.id, plan, { applySideEffects: false })

    const costUsd = estimateCostUsd(quota.usage.aiTokensInput, quota.usage.aiTokensOutput)

    return successResponse({
      plan,
      rawPlan: user.plan || "FREE",
      planExpiresAt: user.planExpiresAt,
      planLabel: getPlanLimits(plan).label,
      month: currentMonthKey(),
      usage: {
        aiReplies:      quota.usage.aiReplies,
        aiTokensInput:  quota.usage.aiTokensInput,
        aiTokensOutput: quota.usage.aiTokensOutput,
        conversations:  quota.usage.conversations,
        estimatedCostUsd: Number(costUsd.toFixed(4)),
      },
      limits: quota.limits,
      remaining: quota.remaining,
      percentUsed: quota.limits.aiReplies > 0
        ? Math.min(100, Math.round((quota.usage.aiReplies / quota.limits.aiReplies) * 100))
        : 0,
      allowed: quota.allowed,
    })
  } catch (err) {
    console.error("GET /api/usage/me error:", err?.message)
    return errorResponse("خطأ في جلب بيانات الاستخدام", 500)
  }
}
