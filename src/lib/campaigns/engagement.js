import { prisma } from "@/lib/prisma"
import { normalizePhone } from "@/lib/phone"
import { isMarketingOptOutMessage } from "./helpers"
import { refreshCampaignMetrics } from "./dispatcher"

export { isMarketingOptOutMessage }

export async function unsubscribeCustomerFromCampaigns({ userId, phone }) {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) return null

  const customer = await prisma.customer.findUnique({
    where: {
      userId_phone: {
        userId,
        phone: normalizedPhone,
      },
    },
    select: { id: true },
  })

  if (customer) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        outboundBlocked: true,
        marketingOptOutAt: new Date(),
      },
    })
  }

  const recipients = await prisma.campaignRecipient.findMany({
    where: {
      phone: normalizedPhone,
      campaign: {
        userId,
        status: { in: ["READY", "RUNNING", "PAUSED", "COMPLETED"] },
      },
      status: { in: ["PENDING", "SENT", "REPLIED"] },
    },
    select: { id: true, campaignId: true },
  })

  if (!recipients.length) {
    return { customerId: customer?.id || null, campaignsUpdated: 0 }
  }

  const now = new Date()
  await Promise.all(
    recipients.map((recipient) =>
      prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "OPTED_OUT",
          optedOutAt: now,
        },
      })
    )
  )

  await Promise.all(
    [...new Set(recipients.map((recipient) => recipient.campaignId))].map((campaignId) =>
      refreshCampaignMetrics(campaignId)
    )
  )

  return {
    customerId: customer?.id || null,
    campaignsUpdated: recipients.length,
  }
}

export async function markCampaignReplyFromInbound({ userId, phone }) {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) return null

  const recipient = await prisma.campaignRecipient.findFirst({
    where: {
      phone: normalizedPhone,
      status: "SENT",
      campaign: {
        userId,
      },
    },
    orderBy: { sentAt: "desc" },
    select: {
      id: true,
      campaignId: true,
    },
  })

  if (!recipient) return null

  await prisma.campaignRecipient.update({
    where: { id: recipient.id },
    data: {
      status: "REPLIED",
      repliedAt: new Date(),
    },
  })

  await refreshCampaignMetrics(recipient.campaignId)
  return recipient
}
