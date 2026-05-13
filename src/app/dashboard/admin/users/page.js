"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { adminAPI } from "@/lib/api"
import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"
import {
  Users, Trash2, Loader2, RefreshCw, Search, X, Eye,
  ShieldCheck, Mail, Phone, Crown, Sparkles, User,
  MessageCircle, ShoppingCart, FileText, CalendarDays, AlertTriangle,
  Zap, DollarSign, TrendingUp,
} from "lucide-react"

/* ── Plan badge ─────────────────────────────── */
const PLAN_CFG = {
  FREE:       { label: "Free",       cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",      icon: User   },
  PRO:        { label: "Pro",        cls: "bg-brand-600/10 text-brand-700 dark:text-brand-300",                   icon: Crown  },
  BUSINESS:   { label: "Business",   cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: Crown },
  ENTERPRISE: { label: "Enterprise", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Sparkles },
}

function PlanBadge({ plan }) {
  const cfg = PLAN_CFG[plan] ?? PLAN_CFG.FREE
  const Icon = cfg.icon
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-transparent", cfg.cls)}>
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  )
}

/* ── Stat chip ─────────────────────────────── */
function Chip({ icon: Icon, count, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
      <Icon size={11} className="text-muted-foreground shrink-0" />
      <span>{count} {label}</span>
    </span>
  )
}

/* ── Skeleton ─────────────────────────────── */
function Skeleton() {
  return (
    <div className="flex flex-col gap-4 pb-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-secondary" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-28 bg-secondary rounded-lg" />
            <div className="h-3 w-40 bg-secondary rounded-lg" />
          </div>
        </div>
        <div className="w-9 h-9 bg-secondary rounded-xl" />
      </div>
      <div className="h-10 bg-secondary rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-3.5 w-28 bg-secondary rounded" />
                  <div className="h-3 w-36 bg-secondary rounded" />
                </div>
              </div>
              <div className="h-5 w-14 bg-secondary rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="h-3 w-16 bg-secondary rounded" />
              <div className="h-3 w-12 bg-secondary rounded" />
              <div className="h-3 w-12 bg-secondary rounded" />
            </div>
            <div className="h-8 bg-secondary rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Confirm Dialog ────────────────────────── */
function ConfirmDialog({ user, onConfirm, onCancel, loading }) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-sm z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t('admin.confirm_delete_title')}</p>
            <p className="text-[12px] text-muted-foreground">{t('admin.confirm_delete_subtitle')}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {t('admin.confirm_delete_body')} <strong className="text-foreground">{user?.name}</strong>
          {t('admin.confirm_delete_final')}
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm border border-border text-muted-foreground hover:bg-secondary transition-all">
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm bg-red-500 text-white font-semibold hover:bg-red-600 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {loading ? t('admin.deleting') : t('admin.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Main Page
═══════════════════════════════════════════ */
export default function AdminUsersPage() {
  const { t } = useLanguage()
  const [users, setUsers]         = useState([])
  const [totals, setTotals]       = useState(null)
  const [month, setMonth]         = useState("")
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [deleting, setDeleting]   = useState(null)
  const [confirmUser, setConfirmUser] = useState(null)
  const [toast, setToast]         = useState(null)
  const [sortBy, setSortBy]       = useState("recent")  // recent | usage | cost

  function showToast(msg, type = "success") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getUsers()
      setUsers(res.data || [])
      setTotals(res.totals || null)
      setMonth(res.month || "")
    } catch {
      showToast(t('admin.toast_fetch_fail'), "error")
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleDelete() {
    if (!confirmUser) return
    try {
      setDeleting(confirmUser.id)
      await adminAPI.deleteUser(confirmUser.id)
      setUsers(prev => prev.filter(u => u.id !== confirmUser.id))
      showToast(`${confirmUser.name} — ${t('admin.toast_delete_ok')}`)
    } catch {
      showToast(t('admin.toast_delete_fail_user'), "error")
    } finally {
      setDeleting(null)
      setConfirmUser(null)
    }
  }

  const filtered = users
    .filter(u => {
      const q = search.toLowerCase()
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === "usage") return (b.usage?.aiReplies || 0) - (a.usage?.aiReplies || 0)
      if (sortBy === "cost")  return (b.usage?.costUsd || 0)   - (a.usage?.costUsd || 0)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

  if (loading) return <Skeleton />

  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border transition-all",
          toast.type === "error"
            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            : "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
        )}>
          {toast.msg}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmUser && (
        <ConfirmDialog
          user={confirmUser}
          onConfirm={handleDelete}
          onCancel={() => setConfirmUser(null)}
          loading={deleting === confirmUser.id}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-600/10 border border-brand-600/15 flex items-center justify-center shrink-0">
            <Users size={18} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">
              {t('admin.users_title')}
            </h1>
            <p className="text-[12px] text-muted-foreground">
              {users.length} {t('admin.users_registered')}{month ? ` • ${month}` : ""}
            </p>
          </div>
        </div>
        <button onClick={fetchUsers}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Platform Totals Strip */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users size={12} className="text-brand-600" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Users</span>
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">{totals.users}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap size={12} className="text-brand-600" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">AI Replies</span>
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">{totals.aiReplies.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign size={12} className="text-green-600" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">AI Cost</span>
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">${totals.costUsd.toFixed(3)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={12} className={totals.nearQuota > 0 ? "text-amber-500" : "text-muted-foreground"} />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Near quota (≥80%)</span>
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">{totals.nearQuota}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={12} className={totals.overQuota > 0 ? "text-red-500" : "text-muted-foreground"} />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Over quota</span>
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">{totals.overQuota}</p>
          </div>
        </div>
      )}

      {/* Sort tabs */}
      <div className="flex items-center gap-1 p-1 bg-secondary/50 border border-border rounded-xl self-start">
        {[
          { key: "recent", label: t('admin.sort_recent') || "الأحدث" },
          { key: "usage",  label: t('admin.sort_usage')  || "استهلاك AI" },
          { key: "cost",   label: t('admin.sort_cost')   || "التكلفة" },
        ].map(s => (
          <button key={s.key} onClick={() => setSortBy(s.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
              sortBy === s.key
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.users_search_ph')}
          className="w-full pr-9 pl-9 py-2.5 text-sm bg-secondary/60 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600/40 transition-all"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Count */}
      {search && (
        <p className="text-[12px] text-muted-foreground">
          {filtered.length} {t('admin.users_results_of')} {users.length}
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 border border-dashed border-border rounded-2xl text-center">
          <Users size={28} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('admin.users_empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(user => (
            <div key={user.id}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 hover:border-brand-600/30 hover:shadow-sm transition-all">

              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {user.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                    {user.storeName && (
                      <p className="text-[11px] font-medium text-brand-600 truncate">{user.storeName}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <PlanBadge plan={user.effectivePlan || user.plan} />
              </div>

              {/* Info */}
              <div className="flex flex-col gap-1">
                {user.phone && (
                  <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Phone size={11} className="shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <CalendarDays size={11} className="shrink-0" />
                  <span>{new Date(user.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-border/50">
                <Chip icon={MessageCircle} count={user._count?.conversations ?? 0} label={t('nav.conversations')} />
                <Chip icon={ShoppingCart}  count={user._count?.orders ?? 0}         label={t('nav.orders')} />
                <Chip icon={FileText}      count={user._count?.invoices ?? 0}        label={t('nav.invoices')} />
                <span className={cn(
                  "mr-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                  user.isActive
                    ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                )}>
                  {user.isActive ? t('admin.active') : t('admin.inactive')}
                </span>
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                  user.agent?.isActive
                    ? "bg-brand-600/10 text-brand-700 dark:text-brand-300"
                    : "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                )}>
                  AI {user.agent?.isActive ? "ON" : "OFF"}
                </span>
              </div>

              {/* AI Usage bar */}
              {user.usage && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between mb-1 text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Zap size={10} className="text-brand-600" />
                      AI {user.usage.aiReplies}/{user.usage.limit}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      ${user.usage.costUsd.toFixed(3)}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        user.usage.percentUsed >= 100 ? "bg-red-500"   :
                        user.usage.percentUsed >= 80  ? "bg-amber-500" :
                        "bg-brand-600"
                      )}
                      style={{ width: `${Math.min(100, user.usage.percentUsed)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Link href={`/dashboard/admin/users/${user.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                  <Eye size={13} />
                  {t('admin.view_details')}
                </Link>
                <button
                  onClick={() => setConfirmUser(user)}
                  disabled={deleting === user.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all disabled:opacity-50">
                  {deleting === user.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />}
                  {t('admin.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
