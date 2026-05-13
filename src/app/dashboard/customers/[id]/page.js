"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { customersAPI } from "@/lib/api"
import { formatAmount, getCustomerTagConfig, timeAgo, getStageClassName } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import {
  ChevronRight, Phone, Edit2, Loader2, AlertCircle,
  RefreshCw, MessageCircle, ShoppingBag,
  Clock, CheckCircle2, XCircle, Package, Truck,
  User, TrendingUp, Star,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

/* ─── Order Status Config ─── */
const ORDER_STATUS_CONFIG = {
  PENDING:   { color: "text-amber-600",  bg: "bg-amber-500/10 border-amber-500/20",   icon: Clock       },
  CONFIRMED: { color: "text-blue-600",   bg: "bg-blue-500/10 border-blue-500/20",     icon: CheckCircle2 },
  SHIPPED:   { color: "text-purple-600", bg: "bg-purple-500/10 border-purple-500/20", icon: Truck       },
  DELIVERED: { color: "text-green-600",  bg: "bg-green-500/10 border-green-500/20",  icon: Package     },
  CANCELLED: { color: "text-red-500",    bg: "bg-red-500/10 border-red-500/20",      icon: XCircle     },
}

/* ─── Skeleton ─── */
function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-5 pb-8">
      <style>{`
        @keyframes sk-shimmer { 0%{background-position:-700px 0} 100%{background-position:700px 0} }
        .sk{border-radius:6px;background:linear-gradient(90deg,var(--color-background-secondary,rgba(0,0,0,.06)) 25%,var(--color-background-tertiary,rgba(0,0,0,.11)) 50%,var(--color-background-secondary,rgba(0,0,0,.06)) 75%);background-size:700px 100%;animation:sk-shimmer 1.5s ease-in-out infinite}
      `}</style>

      {/* Header (back + title) */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="sk w-9 h-9 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="sk h-6 w-52 max-w-full" />
          <div className="sk h-3 w-36 mt-2" />
        </div>
      </div>

      {/* Profile Card (matches grid layout) */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="sk w-14 h-14 sm:w-16 sm:h-16 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="sk h-5 w-44" />
                <div className="sk h-5 w-20" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="sk h-8 w-44 rounded-xl" />
                <div className="sk h-8 w-40 rounded-xl" />
                <div className="sk h-8 w-48 rounded-xl" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            <div className="sk h-[72px] rounded-xl" />
            <div className="sk h-[72px] rounded-xl" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-secondary/50 border border-border/60 rounded-2xl p-1 flex gap-1 overflow-hidden">
        <div className="sk h-10 w-32 rounded-xl" />
        <div className="sk h-10 w-28 rounded-xl" />
        <div className="sk h-10 w-28 rounded-xl" />
      </div>

      {/* Grid cards (2 columns on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="sk w-9 h-9 rounded-lg shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="sk h-4 w-24" />
                  <div className="sk h-4 w-16" />
                </div>
                <div className="sk h-4 w-[85%]" />
                <div className="sk h-3 w-[60%] mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Error State ─── */
function ErrorState({ onRetry }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 rounded-full border border-red-200 bg-red-50 flex items-center justify-center">
        <AlertCircle size={22} className="text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{t('common.load_error')}</p>
      </div>
      <button onClick={onRetry}
        className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors">
        <RefreshCw size={15} /> {t('common.retry')}
      </button>
    </div>
  )
}

/* ─── Conversations List ─── */
function ConversationsList({ conversations, t }) {
  if (!conversations.length) return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <MessageCircle size={28} className="text-muted-foreground mx-auto mb-2" />
      <p className="text-[14px] text-muted-foreground">{t('common.no_data')}</p>
    </div>
  )
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {conversations.map(conv => {
        const lastMsg = conv.messages?.[0]
        return (
          <a
            key={conv.id}
            href={`/dashboard/conversations?id=${conv.id}`}
            className="group bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:border-brand-300 hover:shadow-md transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-600/10 flex items-center justify-center shrink-0 group-hover:bg-brand-600/20 transition-colors">
              <MessageCircle size={16} className="text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={cn("text-[12px] font-semibold px-1.5 py-0.5 rounded-md border", getStageClassName(conv.stage))}>
                  {t(`stage.${conv.stage?.toLowerCase()}`) || conv.stage}
                </span>
                <span className="text-[12px] text-muted-foreground shrink-0">
                  {conv.updatedAt ? timeAgo(conv.updatedAt) : "—"}
                </span>
              </div>
              {lastMsg ? (
                <p className="text-[13px] text-muted-foreground truncate">{lastMsg.content}</p>
              ) : (
                <p className="text-[13px] text-muted-foreground/50 italic">{t('conv.no_messages')}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-[3px] bg-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${conv.score || 0}%` }} />
                </div>
                <span className="text-[11px] font-bold text-brand-600 tabular-nums">{conv.score || 0}%</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1 group-hover:text-brand-600 transition-colors" />
          </a>
        )
      })}
    </div>
  )
}

/* ─── Orders List ─── */
function OrdersList({ orders, t, locale }) {
  if (!orders.length) return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <ShoppingBag size={28} className="text-muted-foreground mx-auto mb-2" />
      <p className="text-[14px] text-muted-foreground">{t('orders.no_orders')}</p>
    </div>
  )
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {orders.map(order => {
        const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING
        const Icon = cfg.icon
        const date = new Date(order.createdAt).toLocaleDateString(locale === "ar" ? "ar-MA" : "fr-FR", {
          day: "numeric", month: "short", year: "numeric",
        })
        return (
          <div key={order.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:border-brand-300 hover:shadow-sm transition-all duration-200">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border", cfg.bg)}>
              <Icon size={16} className={cfg.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-[14px] font-bold text-foreground truncate">{order.productName}</p>
                <span className="text-[13px] font-bold text-brand-600 tabular-nums shrink-0">{formatAmount(order.totalAmount)}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded-md border", cfg.bg, cfg.color)}>
                  {t(`orders.${order.status.toLowerCase()}`) || order.status}
                </span>
                <span className="text-[12px] text-muted-foreground">{t('common.quantity')}: {order.quantity}</span>
                <span className="text-[12px] text-muted-foreground mr-auto">{date}</span>
              </div>
              {order.address && (
                <p className="text-[12px] text-muted-foreground mt-1 truncate">{order.address}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ════════════════════════════════════════════════
   Main Page
════════════════════════════════════════════════ */
export default function CustomerProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const { t, locale } = useLanguage()
  const [customer, setCustomer]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [activeTab, setActiveTab] = useState("conversations")
  const [editingTag, setEditingTag]   = useState(false)
  const [savingTag, setSavingTag]     = useState(false)

  useEffect(() => { fetchCustomer() }, [id])

  async function fetchCustomer() {
    try {
      setLoading(true); setError(false)
      const res = await customersAPI.getById(id)
      setCustomer(res.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleTagChange(newTag) {
    setSavingTag(true)
    try {
      await customersAPI.update(id, { tag: newTag })
      setCustomer(prev => ({ ...prev, tag: newTag }))
      setEditingTag(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSavingTag(false)
    }
  }

  if (loading) return <ProfileSkeleton />
  if (error || !customer) return <ErrorState onRetry={fetchCustomer} />

  const tagConfig    = getCustomerTagConfig(customer.tag, t)
  const conversations = customer.conversations || []
  const orders        = customer.orders || []

  const tabs = [
    { key: "conversations", label: t('nav.conversations'), count: conversations.length, icon: MessageCircle },
    { key: "orders",        label: t('nav.orders'),        count: orders.length,        icon: ShoppingBag  },
  ]

  const joinDate = new Date(customer.createdAt).toLocaleDateString(
    locale === "ar" ? "ar-MA" : "fr-FR",
    { day: "numeric", month: "long", year: "numeric" }
  )

  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
        >
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground leading-tight truncate">{customer.name}</h1>
          <p className="text-[13px] text-muted-foreground">{t('customers.profile_sub')}</p>
        </div>
      </div>

      {/* ── Profile Card ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">

          {/* Avatar + Info */}
          <div className="flex items-start gap-4 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute -inset-[3px] rounded-full bg-brand-600/25" />
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-brand-600 flex items-center justify-center font-bold text-xl sm:text-2xl text-white relative">
                {customer.name?.charAt(0) || "؟"}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[17px] sm:text-[18px] font-bold text-foreground truncate">{customer.name}</h2>

                {/* Editable Tag */}
                <div className="relative">
                  <button
                    onClick={() => setEditingTag(!editingTag)}
                    className={cn(
                      "flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-md border transition-all hover:opacity-80",
                      tagConfig.className
                    )}
                  >
                    {savingTag ? <Loader2 size={11} className="animate-spin" /> : <Edit2 size={11} />}
                    {tagConfig.label}
                  </button>
                  {editingTag && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setEditingTag(false)} />
                      <div className="absolute top-full mt-1 right-0 z-20 bg-card border border-border rounded-xl shadow-xl overflow-hidden w-36">
                        {["NEW", "REGULAR", "VIP", "PROSPECT"].map(tag => {
                          const cfg = getCustomerTagConfig(tag, t)
                          return (
                            <button
                              key={tag}
                              onClick={() => handleTagChange(tag)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2.5 text-[13px] transition-colors hover:bg-secondary",
                                customer.tag === tag ? "bg-secondary/60 font-semibold" : ""
                              )}
                            >
                              <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded border", cfg.className)}>
                                {cfg.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-secondary/60 border border-border text-[12px] text-foreground">
                  <Phone size={13} className="text-brand-600" />
                  <span dir="ltr" className="font-semibold">{customer.phone}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-secondary/60 border border-border text-[12px] text-muted-foreground">
                  <User size={13} className="text-muted-foreground" />
                  <span>{t('customers.joined_label')}: {joinDate}</span>
                </div>
                {customer.lastSeen && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-secondary/60 border border-border text-[12px] text-muted-foreground">
                    <Clock size={13} className="text-muted-foreground" />
                    <span>{t('customers.last_seen')}: {timeAgo(customer.lastSeen, t)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            <div className="text-center bg-secondary/50 border border-border rounded-xl px-4 py-3">
              <p className="text-xl font-bold text-brand-600 tabular-nums">{formatAmount(customer.totalSpent || 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('customers.total_spent')}</p>
            </div>
            <div className="text-center bg-secondary/50 border border-border rounded-xl px-4 py-3">
              <p className="text-xl font-bold text-foreground tabular-nums">{customer.ordersCount ?? orders.length ?? 0}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('customers.orders')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-secondary/50 border border-border/60 rounded-2xl overflow-x-auto scrollbar-none">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 whitespace-nowrap shrink-0 font-medium",
                active
                  ? "bg-background text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon size={14} className={active ? "text-brand-600" : ""} />
              {tab.label}
              <span className={cn(
                "text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums",
                active ? "bg-brand-600/10 text-brand-600" : "bg-border/80 text-muted-foreground"
              )}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "conversations" && (
        <ConversationsList conversations={conversations} t={t} />
      )}
      {activeTab === "orders" && (
        <OrdersList orders={orders} t={t} locale={locale} />
      )}

    </div>
  )
}
