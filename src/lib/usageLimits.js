import { prisma } from "@/lib/prisma"
import { BILLING_PLANS, getBillingPlan, getEffectivePlan } from "@/lib/billingPlans"

export const PLAN_LIMITS = {
  ...Object.fromEntries(
    Object.entries(BILLING_PLANS).map(([key, plan]) => [
      key,
      {
        aiReplies: plan.aiReplies,
        dailyHardCap: plan.dailyHardCap,
        label: plan.label,
      },
    ])
  ),
}

const MODEL_PRICING_USD_PER_1M = {
  // 🎯 PRIMARY: GPT-4o-mini via OpenAI (economic, good for most use cases)
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  // 🔄 ALTERNATIVE: Claude 3.5 Sonnet via OpenRouter (better Darija, more expensive)
  // "anthropic/claude-3.5-sonnet": { input: 3.00, output: 15.00 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4.1-mini": { input: 0.40, output: 1.60 },
  "gpt-4.1": { input: 2.00, output: 8.00 },
}

export function getPlanLimits(plan) {
  const billingPlan = getBillingPlan(plan)
  return PLAN_LIMITS[billingPlan.key] || PLAN_LIMITS.FREE
}

export { getEffectivePlan }

export function currentMonthKey(date = new Date()) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function getMonthDateRange(month = currentMonthKey()) {
  const [year, monthNumber] = String(month).split("-").map(Number)
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  }
}

async function createQuotaNotificationOnce({ userId, month, title, message }) {
  const { start, end } = getMonthDateRange(month)
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type: "SYSTEM",
      title,
      createdAt: { gte: start, lt: end },
    },
    select: { id: true },
  })

  if (existing) return existing

  return prisma.notification.create({
    data: {
      userId,
      type: "SYSTEM",
      title,
      message,
      isRead: false,
    },
  })
}

export async function applyAIQuotaSideEffects({
  userId,
  plan = "FREE",
  usage,
  limits = getPlanLimits(plan),
  month = currentMonthKey(),
}) {
  if (!userId || !usage || !limits?.aiReplies) return

  const used = usage.aiReplies || 0
  const limit = limits.aiReplies
  const percent = Math.floor((used / limit) * 100)

  try {
    if (percent >= 80 && used < limit) {
      await createQuotaNotificationOnce({
        userId,
        month,
        title: "fr:Consommation IA à 80%||ar:استهلاك AI وصل 80%",
        message:
          `fr:Vous avez utilisé ${used}/${limit} réponses IA du plan ${plan}. Pensez à passer au plan supérieur avant l'arrêt automatique.||` +
          `ar:استعملت ${used}/${limit} من ردود AI في خطة ${plan}. من الأفضل ترقي الخطة قبل التوقف التلقائي.`,
      })
    }

    if (used >= limit) {
      await createQuotaNotificationOnce({
        userId,
        month,
        title: "fr:Limite IA mensuelle atteinte||ar:تم بلوغ حد AI الشهري",
        message:
          `fr:Vous avez utilisé ${used}/${limit} réponses IA du plan ${plan}. L'agent IA a été mis en pause automatiquement pour éviter des coûts supplémentaires. Passez à Pro ou attendez le mois prochain.||` +
          `ar:استعملت ${used}/${limit} من ردود AI في خطة ${plan}. تم إيقاف Agent تلقائياً باش نتفادو مصاريف إضافية. رقّي الخطة أو انتظر الشهر القادم.`,
      })

      await prisma.agent.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      })
    }
  } catch (err) {
    console.error("applyAIQuotaSideEffects failed:", err?.message)
  }
}

export async function getCurrentUsage(userId, month = currentMonthKey()) {
  const row = await prisma.monthlyUsage.findUnique({
    where: { userId_month: { userId, month } },
  }).catch(() => null)

  return row || {
    userId,
    month,
    conversations: 0,
    aiReplies: 0,
    aiTokensInput: 0,
    aiTokensOutput: 0,
  }
}

export async function checkAIQuota(userId, plan = "FREE", { applySideEffects = true } = {}) {
  const limits = getPlanLimits(plan)
  const usage = await getCurrentUsage(userId)

  if (usage.aiReplies >= limits.aiReplies) {
    if (applySideEffects) {
      await applyAIQuotaSideEffects({ userId, plan, usage, limits }).catch(() => {})
    }
    return {
      allowed: false,
      reason: "monthly_limit_reached",
      usage,
      limits,
      remaining: 0,
    }
  }

  return {
    allowed: true,
    usage,
    limits,
    remaining: Math.max(0, limits.aiReplies - usage.aiReplies),
  }
}

export async function reserveAIReply({ userId, plan = "FREE" }) {
  if (!userId) return { allowed: false, reason: "missing_user" }

  const month = currentMonthKey()
  const limits = getPlanLimits(plan)

  await prisma.monthlyUsage.upsert({
    where: { userId_month: { userId, month } },
    update: { updatedAt: new Date() },
    create: {
      userId,
      month,
      conversations: 0,
      aiReplies: 0,
      aiTokensInput: 0,
      aiTokensOutput: 0,
    },
  })

  const reserved = await prisma.monthlyUsage.updateMany({
    where: {
      userId,
      month,
      aiReplies: { lt: limits.aiReplies },
    },
    data: {
      aiReplies: { increment: 1 },
    },
  })

  const usage = await getCurrentUsage(userId, month)

  if (reserved.count === 0) {
    await applyAIQuotaSideEffects({ userId, plan, usage, limits, month })
    return {
      allowed: false,
      reason: "monthly_limit_reached",
      usage,
      limits,
      remaining: 0,
    }
  }

  return {
    allowed: true,
    reserved: true,
    usage,
    limits,
    remaining: Math.max(0, limits.aiReplies - usage.aiReplies),
  }
}

export async function releaseAIReplyReservation({ userId, month = currentMonthKey() }) {
  if (!userId) return null

  try {
    await prisma.monthlyUsage.updateMany({
      where: {
        userId,
        month,
        aiReplies: { gt: 0 },
      },
      data: {
        aiReplies: { decrement: 1 },
      },
    })

    return getCurrentUsage(userId, month)
  } catch (err) {
    console.error("releaseAIReplyReservation failed:", err?.message)
    return null
  }
}

export async function recordAIUsage({
  userId,
  promptTokens = 0,
  completionTokens = 0,
  countReply = true,
  applySideEffects = true,
}) {
  if (!userId) return null
  const month = currentMonthKey()

  try {
    const usage = await prisma.monthlyUsage.upsert({
      where: { userId_month: { userId, month } },
      update: {
        ...(countReply ? { aiReplies: { increment: 1 } } : {}),
        aiTokensInput: { increment: promptTokens || 0 },
        aiTokensOutput: { increment: completionTokens || 0 },
      },
      create: {
        userId,
        month,
        aiReplies: countReply ? 1 : 0,
        aiTokensInput: promptTokens || 0,
        aiTokensOutput: completionTokens || 0,
      },
    })

    if (applySideEffects) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, planExpiresAt: true },
      }).catch(() => null)
      const plan = getEffectivePlan(user)
      await applyAIQuotaSideEffects({
        userId,
        plan,
        usage,
        limits: getPlanLimits(plan),
        month,
      })
    }

    return usage
  } catch (err) {
    console.error("recordAIUsage failed:", err?.message)
    return null
  }
}

export function estimateCostUsd(
  promptTokens = 0,
  completionTokens = 0,
  model = process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o"
) {
  const normalizedModel = String(model || "").trim() || "gpt-4o"
  const pricing = MODEL_PRICING_USD_PER_1M[normalizedModel] || MODEL_PRICING_USD_PER_1M["gpt-4o"]

  return (
    promptTokens * (pricing.input / 1_000_000) +
    completionTokens * (pricing.output / 1_000_000)
  )
}
