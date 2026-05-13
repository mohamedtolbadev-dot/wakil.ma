"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ordersAPI, productsAPI } from "@/lib/api"
import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"
import {
  ClipboardList, Search, Plus, Loader2, Trash2, ChevronDown,
  Package, Truck, CheckCircle2, Clock, XCircle, RefreshCw,
  Phone, User, Tag, DollarSign, MapPin, StickyNote, Hash, AlertTriangle, X,
  MessageCircle, Download, ImageIcon, MoreHorizontal, Upload,
} from "lucide-react"

/* ─── Status config (labels resolved via t() at render time) ─── */
const STATUS_CONFIG = {
  PENDING:   { key: "orders.pending",   color: "text-amber-600",  bg: "bg-transparent border-border/70", icon: Clock       },
  CONFIRMED: { key: "orders.confirmed", color: "text-blue-600",   bg: "bg-transparent border-border/70", icon: CheckCircle2 },
  SHIPPED:   { key: "orders.shipped",   color: "text-purple-600", bg: "bg-transparent border-border/70", icon: Truck       },
  DELIVERED: { key: "orders.delivered", color: "text-green-600",  bg: "bg-transparent border-border/70", icon: Package     },
  CANCELLED: { key: "orders.cancelled", color: "text-red-500",    bg: "bg-transparent border-border/70", icon: XCircle     },
}

const STATUS_ORDER = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]
const ALLOWED_STATUS_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: ["PENDING"],
}

/* ─── Skeleton ──────────────────────────────────────────── */
function OrdersSkeleton() {
  const rows = [1, 2, 3, 4, 5, 6]
  return (
    <div className="flex flex-col gap-4 pb-8">
      <style>{`
        @keyframes sk-shimmer {
          0%   { background-position: -700px 0; }
          100% { background-position:  700px 0; }
        }
        .sk {
          border-radius: 6px;
          background: linear-gradient(90deg,
            var(--color-background-secondary, rgba(0,0,0,0.06)) 25%,
            var(--color-background-tertiary,  rgba(0,0,0,0.11)) 50%,
            var(--color-background-secondary, rgba(0,0,0,0.06)) 75%
          );
          background-size: 700px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="sk w-9 h-9 rounded-2xl" />
          <div className="flex flex-col gap-1.5">
            <div className="sk h-5 w-24 rounded-md" />
            <div className="sk h-3 w-16 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="sk h-9 w-9 rounded-xl" />
          <div className="sk h-9 w-32 rounded-xl hidden sm:block" />
          <div className="sk h-9 w-36 rounded-xl hidden sm:block" />
          <div className="sk h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[1,2,3,4,5,6].map((_, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="sk h-6 w-8 rounded-md" />
              <div className="sk w-6 h-6 rounded-lg" />
            </div>
            <div className="sk h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* Draft chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="sk h-8 w-16 rounded-lg" />
        <div className="sk h-8 w-28 rounded-lg" />
        <div className="sk h-8 w-32 rounded-lg" />
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="sk h-10 rounded-xl flex-1" />
        <div className="sk h-10 w-full sm:w-44 rounded-xl" />
      </div>

      {/* Delivery workflow */}
      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card px-3 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="sk h-8 w-8 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <div className="sk h-3.5 w-36 rounded-md" />
              <div className="sk h-3 w-24 rounded-md" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:ms-auto">
            <div className="sk h-9 w-full sm:w-56 rounded-lg" />
            <div className="flex gap-2">
              <div className="sk h-9 w-28 rounded-lg" />
              <div className="sk h-9 w-32 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-hidden rounded-lg border border-border/70 bg-card">
        <table className="w-full border-collapse text-left">
          <thead className="bg-secondary/40">
            <tr className="h-7 border-b border-border/70">
              <th className="w-8 px-2"><div className="sk h-3.5 w-3.5 rounded" /></th>
              <th className="px-2"><div className="sk h-2.5 w-20 rounded" /></th>
              <th className="px-2"><div className="sk h-2.5 w-14 rounded" /></th>
              <th className="px-2"><div className="sk h-2.5 w-16 rounded" /></th>
              <th className="px-2"><div className="sk h-2.5 w-20 rounded" /></th>
              <th className="px-2"><div className="sk h-2.5 w-14 rounded" /></th>
              <th className="px-3"><div className="sk h-2.5 w-20 rounded ms-auto" /></th>
              <th className="w-10 px-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((_, i) => (
              <tr key={i} className="h-[62px] border-b border-border/50 last:border-b-0">
                <td className="px-2"><div className="sk h-3.5 w-3.5 rounded" /></td>
                <td className="px-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="sk w-9 h-9 rounded-md" />
                    <div className="min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="sk h-3.5 w-24 rounded-md" />
                        <div className="sk h-5 w-14 rounded-md" />
                      </div>
                      <div className="sk h-3 w-52 rounded-md" />
                    </div>
                  </div>
                </td>
                <td className="px-2"><div className="sk h-3.5 w-28 rounded-md" /></td>
                <td className="px-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="sk h-3.5 w-28 rounded-md" />
                    <div className="sk h-3 w-24 rounded-md" />
                  </div>
                </td>
                <td className="px-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="sk h-3.5 w-40 rounded-md" />
                    <div className="sk h-3 w-24 rounded-md" />
                  </div>
                </td>
                <td className="px-2"><div className="sk h-6 w-24 rounded-lg" /></td>
                <td className="px-3"><div className="sk h-4 w-24 rounded-md ms-auto" /></td>
                <td className="px-2"><div className="sk h-8 w-8 rounded-md" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
        {rows.map((_, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="sk w-10 h-10 rounded-xl" />
              <div className="sk h-5 w-20 rounded-lg" />
            </div>
            <div className="sk h-4 w-3/4 rounded-md" />
            <div className="flex flex-col gap-1">
              <div className="sk h-3 w-1/2 rounded-md" />
              <div className="sk h-3 w-2/3 rounded-md" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="sk h-4 w-16 rounded-md" />
              <div className="sk h-3 w-12 rounded-md" />
            </div>
            <div className="flex items-center gap-1.5 pt-2 border-t border-border/30">
              <div className="sk h-7 w-16 rounded-lg" />
              <div className="sk h-7 w-7 rounded-lg" />
              <div className="sk h-7 w-7 rounded-lg ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Status Badge ────────────────────────────────────────── */
function StatusBadge({ status }) {
  const { t } = useLanguage()
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  const Icon = cfg.icon
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[13px] font-semibold border", cfg.bg, cfg.color)}>
      <Icon size={14} />
      {t(cfg.key)}
    </span>
  )
}

function DeliveryBadge({ order }) {
  const label = order?.deliveryReference || order?.deliveryStatus || ""
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-cyan-700">
      <Truck size={11} />
      {label}
    </span>
  )
}

function getConfidenceCopy(confidence, language) {
  if (!confidence) return language === "ar" ? "غير محسوبة" : "Non calculée"
  if (confidence.level === "high") return language === "ar" ? "جاهزة" : "Fiable"
  if (confidence.level === "medium") return language === "ar" ? "تحتاج مراجعة" : "À vérifier"
  return language === "ar" ? "ناقصة" : "Incomplète"
}

function getMissingFieldLabel(field, language) {
  const ar = {
    name: "الاسم",
    phone: "الهاتف",
    product: "المنتج",
    quantity: "الكمية",
    city: "المدينة",
    address: "العنوان",
    total: "المجموع",
  }
  const fr = {
    name: "nom",
    phone: "téléphone",
    product: "produit",
    quantity: "quantité",
    city: "ville",
    address: "adresse",
    total: "total",
  }
  return (language === "ar" ? ar : fr)[field] || field
}

function ConfidenceBadge({ confidence }) {
  const { language } = useLanguage()
  if (!confidence) return null

  const cfg = confidence.level === "high"
    ? "border-emerald-500/30 bg-transparent text-emerald-700"
    : confidence.level === "medium"
      ? "border-amber-500/30 bg-transparent text-amber-700"
      : "border-red-500/30 bg-transparent text-red-600"

  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border", cfg)}>
      <CheckCircle2 size={12} />
      {confidence.score}% {getConfidenceCopy(confidence, language)}
    </span>
  )
}

function getOrderImage(order) {
  return order?.productImage || (Array.isArray(order?.productImages) ? order.productImages[0] : null) || ""
}

function OrderProductThumb({ order, size = "md" }) {
  const image = getOrderImage(order)
  const sizeClass = size === "lg" ? "w-16 h-16" : "w-9 h-9"
  return (
    <div className={cn(sizeClass, "rounded-md overflow-hidden bg-secondary border border-border/60 flex items-center justify-center shrink-0")}>
      {image ? (
        <div
          aria-label={order?.productName || "Product"}
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url("${image.replace(/"/g, "%22")}")` }}
        />
      ) : (
        <ImageIcon size={size === "lg" ? 24 : 16} className="text-muted-foreground/50" />
      )}
    </div>
  )
}

function formatOrderDate(value, language) {
  if (!value) return "—"
  const date = new Date(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString(language === "ar" ? "ar-MA" : "fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
  if (sameDay) return language === "ar" ? `اليوم في ${time}` : `Aujourd'hui à ${time}`
  return date.toLocaleDateString(language === "ar" ? "ar-MA" : "fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/* ─── Status Dropdown ─────────────────────────────────────── */
function StatusDropdown({ orderId, currentStatus, onUpdated, sendMessage, trackingNumber }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const allowedStatuses = new Set([currentStatus, ...(ALLOWED_STATUS_TRANSITIONS[currentStatus] || [])])

  async function changeStatus(newStatus) {
    if (newStatus === currentStatus) { setOpen(false); return }
    setLoading(true)
    try {
      const res = await ordersAPI.updateStatus(orderId, newStatus, { sendMessage, trackingNumber })
      onUpdated(orderId, newStatus, res?.data || null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-2 py-1 rounded-lg transition-all"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
        {t('orders.change')}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-full mb-1 z-20 border border-border rounded-xl shadow-xl overflow-hidden w-36 bg-card">
            {STATUS_ORDER.map(s => {
              const cfg = STATUS_CONFIG[s]
              const Icon = cfg.icon
              const disabled = !allowedStatuses.has(s)
              return (
                <button
                  key={s}
                  onClick={() => { if (!disabled) changeStatus(s) }}
                  disabled={disabled}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2.5 text-[13px] transition-colors hover:bg-secondary",
                    s === currentStatus ? "bg-secondary/60 font-semibold" : "",
                    disabled ? "opacity-40 cursor-not-allowed hover:bg-transparent" : ""
                  )}
                >
                  <Icon size={14} className={cfg.color} />
                  <span className={cfg.color}>{t(cfg.key)}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Delete Modal ────────────────────────────────────────── */
function DeleteModal({ open, name, onConfirm, onCancel, isProcessing }) {
  const { t } = useLanguage()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div
        className="relative w-full max-w-sm border border-border rounded-3xl shadow-2xl overflow-hidden bg-card"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-red-500/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <p className="text-sm font-bold text-red-500">{t('orders.delete_title')}</p>
          </div>
          <button onClick={onCancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-foreground font-medium mb-1">
            {t('orders.delete_confirm')}
            <span className="text-brand-600 font-bold mx-1">{name}</span>?
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('orders.delete_warning')}
          </p>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border/60 bg-secondary/20">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} disabled={isProcessing}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
            {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {t('common.yes')}, {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Order Detail Modal ──────────────────────────────────── */
function OrderDetailModal({ order, onClose, onStatusChange, onDeleteRequest, sendMessage }) {
  const { t, language } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    customerName: order?.customerName || "",
    customerPhone: order?.customerPhone || "",
    productName: order?.productName || "",
    quantity: order?.quantity ?? 1,
    totalAmount: order?.totalAmount ?? 0,
    city: order?.city || "",
    address: order?.address || "",
    notes: order?.notes || "",
    trackingNumber: order?.trackingNumber || "",
  })
  const [savingTracking, setSavingTracking] = useState(false)
  const [savingEdits, setSavingEdits] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    setForm({
      customerName: order?.customerName || "",
      customerPhone: order?.customerPhone || "",
      productName: order?.productName || "",
      quantity: order?.quantity ?? 1,
      totalAmount: order?.totalAmount ?? 0,
      city: order?.city || "",
      address: order?.address || "",
      notes: order?.notes || "",
      trackingNumber: order?.trackingNumber || "",
    })
    setIsEditing(false)
  }, [
    order?.id,
    order?.customerName,
    order?.customerPhone,
    order?.productName,
    order?.quantity,
    order?.totalAmount,
    order?.city,
    order?.address,
    order?.notes,
    order?.trackingNumber,
  ])

  if (!order) return null

  async function saveTrackingNumber() {
    setSaveError(null)
    setSavingTracking(true)
    try {
      const updated = await ordersAPI.update(order.id, { trackingNumber: form.trackingNumber })
      onStatusChange?.(order.id, order.status, updated?.data)
    } catch (err) {
      console.error("Save tracking failed:", err)
      setSaveError(err?.response?.data?.error || t('orders.err_save_failed') || "فشل الحفظ")
    } finally {
      setSavingTracking(false)
    }
  }

  async function saveEdits() {
    setSaveError(null)
    const quantity = Number(form.quantity)
    const totalAmount = Number(form.totalAmount)
    if (!Number.isFinite(quantity) || quantity < 1) {
      setSaveError(t('orders.err_qty_invalid') || "الكمية غير صالحة"); return
    }
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      setSaveError(t('orders.err_amount_invalid') || "المبلغ غير صالح"); return
    }
    setSavingEdits(true)
    try {
      const payload = {
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        productName: form.productName,
        quantity,
        totalAmount,
        city: form.city,
        address: form.address,
        notes: form.notes,
        trackingNumber: form.trackingNumber,
      }
      const updated = await ordersAPI.update(order.id, payload)
      onStatusChange?.(order.id, order.status, updated?.data)
      setIsEditing(false)
    } catch (err) {
      console.error("Save edits failed:", err)
      setSaveError(err?.response?.data?.error || t('orders.err_save_failed') || "فشل الحفظ")
    } finally {
      setSavingEdits(false)
    }
  }

  const date = new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', {
    day: "numeric", month: "long", year: "numeric",
  })
  const conversationLink = order.conversationId
    ? `/dashboard/conversations?id=${order.conversationId}`
    : null

  const isRtl = language === 'ar'
  const confidence = order.confidence

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-3xl lg:max-w-4xl border border-border shadow-2xl bg-card flex flex-col max-h-[95dvh] sm:max-h-[88dvh] rounded-t-3xl sm:rounded-2xl overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Drag handle - mobile only */}
        <div className="sm:hidden w-full flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 border-b border-border bg-secondary/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <OrderProductThumb order={order} />
            <div>
              <p className="text-sm font-bold text-foreground">{t('common.details')}</p>
              <p className="text-xs text-muted-foreground font-medium">#{order.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] gap-4 items-start">

          {saveError && (
            <div className="lg:col-span-2 flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[13px] text-red-600">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* ─── Edit / Save Bar ─── */}
          <div className="lg:col-span-2 flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/25 p-3">
            <OrderProductThumb order={order} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{order.productName || "—"}</p>
              {order.variant && <p className="truncate text-xs text-muted-foreground">{order.variant}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <span>{order.quantity || 1} ×</span>
                <span className="font-semibold text-brand-600">{order.totalAmount || 0} {t('common.currency')}</span>
                <span>•</span>
                <span className="truncate">{order.customerName || "—"}</span>
              </div>
            </div>
          </div>

          {confidence && (
            <div className={cn(
              "lg:col-span-2 flex items-start gap-2 p-2.5 rounded-lg border text-[13px]",
              confidence.level === "high"
                ? "bg-transparent border-emerald-500/30 text-emerald-700"
                : confidence.level === "medium"
                  ? "bg-transparent border-amber-500/30 text-amber-700"
                  : "bg-transparent border-red-500/30 text-red-600"
            )}>
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold">
                  {confidence.score}% {getConfidenceCopy(confidence, language)}
                </p>
                {confidence.missingFields?.length > 0 && (
                  <p className="text-xs mt-0.5 opacity-80">
                    {language === "ar" ? "ناقص: " : "Manquant: "}
                    {confidence.missingFields.map(field => getMissingFieldLabel(field, language)).join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="lg:col-span-2 flex items-center justify-between gap-2 border border-border/60 rounded-lg px-3 py-2 bg-secondary/20">
            <p className="text-xs text-muted-foreground">
              {isEditing ? (t('common.edit') || "Modifier") : (t('common.details') || "Détails")}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(v => !v)}
                className="px-2.5 py-1.5 rounded-lg border border-brand-600/25 bg-brand-600/10 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-600/15 hover:border-brand-600/35 transition-colors"
              >
                {isEditing ? t('common.cancel') : (t('common.edit') || "Modifier")}
              </button>
              {isEditing && (
                <button
                  onClick={saveEdits}
                  disabled={savingEdits}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEdits ? <Loader2 size={12} className="animate-spin" /> : null}
                  {t('common.save')}
                </button>
              )}
            </div>
          </div>

          {/* ─── Compact Info Grid ─── */}
          <div className="lg:row-span-2 border border-border/60 rounded-lg overflow-hidden text-sm">
            {/* Customer Name */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-secondary/20">
              <User size={14} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">{t('orders.customer_name')}</span>
              {isEditing ? (
                <input
                  className="ms-auto w-48 max-w-[60%] px-2 py-1 bg-background border border-border rounded-md text-xs"
                  value={form.customerName}
                  onChange={(e) => setForm(p => ({ ...p, customerName: e.target.value }))}
                />
              ) : (
                <span className="font-semibold text-foreground ms-auto truncate">{order.customerName || "—"}</span>
              )}
            </div>
            {/* Phone */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
              <Phone size={14} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">{t('orders.customer_phone')}</span>
              {isEditing ? (
                <input
                  className="ms-auto w-48 max-w-[60%] px-2 py-1 bg-background border border-border rounded-md text-xs ltr"
                  dir="ltr"
                  value={form.customerPhone}
                  onChange={(e) => setForm(p => ({ ...p, customerPhone: e.target.value }))}
                />
              ) : (
                <span className="font-semibold text-foreground ms-auto ltr truncate" dir="ltr">{order.customerPhone || "—"}</span>
              )}
            </div>
            {/* Product */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-secondary/20">
              <Tag size={14} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">{t('orders.product_name')}</span>
              {isEditing ? (
                <input
                  className="ms-auto w-60 max-w-[70%] px-2 py-1 bg-background border border-border rounded-md text-xs"
                  value={form.productName}
                  onChange={(e) => setForm(p => ({ ...p, productName: e.target.value }))}
                />
              ) : (
                <span className="font-semibold text-foreground ms-auto truncate">{order.productName || "—"}</span>
              )}
            </div>
            {/* Variant (size/color) */}
            {order.variant && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
                <span className="text-muted-foreground text-xs">🎨 {t('orders.variant') || "الخيار"}</span>
                <span className="font-medium text-foreground ms-auto text-xs">{order.variant}</span>
              </div>
            )}
            {/* Qty & Amount */}
            <div className="grid grid-cols-2 border-b border-border/40">
              <div className="flex items-center gap-2 px-3 py-2 border-e border-border/40">
                <Hash size={14} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-xs">{t('orders.qty')}</span>
                {isEditing ? (
                  <input
                    type="number"
                    min="1"
                    className="ms-auto w-20 px-2 py-1 bg-background border border-border rounded-md text-xs"
                    value={form.quantity}
                    onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))}
                  />
                ) : (
                  <span className="font-semibold text-foreground ms-auto">{order.quantity || 1}</span>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-2">
                <DollarSign size={14} className="text-brand-600 shrink-0" />
                <span className="text-muted-foreground text-xs">{t('orders.price')}</span>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    className="ms-auto w-24 px-2 py-1 bg-background border border-border rounded-md text-xs"
                    value={form.totalAmount}
                    onChange={(e) => setForm(p => ({ ...p, totalAmount: e.target.value }))}
                  />
                ) : (
                  <span className="font-semibold text-brand-600 ms-auto">{order.totalAmount || 0} {t('common.currency')}</span>
                )}
              </div>
            </div>
            {/* Address */}
            <div className="flex items-start gap-2 px-3 py-2 border-b border-border/40 bg-secondary/20">
              <MapPin size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground text-xs shrink-0">{t('common.address')}</span>
              {isEditing ? (
                <textarea
                  rows={2}
                  className="ms-auto w-[70%] px-2 py-1 bg-background border border-border rounded-md text-xs resize-none text-end"
                  value={form.address}
                  onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
                />
              ) : (
                <span className="font-medium text-foreground ms-auto text-end leading-snug">{order.address || "—"}</span>
              )}
            </div>

            {/* City */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
              <span className="text-sm shrink-0" aria-hidden="true">🏙️</span>
              <span className="text-muted-foreground text-xs">{t('common.city') || "Ville"}</span>
              {isEditing ? (
                <input
                  className="ms-auto w-48 max-w-[60%] px-2 py-1 bg-background border border-border rounded-md text-xs"
                  value={form.city}
                  onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))}
                />
              ) : (
                <span className="font-semibold text-foreground ms-auto truncate">{order.city || "—"}</span>
              )}
            </div>
            {/* Date */}
            <div className="flex items-center gap-2 px-3 py-2">
              <Clock size={14} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">{t('common.date')}</span>
              <span className="font-medium text-foreground ms-auto">{date}</span>
            </div>
            {(order.deliveryReference || order.deliveryStatus || order.deliveryProviderName) && (
              <div className="grid grid-cols-1 gap-1 px-3 py-2 border-t border-border/40 bg-cyan-500/5">
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-cyan-700 shrink-0" />
                  <span className="text-muted-foreground text-xs">{t('orders.delivery_reference') || "Delivery ref"}</span>
                  <span className="font-semibold text-foreground ms-auto">{order.deliveryReference || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{order.deliveryStatus || "—"}</span>
                  {order.deliveryProviderName && <span>· {order.deliveryProviderName}</span>}
                </div>
              </div>
            )}
          </div>

          {/* ─── Tracking Number ─── */}
          <div className="border border-border/60 rounded-lg p-3 bg-secondary/20">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={14} className="text-purple-600" />
              <span className="text-xs font-semibold text-foreground">{t('orders.tracking')}</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.trackingNumber}
                onChange={(e) => setForm(p => ({ ...p, trackingNumber: e.target.value }))}
                placeholder={t('orders.tracking_placeholder') || "أدخل رقم التتبع"}
                className="flex-1 min-w-0 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/10 transition-all"
              />
              <button
                onClick={saveTrackingNumber}
                disabled={savingTracking || form.trackingNumber === (order.trackingNumber || "")}
                className="shrink-0 px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                {savingTracking ? <Loader2 size={14} className="animate-spin" /> : t('common.save')}
              </button>
            </div>
          </div>

          {/* ─── Notes ─── */}
          <div className="flex items-start gap-2 px-3 py-2.5 border border-border/60 rounded-lg bg-card">
            <StickyNote size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">{t('common.notes')}</p>
              {isEditing ? (
                <textarea
                  rows={2}
                  className="w-full px-2 py-1 bg-background border border-border rounded-md text-xs resize-none"
                  value={form.notes}
                  onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              ) : (
                <p className="text-sm font-medium text-foreground break-words">{order.notes || "—"}</p>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-border bg-secondary/30 shrink-0">
          <div className="flex items-center gap-2">
            {/* View Conversation - Icon Button */}
            {conversationLink ? (
              <a
                href={conversationLink}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-brand-600/5 hover:border-brand-600/30 hover:text-brand-600 text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                title={t('orders.view_conv')}
              >
                <MessageCircle size={16} />
              </a>
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-lg border border-border/50 bg-secondary/50 text-muted-foreground/50 cursor-not-allowed">
                <MessageCircle size={16} />
              </div>
            )}

            {/* Status Dropdown - Flex 1 */}
            <div className="flex-1">
              <StatusDropdown
                orderId={order.id}
                currentStatus={order.status}
                onUpdated={(id, status) => { onStatusChange(id, status) }}
                sendMessage={sendMessage}
                trackingNumber={form.trackingNumber}
              />
            </div>

            {/* Delete - Danger */}
            <button
              onClick={() => { onClose(); onDeleteRequest(order.id, order.productName) }}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-500/10 hover:border-red-300 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20"
              title={t('common.delete')}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Order Card ──────────────────────────────────────────── */
function OrderCard({ order, onStatusChange, onDeleteRequest, sendMessage, onOpenDetail, selected, onToggleSelect }) {
  const { t, language } = useLanguage()
  // Derive from props — avoids stale state after edits in detail modal
  const trackingNumber = order?.trackingNumber || ""
  const confidence = order?.confidence

  const needsReview =
    confidence?.needsReview ||
    order.isDraft === true ||
    (!order.city || !String(order.city).trim()) ||
    (!order.address || !String(order.address).trim()) ||
    (order.notes && String(order.notes).includes("⚠️ DRAFT_ORDER"))

  const date = new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', {
    day: "numeric", month: "short", year: "numeric",
  })

  return (
    <div
      className="bg-card border border-border/60 rounded-2xl hover:border-brand-300 hover:shadow-md hover:shadow-brand-600/5 transition-all flex flex-col cursor-pointer"
      onClick={() => onOpenDetail(order)}
    >
      {/* Top section */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Icon + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={Boolean(selected)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect?.(order.id)}
              className="mt-1 h-4 w-4 accent-brand-600"
              aria-label="Select order"
            />
            <OrderProductThumb order={order} size="lg" />
          </div>
          <div className="flex items-center gap-2">
            {needsReview && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg border border-amber-400/40 bg-transparent text-amber-700">
                {t('orders.needs_review') || "Needs review"}
              </span>
            )}
            <ConfidenceBadge confidence={confidence} />
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Product name + variant */}
        <div className="flex flex-col gap-0.5">
          <p className="text-[14px] font-semibold text-foreground leading-snug line-clamp-2">{order.productName}</p>
          {order.variant && (
            <p className="text-[11px] text-muted-foreground leading-snug">🎨 {order.variant}</p>
          )}
          <p className="text-[11px] text-muted-foreground leading-snug">
            {t('common.quantity')}: <span className="font-semibold text-foreground">{order.quantity || 1}</span>
          </p>
          <DeliveryBadge order={order} />
        </div>

        {/* Customer info */}
        <div className="flex flex-col gap-1 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User size={13} className="shrink-0" /> {order.customerName}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone size={13} className="shrink-0" /> {order.customerPhone}
          </span>
          {order.city && (
            <span className="flex items-center gap-1.5 truncate">
              <span className="shrink-0" aria-hidden="true">🏙️</span> {order.city}
            </span>
          )}
          {order.address && (
            <span className="flex items-center gap-1.5 truncate">
              <MapPin size={13} className="shrink-0" /> {order.address}
            </span>
          )}
        </div>

        {/* Amount + date */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
          <span className="text-[14px] font-bold text-brand-600">{order.totalAmount} {t('common.currency')}</span>
          <span className="text-[12px] text-muted-foreground/70">{date}</span>
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-4 py-2.5 border-t border-border/40 bg-secondary/20 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <StatusDropdown
          orderId={order.id}
          currentStatus={order.status}
          onUpdated={onStatusChange}
          sendMessage={sendMessage}
          trackingNumber={trackingNumber}
        />
        <button
          onClick={e => { e.stopPropagation(); onOpenDetail(order) }}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title={t('common.details')}
        >
          <ChevronDown size={15} />
        </button>
        {order.conversationId && (
          <a
            href={`/dashboard/conversations?id=${order.conversationId}`}
            onClick={e => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-brand-600/10 text-muted-foreground hover:text-brand-600 transition-colors"
            title={t('orders.view_conv')}
          >
            <MessageCircle size={15} />
          </a>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDeleteRequest(order.id, order.productName) }}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors ml-auto"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

/* ─── Add Order Modal ─────────────────────────────────────────── */
function OrdersTable({ orders, onDeleteRequest, onOpenDetail, selectedOrderIds = [], onToggleSelect, onToggleAllVisible }) {
  const { t, language } = useLanguage()
  const selectedSet = new Set(selectedOrderIds)
  const allVisibleSelected = orders.length > 0 && orders.every(order => selectedSet.has(order.id))

  return (
    <div className="hidden lg:block overflow-hidden rounded-lg border border-border/70 bg-card">
      <table className="w-full border-collapse text-left">
        <thead className="bg-secondary/40">
          <tr className="h-7 border-b border-border/70 text-[11px] uppercase text-muted-foreground">
            <th className="w-8 px-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={() => onToggleAllVisible?.()}
                className="h-3.5 w-3.5 accent-brand-600"
                aria-label="Select visible orders"
              />
            </th>
            <th className="px-2 font-semibold">Commande</th>
            <th className="px-2 font-semibold">Date</th>
            <th className="px-2 font-semibold">Client</th>
            <th className="px-2 font-semibold">Adresse</th>
            <th className="px-2 font-semibold">Statut</th>
            <th className="px-3 text-right font-semibold">Montant dû</th>
            <th className="w-10 px-2" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const needsReview =
              order?.confidence?.needsReview ||
              order.isDraft === true ||
              (!order.city || !String(order.city).trim()) ||
              (!order.address || !String(order.address).trim())

            return (
              <tr
                key={order.id}
                onClick={() => onOpenDetail(order)}
                className="h-[62px] cursor-pointer border-b border-border/50 last:border-b-0 hover:bg-brand-600/[0.04] transition-colors"
              >
                <td className="px-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(order.id)}
                    onChange={() => onToggleSelect?.(order.id)}
                    className="h-3.5 w-3.5 accent-brand-600"
                    aria-label="Select order"
                  />
                </td>
                <td className="px-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <OrderProductThumb order={order} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-bold text-foreground">#{order.id.slice(-8).toUpperCase()}</p>
                        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {order.quantity || 1} article{Number(order.quantity || 1) > 1 ? "s" : ""}
                        </span>
                        {needsReview && <span className="rounded-md border border-amber-400/40 bg-transparent px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Review</span>}
                        <DeliveryBadge order={order} />
                      </div>
                      <p className="max-w-[260px] truncate text-[12px] text-muted-foreground">
                        {order.productName}{order.variant ? ` · ${order.variant}` : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-2 text-[13px] text-muted-foreground whitespace-nowrap">
                  {formatOrderDate(order.createdAt, language)}
                </td>
                <td className="px-2">
                  <p className="max-w-[180px] truncate text-[13px] font-medium text-foreground">{order.customerName || "—"}</p>
                  <p className="text-[12px] font-medium text-cyan-700">{order.customerPhone || "—"}</p>
                </td>
                <td className="px-2">
                  <p className="max-w-[230px] truncate text-[13px] text-foreground">{order.address || "—"}</p>
                  <p className="max-w-[230px] truncate text-[12px] text-muted-foreground">{order.city || "—"}</p>
                </td>
                <td className="px-2">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-3 text-right text-[14px] font-bold text-foreground whitespace-nowrap">
                  MAD {Number(order.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onDeleteRequest(order.id, order.productName)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    title={t('common.delete')}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AddOrderModal({ onClose, onCreated }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", productName: "",
    quantity: 1, totalAmount: "", city: "", address: "", notes: "",
  })
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [saving, setSaving] = useState(false)

  function getProductUnitPrice(product) {
    if (!product) return null
    return product.salePrice != null && product.salePrice < product.price
      ? product.salePrice
      : product.price
  }

  useEffect(() => {
    let mounted = true
    async function loadProducts() {
      setLoadingProducts(true)
      try {
        const res = await productsAPI.getAll({ active: true })
        if (!mounted) return
        setProducts(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoadingProducts(false)
      }
    }
    loadProducts()
    return () => { mounted = false }
  }, [])

  const [submitError, setSubmitError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)
    if (!form.customerName?.trim() || !form.customerPhone?.trim() || (!form.productName && !form.productId) || !form.totalAmount) {
      setSubmitError(t('orders.err_missing_fields') || "حقول إلزامية ناقصة")
      return
    }
    const quantity = Number(form.quantity)
    const totalAmount = Number(form.totalAmount)
    if (!Number.isFinite(quantity) || quantity < 1) {
      setSubmitError(t('orders.err_qty_invalid') || "الكمية غير صالحة"); return
    }
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      setSubmitError(t('orders.err_amount_invalid') || "المبلغ غير صالح"); return
    }
    setSaving(true)
    try {
      const res = await ordersAPI.create({ ...form, quantity, totalAmount })
      onCreated(res.data)
      onClose()
    } catch (err) {
      console.error("Create order failed:", err)
      setSubmitError(err?.response?.data?.error || t('orders.err_save_failed') || "فشل إنشاء الطلب")
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-600 transition-colors"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[88dvh] border border-border rounded-3xl shadow-2xl bg-card overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-secondary/50">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-brand-600" />
            <p className="text-sm font-bold text-foreground">{t('orders.add_order')}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-sm">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto">
          {submitError && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[13px] text-red-600">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Left column */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-muted-foreground">{t('orders.customer_name')} *</label>
                <input className={inputCls} value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-muted-foreground">{t('orders.customer_phone')} *</label>
                <input className={inputCls} value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-muted-foreground">{t('orders.product_name')} *</label>
                <select
                  className={inputCls}
                  value={form.productId || ""}
                  onChange={(e) => {
                    const id = e.target.value || ""
                    const p = products.find(x => x.id === id)
                    // Use salePrice if set and valid, otherwise base price — consistent with AI logic
                    const unitPrice = getProductUnitPrice(p)
                    const qty = Math.max(1, Number(form.quantity) || 1)
                    setForm(prev => ({
                      ...prev,
                      productId: id || null,
                      productName: p?.name || prev.productName,
                      totalAmount: unitPrice != null ? String(unitPrice * qty) : prev.totalAmount,
                    }))
                  }}
                  disabled={loadingProducts}
                  required
                >
                  <option value="">{loadingProducts ? "..." : (t('common.select') || "Sélectionner")}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {p.price} {t('common.currency')}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-muted-foreground">{t('common.quantity')}</label>
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={form.quantity}
                    onChange={(e) => {
                      const quantity = e.target.value
                      const p = products.find(x => x.id === form.productId)
                      const unitPrice = getProductUnitPrice(p)
                      const qty = Math.max(1, Number(quantity) || 1)
                      setForm(prev => ({
                        ...prev,
                        quantity,
                        totalAmount: unitPrice != null ? String(unitPrice * qty) : prev.totalAmount,
                      }))
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-muted-foreground">{t('orders.price')} *</label>
                  <input type="number" min="0" className={inputCls} value={form.totalAmount} onChange={e => setForm({...form, totalAmount: e.target.value})} required />
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-muted-foreground">{t('common.city') || "Ville"}</label>
                <input className={inputCls} value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-muted-foreground">{t('common.address')}</label>
                <input className={inputCls} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-muted-foreground">{t('common.notes')}</label>
                <textarea className={cn(inputCls, "resize-none")} rows={4} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border/50">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-800 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md shadow-brand-600/20">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {saving ? t('common.saving') : t('orders.add_order')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function OrdersPage() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [draftFilter, setDraftFilter] = useState("")  // "" | "true" | "false"
  const [showAdd, setShowAdd] = useState(false)
  const [detailOrder, setDetailOrder] = useState(null)
  const [sendMessage, setSendMessage] = useState(true)
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "", deleting: false })
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [deliveryProviderName, setDeliveryProviderName] = useState("")
  const [bulkStatus, setBulkStatus] = useState("SHIPPED")
  const [deliveryNotice, setDeliveryNotice] = useState(null)
  const importFileRef = useRef(null)

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (draftFilter) params.draft = draftFilter
      if (search.trim()) params.search = search.trim()
      const res = await ordersAPI.getAll(params)
      const list = Array.isArray(res.data?.orders)
        ? res.data.orders
        : Array.isArray(res.data)
          ? res.data
          : []
      setOrders(list)
      setDetailOrder(prev => {
        if (!prev) return prev
        const fresh = list.find(order => order.id === prev.id)
        return fresh ? { ...prev, ...fresh } : prev
      })
    } catch (err) {
      console.error(err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filterStatus, draftFilter, search])

  useEffect(() => {
    const t = setTimeout(fetchOrders, 300)
    return () => clearTimeout(t)
  }, [fetchOrders])

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchOrders({ silent: true })
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  useEffect(() => {
    const visibleIds = new Set(orders.map(order => order.id))
    setSelectedOrderIds(prev => prev.filter(id => visibleIds.has(id)))
  }, [orders])

  // onStatusChange is used both for status updates and for refreshing an order after edits
  function handleStatusChange(orderId, newStatus, updatedOrder = null) {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      return {
        ...o,
        ...(updatedOrder && typeof updatedOrder === "object" ? updatedOrder : null),
        status: newStatus,
      }
    }))
    if (updatedOrder && detailOrder?.id === orderId) {
      setDetailOrder(prev => prev ? { ...prev, ...updatedOrder } : prev)
    }
  }

  function handleDeleteRequest(id, name) {
    setDeleteModal({ open: true, id, name: name || "", deleting: false })
  }

  async function confirmDelete() {
    setDeleteModal(prev => ({ ...prev, deleting: true }))
    try {
      await ordersAPI.delete(deleteModal.id)
      setOrders(prev => prev.filter(o => o.id !== deleteModal.id))
      setDeleteModal({ open: false, id: null, name: "", deleting: false })
    } catch (err) {
      console.error("Delete order failed:", err)
      // Keep modal open + reset deleting flag so user can retry
      setDeleteModal(prev => ({ ...prev, deleting: false }))
    }
  }

  function cancelDelete() {
    setDeleteModal({ open: false, id: null, name: "", deleting: false })
  }

  function handleCreated(order) {
    setOrders(prev => [order, ...prev])
  }

  function toggleOrderSelection(orderId) {
    setSelectedOrderIds(prev => (
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    ))
  }

  function toggleVisibleSelection() {
    const visibleIds = orders.map(order => order.id)
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedOrderIds.includes(id))
    setSelectedOrderIds(prev => {
      if (allVisibleSelected) return prev.filter(id => !visibleIds.includes(id))
      return [...new Set([...prev, ...visibleIds])]
    })
  }

  function downloadCsv(csv, filename) {
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename || `delivery-orders-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleExportCSV() {
    const confirmedVisibleIds = orders
      .filter(order => order.status === "CONFIRMED" && !order.isDraft)
      .map(order => order.id)
    const selectedConfirmedIds = selectedOrderIds.filter(id => confirmedVisibleIds.includes(id))
    const orderIds = selectedOrderIds.length > 0 ? selectedConfirmedIds : confirmedVisibleIds

    if (orderIds.length === 0) {
      setDeliveryNotice(t('orders.delivery_no_confirmed') || "No confirmed orders selected for delivery export.")
      return
    }

    setExporting(true)
    try {
      const res = await ordersAPI.exportDelivery({
        orderIds,
        providerName: deliveryProviderName,
      })
      if (res?.data?.csv) {
        downloadCsv(res.data.csv, res.data.filename)
      }
      setDeliveryNotice(`${res?.data?.count || orderIds.length} ${t('orders.delivery_exported') || "orders exported for delivery."}`)
      setSelectedOrderIds(prev => prev.filter(id => !orderIds.includes(id)))
      await fetchOrders({ silent: true })
    } catch (err) {
      console.error("Delivery CSV export failed:", err)
      setDeliveryNotice(err?.message || "Delivery CSV export failed.")
    } finally {
      setExporting(false)
    }
  }

  async function handleImportTrackingCsv(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setImporting(true)
    try {
      const csvText = await file.text()
      const res = await ordersAPI.importDeliveryTracking({ csvText, sendMessage })
      const data = res?.data || {}
      setDeliveryNotice(`Import: ${data.updated || 0} updated, ${data.notified || 0} WhatsApp, ${data.skipped || 0} skipped.`)
      await fetchOrders({ silent: true })
    } catch (err) {
      console.error("Delivery CSV import failed:", err)
      setDeliveryNotice(err?.message || "Tracking CSV import failed.")
    } finally {
      setImporting(false)
    }
  }

  async function handleBulkDeliveryStatus() {
    if (selectedOrderIds.length === 0) {
      setDeliveryNotice(t('orders.delivery_select_first') || "Select orders first.")
      return
    }

    const ok = window.confirm(`${t('orders.delivery_bulk_confirm') || "Apply delivery status to selected orders?"} (${selectedOrderIds.length})`)
    if (!ok) return

    setBulkUpdating(true)
    try {
      const res = await ordersAPI.bulkDeliveryStatus({
        orderIds: selectedOrderIds,
        status: bulkStatus,
        sendMessage,
      })
      const data = res?.data || {}
      setDeliveryNotice(`Bulk: ${data.updated || 0} updated, ${data.notified || 0} WhatsApp, ${data.skipped || 0} skipped.`)
      setSelectedOrderIds([])
      await fetchOrders({ silent: true })
    } catch (err) {
      console.error("Bulk delivery status failed:", err)
      setDeliveryNotice(err?.message || "Bulk delivery status update failed.")
    } finally {
      setBulkUpdating(false)
    }
  }

  /* Stats */
  const stats = STATUS_ORDER.map(s => ({
    statusKey: s,
    translKey: STATUS_CONFIG[s].key,
    count: orders.filter(o => o.status === s).length,
    icon: STATUS_CONFIG[s].icon,
    color: STATUS_CONFIG[s].color,
    bg: STATUS_CONFIG[s].bg,
  }))
  const totalRevenue = orders
    .filter(o => o.status !== "CANCELLED" && !o.isDraft)
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const selectedCount = selectedOrderIds.length
  const confirmedVisibleCount = orders.filter(o => o.status === "CONFIRMED" && !o.isDraft).length
  const exportableSelectedCount = selectedOrderIds.filter(id =>
    orders.some(order => order.id === id && order.status === "CONFIRMED" && !order.isDraft)
  ).length
  const exportTargetCount = selectedCount > 0 ? exportableSelectedCount : confirmedVisibleCount

  if (loading && orders.length === 0) return <OrdersSkeleton />

  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-brand-600 border border-brand-600 flex items-center justify-center shrink-0">
            <ClipboardList size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-tight">{t('orders.title')}</h1>
            <p className="text-[13px] text-muted-foreground">{orders.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importFileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportTrackingCsv}
          />
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-2 rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exporting || exportTargetCount === 0}
            title={`${t('orders.delivery_export_csv') || "Export Delivery CSV"} (${exportTargetCount})`}
            className="flex items-center gap-1.5 border border-border px-3.5 py-2 rounded-xl text-sm font-medium text-foreground hover:border-brand-300 hover:text-brand-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span className="hidden sm:inline">{t('orders.delivery_export_csv') || "Delivery CSV"}</span>
          </button>
          <button
            onClick={() => importFileRef.current?.click()}
            disabled={importing}
            title={t('orders.delivery_import_tracking') || "Import Tracking CSV"}
            className="flex items-center gap-1.5 border border-border px-3.5 py-2 rounded-xl text-sm font-medium text-foreground hover:border-cyan-300 hover:text-cyan-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            <span className="hidden sm:inline">{t('orders.delivery_import_tracking') || "Import Tracking"}</span>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-brand-600 text-white px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-brand-800 transition-all shadow-md shadow-brand-600/20"
          >
            <Plus size={16} /><span className="hidden sm:inline"> {t('orders.new')}</span>
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {stats.map(({ statusKey, translKey, count, icon: Icon }) => (
          <button
            key={statusKey}
            onClick={() => setFilterStatus(filterStatus === statusKey ? '' : statusKey)}
            className={cn(
              "flex flex-col gap-1 p-4 rounded-xl border transition-all text-right",
              filterStatus === statusKey
                ? "bg-brand-600/10 border-brand-600/30 text-brand-800 shadow-sm"
                : "bg-card border-border/50 hover:border-brand-600/30 hover:bg-brand-600/5"
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn("text-xl font-bold", filterStatus === statusKey ? "text-brand-800" : "text-brand-600")}>{count}</span>
              <Icon size={16} className={cn("opacity-60", filterStatus === statusKey ? "text-brand-800" : "text-brand-600")} />
            </div>
            <p className="text-[12px] text-muted-foreground">{t(translKey)}</p>
          </button>
        ))}
        <div className="flex flex-col gap-1 p-4 rounded-xl border bg-card border-border/50 text-right">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-brand-600">{totalRevenue.toLocaleString()}</span>
            <DollarSign size={16} className="opacity-60 text-brand-600" />
          </div>
          <p className="text-[12px] text-muted-foreground">{t('orders.total')}</p>
        </div>
      </div>

      {/* ── Draft filter chips ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setDraftFilter("")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all",
            draftFilter === ""
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-card border-border hover:border-brand-600/40 text-foreground"
          )}
        >
          {t('orders.filter_all') || "الكل"}
        </button>
        <button
          onClick={() => setDraftFilter("true")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all flex items-center gap-1.5",
            draftFilter === "true"
              ? "bg-card text-amber-700 border-amber-500 ring-1 ring-amber-500/20"
              : "bg-card border-border text-amber-700 hover:border-amber-500/40"
          )}
        >
          <AlertTriangle size={13} />
          {t('orders.filter_drafts') || "طلبيات ناقصة"}
        </button>
        <button
          onClick={() => setDraftFilter("false")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all",
            draftFilter === "false"
              ? "bg-card text-green-700 border-green-600 ring-1 ring-green-600/20"
              : "bg-card border-border hover:border-green-600/40 text-green-700"
          )}
        >
          {t('orders.filter_complete') || "طلبيات مكتملة"}
        </button>
      </div>

      {/* ── Filters bar ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('orders.search')}
            className="w-full pl-4 pr-9 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-600 transition-colors"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground px-4 py-2.5 bg-secondary/50 border border-border rounded-xl cursor-pointer select-none">
          <input
            type="checkbox"
            checked={sendMessage}
            onChange={e => setSendMessage(e.target.checked)}
            className="w-3.5 h-3.5 accent-brand-600"
          />
          {t('orders.send_whatsapp')}
        </label>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card px-3 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Truck size={16} className="text-cyan-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-foreground">{t('orders.delivery_workflow') || "Delivery CSV Workflow"}</p>
              <p className="text-[12px] text-muted-foreground truncate">
                {selectedCount > 0
                  ? `${selectedCount} ${t('orders.selected') || "selected"}`
                  : `${confirmedVisibleCount} ${t('orders.confirmed')}`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 lg:ms-auto">
            <input
              value={deliveryProviderName}
              onChange={(e) => setDeliveryProviderName(e.target.value)}
              placeholder={t('orders.delivery_provider_optional') || "Provider name (optional)"}
              className="w-full sm:w-56 px-3 py-2 bg-secondary/50 border border-border rounded-lg text-[13px] focus:outline-none focus:border-brand-600 transition-colors"
            />
            <div className="flex gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="px-3 py-2 bg-secondary/50 border border-border rounded-lg text-[13px] focus:outline-none focus:border-brand-600 transition-colors"
              >
                <option value="SHIPPED">{t('orders.shipped')}</option>
                <option value="DELIVERED">{t('orders.delivered')}</option>
                <option value="CANCELLED">{t('orders.cancelled')}</option>
              </select>
              <button
                onClick={handleBulkDeliveryStatus}
                disabled={bulkUpdating || selectedCount === 0}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[13px] font-semibold text-foreground hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {bulkUpdating ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                {t('orders.delivery_bulk_update') || "Bulk update"}
              </button>
            </div>
          </div>
        </div>
        {deliveryNotice && (
          <div className="flex items-start justify-between gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[12px] font-medium text-cyan-800">
            <span>{deliveryNotice}</span>
            <button onClick={() => setDeliveryNotice(null)} className="text-cyan-800/60 hover:text-cyan-900">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── Orders list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-brand-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center border border-dashed border-border rounded-2xl">
          <ClipboardList size={32} className="text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            {filterStatus || search ? t('orders.no_match') : t('orders.no_orders')}
          </p>
          {!filterStatus && !search && (
            <button onClick={() => setShowAdd(true)}
              className="text-sm text-brand-600 font-semibold hover:text-brand-800 transition-colors">
              {t('orders.add_first')}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <OrdersTable
            orders={orders}
            onDeleteRequest={handleDeleteRequest}
            onOpenDetail={setDetailOrder}
            selectedOrderIds={selectedOrderIds}
            onToggleSelect={toggleOrderSelection}
            onToggleAllVisible={toggleVisibleSelection}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                onDeleteRequest={handleDeleteRequest}
                sendMessage={sendMessage}
                onOpenDetail={setDetailOrder}
                selected={selectedOrderIds.includes(order.id)}
                onToggleSelect={toggleOrderSelection}
              />
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <AddOrderModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />
      )}

      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onStatusChange={(id, status, updatedOrder) => { handleStatusChange(id, status, updatedOrder) }}
          onDeleteRequest={handleDeleteRequest}
          sendMessage={sendMessage}
        />
      )}

      {deleteModal.open && (
        <DeleteModal
          open={deleteModal.open}
          name={deleteModal.name}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isProcessing={deleteModal.deleting}
        />
      )}
    </div>
  )
}
