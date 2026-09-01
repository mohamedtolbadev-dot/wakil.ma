import { getUserFromRequest } from "@/lib/auth"
import {
  deleteCampaignTemplate,
  updateCampaignTemplate,
} from "@/lib/campaigns/service"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response"
import { requireCampaignsEntitlement } from "@/lib/planGuards"

export async function PATCH(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const campaignAccess = requireCampaignsEntitlement(user)
    if (!campaignAccess.allowed) {
      return errorResponse(campaignAccess.message, 403)
    }

    const { id } = await params
    const payload = await request.json()
    const template = await updateCampaignTemplate({
      userId: user.id,
      templateId: id,
      data: payload,
    })
    return successResponse({ template })
  } catch (error) {
    console.error("PATCH campaign template error:", error)
    return errorResponse(error?.message || "Failed to update campaign template", 400)
  }
}

export async function DELETE(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { id } = await params
    const result = await deleteCampaignTemplate({
      userId: user.id,
      templateId: id,
    })
    return successResponse(result)
  } catch (error) {
    console.error("DELETE campaign template error:", error)
    return errorResponse(error?.message || "Failed to delete campaign template", 400)
  }
}
