import { prisma } from "@/lib/prisma"
import { generateToken, AUTH_USER_SELECT } from "@/lib/auth"
import { getEffectivePlan } from "@/lib/billingPlans"
import { successResponse, errorResponse } from "@/lib/response"
import { rateLimit } from "@/lib/rateLimit"
import { sendWelcomeEmail } from "@/lib/email"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID

async function verifyGoogleToken(token) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`
    )
    if (!response.ok) return null

    const data = await response.json()
    if (data.aud !== GOOGLE_CLIENT_ID) {
      console.error("Google token aud mismatch:", data.aud)
      return null
    }

    return data
  } catch (error) {
    console.error("Google token verification error:", error)
    return null
  }
}

async function ensureAuthAgent(userId) {
  const existingAgent = await prisma.agent.findUnique({
    where: { userId },
    select: { id: true }
  })

  if (existingAgent) return existingAgent

  return prisma.agent.create({
    data: {
      userId,
      name: "Agent",
      domain: "تجارة عامة",
    },
    select: { id: true }
  })
}

export async function POST(request) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      console.error("GOOGLE_CLIENT_ID is not configured on the server")
      return errorResponse("Google auth is not configured", 500)
    }

    const rateLimitResult = rateLimit(request, true)
    if (!rateLimitResult.success) {
      return errorResponse(
        `تم تجاوز الحد. حاول بعد ${Math.ceil(rateLimitResult.retryAfter / 60)} دقيقة`,
        429
      )
    }

    const { token } = await request.json()
    if (!token) {
      return errorResponse("Token مطلوب", 400)
    }

    const googleData = await verifyGoogleToken(token)
    if (!googleData) {
      return errorResponse("Token غير صالح", 400)
    }

    const { sub: googleId, email, name } = googleData
    if (!email) {
      return errorResponse("البريد مطلوب من Google", 400)
    }

    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        ...AUTH_USER_SELECT,
        googleId: true,
      }
    })

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
          select: {
            ...AUTH_USER_SELECT,
            googleId: true,
          }
        })
      }

      if (!user.agent) {
        await ensureAuthAgent(user.id)
        user = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            ...AUTH_USER_SELECT,
            googleId: true,
          }
        })
      }
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          googleId,
          storeName: name || email.split("@")[0],
        },
        select: {
          ...AUTH_USER_SELECT,
          googleId: true,
        }
      })

      await ensureAuthAgent(user.id)

      user = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          ...AUTH_USER_SELECT,
          googleId: true,
        }
      })

      // إرسال إيميل ترحيبي للمستخدم الجديد
      sendWelcomeEmail({ 
        to: user.email, 
        name: user.name 
      }).catch(err => console.error("⚠️ Failed to send welcome email:", err.message))
    }

    const jwtToken = generateToken(user.id)
    const effectivePlan = getEffectivePlan(user)

    return successResponse({
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        storeName: user.storeName,
        plan: effectivePlan,
        rawPlan: user.plan,
        planExpiresAt: user.planExpiresAt,
        createdAt: user.createdAt,
        role: user.role,
        agent: user.agent ? {
          id: user.agent.id,
          name: user.agent.name,
          isActive: user.agent.isActive,
        } : null,
      },
    })
  } catch (error) {
    console.error("Google auth error:", error)

    if (error?.code === "P2002") {
      return errorResponse("هذا الحساب مرتبط مسبقًا ببيانات Google أو بريد مستخدم آخر", 409)
    }

    if (error?.code === "P2022") {
      return errorResponse("قاعدة البيانات لم تُحدَّث بعد. طبّق Prisma migration ثم أعد المحاولة", 503)
    }

    return errorResponse("خطأ في تسجيل الدخول بواسطة Google", 500)
  }
}
