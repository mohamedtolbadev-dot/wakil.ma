import { getUserFromRequest } from "@/lib/auth"
import { successResponse, unauthorizedResponse } from "@/lib/response"
import { getEffectivePlan } from "@/lib/billingPlans"

export async function GET(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()
  const effectivePlan = getEffectivePlan(user)

  return successResponse({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    storeName: user.storeName,
    plan: effectivePlan,
    rawPlan: user.plan,
    planExpiresAt: user.planExpiresAt,
    createdAt: user.createdAt,
    role: user.role,
    agent: user.agent ? {
      id: user.agent.id,
      name: user.agent.name,
      domain: user.agent.domain,
      style: user.agent.style,
      language: user.agent.language,
      isActive: user.agent.isActive,
    } : null,
  })
}
