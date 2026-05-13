import { prisma } from "@/lib/prisma"
import { buildCampaignAudience } from "./segmentBuilder"
import { buildCampaignName, chunkArray, clampBatchSize, normalizeCampaignFilters, parseVariableList } from "./helpers"

export async function listCampaignsForUser(userId) {
  return prisma.campaign.findMany({
    where: { userId },
    include: {
      product: {
        select: { id: true, name: true, category: true },
      },
      template: {
        select: { id: true, name: true, metaTemplateName: true, language: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getCampaignById({ userId, campaignId }) {
  return prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      product: {
        select: { id: true, name: true, category: true, price: true, salePrice: true },
      },
      template: {
        select: {
          id: true,
          name: true,
          metaTemplateName: true,
          language: true,
          bodyVariables: true,
          previewText: true,
        },
      },
      recipients: {
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        take: 50,
      },
    },
  })
}

export async function listCampaignTemplatesForUser(userId) {
  return prisma.campaignTemplate.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  })
}

export async function createCampaignTemplate({ userId, data }) {
  const name = String(data.name || "").trim()
  const metaTemplateName = String(data.metaTemplateName || "").trim()
  const language = String(data.language || "fr").trim()
  const previewText = String(data.previewText || "").trim()
  const bodyVariables = parseVariableList(data.bodyVariables)

  if (!name || !metaTemplateName) {
    throw new Error("Template name and Meta template name are required")
  }

  if (!bodyVariables.length) {
    throw new Error("At least one body variable is required")
  }

  return prisma.campaignTemplate.create({
    data: {
      userId,
      name,
      metaTemplateName,
      language,
      previewText: previewText || null,
      bodyVariables,
      isActive: data.isActive !== false,
    },
  })
}

export async function updateCampaignTemplate({ userId, templateId, data }) {
  const existing = await prisma.campaignTemplate.findFirst({
    where: {
      id: templateId,
      userId,
    },
    select: { id: true },
  })

  if (!existing) {
    throw new Error("Campaign template not found")
  }

  const runningCampaigns = await prisma.campaign.count({
    where: {
      userId,
      templateId,
      status: "RUNNING",
    },
  })

  if (runningCampaigns > 0) {
    throw new Error("Pause running campaigns before editing this template")
  }

  const name = String(data.name || "").trim()
  const metaTemplateName = String(data.metaTemplateName || "").trim()
  const language = String(data.language || "fr").trim()
  const previewText = String(data.previewText || "").trim()
  const bodyVariables = parseVariableList(data.bodyVariables)

  if (!name || !metaTemplateName) {
    throw new Error("Template name and Meta template name are required")
  }

  if (!bodyVariables.length) {
    throw new Error("At least one body variable is required")
  }

  return prisma.campaignTemplate.update({
    where: { id: templateId },
    data: {
      name,
      metaTemplateName,
      language,
      previewText: previewText || null,
      bodyVariables,
      ...(data.isActive !== undefined ? { isActive: data.isActive !== false } : {}),
    },
  })
}

export async function deleteCampaignTemplate({ userId, templateId }) {
  const existing = await prisma.campaignTemplate.findFirst({
    where: {
      id: templateId,
      userId,
    },
    select: { id: true },
  })

  if (!existing) {
    throw new Error("Campaign template not found")
  }

  const linkedActiveCampaigns = await prisma.campaign.count({
    where: {
      userId,
      templateId,
      status: { in: ["DRAFT", "READY", "RUNNING", "PAUSED"] },
    },
  })

  if (linkedActiveCampaigns > 0) {
    throw new Error("This template is still linked to active campaigns")
  }

  await prisma.campaignTemplate.delete({
    where: { id: templateId },
  })

  return { id: templateId }
}

export async function previewCampaignAudience({ user, data }) {
  const template = data.templateId
    ? await prisma.campaignTemplate.findFirst({
        where: {
          id: data.templateId,
          userId: user.id,
        },
      })
    : null

  const audience = await buildCampaignAudience({
    user,
    userId: user.id,
    productId: data.productId || null,
    audienceType: data.audienceType,
    filters: normalizeCampaignFilters(data.filters),
    template,
  })

  return {
    product: audience.product,
    summary: audience.summary,
    sampleRecipients: audience.sampleRecipients,
    filters: audience.filters,
  }
}

export async function createCampaign({ user, data }) {
  const template = await prisma.campaignTemplate.findFirst({
    where: {
      id: data.templateId,
      userId: user.id,
      isActive: true,
    },
  })

  if (!template) {
    throw new Error("Campaign template not found")
  }

  const audience = await buildCampaignAudience({
    user,
    userId: user.id,
    productId: data.productId || null,
    audienceType: data.audienceType,
    filters: normalizeCampaignFilters(data.filters),
    template,
  })

  const batchSize = clampBatchSize(data.batchSize)
  const name = String(data.name || "").trim() || buildCampaignName({
    product: audience.product,
    audienceType: data.audienceType,
  })

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        userId: user.id,
        productId: audience.product?.id || null,
        templateId: template.id,
        name,
        audienceType: data.audienceType,
        filtersJson: audience.filters,
        templateVariablesJson: {
          bodyVariables: parseVariableList(template.bodyVariables),
        },
        batchSize,
        status: audience.summary.eligibleCount > 0 ? "READY" : "DRAFT",
        audienceCount: audience.summary.audienceCount,
        eligibleCount: audience.summary.eligibleCount,
        skippedCount: audience.summary.skippedCount + audience.summary.optedOutCount,
      },
      include: {
        product: {
          select: { id: true, name: true, category: true },
        },
        template: {
          select: { id: true, name: true, metaTemplateName: true, language: true },
        },
      },
    })

    const recipientRows = audience.recipients.map((recipient) => ({
      campaignId: campaign.id,
      customerId: recipient.customerId,
      customerName: recipient.customerName,
      phone: recipient.phone,
      status: recipient.status,
      skipReason: recipient.skipReason,
      variablesJson: recipient.variablesJson,
    }))

    for (const batch of chunkArray(recipientRows, 250)) {
      if (!batch.length) continue
      await tx.campaignRecipient.createMany({ data: batch })
    }

    return campaign
  })
}
