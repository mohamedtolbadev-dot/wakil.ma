"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { adminAPI } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  FileText, Plus, Loader2, Pencil, Trash2, Eye, Search,
  CalendarDays, X, Save, Globe2, Archive, CheckCircle2,
  ImageIcon, UploadCloud,
} from "lucide-react"

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  category: "",
  language: "fr",
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  status: "DRAFT",
}

const labels = {
  fr: {
    title: "Blogs",
    subtitle: "Articles SEO publics pour Wakil.ma",
    newPost: "Nouvel article",
    search: "Rechercher un article...",
    all: "Tous",
    draft: "Brouillon",
    published: "Publie",
    archived: "Archive",
    noPosts: "Aucun article pour le moment",
    edit: "Modifier l'article",
    create: "Creer un article",
    delete: "Supprimer",
    save: "Enregistrer",
    cancel: "Annuler",
    titleField: "Titre",
    slug: "Slug SEO",
    excerpt: "Resume court",
    content: "Contenu",
    coverImage: "Image de couverture",
    uploadCover: "Importer depuis l'ordinateur",
    uploadingCover: "Importation...",
    removeCover: "Retirer l'image",
    coverImageUrl: "URL de l'image (optionnel)",
    coverUploadError: "Impossible d'importer l'image.",
    coverInvalidFile: "Veuillez choisir une image valide.",
    category: "Categorie",
    language: "Langue",
    metaTitle: "Meta title",
    metaDescription: "Meta description",
    keywords: "Mots-cles",
    status: "Statut",
    confirmDelete: "Supprimer cet article ?",
    required: "Titre, resume et contenu sont obligatoires.",
    publicLink: "Voir public",
    updated: "Mis a jour",
  },
  ar: {
    title: "المدونة",
    subtitle: "مقالات SEO عامة لـ Wakil.ma",
    newPost: "مقال جديد",
    search: "ابحث عن مقال...",
    all: "الكل",
    draft: "مسودة",
    published: "منشور",
    archived: "مؤرشف",
    noPosts: "لا توجد مقالات بعد",
    edit: "تعديل المقال",
    create: "إنشاء مقال",
    delete: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    titleField: "العنوان",
    slug: "رابط SEO",
    excerpt: "ملخص قصير",
    content: "المحتوى",
    coverImage: "صورة الغلاف",
    uploadCover: "رفع صورة من الجهاز",
    uploadingCover: "جاري الرفع...",
    removeCover: "حذف الصورة",
    coverImageUrl: "رابط الصورة (اختياري)",
    coverUploadError: "تعذر رفع الصورة.",
    coverInvalidFile: "اختار صورة صالحة.",
    category: "التصنيف",
    language: "اللغة",
    metaTitle: "عنوان Meta",
    metaDescription: "وصف Meta",
    keywords: "الكلمات المفتاحية",
    status: "الحالة",
    confirmDelete: "هل تريد حذف هذا المقال؟",
    required: "العنوان، الملخص والمحتوى إجباريون.",
    publicLink: "عرض عام",
    updated: "آخر تعديل",
  },
}

const statusConfig = {
  DRAFT: { icon: FileText, cls: "text-amber-600 bg-amber-500/10 border-amber-500/20", label: "draft" },
  PUBLISHED: { icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20", label: "published" },
  ARCHIVED: { icon: Archive, cls: "text-muted-foreground bg-secondary border-border", label: "archived" },
}

const inputCls = "w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-brand-600"
const MAX_BLOG_COVER_SIZE = 8 * 1024 * 1024

function formatDate(date, locale) {
  if (!date) return "-"
  return new Date(date).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function StatusBadge({ status, t }) {
  const cfg = statusConfig[status] || statusConfig.DRAFT
  const Icon = cfg.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold", cfg.cls)}>
      <Icon size={13} />
      {t[cfg.label]}
    </span>
  )
}

function BlogModal({ post, onClose, onSave, saving }) {
  const { language } = useLanguage()
  const t = labels[language] || labels.fr
  const isEdit = Boolean(post?.id)
  const [form, setForm] = useState(() => post ? {
    title: post.title || "",
    slug: post.slug || "",
    excerpt: post.excerpt || "",
    content: post.content || "",
    coverImage: post.coverImage || "",
    category: post.category || "",
    language: post.language || "fr",
    metaTitle: post.metaTitle || "",
    metaDescription: post.metaDescription || "",
    keywords: post.keywords || "",
    status: post.status || "DRAFT",
  } : emptyForm)
  const [error, setError] = useState("")
  const [uploadingCover, setUploadingCover] = useState(false)

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  async function uploadCoverImage(file) {
    if (!file) return

    if (!file.type?.startsWith("image/") || file.size > MAX_BLOG_COVER_SIZE) {
      setError(t.coverInvalidFile)
      return
    }

    try {
      setError("")
      setUploadingCover(true)
      const token = localStorage.getItem("token")
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "wakil/blogs")

      const res = await fetch("/api/upload-media", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      })
      const data = await res.json()

      if (!res.ok || !data?.success || !data?.secure_url) {
        throw new Error(data?.error || t.coverUploadError)
      }

      set("coverImage", data.secure_url)
    } catch (err) {
      setError(err.message || t.coverUploadError)
    } finally {
      setUploadingCover(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      setError(t.required)
      return
    }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <p className="text-base font-extrabold text-foreground">{isEdit ? t.edit : t.create}</p>
            <p className="text-xs text-muted-foreground">/blogs/{form.slug || "slug"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X size={17} />
          </button>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">{t.titleField}</label>
              <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">{t.excerpt}</label>
              <textarea className={cn(inputCls, "min-h-24 resize-y")} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">{t.content}</label>
              <textarea
                className={cn(inputCls, "min-h-[340px] resize-y font-mono text-[13px] leading-7")}
                placeholder={"## Section title\n\nParagraph...\n\n- Bullet one\n- Bullet two"}
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
              />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary/25 p-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">{t.status}</label>
                  <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                    <option value="DRAFT">{t.draft}</option>
                    <option value="PUBLISHED">{t.published}</option>
                    <option value="ARCHIVED">{t.archived}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">{t.language}</label>
                  <select className={inputCls} value={form.language} onChange={(e) => set("language", e.target.value)}>
                    <option value="fr">Français</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">{t.slug}</label>
                  <input className={inputCls} value={form.slug} onChange={(e) => set("slug", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">{t.category}</label>
                  <input className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">{t.coverImage}</label>
                  {form.coverImage ? (
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                      <div
                        className="h-32 bg-secondary bg-cover bg-center"
                        style={{ backgroundImage: `url(${form.coverImage})` }}
                      />
                      <div className="flex items-center justify-between gap-2 p-2">
                        <span className="truncate text-[11px] text-muted-foreground">{form.coverImage}</span>
                        <button
                          type="button"
                          onClick={() => set("coverImage", "")}
                          className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-foreground hover:bg-secondary"
                        >
                          {t.removeCover}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingCover}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadCoverImage(file)
                        e.target.value = ""
                      }}
                    />
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-3 text-center text-xs font-bold text-muted-foreground transition-colors hover:border-brand-600/40 hover:bg-secondary/60">
                      {uploadingCover ? (
                        <>
                          <Loader2 size={15} className="animate-spin text-brand-600" />
                          {t.uploadingCover}
                        </>
                      ) : (
                        <>
                          <UploadCloud size={15} className="text-brand-600" />
                          {t.uploadCover}
                        </>
                      )}
                    </div>
                  </label>
                  <div className="relative">
                    <ImageIcon size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className={cn(inputCls, "ps-9")}
                      placeholder={t.coverImageUrl}
                      value={form.coverImage}
                      onChange={(e) => set("coverImage", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-extrabold text-foreground">SEO</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">{t.metaTitle}</label>
                  <input className={inputCls} value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">{t.metaDescription}</label>
                  <textarea className={cn(inputCls, "min-h-20 resize-y")} value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">{t.keywords}</label>
                  <textarea className={cn(inputCls, "min-h-16 resize-y")} value={form.keywords} onChange={(e) => set("keywords", e.target.value)} />
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary">
            {t.cancel}
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {t.save}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminBlogsPage() {
  const { language, locale, dir } = useLanguage()
  const t = labels[language] || labels.fr
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("ALL")
  const [modalPost, setModalPost] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await adminAPI.getBlogs({ status, q: query })
      setPosts(res.data || [])
    } catch (err) {
      setError(err.message || "Failed to load blogs")
    } finally {
      setLoading(false)
    }
  }, [query, status])

  useEffect(() => {
    const timer = setTimeout(loadPosts, 250)
    return () => clearTimeout(timer)
  }, [loadPosts])

  const totals = useMemo(() => ({
    all: posts.length,
    published: posts.filter((post) => post.status === "PUBLISHED").length,
    draft: posts.filter((post) => post.status === "DRAFT").length,
  }), [posts])

  function openCreate() {
    setModalPost(null)
    setModalOpen(true)
  }

  function openEdit(post) {
    setModalPost(post)
    setModalOpen(true)
  }

  async function savePost(form) {
    try {
      setSaving(true)
      if (modalPost?.id) {
        await adminAPI.updateBlog(modalPost.id, form)
      } else {
        await adminAPI.createBlog(form)
      }
      setModalOpen(false)
      setModalPost(null)
      await loadPosts()
    } catch (err) {
      setError(err.message || "Failed to save blog")
    } finally {
      setSaving(false)
    }
  }

  async function deletePost(post) {
    if (!window.confirm(t.confirmDelete)) return
    try {
      await adminAPI.deleteBlog(post.id)
      await loadPosts()
    } catch (err) {
      setError(err.message || "Failed to delete blog")
    }
  }

  return (
    <div className="pb-8" dir={dir}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-600/20 bg-brand-600/10">
            <FileText size={18} className="text-brand-600 dark:text-brand-300" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>

        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800">
          <Plus size={16} />
          {t.newPost}
        </button>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-extrabold text-foreground">{totals.all}</p>
          <p className="text-xs text-muted-foreground">{t.all}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-extrabold text-emerald-600">{totals.published}</p>
          <p className="text-xs text-muted-foreground">{t.published}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-extrabold text-amber-600">{totals.draft}</p>
          <p className="text-xs text-muted-foreground">{t.draft}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border bg-card py-2.5 pe-3 ps-9 text-sm text-foreground outline-none focus:border-brand-600"
            placeholder={t.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-600" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">{t.all}</option>
          <option value="DRAFT">{t.draft}</option>
          <option value="PUBLISHED">{t.published}</option>
          <option value="ARCHIVED">{t.archived}</option>
        </select>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 size={24} className="animate-spin text-brand-600" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <FileText size={30} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm font-bold text-foreground">{t.noPosts}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {posts.map((post) => (
            <div key={post.id} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-brand-600/30">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={post.status} t={t} />
                    {post.category && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        <Globe2 size={12} />
                        {post.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-extrabold text-foreground">{post.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
                    <span>/blogs/{post.slug}</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={12} />
                      {t.updated}: {formatDate(post.updatedAt, locale)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {post.status === "PUBLISHED" && (
                    <Link href={`/blogs/${post.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary">
                      <Eye size={14} />
                      {t.publicLink}
                    </Link>
                  )}
                  <button onClick={() => openEdit(post)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary">
                    <Pencil size={14} />
                    {t.edit}
                  </button>
                  <button onClick={() => deletePost(post)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10">
                    <Trash2 size={14} />
                    {t.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <BlogModal
          post={modalPost}
          saving={saving}
          onClose={() => {
            setModalOpen(false)
            setModalPost(null)
          }}
          onSave={savePost}
        />
      )}
    </div>
  )
}
