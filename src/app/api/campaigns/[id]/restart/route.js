import { getUserFromRequest } from "@/lib/auth"
import { restartCampaign } from "@/lib/campaigns/dispatcher"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response"

export async function POST(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { id } = await params
    const campaign = await restartCampaign({ campaignId: id, userId: user.id })
    return successResponse({ campaign })
  } catch (error) {
    console.error("POST campaign restart error:", error)
    return errorResponse(error?.message || "Failed to restart campaign", 400)
  }
}
