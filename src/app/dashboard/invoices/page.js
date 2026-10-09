"use client"

import { useState, useEffect } from "react"
import { invoicesAPI, usageAPI } from "@/lib/api"
import { BILLING_PLANS, PLAN_TRANSLATION_KEYS, SELF_SERVICE_PLAN_KEYS } from "@/lib/billingPlans"
import { getToken } from "@/lib/helpers"
import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"
import {
  FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, CalendarDays, DollarSign, CreditCard,
  Loader2, Send, Zap, Package, Megaphone, Download,
} from "lucide-react"

/* ─────────────────────────────────────────────
   Config
───────────────────────────────────────────── */
const STATUS_CONFIG = {
  PENDING:   { labelKey: "invoices.pending",   color: "text-amber-500",   icon: Clock        },
  PAID:      { labelKey: "invoices.paid",      color: "text-emerald-500", icon: CheckCircle2 },
  OVERDUE:   { labelKey: "invoices.overdue",   color: "text-red-500",     icon: AlertCircle  },
  CANCELLED: { labelKey: "invoices.cancelled", color: "text-zinc-400",    icon: XCircle      },
}

function getBillingCopy(isAr) {
  return isAr
    ? {
        currentPlan: "الخطة الحالية",
        activePlan: "مفعلة الآن",
        planExpires: "تنتهي في",
        manualRenewal: "بدون تاريخ انتهاء",
        aiUsage: "استهلاك ردود AI",
        aiReplies: "رد AI / شهر",
        products: "منتج",
        productLimit: "حد المنتجات",
        unlimitedProducts: "منتجات غير محدودة",
        campaigns: "حملات واتساب",
        included: "مفعلة",
        notIncluded: "غير متاحة",
        choosePlan: "ترقية الخطة",
        choosePlanDesc: "اختر Pro أو Business لفتح المنتجات غير المحدودة والحملات، ثم اطلب فاتورة يفعّلها المسؤول بعد الدفع.",
        manualInvoice: "فاتورة يدوية بعد الطلب",
        campaignsIncluded: "حملات واتساب مفعلة",
        campaignsNotIncluded: "الحملات غير متاحة",
        requestInvoice: "طلب فاتورة",
        invoicePending: "فاتورة في الانتظار",
        currentPlanCta: "الخطة الحالية",
      }
    : {
        currentPlan: "Plan actuel",
        activePlan: "Actif maintenant",
        planExpires: "Expire le",
        manualRenewal: "Sans expiration",
        aiUsage: "Consommation reponses IA",
        aiReplies: "reponses IA / mois",
        products: "produits",
        productLimit: "Limite produits",
        unlimitedProducts: "Produits illimites",
        campaigns: "Campagnes WhatsApp",
        included: "Incluses",
        notIncluded: "Non incluses",
        choosePlan: "Mettre a niveau",
        choosePlanDesc: "Choisissez Pro ou Business pour debloquer les produits illimites et les campagnes, puis demandez une facture activee par l'admin apres paiement.",
        manualInvoice: "Facture manuelle apres demande",
        campaignsIncluded: "Campagnes WhatsApp incluses",
        campaignsNotIncluded: "Campagnes non incluses",
        requestInvoice: "Demander une facture",
        invoicePending: "Facture en attente",
        currentPlanCta: "Plan actuel",
      }
}

function CurrentPlanSummary({ usage, copy, locale }) {
  if (!usage) return null

  const entitlements = usage.entitlements || {}
  const aiLimit = usage.limits?.aiReplies || entitlements.aiReplies || 0
  const aiUsed = usage.usage?.aiReplies || 0
  const percentUsed = Number.isFinite(usage.percentUsed)
    ? Math.min(100, usage.percentUsed)
    : aiLimit > 0 ? Math.min(100, Math.round((aiUsed / aiLimit) * 100)) : 0
  const productLimit = Number.isInteger(entitlements.productLimit)
    ? `${entitlements.productLimit.toLocaleString(locale)} ${copy.products}`
    : copy.unlimitedProducts
  const expiry = usage.plan !== "FREE" && usage.planExpiresAt
    ? new Date(usage.planExpiresAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
    : null

  const cards = [
    {
      icon: Zap,
      label: copy.aiUsage,
      value: `${aiUsed.toLocaleString(locale)} / ${aiLimit.toLocaleString(locale)}`,
      sub: `${Math.max(0, usage.remaining || 0).toLocaleString(locale)} ${copy.aiReplies}`,
    },
    {
      icon: Package,
      label: copy.productLimit,
      value: productLimit,
      sub: Number.isInteger(entitlements.productLimit) ? copy.currentPlan : copy.activePlan,
    },
    {
      icon: Megaphone,
      label: copy.campaigns,
      value: entitlements.campaignsEnabled ? copy.included : copy.notIncluded,
      sub: entitlements.campaignsEnabled ? copy.activePlan : copy.choosePlan,
    },
  ]

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{copy.currentPlan}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">{usage.planLabel || usage.plan}</h2>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
              {copy.activePlan}
            </span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {expiry ? `${copy.planExpires}: ${expiry}` : copy.manualRenewal}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {cards.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-xl border border-border/50 bg-secondary/20 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon size={15} className="text-brand-600" />
              <span>{label}</span>
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-all", usage.allowed ? "bg-brand-600" : "bg-amber-500")}
          style={{ width: `${percentUsed}%` }}
        />
      </div>
    </div>
  )
}

function PlanRequestCards({ invoices, onRequest, requesting, usage, copy }) {
  const { locale, t } = useLanguage()
  const pendingPlans = new Set(invoices.filter(i => i.status === "PENDING").map(i => i.plan))
  const pendingSelfService = invoices.find(
    i => i.status === "PENDING" && SELF_SERVICE_PLAN_KEYS.includes(i.plan)
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {SELF_SERVICE_PLAN_KEYS.map((key) => {
        const plan = BILLING_PLANS[key]
        const pending = pendingPlans.has(key)
        const disabledByOtherPending = Boolean(pendingSelfService) && !pending
        const busy = requesting === key
        const isCurrent = usage?.plan === key
        const features = [
          `${plan.aiReplies.toLocaleString(locale)} ${copy.aiReplies}`,
          Number.isInteger(plan.productLimit)
            ? `${plan.productLimit.toLocaleString(locale)} ${copy.products}`
            : copy.unlimitedProducts,
          plan.campaignsEnabled ? copy.campaignsIncluded : copy.campaignsNotIncluded,
          copy.manualInvoice,
        ]

        return (
          <div
            key={key}
            className={cn(
              "bg-card border rounded-2xl p-5 flex flex-col gap-4",
              isCurrent ? "border-brand-600/40 bg-white" : "border-border/60"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-foreground">
                  {PLAN_TRANSLATION_KEYS[key] ? t(PLAN_TRANSLATION_KEYS[key]) : plan.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {features[0]}
                </p>
              </div>
              <p className="text-xl font-bold text-brand-600">
                {plan.priceDh.toLocaleString(locale)} DH
              </p>
            </div>

            <div className="grid gap-2">
              {features.slice(1).map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={busy || pending || disabledByOtherPending || isCurrent}
              onClick={() => onRequest(key)}
              className={cn(
                "h-10 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors",
                pending || disabledByOtherPending || isCurrent
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-70"
              )}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isCurrent
                ? copy.currentPlanCta
                : pending || disabledByOtherPending
                  ? copy.invoicePending
                  : copy.requestInvoice}
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   StatusBadge — لون على النص والأيقونة فقط
───────────────────────────────────────────── */
function StatusBadge({ status, isOverdue }) {
  const { t } = useLanguage()
  const key = isOverdue && status === "PENDING" ? "OVERDUE" : status
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.PENDING
  const Icon = cfg.icon
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", cfg.color)}>
      <Icon size={15} strokeWidth={2.5} />
      {t(cfg.labelKey)}
    </span>
  )
}

/* ─────────────────────────────────────────────
   InvoiceCard
───────────────────────────────────────────── */
function InvoiceCard({ invoice }) {
  const { t, locale } = useLanguage()
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState("")
  const isOverdue  = invoice.status === "PENDING" && new Date(invoice.dueDate) < new Date()
  const dueDate    = new Date(invoice.dueDate).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
  const createdDate = new Date(invoice.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
  const paidDate   = invoice.paidAt
    ? new Date(invoice.paidAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
    : null

  async function handleDownloadPdf() {
    if (downloadingPdf) return
    setDownloadingPdf(true)
    setPdfError("")
    try {
      const token = getToken()
      if (!token) {
        throw new Error(String(locale).startsWith("ar") ? "خاصك تعاود تدخل للحساب" : "Session expiree")
      }

      const res = await fetch(`/api/invoices/${invoice.id}/pdf?locale=${encodeURIComponent(locale)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "same-origin",
      })
      if (!res.ok) {
        let message = String(locale).startsWith("ar") ? "تعذر تحميل PDF" : "Impossible de telecharger le PDF"
        try {
          const data = await res.json()
          message = data?.detail || data?.error || message
        } catch {}
        throw new Error(message)
      }

      const blob = await res.blob()
      if (!blob.size) {
        throw new Error(String(locale).startsWith("ar") ? "ملف PDF فارغ" : "PDF vide")
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${invoice.invoiceNumber || "invoice"}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error("Invoice PDF download failed:", err)
      setPdfError(err?.message || (String(locale).startsWith("ar") ? "تعذر تحميل PDF" : "Impossible de telecharger le PDF"))
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <div className="w-full max-w-[520px] mx-auto bg-card border border-border/60 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground font-mono tracking-wide">{invoice.invoiceNumber}</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">{createdDate}</p>
        </div>
        <StatusBadge status={invoice.status} isOverdue={isOverdue} />
      </div>

      {/* ── Amount ── */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground flex items-center gap-1">
          <DollarSign size={14} /> {t('invoices.amount_due')}
        </span>
        <span className="text-xl font-bold text-brand-600">
          {invoice.amount.toLocaleString(locale)}
          <span className="text-sm font-medium ms-1 text-muted-foreground">{t('invoices.currency')}</span>
        </span>
      </div>

      {/* ── Meta rows ── */}
      <div className="px-4 py-3 flex flex-col gap-2 text-[13px]">
        <Row icon={<CreditCard size={14} />} label={t('invoices.plan')}>
          <span className="font-semibold text-foreground">{PLAN_TRANSLATION_KEYS[invoice.plan] ? t(PLAN_TRANSLATION_KEYS[invoice.plan]) : invoice.plan}</span>
        </Row>

        <Row icon={<CalendarDays size={14} />} label={t('invoices.due_date')}>
          <span className={cn("font-semibold", isOverdue ? "text-red-500" : "text-foreground")}>
            {dueDate}
          </span>
        </Row>

        {paidDate && (
          <Row icon={<CheckCircle2 size={14} />} label={t('invoices.paid_date')}>
            <span className="font-semibold text-emerald-500">{paidDate}</span>
          </Row>
        )}
      </div>

      {/* ── Bank info / notes ── */}
      {(invoice.bankInfo || invoice.notes) && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {invoice.bankInfo && (
            <div className="border border-border/60 rounded-lg p-3">
              <p className="text-[13px] font-semibold text-brand-600 mb-1">{t('invoices.bank_info')}</p>
              <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{invoice.bankInfo}</p>
            </div>
          )}
          {invoice.notes && (
            <p className="text-[13px] text-muted-foreground border border-border/50 rounded-lg px-3 py-2">
              {invoice.notes}
            </p>
          )}
        </div>
      )}

      {/* ── Footer hint ── */}
      {invoice.status === "PENDING" && (
        <div className={cn(
          "px-4 py-2.5 border-t border-border/50 text-[13px] font-semibold text-center",
          isOverdue ? "text-red-500" : "text-amber-500"
        )}>
          {isOverdue ? t('invoices.overdue_warning') : t('invoices.pending_hint')}
        </div>
      )}

      {invoice.status === "PAID" && (
        <div className="px-4 py-2.5 border-t border-border/50 text-[13px] font-semibold text-center text-emerald-500">
          {t('invoices.paid_hint')}
        </div>
      )}

      <div className="px-4 py-3 border-t border-border/50">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-brand-600/25 bg-brand-600/10 text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-600/15 disabled:opacity-70 dark:text-brand-300"
        >
          {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {downloadingPdf
            ? (String(locale).startsWith("ar") ? "جار التحميل..." : "Telechargement...")
            : (String(locale).startsWith("ar") ? "تحميل PDF" : "Telecharger PDF")}
        </button>
        {pdfError && (
          <p className="mt-2 text-center text-xs font-medium text-red-500">{pdfError}</p>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Helper: Row
───────────────────────────────────────────── */
function Row({ icon, label, children }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span className="flex items-center gap-1">{icon} {label}</span>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Skeleton loader
───────────────────────────────────────────── */
function Skeleton() {
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
      <div className="flex items-center gap-3">
        <div className="sk w-8 h-8 rounded-lg" />
        <div className="flex flex-col gap-1.5">
          <div className="sk h-5 w-24 rounded-md" />
          <div className="sk h-3 w-16 rounded-md" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="sk h-3 w-20 rounded-md" />
              <div className="sk w-6 h-6 rounded-lg" />
            </div>
            <div className="sk h-6 w-8 rounded-md" />
          </div>
        ))}
      </div>

      {/* Invoices grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-card border border-border/60 rounded-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="sk h-3 w-24 rounded-md" />
                <div className="sk h-3 w-16 rounded-md" />
              </div>
              <div className="sk h-4 w-14 rounded-md" />
            </div>
            {/* Amount */}
            <div className="px-5 pt-5 pb-4 border-b border-border/50 flex items-center justify-between">
              <div className="sk h-3 w-20 rounded-md" />
              <div className="sk h-8 w-24 rounded-md" />
            </div>
            {/* Meta rows */}
            <div className="px-5 py-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="sk h-3 w-16 rounded-md" />
                <div className="sk h-4 w-12 rounded-md" />
              </div>
              <div className="flex items-center justify-between">
                <div className="sk h-3 w-20 rounded-md" />
                <div className="sk h-4 w-20 rounded-md" />
              </div>
            </div>
            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/50">
              <div className="sk h-4 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function InvoicesPage() {
  const { t, locale, dir } = useLanguage()
  const [invoices, setInvoices] = useState([])
  const [usage, setUsage] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [requesting, setRequesting] = useState(null)
  const billingCopy = getBillingCopy(String(locale).startsWith("ar"))

  async function refreshInvoices() {
    const res = await invoicesAPI.getAll()
    setInvoices(res.data ?? [])
  }

  async function refreshUsage() {
    const res = await usageAPI.getMe()
    setUsage(res.data ?? null)
  }

  useEffect(() => {
    Promise.all([
      refreshInvoices().catch(console.error),
      refreshUsage().catch(console.error),
    ]).finally(() => setLoading(false))
  }, [])

  async function handlePlanRequest(plan) {
    setRequesting(plan)
    try {
      await invoicesAPI.requestPlan(plan)
      await refreshInvoices()
    } catch (err) {
      console.error(err)
    } finally {
      setRequesting(null)
    }
  }

  if (loading) return <Skeleton />

  const pending = invoices.filter(i => i.status === "PENDING")
  const paid    = invoices.filter(i => i.status === "PAID")
  const total   = paid.reduce((s, i) => s + i.amount, 0)

  const stats = [
    { label: t('invoices.stat_pending'), value: pending.length,                                      color: "text-amber-500"   },
    { label: t('invoices.stat_paid'),    value: paid.length,                                         color: "text-emerald-500" },
    { label: t('invoices.stat_total'),   value: `${total.toLocaleString(locale)} ${t('invoices.currency')}`, color: "text-brand-600" },
  ]

  return (
    <div className="flex flex-col gap-4 pb-8" dir={dir}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center">
          <FileText size={18} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">{t('invoices.title')}</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} {t('invoices.count')}</p>
        </div>
      </div>

      <CurrentPlanSummary usage={usage} copy={billingCopy} locale={locale} />

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground">{billingCopy.choosePlan}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{billingCopy.choosePlanDesc}</p>
        </div>
        <PlanRequestCards
          invoices={invoices}
          onRequest={handlePlanRequest}
          requesting={requesting}
          usage={usage}
          copy={billingCopy}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border/50 rounded-xl p-4 text-right">
            <p className={cn("text-base sm:text-xl font-bold leading-tight truncate", color)}>{value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Invoices grid */}
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 border border-dashed border-border rounded-2xl text-center">
          <FileText size={36} className="text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">{t('invoices.no_invoices')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-w-5xl">
          {invoices.map(inv => <InvoiceCard key={inv.id} invoice={inv} />)}
        </div>
      )}
    </div>
  )
}
