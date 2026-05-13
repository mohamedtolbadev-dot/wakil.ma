"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ArrowRight, MessageCircle, ShoppingCart,
  Hash, Phone, Tag, DollarSign, MapPin, Truck,
  Clock, CheckCircle, XCircle, AlertCircle, RefreshCw,
  User, Mail, CalendarDays, Crown, Sparkles,
} from "lucide-react"
import Link from "next/link"

/* ── helpers ─────────────────────────────── */
function fmt(iso, locale = "fr-FR") {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

/* ── Status configs ──────────────────────── */
const ORDER_STATUS = {
  PENDING:   { label: "En attente",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",   icon: Clock        },
  CONFIRMED: { label: "Confirmé",    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",       icon: CheckCircle  },
  SHIPPED:   { label: "Expédié",     cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",icon: Truck        },
  DELIVERED: { label: "Livré",       cls: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",   icon: CheckCircle  },
  CANCELLED: { label: "Annulé",      cls: "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400",           icon: XCircle      },
}
const CONV_STAGE = {
  GREETING:   { label: "Accueil",    cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"    },
  DISCOVERY:  { label: "Découverte", cls: "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
  PITCHING:   { label: "Pitch",      cls: "bg-purple-100 text-purple-600 dark:bg-purple-900/20"               },
  OBJECTION:  { label: "Objection",  cls: "bg-amber-100 text-amber-600 dark:bg-amber-900/20"                  },
  CLOSING:    { label: "Clôture",    cls: "bg-orange-100 text-orange-600 dark:bg-orange-900/20"               },
  CLOSED:     { label: "Fermé",      cls: "bg-green-100 text-green-600 dark:bg-green-900/20"                  },
  ABANDONED:  { label: "Abandonné",  cls: "bg-red-100 text-red-500 dark:bg-red-900/20"                        },
}
const PLAN_CFG = {
  FREE:       { label: "Free",       icon: User,     cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
  PRO:        { label: "Pro",        icon: Crown,    cls: "bg-brand-600/10 text-brand-700 dark:text-brand-300"             },
  BUSINESS:   { label: "Business",   icon: Crown,    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"         },
  ENTERPRISE: { label: "Enterprise", icon: Sparkles, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30"              },
}

function StatusBadge({ status, map }) {
  const cfg = map[status] ?? map[Object.keys(map)[0]]
  const Icon = cfg.icon
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.cls)}>
      {Icon && <Icon size={10} strokeWidth={2.5} />}
      {cfg.label}
    </span>
  )
}

/* ── Tab button ──────────────────────────── */
function Tab({ active, onClick, icon: Icon, label, count }) {
  return (
    <button onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
        active
          ? "bg-brand-600/10 text-brand-700 dark:text-brand-300 border-brand-600/30"
          : "text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground"
      )}>
      <Icon size={14} />
      {label}
      {count > 0 && (
        <span className={cn(
          "text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
          active ? "bg-brand-600 text-white" : "bg-secondary text-muted-foreground"
        )}>{count}</span>
      )}
    </button>
  )
}

/* ── Skeleton ─────────────────────────────── */
function Skeleton() {
  return (
    <div className="flex flex-col gap-4 pb-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-secondary rounded-xl" />
        <div className="h-4 w-32 bg-secondary rounded-lg" />
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-secondary shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-4 w-40 bg-secondary rounded" />
          <div className="h-3 w-56 bg-secondary rounded" />
          <div className="h-3 w-28 bg-secondary rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        {[80, 90, 100].map((w, i) => <div key={i} className="h-9 bg-secondary rounded-xl" style={{ width: w }} />)}
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="h-3.5 w-48 bg-secondary rounded" />
            <div className="h-3 w-32 bg-secondary rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Main Page
═══════════════════════════════════════════ */
export default function AdminUserDetailPage() {
  const { userId } = useParams()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState("orders")

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.data) setData(json.data)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <Skeleton />
  if (!data)   return (
    <div className="py-20 text-center text-muted-foreground">
      <AlertCircle size={28} className="mx-auto mb-3 opacity-40" />
      <p className="text-sm">لم يتم العثور على العميل</p>
    </div>
  )

  const { user, orders, conversations } = data
  const plan = PLAN_CFG[data.effectivePlan || user.plan] ?? PLAN_CFG.FREE
  const PlanIcon = plan.icon

  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* Back */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/admin/users"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight size={15} />
          إدارة العملاء
        </Link>
      </div>

      {/* User card */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-lg font-bold text-white shrink-0">
          {user.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-lg font-semibold text-foreground">{user.name}</h2>
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", plan.cls)}>
              <PlanIcon size={10} strokeWidth={2.5} />{plan.label}
            </span>
            <span className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
              user.isActive
                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            )}>
              {user.isActive ? "نشط" : "غير نشط"}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Mail size={11} className="shrink-0" /><span className="truncate">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Phone size={11} className="shrink-0" /><span>{user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <CalendarDays size={11} className="shrink-0" /><span>منذ {fmt(user.createdAt)}</span>
            </div>
          </div>
        </div>
        <button onClick={fetchData}
          className="w-8 h-8 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-all shrink-0">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Tab active={tab === "orders"}        onClick={() => setTab("orders")}        icon={ShoppingCart}  label="الطلبيات"    count={orders.length} />
        <Tab active={tab === "conversations"} onClick={() => setTab("conversations")} icon={MessageCircle} label="المحادثات"   count={conversations.length} />
      </div>

      {/* ── Orders tab ── */}
      {tab === "orders" && (
        <div className="flex flex-col gap-2">
          {orders.length === 0 ? (
            <Empty icon={ShoppingCart} label="لا توجد طلبيات" />
          ) : orders.map(o => (
            <Link key={o.id} href={`/dashboard/admin/users/${userId}/orders/${o.id}`} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2 hover:border-brand-600/30 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{o.customerName || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{o.customerPhone || "—"}</p>
                </div>
                <StatusBadge status={o.status} map={ORDER_STATUS} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50">
                <Info icon={Tag}        label="Produit"   value={o.productName || "—"} />
                <Info icon={Hash}       label="Qté"       value={o.quantity ?? 1} />
                <Info icon={DollarSign} label="Total"     value={`${o.totalAmount ?? 0} MAD`} />
                <Info icon={CalendarDays} label="Date"    value={fmt(o.createdAt)} />
                {o.address      && <Info icon={MapPin}   label="Adresse"  value={o.address} />}
                {o.trackingNumber && <Info icon={Truck}  label="Tracking" value={o.trackingNumber} />}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Conversations tab ── */}
      {tab === "conversations" && (
        <div className="flex flex-col gap-2">
          {conversations.length === 0 ? (
            <Empty icon={MessageCircle} label="لا توجد محادثات" />
          ) : conversations.map(c => (
            <Link key={c.id} href={`/dashboard/admin/users/${userId}/conversations/${c.id}`} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-brand-600/30 hover:shadow-sm transition-all">
              <div className="w-9 h-9 rounded-full bg-brand-600/10 flex items-center justify-center shrink-0">
                <MessageCircle size={15} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {c.customer?.name || c.customer?.phone || "—"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">{c.customer?.phone || "—"}</span>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground">{c._count?.messages ?? 0} رسالة</span>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground">{fmt(c.updatedAt)}</span>
                </div>
              </div>
              <StatusBadge status={c.stage} map={CONV_STAGE} />
              {!c.isRead && (
                <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── small helpers ───────────────────────── */
function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon size={11} className="text-muted-foreground shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className="text-[12px] font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}
function Empty({ icon: Icon, label }) {
  return (
    <div className="py-14 flex flex-col items-center gap-3 border border-dashed border-border rounded-2xl text-center">
      <Icon size={24} className="text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
