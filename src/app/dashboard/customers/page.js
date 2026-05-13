"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { customersAPI, statsAPI, conversationsAPI } from "@/lib/api"
import { formatAmount, getCustomerTagConfig, timeAgo } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import {
  Search, Users, TrendingUp, Crown,
  Sparkles, Star,
  AlertCircle, RefreshCw, Trash2, X,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

/* ─────────────── Customers Skeleton ─────────────── */
function CustomersSkeleton() {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -700px 0; }
          100% { background-position:  700px 0; }
        }
        .sk {
          border-radius: 10px;
          background: linear-gradient(90deg,
            rgba(0,0,0,0.06) 25%,
            rgba(0,0,0,0.12) 50%,
            rgba(0,0,0,0.06) 75%
          );
          background-size: 700px 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          flex-shrink: 0;
        }
        .dark .sk {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.06) 25%,
            rgba(255,255,255,0.14) 50%,
            rgba(255,255,255,0.06) 75%
          );
          background-size: 700px 100%;
        }
        .sk-brand {
          border-radius: 10px;
          background: linear-gradient(90deg,
            rgba(83,74,183,0.12) 25%,
            rgba(83,74,183,0.26) 50%,
            rgba(83,74,183,0.12) 75%
          );
          background-size: 700px 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          flex-shrink: 0;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="sk w-9 h-9 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <div className="sk h-[14px] w-[120px]" />
            <div className="sk h-[10px] w-[160px]" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[[88,52,100],[80,44,80],[96,64,88]].map(([label,val,sub], i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-2.5">
            <div className="flex items-start justify-between">
              <div className="sk h-[10px]" style={{ width: label }} />
              <div className="sk w-8 h-8 rounded-lg" />
            </div>
            <div className="sk h-[26px] rounded-md" style={{ width: val }} />
            <div className="sk-brand h-[10px]" style={{ width: sub }} />
          </div>
        ))}
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/50 border border-border/60 rounded-xl w-fit">
        {[110, 124, 124].map((w, i) => (
          <div key={i} className="sk h-[34px] rounded-lg" style={{ width: w }} />
        ))}
      </div>

      {/* Tag Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {[66,52,56,68,72].map((w, i) => (
          <div key={i} className="sk h-[30px] rounded-lg flex-shrink-0" style={{ width: w }} />
        ))}
      </div>

      {/* Search */}
      <div className="relative bg-card border border-border rounded-lg px-3 py-2.5 flex items-center">
        <div className="sk absolute right-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] rounded" />
        <div className="sk h-3 w-[220px] mr-7" />
      </div>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {[88,72,96,80,76].map((name, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="sk w-9 h-9 rounded-full" />
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="sk h-[13px]" style={{ width: name }} />
                <div className="sk h-[20px] w-[52px] rounded-md" />
              </div>
              <div className="sk h-[10px] w-[110px]" />
              <div className="flex items-center gap-3">
                <div className="sk h-[10px] w-[52px]" />
                <div className="sk-brand h-[10px] w-[64px]" />
                <div className="sk h-[10px] w-[48px] ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid px-4 py-2.5 border-b border-border bg-secondary/40"
          style={{ gridTemplateColumns: "1.8fr 1.2fr 0.8fr 1fr 1fr 0.8fr", gap: 12 }}>
          {[48,36,44,72,60,44].map((w, i) => (
            <div key={i} className="sk h-[10px]" style={{ width: w }} />
          ))}
        </div>
        {[[88,100,48,true,64,52],[72,110,40,true,56,44],[96,96,52,false,68,56],[80,104,44,true,60,48],[84,92,48,false,72,60]].map(([name,phone,orders,spent,date,tag], i) => (
          <div key={i} className="grid items-center px-4 py-3.5 border-t border-border"
            style={{ gridTemplateColumns: "1.8fr 1.2fr 0.8fr 1fr 1fr 0.8fr", gap: 12 }}>
            <div className="flex items-center gap-3">
              <div className="sk w-8 h-8 rounded-full flex-shrink-0" />
              <div className="sk h-[13px]" style={{ width: name }} />
            </div>
            <div className="sk h-[10px]" style={{ width: phone }} />
            <div className="sk h-[10px]" style={{ width: orders }} />
            <div className={spent ? "sk-brand" : "sk"} style={{ height: 12, width: 72, borderRadius: 4 }} />
            <div className="sk h-[10px]" style={{ width: date }} />
            <div className="sk h-[22px] rounded-md" style={{ width: tag }} />
          </div>
        ))}
      </div>

    </div>
  )
}

/* ─────────────── Animated Number ─────────────── */
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    const target = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0
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
  return <>{display.toLocaleString()}</>
}

/* ─────────────── Stat Card ─────────────── */
function StatCard({ label, value, rawValue, sub, icon: Icon, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className="group bg-card border border-border rounded-xl p-4 sm:p-5 cursor-default transition-all duration-300 hover:border-brand-300 hover:shadow-lg hover:-translate-y-0.5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <Icon size={16} className="text-brand-600" />
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-foreground group-hover:text-brand-600 transition-colors duration-300 tabular-nums">
        {rawValue !== undefined ? <AnimatedNumber value={rawValue} /> : value}
      </p>
      <p className="text-[13px] text-brand-600 flex items-center gap-1 font-semibold mt-1">
        <TrendingUp size={12} />
        {sub}
      </p>
      <div className="mt-3 h-[2px] w-0 bg-brand-600 rounded-full group-hover:w-full transition-all duration-500 ease-out" />
    </div>
  )
}

/* ─────────────── Customer Avatar ─────────────── */
function CustomerAvatar({ name, size = "sm" }) {
  const dims = size === "md" ? "w-10 h-10 text-xs" : "w-9 h-9 text-xs"
  return (
    <div className="relative shrink-0">
      <div className="absolute -inset-[2px] rounded-full bg-brand-600" />
      <div className={cn(dims, "rounded-full bg-brand-600 flex items-center justify-center font-bold text-white relative")}>
        {name?.charAt(0) || "؟"}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════
   Main Page
════════════════════════════════════════════════ */
export default function CustomersPage() {
  const { t } = useLanguage()
  const [customers, setCustomers] = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [tagFilter, setTagFilter] = useState("all")
  const [search, setSearch]       = useState("")
  const [conversations, setConversations] = useState([])
  const [deleteModal, setDeleteModal] = useState({ open: false, customer: null })
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchData() }, [search])

  async function handleDelete() {
    if (!deleteModal.customer) return
    setDeleting(true)
    try {
      await customersAPI.delete(deleteModal.customer.id)
      setCustomers(prev => prev.filter(c => c.id !== deleteModal.customer.id))
      setDeleteModal({ open: false, customer: null })
    } catch (err) {
      console.error("Delete customer error:", err)
    } finally {
      setDeleting(false)
    }
  }

  async function fetchConversations() {
    try {
      const convData = await conversationsAPI.getAll()
      setConversations(convData.data?.conversations || [])
    } catch (err) {
      console.error("Failed to fetch conversations:", err)
    }
  }

  // Merge customer data with conversation type
  const customersWithType = useMemo(() => {
    // Ensure conversations is always an array FIRST
    const convArray = Array.isArray(conversations) ? conversations : []
    return customers.map(c => {
      // Find conversation for this customer (by phone or userId)
      const conv = convArray.find(conv => {
        const matchPhone = conv.customer?.phone === c.phone
        const matchCustomerId = conv.customerId === c.id
        const matchUserId = conv.userId === c.userId
        return matchPhone || matchCustomerId || matchUserId
      })
      return {
        ...c,
        type: c.type || conv?.type || null,
        conversationType: c.conversationType || conv?.type || null,
      }
    })
  }, [customers, conversations])

  async function fetchData() {
    try {
      setLoading(true); setError(null)
      const [customersData, statsData] = await Promise.all([
        customersAPI.getAll({
          tag:    tagFilter !== "all" ? tagFilter : undefined,
          search: search.trim() || undefined,
        }),
        statsAPI.getStats(),
      ])
      setCustomers(customersData.data || [])
      setStats(statsData.data)
      await fetchConversations() // Fetch conversations after customers
    } catch {
      setError("customers.loading_error")
    } finally {
      setLoading(false)
    }
  }

  const tagButtons = [
    { key: "all",      label: t('common.all'),             icon: null,     count: customers.length },
    { key: "VIP",      label: "VIP",                       icon: Crown,    count: customers.filter(c => c.tag === "VIP").length },
    { key: "NEW",      label: t('customers.tag_new'),       icon: Sparkles, count: customers.filter(c => c.tag === "NEW").length },
    { key: "REGULAR",  label: t('customers.tag_regular'),   icon: null,     count: customers.filter(c => c.tag === "REGULAR").length },
    { key: "PROSPECT", label: t('customers.tag_prospect'),  icon: null,     count: customers.filter(c => c.tag === "PROSPECT").length },
  ]

  const filtered = useMemo(() => {
    let list = customersWithType

    // فلترة حسب Tag
    if (tagFilter !== "all") {
      list = list.filter(c => c.tag === tagFilter)
    }

    // فلترة حسب البحث
    if (search.trim()) {
      list = list.filter(c =>
        c.name?.includes(search) ||
        c.phone?.includes(search)
      )
    }

    return list
  }, [customersWithType, tagFilter, search])

  const avgSpent = Math.round(
    customers.reduce((s, c) => s + (c.totalSpent || 0), 0) /
    Math.max(1, customers.filter(c => (c.orders || 0) > 0).length)
  )

  /* ── Loading → Skeleton ── */
  if (loading) return <CustomersSkeleton />

  /* ── Error ── */
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 rounded-full border border-brand-600/20 bg-brand-600/5 flex items-center justify-center">
        <AlertCircle size={22} className="text-brand-600" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{t('common.load_error')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t(error)}</p>
      </div>
      <button onClick={fetchData} className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors">
        <RefreshCw size={15} /> {t('common.retry')}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 pb-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <Users size={17} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{t('customers.title')}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">{customers.length} {t('customers.registered')}</p>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label={t('customers.total')}       rawValue={customers.length}               sub={t('customers.this_month')} icon={Users}     delay={0}   />
        <StatCard label={t('customers.returned')}     value={(stats?.returnRate || 0) + "%"}    sub={t('analytics.return_rate')} icon={TrendingUp} delay={80}  />
        <StatCard label={t('customers.avg_spent')}    value={formatAmount(avgSpent)}             sub={t('customers.per_customer')} icon={Star}  delay={160} />
      </div>

      {/* ── Filters + Search ── */}
      <div className="flex flex-col gap-2.5">

        {/* Tag Filter Buttons */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {tagButtons.map((t) => {
            const Ico = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTagFilter(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold border shrink-0 transition-all duration-200",
                  tagFilter === t.key
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-brand-300"
                )}
              >
                {Ico && <Ico size={13} />}
                {t.label}
                <span className={cn(
                  "text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums",
                  tagFilter === t.key ? "bg-white/20 text-white" : "bg-border/80 text-muted-foreground"
                )}>
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('customers.search_placeholder')}
            className="w-full pr-9 pl-3 py-2.5 bg-card border border-border rounded-lg text-[14px] outline-none focus:border-brand-400 transition-colors duration-200"
          />
        </div>
      </div>

      {/* ── Empty ── */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Users size={22} className="text-brand-600" />
          </div>
          <p className="text-[14px] text-muted-foreground">{t('customers.empty')}</p>
        </div>
      ) : (
        <>
          {/* ── Mobile Cards ── */}
          <div className="flex flex-col gap-2 md:hidden">
            {filtered.map((customer, idx) => {
              const tagConfig = getCustomerTagConfig(customer.tag, t)
              return (
                <MobileCustomerCard key={customer.id} customer={customer} tagConfig={tagConfig} delay={idx * 40} onDelete={() => setDeleteModal({ open: true, customer })} />
              )
            })}
          </div>

          {/* ── Desktop Table ── */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden transition-shadow duration-300 hover:shadow-lg">
            <table className="w-full">
              <thead>
                <tr>
                  {[t('common.customer'), t('common.phone'), t('customers.orders_count'), t('customers.total_spent'), t('customers.last_seen'), t('customers.tag')].map(h => (
                    <th key={h} className="text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3 bg-secondary/40 border-b border-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer, idx) => {
                  const tagConfig = getCustomerTagConfig(customer.tag, t)
                  return (
                    <DesktopCustomerRow key={customer.id} customer={customer} tagConfig={tagConfig} delay={idx * 30} onDelete={() => setDeleteModal({ open: true, customer })} />
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {/* ── Delete Confirm Modal ── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteModal({ open: false, customer: null })}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => !deleting && setDeleteModal({ open: false, customer: null })} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-[16px] font-bold text-foreground text-center mb-1">{t('admin.confirm_delete_title')}</h3>
            <p className="text-[13px] text-muted-foreground text-center mb-1">
              {t('admin.confirm_delete_subtitle')}
            </p>
            <p className="text-[13px] text-muted-foreground text-center mb-5">
              {t('admin.confirm_delete_body')} <span className="text-brand-600 font-semibold">{deleteModal.customer?.name}</span>{t('admin.confirm_delete_final')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteModal({ open: false, customer: null })}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-[14px] font-medium hover:bg-secondary transition-colors disabled:opacity-50"
              >{t('common.cancel')}</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[14px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Trash2 size={14} />}
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────── Mobile Card ─────────────── */
function MobileCustomerCard({ customer, tagConfig, delay, onDelete }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
      className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-brand-300 hover:shadow-md transition-all duration-200 cursor-pointer"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.35s ease, transform 0.35s ease, border-color 0.2s",
      }}
    >
      <CustomerAvatar name={customer.name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-[14px] font-bold text-foreground truncate">{customer.name}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md border bg-brand-600/10 text-brand-600 border-brand-600/20">
              {tagConfig.label}
            </span>
            <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground">{customer.phone}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[12px] text-muted-foreground">{customer.ordersCount ?? 0} {t('customers.orders')}</span>
          {customer.totalSpent > 0 && (
            <span className="text-[12px] font-bold text-brand-600 tabular-nums">{formatAmount(customer.totalSpent)}</span>
          )}
          <span className="text-[12px] text-muted-foreground mr-auto">
            {customer.lastSeen ? timeAgo(customer.lastSeen, t) : "—"}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Desktop Row ─────────────── */
function DesktopCustomerRow({ customer, tagConfig, delay, onDelete }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <tr
      onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
      className="border-t border-border hover:bg-secondary/40 cursor-pointer transition-colors duration-150 group"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}
    >
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <CustomerAvatar name={customer.name} />
          <span className="text-[14px] font-bold text-foreground group-hover:text-brand-600 transition-colors">
            {customer.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-[13px] text-muted-foreground">{customer.phone}</td>
      <td className="px-4 py-3.5 text-[13px] font-medium text-foreground tabular-nums">{customer.ordersCount ?? 0} {t('customers.orders')}</td>
      <td className="px-4 py-3.5">
        <span className={cn("text-[13px] font-bold tabular-nums", customer.totalSpent > 0 ? "text-brand-600" : "text-muted-foreground")}>
          {customer.totalSpent > 0 ? formatAmount(customer.totalSpent) : "—"}
        </span>
      </td>
      <td className="px-4 py-3.5 text-[13px] text-muted-foreground">
        {customer.lastSeen ? timeAgo(customer.lastSeen, t) : "—"}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md border bg-brand-600/10 text-brand-600 border-brand-600/20">
            {tagConfig.label}
          </span>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}