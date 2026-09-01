import { prisma } from "@/lib/prisma"
import { downloadWhatsAppMedia } from "@/lib/whatsapp"
import { getSuperAdminFromRequest } from "@/lib/adminAuth"
import { decryptAgentSecrets } from "@/lib/secretCrypto"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request, { params }) {
  const admin = await getSuperAdminFromRequest(request)
  if (!admin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams?.userId
    const conversationId = resolvedParams?.conversationId
    const messageId = resolvedParams?.messageId

    if (!userId || !conversationId || !messageId) {
      return new Response(JSON.stringify({ error: "Invalid identifiers" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
        conversation: { userId },
      },
      select: { whatsappMediaId: true },
    })

    if (!message?.whatsappMediaId) {
      return new Response(JSON.stringify({ error: "No audio for this message" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const agent = decryptAgentSecrets(await prisma.agent.findUnique({
      where: { userId },
      select: { whatsappToken: true },
    }))

    if (!agent?.whatsappToken) {
      return new Response(JSON.stringify({ error: "WhatsApp token not configured" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      })
    }

    const downloaded = await downloadWhatsAppMedia({
      token: agent.whatsappToken,
      mediaId: message.whatsappMediaId,
    })

    if (!downloaded?.buffer) {
      return new Response(JSON.stringify({ error: "Failed to download audio" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      })
    }

    const audioBuffer = Buffer.from(downloaded.buffer)
    const contentLength = audioBuffer.byteLength
    const mimeType = downloaded.mimeType || "audio/ogg"
    const rangeHeader = request.headers.get("range")

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1], 10)
        const end = match[2] ? parseInt(match[2], 10) : contentLength - 1

        if (start >= contentLength || end >= contentLength || start > end) {
          return new Response(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${contentLength}` },
          })
        }

        const chunk = audioBuffer.slice(start, end + 1)
        return new Response(chunk, {
          status: 206,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": String(chunk.byteLength),
            "Content-Range": `bytes ${start}-${end}/${contentLength}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, max-age=120",
          },
        })
      }
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(contentLength),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=120",
      },
    })
  } catch (error) {
    console.error("GET /api/admin/.../audio error:", error)
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
