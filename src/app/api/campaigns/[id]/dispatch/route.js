import { getUserFromRequest } from "@/lib/auth"
import { dispatchCampaignBatch } from "@/lib/campaigns/dispatcher"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response"

export async function POST(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { id } = await params
    const result = await dispatchCampaignBatch({ campaignId: id, userId: user.id })
    return successResponse(result)
  } catch (error) {
    console.error("POST campaign dispatch error:", error)
    return errorResponse(error?.message || "Failed to dispatch campaign", 400)
  }
}
