import { getUserFromRequest } from "@/lib/auth"
import { restartCampaign } from "@/lib/campaigns/dispatcher"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response"
import { requireCampaignsEntitlement } from "@/lib/planGuards"

export async function POST(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const campaignAccess = requireCampaignsEntitlement(user)
    if (!campaignAccess.allowed) {
      return errorResponse(campaignAccess.message, 403)
    }

    const { id } = await params
    const campaign = await restartCampaign({ campaignId: id, userId: user.id })
    return successResponse({ campaign })
  } catch (error) {
    console.error("POST campaign restart error:", error)
    return errorResponse(error?.message || "Failed to restart campaign", 400)
  }
}
