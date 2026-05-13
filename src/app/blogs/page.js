import Link from "next/link"
import { cookies } from "next/headers"
import { CalendarDays, Clock, ArrowLeft, Search, MessageCircle } from "lucide-react"
import { BlogLanguageRefresh } from "@/components/blogs/BlogLanguageRefresh"
import { Logo } from "@/components/shared/Logo"
import { prisma } from "@/lib/prisma"
import { readingTime } from "@/lib/blogs"

export const dynamic = "force-dynamic"

const BLOG_LANGUAGES = new Set(["fr", "ar"])

function normalizeBlogLanguage(language) {
  return BLOG_LANGUAGES.has(language) ? language : "fr"
}

async function getCurrentBlogLanguage() {
  const cookieStore = await cookies()
  return normalizeBlogLanguage(cookieStore.get("salesbot_lang")?.value)
}

function getBlogCopy(language) {
  if (language === "ar") {
    return {
      cta: "أنشئ الوكيل",
      badge: "مدونة Wakil.ma",
      title: "نصائح للبيع أكثر على واتساب بالذكاء الاصطناعي",
      subtitle: "دلائل عملية للمتاجر المغربية حول WhatsApp Business، وكيل AI، الطلبيات، CRM، التوصيل CSV وتجربة الزبون.",
      read: "اقرأ المقال",
      emptyTitle: "ما كاين حتى مقال منشور دابا.",
      emptySub: "المقالات المنشورة من لوحة التحكم غادي تبان هنا تلقائياً حسب لغة الواجهة.",
    }
  }

  return {
    cta: "Créer mon agent",
    badge: "Blog SEO Wakil.ma",
    title: "Conseils pour vendre plus sur WhatsApp avec l'IA",
    subtitle: "Guides pratiques pour les boutiques marocaines: WhatsApp Business, agent IA, commandes, CRM, livraison CSV et expérience client.",
    read: "Lire l'article",
    emptyTitle: "Aucun article publié pour le moment.",
    emptySub: "Les articles publiés depuis le dashboard apparaîtront ici automatiquement selon la langue active.",
  }
}

async function getPosts(language) {
  return prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { not: null, lte: new Date() },
      language,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImage: true,
      category: true,
      publishedAt: true,
      createdAt: true,
    },
  })
}

function formatDate(date, language) {
  return new Date(date).toLocaleDateString(language === "ar" ? "ar-MA" : "fr-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function BlogCard({ post, featured = false, language, readLabel }) {
  const date = post.publishedAt || post.createdAt

  return (
    <Link
      href={`/blogs/${post.slug}`}
      className={`group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-brand-600/35 hover:shadow-xl hover:shadow-brand-600/10 ${
        featured ? "md:grid md:grid-cols-[1.1fr_0.9fr]" : ""
      }`}
    >
      <div
        className={`relative ${featured ? "min-h-[260px] md:min-h-full" : "h-44"} bg-secondary`}
        style={post.coverImage ? { backgroundImage: `url(${post.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {!post.coverImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-600">
            <MessageCircle size={42} className="text-white/85" />
          </div>
        )}
        {post.category && (
          <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-700 shadow-sm">
            {post.category}
          </span>
        )}
      </div>

      <div className={`${featured ? "p-6 md:p-8" : "p-5"} flex h-full flex-col`}>
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} />
            {formatDate(date, language)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} />
            {readingTime(post.content)} min
          </span>
        </div>

        <h2 className={`${featured ? "text-2xl md:text-3xl" : "text-lg"} font-extrabold leading-tight text-foreground group-hover:text-brand-600`}>
          {post.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {post.excerpt}
        </p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-600">
          {readLabel}
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
        </span>
      </div>
    </Link>
  )
}

export default async function BlogsPage() {
  const language = await getCurrentBlogLanguage()
  const copy = getBlogCopy(language)
  const posts = await getPosts(language)
  const [featured, ...rest] = posts

  return (
    <main className="min-h-screen bg-background text-foreground" dir={language === "ar" ? "rtl" : "ltr"}>
      <BlogLanguageRefresh initialLanguage={language} />
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <Link href="/register" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800">
            {copy.cta}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-brand-600/10 px-3 py-1 text-xs font-bold text-brand-700 dark:text-brand-300">
            <Search size={13} />
            {copy.badge}
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-lg font-bold text-foreground">{copy.emptyTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">{copy.emptySub}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {featured && <BlogCard post={featured} featured language={language} readLabel={copy.read} />}
            {rest.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <BlogCard key={post.id} post={post} language={language} readLabel={copy.read} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
