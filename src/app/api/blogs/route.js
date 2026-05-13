import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { BLOG_SELECT } from "@/lib/blogs"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get("language")
    const take = Math.min(Number(searchParams.get("take") || 24), 50)

    const posts = await prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null, lte: new Date() },
        ...(language ? { language } : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take,
      select: BLOG_SELECT,
    })

    return NextResponse.json({ data: posts })
  } catch (error) {
    console.error("GET /api/blogs error:", error)
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 })
  }
}
