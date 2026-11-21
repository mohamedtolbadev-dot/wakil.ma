"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ordersAPI, productsAPI } from "@/lib/api"
import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"
import {
  ClipboardList, Search, Plus, Loader2, Trash2, ChevronDown,
  Package, Truck, CheckCircle2, Clock, XCircle, RefreshCw,
  Phone, User, Tag, DollarSign, MapPin, StickyNote, Hash, AlertTriangle, X,
  MessageCircle, Download, ImageIcon, Upload, Palette, Building2,
} from "lucide-react"

/* ─── Messages (hardcoded strings → ar / fr) ─── */
const messages = {
  ar: {
    colOrder: "الطلبية",
    colDate: "التاريخ",
    colClient: "الزبون",
    colAddress: "العنوان",
    colStatus: "الحالة",
    colAmount: "المبلغ",
    itemOne: "منتج",
    itemMany: "منتجات",
    review: "مراجعة",
    selectOrder: "اختيار الطلبية",
    selectVisible: "اختيار الطلبيات الظاهرة",
    notCalculated: "غير محسوبة",
    reliable: "جاهزة",
    toCheck: "تحتاج مراجعة",
    incomplete: "ناقصة",
    missing: "ناقص: ",
    fieldName: "الاسم", fieldPhone: "الهاتف", fieldProduct: "المنتج",
    fieldQuantity: "الكمية", fieldCity: "المدينة", fieldAddress: "العنوان", fieldTotal: "المجموع",
    today: "اليوم في",
    saveFailed: "فشل الحفظ",
    qtyInvalid: "الكمية غير صالحة",
    amountInvalid: "المبلغ غير صالح",
    missingFields: "عمر الحقول الإلزامية",
    createFailed: "فشل إنشاء الطلب",
    trackingPlaceholder: "أدخل رقم التتبع",
    variant: "الخيار",
    city: "المدينة",
    edit: "تعديل",
    details: "التفاصيل",
    select: "اختر",
    deliveryRef: "مرجع التوصيل",
    deliveryWorkflow: "تدفق التوصيل (CSV)",
    selected: "محددة",
    providerOptional: "اسم شركة التوصيل (اختياري)",
    bulkUpdate: "تحديث جماعي",
    bulkConfirm: "تطبيق الحالة على الطلبيات المحددة؟",
    noConfirmed: "ما كاين حتى طلبية مؤكدة للتصدير.",
    selectFirst: "حدد الطلبيات أولا.",
    exportedMsg: "طلبية تصدرات للتوصيل.",
    exportFailed: "فشل تصدير ملف CSV.",
    importFailed: "فشل استيراد ملف التتبع.",
    bulkFailed: "فشل التحديث الجماعي.",
    exportCsv: "تصدير CSV",
    importTracking: "استيراد التتبع",
    importLabel: "الاستيراد",
    bulkLabel: "التحديث الجماعي",
    updated: "تحديث",
    whatsapp: "واتساب",
    skipped: "متخطاة",
    skippedReasons: "أسباب التخطي",
    row: "السطر",
    reference: "المرجع",
    errMissingRef: "المرجع ناقص",
    errNotFound: "الطلبية ما لقيناهاش",
    errMissingTracking: "رقم التتبع أو الحالة ناقصين",
    errTransition: "تغيير الحالة غير مسموح",
    errUnknown: "سبب غير معروف",
    filterAll: "الكل",
    filterDrafts: "طلبيات ناقصة",
    filterComplete: "طلبيات مكتملة",
    needsReview: "تحتاج مراجعة",
    close: "إغلاق",
    refresh: "تحديث",
  },
  fr: {
    colOrder: "Commande",
    colDate: "Date",
    colClient: "Client",
    colAddress: "Adresse",
    colStatus: "Statut",
    colAmount: "Montant dû",
    itemOne: "article",
    itemMany: "articles",
    review: "À vérifier",
    selectOrder: "Sélectionner la commande",
    selectVisible: "Sélectionner les commandes visibles",
    notCalculated: "Non calculée",
    reliable: "Fiable",
    toCheck: "À vérifier",
    incomplete: "Incomplète",
    missing: "Manquant : ",
    fieldName: "nom", fieldPhone: "téléphone", fieldProduct: "produit",
    fieldQuantity: "quantité", fieldCity: "ville", fieldAddress: "adresse", fieldTotal: "total",
    today: "Aujourd'hui à",
    saveFailed: "Échec de l'enregistrement",
    qtyInvalid: "Quantité invalide",
    amountInvalid: "Montant invalide",
    missingFields: "Champs obligatoires manquants",
    createFailed: "Échec de la création de la commande",
    trackingPlaceholder: "Saisissez le numéro de suivi",
    variant: "Variante",
    city: "Ville",
    edit: "Modifier",
    details: "Détails",
    select: "Sélectionner",
    deliveryRef: "Réf. livraison",
    deliveryWorkflow: "Flux de livraison (CSV)",
    selected: "sélectionnée(s)",
    providerOptional: "Nom du livreur (optionnel)",
    bulkUpdate: "Mise à jour groupée",
    bulkConfirm: "Appliquer le statut aux commandes sélectionnées ?",
    noConfirmed: "Aucune commande confirmée à exporter.",
    selectFirst: "Sélectionnez d'abord des commandes.",
    exportedMsg: "commande(s) exportée(s) pour la livraison.",
    exportFailed: "Échec de l'export CSV.",
    importFailed: "Échec de l'import du fichier de suivi.",
    bulkFailed: "Échec de la mise à jour groupée.",
    exportCsv: "Exporter CSV",
    importTracking: "Importer le suivi",
    importLabel: "Import",
    bulkLabel: "Mise à jour groupée",
    updated: "mise(s) à jour",
    whatsapp: "WhatsApp",
    skipped: "ignorée(s)",
    skippedReasons: "Raisons d'exclusion",
    row: "Ligne",
    reference: "Référence",
    errMissingRef: "Référence manquante",
    errNotFound: "Commande introuvable",
    errMissingTracking: "Suivi ou statut manquant",
    errTransition: "Changement de statut non autorisé",
    errUnknown: "Raison inconnue",
    filterAll: "Toutes",
    filterDrafts: "Commandes incomplètes",
    filterComplete: "Commandes complètes",
    needsReview: "À vérifier",
    close: "Fermer",
    refresh: "Actualiser",
  },
}

function useM() {
  const { language } = useLanguage()
  return messages[language === "ar" ? "ar" : "fr"]
}

/* ─── Status config ─── */
const STATUS_CONFIG = {
  PENDING:   { key: "orders.pending",   icon: Clock,        cls: "border-border bg-secondary text-muted-foreground" },
  CONFIRMED: { key: "orders.confirmed", icon: CheckCircle2, cls: "border-brand-600/30 bg-transparent text-brand-700 dark:text-brand-300" },
  SHIPPED:   { key: "orders.shipped",   icon: Truck,        cls: "border-brand-600/20 bg-brand-600/10 text-brand-700 dark:text-brand-300" },
  DELIVERED: { key: "orders.delivered", icon: Package,      cls: "border-brand-600 bg-brand-600 text-white" },
  CANCELLED: { key: "orders.cancelled", icon: XCircle,      cls: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400" },
}

const STATUS_ORDER = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]
const ALLOWED_STATUS_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: ["PENDING"],
}

/* ─── Shared UI helpers ─── */
function useEscape(active, onEscape) {
  useEffect(() => {
    if (!active) return
    const onKey = (e) => { if (e.key === "Escape") onEscape() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [active, onEscape])
}

function IconTile({ icon: Icon, size = 16, className = "" }) {
  return (
    <div className={cn("w-9 h-9 rounded-xl bg-brand-600/10 text-brand-600 flex items-center justify-center shrink-0", className)}>
      <Icon size={size} />
    </div>
  )
}

function Notice({ tone = "brand", icon: Icon = AlertTriangle, children, onClose, className = "" }) {
  const toneCls = tone === "error"
    ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
    : "border-brand-600/20 bg-brand-600/10 text-brand-700 dark:text-brand-300"
  return (
    <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-medium", toneCls, className)}>
      <Icon size={15} className="shrink-0 mt-0.5" />
      <span className="flex-1 min-w-0 break-words">{children}</span>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity" aria-label="close">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

/* ─── Skeleton ─── */
function Bone({ className = "" }) {
  return <div className={cn("rounded-lg bg-foreground/[0.07]", className)} />
}

function Accent({ className = "", ...props }) {
  return <div className={cn("h-1.5 rounded-full bg-brand-600/15", className)} {...props} />
}

function OrdersSkeleton() {
  const rows = [1, 2, 3, 4, 5, 6]
  return (
    <div className="flex flex-col gap-4 pb-8 animate-pulse" aria-busy="true" aria-live="polite">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bone className="h-9 w-9 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Bone className="h-5 w-28 rounded-full" />
            <Bone className="h-3 w-12 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Bone className="h-9 w-9 rounded-xl" />
          <Bone className="h-9 w-10 sm:w-32 rounded-xl" />
          <Bone className="h-9 w-10 sm:w-36 rounded-xl" />
          <Bone className="h-9 w-10 sm:w-28 rounded-xl" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <Bone className="h-6 w-10 rounded-lg" />
              <Bone className="h-6 w-6 rounded-lg" />
            </div>
            <Bone className="h-3 w-16 rounded-full mt-3" />
            <Accent className="w-1/2 mt-3" />
          </div>
        ))}
      </div>

      {/* Chips */}
      <div className="flex gap-2">
        <Bone className="h-8 w-16" />
        <Bone className="h-8 w-28" />
        <Bone className="h-8 w-32" />
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Bone className="h-10 flex-1 rounded-xl" />
        <Bone className="h-10 w-full sm:w-44 rounded-xl" />
      </div>

      {/* Delivery workflow */}
      <div className="rounded-2xl border border-border bg-card p-3 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-3">
          <Bone className="h-9 w-9 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Bone className="h-3.5 w-36 rounded-full" />
            <Bone className="h-3 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2 lg:ms-auto">
          <Bone className="h-9 w-full sm:w-56 rounded-lg" />
          <Bone className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[32px_2.2fr_1fr_1.4fr_1.6fr_1.4fr_1fr_40px] gap-3 px-3 py-3 border-b border-border bg-secondary/40">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} className="h-2.5 w-14 rounded-full" />)}
        </div>
        {rows.map((i) => (
          <div key={i} className="grid grid-cols-[32px_2.2fr_1fr_1.4fr_1.6fr_1.4fr_1fr_40px] items-center gap-3 px-3 h-[64px] border-b border-border last:border-b-0">
            <Bone className="h-3.5 w-3.5 rounded" />
            <div className="flex items-center gap-2.5">
              <Bone className="h-9 w-9 rounded-xl" />
              <div className="flex flex-col gap-2">
                <Bone className="h-3 w-24 rounded-full" />
                <Bone className="h-2.5 w-40 rounded-full" />
              </div>
            </div>
            <Bone className="h-3 w-20 rounded-full" />
            <div className="flex flex-col gap-2">
              <Bone className="h-3 w-24 rounded-full" />
              <Bone className="h-2.5 w-20 rounded-full" />
            </div>
            <div className="flex flex-col gap-2">
              <Bone className="h-3 w-32 rounded-full" />
              <Bone className="h-2.5 w-16 rounded-full" />
            </div>
            <Accent className="h-6 w-24 rounded-lg" />
            <Bone className="h-4 w-20 rounded-full" />
            <Bone className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
        {rows.map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <Bone className="h-14 w-14 rounded-xl" />
              <Accent className="h-6 w-20 rounded-lg" />
            </div>
            <Bone className="h-4 w-3/4 rounded-full" />
            <div className="flex flex-col gap-2">
              <Bone className="h-3 w-1/2 rounded-full" />
              <Bone className="h-3 w-2/3 rounded-full" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Bone className="h-4 w-16 rounded-full" />
              <Bone className="h-3 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const { t } = useLanguage()
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  const Icon = cfg.icon
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-semibold border whitespace-nowrap", cfg.cls)}>
      <Icon size={13} />
      {t(cfg.key)}
    </span>
  )
}

function DeliveryBadge({ order }) {
  const label = order?.deliveryReference || order?.deliveryStatus || ""
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-brand-600/20 bg-brand-600/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
      <Truck size={11} />
      {label}
    </span>
  )
}

function getConfidenceCopy(confidence, m) {
  if (!confidence) return m.notCalculated
  if (confidence.level === "high") return m.reliable
  if (confidence.level === "medium") return m.toCheck
  return m.incomplete
}

function getMissingFieldLabel(field, m) {
  const map = {
    name: m.fieldName, phone: m.fieldPhone, product: m.fieldProduct,
    quantity: m.fieldQuantity, city: m.fieldCity, address: m.fieldAddress, total: m.fieldTotal,
  }
  return map[field] || field
}

function confidenceTone(level) {
  if (level === "high") return "border-brand-600/30 text-brand-700 dark:text-brand-300"
  if (level === "medium") return "border-border text-foreground"
  return "border-red-500/30 text-red-600 dark:text-red-400"
}

function ConfidenceBadge({ confidence }) {
  const m = useM()
  if (!confidence) return null
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border bg-transparent", confidenceTone(confidence.level))}>
      <CheckCircle2 size={12} />
      {confidence.score}% {getConfidenceCopy(confidence, m)}
    </span>
  )
}

function getOrderImage(order) {
  return order?.productImage || (Array.isArray(order?.productImages) ? order.productImages[0] : null) || ""
}

function OrderProductThumb({ order, size = "md" }) {
  const image = getOrderImage(order)
  const sizeClass = size === "lg" ? "w-14 h-14" : "w-9 h-9"
  return (
    <div className={cn(sizeClass, "rounded-xl overflow-hidden bg-secondary border border-border flex items-center justify-center shrink-0")}>
      {image ? (
        <div
          aria-label={order?.productName || "Product"}
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url("${image.replace(/"/g, "%22")}")` }}
        />
      ) : (
        <ImageIcon size={size === "lg" ? 22 : 15} className="text-muted-foreground/50" />
      )}
    </div>
  )
}

function formatOrderDate(value, language, m) {
  if (!value) return "—"
  const date = new Date(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const locale = language === "ar" ? "ar-MA" : "fr-FR"
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  if (sameDay) return `${m.today} ${time}`
  return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
}

/* ─── Status Dropdown ─── */
function StatusDropdown({ orderId, currentStatus, onUpdated, sendMessage, trackingNumber }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const buttonRef = useRef(null)
  const [menuStyle, setMenuStyle] = useState(null)
  const allowedStatuses = new Set([currentStatus, ...(ALLOWED_STATUS_TRANSITIONS[currentStatus] || [])])

  useEscape(open, () => setOpen(false))

  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const menuWidth = 208
    const menuHeight = 248
    const pad = 8
    const left = Math.min(Math.max(rect.right - menuWidth, pad), window.innerWidth - menuWidth - pad)
    const preferredTop = rect.bottom + 4
    const top = preferredTop + menuHeight > window.innerHeight - pad
      ? Math.max(rect.top - menuHeight - 4, pad)
      : preferredTop
    setMenuStyle({ top, left, width: menuWidth })
  }, [open])

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
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        disabled={loading}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground border border-border hover:border-brand-600/40 px-2.5 py-1.5 rounded-lg transition-colors"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
        {t("orders.change")}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            style={menuStyle || undefined}
            className={cn("fixed z-50 border border-border rounded-xl shadow-lg overflow-hidden bg-card", !menuStyle && "invisible")}
          >
            {STATUS_ORDER.map((s) => {
              const cfg = STATUS_CONFIG[s]
              const Icon = cfg.icon
              const isCurrent = s === currentStatus
              const disabled = !allowedStatuses.has(s)
              return (
                <button
                  key={s}
                  role="menuitem"
                  onClick={() => { if (!disabled) changeStatus(s) }}
                  disabled={disabled}
                  className={cn(
                    "w-full flex items-start gap-2 px-4 py-2.5 text-[13px] text-start transition-colors hover:bg-secondary",
                    isCurrent && "bg-brand-600/5 font-semibold",
                    disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  <Icon size={14} className={cn("mt-0.5 shrink-0", s === "CANCELLED" ? "text-red-600" : "text-brand-600")} />
                  <span className="min-w-0">
                    <span className="block text-foreground">{t(cfg.key)}</span>
                    {(isCurrent || disabled) && (
                      <span className="mt-0.5 block text-[10px] font-normal leading-4 text-muted-foreground">
                        {isCurrent ? t("orders.status_current") : t("orders.status_not_allowed")}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Delete Modal ─── */
function DeleteModal({ open, name, onConfirm, onCancel, isProcessing }) {
  const { t } = useLanguage()
  const m = useM()
  useEscape(open, onCancel)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative w-full max-w-sm border border-border rounded-2xl shadow-xl overflow-hidden bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <p className="text-sm font-bold text-foreground">{t("orders.delete_title")}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label={m.close}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-foreground font-medium mb-1">
            {t("orders.delete_confirm")}
            <span className="text-brand-600 font-bold mx-1">{name}</span>?
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("orders.delete_warning")}</p>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {t("common.yes")}, {t("common.delete")}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Info row (detail modal) ─── */
function InfoRow({ icon: Icon, label, children, alt = false, align = "center" }) {
  return (
    <div className={cn(
      "flex gap-2 px-3 py-2.5 border-b border-border last:border-b-0",
      align === "start" ? "items-start" : "items-center",
      alt && "bg-secondary/40"
    )}>
      {Icon && <Icon size={14} className={cn("text-muted-foreground shrink-0", align === "start" && "mt-0.5")} />}
      <span className="text-muted-foreground text-xs shrink-0">{label}</span>
      <div className="ms-auto min-w-0 flex justify-end text-sm">{children}</div>
    </div>
  )
}

const editInputCls = "px-2 py-1 bg-background border border-border rounded-md text-xs focus:outline-none focus:border-brand-600 transition-colors"

/* ─── Order Detail Modal ─── */
function OrderDetailModal({ order, onClose, onStatusChange, onDeleteRequest, sendMessage }) {
  const { t, language } = useLanguage()
  const m = useM()
  const [isEditing, setIsEditing] = useState(false)
  const buildForm = (o) => ({
    customerName: o?.customerName || "",
    customerPhone: o?.customerPhone || "",
    productName: o?.productName || "",
    quantity: o?.quantity ?? 1,
    totalAmount: o?.totalAmount ?? 0,
    city: o?.city || "",
    address: o?.address || "",
    notes: o?.notes || "",
    trackingNumber: o?.trackingNumber || "",
  })
  const [form, setForm] = useState(buildForm(order))
  const [savingTracking, setSavingTracking] = useState(false)
  const [savingEdits, setSavingEdits] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEscape(true, onClose)

  useEffect(() => {
    setForm(buildForm(order))
    setIsEditing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    order?.id, order?.customerName, order?.customerPhone, order?.productName,
    order?.quantity, order?.totalAmount, order?.city, order?.address,
    order?.notes, order?.trackingNumber,
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
      setSaveError(err?.response?.data?.error || m.saveFailed)
    } finally {
      setSavingTracking(false)
    }
  }

  async function saveEdits() {
    setSaveError(null)
    const quantity = Number(form.quantity)
    const totalAmount = Number(form.totalAmount)
    if (!Number.isFinite(quantity) || quantity < 1) { setSaveError(m.qtyInvalid); return }
    if (!Number.isFinite(totalAmount) || totalAmount < 0) { setSaveError(m.amountInvalid); return }
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
      setSaveError(err?.response?.data?.error || m.saveFailed)
    } finally {
      setSavingEdits(false)
    }
  }

  const locale = language === "ar" ? "ar-MA" : "fr-FR"
  const date = new Date(order.createdAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
  const conversationLink = order.conversationId ? `/dashboard/conversations?id=${order.conversationId}` : null
  const isRtl = language === "ar"
  const confidence = order.confidence
  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-3xl lg:max-w-4xl border border-border shadow-xl bg-card flex flex-col max-h-[95dvh] sm:max-h-[88dvh] rounded-t-3xl sm:rounded-2xl overflow-hidden"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden w-full flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <IconTile icon={ClipboardList} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{t("common.details")}</p>
              <p className="text-xs text-muted-foreground font-medium tabular-nums">#{order.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <button
              onClick={onClose}
              aria-label={m.close}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] gap-4 items-start">

            {saveError && (
              <Notice tone="error" className="lg:col-span-2" onClose={() => setSaveError(null)}>{saveError}</Notice>
            )}

            {/* Product summary */}
            <div className="lg:col-span-2 flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3">
              <OrderProductThumb order={order} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{order.productName || "—"}</p>
                {order.variant && <p className="truncate text-xs text-muted-foreground">{order.variant}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                  <span>{order.quantity || 1} ×</span>
                  <span className="font-semibold text-brand-600 tabular-nums">{order.totalAmount || 0} {t("common.currency")}</span>
                  <span>•</span>
                  <span className="truncate">{order.customerName || "—"}</span>
                </div>
              </div>
            </div>

            {/* Confidence */}
            {confidence && (
              <div className={cn("lg:col-span-2 flex items-start gap-2 px-3 py-2.5 rounded-xl border text-[13px] bg-transparent", confidenceTone(confidence.level))}>
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold">{confidence.score}% {getConfidenceCopy(confidence, m)}</p>
                  {confidence.missingFields?.length > 0 && (
                    <p className="text-xs mt-0.5 opacity-80">
                      {m.missing}
                      {confidence.missingFields.map((f) => getMissingFieldLabel(f, m)).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Edit bar */}
            <div className="lg:col-span-2 flex items-center justify-between gap-2 border border-border rounded-xl px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                {isEditing ? m.edit : m.details}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing((v) => !v)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:border-brand-600/40 hover:text-brand-600 transition-colors"
                >
                  {isEditing ? t("common.cancel") : m.edit}
                </button>
                {isEditing && (
                  <button
                    onClick={saveEdits}
                    disabled={savingEdits}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  >
                    {savingEdits && <Loader2 size={12} className="animate-spin" />}
                    {t("common.save")}
                  </button>
                )}
              </div>
            </div>

            {/* Info grid */}
            <div className="lg:row-span-2 border border-border rounded-xl overflow-hidden">
              <InfoRow icon={User} label={t("orders.customer_name")} alt>
                {isEditing ? (
                  <input className={cn(editInputCls, "w-48 max-w-full")} value={form.customerName} onChange={setField("customerName")} />
                ) : (
                  <span className="font-semibold text-foreground truncate">{order.customerName || "—"}</span>
                )}
              </InfoRow>
              <InfoRow icon={Phone} label={t("orders.customer_phone")}>
                {isEditing ? (
                  <input dir="ltr" className={cn(editInputCls, "w-48 max-w-full")} value={form.customerPhone} onChange={setField("customerPhone")} />
                ) : (
                  <span dir="ltr" className="font-semibold text-foreground truncate">{order.customerPhone || "—"}</span>
                )}
              </InfoRow>
              <InfoRow icon={Tag} label={t("orders.product_name")} alt>
                {isEditing ? (
                  <input className={cn(editInputCls, "w-56 max-w-full")} value={form.productName} onChange={setField("productName")} />
                ) : (
                  <span className="font-semibold text-foreground truncate">{order.productName || "—"}</span>
                )}
              </InfoRow>
              {order.variant && (
                <InfoRow icon={Palette} label={t("orders.variant") || m.variant}>
                  <span className="font-medium text-foreground text-xs">{order.variant}</span>
                </InfoRow>
              )}
              <div className="grid grid-cols-2 border-b border-border">
                <div className="flex items-center gap-2 px-3 py-2.5 border-e border-border">
                  <Hash size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-xs">{t("orders.qty")}</span>
                  <div className="ms-auto">
                    {isEditing ? (
                      <input type="number" min="1" className={cn(editInputCls, "w-16")} value={form.quantity} onChange={setField("quantity")} />
                    ) : (
                      <span className="font-semibold text-foreground text-sm tabular-nums">{order.quantity || 1}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <DollarSign size={14} className="text-brand-600 shrink-0" />
                  <span className="text-muted-foreground text-xs">{t("orders.price")}</span>
                  <div className="ms-auto">
                    {isEditing ? (
                      <input type="number" min="0" className={cn(editInputCls, "w-20")} value={form.totalAmount} onChange={setField("totalAmount")} />
                    ) : (
                      <span className="font-semibold text-brand-600 text-sm tabular-nums">{order.totalAmount || 0} {t("common.currency")}</span>
                    )}
                  </div>
                </div>
              </div>
              <InfoRow icon={MapPin} label={t("common.address")} alt align="start">
                {isEditing ? (
                  <textarea rows={2} className={cn(editInputCls, "w-full min-w-[160px] resize-none")} value={form.address} onChange={setField("address")} />
                ) : (
                  <span className="font-medium text-foreground leading-snug text-end">{order.address || "—"}</span>
                )}
              </InfoRow>
              <InfoRow icon={Building2} label={t("common.city") || m.city}>
                {isEditing ? (
                  <input className={cn(editInputCls, "w-48 max-w-full")} value={form.city} onChange={setField("city")} />
                ) : (
                  <span className="font-semibold text-foreground truncate">{order.city || "—"}</span>
                )}
              </InfoRow>
              <InfoRow icon={Clock} label={t("common.date")} alt>
                <span className="font-medium text-foreground">{date}</span>
              </InfoRow>
              {(order.deliveryReference || order.deliveryStatus || order.deliveryProviderName) && (
                <div className="px-3 py-2.5 border-t border-border bg-brand-600/5 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-brand-600 shrink-0" />
                    <span className="text-muted-foreground text-xs">{t("orders.delivery_reference") || m.deliveryRef}</span>
                    <span className="font-semibold text-foreground text-sm ms-auto">{order.deliveryReference || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{order.deliveryStatus || "—"}</span>
                    {order.deliveryProviderName && <span>· {order.deliveryProviderName}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Tracking */}
            <div className="border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Truck size={14} className="text-brand-600" />
                <span className="text-xs font-semibold text-foreground">{t("orders.tracking")}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.trackingNumber}
                  onChange={setField("trackingNumber")}
                  placeholder={t("orders.tracking_placeholder") || m.trackingPlaceholder}
                  className="flex-1 min-w-0 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand-600 transition-colors"
                />
                <button
                  onClick={saveTrackingNumber}
                  disabled={savingTracking || form.trackingNumber === (order.trackingNumber || "")}
                  className="shrink-0 px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  {savingTracking ? <Loader2 size={14} className="animate-spin" /> : t("common.save")}
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="flex items-start gap-2 px-3 py-2.5 border border-border rounded-xl">
              <StickyNote size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">{t("common.notes")}</p>
                {isEditing ? (
                  <textarea rows={2} className={cn(editInputCls, "w-full resize-none")} value={form.notes} onChange={setField("notes")} />
                ) : (
                  <p className="text-sm font-medium text-foreground break-words">{order.notes || "—"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            {conversationLink ? (
              <a
                href={conversationLink}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:border-brand-600/40 hover:text-brand-600 transition-colors"
                title={t("orders.view_conv")}
                aria-label={t("orders.view_conv")}
              >
                <MessageCircle size={16} />
              </a>
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-secondary/50 text-muted-foreground/40 cursor-not-allowed">
                <MessageCircle size={16} />
              </div>
            )}

            <div className="flex-1">
              <StatusDropdown
                orderId={order.id}
                currentStatus={order.status}
                onUpdated={(id, status, updated) => onStatusChange(id, status, updated)}
                sendMessage={sendMessage}
                trackingNumber={form.trackingNumber}
              />
            </div>

            <button
              onClick={() => { onClose(); onDeleteRequest(order.id, order.productName) }}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 transition-colors"
              title={t("common.delete")}
              aria-label={t("common.delete")}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Order Card (mobile) ─── */
function OrderCard({ order, onStatusChange, onDeleteRequest, sendMessage, onOpenDetail, selected, onToggleSelect }) {
  const { t, language } = useLanguage()
  const m = useM()
  const trackingNumber = order?.trackingNumber || ""
  const confidence = order?.confidence

  const needsReview =
    confidence?.needsReview ||
    order.isDraft === true ||
    !order.city || !String(order.city).trim() ||
    !order.address || !String(order.address).trim() ||
    (order.notes && String(order.notes).includes("⚠️ DRAFT_ORDER"))

  const date = new Date(order.createdAt).toLocaleDateString(language === "ar" ? "ar-MA" : "fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  })

  return (
    <div
      className={cn(
        "bg-card border rounded-2xl hover:border-brand-600/40 transition-colors flex flex-col cursor-pointer",
        selected ? "border-brand-600" : "border-border"
      )}
      onClick={() => onOpenDetail(order)}
    >
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={Boolean(selected)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect?.(order.id)}
              className="mt-1 h-4 w-4 accent-brand-600"
              aria-label={m.selectOrder}
            />
            <OrderProductThumb order={order} size="lg" />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {needsReview && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border border-border text-foreground">
                <AlertTriangle size={11} className="text-brand-600" />
                {t("orders.needs_review") || m.needsReview}
              </span>
            )}
            <ConfidenceBadge confidence={confidence} />
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="text-[14px] font-semibold text-foreground leading-snug line-clamp-2">{order.productName}</p>
          {order.variant && (
            <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground leading-snug">
              <Palette size={11} /> {order.variant}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground leading-snug">
            {t("common.quantity")}: <span className="font-semibold text-foreground">{order.quantity || 1}</span>
          </p>
          <div className="mt-1"><DeliveryBadge order={order} /></div>
        </div>

        <div className="flex flex-col gap-1 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate"><User size={13} className="shrink-0" /> {order.customerName}</span>
          <span className="flex items-center gap-1.5" dir="ltr"><Phone size={13} className="shrink-0" /> {order.customerPhone}</span>
          {order.city && <span className="flex items-center gap-1.5 truncate"><Building2 size={13} className="shrink-0" /> {order.city}</span>}
          {order.address && <span className="flex items-center gap-1.5 truncate"><MapPin size={13} className="shrink-0" /> {order.address}</span>}
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
          <span className="text-[14px] font-bold text-brand-600 tabular-nums">{order.totalAmount} {t("common.currency")}</span>
          <span className="text-[12px] text-muted-foreground">{date}</span>
        </div>
      </div>

      <div className="px-4 py-2.5 border-t border-border flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <StatusDropdown
          orderId={order.id}
          currentStatus={order.status}
          onUpdated={onStatusChange}
          sendMessage={sendMessage}
          trackingNumber={trackingNumber}
        />
        {order.conversationId && (
          <a
            href={`/dashboard/conversations?id=${order.conversationId}`}
            className="p-2 rounded-lg hover:bg-brand-600/10 text-muted-foreground hover:text-brand-600 transition-colors"
            title={t("orders.view_conv")}
            aria-label={t("orders.view_conv")}
          >
            <MessageCircle size={15} />
          </a>
        )}
        <button
          onClick={() => onDeleteRequest(order.id, order.productName)}
          className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors ms-auto"
          title={t("common.delete")}
          aria-label={t("common.delete")}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

/* ─── Orders Table (desktop) ─── */
function OrdersTable({
  orders, onDeleteRequest, onOpenDetail, onStatusChange, sendMessage,
  selectedOrderIds = [], onToggleSelect, onToggleAllVisible,
}) {
  const { t, language } = useLanguage()
  const m = useM()
  const selectedSet = new Set(selectedOrderIds)
  const allVisibleSelected = orders.length > 0 && orders.every((o) => selectedSet.has(o.id))
  const th = "px-2 text-start font-semibold"

  return (
    <div className="hidden lg:block overflow-x-auto overflow-y-visible rounded-2xl border border-border bg-card">
      <table className="w-full border-collapse">
        <thead className="bg-secondary/60">
          <tr className="h-9 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="w-8 px-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={() => onToggleAllVisible?.()}
                className="h-3.5 w-3.5 accent-brand-600"
                aria-label={m.selectVisible}
              />
            </th>
            <th className={th}>{m.colOrder}</th>
            <th className={th}>{m.colDate}</th>
            <th className={th}>{m.colClient}</th>
            <th className={th}>{m.colAddress}</th>
            <th className={th}>{m.colStatus}</th>
            <th className="px-3 text-end font-semibold">{m.colAmount}</th>
            <th className="w-10 px-2" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const needsReview =
              order?.confidence?.needsReview ||
              order.isDraft === true ||
              !order.city || !String(order.city).trim() ||
              !order.address || !String(order.address).trim()
            const qty = Number(order.quantity || 1)
            const isSelected = selectedSet.has(order.id)

            return (
              <tr
                key={order.id}
                onClick={() => onOpenDetail(order)}
                className={cn(
                  "h-[64px] cursor-pointer border-b border-border last:border-b-0 hover:bg-secondary/60 transition-colors",
                  isSelected && "bg-brand-600/5"
                )}
              >
                <td className="px-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(order.id)}
                    className="h-3.5 w-3.5 accent-brand-600"
                    aria-label={m.selectOrder}
                  />
                </td>
                <td className="px-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <OrderProductThumb order={order} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[13px] font-bold text-foreground tabular-nums">#{order.id.slice(-8).toUpperCase()}</p>
                        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {qty} {qty > 1 ? m.itemMany : m.itemOne}
                        </span>
                        {needsReview && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                            <AlertTriangle size={10} className="text-brand-600" />
                            {m.review}
                          </span>
                        )}
                        <DeliveryBadge order={order} />
                      </div>
                      <p className="max-w-[260px] truncate text-[12px] text-muted-foreground">
                        {order.productName}{order.variant ? ` · ${order.variant}` : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-2 text-[13px] text-muted-foreground whitespace-nowrap">
                  {formatOrderDate(order.createdAt, language, m)}
                </td>
                <td className="px-2">
                  <p className="max-w-[180px] truncate text-[13px] font-medium text-foreground">{order.customerName || "—"}</p>
                  <p dir="ltr" className="text-start text-[12px] text-muted-foreground tabular-nums">{order.customerPhone || "—"}</p>
                </td>
                <td className="px-2">
                  <p className="max-w-[230px] truncate text-[13px] text-foreground">{order.address || "—"}</p>
                  <p className="max-w-[230px] truncate text-[12px] text-muted-foreground">{order.city || "—"}</p>
                </td>
                <td className="px-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <StatusDropdown
                      orderId={order.id}
                      currentStatus={order.status}
                      onUpdated={onStatusChange}
                      sendMessage={sendMessage}
                      trackingNumber={order.trackingNumber}
                    />
                  </div>
                </td>
                <td className="px-3 text-end text-[14px] font-bold text-foreground whitespace-nowrap tabular-nums">
                  {Number(order.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  <span className="text-[12px] font-semibold text-muted-foreground">{t("common.currency")}</span>
                </td>
                <td className="px-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onDeleteRequest(order.id, order.productName)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    title={t("common.delete")}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 size={15} />
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

/* ─── Add Order Modal ─── */
function AddOrderModal({ onClose, onCreated }) {
  const { t } = useLanguage()
  const m = useM()
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", productName: "",
    quantity: 1, totalAmount: "", city: "", address: "", notes: "",
  })
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEscape(true, onClose)

  function getProductUnitPrice(product) {
    if (!product) return null
    return product.salePrice != null && product.salePrice < product.price ? product.salePrice : product.price
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

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)
    if (!form.customerName?.trim() || !form.customerPhone?.trim() || (!form.productName && !form.productId) || !form.totalAmount) {
      setSubmitError(t("orders.err_missing_fields") || m.missingFields)
      return
    }
    const quantity = Number(form.quantity)
    const totalAmount = Number(form.totalAmount)
    if (!Number.isFinite(quantity) || quantity < 1) { setSubmitError(m.qtyInvalid); return }
    if (!Number.isFinite(totalAmount) || totalAmount < 0) { setSubmitError(m.amountInvalid); return }
    setSaving(true)
    try {
      const res = await ordersAPI.create({ ...form, quantity, totalAmount })
      onCreated(res.data)
      onClose()
    } catch (err) {
      console.error("Create order failed:", err)
      setSubmitError(err?.response?.data?.error || m.createFailed)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-brand-600 transition-colors"
  const labelCls = "text-[13px] font-medium text-muted-foreground"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[88dvh] border border-border rounded-2xl shadow-xl bg-card overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <IconTile icon={Plus} size={15} className="w-8 h-8 rounded-lg" />
            <p className="text-sm font-bold text-foreground">{t("orders.add_order")}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={m.close}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto">
          {submitError && <Notice tone="error" onClose={() => setSubmitError(null)}>{submitError}</Notice>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>{t("orders.customer_name")} *</label>
                <input className={inputCls} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>{t("orders.customer_phone")} *</label>
                <input dir="ltr" className={cn(inputCls, "text-start")} value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>{t("orders.product_name")} *</label>
                <select
                  className={inputCls}
                  value={form.productId || ""}
                  onChange={(e) => {
                    const id = e.target.value || ""
                    const p = products.find((x) => x.id === id)
                    const unitPrice = getProductUnitPrice(p)
                    const qty = Math.max(1, Number(form.quantity) || 1)
                    setForm((prev) => ({
                      ...prev,
                      productId: id || null,
                      productName: p?.name || prev.productName,
                      totalAmount: unitPrice != null ? String(unitPrice * qty) : prev.totalAmount,
                    }))
                  }}
                  disabled={loadingProducts}
                  required
                >
                  <option value="">{loadingProducts ? "..." : (t("common.select") || m.select)}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.price} {t("common.currency")}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>{t("common.quantity")}</label>
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={form.quantity}
                    onChange={(e) => {
                      const quantity = e.target.value
                      const p = products.find((x) => x.id === form.productId)
                      const unitPrice = getProductUnitPrice(p)
                      const qty = Math.max(1, Number(quantity) || 1)
                      setForm((prev) => ({
                        ...prev,
                        quantity,
                        totalAmount: unitPrice != null ? String(unitPrice * qty) : prev.totalAmount,
                      }))
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>{t("orders.price")} *</label>
                  <input type="number" min="0" className={inputCls} value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} required />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>{t("common.city") || m.city}</label>
                <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>{t("common.address")}</label>
                <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>{t("common.notes")}</label>
                <textarea className={cn(inputCls, "resize-none")} rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-border">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {saving ? t("common.saving") : t("orders.add_order")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Delivery helpers ─── */
function getDeliveryErrorReason(error, t, m) {
  const reasonMap = {
    missing_reference: t("orders.delivery_error_missing_reference") || m.errMissingRef,
    order_not_found: t("orders.delivery_error_order_not_found") || m.errNotFound,
    missing_tracking_or_status: t("orders.delivery_error_missing_tracking_or_status") || m.errMissingTracking,
    invalid_delivery_transition: t("orders.delivery_error_invalid_transition") || m.errTransition,
  }
  return reasonMap[error?.reason] || error?.reason || t("orders.delivery_error_unknown") || m.errUnknown
}

function formatDeliveryError(error, t, m) {
  const parts = []
  if (error?.row) parts.push(`${m.row} ${error.row}`)
  if (error?.reference) parts.push(`${m.reference} ${error.reference}`)
  if (!error?.reference && error?.orderId) parts.push(`#${String(error.orderId).slice(-8).toUpperCase()}`)
  parts.push(getDeliveryErrorReason(error, t, m))
  if (error?.currentStatus && error?.nextStatus) {
    const from = STATUS_CONFIG[error.currentStatus]?.key ? t(STATUS_CONFIG[error.currentStatus].key) : error.currentStatus
    const to = STATUS_CONFIG[error.nextStatus]?.key ? t(STATUS_CONFIG[error.nextStatus].key) : error.nextStatus
    parts.push(`${from} → ${to}`)
  }
  return parts.filter(Boolean).join(" - ")
}

function formatDeliverySummary(prefix, data, t, m) {
  const base = `${prefix}: ${data.updated || 0} ${m.updated}, ${data.notified || 0} ${m.whatsapp}, ${data.skipped || 0} ${m.skipped}.`
  const errors = Array.isArray(data.errors) ? data.errors.slice(0, 3) : []
  if (errors.length === 0) return base
  const details = errors.map((e) => formatDeliveryError(e, t, m)).join(" | ")
  const more = data.errors.length > errors.length ? ` +${data.errors.length - errors.length}` : ""
  return `${base} ${m.skippedReasons}: ${details}${more}`
}

/* ─── Main Page ─── */
export default function OrdersPage() {
  const { t } = useLanguage()
  const m = useM()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [draftFilter, setDraftFilter] = useState("") // "" | "true" | "false"
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
  const [deliveryNotice, setDeliveryNotice] = useState(null) // { text, tone }
  const importFileRef = useRef(null)

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (draftFilter) params.draft = draftFilter
      if (search.trim()) params.search = search.trim()
      const res = await ordersAPI.getAll(params)
      const list = Array.isArray(res.data?.orders) ? res.data.orders : Array.isArray(res.data) ? res.data : []
      setOrders(list)
      setDetailOrder((prev) => {
        if (!prev) return prev
        const fresh = list.find((order) => order.id === prev.id)
        return fresh ? { ...prev, ...fresh } : prev
      })
    } catch (err) {
      console.error(err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filterStatus, draftFilter, search])

  useEffect(() => {
    const timer = setTimeout(() => fetchOrders(), 300)
    return () => clearTimeout(timer)
  }, [fetchOrders])

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchOrders({ silent: true })
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  useEffect(() => {
    const visibleIds = new Set(orders.map((o) => o.id))
    setSelectedOrderIds((prev) => prev.filter((id) => visibleIds.has(id)))
  }, [orders])

  // Used both for status updates and for refreshing an order after edits
  function handleStatusChange(orderId, newStatus, updatedOrder = null) {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o
      return {
        ...o,
        ...(updatedOrder && typeof updatedOrder === "object" ? updatedOrder : null),
        status: newStatus,
      }
    }))
    if (updatedOrder && detailOrder?.id === orderId) {
      setDetailOrder((prev) => (prev ? { ...prev, ...updatedOrder } : prev))
    }
  }

  function handleDeleteRequest(id, name) {
    setDeleteModal({ open: true, id, name: name || "", deleting: false })
  }

  async function confirmDelete() {
    setDeleteModal((prev) => ({ ...prev, deleting: true }))
    try {
      await ordersAPI.delete(deleteModal.id)
      setOrders((prev) => prev.filter((o) => o.id !== deleteModal.id))
      setDeleteModal({ open: false, id: null, name: "", deleting: false })
    } catch (err) {
      console.error("Delete order failed:", err)
      setDeleteModal((prev) => ({ ...prev, deleting: false }))
    }
  }

  function cancelDelete() {
    setDeleteModal({ open: false, id: null, name: "", deleting: false })
  }

  function handleCreated(order) {
    setOrders((prev) => [order, ...prev])
  }

  function toggleOrderSelection(orderId) {
    setSelectedOrderIds((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]))
  }

  function toggleVisibleSelection() {
    const visibleIds = orders.map((o) => o.id)
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedOrderIds.includes(id))
    setSelectedOrderIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id))
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
    const confirmedVisibleIds = orders.filter((o) => o.status === "CONFIRMED" && !o.isDraft).map((o) => o.id)
    const selectedConfirmedIds = selectedOrderIds.filter((id) => confirmedVisibleIds.includes(id))
    const orderIds = selectedOrderIds.length > 0 ? selectedConfirmedIds : confirmedVisibleIds

    if (orderIds.length === 0) {
      setDeliveryNotice({ text: t("orders.delivery_no_confirmed") || m.noConfirmed, tone: "error" })
      return
    }

    setExporting(true)
    try {
      const res = await ordersAPI.exportDelivery({ orderIds, providerName: deliveryProviderName })
      if (res?.data?.csv) downloadCsv(res.data.csv, res.data.filename)
      setDeliveryNotice({ text: `${res?.data?.count || orderIds.length} ${m.exportedMsg}`, tone: "brand" })
      setSelectedOrderIds((prev) => prev.filter((id) => !orderIds.includes(id)))
      await fetchOrders({ silent: true })
    } catch (err) {
      console.error("Delivery CSV export failed:", err)
      setDeliveryNotice({ text: err?.message || m.exportFailed, tone: "error" })
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
      setDeliveryNotice({ text: formatDeliverySummary(m.importLabel, res?.data || {}, t, m), tone: "brand" })
      await fetchOrders({ silent: true })
    } catch (err) {
      console.error("Delivery CSV import failed:", err)
      setDeliveryNotice({ text: err?.message || m.importFailed, tone: "error" })
    } finally {
      setImporting(false)
    }
  }

  async function handleBulkDeliveryStatus() {
    if (selectedOrderIds.length === 0) {
      setDeliveryNotice({ text: t("orders.delivery_select_first") || m.selectFirst, tone: "error" })
      return
    }

    const ok = window.confirm(`${t("orders.delivery_bulk_confirm") || m.bulkConfirm} (${selectedOrderIds.length})`)
    if (!ok) return

    setBulkUpdating(true)
    try {
      const res = await ordersAPI.bulkDeliveryStatus({ orderIds: selectedOrderIds, status: bulkStatus, sendMessage })
      setDeliveryNotice({ text: formatDeliverySummary(m.bulkLabel, res?.data || {}, t, m), tone: "brand" })
      setSelectedOrderIds([])
      await fetchOrders({ silent: true })
    } catch (err) {
      console.error("Bulk delivery status failed:", err)
      setDeliveryNotice({ text: err?.message || m.bulkFailed, tone: "error" })
    } finally {
      setBulkUpdating(false)
    }
  }

  /* Stats */
  const stats = STATUS_ORDER.map((s) => ({
    statusKey: s,
    translKey: STATUS_CONFIG[s].key,
    count: orders.filter((o) => o.status === s).length,
    icon: STATUS_CONFIG[s].icon,
  }))
  const totalRevenue = orders
    .filter((o) => o.status !== "CANCELLED" && !o.isDraft)
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const selectedCount = selectedOrderIds.length
  const confirmedVisibleCount = orders.filter((o) => o.status === "CONFIRMED" && !o.isDraft).length
  const exportableSelectedCount = selectedOrderIds.filter((id) =>
    orders.some((o) => o.id === id && o.status === "CONFIRMED" && !o.isDraft)
  ).length
  const exportTargetCount = selectedCount > 0 ? exportableSelectedCount : confirmedVisibleCount

  if (loading && orders.length === 0) return <OrdersSkeleton />

  const chipCls = (active) => cn(
    "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors flex items-center gap-1.5",
    active
      ? "bg-brand-600 text-white border-brand-600"
      : "bg-card border-border text-foreground hover:border-brand-600/40"
  )

  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <IconTile icon={ClipboardList} />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight leading-tight">{t("orders.title")}</h1>
            <p className="text-[13px] text-muted-foreground tabular-nums">{orders.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input ref={importFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportTrackingCsv} />
          <button
            onClick={() => fetchOrders()}
            disabled={loading}
            aria-label={m.refresh}
            title={m.refresh}
            className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-brand-600 hover:border-brand-600/40 transition-colors"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exporting || exportTargetCount === 0}
            title={`${t("orders.delivery_export_csv") || m.exportCsv} (${exportTargetCount})`}
            className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:border-brand-600/40 hover:text-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span className="hidden sm:inline">{t("orders.delivery_export_csv") || m.exportCsv}</span>
          </button>
          <button
            onClick={() => importFileRef.current?.click()}
            disabled={importing}
            title={t("orders.delivery_import_tracking") || m.importTracking}
            className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:border-brand-600/40 hover:text-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            <span className="hidden sm:inline">{t("orders.delivery_import_tracking") || m.importTracking}</span>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-brand-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{t("orders.new")}</span>
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {stats.map(({ statusKey, translKey, count, icon: Icon }) => {
          const active = filterStatus === statusKey
          return (
            <button
              key={statusKey}
              onClick={() => setFilterStatus(active ? "" : statusKey)}
              aria-pressed={active}
              className={cn(
                "flex flex-col gap-1.5 p-4 rounded-2xl border transition-colors text-start",
                active ? "bg-brand-600/5 border-brand-600" : "bg-card border-border hover:border-brand-600/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-foreground tabular-nums">{count}</span>
                <Icon size={16} className="text-brand-600" />
              </div>
              <p className="text-[12px] text-muted-foreground">{t(translKey)}</p>
            </button>
          )
        })}
        <div className="flex flex-col gap-1.5 p-4 rounded-2xl border bg-card border-border text-start">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-foreground tabular-nums">{totalRevenue.toLocaleString()}</span>
            <DollarSign size={16} className="text-brand-600" />
          </div>
          <p className="text-[12px] text-muted-foreground">{t("orders.total")}</p>
        </div>
      </div>

      {/* ── Draft filter chips ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setDraftFilter("")} className={chipCls(draftFilter === "")}>
          {t("orders.filter_all") || m.filterAll}
        </button>
        <button onClick={() => setDraftFilter("true")} className={chipCls(draftFilter === "true")}>
          <AlertTriangle size={13} />
          {t("orders.filter_drafts") || m.filterDrafts}
        </button>
        <button onClick={() => setDraftFilter("false")} className={chipCls(draftFilter === "false")}>
          <CheckCircle2 size={13} />
          {t("orders.filter_complete") || m.filterComplete}
        </button>
      </div>

      {/* ── Search + WhatsApp toggle ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("orders.search")}
            className="w-full ps-10 pe-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-brand-600 transition-colors"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground px-4 py-2.5 bg-card border border-border rounded-xl cursor-pointer select-none hover:border-brand-600/40 transition-colors">
          <input
            type="checkbox"
            checked={sendMessage}
            onChange={(e) => setSendMessage(e.target.checked)}
            className="w-3.5 h-3.5 accent-brand-600"
          />
          {t("orders.send_whatsapp")}
        </label>
      </div>

      {/* ── Delivery workflow ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <IconTile icon={Truck} />
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-foreground">{t("orders.delivery_workflow") || m.deliveryWorkflow}</p>
              <p className="text-[12px] text-muted-foreground truncate">
                {selectedCount > 0
                  ? `${selectedCount} ${t("orders.selected") || m.selected}`
                  : `${confirmedVisibleCount} ${t("orders.confirmed")}`}
              </p>
            </div>
          </div>

          {selectedCount > 0 && (
            <button
              onClick={() => setSelectedOrderIds([])}
              className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 transition-colors self-start lg:self-auto"
            >
              {t("common.cancel")}
            </button>
          )}

          <div className="flex flex-col sm:flex-row gap-2 lg:ms-auto">
            <input
              value={deliveryProviderName}
              onChange={(e) => setDeliveryProviderName(e.target.value)}
              placeholder={t("orders.delivery_provider_optional") || m.providerOptional}
              className="w-full sm:w-56 px-3 py-2 bg-background border border-border rounded-lg text-[13px] focus:outline-none focus:border-brand-600 transition-colors"
            />
            <div className="flex gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded-lg text-[13px] focus:outline-none focus:border-brand-600 transition-colors"
              >
                <option value="SHIPPED">{t("orders.shipped")}</option>
                <option value="DELIVERED">{t("orders.delivered")}</option>
                <option value="CANCELLED">{t("orders.cancelled")}</option>
              </select>
              <button
                onClick={handleBulkDeliveryStatus}
                disabled={bulkUpdating || selectedCount === 0}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[13px] font-semibold text-foreground hover:border-brand-600/40 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {bulkUpdating ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                {t("orders.delivery_bulk_update") || m.bulkUpdate}
              </button>
            </div>
          </div>
        </div>

        {deliveryNotice && (
          <Notice
            tone={deliveryNotice.tone}
            icon={deliveryNotice.tone === "error" ? AlertTriangle : CheckCircle2}
            onClose={() => setDeliveryNotice(null)}
          >
            {deliveryNotice.text}
          </Notice>
        )}
      </div>

      {/* ── Orders list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-brand-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center border border-dashed border-border rounded-2xl">
          <IconTile icon={ClipboardList} size={20} className="w-12 h-12 rounded-2xl" />
          <p className="text-sm font-medium text-muted-foreground">
            {filterStatus || search ? t("orders.no_match") : t("orders.no_orders")}
          </p>
          {!filterStatus && !search && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-sm text-brand-600 font-semibold hover:text-brand-700 transition-colors"
            >
              {t("orders.add_first")}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <OrdersTable
            orders={orders}
            onDeleteRequest={handleDeleteRequest}
            onOpenDetail={setDetailOrder}
            onStatusChange={handleStatusChange}
            sendMessage={sendMessage}
            selectedOrderIds={selectedOrderIds}
            onToggleSelect={toggleOrderSelection}
            onToggleAllVisible={toggleVisibleSelection}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {orders.map((order) => (
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

      {showAdd && <AddOrderModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />}

      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onStatusChange={(id, status, updatedOrder) => handleStatusChange(id, status, updatedOrder)}
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