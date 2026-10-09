"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { productsAPI, usageAPI } from "@/lib/api"
import { formatAmount } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import {
  Plus, Search, Trash2, ShoppingBag, Eye, EyeOff,
  Package, Tag, Loader2, ImageIcon, X, Pencil,
  Maximize2, AlertCircle, AlertTriangle, RefreshCw, ChevronDown,
  Link2, Sparkles, Download, Megaphone, Video,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

/* ─────────────── Skeleton ─────────────── */
function ProductsSkeleton() {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <style>{`
        @keyframes sk-shimmer { 0%{background-position:-700px 0} 100%{background-position:700px 0} }
        .sk{
          border-radius:10px;
          background:linear-gradient(90deg,rgba(0,0,0,.06) 25%,rgba(0,0,0,.12) 50%,rgba(0,0,0,.06) 75%);
          background-size:700px 100%;
          animation:sk-shimmer 1.5s ease-in-out infinite;
          flex-shrink:0;
        }
        .dark .sk{
          background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.06) 75%);
          background-size:700px 100%;
        }
        .sk-brand{
          border-radius:10px;
          background:linear-gradient(90deg,rgba(113,45,222,.12) 25%,rgba(113,45,222,.26) 50%,rgba(113,45,222,.12) 75%);
          background-size:700px 100%;
          animation:sk-shimmer 1.5s ease-in-out infinite;
          flex-shrink:0;
        }
      `}</style>
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="sk w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="flex flex-col gap-1.5">
            <div className="sk h-4 w-[80px]" />
            <div className="sk h-[11px] w-[100px]" />
          </div>
        </div>
        <div className="sk-brand h-8 w-[90px]" />
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { badge: 36, val: 48,  label: 110 },
          { badge: 32, val: 40,  label: 96  },
          { badge: 40, val: 36,  label: 104 },
          { badge: 36, val: 52,  label: 88  },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-5 flex flex-col gap-2.5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex justify-between items-start">
              <div className="sk w-8 h-8 rounded-lg" />
              <div className="sk h-5 rounded-md" style={{ width: s.badge }} />
            </div>
            <div className="sk h-[26px] rounded-md" style={{ width: s.val }} />
            <div className="sk h-[11px]" style={{ width: s.label }} />
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative bg-card border border-border rounded-lg px-3 py-2.5 flex items-center">
        <div className="sk absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded" />
        <div className="sk h-3 w-[140px] mr-5" />
      </div>

      {/* ── Products Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[
          { name: "90%",  desc1: "100%", desc2: "75%",  price: 56, tag: 52, delay: 0   },
          { name: "80%",  desc1: "95%",  desc2: "60%",  price: 64, tag: 48, delay: 50  },
          { name: "85%",  desc1: "100%", desc2: "70%",  price: 48, tag: 56, delay: 100 },
          { name: "88%",  desc1: "92%",  desc2: "55%",  price: 60, tag: 44, delay: 150 },
          { name: "76%",  desc1: "98%",  desc2: "65%",  price: 52, tag: 50, delay: 200 },
        ].map((c, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl overflow-hidden"
            style={{ animationDelay: `${c.delay}ms` }}
          >
            {/* Image zone */}
            <div className="sk h-36 sm:h-44 w-full rounded-none" />

            {/* Body */}
            <div className="p-4 flex flex-col gap-2">
              {/* Name */}
              <div className="sk h-[13px]" style={{ width: c.name }} />
              {/* Price */}
              <div className="sk h-[15px] rounded" style={{ width: c.price }} />
              {/* Description — hidden on mobile like original */}
              <div className="hidden sm:flex flex-col gap-1.5">
                <div className="sk h-[11px]" style={{ width: c.desc1 }} />
                <div className="sk h-[11px]" style={{ width: c.desc2 }} />
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                <div className="sk h-[10px]" style={{ width: c.tag }} />
                <div className="flex items-center gap-0.5">
                  {[0,1,2,3].map(j => (
                    <div key={j} className="sk w-[26px] h-[26px] rounded-md" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add tile */}
        <div className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2.5 p-4 min-h-[170px] sm:min-h-[200px]">
          <div className="sk w-10 h-10 rounded-xl" />
          <div className="sk h-[11px] w-[90px]" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Animated Number ─────────────── */
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    const target = typeof value === "number" ? value : 0
    const duration = 800
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.floor(eased * target))
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else setDisplay(target)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value])
  return <>{display}</>
}

/* ─────────────── Stat Card ─────────────── */
function StatCard({ label, value, icon: Icon, badge, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div
      className="group bg-card border border-border rounded-xl p-5 cursor-default transition-all duration-300 hover:border-brand-300 hover:shadow-lg hover:-translate-y-0.5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <Icon size={16} className="text-brand-600" />
        </div>
        {badge && (
          <span className="text-[12px] font-semibold text-brand-600 bg-secondary border border-brand-200 px-1.5 py-0.5 rounded-md">
            {badge}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-foreground group-hover:text-brand-600 transition-colors duration-300 tabular-nums">
        <AnimatedNumber value={value} />
      </p>
      <p className="text-[13px] text-muted-foreground mt-0.5 font-medium">{label}</p>
      <div className="mt-3 h-[2px] w-0 bg-brand-600 rounded-full group-hover:w-full transition-all duration-500 ease-out" />
    </div>
  )
}

/* ─────────────── Image Upload Zone ─────────────── */
function ImageUploadZone({ images, onUpload, onRemove, uploading }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium text-muted-foreground flex items-center gap-1.5">
        <ImageIcon size={14} className="text-brand-600" /> {t('products.images')}
      </label>
      <label className="cursor-pointer">
        <input type="file" accept="image/*" multiple onChange={onUpload} disabled={uploading} className="hidden" />
        <div className="px-4 py-3 bg-secondary border border-dashed border-border rounded-lg text-[13px] text-center hover:border-brand-300 hover:bg-secondary/70 transition-all duration-200">
          {uploading
            ? <span className="flex items-center justify-center gap-2 text-muted-foreground"><Loader2 size={14} className="animate-spin" />{t('products.uploading')}</span>
            : <span className="flex items-center justify-center gap-2 text-muted-foreground"><Plus size={14} />{t('products.choose_images')}</span>}
        </div>
      </label>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, idx) => (
            <div key={idx} className="flex items-center gap-1.5 bg-secondary border border-border rounded-lg px-2 py-1.5 group/img">
              <img src={url} alt="" className="w-6 h-6 rounded object-cover" />
              <span className="text-[12px] text-muted-foreground truncate max-w-[70px]">{t('products.image')} {idx + 1}</span>
              <button onClick={() => onRemove(idx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VideoUploadZone({ videos, onUpload, onRemove, uploading }) {
  const { t } = useLanguage()
  const list = Array.isArray(videos) ? videos : []
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium text-muted-foreground flex items-center gap-1.5">
        <Video size={14} className="text-brand-600" /> {t('products.videos') || "Videos"}
      </label>
      <label className="cursor-pointer">
        <input type="file" accept="video/mp4,video/webm,video/quicktime" multiple onChange={onUpload} disabled={uploading} className="hidden" />
        <div className="px-4 py-3 bg-secondary border border-dashed border-border rounded-lg text-[13px] text-center hover:border-brand-300 hover:bg-secondary/70 transition-all duration-200">
          {uploading
            ? <span className="flex items-center justify-center gap-2 text-muted-foreground"><Loader2 size={14} className="animate-spin" />{t('products.uploading')}</span>
            : <span className="flex items-center justify-center gap-2 text-muted-foreground"><Plus size={14} />{t('products.choose_videos') || "Choose videos"}</span>}
        </div>
      </label>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {list.map((url, idx) => (
            <div key={idx} className="flex items-center gap-1.5 bg-secondary border border-border rounded-lg px-2 py-1.5 group/video">
              <Video size={14} className="text-brand-600" />
              <span className="text-[12px] text-muted-foreground truncate max-w-[80px]">{t('products.video') || "Video"} {idx + 1}</span>
              <button onClick={() => onRemove(idx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────── Form Fields ─────────────── */
function FormField({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

/* ─────────────── Ask-Quantity Toggle ─────────────── */
function AskQuantityToggle({ value, onChange }) {
  const { t, isRTL } = useLanguage()
  const enabled = value !== false
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <div className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        isRTL ? "sm:flex-row-reverse" : ""
      )}>
        <div className={cn("min-w-0 flex-1", isRTL ? "text-right" : "text-left")}>
          <p className="text-[13px] font-semibold text-foreground">
            {t('products.ask_quantity') || "سؤال عن الكمية"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {enabled
              ? (t('products.ask_quantity_on_hint') || "الـ AI يسأل الزبون: «شحال من حبة بغيتي؟»")
              : (t('products.ask_quantity_off_hint') || "الـ AI ياخد كمية 1 تلقائياً (مناسب للهواتف/الأجهزة). الزبون يقدر يطلب كتر.")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onChange(!enabled)}
          role="switch"
          aria-checked={enabled}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
            enabled ? "bg-brand-600" : "bg-border",
            isRTL ? "self-end sm:self-center" : "self-start sm:self-center"
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
              enabled
                ? isRTL ? "-translate-x-6" : "translate-x-6"
                : isRTL ? "-translate-x-0.5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>
    </div>
  )
}

/* ─────────────── Variants Editor ─────────────── */
function VariantsEditor({ variants, onChange }) {
  const { t } = useLanguage()
  const list = Array.isArray(variants) ? variants : []

  const addGroup = () => onChange([...list, { name: "", options: [] }])
  const removeGroup = (i) => onChange(list.filter((_, idx) => idx !== i))
  const updateName = (i, name) => onChange(list.map((v, idx) => idx === i ? { ...v, name } : v))
  const addOption = (i) => onChange(list.map((v, idx) => idx === i ? { ...v, options: [...v.options, ""] } : v))
  const updateOption = (gi, oi, val) => onChange(list.map((v, idx) => idx === gi
    ? { ...v, options: v.options.map((o, j) => j === oi ? val : o) } : v))
  const removeOption = (gi, oi) => onChange(list.map((v, idx) => idx === gi
    ? { ...v, options: v.options.filter((_, j) => j !== oi) } : v))

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium text-muted-foreground flex items-center gap-1.5">
        <Tag size={14} className="text-brand-600" /> {t('products.variants') || "المقاسات / الألوان / الخيارات"}
      </label>
      {list.map((group, gi) => (
        <div key={gi} className="bg-secondary/40 border border-border rounded-lg p-2.5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={group.name}
              onChange={e => updateName(gi, e.target.value)}
              placeholder={t('products.variant_name') || "اسم المجموعة (مثل: المقاس، اللون)"}
              className="flex-1 px-2.5 py-1.5 bg-card border border-border rounded text-[13px] outline-none focus:border-brand-400"
            />
            <button onClick={() => removeGroup(gi)} className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-1 bg-card border border-border rounded px-1.5 py-1">
                <input
                  type="text"
                  value={opt}
                  onChange={e => updateOption(gi, oi, e.target.value)}
                  placeholder={t('products.variant_option') || "خيار"}
                  className="w-20 bg-transparent text-[12px] outline-none"
                />
                <button onClick={() => removeOption(gi, oi)} className="text-muted-foreground hover:text-red-500">
                  <X size={11} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addOption(gi)}
              className="flex items-center gap-1 px-2 py-1 border border-dashed border-border rounded text-[12px] text-muted-foreground hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              <Plus size={11} /> {t('products.variant_add_option') || "خيار"}
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addGroup}
        className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-border rounded-lg text-[12px] text-muted-foreground hover:border-brand-400 hover:text-brand-600 transition-colors"
      >
        <Plus size={13} /> {t('products.variant_add_group') || "إضافة مجموعة خيارات"}
      </button>
    </div>
  )
}

const inputCls = "px-3 py-2.5 bg-card border border-border rounded-lg text-[14px] outline-none focus:border-brand-400 transition-colors duration-200"

/* ─────────────── Low Stock Banner ─────────────── */
const LOW_STOCK_THRESHOLD = 5

function LowStockBanner({ products, onRestock }) {
  const { t } = useLanguage()
  const [dismissed, setDismissed] = useState(false)

  const lowStockProducts = products.filter(p => p.isActive && p.stock <= LOW_STOCK_THRESHOLD)

  if (dismissed || lowStockProducts.length === 0) return null

  return (
    <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <AlertTriangle size={14} className="text-amber-600" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-amber-700 dark:text-amber-400">{t('products.low_stock_banner_title')}</p>
            <p className="text-[12px] text-amber-600/80 dark:text-amber-500/80">{t('products.low_stock_banner_desc')}</p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-500 hover:text-amber-700 transition-colors p-0.5">
          <X size={15} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {lowStockProducts.map(p => (
          <button
            key={p.id}
            onClick={() => onRestock(p)}
            className="flex items-center gap-1.5 bg-card border border-amber-500/20 rounded-lg px-2.5 py-1.5 hover:border-amber-500/50 hover:shadow-sm transition-all duration-200 group"
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              p.stock === 0 ? "bg-red-500 animate-pulse" : "bg-amber-500"
            )} />
            <span className="text-[13px] font-medium text-foreground truncate max-w-[120px]">{p.name}</span>
            <span className={cn(
              "text-[11px] font-bold px-1.5 py-0.5 rounded-md border",
              p.stock === 0
                ? "text-red-500 bg-red-500/10 border-red-500/20"
                : "text-amber-600 bg-amber-500/10 border-amber-500/20"
            )}>
              {p.stock === 0 ? t('products.out_of_stock') : `${p.stock} ${t('products.units_left')}`}
            </span>
            <Package size={11} className="text-amber-500 group-hover:text-amber-600 transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── Product Card ─────────────── */
function ProductPlanNotice({ limit, total, remaining, copy, onUpgrade }) {
  if (!Number.isInteger(limit)) return null

  const reached = remaining <= 0
  const percent = Math.min(100, Math.round((total / limit) * 100))

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-colors",
      reached
        ? "border-amber-500/30 bg-amber-500/10"
        : "border-border bg-card"
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            reached ? "bg-amber-500/15 text-amber-600" : "bg-brand-600/10 text-brand-600"
          )}>
            {reached ? <AlertTriangle size={18} /> : <Package size={18} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">
              {reached ? copy.limitReachedTitle : copy.limitTitle}
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              {reached ? copy.limitReachedDesc : copy.limitDesc(remaining)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onUpgrade}
          className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
        >
          {copy.upgradeCta}
        </button>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[12px] text-muted-foreground">
          <span>{copy.limitUsage}</span>
          <span className="font-semibold tabular-nums text-foreground">{total} / {limit}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={cn("h-full rounded-full transition-all", reached ? "bg-amber-500" : "bg-brand-600")}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function productInsightLabel(insight, language) {
  if (!insight || insight.priority === "low") return null
  const ar = {
    restock: "طلب موجود: زيد المخزون",
    reactivate: "كاين اهتمام: فعّلو",
    launch_campaign: "فرصة حملة",
    watch_demand: "اهتمام من الزبناء",
  }
  const fr = {
    restock: "Demande: réapprovisionner",
    reactivate: "Intérêt: réactiver",
    launch_campaign: "Opportunité campagne",
    watch_demand: "Intérêt clients",
  }
  return (language === "ar" ? ar : fr)[insight.action] || null
}

function ProductInsightBadge({ insight }) {
  const { language } = useLanguage()
  const label = productInsightLabel(insight, language)
  if (!label) return null

  const cls = insight.priority === "high"
    ? "border-brand-500/25 bg-brand-600/10 text-brand-700 dark:text-brand-300"
    : "border-amber-500/25 bg-amber-500/10 text-amber-700"

  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md border", cls)}>
      <Sparkles size={10} />
      {label}
    </span>
  )
}

function ProductCard({ product, onDetails, onEdit, onToggle, onDelete, onNotify, delay = 0 }) {
  const { t, language } = useLanguage()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const images = (() => {
    try { return product.images ? JSON.parse(product.images) : [] }
    catch { return [] }
  })()
  const videos = (() => {
    try { return product.videos ? JSON.parse(product.videos) : [] }
    catch { return [] }
  })()

  const mainImage = images[0] || null
  const mainVideo = videos[0] || null
  const notifyLabel = language === "ar" ? "إطلاق حملة" : "Campagne"

  return (
    <div
      className={cn(
        "group bg-card border rounded-xl overflow-hidden transition-all duration-300",
        product.isActive
          ? "border-border hover:border-brand-300 hover:shadow-xl hover:shadow-brand-600/8 hover:-translate-y-0.5"
          : "border-border opacity-60 grayscale"
      )}
      style={{
        opacity: visible ? (product.isActive ? 1 : 0.6) : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.4s ease, transform 0.4s ease, border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <div className="h-28 sm:h-36 bg-secondary flex items-center justify-center relative overflow-hidden">
        {mainImage ? (
          <img src={mainImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : mainVideo ? (
          <video src={mainVideo} className="w-full h-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-border/50 flex items-center justify-center">
            <ShoppingBag size={20} className="text-muted-foreground/40" />
          </div>
        )}
        <span className={cn(
          "absolute top-2 right-2 text-[11px] font-bold px-1.5 py-0.5 rounded-md border",
          product.isActive ? "bg-card text-brand-600 border-brand-200" : "bg-card text-muted-foreground border-border"
        )}>
          {product.isActive ? t('products.active') : t('products.inactive')}
        </span>
        {(images.length > 1 || videos.length > 0) && (
          <span className="absolute top-2 left-2 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-black/50 text-white border border-white/10">
            {images.length + videos.length}
          </span>
        )}
        {videos.length > 0 && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-black/55 text-white border border-white/10">
            <Video size={11} /> {videos.length}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="text-[14px] font-bold text-foreground truncate flex-1">{product.name}</p>
          {product.category && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border shrink-0">
              {product.category}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-[15px] font-bold text-brand-600 tabular-nums">
            {formatAmount(product.salePrice != null ? product.salePrice : product.price)}
          </p>
          {product.salePrice != null && product.salePrice < product.price && (
            <p className="text-[12px] text-muted-foreground line-through tabular-nums">
              {formatAmount(product.price)}
            </p>
          )}
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md border mb-2",
          product.stock === 0
            ? "text-red-500 bg-red-500/10 border-red-500/20"
            : "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
        )}>
          <Package size={10} />
          {product.stock === 0 ? t('products.out_of_stock') : `${product.stock} ${t('products.stock')}`}
        </span>
        {productInsightLabel(product.insight, language) && (
          <div className="mb-2">
            <ProductInsightBadge insight={product.insight} />
          </div>
        )}
        {product.description && (
          <p className="hidden sm:block text-[13px] text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <Tag size={12} className="text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground tabular-nums">{product.questions} {t('products.questions')}</span>
          </div>
          <div className="flex items-center">
            {[
              { icon: Maximize2, onClick: () => onDetails(product), title: t('common.details'),         hoverCls: "hover:text-brand-600" },
              { icon: Pencil,    onClick: () => onEdit(product),    title: t('common.edit'),             hoverCls: "hover:text-foreground" },
              { icon: Megaphone, onClick: () => onNotify(product),  title: notifyLabel,                  hoverCls: "hover:text-brand-600" },
              { icon: product.isActive ? EyeOff : Eye, onClick: () => onToggle(product.id), title: t('products.toggle_active'), hoverCls: "hover:text-foreground" },
              { icon: Trash2,    onClick: () => onDelete(product.id), title: t('common.delete'),         hoverCls: "hover:text-red-500" },
            ].map(({ icon: Ico, onClick, title, hoverCls }) => (
              <button key={title} onClick={onClick} title={title}
                className={cn("p-1.5 rounded-md text-muted-foreground transition-all duration-150 hover:bg-secondary", hoverCls)}>
                <Ico size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Details Content ─────────────── */
function DetailsContent({ product, onClose, onEdit, onDelete, onLightbox, onNotify }) {
  const { t, language } = useLanguage()
  const images = (() => {
    try { return product.images ? JSON.parse(product.images) : [] }
    catch { return [] }
  })()
  const variants = (() => {
    try { return product.variants ? JSON.parse(product.variants) : [] }
    catch { return [] }
  })()
  const hasSale = product.salePrice != null && product.salePrice < product.price
  const notifyLabel = language === "ar" ? "إطلاق حملة" : "Campagne"

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{product.name}</h2>
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-3xl font-bold text-brand-600 tabular-nums">
            {formatAmount(hasSale ? product.salePrice : product.price)}
          </p>
          {hasSale && (
            <>
              <p className="text-[16px] text-muted-foreground line-through tabular-nums">
                {formatAmount(product.price)}
              </p>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 border border-red-500/20">
                -{Math.round(((product.price - product.salePrice) / product.price) * 100)}%
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn(
          "text-[12px] font-semibold px-2 py-1 rounded-md border",
          product.isActive ? "text-brand-600 bg-secondary border-brand-200" : "text-muted-foreground bg-secondary border-border"
        )}>
          {product.isActive ? t('products.active') : t('products.inactive')}
        </span>
        <span className={cn(
          "text-[12px] font-semibold px-2 py-1 rounded-md border inline-flex items-center gap-1",
          product.stock === 0
            ? "text-red-500 bg-red-500/10 border-red-500/20"
            : "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
        )}>
          <Package size={11} />
          {product.stock === 0 ? t('products.out_of_stock') : `${product.stock} ${t('products.stock')}`}
        </span>
        {product.category && (
          <span className="text-[12px] font-semibold px-2 py-1 rounded-md bg-secondary text-muted-foreground border border-border inline-flex items-center gap-1">
            <Tag size={11} />
            {product.category}
          </span>
        )}
        {product.askQuantity === false && (
          <span
            className="text-[11px] font-semibold px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20 inline-flex items-center gap-1"
            title={t('products.ask_quantity_off_hint') || "AI يأخذ كمية 1 تلقائياً"}
          >
            1×
          </span>
        )}
        <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
          <span>{product.questions} {t('products.questions')}</span>
        </div>
        <ProductInsightBadge insight={product.insight} />
      </div>
      {variants.length > 0 && (
        <div className="pb-4 border-b border-border">
          <p className="text-[13px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Tag size={13} /> {t('products.variants') || "الخيارات"}
          </p>
          <div className="flex flex-col gap-2">
            {variants.map((group, gi) => (
              <div key={gi} className="flex items-start gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-foreground shrink-0">{group.name}:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(group.options || []).map((opt, oi) => (
                    <span key={oi} className="text-[12px] font-medium px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground">
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {product.description && (
        <div className="pb-4 border-b border-border">
          <p className="text-[13px] font-semibold text-muted-foreground mb-1.5">{t('common.description')}</p>
          <p className="text-[14px] text-foreground whitespace-pre-wrap leading-relaxed">{product.description}</p>
        </div>
      )}
      {images.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <ImageIcon size={14} /> {t('products.images')} ({images.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {images.map((url, idx) => (
              <div key={idx} onClick={() => onLightbox(url)}
                className="rounded-xl overflow-hidden bg-secondary cursor-zoom-in relative group/img hover:shadow-lg transition-shadow duration-300">
                <img src={url} alt={`${product.name} ${idx + 1}`}
                  className="w-full h-32 sm:h-44 object-cover group-hover/img:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <Maximize2 size={18} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {videos.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Video size={14} /> {t('products.videos') || "Videos"} ({videos.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {videos.map((url, idx) => (
              <div key={idx} className="rounded-xl overflow-hidden bg-secondary border border-border">
                <video
                  src={url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-40 sm:h-48 object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-2 border-t border-border">
        <button
          onClick={() => { onDelete?.(product.id); onClose() }}
          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-500/30 text-red-600 rounded-lg text-[14px] font-semibold hover:bg-red-500/10 transition-colors duration-200"
          title={t('common.delete')}
        >
          <Trash2 size={14} />
        </button>
        <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-[14px] font-medium hover:bg-secondary transition-colors duration-200">
          {t('common.close')}
        </button>
        <button
          onClick={() => { onNotify?.(product); onClose() }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 border border-brand-300 text-brand-700 dark:text-brand-300 rounded-lg text-[14px] font-semibold hover:bg-brand-600/10 transition-colors duration-200"
        >
          <Megaphone size={14} /> {notifyLabel}
        </button>
        <button onClick={() => { onEdit(product); onClose() }}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-[14px] font-semibold hover:bg-brand-800 transition-colors duration-200 shadow-sm">
          <Pencil size={14} /> {t('products.edit')}
        </button>
      </div>
    </div>
  )
}

/* ─────────────── Import From URL Modal ─────────────── */
function ImportFromUrlModal({ onClose, onImported }) {
  const { t } = useLanguage()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    if (!url.trim()) return
    setLoading(true); setError(null)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to import")
        setLoading(false)
        return
      }
      onImported(json.data)
    } catch (e) {
      setError("Network error")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Sparkles size={16} className="text-brand-600" />
            </div>
            <p className="text-[15px] font-semibold">{t('products.import_title') || "استيراد منتج من رابط"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X size={17} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {t('products.import_desc') || "الصق رابط صفحة المنتج من موقعك (Shopify / Youcan / WooCommerce...) وسنقوم بجلب الاسم والسعر والصور تلقائياً."}
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Link2 size={13} /> {t('products.import_url') || "رابط المنتج"}
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://monshop.ma/products/t-shirt-noir"
              className={inputCls}
              dir="ltr"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") submit() }}
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[13px] text-red-600">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-2 justify-end mt-1">
            <button onClick={onClose} disabled={loading} className="px-4 py-2 border border-border rounded-lg text-[14px] font-medium hover:bg-secondary transition-colors disabled:opacity-50">
              {t('common.cancel')}
            </button>
            <button onClick={submit} disabled={loading || !url.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-[14px] font-semibold hover:bg-brand-800 transition-colors shadow-sm disabled:opacity-50">
              {loading
                ? <><Loader2 size={15} className="animate-spin" />{t('products.importing') || "جاري الاستيراد..."}</>
                : <><Download size={15} />{t('products.import_fetch') || "جلب البيانات"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════
   Main Page
════════════════════════════════════════════════ */
export default function ProductsPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [products, setProducts] = useState([])
  const [planUsage, setPlanUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: "", price: "", salePrice: "", category: "", variants: [], askQuantity: true, description: "", images: [], videos: [], stock: 0 })
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState(false)
  const [addingProduct, setAddingProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", price: "", salePrice: "", category: "", variants: [], askQuantity: true, description: "", images: [], videos: [], stock: 0 })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editUploading, setEditUploading] = useState(false)
  const [editVideoUploading, setEditVideoUploading] = useState(false)
  const [detailsProduct, setDetailsProduct] = useState(null)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" })
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState(null)

  // Reset form state helper — prevents stale data from previous opens/imports
  const resetNewProduct = () => setNewProduct({
    name: "", price: "", salePrice: "", category: "",
    variants: [], askQuantity: true, description: "", images: [], videos: [], stock: 0,
  })

  useEffect(() => {
    fetchProducts()
    fetchPlanUsage()
  }, [])

  async function fetchProducts() {
    try {
      setLoading(true); setError(null)
      const res = await productsAPI.getAll()
      setProducts(res.data || [])
    } catch {
      setError("products.loading_error")
    } finally {
      setLoading(false)
    }
  }

  async function fetchPlanUsage() {
    try {
      const res = await usageAPI.getMe()
      setPlanUsage(res.data || null)
    } catch (err) {
      console.error("Plan usage failed:", err)
    }
  }

  // Case-insensitive search across name, description, and category
  const filtered = (() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    )
  })()

  const planCopy = language === "ar"
    ? {
        limitTitle: "حد المنتجات في الخطة المجانية",
        limitReachedTitle: "وصلت لحد المنتجات في الخطة الحالية",
        limitDesc: (remaining) => `باقي لك ${remaining} منتج قبل الوصول للحد المجاني.`,
        limitReachedDesc: "يمكنك تعديل أو حذف المنتجات الحالية، لكن إضافة منتج جديد تحتاج ترقية الخطة.",
        limitUsage: "استعمال المنتجات",
        upgradeCta: "ترقية الخطة",
        limitError: "وصلت لحد 20 منتج في الخطة المجانية. رق الخطة لإضافة منتجات أكثر.",
      }
    : {
        limitTitle: "Limite produits du plan gratuit",
        limitReachedTitle: "Limite produits atteinte",
        limitDesc: (remaining) => `Il vous reste ${remaining} produit(s) avant la limite gratuite.`,
        limitReachedDesc: "Vous pouvez modifier ou supprimer vos produits, mais l'ajout d'un nouveau produit demande une mise a niveau.",
        limitUsage: "Utilisation produits",
        upgradeCta: "Mettre a niveau",
        limitError: "Limite de 20 produits atteinte sur le plan gratuit. Passez a un plan payant pour ajouter plus de produits.",
      }
  const productLimit = Number.isInteger(planUsage?.entitlements?.productLimit)
    ? planUsage.entitlements.productLimit
    : null
  const productRemaining = Number.isInteger(productLimit)
    ? Math.max(0, productLimit - products.length)
    : null
  const productLimitReached = Number.isInteger(productLimit) && productRemaining <= 0

  const openAddForm = () => {
    setFormError(null)
    if (productLimitReached) {
      setShowAddForm(false)
      setFormError(planCopy.limitError)
      return
    }
    setShowAddForm(true)
  }

  const handleToggle = async (id) => {
    const p = products.find((x) => x.id === id)
    if (!p) return
    // Optimistic update; revert on failure
    setProducts(products.map((x) => x.id === id ? { ...x, isActive: !x.isActive } : x))
    try {
      const res = await productsAPI.update(id, { isActive: !p.isActive })
      if (res?.data) {
        setProducts(prev => prev.map((x) => x.id === id ? { ...x, ...res.data } : x))
        setDetailsProduct(prev => prev?.id === id ? { ...prev, ...res.data } : prev)
      }
    } catch (err) {
      console.error("Toggle failed:", err)
      // Revert
      setProducts(prev => prev.map((x) => x.id === id ? { ...x, isActive: p.isActive } : x))
    }
  }

  const confirmDelete = async () => {
    const { id } = deleteModal
    if (!id) return
    try {
      setDeleting(true)
      await productsAPI.delete(id)
      setProducts(prev => prev.filter((x) => x.id !== id))
      setDeleteModal({ open: false, id: null, name: "" })
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setDeleting(false)
    }
  }

  const cancelDelete = () => {
    setDeleteModal({ open: false, id: null, name: "" })
  }

  const handleDelete = (id) => {
    const product = products.find(p => p.id === id)
    setDeleteModal({ open: true, id, name: product?.name || "" })
  }

  const handleAdd = async () => {
    setFormError(null)
    if (productLimitReached) {
      setFormError(planCopy.limitError)
      return
    }

    const price = Number(newProduct.price)
    const salePrice = newProduct.salePrice ? Number(newProduct.salePrice) : null
    const stock = Number(newProduct.stock)

    // Validation
    if (!newProduct.name?.trim()) { setFormError(t('products.err_name_required') || "الاسم مطلوب"); return }
    if (!Number.isFinite(price) || price < 0) { setFormError(t('products.err_price_invalid') || "السعر غير صالح"); return }
    if (salePrice != null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)) {
      setFormError(t('products.err_sale_invalid') || "سعر التخفيض يجب أن يكون أقل من السعر الأصلي"); return
    }
    if (!Number.isFinite(stock) || stock < 0) { setFormError(t('products.err_stock_invalid') || "المخزون غير صالح"); return }

    try {
      setAddingProduct(true)
      const res = await productsAPI.create({
        name: newProduct.name.trim(), price,
        salePrice,
        category: newProduct.category?.trim() || null,
        variants: newProduct.variants || [],
        askQuantity: newProduct.askQuantity !== false,
        description: newProduct.description, images: newProduct.images, videos: newProduct.videos,
        stock,
      })
      setProducts(prev => [res.data, ...prev])  // newest first
      resetNewProduct()
      setShowAddForm(false)
    } catch (err) {
      console.error("Add product failed:", err)
      setFormError(err?.response?.data?.error || t('products.err_save_failed') || "فشل الحفظ — حاول مرة أخرى")
    } finally { setAddingProduct(false) }
  }

  async function uploadFiles(files, setUploading, onDone) {
    if (!files?.length) return
    setUploading(true)
    const urls = []
    const token = localStorage.getItem("token")
    for (const file of files) {
      try {
        const fd = new FormData(); fd.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd })
        const r = await res.json()
        if (r.success) urls.push(r.url)
        else console.error("Upload failed:", r.detail || r.error)
      } catch (err) { console.error("Upload exception:", err) }
    }
    onDone(urls)
    setUploading(false)
  }

  const startEdit = (product) => {
    setFormError(null)
    setEditingProduct(product)
    const safeParse = (str) => {
      if (!str) return []
      try { const v = JSON.parse(str); return Array.isArray(v) ? v : [] }
      catch { return [] }
    }
    setEditForm({
      name: product.name, price: product.price.toString(),
      salePrice: product.salePrice != null ? product.salePrice.toString() : "",
      category: product.category || "",
      variants: safeParse(product.variants),
      askQuantity: product.askQuantity !== false,
      description: product.description || "",
      images: safeParse(product.images),
      videos: safeParse(product.videos),
      stock: product.stock ?? 0,
    })
  }

  const goToCampaigns = (product) => {
    if (!product?.id) return
    router.push(`/dashboard/campaigns?productId=${product.id}`)
  }

  const handleSaveEdit = async () => {
    if (!editingProduct) return
    setFormError(null)
    const price = Number(editForm.price)
    const salePrice = editForm.salePrice === "" ? null : Number(editForm.salePrice)
    const stock = Number(editForm.stock)

    // Validation
    if (!editForm.name?.trim()) { setFormError(t('products.err_name_required') || "الاسم مطلوب"); return }
    if (!Number.isFinite(price) || price < 0) { setFormError(t('products.err_price_invalid') || "السعر غير صالح"); return }
    if (salePrice != null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)) {
      setFormError(t('products.err_sale_invalid') || "سعر التخفيض يجب أن يكون أقل من السعر الأصلي"); return
    }
    if (!Number.isFinite(stock) || stock < 0) { setFormError(t('products.err_stock_invalid') || "المخزون غير صالح"); return }

    try {
      setSavingEdit(true)
      const payload = {
        name: editForm.name.trim(), price,
        salePrice,
        category: editForm.category?.trim() || null,
        variants: editForm.variants || [],
        askQuantity: editForm.askQuantity !== false,
        description: editForm.description, images: editForm.images, videos: editForm.videos,
        stock,
      }
      const res = await productsAPI.update(editingProduct.id, payload)
      // Prefer server response (reflects canonical data including images/variants serialization)
      const updated = res?.data || {
        ...editingProduct,
        ...payload,
        variants: payload.variants.length > 0 ? JSON.stringify(payload.variants) : null,
        images: JSON.stringify(editForm.images),
        videos: JSON.stringify(editForm.videos),
      }
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...updated } : p))
      setDetailsProduct(prev => prev?.id === editingProduct.id ? { ...prev, ...updated } : prev)
      setEditingProduct(null)
    } catch (err) {
      console.error("Save edit failed:", err)
      setFormError(err?.response?.data?.error || t('products.err_save_failed') || "فشل الحفظ — حاول مرة أخرى")
    } finally { setSavingEdit(false) }
  }

  /* ── Loading → Skeleton ── */
  if (loading) return <ProductsSkeleton />

  /* ── Error ── */
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 rounded-full border border-red-200 bg-red-50 flex items-center justify-center">
        <AlertCircle size={20} className="text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{t('common.load_error')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t(error)}</p>
      </div>
      <button onClick={fetchProducts} className="flex items-center gap-2 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors">
        <RefreshCw size={15} /> {t('common.retry')}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 pb-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Package size={17} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{t('products.title')}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {products.filter(p => p.isActive).length} {t('products.active')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            disabled={productLimitReached}
            className={cn(
              "flex items-center gap-1.5 bg-card border border-border text-foreground px-3 py-2 rounded-lg text-[13px] font-semibold hover:border-brand-300 hover:bg-secondary transition-colors duration-200",
              productLimitReached && "cursor-not-allowed opacity-50 hover:border-border hover:bg-card"
            )}
            title={t('products.import_title') || "استيراد من رابط"}
          >
            <Sparkles size={15} className="text-brand-600" /> <span className="hidden sm:inline">{t('products.import_btn') || "استيراد"}</span>
          </button>
          <button
            onClick={() => showAddForm ? setShowAddForm(false) : openAddForm()}
            disabled={productLimitReached}
            className={cn(
              "flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-brand-800 transition-colors duration-200 shadow-sm",
              productLimitReached && "cursor-not-allowed opacity-50 hover:bg-brand-600"
            )}
          >
            <Plus size={15} /> {t('products.new')}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t('products.stats_total')}     value={products.length}                                         icon={Package}  badge={t('common.all')}            delay={0}   />
        <StatCard label={t('products.stats_active')}     value={products.filter(p => p.isActive).length}                icon={Eye}      badge={t('products.active')}      delay={80}  />
        <StatCard label={t('products.stat_out_of_stock')} value={products.filter(p => p.stock === 0).length}             icon={AlertCircle} badge={t('products.out_of_stock')} delay={160} />
        <StatCard label={t('products.stat_low_stock')}   value={products.filter(p => p.isActive && p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length} icon={AlertTriangle} badge={t('products.low_stock')}          delay={240} />
      </div>

      {/* ── Low Stock Banner ── */}
      <ProductPlanNotice
        limit={productLimit}
        total={products.length}
        remaining={productRemaining}
        copy={planCopy}
        onUpgrade={() => router.push("/dashboard/invoices")}
      />

      <LowStockBanner products={products} onRestock={startEdit} />

      {/* ── Add Form ── */}
      {showAddForm && !productLimitReached && (
        <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Plus size={15} className="text-brand-600" />
              </div>
              <p className="text-[15px] font-semibold">{t('products.add_title')}</p>
            </div>
            <button onClick={() => { setShowAddForm(false); resetNewProduct(); setFormError(null) }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <X size={17} />
            </button>
          </div>
          {formError && (
            <div className="flex items-start gap-2 p-2.5 mb-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[13px] text-red-600">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <FormField label={t('products.name')}>
              <input type="text" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder={t('products.name')} className={inputCls} />
            </FormField>
            <FormField label={t('products.price')}>
              <input type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="320" className={inputCls} />
            </FormField>
            <FormField label={t('products.sale_price') || "سعر التخفيض (اختياري)"}>
              <input type="number" value={newProduct.salePrice} onChange={e => setNewProduct({ ...newProduct, salePrice: e.target.value })} placeholder="—" className={inputCls} />
            </FormField>
            <FormField label={t('products.category') || "الفئة (اختياري)"}>
              <input type="text" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} placeholder={t('products.category_placeholder') || "مثلا: ملابس، إلكترونيات"} className={inputCls} />
            </FormField>
            <FormField label={`${t('products.stock')} (${t('common.quantity')})`}>
              <input type="number" min="0" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} placeholder="0" className={inputCls} />
            </FormField>
          </div>
          <div className="mb-3">
            <FormField label={t('products.description')}>
              <textarea value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} placeholder={t('products.description')} rows={2} className={cn(inputCls, "resize-none")} />
            </FormField>
          </div>
          <div className="mb-3">
            <VariantsEditor
              variants={newProduct.variants}
              onChange={v => setNewProduct(p => ({ ...p, variants: v }))}
            />
          </div>
          <div className="mb-3">
            <AskQuantityToggle
              value={newProduct.askQuantity}
              onChange={v => setNewProduct(p => ({ ...p, askQuantity: v }))}
            />
          </div>
          <div className="mb-4">
            <ImageUploadZone
              images={newProduct.images} uploading={uploadingImages}
              onUpload={e => uploadFiles(e.target.files, setUploadingImages, urls => setNewProduct(p => ({ ...p, images: [...p.images, ...urls] })))}
              onRemove={idx => setNewProduct(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))}
            />
          </div>
          <div className="mb-4">
            <VideoUploadZone
              videos={newProduct.videos} uploading={uploadingVideos}
              onUpload={e => uploadFiles(e.target.files, setUploadingVideos, urls => setNewProduct(p => ({ ...p, videos: [...p.videos, ...urls] })))}
              onRemove={idx => setNewProduct(p => ({ ...p, videos: p.videos.filter((_, i) => i !== idx) }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowAddForm(false); resetNewProduct(); setFormError(null) }} className="px-4 py-2 border border-border rounded-lg text-[14px] font-medium hover:bg-secondary transition-colors duration-200">{t('common.cancel')}</button>
            <button onClick={handleAdd} disabled={addingProduct} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-[14px] font-semibold hover:bg-brand-800 transition-colors duration-200 shadow-sm disabled:opacity-50">
              {addingProduct ? <><Loader2 size={15} className="animate-spin" />{t('products.adding')}</> : <><Plus size={15} />{t('products.add')}</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Form ── */}
      {editingProduct && (
        <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Pencil size={15} className="text-brand-600" />
              </div>
              <p className="text-[15px] font-semibold">{t('products.edit_title')}</p>
            </div>
            <button onClick={() => { setEditingProduct(null); setFormError(null) }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <X size={17} />
            </button>
          </div>
          {formError && (
            <div className="flex items-start gap-2 p-2.5 mb-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[13px] text-red-600">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <FormField label={t('products.name')}>
              <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder={t('products.name')} className={inputCls} />
            </FormField>
            <FormField label={t('products.price')}>
              <input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} placeholder="320" className={inputCls} />
            </FormField>
            <FormField label={t('products.sale_price') || "سعر التخفيض (اختياري)"}>
              <input type="number" value={editForm.salePrice} onChange={e => setEditForm({ ...editForm, salePrice: e.target.value })} placeholder="—" className={inputCls} />
            </FormField>
            <FormField label={t('products.category') || "الفئة (اختياري)"}>
              <input type="text" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} placeholder={t('products.category_placeholder') || "مثلا: ملابس، إلكترونيات"} className={inputCls} />
            </FormField>
            <FormField label={`${t('products.stock')} (${t('common.quantity')})`}>
              <input type="number" min="0" value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })} placeholder="0" className={inputCls} />
            </FormField>
          </div>
          <div className="mb-3">
            <FormField label={t('products.description')}>
              <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder={t('products.description')} rows={2} className={cn(inputCls, "resize-none")} />
            </FormField>
          </div>
          <div className="mb-3">
            <VariantsEditor
              variants={editForm.variants}
              onChange={v => setEditForm(f => ({ ...f, variants: v }))}
            />
          </div>
          <div className="mb-3">
            <AskQuantityToggle
              value={editForm.askQuantity}
              onChange={v => setEditForm(f => ({ ...f, askQuantity: v }))}
            />
          </div>
          <div className="mb-4">
            <ImageUploadZone
              images={editForm.images} uploading={editUploading}
              onUpload={e => uploadFiles(e.target.files, setEditUploading, urls => setEditForm(f => ({ ...f, images: [...f.images, ...urls] })))}
              onRemove={idx => setEditForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}
            />
          </div>
          <div className="mb-4">
            <VideoUploadZone
              videos={editForm.videos} uploading={editVideoUploading}
              onUpload={e => uploadFiles(e.target.files, setEditVideoUploading, urls => setEditForm(f => ({ ...f, videos: [...f.videos, ...urls] })))}
              onRemove={idx => setEditForm(f => ({ ...f, videos: f.videos.filter((_, i) => i !== idx) }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setEditingProduct(null); setFormError(null) }} className="px-4 py-2 border border-border rounded-lg text-[14px] font-medium hover:bg-secondary transition-colors duration-200">{t('common.cancel')}</button>
            <button onClick={handleSaveEdit} disabled={savingEdit} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-[14px] font-semibold hover:bg-brand-800 transition-colors duration-200 shadow-sm disabled:opacity-50">
              {savingEdit ? <><Loader2 size={15} className="animate-spin" />{t('products.saving')}</> : <><Pencil size={15} />{t('products.save_changes')}</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Details Modal ── */}
      {detailsProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={() => setDetailsProduct(null)} />
          <div
            className={cn(
              "relative w-full border border-border shadow-2xl overflow-y-auto z-10",
              "animate-in fade-in duration-300",
              "rounded-t-2xl max-h-[85vh] slide-in-from-bottom-4",
              "sm:rounded-2xl sm:max-w-xl sm:max-h-[90vh] sm:mx-4"
            )}
            style={{ backgroundColor: "var(--modal-surface, var(--card))" }}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-8 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border sm:hidden">
              <p className="text-[15px] font-bold text-foreground truncate">{detailsProduct.name}</p>
              <button onClick={() => setDetailsProduct(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <ChevronDown size={20} />
              </button>
            </div>
            <button onClick={() => setDetailsProduct(null)} className="hidden sm:flex absolute top-4 left-4 p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
            <div className="p-4 sm:p-5">
              <DetailsContent product={detailsProduct} onClose={() => setDetailsProduct(null)} onEdit={startEdit} onDelete={handleDelete} onLightbox={setLightboxImage} onNotify={goToCampaigns} />
            </div>
          </div>
        </div>
      )}

      {/* ── Import From URL Modal ── */}
      {showImport && (
        <ImportFromUrlModal
          onClose={() => setShowImport(false)}
          onImported={(data) => {
            if (productLimitReached) {
              setShowImport(false)
              setFormError(planCopy.limitError)
              return
            }
            setFormError(null)
            setNewProduct({
              name: data.name || "",
              price: data.price != null ? String(data.price) : "",
              salePrice: data.salePrice != null ? String(data.salePrice) : "",
              category: data.category || "",
              variants: Array.isArray(data.variants) ? data.variants : [],
              askQuantity: true,
              description: data.description || "",
              images: Array.isArray(data.images) ? data.images : [],
              videos: Array.isArray(data.videos) ? data.videos : [],
              stock: typeof data.stock === "number" ? data.stock : 0,
            })
            setShowImport(false)
            setShowAddForm(true)
          }}
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={!deleting ? cancelDelete : undefined} />
          <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-red-500" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-foreground">{t('products.delete_title')}</p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{t('products.delete_warning')}</p>
                </div>
              </div>
              <div className="bg-secondary/60 border border-border rounded-lg p-3">
                <p className="text-[13px] text-muted-foreground">{t('products.delete_confirm')}</p>
                <p className="text-[14px] font-semibold text-foreground mt-1 break-words">
                  « {deleteModal.name} » ?
                </p>
              </div>
              <div className="flex gap-2 justify-end mt-1">
                <button
                  onClick={cancelDelete}
                  disabled={deleting}
                  className="px-4 py-2 border border-border rounded-lg text-[14px] font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-[14px] font-semibold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {deleting
                    ? <><Loader2 size={15} className="animate-spin" />{t('common.deleting') || "جاري الحذف..."}</>
                    : <><Trash2 size={15} />{t('common.delete')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 animate-in fade-in duration-200 px-4" onClick={() => setLightboxImage(null)}>
          <button onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 p-2 rounded-full bg-secondary text-brand-600 hover:bg-secondary/80 transition-colors">
            <X size={20} />
          </button>
          <img src={lightboxImage} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('products.search')}
          className="w-full pr-9 pl-3 py-2 bg-card border border-border rounded-lg text-[14px] outline-none focus:border-brand-400 transition-colors duration-200"
        />
      </div>

      {/* ── Products Grid ── */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Package size={20} className="text-brand-600" />
          </div>
          <p className="text-[14px] text-muted-foreground">{t('products.no_products')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((product, idx) => (
            <ProductCard
              key={product.id} product={product} delay={idx * 50}
              onDetails={setDetailsProduct} onEdit={startEdit}
              onToggle={handleToggle} onDelete={handleDelete} onNotify={goToCampaigns}
            />
          ))}
          <div
            onClick={openAddForm}
            className={cn(
              "border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2.5 p-4 transition-all duration-300 min-h-[170px] sm:min-h-[200px] group",
              productLimitReached
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:border-brand-400 hover:bg-secondary/30"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl bg-secondary flex items-center justify-center transition-transform duration-300",
              !productLimitReached && "group-hover:scale-110"
            )}>
              <Plus size={20} className="text-brand-600" />
            </div>
            <p className="text-[13px] font-semibold text-muted-foreground group-hover:text-brand-600 transition-colors text-center">
              {productLimitReached ? planCopy.limitReachedTitle : t('products.add_new')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
