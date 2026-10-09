"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { statsAPI } from "@/lib/api"
import { formatAmount, translateObjectionReason } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import {
  TrendingUp, TrendingDown, Users, MessageCircle,
  ShoppingBag, Zap, BarChart3, Clock, Target,
  RefreshCcw, AlertCircle, RefreshCw, Activity,
  ShoppingCart, XCircle,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

/* ─────────────── Analytics Skeleton ─────────────── */
function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <style>{`
        @keyframes sk-shimmer {
          0%   { background-position: -700px 0; }
          100% { background-position:  700px 0; }
        }
        .sk {
          border-radius: 6px;
          background: linear-gradient(
            90deg,
            var(--color-background-secondary, rgba(0,0,0,0.06)) 25%,
            var(--color-background-tertiary,  rgba(0,0,0,0.11)) 50%,
            var(--color-background-secondary, rgba(0,0,0,0.06)) 75%
          );
          background-size: 700px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
        }
        .sk-brand {
          border-radius: 4px;
          background: linear-gradient(
            90deg,
            rgba(113,45,222,0.28) 25%,
            rgba(113,45,222,0.50) 50%,
            rgba(113,45,222,0.28) 75%
          );
          background-size: 700px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
        }
        .sk-bar {
          border-radius: 4px 4px 0 0;
          background: linear-gradient(
            90deg,
            rgba(113,45,222,0.32) 25%,
            rgba(113,45,222,0.55) 50%,
            rgba(113,45,222,0.32) 75%
          );
          background-size: 700px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
        }
        .sk-bar-today {
          border-radius: 4px 4px 0 0;
          background: linear-gradient(
            90deg,
            rgba(113,45,222,0.55) 25%,
            rgba(113,45,222,0.82) 50%,
            rgba(113,45,222,0.55) 75%
          );
          background-size: 700px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
        }
        .sk-amber {
          border-radius: 4px;
          background: linear-gradient(
            90deg,
            rgba(186,117,23,0.28) 25%,
            rgba(186,117,23,0.48) 50%,
            rgba(186,117,23,0.28) 75%
          );
          background-size: 700px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
        }
        .prog-track {
          flex: 1; height: 3px;
          background: var(--color-border-tertiary, rgba(0,0,0,0.08));
          border-radius: 4px; overflow: hidden; position: relative;
        }
        .prog-shine::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg,transparent 25%,rgba(113,45,222,0.45) 50%,transparent 75%);
          background-size: 300px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
        }
        .prog-amber::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg,transparent 25%,rgba(186,117,23,0.50) 50%,transparent 75%);
          background-size: 300px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* ── 1. Header ── */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="sk w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="flex flex-col gap-1.5">
            <div className="sk h-4 w-[80px]" />
            <div className="sk h-[11px] w-[140px]" />
          </div>
        </div>
        {/* Period switcher */}
        <div className="flex items-center bg-secondary border border-border rounded-lg p-1 gap-0.5">
          {[52, 44, 52].map((w, i) => (
            <div key={i} className="sk h-[28px] rounded-md" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* ── 2. Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 88, val: 52 },
          { label: 80, val: 44 },
          { label: 96, val: 64 },
          { label: 84, val: 56 },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-5 flex flex-col gap-2.5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex justify-between items-start">
              <div className="sk h-[11px]" style={{ width: s.label }} />
              <div className="sk w-8 h-8 rounded-lg" />
            </div>
            <div className="sk h-[26px] rounded-md" style={{ width: s.val }} />
            {/* TrendingUp sub line — brand tinted */}
            <div className="sk-brand h-[11px]" style={{ width: [96, 80, 88, 92][i] }} />
          </div>
        ))}
      </div>

      {/* ── 3. Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Bar Chart Panel */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="sk w-8 h-8 rounded-lg" />
              <div className="sk h-[14px] w-[110px]" />
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3">
              <div className="sk h-[10px] w-[52px]" />
              <div className="sk-brand h-[10px] w-[44px]" />
            </div>
          </div>
          {/* Bars */}
          <div className="flex items-end gap-2" style={{ height: 110 }}>
            {[38, 55, 44, 62, 34, 50].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="sk h-[10px] w-[10px] rounded" />
                <div className="sk-bar w-full" style={{ height: h }} />
                <div className="sk h-[9px] w-[18px]" />
              </div>
            ))}
            {/* today — deeper */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="sk-brand h-[10px] w-[10px] rounded" />
              <div className="sk-bar-today w-full" style={{ height: 72 }} />
              <div className="sk-brand h-[9px] w-[18px]" />
            </div>
          </div>
        </div>

        {/* Stages Panel */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="sk w-8 h-8 rounded-lg" />
            <div className="sk h-[14px] w-[120px]" />
          </div>
          <div className="flex flex-col gap-1">
            {[48, 56, 42, 50, 44].map((w, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 px-1">
                <div className="sk w-1.5 h-1.5 rounded-full flex-shrink-0" />
                <div className="sk h-[11px] flex-shrink-0" style={{ width: w }} />
                <div className="prog-track prog-shine" />
                <div className="sk h-[11px] w-5" />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 pt-3 border-t border-border">
            <div className="sk h-[11px] w-[80px]" />
            <div className="sk-brand h-[11px] w-[36px]" />
          </div>
        </div>
      </div>

      {/* ── 4. Objections Panel ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="sk w-8 h-8 rounded-lg" />
          <div className="sk h-[14px] w-[180px]" />
        </div>
        <div className="flex flex-col gap-1">
          {[130, 110, 120, 100].map((w, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 px-1">
              {/* rank badge */}
              <div className="sk w-5 h-5 rounded-md flex-shrink-0" />
              <div className="sk h-[11px] flex-shrink-0" style={{ width: w }} />
              <div className="prog-track prog-amber" />
              <div className="sk h-[11px] w-5" />
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Extra Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 96, val: 60 },
          { label: 80, val: 52 },
          { label: 72, val: 48 },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-5 flex items-center gap-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="sk w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              <div className="sk h-[11px]" style={{ width: s.label }} />
              <div className="sk h-[22px] rounded-md" style={{ width: s.val }} />
            </div>
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
    const raw = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0
    const duration = 900
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.floor(eased * raw))
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else setDisplay(raw)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value])
  return <>{display.toLocaleString()}</>
}

/* ─────────────── Animated Progress Bar ─────────────── */
function ProgressBar({ pct, color, delay = 0 }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay)
    return () => clearTimeout(t)
  }, [pct, delay])
  return (
    <div className="flex-1 h-[3px] bg-border rounded-full overflow-hidden">
      <div className="h-full rounded-full"
        style={{ width: `${width}%`, backgroundColor: color, transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }} />
    </div>
  )
}

/* ─────────────── Bar Chart Column ─────────────── */
function ChartBar({ val, maxVal, day, isToday, delay }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  const heightPct = (val / maxVal) * 100
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5">
      <span className={cn("text-[12px] font-bold tabular-nums transition-colors", isToday ? "text-brand-600" : "text-muted-foreground")}>{val}</span>
      <div className="w-full flex items-end" style={{ height: "80px" }}>
        <div className="w-full rounded-t-md"
          style={{
            height: animated ? `${Math.max(heightPct, 4)}%` : "4px",
            backgroundColor: isToday ? "var(--color-brand-600)" : "var(--color-brand-400)",
            transition: "height 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          }} />
      </div>
      <span className={cn("text-[12px] font-medium", isToday ? "text-brand-600" : "text-muted-foreground")}>{day}</span>
    </div>
  )
}

/* ─────────────── Stat Card ─────────────── */
function StatCard({ label, rawValue, display, sub, icon: Icon, isUp = true, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div
      className="group bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-brand-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon size={16} className="text-brand-600" />
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-foreground group-hover:text-brand-600 transition-colors duration-300 tabular-nums">
        {rawValue !== undefined ? <AnimatedNumber value={rawValue} /> : display}
      </p>
      <div className="flex items-center gap-1 mt-1">
        {isUp ? <TrendingUp size={13} className="text-brand-600" /> : <TrendingDown size={13} className="text-red-500" />}
        <p className={cn("text-[13px] font-semibold", isUp ? "text-brand-600" : "text-red-500")}>{sub}</p>
      </div>
      <div className="mt-3 h-[2px] w-0 bg-brand-600 rounded-full group-hover:w-full transition-all duration-500 ease-out" />
    </div>
  )
}

/* ─────────────── Extra Stat Card ─────────────── */
function ExtraStatCard({ label, value, icon: Icon, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div
      className="group bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-brand-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default flex items-center gap-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
      }}
    >
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
        <Icon size={19} className="text-brand-600" />
      </div>
      <div>
        <p className="text-[13px] text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold text-foreground group-hover:text-brand-600 transition-colors duration-300 tabular-nums mt-0.5">{value}</p>
      </div>
      <div className="mr-auto h-[2px] w-0 bg-brand-600 rounded-full group-hover:w-6 transition-all duration-500" />
    </div>
  )
}

/* ─────────────── Main Page ─────────────── */
export default function AnalyticsPage() {
  const { t, locale, dir } = useLanguage()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activePeriod, setActivePeriod] = useState(0)

  const PERIOD_KEYS = ["week", "month", "3months"]

  useEffect(() => { fetchStats(activePeriod) }, [activePeriod])

  const chartLabels = useMemo(() => {
    const n    = stats?.weeklyChart?.length || 0
    const gran = stats?.chartGranularity || "day"
    return Array.from({ length: n }, (_, i) => {
      const pos = n - 1 - i
      if (gran === "day") {
        const d = new Date()
        d.setDate(d.getDate() - pos)
        return d.toLocaleDateString(locale, { weekday: "short" })
      } else if (gran === "week") {
        const d = new Date()
        d.setDate(d.getDate() - pos * 7)
        return d.toLocaleDateString(locale, { day: "numeric", month: "short" })
      } else {
        const d = new Date()
        d.setMonth(d.getMonth() - pos)
        return d.toLocaleDateString(locale, { month: "short" })
      }
    })
  }, [stats?.weeklyChart, stats?.chartGranularity, locale])

  async function fetchStats(periodIdx = 0) {
    const period = PERIOD_KEYS[periodIdx] || "week"
    try {
      setLoading(true); setError(null)
      const response = await statsAPI.getStats(period)
      setStats(response.data)
    } catch {
      setError("analytics.loading_error")
    } finally {
      setLoading(false)
    }
  }

  /* ── Loading → Skeleton ── */
  if (loading) return <AnalyticsSkeleton />

  /* ── Error ── */
  if (error || !stats) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 rounded-full border border-red-200 bg-red-50 flex items-center justify-center">
        <AlertCircle size={20} className="text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{t('common.load_error')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t(error)}</p>
      </div>
      <button onClick={fetchStats} className="flex items-center gap-2 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors">
        <RefreshCw size={15} /> {t('common.retry')}
      </button>
    </div>
  )

  const weeklyChart = stats?.weeklyChart || []
  const maxVal      = Math.max(...weeklyChart, 1)

  return (
    <div className="flex flex-col gap-5" dir={dir}>
      {/* ── 1. Header ── */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <BarChart3 size={17} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{t('analytics.title')}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">{t('dash.overview')}</p>
          </div>
        </div>
        <div className="flex items-center bg-secondary border border-border rounded-lg p-1 gap-0.5">
          {[t('dash.week'), t('dash.month'), `3 ${t('dash.month')}`].map((p, i) => (
            <button key={p} onClick={() => setActivePeriod(i)}
              className={cn(
                "px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-[12px] sm:text-[13px] font-semibold transition-all duration-200",
                activePeriod === i ? "bg-brand-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Stat Cards ── */}
      {(() => {
        const periodLabel = [t('dash.week'), t('dash.month'), `3 ${t('dash.month')}`][activePeriod]
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label={t('analytics.today_convs')} rawValue={stats?.weekConversations || 0}          sub={periodLabel}             icon={MessageCircle} delay={0}   />
            <StatCard label={t('analytics.conversion')}   display={(stats?.conversionRate || 0) + "%"}       sub={t('dash.close_rate')}    icon={TrendingUp}    delay={80}  />
            <StatCard label={t('dash.today_revenue')}      display={formatAmount(stats?.weekRevenue || 0, locale)}     sub={periodLabel}             icon={ShoppingBag}   delay={160} />
            <StatCard label={t('orders.total')}            display={formatAmount(stats?.avgOrderValue || 0, locale)}  sub={t('dash.today_sales')}   icon={Zap}           delay={240} />
          </div>
        )
      })()}

      {/* ── 3. Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-brand-300 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center transition-transform group-hover:scale-110">
                <BarChart3 size={15} className="text-brand-600" />
              </div>
              <p className="text-[15px] font-semibold">{t('nav.conversations')}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-400" />{t('dash.week')}
              </span>
              <span className="flex items-center gap-1.5 text-[12px] text-brand-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-600" />{t('dash.today')}
              </span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            {weeklyChart.map((val, i) => (
              <ChartBar key={i} val={val} maxVal={maxVal} day={chartLabels[i] || ""} isToday={i === weeklyChart.length - 1} delay={i * 60} />
            ))}
          </div>
        </div>

        {/* Stages */}
        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-brand-300 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center transition-transform group-hover:scale-110">
              <Users size={15} className="text-brand-600" />
            </div>
            <p className="text-[15px] font-semibold">{t('dash.funnel_title')}</p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: t('stage.greeting'),  count: stats?.stages?.greeting  || 0, color: "var(--color-brand-600)" },
              { label: t('stage.discovery'), count: stats?.stages?.discovery || 0, color: "var(--color-brand-400)" },
              { label: t('stage.pitching'),  count: stats?.stages?.pitching  || 0, color: "var(--color-brand-600)" },
              { label: t('stage.objection'), count: stats?.stages?.objection || 0, color: "#E24B4A" },
              { label: t('stage.closed'),    count: stats?.stages?.closed    || 0, color: "#0F6E56" },
            ].map((s, idx) => {
              const total = stats?.stages?.greeting || 1
              const pct = Math.round((s.count / total) * 100)
              return (
                <div key={s.label} className="flex items-center gap-3 py-1 px-1 rounded-lg hover:bg-secondary/40 transition-colors cursor-default group/row">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[13px] font-medium text-muted-foreground min-w-[60px] group-hover/row:text-foreground transition-colors">{s.label}</span>
                  <ProgressBar pct={pct} color={s.color} delay={200 + idx * 80} />
                  <span className="text-[13px] font-bold text-foreground min-w-[24px] text-left tabular-nums">{s.count}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground font-medium">{t('dash.close_rate')}</span>
            <span className="text-[13px] font-bold text-brand-600">{stats?.conversionRate || 0}%</span>
          </div>
        </div>
      </div>

      {/* ── 4. Objection Reasons ── */}
      <div className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-brand-300 transition-all duration-300 group">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center transition-transform group-hover:scale-110">
            <TrendingDown size={15} className="text-brand-600" />
          </div>
          <p className="text-[15px] font-semibold">{t('analytics.objections')}</p>
        </div>
        <div className="flex flex-col gap-3">
          {(stats?.objectionReasons || []).map((item, i) => {
            const maxCount = stats?.objectionReasons?.[0]?.count || 1
            const pct = Math.round((item.count / maxCount) * 100)
            return (
              <div key={i} className="flex items-center gap-3 py-1 px-1 rounded-lg hover:bg-secondary/40 transition-colors cursor-default group/row">
                <span className="w-5 h-5 rounded-md bg-secondary flex items-center justify-center text-[11px] font-bold text-brand-600 shrink-0">{i + 1}</span>
                <span className="text-[13px] font-medium text-muted-foreground min-w-[120px] group-hover/row:text-foreground transition-colors">{translateObjectionReason(item.reason, t)}</span>
                <ProgressBar pct={pct} color="#BA7517" delay={300 + i * 80} />
                <span className="text-[13px] font-bold text-foreground min-w-[24px] text-left tabular-nums">{item.count}</span>
              </div>
            )
          })}
          {(!stats?.objectionReasons || stats.objectionReasons.length === 0) && (
            <p className="text-center text-[14px] text-muted-foreground py-4">{t('analytics.no_data')}</p>
          )}
        </div>
      </div>

      {/* ── 5. Products & Services ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products by Orders */}
        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-brand-300 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center transition-transform group-hover:scale-110">
              <ShoppingBag size={15} className="text-brand-600" />
            </div>
            <p className="text-[15px] font-semibold">{t('analytics.top_products')}</p>
          </div>
          <div className="flex flex-col gap-3">
            {(stats?.topProducts || []).map((item, i) => {
              const maxOrders = stats?.topProducts?.[0]?.orders || 1
              const pct = Math.round((item.orders / maxOrders) * 100)
              return (
                <div key={i} className="flex items-center gap-3 py-1 px-1 rounded-lg hover:bg-secondary/40 transition-colors cursor-default group/row">
                  <span className="w-5 h-5 rounded-md bg-secondary flex items-center justify-center text-[11px] font-bold text-brand-600 shrink-0">{i + 1}</span>
                  <span className="text-[13px] font-medium text-muted-foreground min-w-[80px] max-w-[100px] truncate group-hover/row:text-foreground transition-colors">{item.name}</span>
                  <ProgressBar pct={pct} color="var(--color-brand-600)" delay={200 + i * 80} />
                  <span className="text-[12px] font-bold text-foreground shrink-0 tabular-nums">{item.orders} {t('analytics.orders_n')}</span>
                </div>
              )
            })}
            {(!stats?.topProducts || stats.topProducts.length === 0) && (
              <p className="text-center text-[14px] text-muted-foreground py-4">{t('analytics.no_data')}</p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground font-medium">{t('products.stats_total')}</span>
            <span className="text-[13px] font-bold text-brand-600">{stats?.productStats?.total || 0}</span>
          </div>
        </div>

        {/* Top Products by Questions */}
        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-brand-300 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center transition-transform group-hover:scale-110">
              <Zap size={15} className="text-brand-600" />
            </div>
            <p className="text-[15px] font-semibold">{t('analytics.most_asked')}</p>
          </div>
          <div className="flex flex-col gap-3">
            {(stats?.topQuestionsProducts || []).map((item, i) => {
              const maxQ = stats?.topQuestionsProducts?.[0]?.questions || 1
              const pct = Math.round((item.questions / maxQ) * 100)
              return (
                <div key={i} className="flex items-center gap-3 py-1 px-1 rounded-lg hover:bg-secondary/40 transition-colors cursor-default group/row">
                  <span className="w-5 h-5 rounded-md bg-secondary flex items-center justify-center text-[11px] font-bold text-brand-600 shrink-0">{i + 1}</span>
                  <span className="text-[13px] font-medium text-muted-foreground min-w-[80px] max-w-[100px] truncate group-hover/row:text-foreground transition-colors">{item.name}</span>
                  <ProgressBar pct={pct} color="var(--color-brand-400)" delay={200 + i * 80} />
                  <span className="text-[12px] font-bold text-foreground shrink-0 tabular-nums">{item.questions}</span>
                </div>
              )
            })}
            {(!stats?.topQuestionsProducts || stats.topQuestionsProducts.length === 0) && (
              <p className="text-center text-[14px] text-muted-foreground py-4">{t('analytics.no_data')}</p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground font-medium">{t('products.out_of_stock')}</span>
            <span className={cn("text-[13px] font-bold", (stats?.productStats?.outOfStock || 0) > 0 ? "text-red-500" : "text-emerald-600")}>
              {stats?.productStats?.outOfStock || 0}
            </span>
          </div>
        </div>
      </div>

      {/* ── 6. Extra Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: t('analytics.avg_response'),     value: stats?.avgResponseTime > 0 ? `${stats.avgResponseTime}${t('analytics.seconds')}` : "-",       icon: Clock,       delay: 0   },
          { label: t('analytics.conversion_score') || t('analytics.satisfaction'), value: (stats?.conversionScore ?? stats?.satisfactionRate ?? 0) + "%", icon: Target,      delay: 80  },
          { label: t('analytics.return_rate'),      value: (stats?.returnRate || 0) + "%",                                                                icon: RefreshCcw,  delay: 160 },
          { label: t('analytics.abandoned_cart') || "محادثات متوقفة", value: String(stats?.abandonedCart || 0),                                      icon: ShoppingCart, delay: 240 },
          { label: t('analytics.cancellation_rate') || "نسبة الإلغاء", value: (stats?.cancellationRate || 0) + "%",                               icon: XCircle,     delay: 320 },
        ].map(({ label, value, icon: Icon, delay }) => (
          <ExtraStatCard key={label} label={label} value={value} icon={Icon} delay={delay} />
        ))}
      </div>

    </div>
  )
}