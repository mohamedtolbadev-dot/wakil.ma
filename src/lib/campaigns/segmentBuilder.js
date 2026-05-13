import { prisma } from "@/lib/prisma"
import { normalizePhone } from "@/lib/phone"
import { evaluateCampaignCandidate } from "./guards"
import { normalizeCampaignFilters, parseVariableList, resolveTemplateVariables } from "./helpers"

async function resolveAudienceProducts({ userId, productId, audienceType }) {
  if (!productId) return { product: null, productIds: null }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId },
    select: {
      id: true,
      name: true,
      price: true,
      salePrice: true,
      category: true,
    },
  })

  if (!product) {
    throw new Error("Product not found")
  }

  if (audienceType !== "SAME_CATEGORY_BUYERS") {
    return { product, productIds: [product.id] }
  }

  if (!product.category) {
    throw new Error("Selected product has no category")
  }

  const categoryProducts = await prisma.product.findMany({
    where: { userId, category: product.category },
    select: { id: true },
  })

  return {
    product,
    productIds: categoryProducts.map((item) => item.id),
  }
}

function mergeCandidate(existing, order) {
  const currentLatestAt = existing.latestOrder?.createdAt
    ? new Date(existing.latestOrder.createdAt).getTime()
    : 0
  const nextOrderAt = order.createdAt ? new Date(order.createdAt).getTime() : 0

  existing.ordersCount += 1
  existing.totalSpent += Number(order.totalAmount || 0)

  if (nextOrderAt >= currentLatestAt) {
    existing.latestOrder = order
    existing.customer = order.customer || existing.customer
    existing.customerName = order.customer?.name || order.customerName || existing.customerName
    existing.phone = order.customer?.phone || order.customerPhone || existing.phone
  }

  return existing
}

export async function buildCampaignAudience({
  user,
  userId,
  productId,
  audienceType,
  filters = {},
  template = null,
}) {
  const normalizedFilters = normalizeCampaignFilters(filters)
  const { product, productIds } = await resolveAudienceProducts({ userId, productId, audienceType })

  if ((audienceType === "SAME_PRODUCT_BUYERS" || audienceType === "SAME_CATEGORY_BUYERS") && !product) {
    throw new Error("A product is required for this audience")
  }

  if (audienceType === "TAG_BUYERS" && !normalizedFilters.tag) {
    throw new Error("A customer tag is required for this audience")
  }

  const orderWhere = {
    userId,
    isDraft: false,
    ...(audienceType === "SAME_PRODUCT_BUYERS" && productId ? { productId } : {}),
    ...(audienceType === "SAME_CATEGORY_BUYERS"
      ? { productId: { in: productIds?.length ? productIds : ["__none__"] } }
      : {}),
    ...(normalizedFilters.tag ? { customer: { is: { tag: normalizedFilters.tag } } } : {}),
    ...(normalizedFilters.lastOrderWithinDays > 0
      ? {
          createdAt: {
            gte: new Date(Date.now() - normalizedFilters.lastOrderWithinDays * 24 * 60 * 60 * 1000),
          },
        }
      : {}),
  }

  const orders = await prisma.order.findMany({
    where: orderWhere,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerId: true,
      customerName: true,
      customerPhone: true,
      productId: true,
      productName: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          tag: true,
          outboundBlocked: true,
          marketingOptOutAt: true,
          lastMarketingSentAt: true,
        },
      },
    },
  })

  const candidateMap = new Map()

  for (const order of orders) {
    const rawPhone = order.customer?.phone || order.customerPhone || null
    const normalizedPhone = normalizePhone(rawPhone)
    const key = normalizedPhone || `customer:${order.customerId || order.id}`
    const existing = candidateMap.get(key)

    if (!existing) {
      candidateMap.set(key, {
        customerId: order.customerId,
        customer: order.customer,
        customerName: order.customer?.name || order.customerName,
        phone: rawPhone,
        latestOrder: order,
        ordersCount: 1,
        totalSpent: Number(order.totalAmount || 0),
      })
      continue
    }

    candidateMap.set(key, mergeCandidate(existing, order))
  }

  const variableKeys = parseVariableList(template?.bodyVariables)
  const seenPhones = new Set()
  const recipients = []

  for (const candidate of candidateMap.values()) {
    const evaluation = evaluateCampaignCandidate({
      candidate,
      seenPhones,
      filters: normalizedFilters,
    })

    if (evaluation.status === "PENDING" && evaluation.normalizedPhone) {
      seenPhones.add(evaluation.normalizedPhone)
    }

    recipients.push({
      customerId: candidate.customerId || candidate.customer?.id || null,
      customerName: candidate.customer?.name || candidate.customerName || "Client",
      phone: evaluation.normalizedPhone,
      status: evaluation.status,
      skipReason: evaluation.skipReason,
      latestOrder: candidate.latestOrder,
      variablesJson: resolveTemplateVariables({
        variableKeys,
        user,
        customer: candidate.customer,
        fallbackCustomerName: candidate.customerName,
        product,
        latestOrder: candidate.latestOrder,
      }),
    })
  }

  const summary = recipients.reduce(
    (acc, recipient) => {
      acc.audienceCount += 1
      if (recipient.status === "PENDING") acc.eligibleCount += 1
      if (recipient.status === "OPTED_OUT") acc.optedOutCount += 1
      if (recipient.status === "SKIPPED") acc.skippedCount += 1
      return acc
    },
    { audienceCount: 0, eligibleCount: 0, skippedCount: 0, optedOutCount: 0 }
  )

  const sampleRecipients = recipients
    .filter((recipient) => recipient.status === "PENDING")
    .slice(0, 5)
    .map((recipient) => ({
      customerId: recipient.customerId,
      customerName: recipient.customerName,
      phone: recipient.phone,
      latestOrderAt: recipient.latestOrder?.createdAt || null,
      latestOrderTotal: recipient.latestOrder?.totalAmount || 0,
    }))

  return {
    product,
    filters: normalizedFilters,
    recipients,
    summary,
    sampleRecipients,
  }
}
