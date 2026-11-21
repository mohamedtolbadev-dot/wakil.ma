"use client"

import React, { useState, useEffect, useRef, useMemo, memo } from "react"
import { useRouter } from "next/navigation"
import { statsAPI, conversationsAPI, agentAPI, authAPI, apiRequest } from "@/lib/api"
import { getStageLabel, getInitials } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import {
  Bot, Plus, ChevronLeft, MessageCircle,
  BarChart3, Sparkles, ArrowUpRight, ShoppingBag,
  AlertCircle, RefreshCw, Activity, Zap, Settings2,
  Brain, Globe, Languages, Truck, Package, CheckCircle2, Clock, AlertTriangle, X,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import UsageWidget from "@/components/UsageWidget"

/* ─────────────── Alert / Modal messages ─────────────── */
const messages = {
  ar: {
    phoneTitle: "سجل رقم الواتساب ديالك",
    phoneDesc: "باش توصلك الفواتير والتنبيهات المهمة، دخل رقم الواتساب ديالك. غادي يتسجل مباشرة فإعدادات الحساب.",
    phoneLabel: "رقم الواتساب",
    phoneRequired: "دخل رقم الواتساب ديالك أولا",
    phoneSaved: "تم حفظ رقم الواتساب بنجاح",
    phoneFailed: "ماقدرناش نسجلو الرقم، عاود حاول",
    later: "فيما بعد",
    save: "حفظ الرقم",
    saving: "جاري الحفظ...",
    close: "إغلاق",
    loadFailed: "وقع مشكل فتحميل البيانات",
  },
  fr: {
    phoneTitle: "Ajoutez votre numéro WhatsApp",
    phoneDesc: "Entrez votre numéro WhatsApp pour recevoir les factures et les alertes importantes. Il sera enregistré dans les paramètres du compte.",
    phoneLabel: "Numéro WhatsApp",
    phoneRequired: "Veuillez d'abord saisir votre numéro WhatsApp",
    phoneSaved: "Numéro WhatsApp enregistré avec succès",
    phoneFailed: "Impossible d'enregistrer le numéro, réessayez",
    later: "Plus tard",
    save: "Enregistrer",
    saving: "Enregistrement...",
    close: "Fermer",
    loadFailed: "Erreur lors du chargement des données",
  },
}

/* ─────────────── Animated Counter ─────────────── */
const AnimatedNumber = memo(function AnimatedNumber({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    const target = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, "")) || 0
    const duration = 900
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
  return <>{display.toLocaleString()}{suffix}</>
})

/* ─────────────── Shared: icon tile ─────────────── */
function IconTile({ icon: Icon, size = 17, className = "" }) {
  return (
    <div className={cn("w-9 h-9 rounded-xl bg-brand-600/10 text-brand-600 flex items-center justify-center shrink-0", className)}>
      <Icon size={size} />
    </div>
  )
}

/* ─────────────── Score Bar ─────────────── */
function ScoreBar({ score }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0))
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-700 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[13px] font-semibold tabular-nums text-foreground">{value}%</span>
    </div>
  )
}

/* ─────────────── Stage Badge ─────────────── */
function StageBadge({ children }) {
  return (
    <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md border border-brand-600/20 bg-brand-600/10 text-brand-700 dark:text-brand-300 shrink-0">
      {children}
    </span>
  )
}

/* ─────────────── Stage Funnel Bar ─────────────── */
function FunnelBar({ label, count, pct, delay }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-secondary transition-colors cursor-default">
      <span className="text-[13px] text-muted-foreground font-medium min-w-[56px]">{label}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-600"
          style={{
            width: animated ? pct : "0%",
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
      <span className="text-[13px] font-bold text-foreground min-w-[18px] text-left tabular-nums">{count}</span>
    </div>
  )
}

/* ─────────────── Stat Card ─────────────── */
function StatCard({ icon, label, value, suffix = "", badge, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 transition-all duration-300 hover:border-brand-600/40"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.4s ease, transform 0.4s ease, border-color 0.2s ease",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <IconTile icon={icon} />
        {badge && (
          <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-brand-600/10 text-brand-700 dark:text-brand-300">
            {badge}
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
        <AnimatedNumber value={typeof value === "number" ? value : 0} suffix={suffix} />
      </p>
      <p className="text-[13px] text-muted-foreground mt-1 font-medium">{label}</p>
    </div>
  )
}

/* ─────────────── Delivery Overview ─────────────── */
function DeliveryOverview({ delivery = {}, onManage, t }) {
  const items = [
    { key: "ready", icon: Clock, label: t("dash.delivery_ready"), value: delivery.readyToExport || 0 },
    { key: "exported", icon: Package, label: t("dash.delivery_exported"), value: delivery.exportedPending || 0 },
    { key: "transit", icon: Truck, label: t("dash.delivery_in_transit"), value: delivery.inTransit || 0 },
    { key: "delivered", icon: CheckCircle2, label: t("dash.delivery_delivered"), value: delivery.delivered || 0 },
  ]
  const successRate = Math.max(0, Math.min(100, Number(delivery.successRate || 0)))

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <IconTile icon={Truck} />
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-foreground truncate">{t("dash.delivery_title")}</p>
            <p className="text-[12px] text-muted-foreground truncate">{t("dash.delivery_subtitle")}</p>
          </div>
        </div>
        <button
          onClick={onManage}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[13px] font-semibold text-foreground hover:border-brand-600/40 hover:text-brand-600 transition-colors"
        >
          {t("dash.delivery_manage")}
          <ArrowUpRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
        {items.map(({ key, icon: Icon, label, value }) => (
          <div key={key} className="rounded-xl border border-border bg-secondary/50 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <Icon size={16} className="text-brand-600" />
              <span className="text-xl font-bold tabular-nums text-foreground">{value}</span>
            </div>
            <p className="text-[12px] font-medium mt-1.5 truncate text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-border bg-secondary/50 px-3 py-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[13px] font-semibold text-foreground">{t("dash.delivery_success_rate")}</span>
            <span className="text-[13px] font-bold text-brand-600 tabular-nums">{successRate}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full bg-brand-600 transition-all duration-700" style={{ width: `${successRate}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/50 px-3 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={16} className="text-brand-600 shrink-0" />
            <span className="text-[13px] font-semibold text-foreground truncate">{t("dash.delivery_missing_tracking")}</span>
          </div>
          <span className="text-[16px] font-bold text-foreground tabular-nums">{delivery.missingTracking || 0}</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Agent Info Chip ─────────────── */
function AgentChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-brand-700 rounded-xl px-3 py-2.5 cursor-default">
      <Icon size={13} className="text-white/60 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-white/60 leading-none mb-1">{label}</p>
        <p className="text-[13px] font-semibold text-white truncate leading-tight">{value}</p>
      </div>
    </div>
  )
}

/* ─────────────── Dashboard Skeleton ─────────────── */
function Bone({ className = "" }) {
  return <div className={cn("rounded-lg bg-foreground/[0.07]", className)} />
}

// شريط بلون brand (نفس لمسة الصورة)
function Accent({ className = "", ...props }) {
  return <div className={cn("h-1.5 rounded-full bg-brand-600/15", className)} {...props} />
}

function SkCard({ className = "", children }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card", className)}>
      {children}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-pulse" aria-busy="true" aria-live="polite">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Bone className="h-6 w-36 rounded-full" />
          <Bone className="h-3 w-52 rounded-full hidden sm:block" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-10 sm:w-36 rounded-xl" />
          <Bone className="h-9 w-10 sm:w-32 rounded-xl" />
        </div>
      </div>

      {/* Stats (4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <SkCard key={i} className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <Bone className="h-3 w-20 rounded-full" />
              <Bone className="h-9 w-9 rounded-xl" />
            </div>
            <Bone className="h-8 w-16 rounded-xl mt-4" />
            <Accent className="w-24 mt-4" />
          </SkCard>
        ))}
      </div>

      {/* Delivery overview */}
      <SkCard className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bone className="h-9 w-9 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Bone className="h-4 w-28 rounded-full" />
              <Bone className="h-3 w-44 rounded-full hidden sm:block" />
            </div>
          </div>
          <Bone className="h-8 w-20 rounded-lg" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border px-3 py-3">
              <div className="flex items-center justify-between">
                <Bone className="h-4 w-4 rounded-md" />
                <Bone className="h-5 w-8 rounded-lg" />
              </div>
              <Bone className="h-3 w-20 rounded-full mt-3" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
          <div className="rounded-xl border border-border px-3 py-3">
            <div className="flex items-center justify-between mb-3">
              <Bone className="h-3 w-28 rounded-full" />
              <Bone className="h-3 w-8 rounded-full" />
            </div>
            <Accent className="w-2/3" />
          </div>
          <div className="rounded-xl border border-border px-3 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bone className="h-4 w-4 rounded-md" />
              <Bone className="h-3 w-32 rounded-full" />
            </div>
            <Bone className="h-5 w-6 rounded-lg" />
          </div>
        </div>
      </SkCard>

      {/* Usage widget */}
      <SkCard className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Bone className="h-9 w-9 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Bone className="h-4 w-36 rounded-full" />
              <Bone className="h-3 w-24 rounded-full" />
            </div>
          </div>
          <Bone className="h-7 w-20 rounded-full" />
        </div>
        <Accent className="w-full h-2" />
      </SkCard>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Conversations table */}
        <SkCard className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <Bone className="h-8 w-8 rounded-lg" />
              <Bone className="h-4 w-32 rounded-full" />
              <Bone className="h-5 w-16 rounded-md hidden sm:block" />
            </div>
            <Bone className="h-3 w-14 rounded-full" />
          </div>

          {/* column heads */}
          <div className="hidden md:grid grid-cols-[1.4fr_1.4fr_1fr_1fr] gap-4 px-4 py-3 border-b border-border">
            {[0, 1, 2, 3].map((i) => (
              <Bone key={i} className="h-2.5 w-16 rounded-full" />
            ))}
          </div>

          {/* rows */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[1.4fr_1.4fr_1fr_1fr] items-center gap-3 md:gap-4 px-4 py-3.5 border-b border-border last:border-b-0"
            >
              <div className="flex items-center gap-2.5">
                <Bone className="h-9 w-9 rounded-xl" />
                <div className="hidden md:flex flex-col gap-2">
                  <Bone className="h-3 w-24 rounded-full" />
                  <Bone className="h-2.5 w-14 rounded-full" />
                </div>
              </div>
              <div className="flex flex-col gap-2 md:block">
                <Bone className="h-3 w-24 rounded-full md:hidden" />
                <Bone className="h-3 w-3/4 rounded-full" />
              </div>
              <Accent className="h-5 w-16 rounded-md" />
              <div className="hidden md:flex items-center gap-2">
                <Accent className="w-14" />
                <Bone className="h-3 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </SkCard>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">

          {/* Funnel */}
          <SkCard className="p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <Bone className="h-8 w-8 rounded-lg" />
              <Bone className="h-4 w-28 rounded-full" />
            </div>
            <div className="flex flex-col gap-4">
              {[100, 74, 47, 26, 17].map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-3 w-14 rounded-full" />
                  <div className="flex-1">
                    <Accent style={{ width: `${w}%` }} />
                  </div>
                  <Bone className="h-3 w-4 rounded-full" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-5 pt-3 border-t border-border">
              <Bone className="h-3 w-24 rounded-full" />
              <Bone className="h-3 w-8 rounded-full" />
            </div>
          </SkCard>

          {/* Agent card */}
          <SkCard className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Bone className="h-10 w-10 rounded-full" />
                <div className="flex flex-col gap-2">
                  <Bone className="h-4 w-24 rounded-full" />
                  <Bone className="h-3 w-16 rounded-full" />
                </div>
              </div>
              <Accent className="h-6 w-16" />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border px-3 py-2.5 flex flex-col gap-2">
                  <Bone className="h-2.5 w-10 rounded-full" />
                  <Bone className="h-3 w-16 rounded-full" />
                </div>
              ))}
            </div>
            <Accent className="w-1/2" />
          </SkCard>

          {/* Quick actions */}
          <SkCard className="p-3 flex items-center justify-between gap-1">
            {[0, 1, 2].map((i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="w-px h-8 bg-border" />}
                <div className="flex-1 flex flex-col items-center gap-2 py-2">
                  <Bone className="h-5 w-5 rounded-md" />
                  <Bone className="h-2.5 w-12 rounded-full" />
                </div>
              </React.Fragment>
            ))}
          </SkCard>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Main Page ─────────────── */
export default function DashboardPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const m = messages[language === "ar" ? "ar" : "fr"]

  const [stats, setStats] = useState(null)
  const [conversations, setConversations] = useState([])
  const [agent, setAgent] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)
  const [phoneInput, setPhoneInput] = useState("")
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneError, setPhoneError] = useState("")
  const [phoneToast, setPhoneToast] = useState(null)
  const toastTimer = useRef(null)

  const agentLanguageLabel = useMemo(() => {
    if (!agent?.language) return "—"
    if (agent.language === "auto") return t("settings.lang_auto") || "تلقائي"
    if (agent.language === "darija") return t("settings.lang_darija")
    if (agent.language === "arabic") return t("settings.lang_arabic")
    if (agent.language === "french") return t("settings.lang_french")
    return agent.language
  }, [agent?.language, t])

  const filteredConversations = useMemo(() => {
    if (!Array.isArray(conversations)) return []
    return conversations
  }, [conversations])

  // Funnel: widths computed from real counts
  const funnel = useMemo(() => {
    const s = stats?.stages || {}
    const rows = [
      { label: t("stage.greeting"), count: s.greeting || 0 },
      { label: t("stage.discovery"), count: s.discovery || 0 },
      { label: t("stage.pitching"), count: s.pitching || 0 },
      { label: t("stage.objection"), count: s.objection || 0 },
      { label: t("stage.closed"), count: s.closed || 0 },
    ]
    const max = Math.max(...rows.map((r) => r.count), 0)
    return rows.map((r, i) => ({
      ...r,
      pct: max > 0 ? `${Math.round((r.count / max) * 100)}%` : "0%",
      delay: 200 + i * 80,
    }))
  }, [stats, t])

  useEffect(() => { fetchDashboardData() }, [])

  useEffect(() => {
    if (user && !user.phone) setPhoneModalOpen(true)
  }, [user])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (!phoneModalOpen) return
    const onKey = (e) => { if (e.key === "Escape") setPhoneModalOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phoneModalOpen])

  function showPhoneToast(message, type = "success") {
    clearTimeout(toastTimer.current)
    setPhoneToast({ message, type })
    toastTimer.current = setTimeout(() => setPhoneToast(null), 3500)
  }

  async function handleSavePhone() {
    const phone = phoneInput.trim()
    if (!phone) {
      setPhoneError(m.phoneRequired)
      return
    }

    try {
      setPhoneSaving(true)
      setPhoneError("")
      const response = await apiRequest("/api/auth/update-profile", {
        method: "PATCH",
        body: JSON.stringify({ phone }),
      })
      const updatedUser = response.data
      setUser((prev) => ({ ...prev, ...updatedUser }))
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}")
        localStorage.setItem("user", JSON.stringify({ ...storedUser, ...updatedUser }))
      } catch {}
      setPhoneModalOpen(false)
      showPhoneToast(m.phoneSaved, "success")
    } catch (err) {
      setPhoneError(err?.message || m.phoneFailed)
    } finally {
      setPhoneSaving(false)
    }
  }

  async function fetchDashboardData() {
    try {
      setLoading(true)
      const [statsData, conversationsData, agentData, userData] = await Promise.all([
        statsAPI.getStats(),
        conversationsAPI.getAll({ limit: 5 }),
        agentAPI.get(),
        authAPI.me(),
      ])
      setStats(statsData.data)
      setConversations(conversationsData.data?.conversations || [])
      setAgent(agentData.data)
      setUser(userData.data || null)
    } catch (err) {
      setError(err?.message || m.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  /* ── Loading ── */
  if (loading) return <DashboardSkeleton />

  /* ── Error ── */
  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-600/10 text-brand-600 flex items-center justify-center">
          <AlertCircle size={22} />
        </div>
        <div className="text-center max-w-sm px-4">
          <p className="text-sm font-semibold text-foreground">{t("common.load_error")}</p>
          <p className="text-sm text-muted-foreground mt-1">{error || m.loadFailed}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          <RefreshCw size={15} />
          {t("common.retry")}
        </button>
      </div>
    )
  }

  /* ── Main render ── */
  return (
    <div className="flex flex-col gap-5">

      {/* ── Phone modal ── */}
      {phoneModalOpen && !user?.phone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="phone-modal-title">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPhoneModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
            <button
              onClick={() => setPhoneModalOpen(false)}
              aria-label={m.close}
              className="absolute top-3 end-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-3 pe-8">
              <IconTile icon={MessageCircle} size={20} className="w-10 h-10" />
              <div className="min-w-0 flex-1">
                <h2 id="phone-modal-title" className="text-base font-bold text-foreground">{m.phoneTitle}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{m.phoneDesc}</p>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="phone-input" className="text-xs font-semibold text-muted-foreground">{m.phoneLabel}</label>
              <input
                id="phone-input"
                type="tel"
                value={phoneInput}
                onChange={(e) => { setPhoneInput(e.target.value); setPhoneError("") }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSavePhone() }}
                placeholder="06 00 00 00 00"
                dir="ltr"
                className={cn(
                  "mt-1.5 w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-colors",
                  phoneError ? "border-red-500/60 focus:border-red-500" : "border-border focus:border-brand-600"
                )}
                autoFocus
              />
              {phoneError && (
                <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  <AlertCircle size={13} className="shrink-0" />
                  {phoneError}
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setPhoneModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {m.later}
              </button>
              <button
                onClick={handleSavePhone}
                disabled={phoneSaving}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {phoneSaving ? m.saving : m.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {phoneToast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed top-4 inset-x-4 sm:inset-x-auto sm:end-4 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg bg-card",
            phoneToast.type === "success"
              ? "border-green-500/30 text-green-700 dark:text-green-300"
              : "border-red-500/30 text-red-700 dark:text-red-300"
          )}
        >
          {phoneToast.type === "success"
            ? <CheckCircle2 size={17} className="shrink-0" />
            : <AlertCircle size={17} className="shrink-0" />}
          <span className="flex-1">{phoneToast.message}</span>
          <button
            onClick={() => setPhoneToast(null)}
            aria-label={m.close}
            className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 1. Header ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">{t("nav.dashboard")}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5 hidden sm:block">
            {new Date().toLocaleDateString(language === "ar" ? "ar-MA" : "fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:border-brand-600/40 hover:text-brand-600 transition-colors"
          >
            <Bot size={15} />
            <span className="hidden sm:inline">{t("dash.customize_agent")}</span>
          </button>

          <button
            onClick={() => router.push("/dashboard/products")}
            className="flex items-center gap-1.5 bg-brand-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">{t("dash.new_product")}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={MessageCircle} label={t("dash.today_convs")} value={stats.todayConversations} badge="+12%" delay={0} />
        <StatCard icon={ShoppingBag} label={t("dash.today_sales")} value={stats.todaySales} badge={`${stats.conversionRate}%`} delay={80} />
        <StatCard icon={Sparkles} label={t("dash.pitching")} value={stats.pitching} badge="Agent" delay={160} />
        <StatCard icon={BarChart3} label={t("dash.today_revenue")} value={stats.todayRevenue || 0} suffix={` ${t("common.currency")}`} delay={240} />
      </div>

      <DeliveryOverview
        delivery={stats.deliveryStats}
        onManage={() => router.push("/dashboard/orders")}
        t={t}
      />

      <UsageWidget />

      {/* ── 3. Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Conversations */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <IconTile icon={MessageCircle} size={15} className="w-8 h-8 rounded-lg" />
              <span className="text-[15px] font-semibold text-foreground">{t("dash.recent_convs")}</span>
              <span className="hidden sm:flex items-center text-[12px] font-semibold text-brand-700 dark:text-brand-300 bg-brand-600/10 rounded-md px-2 py-0.5">
                {stats.todayConversations} {t("dash.today")}
              </span>
            </div>
            <button
              onClick={() => router.push("/dashboard/conversations")}
              className="flex items-center gap-0.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              {t("common.view_all")}
              <ChevronLeft size={13} />
            </button>
          </div>

          {/* Desktop table */}
          <table className="w-full hidden md:table">
            <thead>
              <tr>
                {[t("common.customer"), t("conv.last_msg"), t("common.stage"), t("common.score")].map((h, i) => (
                  <th key={i} className="text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-2.5 bg-secondary/60 border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredConversations.slice(0, 5).map((conv) => {
                const lastMessage = conv.messages?.[0]?.content || t("conv.no_messages")
                return (
                  <tr
                    key={conv.id}
                    onClick={() => router.push(`/dashboard/conversations?id=${conv.id}`)}
                    className="border-t border-border first:border-t-0 hover:bg-secondary/60 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-[13px] font-bold text-white">
                            {getInitials(conv.customer?.name)}
                          </div>
                          {!conv.isRead && (
                            <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-brand-600 border-2 border-card" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-semibold text-foreground truncate">
                            {conv.customer?.name || t("common.customer")}
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <ShoppingBag size={11} />
                            <span>{t("nav.products")}</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[180px]">
                      <p className="text-[13px] text-muted-foreground truncate group-hover:text-foreground transition-colors">{lastMessage}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StageBadge>{getStageLabel(conv.stage, t)}</StageBadge>
                    </td>
                    <td className="px-4 py-3.5">
                      <ScoreBar score={conv.score} />
                    </td>
                  </tr>
                )
              })}
              {filteredConversations.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                    {t("conv.no_convs")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {filteredConversations.slice(0, 5).map((conv) => (
              <div
                key={conv.id}
                onClick={() => router.push(`/dashboard/conversations?id=${conv.id}`)}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/60 active:bg-secondary cursor-pointer transition-colors"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-[13px] font-bold text-white">
                    {getInitials(conv.customer?.name)}
                  </div>
                  {!conv.isRead && (
                    <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-brand-600 border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-foreground truncate">
                      {conv.customer?.name || t("common.customer")}
                    </span>
                    <StageBadge>{getStageLabel(conv.stage, t)}</StageBadge>
                  </div>
                  <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                    {conv.messages?.[0]?.content || t("conv.no_messages")}
                  </p>
                </div>
                <span className="text-[13px] font-bold shrink-0 tabular-nums text-brand-600">
                  {conv.score}%
                </span>
              </div>
            ))}
            {filteredConversations.length === 0 && (
              <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                {t("conv.no_convs")}
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">

          {/* Funnel */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <IconTile icon={Activity} size={15} className="w-8 h-8 rounded-lg" />
              <p className="text-[15px] font-semibold text-foreground">{t("dash.funnel_title")}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              {funnel.map((s) => (
                <FunnelBar key={s.label} {...s} />
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground font-medium">{t("dash.close_rate")}</span>
              <span className="text-[13px] font-bold text-brand-600">{stats.conversionRate}%</span>
            </div>
          </div>

          {/* Agent card — the only solid brand block */}
          <div className="rounded-2xl overflow-hidden bg-brand-600">
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-brand-700">
                      <Brain size={18} className="text-white" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-white border-2 border-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-white leading-tight tracking-tight truncate">
                      {agent?.name || "Agent"}
                    </p>
                    <p className="text-[13px] text-white/70 mt-0.5 truncate">{t("dash.agent_sub")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-brand-700 shrink-0">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                  </span>
                  <span className="text-[12px] font-semibold text-white">{t("common.active")}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <AgentChip icon={Globe} label={t("agent.domain")} value={agent?.domain || "—"} />
                <AgentChip icon={Languages} label={t("agent.language")} value={agentLanguageLabel} />
                <AgentChip icon={Sparkles} label={t("agent.style")} value={agent?.style || "—"} />
                <AgentChip
                  icon={MessageCircle}
                  label={t("dash.today_msgs")}
                  value={<AnimatedNumber value={stats?.todayConversations ?? 0} />}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] text-white/70">{t("dash.conv_rate")}</span>
                  <span className="text-[13px] font-bold text-white">{stats?.conversionRate ?? 0}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-brand-700">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{
                      width: `${stats?.conversionRate ?? 0}%`,
                      transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard/settings")}
              className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-semibold text-white bg-brand-700 hover:bg-brand-800 transition-colors active:scale-[0.99]"
            >
              <Settings2 size={13} />
              {t("dash.edit_agent")}
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Quick actions */}
          <div className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between gap-1">
            {[
              { icon: MessageCircle, label: t("nav.conversations"), href: "/dashboard/conversations" },
              { icon: ShoppingBag, label: t("nav.products"), href: "/dashboard/products" },
              { icon: Zap, label: t("nav.settings"), href: "/dashboard/settings" },
            ].map(({ icon: Icon, label, href }, i) => (
              <React.Fragment key={href}>
                {i > 0 && <div className="w-px h-8 bg-border" />}
                <button
                  onClick={() => router.push(href)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-secondary transition-colors group"
                >
                  <Icon size={17} className="text-brand-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}