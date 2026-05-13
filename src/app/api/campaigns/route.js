import { getUserFromRequest } from "@/lib/auth"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response"
import { createCampaign, listCampaignsForUser } from "@/lib/campaigns/service"

export async function GET(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const campaigns = await listCampaignsForUser(user.id)
    return successResponse({ campaigns })
  } catch (error) {
    console.error("GET campaigns error:", error)
    return errorResponse("Failed to load campaigns", 500)
  }
}

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const payload = await request.json()

    if (!payload?.audienceType || !payload?.templateId) {
      return errorResponse("Audience type and template are required", 400)
    }

    const campaign = await createCampaign({ user, data: payload })
    return successResponse({ campaign }, 201)
  } catch (error) {
    console.error("POST campaigns error:", error)
    return errorResponse(error?.message || "Failed to create campaign", 400)
  }
}
