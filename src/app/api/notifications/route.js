import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getUserFromRequest } from "@/lib/auth"
import {
  successResponse,
  errorResponse,
  unauthorizedResponse
} from "@/lib/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function normalizeLimit(value) {
  const parsed = Number.parseInt(value || "50", 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 50
  return Math.min(parsed, 100)
}

function countValue(rows) {
  const value = rows?.[0]?.count ?? 0
  return typeof value === "bigint" ? Number(value) : Number(value || 0)
}

async function getNotificationsFallback({ userId, unreadOnly, limit }) {
  const unreadSql = unreadOnly ? Prisma.sql`AND isRead = false` : Prisma.empty

  const [notifications, unreadRows, totalRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT id, userId, CAST(type AS CHAR) AS type, title, message, isRead, createdAt
      FROM notifications
      WHERE userId = ${userId} ${unreadSql}
      ORDER BY createdAt DESC
      LIMIT ${limit}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE userId = ${userId} AND isRead = false
    `,
    prisma.$queryRaw`
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE userId = ${userId}
    `,
  ])

  return {
    notifications: notifications.map((item) => ({
      ...item,
      isRead: Boolean(item.isRead),
    })),
    unreadCount: countValue(unreadRows),
    totalCount: countValue(totalRows),
  }
}

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      console.warn("❌ GET /notifications: User not authenticated")
      return unauthorizedResponse()
    }

    console.log(`📍 GET /notifications for user: ${user.email}`)

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"
    const limit = normalizeLimit(searchParams.get("limit"))

    const where = {
      userId: user.id,
      ...(unreadOnly && { isRead: false }),
    }

    let notifications
    let unreadCount
    let totalCount

    try {
      ;[notifications, unreadCount, totalCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
        prisma.notification.count({
          where: { userId: user.id, isRead: false }
        }),
        prisma.notification.count({
          where: { userId: user.id }
        })
      ])
    } catch (queryError) {
      console.warn("GET /notifications Prisma query failed, using raw fallback:", queryError?.message || queryError)
      const fallback = await getNotificationsFallback({ userId: user.id, unreadOnly, limit })
      notifications = fallback.notifications
      unreadCount = fallback.unreadCount
      totalCount = fallback.totalCount
    }

    console.log(`✅ GET /notifications: Found ${unreadCount} unread, ${totalCount} total`)
    return successResponse({ 
      notifications, 
      unreadCount,
      totalCount,
      limit
    })
  } catch (error) {
    console.error("❌ GET notifications error:", error?.message || error)
    return errorResponse("خطأ في جلب الإشعارات", 500)
  }
}
