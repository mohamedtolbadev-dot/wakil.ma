import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSuperAdminFromRequest } from "@/lib/adminAuth"
import { BLOG_SELECT, normalizeBlogPayload, slugify } from "@/lib/blogs"

async function getParams(params) {
  return Promise.resolve(params || {})
}

async function ensureUniqueSlug(baseSlug, currentId) {
  const base = slugify(baseSlug)
  let slug = base
  let i = 2

  while (true) {
    const existing = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } })
    if (!existing || existing.id === currentId) return slug
    slug = `${base}-${i}`
    i += 1
  }
}

// GET /api/admin/blogs/[id]
export async function GET(request, { params }) {
  try {
    const admin = await getSuperAdminFromRequest(request)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await getParams(params)
    if (!id) return NextResponse.json({ error: "Post ID required" }, { status: 400 })

    const post = await prisma.blogPost.findUnique({ where: { id }, select: BLOG_SELECT })
    if (!post) return NextResponse.json({ error: "Blog post not found" }, { status: 404 })

    return NextResponse.json({ data: post })
  } catch (error) {
    console.error("GET /api/admin/blogs/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch blog post" }, { status: 500 })
  }
}

// PATCH /api/admin/blogs/[id]
export async function PATCH(request, { params }) {
  try {
    const admin = await getSuperAdminFromRequest(request)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await getParams(params)
    if (!id) return NextResponse.json({ error: "Post ID required" }, { status: 400 })

    const existing = await prisma.blogPost.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Blog post not found" }, { status: 404 })

    const payload = normalizeBlogPayload(await request.json())
    if (!payload.title || !payload.excerpt || !payload.content) {
      return NextResponse.json({ error: "title, excerpt and content are required" }, { status: 400 })
    }

    const slug = await ensureUniqueSlug(payload.slug, id)
    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...payload,
        slug,
        publishedAt: payload.status === "PUBLISHED"
          ? existing.publishedAt || new Date()
          : null,
      },
      select: BLOG_SELECT,
    })

    return NextResponse.json({ data: post })
  } catch (error) {
    console.error("PATCH /api/admin/blogs/[id] error:", error)
    return NextResponse.json({ error: "Failed to update blog post" }, { status: 500 })
  }
}

// DELETE /api/admin/blogs/[id]
export async function DELETE(request, { params }) {
  try {
    const admin = await getSuperAdminFromRequest(request)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await getParams(params)
    if (!id) return NextResponse.json({ error: "Post ID required" }, { status: 400 })

    const existing = await prisma.blogPost.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: "Blog post not found" }, { status: 404 })

    await prisma.blogPost.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/admin/blogs/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete blog post" }, { status: 500 })
  }
}
