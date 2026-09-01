import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { v2 as cloudinary } from "cloudinary"
import { errorResponse, unauthorizedResponse } from "@/lib/response"

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024
const DEFAULT_FOLDER = "salesbot/media"
const ALLOWED_FOLDER_PREFIXES = ["wakil/", "salesbot/"]

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

function normalizeFolder(folder) {
  const value = String(folder || DEFAULT_FOLDER).trim()
  if (!/^[a-zA-Z0-9/_-]+$/.test(value)) return null
  if (!ALLOWED_FOLDER_PREFIXES.some((prefix) => value.startsWith(prefix))) return null
  return value
}

export async function POST(request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorizedResponse()

  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return errorResponse("Cloudinary is not configured", 500)
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const folder = normalizeFolder(formData.get("folder"))

    if (!file) {
      return errorResponse("File is required", 400)
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return errorResponse("Unsupported file type", 400)
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return errorResponse("File is too large", 400)
    }

    if (!folder) {
      return errorResponse("Invalid upload folder", 400)
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")
    const dataURI = `data:${file.type};base64,${base64}`

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        dataURI,
        {
          folder,
          resource_type: "image",
          quality: "auto:good",
          allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        },
        (error, uploadResult) => {
          if (error) reject(error)
          else resolve(uploadResult)
        }
      )
    })

    return NextResponse.json({
      success: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type,
    })
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    return errorResponse("Failed to upload file", 500)
  }
}
