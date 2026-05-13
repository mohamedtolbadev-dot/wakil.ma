import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import {
  successResponse,
  errorResponse,
  unauthorizedResponse
} from "@/lib/response"
import { getConversationRecoveryState } from "@/lib/conversationRecovery"

// تحليل أسباب الاعتراض من نص الرسالة
function analyzeObjectionReason(content) {
  const text = content.toLowerCase()
  if (text.includes("غالي") || text.includes("كثير") || text.includes("فلوس") || text.includes("ثمن")) {
    return "السعر غالي"
  }
  if (text.includes("نفكر") || text.includes("نستشير") || text.includes("وقت")) {
    return "نفكر فيها"
  }
  if (text.includes("مقاس") || text.includes("حجم") || text.includes("size")) {
    return "مش المقاس"
  }
  if (text.includes("لون") || text.includes("لونها") || text.includes("color")) {
    return "اللون مش كاين"
  }
  if (text.includes("موجود") || text.includes("ستوك") || text.includes("متاح")) {
    return "غير متوفر"
  }
  return null
}

// حساب متوسط وقت الرد بالثواني
function calculateAvgResponseTime(conversations) {
  let totalResponseTime = 0
  let responseCount = 0

  for (const conv of conversations) {
    const messages = conv.messages
    for (let i = 1; i < messages.length; i++) {
      if (messages[i - 1].role === "USER" && messages[i].role === "AGENT") {
        const userTime = new Date(messages[i - 1].createdAt).getTime()
        const agentTime = new Date(messages[i].createdAt).getTime()
        const diffSeconds = (agentTime - userTime) / 1000
        if (diffSeconds > 0 && diffSeconds < 300) {
          totalResponseTime += diffSeconds
          responseCount++
        }
      }
    }
  }

  if (responseCount === 0) return 0
  return Math.round(totalResponseTime / responseCount)
}

// الحصول على بيانات الرسم البياني حسب الفترة
async function getPeriodChartData(userId, period, periodStart) {
  const rows = await prisma.conversation.findMany({
    where: {
      userId,
      createdAt: { gte: periodStart },
      stage: { notIn: ["ARCHIVED"] }
    },
    select: { createdAt: true }
  })

  if (period === "week") {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const sevenDaysStart = new Date(startOfToday)
    sevenDaysStart.setDate(sevenDaysStart.getDate() - 6)
    const counts = Array(7).fill(0)
    for (const row of rows) {
      const rowDate = new Date(row.createdAt)
      rowDate.setHours(0, 0, 0, 0)
      const diffDays = Math.round((rowDate - sevenDaysStart) / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays < 7) counts[diffDays]++
    }
    return { counts, granularity: "day" }

  } else if (period === "month") {
    const counts = Array(4).fill(0)
    const now = Date.now()
    for (const row of rows) {
      const diffMs = now - new Date(row.createdAt).getTime()
      const weeksAgo = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
      if (weeksAgo < 4) counts[3 - weeksAgo]++
    }
    return { counts, granularity: "week" }

  } else {
    const counts = Array(3).fill(0)
    const now = new Date()
    for (const row of rows) {
      const rowDate = new Date(row.createdAt)
      const monthDiff =
        (now.getFullYear() - rowDate.getFullYear()) * 12 +
        (now.getMonth() - rowDate.getMonth())
      if (monthDiff >= 0 && monthDiff < 3) counts[2 - monthDiff]++
    }
    return { counts, granularity: "month" }
  }
}

export async function GET(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "week"
    const days = period === "3months" ? 90 : period === "month" ? 30 : 7
    const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // محادثات الفترة المحددة
    const weekConversations = await prisma.conversation.count({
      where: {
        userId: user.id,
        createdAt: { gte: periodStart },
        stage: { notIn: ["ARCHIVED"] }
      }
    })

    // ✅ INTEGRITY FIX: Revenue calculated from ORDERS (not conversations)
    //   Excludes drafts (incomplete) and cancelled orders
    const periodOrders = await prisma.order.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: periodStart },
        isDraft: false,
        status: { not: "CANCELLED" },
      },
      select: { totalAmount: true }
    })
    const weekRevenue = periodOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    const pitching = await prisma.conversation.count({
      where: {
        userId: user.id,
        stage: "PITCHING"
      }
    })

    const customers = await prisma.customer.count({
      where: { userId: user.id }
    })

    // بيانات الرسم البياني حسب الفترة
    const periodChartData = await getPeriodChartData(user.id, period, periodStart)

    // أسباب الاعتراض - بدون جلب كل conversation IDs (أخف على DB)
    const allObjections = await prisma.message.findMany({
      where: {
        role: "USER",
        conversation: { userId: user.id },
        OR: [
          { content: { contains: "غالي" } },
          { content: { contains: "كثير" } },
          { content: { contains: "نفكر" } },
          { content: { contains: "مقاس" } },
          { content: { contains: "لون" } },
          { content: { contains: "موجود" } },
          { content: { contains: "مش" } }
        ]
      },
      select: { content: true },
      take: 100
    })

    // عدد المحادثات في كل مرحلة — query وحدة بدل 5
    const stageCounts = await prisma.conversation.groupBy({
      by: ["stage"],
      where: {
        userId: user.id,
        stage: { in: ["GREETING", "DISCOVERY", "PITCHING", "OBJECTION", "CLOSED"] }
      },
      _count: { _all: true }
    })
    const stageMap = stageCounts.reduce((acc, row) => {
      acc[row.stage] = row._count._all
      return acc
    }, {})

    // ✅ متوسط score المحادثات المغلقة (funnel progression — NOT satisfaction)
    //   يعكس مدى وصول الـ AI للإقفال، ماشي رضا الزبون الحقيقي.
    const closedConversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
        stage: "CLOSED"
      },
      select: { score: true }
    })
    const totalScore = closedConversations.reduce((sum, c) => sum + (c.score || 0), 0)
    const conversionScore = closedConversations.length > 0
      ? Math.round(totalScore / closedConversations.length)
      : 0

    // زبائن الأسبوع الأخير لحساب نسبة العودة
    const recentCustomers = await prisma.customer.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: periodStart }
      },
      select: { ordersCount: true }
    })
    const returningCustomers = recentCustomers.filter(c => c.ordersCount > 1).length
    const returnRate = recentCustomers.length > 0
      ? Math.round((returningCustomers / recentCustomers.length) * 100)
      : 0

    // محادثات لحساب وقت الرد
    const conversationsWithMessages = await prisma.conversation.findMany({
      where: { userId: user.id },
      select: {
        messages: {
          select: { role: true, createdAt: true },
          orderBy: { createdAt: "asc" }
        }
      },
      take: 30,
      orderBy: { createdAt: "desc" }
    })
    const avgResponseTime = calculateAvgResponseTime(conversationsWithMessages)

    // تحليل أسباب الاعتراض
    const objectionReasonsMap = new Map()
    for (const msg of allObjections) {
      const reason = analyzeObjectionReason(msg.content)
      if (reason) {
        objectionReasonsMap.set(reason, (objectionReasonsMap.get(reason) || 0) + 1)
      }
    }
    const objectionReasons = Array.from(objectionReasonsMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // ─── إحصائيات المنتجات ───
    // Sequential لتخفيف فتح connections متوازية
    const totalProducts = await prisma.product.count({ where: { userId: user.id } })
    const activeProducts = await prisma.product.count({ where: { userId: user.id, isActive: true } })
    const outOfStockProducts = await prisma.product.count({ where: { userId: user.id, stock: 0 } })

    // أكثر المنتجات مبيعاً (من الطلبيات)
    const ordersByProduct = await prisma.order.groupBy({
      by: ["productName"],
      where: { userId: user.id, isDraft: false, status: { not: "CANCELLED" } },
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    })
    const topProducts = ordersByProduct.map(p => ({
      name: p.productName,
      orders: p._count.id,
      revenue: Math.round(p._sum.totalAmount || 0),
    }))

    // أكثر المنتجات التي تسأل عنها الزبائن (AI questions)
    const topQuestionsProducts = await prisma.product.findMany({
      where: { userId: user.id, questions: { gt: 0 } },
      orderBy: { questions: "desc" },
      take: 5,
      select: { name: true, questions: true },
    })

    // Recovery opportunities: same calculation used by the conversations page.
    const recoveryCandidates = await prisma.conversation.findMany({
      where: {
        userId: user.id,
        stage: { in: ["GREETING", "DISCOVERY", "PITCHING", "OBJECTION", "CLOSING"] },
      },
      select: {
        stage: true,
        score: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { role: true, createdAt: true },
        },
      },
    })
    const abandonedCartCount = recoveryCandidates
      .filter(conversation => getConversationRecoveryState(conversation).needsRecovery)
      .length

    // ✅ Cancellation rate: نسبة الطلبيات الملغاة للفترة
    //   KPI حاسم في السوق المغربي (COD → معدل الإلغاء عادة ~15-30%)
    const cancelledCount = await prisma.order.count({
      where: {
        userId: user.id,
        createdAt: { gte: periodStart },
        status: "CANCELLED",
      }
    })
    const totalOrdersPeriod = await prisma.order.count({
      where: {
        userId: user.id,
        createdAt: { gte: periodStart },
        isDraft: false,
      }
    })
    const cancellationRate = totalOrdersPeriod > 0
      ? Math.round((cancelledCount / totalOrdersPeriod) * 100)
      : 0

    const deliveryReadyToExport = await prisma.order.count({
      where: {
        userId: user.id,
        isDraft: false,
        status: "CONFIRMED",
        deliveryReference: null,
      }
    })
    const deliveryExportedPending = await prisma.order.count({
      where: {
        userId: user.id,
        isDraft: false,
        status: "CONFIRMED",
        deliveryReference: { not: null },
      }
    })
    const deliveryMissingTracking = await prisma.order.count({
      where: {
        userId: user.id,
        isDraft: false,
        status: "SHIPPED",
        OR: [
          { trackingNumber: null },
          { trackingNumber: "" },
        ],
      }
    })
    const deliveryStatusCounts = await prisma.order.groupBy({
      by: ["status"],
      where: {
        userId: user.id,
        isDraft: false,
        updatedAt: { gte: periodStart },
        status: { in: ["SHIPPED", "DELIVERED", "CANCELLED"] },
      },
      _count: { id: true },
    })
    const deliveryStatusMap = deliveryStatusCounts.reduce((acc, row) => {
      acc[row.status] = row._count.id
      return acc
    }, {})
    const deliveryInTransit = deliveryStatusMap.SHIPPED || 0
    const deliveryDelivered = deliveryStatusMap.DELIVERED || 0
    const deliveryReturnedOrCancelled = deliveryStatusMap.CANCELLED || 0
    const deliveryTerminal = deliveryDelivered + deliveryReturnedOrCancelled
    const deliverySuccessRate = deliveryTerminal > 0
      ? Math.round((deliveryDelivered / deliveryTerminal) * 100)
      : 0

    // الحسابات النهائية للفترة
    const periodRevenue = weekRevenue
    const periodOrdersCount = periodOrders.length
    const conversionRate = weekConversations > 0
      ? Math.round((periodOrdersCount / weekConversations) * 100)
      : 0

    return successResponse({
      // Period totals
      periodConversations: weekConversations,
      periodSales: periodOrdersCount,
      periodRevenue: Math.round(periodRevenue),
      // Backward-compat aliases (old UI still reads these)
      todayConversations: weekConversations,
      todaySales: periodOrdersCount,
      todayRevenue: Math.round(periodRevenue),
      weekConversations,
      weekRevenue: Math.round(weekRevenue),

      conversionRate,
      cancellationRate,                 // ✅ NEW: % of orders cancelled in period
      abandonedCart: abandonedCartCount, // Recovery opportunities needing follow-up
      deliveryStats: {
        readyToExport: deliveryReadyToExport,
        exportedPending: deliveryExportedPending,
        inTransit: deliveryInTransit,
        delivered: deliveryDelivered,
        returnedOrCancelled: deliveryReturnedOrCancelled,
        missingTracking: deliveryMissingTracking,
        successRate: deliverySuccessRate,
      },

      pitching,
      customers,
      avgOrderValue: periodOrdersCount > 0
        ? Math.round(periodRevenue / periodOrdersCount)
        : 0,
      avgResponseTime: avgResponseTime > 0 ? avgResponseTime : 0,
      conversionScore,          // ✅ RENAMED from satisfactionRate (funnel progression)
      satisfactionRate: conversionScore,  // backward-compat alias
      returnRate,
      objectionReasons: objectionReasons.length > 0 ? objectionReasons : [],
      stages: {
        greeting:  stageMap["GREETING"] || 0,
        discovery: stageMap["DISCOVERY"] || 0,
        pitching:  stageMap["PITCHING"] || 0,
        objection: stageMap["OBJECTION"] || 0,
        closed:    stageMap["CLOSED"] || 0,
      },
      weeklyChart: periodChartData.counts,
      chartGranularity: periodChartData.granularity,
      weeklyDays: [],
      productStats: {
        total: totalProducts,
        active: activeProducts,
        outOfStock: outOfStockProducts,
      },
      topProducts,
      topQuestionsProducts,
    })
  } catch (error) {
    console.error("GET stats error:", error)
    console.error("Error stack:", error.stack)
    return errorResponse(`خطأ في جلب الإحصائيات: ${error.message}`, 500)
  }
}
