import { getUserFromRequest } from "@/lib/auth"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response"
import { previewCampaignAudience } from "@/lib/campaigns/service"

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const payload = await request.json()
    if (!payload?.audienceType) {
      return errorResponse("Audience type is required", 400)
    }

    const preview = await previewCampaignAudience({ user, data: payload })
    return successResponse(preview)
  } catch (error) {
    console.error("POST campaigns preview error:", error)
    return errorResponse(error?.message || "Failed to preview campaign", 400)
  }
}
