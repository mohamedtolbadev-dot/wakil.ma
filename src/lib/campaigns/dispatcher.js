import { prisma } from "@/lib/prisma"
import { sendCampaignTemplateMessage } from "./templateSender"
import { decryptAgentSecrets } from "@/lib/secretCrypto"

async function aggregateCampaignRecipientStats(campaignId) {
  const grouped = await prisma.campaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: { _all: true },
  })

  const counts = grouped.reduce((acc, item) => {
    acc[item.status] = item._count._all
    return acc
  }, {})

  return {
    pending: counts.PENDING || 0,
    sent: counts.SENT || 0,
    failed: counts.FAILED || 0,
    skipped: (counts.SKIPPED || 0) + (counts.OPTED_OUT || 0),
    replied: counts.REPLIED || 0,
    eligible: (counts.PENDING || 0) + (counts.SENT || 0) + (counts.FAILED || 0) + (counts.REPLIED || 0),
    audience: Object.values(counts).reduce((sum, count) => sum + count, 0),
  }
}

export async function refreshCampaignMetrics(campaignId) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, status: true },
  })

  if (!campaign) return null

  const stats = await aggregateCampaignRecipientStats(campaignId)
  const updateData = {
    audienceCount: stats.audience,
    eligibleCount: stats.eligible,
    sentCount: stats.sent,
    failedCount: stats.failed,
    skippedCount: stats.skipped,
    repliedCount: stats.replied,
  }

  if (campaign.status === "RUNNING" && stats.pending === 0) {
    updateData.status = "COMPLETED"
    updateData.completedAt = new Date()
  }

  return prisma.campaign.update({
    where: { id: campaignId },
    data: updateData,
    include: {
      product: { select: { id: true, name: true, category: true } },
      template: { select: { id: true, name: true, metaTemplateName: true, language: true } },
    },
  })
}

export async function dispatchCampaignBatch({ campaignId, userId }) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      template: true,
      product: {
        select: { id: true, name: true, category: true },
      },
    },
  })

  if (!campaign) {
    throw new Error("Campaign not found")
  }

  if (!campaign.template?.metaTemplateName) {
    throw new Error("Campaign template is missing")
  }

  if (["COMPLETED", "CANCELLED"].includes(campaign.status)) {
    return {
      processed: 0,
      successCount: 0,
      failedCount: 0,
      hasMore: false,
      campaign: await refreshCampaignMetrics(campaignId),
    }
  }

  const agent = decryptAgentSecrets(await prisma.agent.findUnique({
    where: { userId },
    select: {
      whatsappPhoneId: true,
      whatsappToken: true,
    },
  }))

  if (!agent?.whatsappPhoneId || !agent?.whatsappToken) {
    throw new Error("WhatsApp is not configured for this account")
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "RUNNING",
      startedAt: campaign.startedAt || new Date(),
      lastDispatchedAt: new Date(),
    },
  })

  const recipients = await prisma.campaignRecipient.findMany({
    where: {
      campaignId,
      status: "PENDING",
      phone: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: campaign.batchSize || 25,
  })

  if (!recipients.length) {
    const refreshed = await refreshCampaignMetrics(campaignId)
    return {
      processed: 0,
      successCount: 0,
      failedCount: 0,
      hasMore: false,
      campaign: refreshed,
    }
  }

  let processed = 0
  let successCount = 0
  let failedCount = 0
  let fatalError = null

  for (const recipient of recipients) {
    processed += 1

    const sent = await sendCampaignTemplateMessage({
      agent,
      template: campaign.template,
      recipient,
    })

    if (sent.success) {
      successCount += 1
      await prisma.$transaction([
        prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            lastAttemptAt: new Date(),
            waMessageId: sent.data?.messages?.[0]?.id || null,
            lastError: null,
          },
        }),
        ...(recipient.customerId
          ? [
              prisma.customer.update({
                where: { id: recipient.customerId },
                data: { lastMarketingSentAt: new Date() },
              }),
            ]
          : []),
      ])
      continue
    }

    failedCount += 1
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: "FAILED",
        lastAttemptAt: new Date(),
        lastError:
          typeof sent.error === "string"
            ? sent.error
            : JSON.stringify(sent.error || "Template send failed"),
      },
    })

    if (sent.isTokenExpired) {
      fatalError = "WhatsApp token expired"
      break
    }
  }

  let refreshed = await refreshCampaignMetrics(campaignId)

  if (fatalError) {
    refreshed = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "FAILED" },
      include: {
        product: { select: { id: true, name: true, category: true } },
        template: { select: { id: true, name: true, metaTemplateName: true, language: true } },
      },
    })
  }

  return {
    processed,
    successCount,
    failedCount,
    hasMore: refreshed?.status === "RUNNING",
    fatalError,
    campaign: refreshed,
  }
}

export async function restartCampaign({ campaignId, userId }) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    select: { id: true, status: true },
  })

  if (!campaign) {
    throw new Error("Campaign not found")
  }

  if (campaign.status === "RUNNING") {
    throw new Error("Pause the campaign before restarting it")
  }

  await prisma.$transaction([
    prisma.campaignRecipient.updateMany({
      where: {
        campaignId,
        status: { in: ["SENT", "FAILED", "REPLIED"] },
      },
      data: {
        status: "PENDING",
        waMessageId: null,
        lastError: null,
        lastAttemptAt: null,
        sentAt: null,
        repliedAt: null,
      },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "READY",
        startedAt: null,
        completedAt: null,
        lastDispatchedAt: null,
        sentCount: 0,
        failedCount: 0,
        repliedCount: 0,
      },
    }),
  ])

  return refreshCampaignMetrics(campaignId)
}
