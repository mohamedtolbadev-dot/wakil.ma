import { getUserFromRequest } from "@/lib/auth"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response"
import { createCampaignTemplate, listCampaignTemplatesForUser } from "@/lib/campaigns/service"
import { requireCampaignsEntitlement } from "@/lib/planGuards"

export async function GET(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const templates = await listCampaignTemplatesForUser(user.id)
    return successResponse({ templates })
  } catch (error) {
    console.error("GET campaign templates error:", error)
    return errorResponse("Failed to load campaign templates", 500)
  }
}

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const campaignAccess = requireCampaignsEntitlement(user)
    if (!campaignAccess.allowed) {
      return errorResponse(campaignAccess.message, 403)
    }

    const payload = await request.json()
    const template = await createCampaignTemplate({ userId: user.id, data: payload })
    return successResponse({ template }, 201)
  } catch (error) {
    console.error("POST campaign templates error:", error)
    return errorResponse(error?.message || "Failed to create campaign template", 400)
  }
}
