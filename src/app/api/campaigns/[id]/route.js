import { getUserFromRequest } from "@/lib/auth"
import { clampBatchSize } from "@/lib/campaigns/helpers"
import { getCampaignById } from "@/lib/campaigns/service"
import { prisma } from "@/lib/prisma"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response"

const ALLOWED_STATUS_UPDATES = ["READY", "PAUSED", "CANCELLED"]

export async function GET(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { id } = await params
    const campaign = await getCampaignById({ userId: user.id, campaignId: id })
    if (!campaign) return errorResponse("Campaign not found", 404)
    return successResponse({ campaign })
  } catch (error) {
    console.error("GET campaign detail error:", error)
    return errorResponse("Failed to load campaign", 500)
  }
}

export async function PATCH(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { id } = await params
    const payload = await request.json()

    const existing = await prisma.campaign.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true },
    })

    if (!existing) return errorResponse("Campaign not found", 404)

    const data = {}

    if (payload.name !== undefined) {
      const name = String(payload.name || "").trim()
      if (!name) return errorResponse("Campaign name is required", 400)
      data.name = name
    }

    if (payload.batchSize !== undefined) {
      data.batchSize = clampBatchSize(payload.batchSize)
    }

    if (payload.status !== undefined) {
      const nextStatus = String(payload.status || "").trim().toUpperCase()
      if (!ALLOWED_STATUS_UPDATES.includes(nextStatus)) {
        return errorResponse("Invalid campaign status", 400)
      }
      data.status = nextStatus
    }

    if (!Object.keys(data).length) {
      return errorResponse("No campaign changes provided", 400)
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data,
      include: {
        product: {
          select: { id: true, name: true, category: true },
        },
        template: {
          select: { id: true, name: true, metaTemplateName: true, language: true },
        },
      },
    })

    return successResponse({ campaign })
  } catch (error) {
    console.error("PATCH campaign error:", error)
    return errorResponse(error?.message || "Failed to update campaign", 400)
  }
}

export async function DELETE(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { id } = await params

    const existing = await prisma.campaign.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true },
    })

    if (!existing) return errorResponse("Campaign not found", 404)
    if (existing.status === "RUNNING") {
      return errorResponse("Pause the campaign before deleting it", 400)
    }

    await prisma.campaign.delete({
      where: { id },
    })

    return successResponse({ id })
  } catch (error) {
    console.error("DELETE campaign error:", error)
    return errorResponse(error?.message || "Failed to delete campaign", 400)
  }
}
