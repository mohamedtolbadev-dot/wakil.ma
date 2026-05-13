import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSuperAdminFromRequest } from "@/lib/adminAuth"
import { BLOG_SELECT, normalizeBlogPayload, slugify } from "@/lib/blogs"

async function ensureUniqueSlug(baseSlug) {
  const base = slugify(baseSlug)
  let slug = base
  let i = 2

  while (await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${i}`
    i += 1
  }

  return slug
}

// GET /api/admin/blogs
export async function GET(request) {
  try {
    const admin = await getSuperAdminFromRequest(request)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const q = searchParams.get("q")?.trim()

    const posts = await prisma.blogPost.findMany({
      where: {
        ...(status && status !== "ALL" ? { status } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { excerpt: { contains: q } },
                { slug: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      select: BLOG_SELECT,
    })

    return NextResponse.json({ data: posts })
  } catch (error) {
    console.error("GET /api/admin/blogs error:", error)
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 })
  }
}

// POST /api/admin/blogs
export async function POST(request) {
  try {
    const admin = await getSuperAdminFromRequest(request)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const payload = normalizeBlogPayload(await request.json())
    if (!payload.title || !payload.excerpt || !payload.content) {
      return NextResponse.json({ error: "title, excerpt and content are required" }, { status: 400 })
    }

    const slug = await ensureUniqueSlug(payload.slug)
    const now = new Date()

    const post = await prisma.blogPost.create({
      data: {
        ...payload,
        slug,
        authorId: admin.userId,
        publishedAt: payload.status === "PUBLISHED" ? now : null,
      },
      select: BLOG_SELECT,
    })

    return NextResponse.json({ data: post }, { status: 201 })
  } catch (error) {
    console.error("POST /api/admin/blogs error:", error)
    return NextResponse.json({ error: "Failed to create blog post" }, { status: 500 })
  }
}
