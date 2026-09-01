import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth"
import { downloadWhatsAppMedia } from "@/lib/whatsapp"
import { errorResponse, unauthorizedResponse } from "@/lib/response"
import { decryptAgentSecrets } from "@/lib/secretCrypto"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request, { params }) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    const resolvedParams = await Promise.resolve(params)
    const conversationId = resolvedParams?.id
    const messageId = resolvedParams?.messageId
    if (!conversationId || !messageId) {
      return errorResponse("معرّف غير صالح", 400)
    }

    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
        conversation: { userId: user.id },
      },
      select: { whatsappMediaId: true },
    })

    if (!message?.whatsappMediaId) {
      return errorResponse("لا يوجد ملف صوتي لهذه الرسالة", 404)
    }

    const agent = decryptAgentSecrets(await prisma.agent.findUnique({
      where: { userId: user.id },
      select: { whatsappToken: true },
    }))

    if (!agent?.whatsappToken) {
      return errorResponse("Token واتساب غير مضبوط", 502)
    }

    const downloaded = await downloadWhatsAppMedia({
      token: agent.whatsappToken,
      mediaId: message.whatsappMediaId,
    })

    if (!downloaded || !downloaded.buffer) {
      console.error("❌ No audio buffer:", { downloaded })
      return errorResponse("تعذر جلب التسجيل من واتساب", 502)
    }

    const audioBuffer = Buffer.from(downloaded.buffer)
    const contentLength = audioBuffer.byteLength
    const mimeType = downloaded.mimeType || "audio/ogg"

    // ✅ Handle Range Requests (للمتصفح يقدر يبحث في الملف)
    const rangeHeader = request.headers.get("range")
    
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1], 10)
        const end = match[2] ? parseInt(match[2], 10) : contentLength - 1

        if (start >= contentLength || end >= contentLength || start > end) {
          return new Response(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${contentLength}`,
            },
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

    // ✅ Full file response
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(contentLength),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=120",
      },
    })
  } catch (e) {
    console.error("GET /conversations/.../audio:", e?.message || e)
    return errorResponse("خطأ في الخادم", 500)
  }
}
