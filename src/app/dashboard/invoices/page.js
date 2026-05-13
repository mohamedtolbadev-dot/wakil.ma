"use client"

import { useState, useEffect } from "react"
import { invoicesAPI } from "@/lib/api"
import { formatAmount } from "@/lib/helpers"
import { BILLING_PLANS, PLAN_TRANSLATION_KEYS, SELF_SERVICE_PLAN_KEYS } from "@/lib/billingPlans"
import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"
import {
  FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, CalendarDays, DollarSign, CreditCard,
  Loader2, Send,
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

function PlanRequestCards({ invoices, onRequest, requesting }) {
  const { locale } = useLanguage()
  const isAr = String(locale).startsWith("ar")
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

        return (
          <div key={key} className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-foreground">{plan.label}</p>
                <p className="text-sm text-muted-foreground">
                  {plan.aiReplies.toLocaleString(locale)} {isAr ? "رد AI / شهر" : "reponses IA / mois"}
                </p>
              </div>
              <p className="text-xl font-bold text-brand-600">
                {plan.priceDh.toLocaleString(locale)} DH
              </p>
            </div>

            <button
              type="button"
              disabled={busy || pending || disabledByOtherPending}
              onClick={() => onRequest(key)}
              className={cn(
                "h-10 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors",
                pending || disabledByOtherPending
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-70"
              )}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {pending || disabledByOtherPending
                ? (isAr ? "فاتورة في الانتظار" : "Facture en attente")
                : (isAr ? "طلب فاتورة" : "Demander une facture")}
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
  const isOverdue  = invoice.status === "PENDING" && new Date(invoice.dueDate) < new Date()
  const dueDate    = new Date(invoice.dueDate).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
  const createdDate = new Date(invoice.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
  const paidDate   = invoice.paidAt
    ? new Date(invoice.paidAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
    : null

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-mono tracking-wide">{invoice.invoiceNumber}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{createdDate}</p>
        </div>
        <StatusBadge status={invoice.status} isOverdue={isOverdue} />
      </div>

      {/* ── Amount ── */}
      <div className="px-5 pt-5 pb-4 border-b border-border/50 flex items-center justify-between">
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <DollarSign size={15} /> {t('invoices.amount_due')}
        </span>
        <span className="text-2xl font-bold text-brand-600">
          {invoice.amount.toLocaleString(locale)}
          <span className="text-base font-medium ms-1 text-muted-foreground">{t('invoices.currency')}</span>
        </span>
      </div>

      {/* ── Meta rows ── */}
      <div className="px-5 py-4 flex flex-col gap-2.5 text-sm">
        <Row icon={<CreditCard size={15} />} label={t('invoices.plan')}>
          <span className="font-semibold text-foreground">{PLAN_TRANSLATION_KEYS[invoice.plan] ? t(PLAN_TRANSLATION_KEYS[invoice.plan]) : invoice.plan}</span>
        </Row>

        <Row icon={<CalendarDays size={15} />} label={t('invoices.due_date')}>
          <span className={cn("font-semibold", isOverdue ? "text-red-500" : "text-foreground")}>
            {dueDate}
          </span>
        </Row>

        {paidDate && (
          <Row icon={<CheckCircle2 size={15} />} label={t('invoices.paid_date')}>
            <span className="font-semibold text-emerald-500">{paidDate}</span>
          </Row>
        )}
      </div>

      {/* ── Bank info / notes ── */}
      {(invoice.bankInfo || invoice.notes) && (
        <div className="px-5 pb-5 flex flex-col gap-2">
          {invoice.bankInfo && (
            <div className="border border-border/60 rounded-xl p-4">
              <p className="text-sm font-semibold text-brand-600 mb-1">{t('invoices.bank_info')}</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{invoice.bankInfo}</p>
            </div>
          )}
          {invoice.notes && (
            <p className="text-sm text-muted-foreground border border-border/50 rounded-lg px-3 py-2">
              {invoice.notes}
            </p>
          )}
        </div>
      )}

      {/* ── Footer hint ── */}
      {invoice.status === "PENDING" && (
        <div className={cn(
          "px-5 py-3 border-t border-border/50 text-sm font-semibold text-center",
          isOverdue ? "text-red-500" : "text-amber-500"
        )}>
          {isOverdue ? t('invoices.overdue_warning') : t('invoices.pending_hint')}
        </div>
      )}

      {invoice.status === "PAID" && (
        <div className="px-5 py-3 border-t border-border/50 text-sm font-semibold text-center text-emerald-500">
          {t('invoices.paid_hint')}
        </div>
      )}
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
  const [loading, setLoading]   = useState(true)
  const [requesting, setRequesting] = useState(null)

  async function refreshInvoices() {
    const res = await invoicesAPI.getAll()
    setInvoices(res.data ?? [])
  }

  useEffect(() => {
    refreshInvoices()
      .catch(console.error)
      .finally(() => setLoading(false))
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

      <PlanRequestCards invoices={invoices} onRequest={handlePlanRequest} requesting={requesting} />

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {invoices.map(inv => <InvoiceCard key={inv.id} invoice={inv} />)}
        </div>
      )}
    </div>
  )
}
