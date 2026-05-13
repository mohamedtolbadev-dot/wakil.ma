export const BLOG_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  coverImage: true,
  category: true,
  language: true,
  metaTitle: true,
  metaDescription: true,
  keywords: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      name: true,
    },
  },
}

export function slugify(input = "") {
  const slug = String(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")

  return slug || `blog-${Date.now()}`
}

export function readingTime(content = "") {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

export function normalizeBlogPayload(body = {}) {
  const title = String(body.title || "").trim()
  const excerpt = String(body.excerpt || "").trim()
  const content = String(body.content || "").trim()
  const rawSlug = String(body.slug || title).trim()
  const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(body.status)
    ? body.status
    : "DRAFT"

  return {
    title,
    slug: slugify(rawSlug),
    excerpt,
    content,
    coverImage: String(body.coverImage || "").trim() || null,
    category: String(body.category || "").trim() || null,
    language: String(body.language || "fr").trim() || "fr",
    metaTitle: String(body.metaTitle || "").trim() || null,
    metaDescription: String(body.metaDescription || "").trim() || null,
    keywords: String(body.keywords || "").trim() || null,
    status,
  }
}

export function getBlogDescription(post) {
  return post?.metaDescription || post?.excerpt || ""
}
