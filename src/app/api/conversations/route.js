import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/response"
import { withConversationRecovery } from "@/lib/conversationRecovery"

const VALID_STAGES = new Set([
  "GREETING",
  "DISCOVERY",
  "PITCHING",
  "OBJECTION",
  "CLOSING",
  "CLOSED",
  "ABANDONED",
  "ARCHIVED",
  "CLOSED_ONLY",
])

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value || "", 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage")
    const search = (searchParams.get("search") || "").trim().slice(0, 120)
    const page = parsePositiveInt(searchParams.get("page"), 1)
    const limit = parsePositiveInt(searchParams.get("limit"), 20, 100)
    const skip = (page - 1) * limit

    if (stage && stage !== "all" && !VALID_STAGES.has(stage)) {
      return errorResponse("فلتر المرحلة غير صالح", 400)
    }

    const stageFilter = !stage || stage === "all"
      ? { stage: { notIn: ["ARCHIVED"] } }
      : stage === "CLOSED_ONLY"
        ? { stage: "CLOSED" }
        : { stage }

    const where = {
      userId: user.id,
      ...stageFilter,
      ...(search && {
        customer: {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
          ],
        },
      }),
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              tag: true,
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ])

    return successResponse({
      conversations: conversations.map(withConversationRecovery),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET conversations error:", error?.message || error)
    return errorResponse("خطأ في جلب المحادثات", 500)
  }
}
