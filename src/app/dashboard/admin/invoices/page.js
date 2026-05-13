"use client"

import { useState, useEffect, useCallback } from "react"
import { adminAPI } from "@/lib/api"
import { PLAN_TRANSLATION_KEYS } from "@/lib/billingPlans"
import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"
import {
  FileText, Plus, Loader2, Trash2, Send, CheckCircle2,
  Clock, XCircle, AlertCircle, RefreshCw, User, Search,
  DollarSign, CalendarDays, X, ChevronDown, CreditCard, Pencil,
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
/* ─────────────────────────────────────────────
   StatusBadge — لون على النص والأيقونة فقط
───────────────────────────────────────────── */
function StatusBadge({ status }) {
  const { t } = useLanguage()
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  const Icon = cfg.icon
  return (
    <span className={cn("inline-flex items-center gap-1 text-[13px] font-semibold", cfg.color)}>
      <Icon size={13} strokeWidth={2.5} />
      {t(cfg.labelKey)}
    </span>
  )
}

/* ─────────────────────────────────────────────
   Skeleton — على مستوى المحتوى كاملاً
───────────────────────────────────────────── */
function Skeleton() {
  const { dir } = useLanguage()
  return (
    <div className="flex flex-col gap-4 pb-8 animate-pulse" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-secondary" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-24 bg-secondary rounded-lg" />
            <div className="h-3 w-36 bg-secondary rounded-lg" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-9 h-9 bg-secondary rounded-xl" />
          <div className="w-28 h-9 bg-secondary rounded-xl" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-secondary rounded-xl" />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="h-9 flex-1 bg-secondary rounded-xl" />
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-16 bg-secondary rounded-xl" />
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-secondary rounded-2xl h-56" />
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function getDefaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split("T")[0]
}

const inputCls =
  "w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-600 transition-colors"

/* ─────────────────────────────────────────────
   Modal base
───────────────────────────────────────────── */
function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg border border-border rounded-2xl shadow-2xl overflow-auto max-h-[90vh] bg-card"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-brand-600" />
            <p className="text-[15px] font-bold text-foreground">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   InvoiceForm (shared between Create & Edit)
───────────────────────────────────────────── */
function InvoiceForm({ initialValues, users, disableClient = false, saving, error, onSubmit, onClose, submitLabel }) {
  const { t } = useLanguage()
  const [form, setForm] = useState(initialValues)
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit(form) }}
      className="p-5 flex flex-col gap-3"
    >
      {error && (
        <p className="text-sm text-red-500 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Client */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-muted-foreground">{t('admin.client')} {!disableClient && "*"}</label>
        <select
          className={inputCls}
          value={form.clientId}
          onChange={e => set("clientId", e.target.value)}
          disabled={disableClient}
          required={!disableClient}
        >
          {!disableClient && <option value="">{t('admin.select_client')}</option>}
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} — {u.storeName} ({u.email})</option>
          ))}
        </select>
        {disableClient && (
          <p className="text-[12px] text-muted-foreground/70">{t('admin.client_locked')}</p>
        )}
      </div>

      {/* Amount + Plan */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-muted-foreground">{t('admin.form_amount')}</label>
          <input
            type="number" min="0" className={inputCls} required
            value={form.amount} onChange={e => set("amount", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-muted-foreground">{t('invoices.plan')}</label>
          <select className={inputCls} value={form.plan} onChange={e => set("plan", e.target.value)}>
            <option value="FREE">{t('invoices.plan_free')}</option>
            <option value="PRO">{t('invoices.plan_pro')}</option>
            <option value="BUSINESS">{t('invoices.plan_business')}</option>
            <option value="ENTERPRISE">{t('invoices.plan_enterprise')}</option>
          </select>
        </div>
      </div>

      {/* Due date */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-muted-foreground">{t('admin.form_due_date')}</label>
        <input
          type="date" className={inputCls} required
          value={form.dueDate} onChange={e => set("dueDate", e.target.value)}
        />
      </div>

      {/* Bank info */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-muted-foreground">{t('admin.form_bank_info')}</label>
        <textarea
          className={cn(inputCls, "resize-none")} rows={3}
          placeholder={t('admin.form_bank_ph')}
          value={form.bankInfo} onChange={e => set("bankInfo", e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-muted-foreground">{t('admin.form_notes')}</label>
        <textarea
          className={cn(inputCls, "resize-none")} rows={2}
          value={form.notes} onChange={e => set("notes", e.target.value)}
        />
      </div>

      {/* Footer */}
      <div className="flex gap-2 pt-1 border-t border-border/50">
        <button
          type="button" onClick={onClose}
          className="flex-1 py-3 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
        >
          {t('admin.form_cancel')}
        </button>
        <button
          type="submit" disabled={saving}
          className="flex-1 py-3 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-800 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm shadow-brand-600/20"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />}
          {saving ? t('admin.form_saving') : submitLabel}
        </button>
      </div>
    </form>
  )
}

/* ─────────────────────────────────────────────
   Create Invoice Modal
───────────────────────────────────────────── */
function CreateInvoiceModal({ users, onClose, onCreated }) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(form) {
    if (!form.clientId || !form.amount || !form.dueDate) { setError(t('admin.form_required')); return }
    setSaving(true); setError("")
    try {
      const res = await adminAPI.createInvoice(form)
      onCreated(res.data); onClose()
    } catch { setError(t('admin.form_create_fail')) }
    finally { setSaving(false) }
  }

  return (
    <ModalShell title={t('admin.create_title')} onClose={onClose}>
      <InvoiceForm
        initialValues={{ clientId: "", amount: "", plan: "PRO", dueDate: getDefaultDueDate(), notes: "", bankInfo: "" }}
        users={users} saving={saving} error={error}
        onSubmit={handleSubmit} onClose={onClose} submitLabel={t('admin.submit_create')}
      />
    </ModalShell>
  )
}

/* ─────────────────────────────────────────────
   Edit Invoice Modal
───────────────────────────────────────────── */
function EditInvoiceModal({ invoice, users, onClose, onUpdated }) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(form) {
    if (!form.amount || !form.dueDate) { setError(t('admin.form_required')); return }
    setSaving(true); setError("")
    try {
      const res = await adminAPI.updateInvoice(invoice.id, form)
      onUpdated(res.data); onClose()
    } catch { setError(t('admin.form_update_fail')) }
    finally { setSaving(false) }
  }

  return (
    <ModalShell title={t('admin.edit_title')} onClose={onClose}>
      <InvoiceForm
        initialValues={{
          clientId: invoice.clientId ?? "",
          amount: invoice.amount ?? "",
          plan: invoice.plan ?? "PRO",
          dueDate: invoice.dueDate ? invoice.dueDate.split("T")[0] : getDefaultDueDate(),
          notes: invoice.notes ?? "",
          bankInfo: invoice.bankInfo ?? "",
        }}
        users={users} disableClient saving={saving} error={error}
        onSubmit={handleSubmit} onClose={onClose} submitLabel={t('admin.submit_edit')}
      />
    </ModalShell>
  )
}

/* ─────────────────────────────────────────────
   Invoice Card
───────────────────────────────────────────── */
function InvoiceCard({ invoice, onStatusChange, onDelete, onSend, onEdit }) {
  const { t, locale } = useLanguage()
  const [statusOpen, setStatusOpen] = useState(false)
  const [sending, setSending]       = useState(false)
  const [deleting, setDeleting]     = useState(false)

  const isOverdue   = invoice.status === "PENDING" && new Date(invoice.dueDate) < new Date()
  const statusKey   = isOverdue ? "OVERDUE" : invoice.status
  const dueDate     = new Date(invoice.dueDate).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
  const createdDate = new Date(invoice.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short" })

  async function handleSend()   { setSending(true);  try { await onSend(invoice.id)   } finally { setSending(false)  } }
  async function handleDelete() { setDeleting(true); try { await onDelete(invoice.id) } finally { setDeleting(false) } }

  return (
    <div className="bg-card border border-border/60 rounded-2xl flex flex-col hover:shadow-sm transition-shadow">

      {/* Body */}
      <div className="p-5 flex flex-col gap-3 flex-1">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[12px] text-muted-foreground font-mono tracking-wide">{invoice.invoiceNumber}</p>
            <p className="text-[15px] font-bold text-foreground mt-0.5">{invoice.client?.name}</p>
            <p className="text-[13px] text-muted-foreground">{invoice.client?.storeName}</p>
          </div>
          <StatusBadge status={statusKey} />
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between py-2 border-y border-border/50">
          <span className="text-[13px] text-muted-foreground">{t('admin.card_amount')}</span>
          <span className="text-lg font-bold text-brand-600">
            {invoice.amount.toLocaleString(locale)}
            <span className="text-sm font-medium ms-1 text-muted-foreground">{t('invoices.currency')}</span>
          </span>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CreditCard size={12} /> {PLAN_TRANSLATION_KEYS[invoice.plan] ? t(PLAN_TRANSLATION_KEYS[invoice.plan]) : invoice.plan}
          </span>
          <span className={cn("flex items-center gap-1.5", isOverdue && "text-red-500")}>
            <CalendarDays size={12} /> {t('admin.card_due')} {dueDate}
          </span>
          {invoice.client?.phone && (
            <span className="flex items-center gap-1.5"><User size={12} /> {invoice.client.phone}</span>
          )}
          <span className="text-[12px] opacity-60 mt-0.5">{t('admin.card_created')} {createdDate}</span>
        </div>

        {/* Bank info */}
        {invoice.bankInfo && (
          <div className="text-[12px] text-muted-foreground border border-border/50 rounded-lg p-2 leading-relaxed whitespace-pre-wrap">
            {invoice.bankInfo}
          </div>
        )}
      </div>

      {/* Actions bar */}
      <div className="px-5 py-3 border-t border-border/50 flex items-center gap-1.5">

        {/* Edit */}
        <button
          onClick={() => onEdit(invoice)}
          className="flex items-center gap-1 text-[13px] px-2 py-1 rounded-lg border border-border/50 text-muted-foreground hover:text-brand-600 hover:border-brand-300 transition-all"
        >
          <Pencil size={12} /> {t('admin.card_edit')}
        </button>

        {/* Status dropdown */}
        <div className="relative">
          <button
            onClick={() => setStatusOpen(o => !o)}
            className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-2 py-1 rounded-lg transition-all"
          >
            <ChevronDown size={12} /> {t('admin.card_status')}
          </button>
          {statusOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
              <div
                className="absolute right-0 bottom-full mb-1 z-20 border border-border rounded-xl shadow-xl overflow-hidden w-36 bg-card"
              >
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon
                  return (
                    <button
                      key={key}
                      onClick={() => { onStatusChange(invoice.id, key); setStatusOpen(false) }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors hover:bg-secondary",
                        invoice.status === key && "bg-secondary/60 font-semibold"
                      )}
                    >
                      <Icon size={12} className={cfg.color} />
                      <span className={cfg.color}>{t(cfg.labelKey)}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Send WhatsApp */}
        <button
          onClick={handleSend} disabled={sending}
          className={cn(
            "flex items-center gap-1 text-[13px] px-2 py-1 rounded-lg border transition-all",
            invoice.whatsappSent
              ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              : "text-brand-600 border-brand-200 hover:bg-brand-50"
          )}
        >
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {invoice.whatsappSent ? t('admin.card_sent') : t('admin.card_send')}
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete} disabled={deleting}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-secondary transition-colors mr-auto"
        >
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function AdminInvoicesPage() {
  const { t, locale, dir } = useLanguage()
  const [invoices, setInvoices]         = useState([])
  const [users, setUsers]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [showCreate, setShowCreate]     = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [toast, setToast]               = useState(null)

  function showToast(message, type = "success") {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, usersRes] = await Promise.all([adminAPI.getInvoices(), adminAPI.getUsers()])
      setInvoices(invRes.data ?? [])
      setUsers(usersRes.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatusChange(id, status) {
    try {
      await adminAPI.updateInvoice(id, { status })
      setInvoices(prev => prev.map(inv =>
        inv.id === id ? { ...inv, status, paidAt: status === "PAID" ? new Date().toISOString() : inv.paidAt } : inv
      ))
      showToast(t('admin.toast_status_ok'))
    } catch { showToast(t('admin.toast_status_fail'), "error") }
  }

  async function handleDelete(id) {
    try {
      await adminAPI.deleteInvoice(id)
      setInvoices(prev => prev.filter(inv => inv.id !== id))
      showToast(t('admin.toast_deleted'))
    } catch { showToast(t('admin.toast_delete_fail'), "error") }
  }

  async function handleSend(id) {
    try {
      const res = await adminAPI.sendInvoice(id, locale)
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, whatsappSent: true } : inv))
      if (res?.pdfSent === false) {
        showToast(t('admin.toast_sent_no_pdf'), "warn")
      } else {
        showToast(t('admin.toast_sent'))
      }
    } catch (err) {
      const msg = err?.message ?? ""
      showToast(
        msg.includes("no phone") || msg.includes("phone number")
          ? t('admin.toast_no_phone')
          : t('admin.toast_send_fail'),
        "error"
      )
    }
  }

  function handleUpdated(invoice) {
    setInvoices(prev => prev.map(inv => inv.id === invoice.id ? invoice : inv))
    showToast(t('admin.toast_updated'))
  }

  function handleCreated(invoice) {
    setInvoices(prev => [invoice, ...prev])
    showToast(t('admin.toast_created'))
  }

  const filtered = invoices.filter(inv => {
    const matchStatus = !filterStatus || inv.status === filterStatus
    const matchSearch =
      !search ||
      inv.client?.name?.includes(search) ||
      inv.invoiceNumber?.includes(search) ||
      inv.client?.storeName?.includes(search)
    return matchStatus && matchSearch
  })

  const stats = {
    total:   invoices.length,
    pending: invoices.filter(i => i.status === "PENDING").length,
    paid:    invoices.filter(i => i.status === "PAID").length,
    overdue: invoices.filter(i => i.status === "PENDING" && new Date(i.dueDate) < new Date()).length,
    revenue: invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.amount, 0),
  }

  if (loading) return <Skeleton />

  return (
    <div className="flex flex-col gap-4 pb-8" dir={dir}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center">
            <FileText size={18} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">{t('admin.title')}</h1>
            <p className="text-[13px] text-muted-foreground">{invoices.length} {t('invoices.count')} • {t('admin.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData} disabled={loading}
            className="p-2 rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-brand-600 text-white px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-800 transition-all shadow-sm shadow-brand-600/20"
          >
            <Plus size={16} /><span className="hidden sm:inline"> {t('admin.new_invoice')}</span>
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {[
          { label: t('admin.stat_all'),          value: stats.total,                              color: "text-foreground",     Icon: FileText     },
          { label: t('invoices.stat_pending'),    value: stats.pending,                            color: "text-amber-500",      Icon: Clock        },
          { label: t('invoices.stat_paid'),       value: stats.paid,                               color: "text-emerald-500",    Icon: CheckCircle2 },
          { label: t('invoices.overdue'),         value: stats.overdue,                            color: "text-red-500",        Icon: AlertCircle  },
          { label: t('admin.stat_revenue'),       value: stats.revenue.toLocaleString(locale),     color: "text-brand-600",      Icon: DollarSign   },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-1 text-right">
            <div className="flex items-center justify-between">
              <span className={cn("text-lg font-bold leading-tight", color)}>{value}</span>
              <Icon size={16} className={cn("opacity-50", color)} />
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.search')}
            className="w-full pl-3 pr-9 py-2 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-600 transition-colors"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[["", t('admin.filter_all')], ["PENDING", t('admin.filter_pending')], ["PAID", t('invoices.stat_paid')], ["OVERDUE", t('admin.filter_overdue')], ["CANCELLED", t('invoices.cancelled')]].map(
            ([key, label]) => (
              <button
                key={key} onClick={() => setFilterStatus(key)}
                className={cn(
                  "px-3 py-2 rounded-xl text-[13px] font-semibold border transition-all",
                  filterStatus === key
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-secondary text-muted-foreground border-border hover:border-brand-300"
                )}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 border border-dashed border-border rounded-2xl text-center">
          <FileText size={32} className="text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">{t('admin.no_invoices')}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs text-brand-600 font-semibold hover:text-brand-800"
          >
            {t('admin.create_first')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(invoice => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onSend={handleSend}
              onEdit={setEditingInvoice}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showCreate && (
        <CreateInvoiceModal users={users} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice} users={users}
          onClose={() => setEditingInvoice(null)} onUpdated={handleUpdated}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl border whitespace-nowrap",
          toast.type === "success"
            ? "bg-brand-600 text-white border-brand-400"
            : "bg-red-600 text-white border-red-500"
        )}>
          {toast.type === "success" ? "✅" : "❌"} {toast.message}
        </div>
      )}
    </div>
  )
}
