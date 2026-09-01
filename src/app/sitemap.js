import { prisma } from "@/lib/prisma"
import { siteConfig } from "@/lib/metadata"

export const dynamic = "force-dynamic"

export default async function sitemap() {
  const staticPages = ["", "/features", "/pricing", "/blogs", "/privacy", "/terms"].map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/features" ? 0.85 : path === "/pricing" ? 0.9 : 0.7,
  }))

  const posts = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { not: null, lte: new Date() },
    },
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  })

  return [
    ...staticPages,
    ...posts.map((post) => ({
      url: `${siteConfig.url}/blogs/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
  ]
}
