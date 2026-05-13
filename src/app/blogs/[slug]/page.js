import Link from "next/link"
import Script from "next/script"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays, Clock, MessageCircle } from "lucide-react"
import { Logo } from "@/components/shared/Logo"
import { prisma } from "@/lib/prisma"
import { generateMetadata as buildMetadata, siteConfig } from "@/lib/metadata"
import { getBlogDescription, readingTime } from "@/lib/blogs"

export const dynamic = "force-dynamic"

async function getPost(slug) {
  return prisma.blogPost.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      publishedAt: { not: null, lte: new Date() },
    },
    select: {
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
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          name: true,
        },
      },
    },
  })
}

export async function generateMetadata({ params }) {
  const { slug } = await Promise.resolve(params)
  const post = await getPost(slug)
  if (!post) {
    return buildMetadata({
      title: "Article introuvable",
      description: "Article de blog introuvable.",
      path: "/blogs",
      noIndex: true,
    })
  }

  return buildMetadata({
    title: post.metaTitle || post.title,
    description: getBlogDescription(post),
    lang: post.language || "fr",
    path: `/blogs/${post.slug}`,
  })
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("fr-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function renderContent(content) {
  const blocks = String(content || "").split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)

  return blocks.map((block, index) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={index} className="mt-9 text-2xl font-extrabold leading-tight text-foreground">
          {block.slice(3)}
        </h2>
      )
    }

    if (block.startsWith("### ")) {
      return (
        <h3 key={index} className="mt-7 text-xl font-bold leading-tight text-foreground">
          {block.slice(4)}
        </h3>
      )
    }

    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean)
    if (lines.every((line) => line.startsWith("- "))) {
      return (
        <ul key={index} className="my-5 list-disc space-y-2 ps-6 text-[15px] leading-8 text-muted-foreground">
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{line.slice(2)}</li>
          ))}
        </ul>
      )
    }

    return (
      <p key={index} className="my-5 text-[16px] leading-8 text-muted-foreground">
        {block}
      </p>
    )
  })
}

export default async function BlogPostPage({ params }) {
  const { slug } = await Promise.resolve(params)
  const post = await getPost(slug)
  if (!post) notFound()

  const publishedDate = post.publishedAt || post.createdAt
  const articleUrl = `${siteConfig.url}/blogs/${post.slug}`
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: getBlogDescription(post),
    image: post.coverImage ? [post.coverImage] : [`${siteConfig.url}${siteConfig.ogImage}`],
    datePublished: new Date(publishedDate).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    author: {
      "@type": "Organization",
      name: post.author?.name || siteConfig.name,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/favicon.svg`,
      },
    },
    mainEntityOfPage: articleUrl,
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Script
        id={`article-jsonld-${post.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <Link href="/blogs" className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-300">
            <ArrowLeft size={14} />
            Blog
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
          {post.category && (
            <span className="rounded-full bg-brand-600/10 px-3 py-1 font-bold text-brand-700 dark:text-brand-300">
              {post.category}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} />
            {formatDate(publishedDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} />
            {readingTime(post.content)} min
          </span>
        </div>

        <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          {post.excerpt}
        </p>

        <div
          className={`mt-8 flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-3xl border border-border bg-center bg-no-repeat ${
            post.coverImage ? "bg-secondary" : "bg-brand-600"
          }`}
          style={post.coverImage ? { backgroundImage: `url(${post.coverImage})`, backgroundSize: "contain" } : undefined}
        >
          {!post.coverImage && <MessageCircle size={54} className="text-white/80" />}
        </div>

        <div className="mt-8 border-t border-border pt-4">
          {renderContent(post.content)}
        </div>

        <div className="mt-12 rounded-2xl border border-brand-600/20 bg-brand-600/10 p-5">
          <p className="text-lg font-extrabold text-foreground">Transformez vos discussions WhatsApp en commandes.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Wakil.ma aide les boutiques marocaines a repondre aux clients, creer les commandes et preparer le workflow livraison.
          </p>
          <Link href="/register" className="mt-4 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-800">
            Creer mon agent
          </Link>
        </div>
      </article>
    </main>
  )
}
