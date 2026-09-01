import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { successResponse, unauthorizedResponse, errorResponse } from "@/lib/response"

export const dynamic = "force-dynamic"

export async function DELETE(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    await prisma.$transaction(async (tx) => {
      const campaigns = await tx.campaign.findMany({
        where: { userId: user.id },
        select: { id: true },
      })
      const conversations = await tx.conversation.findMany({
        where: { userId: user.id },
        select: { id: true },
      })
      const customers = await tx.customer.findMany({
        where: { userId: user.id },
        select: { id: true },
      })

      const campaignIds = campaigns.map((campaign) => campaign.id)
      const conversationIds = conversations.map((conversation) => conversation.id)
      const customerIds = customers.map((customer) => customer.id)

      if (campaignIds.length) {
        await tx.campaignRecipient.deleteMany({
          where: { campaignId: { in: campaignIds } },
        })
      }

      if (customerIds.length) {
        await tx.campaignRecipient.updateMany({
          where: { customerId: { in: customerIds } },
          data: { customerId: null },
        })
      }

      if (conversationIds.length) {
        await tx.message.deleteMany({
          where: { conversationId: { in: conversationIds } },
        })
      }

      const agent = await tx.agent.findUnique({
        where: { userId: user.id },
        select: { id: true },
      })

      if (agent) {
        await tx.objectionReply.deleteMany({ where: { agentId: agent.id } })
        await tx.agent.delete({ where: { id: agent.id } })
      }

      await tx.campaign.deleteMany({ where: { userId: user.id } })
      await tx.campaignTemplate.deleteMany({ where: { userId: user.id } })
      await tx.order.deleteMany({ where: { userId: user.id } })
      await tx.conversation.deleteMany({ where: { userId: user.id } })
      await tx.customer.deleteMany({ where: { userId: user.id } })
      await tx.product.deleteMany({ where: { userId: user.id } })
      await tx.notification.deleteMany({ where: { userId: user.id } })
      await tx.monthlyUsage.deleteMany({ where: { userId: user.id } })
      await tx.invoice.deleteMany({ where: { clientId: user.id } })

      await tx.blogPost.updateMany({
        where: { authorId: user.id },
        data: { authorId: null },
      })

      const tokenKeys = [
        user.email?.toLowerCase(),
        user.id ? `reset:${user.id}` : null,
      ].filter(Boolean)

      if (tokenKeys.length) {
        await tx.verificationToken.deleteMany({
          where: { phone: { in: tokenKeys } },
        })
      }

      await tx.user.delete({ where: { id: user.id } })
    })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error("DELETE /api/auth/delete-account error:", error)
    return errorResponse("Failed to delete account", 500)
  }
}
