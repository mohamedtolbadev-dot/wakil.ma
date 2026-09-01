// Tests WhatsApp Cloud API credentials without sending a message.

import { getUserFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, unauthorizedResponse } from "@/lib/response"
import { encryptSecret } from "@/lib/secretCrypto"

function whatsappTestError(message, status, code, details = null) {
  return Response.json(
    {
      success: false,
      error: message,
      code,
      ...(details ? { details } : {}),
    },
    { status }
  )
}

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const { phoneId, token } = await request.json()

    if (!phoneId || !token) {
      return whatsappTestError("Phone ID and Token are required", 400, "MISSING_CREDENTIALS")
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${encodeURIComponent(phoneId)}?access_token=${encodeURIComponent(token)}`,
      { method: "GET" }
    )

    if (response.status === 401) {
      return whatsappTestError("Token is invalid or expired", 401, "INVALID_TOKEN")
    }

    if (response.status === 404) {
      return whatsappTestError("Phone ID was not found", 404, "INVALID_PHONE_ID")
    }

    if (!response.ok) {
      let errorData = null
      try {
        errorData = await response.json()
      } catch {}

      return whatsappTestError(
        errorData?.error?.message || "Failed to connect to WhatsApp API",
        response.status,
        "META_API_ERROR",
        errorData?.error || null
      )
    }

    const data = await response.json()

    await prisma.agent.update({
      where: { userId: user.id },
      data: {
        whatsappPhoneId: phoneId,
        whatsappToken: encryptSecret(token),
      },
    })

    return successResponse({
      success: true,
      phoneNumber: data.display_phone_number,
      qualityRating: data.quality_rating,
      verifiedName: data.verified_name,
      message: "WhatsApp Business API connection successful",
    })
  } catch (error) {
    console.error("WhatsApp connection test error:", error)
    return whatsappTestError("Server connection error", 500, "SERVER_ERROR")
  }
}
