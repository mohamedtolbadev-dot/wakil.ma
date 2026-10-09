"use client"

import { useState, useEffect } from "react"
import { useAgentStore } from "@/store/agentStore"
import { productsAPI } from "@/lib/api"
import { getToken } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import { getPublicAppUrl, getWhatsAppWebhookUrl } from "@/lib/publicAppUrl"
import { Loader2, Package, Clock, Store, Eye, EyeOff, Sparkles, Zap, Heart, Crown, Flame, Maximize2, XCircle, Truck } from "lucide-react"
import {
  Bot, Save, Plus, Trash2, MessageCircle,
  Settings, Shield, Bell, Phone, CalendarCheck,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

// ═══════════════════════════════════════════════════════════════
// ANIMATED REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Field({ label, hint, icon: Icon, children, delay = 0 }) {
  return (
    <div 
      className="flex flex-col gap-2 animate-fadeIn"
      style={{ animationDelay: `${delay}ms` }}
    >
      {label && (
        <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground/80">
          {Icon && (
            <span className="p-0.5 rounded bg-brand-600/10">
              <Icon size={13} className="text-brand-600" />
            </span>
          )}
          {label}
        </label>
      )}
      {children}
      {hint && (
        <p className="text-[12px] text-muted-foreground/60 leading-relaxed flex items-center gap-1">
          <Sparkles size={10} className="text-brand-600/40" />
          {hint}
        </p>
      )}
    </div>
  )
}

function Section({ title, children, className = "", delay = 0 }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={cn(
        "group relative bg-card border border-border rounded-2xl overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:shadow-lg hover:shadow-brand-600/10 hover:border-brand-600/30",
        "animate-slideUp",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {title && (
        <div className="relative px-5 py-4 border-b border-border/50 bg-secondary/50">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-brand-600" />
            <p className="text-sm font-bold text-foreground/80 tracking-wide">{title}</p>
          </div>
        </div>
      )}
      <div className="relative p-5">{children}</div>
    </div>
  )
}

function Toggle({ on, onToggle, label, sub }) {
  return (
    <div className="flex items-center justify-between gap-3 group">
      {(label || sub) && (
        <div className="flex-1 min-w-0">
          {label && <p className="text-sm font-semibold text-foreground">{label}</p>}
          {sub && <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{sub}</p>}
        </div>
      )}
      <button
        onClick={onToggle}
        className={cn(
          "relative shrink-0 w-11 h-6 rounded-full transition-all duration-300 ease-spring",
          on 
            ? "bg-brand-600 shadow-lg shadow-brand-600/30" 
            : "bg-border hover:bg-border/80"
        )}
      >
        <span className={cn(
          "absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ease-spring",
          on ? "right-1 translate-x-0" : "right-6 translate-x-0"
        )}>
          {on && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Zap size={10} className="text-brand-600 fill-brand-600" />
            </span>
          )}
        </span>
      </button>
    </div>
  )
}

function AnimatedButton({ children, onClick, disabled, variant = "primary", className = "" }) {
  const [isPressed, setIsPressed] = useState(false)

  const variants = {
    primary: "bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40",
    secondary: "bg-secondary border border-border hover:border-brand-600/30 hover:bg-secondary/80",
    danger: "bg-brand-600/10 border border-brand-600/20 text-brand-600 hover:bg-brand-600/20",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={cn(
        "relative overflow-hidden px-5 py-3 rounded-xl text-sm font-semibold",
        "transition-all duration-200 ease-out",
        "active:scale-[0.98]",
        isPressed && "scale-[0.98]",
        variants[variant],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <span className="relative flex items-center justify-center gap-2">{children}</span>
    </button>
  )
}

const inputCls = `
  w-full px-4 py-3 bg-secondary/50 border border-border/60 rounded-xl text-sm
  outline-none transition-all duration-300
  focus:border-brand-600/50 focus:bg-secondary focus:ring-4 focus:ring-brand-600/5
  hover:border-border/80
  placeholder:text-muted-foreground/40
`

const textareaCls = inputCls + " resize-none leading-relaxed min-h-[80px]"

const replyDelayOptions = [
  { value: "instant", seconds: "0s" },
  { value: "short", seconds: "3-7s" },
  { value: "natural", seconds: "8-18s" },
  { value: "custom", seconds: "0-20s" },
]

const replyDelayCopy = {
  ar: {
    title: "توقيت رد الوكيل",
    hint: "اختار واش الوكيل يجاوب مباشرة أو يتأخر قليلاً باش يبان الرد طبيعي.",
    instant: "فوري",
    short: "قصير",
    natural: "طبيعي",
    custom: "مخصص",
    min: "أقل تأخير",
    max: "أقصى تأخير",
    seconds: "ثانية",
    customHint: "القيمة القصوى محدودة حالياً في 20 ثانية.",
  },
  fr: {
    title: "Timing des reponses",
    hint: "Choisissez si l'agent repond instantanement ou avec un delai naturel.",
    instant: "Instant",
    short: "Court",
    natural: "Naturel",
    custom: "Personnalise",
    min: "Delai min",
    max: "Delai max",
    seconds: "secondes",
    customHint: "Le delai maximum est limite a 20 secondes pour le moment.",
  },
}

function clampReplyDelayInput(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(20, Math.max(0, Math.round(number)))
}

// ═══════════════════════════════════════════════════════════════
// MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════

function TextareaModal({ isOpen, onClose, title, value, onChange, placeholder, hint }) {
  const { t } = useLanguage()
  const [localValue, setLocalValue] = useState(value)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl border border-border rounded-2xl shadow-2xl animate-slideUp"
           style={{ backgroundColor: 'var(--modal-surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-secondary/50">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-brand-600" />
            <p className="text-sm font-bold text-foreground/80">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {hint && (
            <p className="text-[12px] text-muted-foreground mb-3 flex items-center gap-1.5">
              <Sparkles size={12} className="text-brand-600/60" />
              {hint}
            </p>
          )}
          <textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={placeholder}
            className={cn(textareaCls, "min-h-[300px] text-[15px]")}
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50 bg-secondary/30">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => { onChange(localValue); onClose() }}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-md shadow-brand-600/20"
          >
            {t('settings.save_changes')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

// Note: `agent.domain` stores a business category (e.g. "ملابس"), not a URL/FQDN.
// The old isValidDomain helper was removed — its FQDN check was semantically wrong here.

/* ─────────────────────────────────────────────────────────────
   SettingsSkeleton
   يطابق تماماً بنية SettingsPage — كل تاب لها سكلتون خاص بها
   الاستخدام: استبدل loading state في SettingsPage بهذا المكون
───────────────────────────────────────────────────────────── */

/* ── Keyframe injected once via global style ── */
const shimmerStyle = `
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
`

/* ── Base shimmer block ── */
function Sk({ w, h, r = 6, style = {}, className = "" }) {
  return (
    <div
      className={className}
      style={{
        width: w,
        height: h,
        borderRadius: r,
        backgroundImage:
          "linear-gradient(90deg, var(--sk-a) 25%, var(--sk-b) 50%, var(--sk-a) 75%)",
        backgroundSize: "600px 100%",
        animation: "shimmer 1.6s infinite linear",
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

/* ── Section card shell ── */
function SectionShell({ children, hasTitle = true }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {hasTitle && (
        <div className="px-5 py-3.5 border-b border-border bg-secondary/50 flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-brand-600" />
          <Sk w={110} h={12} />
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

/* ── Field skeleton (label + input) ── */
function FieldSk({ labelW = 80, inputH = 38, textarea = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Sk w={labelW} h={11} />
      <Sk w="100%" h={textarea ? 72 : inputH} r={10} />
    </div>
  )
}

/* ── Toggle row skeleton ── */
function ToggleSk({ labelW = '40%', subW = '60%' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <Sk w={labelW} h={12} />
        <Sk w={subW} h={10} style={{ opacity: 0.6 }} />
      </div>
      <Sk w={44} h={24} r={99} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB SKELETONS
════════════════════════════════════════════════════════════════ */

/* ── Tab: شخصية Agent ── */
function AgentTabSk() {
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {/* Section: معلومات Agent */}
      <SectionShell>
        <div className="flex flex-col gap-4">

          {/* name + domain */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldSk labelW={70} />
            <FieldSk labelW={90} />
          </div>

          {/* Mode */}
          <div className="flex flex-col gap-1.5">
            <Sk w={70} h={11} />
            <div className="grid grid-cols-2 gap-2">
              <Sk w="100%" h={36} r={10} />
              <Sk w="100%" h={36} r={10} className="opacity-65" />
            </div>
          </div>

          {/* Style + Lang */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Sk w={80} h={11} />
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <Sk key={i} w="100%" h={68} r={12} className={i === 0 ? "" : "opacity-65"} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Sk w={80} h={11} />
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <Sk key={i} w="100%" h={36} r={10} className={i === 0 ? "" : "opacity-65"} />
                ))}
              </div>
            </div>
          </div>

          <FieldSk labelW={170} />
          <FieldSk labelW={100} textarea />
        </div>
      </SectionShell>

      {/* Section: الرسائل التلقائية */}
      <SectionShell>
        <div className="flex flex-col gap-4">
          <FieldSk labelW={140} textarea />
          <FieldSk labelW={120} textarea />
          <FieldSk labelW={110} textarea />
        </div>
      </SectionShell>

      {/* Save button */}
      <Sk w="100%" h={42} r={10} className="bg-brand-600 opacity-55" />
    </div>
  )
}

/* ── Tab: ساعات العمل ── */
function WorkhoursTabSk() {
  return (
    <div className="max-w-lg">
      <SectionShell>
        <div className="flex flex-col gap-4">
          <ToggleSk labelW={110} subW={200} />
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/60">
            <FieldSk labelW={30} />
            <FieldSk labelW={30} />
          </div>
          <FieldSk labelW={150} textarea />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Sk key={i} w="100%" h={54} r={12} className={i === 0 ? "" : "opacity-65"} />
            ))}
          </div>
          <Sk w="100%" h={42} r={10} className="bg-brand-600 opacity-55" />
        </div>
      </SectionShell>
    </div>
  )
}

/* ── Tab: ردود الاعتراض ── */
function ObjectionsTabSk() {
  return (
    <SectionShell>
      <div className="flex flex-col gap-4">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Sk w="70%" h={11} />
          <Sk w={80} h={30} r={10} />
        </div>

        {/* Objection cards */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-secondary/50 p-3">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Sk w={24} h={24} r={8} />
                <Sk w={70} h={11} />
              </div>
              <Sk w={24} h={24} r={8} />
            </div>
            <div className="flex flex-col gap-2.5">
              <FieldSk labelW={120} />
              <FieldSk labelW={80} textarea />
            </div>
          </div>
        ))}

        <Sk w="100%" h={42} r={10} className="bg-brand-600 opacity-55" />
      </div>
    </SectionShell>
  )
}

/* ── Tab: واتساب ── */
function WhatsappTabSk() {
  return (
    <div className="max-w-lg">
      <SectionShell>
        <div className="flex flex-col gap-4">
          {/* Status card */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/50 bg-secondary/50">
            <Sk w={36} h={36} r={10} className="shrink-0" />
            <div className="flex-1 flex flex-col gap-1.25">
              <Sk w={120} h={12} />
              <Sk w={160} h={10} className="opacity-60" />
            </div>
            <Sk w={8} h={8} r={99} />
          </div>

          <Sk w="100%" h={11} />

          {/* Guide box */}
          <div className="p-3.5 rounded-2xl border border-border/50 bg-secondary/50 flex flex-col gap-2.5">
            <Sk w="70%" h={11} />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Sk w={20} h={20} r={4} className="shrink-0" />
                <Sk w="100%" h={10} />
              </div>
            ))}
          </div>

          <FieldSk labelW={170} />
          <FieldSk labelW={140} />

          {/* Webhook field with copy button */}
          <div className="flex flex-col gap-1.5">
            <Sk w={100} h={11} />
            <div className="flex gap-2">
              <Sk w="100%" h={38} r={10} />
              <Sk w={52} h={38} r={10} className="shrink-0" />
            </div>
          </div>

          {/* Verify token field with copy */}
          <div className="flex flex-col gap-1.5">
            <Sk w={120} h={11} />
            <div className="flex gap-2">
              <Sk w="100%" h={38} r={10} />
              <Sk w={52} h={38} r={10} className="shrink-0" />
            </div>
          </div>

          <Sk w="100%" h={42} r={10} className="bg-brand-600 opacity-55" />
        </div>
      </SectionShell>
    </div>
  )
}

/* ── Tab: الإشعارات ── */
function NotificationsTabSk() {
  const items = [
    { lw: '45%', sw: '65%' },
    { lw: '35%',  sw: '70%' },
    { lw: '50%', sw: '60%' },
    { lw: '40%', sw: '55%' },
    { lw: '45%', sw: '60%' },
  ]
  return (
    <div className="max-w-lg">
      <SectionShell>
        <div className="flex flex-col">
          {items.map((item, i) => (
            <div key={i} className={`py-4 ${i < items.length - 1 ? "border-b border-border/50" : ""}`}>
              <ToggleSk labelW={item.lw} subW={item.sw} />
            </div>
          ))}
        </div>
      </SectionShell>
    </div>
  )
}

/* ── Tab: الحساب ── */
function AccountTabSk() {
  return (
    <div className="max-w-lg flex flex-col gap-3">
      <SectionShell>
        <div className="flex flex-col gap-4">
          {/* Profile header */}
          <div className="flex items-center gap-3.5 pb-4.5 border-b border-border/50">
            <Sk w={56} h={56} r={12} className="shrink-0" />
            <div className="flex-1 flex flex-col gap-1.25">
              <Sk w={110} h={13} />
              <Sk w={160} h={11} className="opacity-65" />
              <Sk w={90}  h={10} className="opacity-45" />
            </div>
            <Sk w={56} h={30} r={10} className="shrink-0" />
          </div>

          {/* Info grid 2x2 */}
          <div className="grid grid-cols-2 gap-2.5">
            {[100, 90, 150, 90].map((w, i) => (
              <div key={i} className="p-3 rounded-2xl border border-border/50 bg-secondary/50 flex flex-col gap-1.5">
                <Sk w={60} h={9} className="opacity-60" />
                <Sk w={w} h={12} />
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      {/* Danger zone */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
          <Sk w={90} h={10} />
        </div>
        <div className="px-4 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex-1 flex flex-col gap-1.25">
            <Sk w={80} h={11} />
            <Sk w="100%" h={10} style={{ opacity: 0.6 }} />
          </div>
          <Sk w={80} h={30} r={10} className="shrink-0" />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN SKELETON COMPONENT
   استخدم activeTab لعرض السكلتون المناسب لكل تاب
════════════════════════════════════════════════════════════════ */
function SettingsSkeleton({ activeTab = "agent" }) {
  const { t } = useLanguage()
  const tabSkeletons = {
    agent:         <AgentTabSk />,
    workhours:     <WorkhoursTabSk />,
    objections:    <ObjectionsTabSk />,
    whatsapp:      <WhatsappTabSk />,
    notifications: <NotificationsTabSk />,
    account:       <AccountTabSk />,
  }

  return (
    <>
      <style>{shimmerStyle}</style>
      <style>{`
        :root {
          --sk-a: #e5e7eb;
          --sk-b: #f3f4f6;
        }
        .dark {
          --sk-a: rgba(30, 41, 59, 0.6);
          --sk-b: rgba(30, 41, 59, 0.3);
        }
      `}</style>

      <div className="flex flex-col gap-4 pb-8">

        {/* ── Header ── */}
        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600/10 border border-brand-600/15 flex items-center justify-center shrink-0">
              <Settings size={18} className="text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">{t('settings.title')}</h1>
              <p className="text-[12px] text-muted-foreground">{t('settings.subtitle')}</p>
            </div>
          </div>

          {/* Agent status pill */}
          <div className="flex items-center gap-2.5 bg-secondary/60 border border-border rounded-2xl px-3 py-2 shrink-0">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              "bg-border"
            )} />
            <span className="text-sm text-muted-foreground hidden sm:inline">Agent</span>
            <span className="text-sm font-semibold text-muted-foreground">
              {t('settings.agent_inactive')}
            </span>
            <button
              className={cn(
                "relative w-9 h-5 rounded-full transition-all duration-300 mr-0.5",
                "bg-border"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300",
                "right-5"
              )} />
            </button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-secondary/50 border border-border/60 rounded-2xl overflow-x-auto scrollbar-none">
          {[
            { w: '30%', active: activeTab === "agent" },
            { w: '25%',  active: activeTab === "workhours" },
            { w: '30%', active: activeTab === "objections" },
            { w: '20%',  active: activeTab === "whatsapp" },
            { w: '22%',  active: activeTab === "notifications" },
            { w: '20%',  active: activeTab === "account" },
          ].map((tab, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 whitespace-nowrap shrink-0 font-medium",
                tab.active
                  ? "bg-background text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-brand-300/60"
              )}
            >
              <Sk w={12} h={12} r={3} className={tab.active ? "" : "opacity-55"} />
              <span className="hidden sm:inline text-[12px]">{tab.w}</span>
              <span className="inline sm:hidden text-[11px]">{tab.w.split(" ")[0]}</span>
            </div>
          ))}
        </div>

        {/* ── Tab content ── */}
        {tabSkeletons[activeTab] ?? tabSkeletons.agent}
      </div>
    </>
  )
}

// ── Main Page ───────────────────────────────────────────────

export default function SettingsPage() {
  const { t, language: uiLang, isRTL } = useLanguage()
  const [activeTab, setActiveTab] = useState("agent")
  const [saving, setSaving] = useState(false)
  const [newObjection, setNewObjection] = useState(null)
  const [editingReplies, setEditingReplies] = useState({})
  const [localAgent, setLocalAgent] = useState({})
  const [user, setUser] = useState(null)
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountForm, setAccountForm] = useState({})
  const [accountLoading, setAccountLoading] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState({
    newOrder: true, dailyReport: true, highValueObjection: true,
    weeklyReport: false, agentDown: true,
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('notificationSettings')
      if (saved) setNotificationSettings(JSON.parse(saved))
    } catch {}
  }, [])

  const [workHoursEnabled, setWorkHoursEnabled] = useState(false)
  const [workStart, setWorkStart] = useState("09:00")
  const [workEnd, setWorkEnd] = useState("18:00")
  const [offlineMessage, setOfflineMessage] = useState("")
  const [replyDelayMode, setReplyDelayMode] = useState("instant")
  const [replyDelayMinSeconds, setReplyDelayMinSeconds] = useState(0)
  const [replyDelayMaxSeconds, setReplyDelayMaxSeconds] = useState(0)
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [orderConfirmMessage, setOrderConfirmMessage] = useState("")
  const [orderShipMessage, setOrderShipMessage] = useState("")
  const [orderDeliverMessage, setOrderDeliverMessage] = useState("")
  const [orderCancelledMessage, setOrderCancelledMessage] = useState("")
  const [trackingUrlTemplate, setTrackingUrlTemplate] = useState("")
  const [whatsappForm, setWhatsappForm] = useState({ whatsappPhoneId: "", whatsappToken: "" })
  const [showToken, setShowToken] = useState(false)
  const [testingWA, setTestingWA] = useState(false)
  const [savingWA, setSavingWA] = useState(false)
  const [products, setProducts] = useState([])
  const [productsLoaded, setProductsLoaded] = useState(false)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({ title: "", field: "", value: "", placeholder: "", hint: "", onSave: null })

  // Toast state
  const [toast, setToast] = useState(null)

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { agent, loading, fetchAgent, updateAgent, toggleActive,
    addObjectionReply, removeObjectionReply, updateObjectionReply } = useAgentStore()

  // Initialize editingReplies when objectionReplies changes
  useEffect(() => {
    if (agent?.objectionReplies?.length > 0) {
      const initial = {}
      agent.objectionReplies.forEach(item => {
        initial[item.id] = {
          trigger: item.trigger,
          reply: item.reply
        }
      })
      setEditingReplies(initial)
    }
  }, [agent?.objectionReplies])

  function showToast(message, type = "success") {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  function getWhatsAppTestErrorMessage(data) {
    const code = data?.code
    const fallback = data?.error ? `${t('settings.toast_wa_fail')}${data.error}` : t('settings.toast_wa_fail')

    if (code === "MISSING_CREDENTIALS") return t('settings.toast_enter_creds')
    if (code === "INVALID_TOKEN") return t('settings.toast_wa_invalid_token')
    if (code === "INVALID_PHONE_ID") return t('settings.toast_wa_invalid_phone_id')
    if (code === "META_API_ERROR") return data?.error ? `${t('settings.toast_wa_meta_error')} ${data.error}` : t('settings.toast_wa_meta_error')
    if (code === "SERVER_ERROR") return t('settings.toast_server_error')

    return fallback
  }

  useEffect(() => { fetchAgent(); fetchProducts(); fetchUser() }, [fetchAgent])

  async function fetchUser() {
    try {
      const token = getToken()
      if (!token) return
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }, credentials: 'same-origin'
      })
      const data = await response.json()
      if (data.data) {
        setUser(data.data)
        setAccountForm({ name: data.data.name || "", email: data.data.email || "", phone: data.data.phone || "" })
      }
    } catch (err) { console.error(err) }
  }

  async function handleSaveAccount() {
    try {
      setAccountLoading(true)
      const token = getToken()
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(accountForm)
      })
      const data = await response.json()
      if (data.data) { setUser(data.data); setEditingAccount(false); showToast(t('settings.toast_account_updated')) }
    } catch (err) { showToast(t('settings.toast_account_error'), "error") } finally { setAccountLoading(false) }
  }

  useEffect(() => {
    if (agent) {
      setLocalAgent({
        name: agent.name || "",
        domain: agent.domain || "",
        style: agent.style || "friendly",
        language: agent.language || "darija",
        instructions: agent.instructions || "",
        productInstructions: agent.productInstructions || "",
        selectedProductId: agent.selectedProductId || "",
      })
      setWorkHoursEnabled(agent.workHoursEnabled || false)
      setWorkStart(agent.workStart || "09:00")
      setWorkEnd(agent.workEnd || "18:00")
      setOfflineMessage(agent.offlineMessage || "")
      setReplyDelayMode(agent.replyDelayMode || "instant")
      setReplyDelayMinSeconds(clampReplyDelayInput(agent.replyDelayMinSeconds || 0))
      setReplyDelayMaxSeconds(clampReplyDelayInput(agent.replyDelayMaxSeconds || 0))
      setWelcomeMessage(agent.welcomeMessage || "")
      setOrderConfirmMessage(agent.orderConfirmMessage || "")
      setOrderShipMessage(agent.orderShipMessage || "")
      setOrderDeliverMessage(agent.orderDeliverMessage || "")
      setOrderCancelledMessage(agent.orderCancelledMessage || "")
      setTrackingUrlTemplate(agent.trackingUrlTemplate || "")
      setWhatsappForm({ whatsappPhoneId: agent.whatsappPhoneId || "", whatsappToken: agent.whatsappToken || "" })
    }
  }, [agent])

  useEffect(() => {
    if (!productsLoaded || !localAgent?.selectedProductId) return
    const selectedProductStillActive = products.some((product) => product.id === localAgent.selectedProductId)
    if (!selectedProductStillActive) {
      setLocalAgent((prev) => ({ ...prev, selectedProductId: null }))
    }
  }, [productsLoaded, products, localAgent?.selectedProductId])

  async function handleSaveAgent() {
    try {
      setSaving(true)
      const success = await updateAgent({
        ...localAgent,
        workHoursEnabled, workStart, workEnd, offlineMessage,
        replyDelayMode,
        replyDelayMinSeconds: clampReplyDelayInput(replyDelayMinSeconds),
        replyDelayMaxSeconds: clampReplyDelayInput(replyDelayMaxSeconds),
        welcomeMessage: welcomeMessage?.trim() || null,
        orderConfirmMessage, orderShipMessage, orderDeliverMessage, orderCancelledMessage,
        trackingUrlTemplate,
      })
      if (success === false) throw new Error("update failed")
      showToast(t('settings.toast_saved'))
    } catch (err) {
      console.error("Save agent failed:", err)
      showToast(t('settings.toast_save_failed') || "فشل الحفظ — حاول مرة أخرى", "error")
    } finally { setSaving(false) }
  }

  async function fetchProducts() {
    try {
      const r = await productsAPI.getAll({ active: true })
      setProducts(r.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setProductsLoaded(true)
    }
  }

  async function handleAddObjection() {
    if (!newObjection?.trigger?.trim() || !newObjection?.reply?.trim()) { showToast(t('settings.toast_fill_fields'), "error"); return }
    const success = await addObjectionReply({ trigger: newObjection.trigger.trim(), reply: newObjection.reply.trim() })
    if (success) { setNewObjection(null); showToast(t('settings.toast_reply_added')) }
  }

  async function handleDeleteAccount() {
    try {
      setDeleteLoading(true)
      const token = getToken()
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        localStorage.removeItem('token')
        window.location.href = '/'
      } else {
        showToast(t('settings.toast_delete_failed'), "error")
      }
    } catch (err) {
      console.error(err)
      showToast(t('settings.toast_conn_error'), "error")
    } finally {
      setDeleteLoading(false)
      setShowDeleteDialog(false)
    }
  }

  async function handleTestWhatsAppConnection() {
    const phoneId = whatsappForm.whatsappPhoneId?.trim()
    const waToken = whatsappForm.whatsappToken?.trim()
    if (!phoneId || !waToken) {
      showToast(t('settings.toast_enter_creds'), "error")
      return
    }
    setTestingWA(true)
    try {
      const token = getToken()
      if (!token) {
        showToast(t('settings.toast_session_expired'), "error")
        return
      }
      const response = await fetch('/api/whatsapp/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phoneId, token: waToken })
      })
      const data = await response.json()
      if (data.success) {
        showToast(t('settings.toast_wa_ok'))
      } else {
        showToast(getWhatsAppTestErrorMessage(data), "error")
      }
    } catch (err) {
      console.error("WA test failed:", err)
      showToast(t('settings.toast_server_error'), "error")
    } finally {
      setTestingWA(false)
    }
  }

  function handleSaveNotifications() {
    try { localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings)) } catch {}
    showToast(t('settings.toast_notif_saved'))
  }

  const name = localAgent.name || ""
  const domain = localAgent.domain || ""
  const style = localAgent.style || "friendly"
  const language = localAgent.language || "darija"
  const isActive = agent?.isActive || false
  const instructions = localAgent.instructions || ""
  const productInstructions = localAgent.productInstructions || ""
  const objectionReplies = agent?.objectionReplies || []
  const delayText = uiLang === "fr" ? replyDelayCopy.fr : replyDelayCopy.ar

  const orderPh = uiLang === "fr" ? {
    confirm: "Bonjour {name} !\nVotre commande ({product}) a été confirmée avec succès.",
    ship:    "Votre commande ({product}) est en chemin !\nBonjour {name} !",
    deliver: "Bonjour {name} ! Nous espérons que {product} vous satisfait.",
    cancel:  "Bonjour {name}, malheureusement votre commande ({product}) a été annulée ❌...",
  } : {
    confirm: "مرحبا {name}!\nأكدنا ليك الطلبية ديالك ({product}). المجموع: {amount} DH",
    ship:    "مرحبا {name}!\nطلبية ({product}) خرجات للتوصيل. رقم التتبع: {tracking}",
    deliver: "مرحبا {name}!\nتوصلتي بطلبية ({product}). نتمنى تكون عجباتك",
    cancel:  "مرحبا {name}، لغينا ليك الطلبية ديال ({product}) ❌",
  }

  if (loading) return <SettingsSkeleton activeTab={activeTab} />

  const tabs = [
    { key: "agent",         label: t('settings.tab_agent'),         icon: Bot },
    { key: "workhours",     label: t('settings.tab_workhours'),     icon: Clock },
    { key: "objections",    label: t('settings.tab_objections'),    icon: MessageCircle },
    { key: "whatsapp",      label: t('settings.tab_whatsapp'),      icon: Phone },
    { key: "notifications", label: t('settings.tab_notifications'), icon: Bell },
    { key: "account",       label: t('settings.tab_account'),       icon: Settings },
  ]

  const styleOptions = [
    { key: "friendly",   label: t('settings.friendly_short'),   icon: Heart },
    { key: "formal",     label: t('settings.formal_short'),     icon: Crown },
    { key: "persuasive", label: t('settings.persuasive_short'), icon: Flame },
  ]
  const langOptions = [
    { key: "auto", label: t('settings.lang_auto') || "تلقائي (يتبع الزبون)" },
    { key: "darija", label: t('settings.lang_darija') },
    { key: "arabic", label: t('settings.lang_arabic') },
    { key: "french", label: t('settings.lang_french') },
  ]

  const productAgentHint = isRTL
    ? "اختياري: اختار منتج رئيسي نشيط، أو خليه تلقائي باش Agent يبيع جميع المنتجات النشيطة ويرسل الصور الصحيحة حسب طلب الزبون."
    : "Optionnel : choisissez un produit principal actif, ou laissez auto pour vendre tous les produits actifs et envoyer les bonnes images selon la demande du client."
  const allProductsAutoLabel = isRTL
    ? "جميع المنتجات النشيطة (تلقائي)"
    : "Tous les produits actifs (auto)"

  const isWAConnected = !!(whatsappForm.whatsappPhoneId && whatsappForm.whatsappToken)

  // Canonical webhook URL for Meta Developers.
  const APP_URL = getPublicAppUrl()
  const webhookUrl = getWhatsAppWebhookUrl(APP_URL)

  return (
    <div className="flex flex-col gap-3 sm:gap-5 pb-8">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-600/10 border border-brand-600/15 flex items-center justify-center shrink-0">
            <Settings size={18} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">{t('settings.title')}</h1>
            <p className="text-[12px] text-muted-foreground">{t('settings.subtitle')}</p>
          </div>
        </div>

        {/* Agent status pill */}
        <div className="flex items-center gap-2.5 bg-secondary/60 border border-border rounded-2xl px-3 py-2 shrink-0">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full transition-all",
            isActive ? "bg-brand-600 shadow-sm shadow-brand-600/60 animate-pulse" : "bg-border"
          )} />
          <span className="text-sm text-muted-foreground hidden sm:inline">Agent</span>
          <span className={cn("text-sm font-semibold", isActive ? "text-brand-600" : "text-muted-foreground")}>
            {isActive ? t('settings.agent_active') : t('settings.agent_inactive')}
          </span>
          <button
            onClick={toggleActive}
            className={cn(
              "relative w-9 h-5 rounded-full transition-all duration-300 mr-0.5",
              isActive ? "bg-brand-600 shadow-md shadow-brand-600/30" : "bg-border"
            )}
          >
            <span className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300",
              isActive ? "right-0.5" : "right-5"
            )} />
          </button>
        </div>
      </div>

      {/* Manual Mode Banner */}
      {!isActive && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-brand-600/15">
          <div className="w-2 h-2 rounded-full bg-brand-600/60 animate-pulse shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {t('settings.manual_mode_title') || 'وضع التحدث المباشر مفعّل'}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {t('settings.manual_mode_sub') || 'الـ AI متوقف — ردودك تصل مباشرة للزبائن عبر واتساب'}
            </p>
          </div>
          <MessageCircle size={16} className="text-brand-600/50 shrink-0" />
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-secondary/50 border border-border/60 rounded-2xl overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
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
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-brand-300/60"
              )}
            >
              <Icon size={14} className={active ? "text-brand-600" : ""} />
              <span className="hidden sm:inline text-[12px]">{tab.label}</span>
              <span className="inline sm:hidden text-[11px]">{tab.label.split(" ")[0]}</span>
            </button>
          )
        })}
      </div>

      {/* ════ Tab: شخصية Agent ════════════════════════ */}
      {activeTab === "agent" && (
        <div className="flex flex-col gap-4 max-w-2xl">

          <Section title={t('settings.agent_info')}>
            <div className="flex flex-col gap-4">

              {/* اسم + مجال */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t('settings.agent_name')}>
                  <input type="text" value={name}
                    onChange={(e) => setLocalAgent({ ...localAgent, name: e.target.value })}
                    placeholder={t('settings.agent_name_placeholder')} className={inputCls} />
                </Field>

                <Field label={t('settings.agent_domain')}>
                  <select value={domain}
                    onChange={(e) => setLocalAgent({ ...localAgent, domain: e.target.value })}
                    className={inputCls}>
                    {[
                      t('settings.domain_clothing'),
                      t('settings.domain_electronics'),
                      t('settings.domain_perfumes'),
                      t('settings.domain_food'),
                      t('settings.domain_jewelry'),
                      t('settings.domain_furniture'),
                      t('settings.domain_other'),
                    ].map(d => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </Field>
              </div>
              {/* أسلوب + لغة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t('settings.style_label')}>
                  <div className="grid grid-cols-3 gap-2">
                    {styleOptions.map((s, idx) => {
                      const StyleIcon = s.icon
                      return (
                        <button key={s.key}
                          onClick={() => setLocalAgent({ ...localAgent, style: s.key })}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200",
                            "hover:scale-[1.02] hover:-translate-y-0.5",
                            style === s.key
                              ? "bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/25"
                              : "border-border bg-secondary/30 hover:border-brand-300/60 hover:shadow-md"
                          )}
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <StyleIcon size={18} className={style === s.key ? "text-white" : "text-brand-600"} />
                          <span className="text-[11px] font-semibold">{s.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </Field>

                <Field label={t('settings.lang_label')}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {langOptions.map((l) => (
                      <button key={l.key}
                        onClick={() => setLocalAgent({ ...localAgent, language: l.key })}
                        className={cn(
                          "py-2.5 rounded-xl text-sm border transition-all duration-200 font-medium",
                          language === l.key
                            ? "bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/25"
                            : "border-border text-muted-foreground hover:bg-secondary hover:border-brand-300/60"
                        )}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              {/* المنتج المختار */}
              <Field label={t('settings.product_agent')} icon={Package}
                hint={productAgentHint}>
                <select value={localAgent?.selectedProductId || ""}
                  onChange={(e) => setLocalAgent({ ...localAgent, selectedProductId: e.target.value || null })}
                  className={inputCls}>
                  <option value="">{allProductsAutoLabel}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} - {p.price} {t('settings.currency')}</option>
                  ))}
                </select>
              </Field>

              {/* تعليمات عامة للوكيل */}
              <Field label={t('settings.instructions_label')}>
                <div className="relative">
                  <textarea value={instructions} rows={4}
                    onChange={(e) => setLocalAgent({ ...localAgent, instructions: e.target.value })}
                    placeholder={t('settings.instructions_hint')}
                    className={cn(textareaCls, "pr-10")} />
                  <button
                    onClick={() => { setModalConfig({
                      title: t('settings.instructions_label'),
                      value: instructions,
                      placeholder: t('settings.instructions_hint'),
                      hint: t('settings.instructions_hint'),
                      onSave: (val) => setLocalAgent({ ...localAgent, instructions: val })
                    }); setModalOpen(true); }}
                    className={cn("absolute top-3 text-muted-foreground hover:text-brand-600 transition-colors", isRTL ? "left-3" : "right-3")}
                    title={t('settings.expand')}
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </Field>

              {/* تعليمات المنتج */}
              <Field label={t('settings.product_instructions_label') || t('settings.instructions_label')}>
                <div className="relative">
                  <textarea value={productInstructions} rows={4}
                    onChange={(e) => setLocalAgent({ ...localAgent, productInstructions: e.target.value })}
                    placeholder={t('settings.product_instructions_hint') || t('settings.instructions_hint')}
                    className={cn(textareaCls, "pr-10")} />
                  <button
                    onClick={() => { setModalConfig({
                      title: t('settings.product_instructions_label') || t('settings.instructions_label'),
                      value: productInstructions,
                      placeholder: t('settings.product_instructions_hint') || t('settings.instructions_hint'),
                      hint: t('settings.product_instructions_hint') || t('settings.instructions_hint'),
                      onSave: (val) => setLocalAgent({ ...localAgent, productInstructions: val })
                    }); setModalOpen(true); }}
                    className={cn("absolute top-3 text-muted-foreground hover:text-brand-600 transition-colors", isRTL ? "left-3" : "right-3")}
                    title={t('settings.expand')}
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </Field>

              {/* رسالة الترحيب */}
              <Field label={t('settings.welcome_msg') || "رسالة الترحيب (اختياري)"} icon={MessageCircle}
                hint={t('settings.welcome_msg_hint') || "اختياري: إذا تركته فارغاً، AI يرحب تلقائياً بأسلوب طبيعي حسب لغة الزبون. استعمل {name} لاسم الزبون."}>
                <div className="relative">
                  <textarea value={welcomeMessage} rows={3}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder={t('settings.welcome_msg_placeholder') || "فارغ = AI يرحب تلقائياً. مثال: مرحبا {name} ✨ أهلا بيك في [اسم متجرك]!"}
                    className={cn(textareaCls, "pr-10")} />
                  <button
                    onClick={() => { setModalConfig({
                      title: t('settings.welcome_msg') || "رسالة الترحيب (اختياري)",
                      value: welcomeMessage,
                      placeholder: t('settings.welcome_msg_placeholder') || "فارغ = AI يرحب تلقائياً. مثال: مرحبا {name} ✨ أهلا بيك في [اسم متجرك]!",
                      hint: t('settings.welcome_msg_hint') || "اختياري: إذا تركته فارغاً، AI يرحب تلقائياً بأسلوب طبيعي حسب لغة الزبون.",
                      onSave: (val) => setWelcomeMessage(val)
                    }); setModalOpen(true); }}
                    className={cn("absolute top-3 text-muted-foreground hover:text-brand-600 transition-colors", isRTL ? "left-3" : "right-3")}
                    title={t('settings.expand')}
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </Field>

            </div>
          </Section>

          {/* الرسائل التلقائية للطلبيات */}
          <Section title={t('settings.order_messages')}>
              <div className="flex flex-col gap-4">
                {/* رابط التتبع من شركة التوصيل */}
                <Field label={t('settings.tracking_url_template') || "رابط التتبع من شركة التوصيل"} icon={Truck}
                  hint={t('settings.tracking_url_hint') || "مثال: https://tracking.company.com/?code={tracking} - استخدم {tracking} لرقم التتبع"}>
                  <input
                    type="url"
                    value={trackingUrlTemplate}
                    onChange={(e) => setTrackingUrlTemplate(e.target.value)}
                    placeholder="https://tracking.company.com/?code={tracking}"
                    className={inputCls}
                  />
                </Field>

                <Field label={t('settings.order_confirm_msg')} icon={CalendarCheck}
                  hint={t('settings.order_confirm_hint')}>
                  <div className="relative">
                    <textarea value={orderConfirmMessage} rows={3}
                      onChange={(e) => setOrderConfirmMessage(e.target.value)}
                      placeholder={orderPh.confirm}
                      className={cn(textareaCls, "pr-10")} />
                    <button
                      onClick={() => { setModalConfig({
                        title: t('settings.order_confirm_msg'),
                        value: orderConfirmMessage,
                        placeholder: orderPh.confirm,
                        hint: t('settings.order_confirm_hint'),
                        onSave: (val) => setOrderConfirmMessage(val)
                      }); setModalOpen(true); }}
                      className={cn("absolute top-3 text-muted-foreground hover:text-brand-600 transition-colors", isRTL ? "left-3" : "right-3")}
                      title={t('settings.expand')}
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </Field>

                <Field label={t('settings.order_ship_msg')} icon={Bell}
                  hint={(t('settings.order_ship_hint') || "") + " — المتغيرات: {name}, {product}, {amount}, {tracking}, {trackingUrl}"}>
                  <div className="relative">
                    <textarea value={orderShipMessage} rows={3}
                      onChange={(e) => setOrderShipMessage(e.target.value)}
                      placeholder={orderPh.ship}
                      className={cn(textareaCls, "pr-10")} />
                    <button
                      onClick={() => { setModalConfig({
                        title: t('settings.order_ship_msg'),
                        value: orderShipMessage,
                        placeholder: orderPh.ship,
                        hint: (t('settings.order_ship_hint') || "") + " — المتغيرات: {name}, {product}, {amount}, {tracking}, {trackingUrl}",
                        onSave: (val) => setOrderShipMessage(val)
                      }); setModalOpen(true); }}
                      className={cn("absolute top-3 text-muted-foreground hover:text-brand-600 transition-colors", isRTL ? "left-3" : "right-3")}
                      title={t('settings.expand')}
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </Field>

                <Field label={t('settings.order_deliver_msg')} icon={Trash2}
                  hint={t('settings.order_deliver_hint')}>
                  <div className="relative">
                    <textarea value={orderDeliverMessage} rows={3}
                      onChange={(e) => setOrderDeliverMessage(e.target.value)}
                      placeholder={orderPh.deliver}
                      className={cn(textareaCls, "pr-10")} />
                    <button
                      onClick={() => { setModalConfig({
                        title: t('settings.order_deliver_msg'),
                        value: orderDeliverMessage,
                        placeholder: orderPh.deliver,
                        hint: t('settings.order_deliver_hint'),
                        onSave: (val) => setOrderDeliverMessage(val)
                      }); setModalOpen(true); }}
                      className={cn("absolute top-3 text-muted-foreground hover:text-brand-600 transition-colors", isRTL ? "left-3" : "right-3")}
                      title={t('settings.expand')}
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </Field>

                <Field label={t('settings.order_cancelled_msg')} icon={XCircle}
                  hint={t('settings.order_cancelled_hint')}>
                  <div className="relative">
                    <textarea value={orderCancelledMessage} rows={3}
                      onChange={(e) => setOrderCancelledMessage(e.target.value)}
                      placeholder={orderPh.cancel}
                      className={cn(textareaCls, "pr-10")} />
                    <button
                      onClick={() => { setModalConfig({
                        title: t('settings.order_cancelled_msg'),
                        value: orderCancelledMessage,
                        placeholder: orderPh.cancel,
                        hint: t('settings.order_cancelled_hint'),
                        onSave: (val) => setOrderCancelledMessage(val)
                      }); setModalOpen(true); }}
                      className={cn("absolute top-3 text-muted-foreground hover:text-brand-600 transition-colors", isRTL ? "left-3" : "right-3")}
                      title={t('settings.expand')}
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </Field>
              </div>
          </Section>

          <button onClick={handleSaveAgent} disabled={saving}
            className="w-full flex items-center gap-2 justify-center bg-brand-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-brand-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-600/25">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? t('settings.saving') : t('settings.save_changes')}
          </button>

        </div>
      )}
      {/* ════ Tab: ساعات العمل ════════════════════════ */}
      {activeTab === "workhours" && (
        <div className="flex flex-col gap-3 max-w-lg">
          <Section title={t('settings.work_hours')}>
            <div className="flex flex-col gap-5">
              <Toggle on={workHoursEnabled} onToggle={() => setWorkHoursEnabled(!workHoursEnabled)}
                label={t('settings.enable_workhours')}
                sub={t('settings.workhours_sub')} />

              {workHoursEnabled && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/60">
                  <Field label={t('settings.work_start')}>
                    <input type="time" value={workStart}
                      onChange={(e) => setWorkStart(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label={t('settings.work_end')}>
                    <input type="time" value={workEnd}
                      onChange={(e) => setWorkEnd(e.target.value)} className={inputCls} />
                  </Field>
                </div>
              )}

              <Field label={t('settings.offline_msg')} icon={MessageCircle}
                hint={t('settings.offline_msg_hint')}>
                <textarea value={offlineMessage} rows={3}
                  onChange={(e) => setOfflineMessage(e.target.value)}
                  placeholder={t('settings.offline_msg')}
                  className={textareaCls} />
              </Field>

              <Field label={delayText.title} icon={Clock} hint={delayText.hint}>
                <div className="grid grid-cols-2 gap-2">
                  {replyDelayOptions.map((option) => {
                    const active = replyDelayMode === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setReplyDelayMode(option.value)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-start transition-all",
                          active
                            ? "border-brand-600 bg-brand-600/10 text-brand-700 dark:text-brand-300"
                            : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-brand-600/30"
                        )}
                      >
                        <span className="block text-sm font-semibold">{delayText[option.value]}</span>
                        <span className="block text-[11px] mt-0.5">{option.seconds}</span>
                      </button>
                    )
                  })}
                </div>

                {replyDelayMode === "custom" && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[12px] font-medium text-muted-foreground">{delayText.min}</span>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="1"
                          value={replyDelayMinSeconds}
                          onChange={(e) => {
                            const nextMin = clampReplyDelayInput(e.target.value)
                            setReplyDelayMinSeconds(nextMin)
                            setReplyDelayMaxSeconds((prev) => Math.max(nextMin, clampReplyDelayInput(prev)))
                          }}
                          className={cn(inputCls, "pr-16")}
                        />
                        <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[11px] text-muted-foreground">
                          {delayText.seconds}
                        </span>
                      </div>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[12px] font-medium text-muted-foreground">{delayText.max}</span>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="1"
                          value={replyDelayMaxSeconds}
                          onChange={(e) => {
                            const nextMax = clampReplyDelayInput(e.target.value)
                            setReplyDelayMaxSeconds(Math.max(replyDelayMinSeconds, nextMax))
                          }}
                          className={cn(inputCls, "pr-16")}
                        />
                        <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[11px] text-muted-foreground">
                          {delayText.seconds}
                        </span>
                      </div>
                    </label>
                    <p className="col-span-2 text-[12px] text-muted-foreground">
                      {delayText.customHint}
                    </p>
                  </div>
                )}
              </Field>

              <button onClick={handleSaveAgent} disabled={saving}
                className="w-full flex items-center gap-2 justify-center bg-brand-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-brand-600/25">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? t('settings.saving') : t('settings.save_settings')}
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ════ Tab: ردود الاعتراض ══════════════════════ */}
      {activeTab === "objections" && (
        <div className="flex flex-col gap-3">
          <Section title={t('settings.objection_auto')}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{t('settings.objection_desc')}</p>
                <button onClick={() => setNewObjection({ trigger: "", reply: "" })} disabled={newObjection !== null}
                  className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-300 font-semibold hover:text-brand-700 dark:hover:text-brand-200 disabled:opacity-40 transition-colors bg-brand-600/8 hover:bg-brand-600/15 px-3 py-1.5 rounded-xl">
                  <Plus size={14} /> {t('settings.add_objection')}
                </button>
              </div>

              {newObjection && (
                <div className="bg-white border border-brand-600/20 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-brand-600">{t('settings.new_reply')}</span>
                    <button onClick={() => setNewObjection(null)}
                      className="w-6 h-6 rounded-lg bg-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Field label={t('settings.when_says')}>
                      <input type="text" value={newObjection.trigger}
                        onChange={(e) => setNewObjection({ ...newObjection, trigger: e.target.value })}
                        placeholder={t('settings.when_says')} className={inputCls} />
                    </Field>
                    <Field label={t('settings.agent_says')}>
                      <textarea value={newObjection.reply} rows={2}
                        onChange={(e) => setNewObjection({ ...newObjection, reply: e.target.value })}
                        placeholder={t('settings.agent_says')} className={textareaCls} />
                    </Field>
                    <button onClick={handleAddObjection}
                      className="flex items-center gap-1.5 justify-center bg-brand-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all shadow-sm shadow-brand-600/20">
                      <Save size={14} /> {t('settings.save_reply')}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {objectionReplies.length === 0 && !newObjection && (
                  <div className="py-10 text-center border border-dashed border-border rounded-2xl">
                    <MessageCircle size={24} className="text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{t('settings.no_replies')}</p>
                  </div>
                )}
                {objectionReplies.map((item, index) => (
                  <div key={item.id} className="bg-secondary/40 border border-border rounded-2xl p-3">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-brand-600/10 flex items-center justify-center text-[12px] font-bold text-brand-600">{index + 1}</span>
                        <span className="text-sm font-medium text-foreground">{t('settings.auto_reply')}</span>
                      </div>
                      <button onClick={() => removeObjectionReply(item.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/5 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Field label={t('settings.when_says')}>
                        <input type="text"
                          value={editingReplies[item.id]?.trigger || ""}
                          onChange={(e) => setEditingReplies(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], trigger: e.target.value }
                          }))}
                          className={inputCls} />
                      </Field>
                      <Field label={t('settings.agent_says')}>
                        <textarea
                          value={editingReplies[item.id]?.reply || ""}
                          onChange={(e) => setEditingReplies(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], reply: e.target.value }
                          }))}
                          rows={2} className={textareaCls} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>

              {objectionReplies.length > 0 && (
                <button onClick={async () => {
                  const saves = objectionReplies.map(item => {
                    const edited = editingReplies[item.id]
                    if (edited) {
                      return updateObjectionReply(item.id, {
                        trigger: edited.trigger,
                        reply: edited.reply
                      })
                    }
                    return Promise.resolve()
                  })
                  await Promise.all(saves)
                  showToast(t('settings.toast_replies_saved'))
                }} className="w-full flex items-center gap-2 justify-center bg-brand-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all shadow-md shadow-brand-600/25">
                  <Save size={16} /> {t('settings.save_replies')}
                </button>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ════ Tab: واتساب ════════════════════════════ */}
      {activeTab === "whatsapp" && (
        <div className="flex flex-col gap-3 max-w-lg">
          <Section title={t('settings.wa_connect')}>
            <div className="flex flex-col gap-4">

              {/* حالة الاتصال */}
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-xl border transition-all",
                isWAConnected ? "bg-white border-brand-600/20" : "bg-secondary/50 border-border"
              )}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                  <Phone size={16} className={isWAConnected ? "text-brand-600" : "text-muted-foreground"} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {isWAConnected ? t('settings.wa_connected') : t('settings.wa_not_connected')}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {isWAConnected ? t('settings.wa_ok') : t('settings.wa_not_ok')}
                  </p>
                </div>
                <div className={cn("w-2 h-2 rounded-full shrink-0",
                  isWAConnected ? "bg-brand-600 animate-pulse shadow-sm shadow-brand-600/60" : "bg-border")} />
              </div>

              <p className="text-[12px] text-muted-foreground leading-relaxed">
                {t('settings.wa_intro')}
              </p>

              {/* ════ دليل الإعدادات ════════════════════════ */}
              <div className="p-4 bg-white border border-brand-600/15 rounded-xl">
                <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600" /> {t('settings.wa_guide')}
                </p>
                <div className="flex flex-col gap-2">
                  <a href="https://developers.facebook.com/apps/"
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[12px] text-brand-600 hover:text-brand-800 hover:underline transition-colors">
                    <span className="w-5 h-5 rounded bg-brand-600/10 flex items-center justify-center text-[12px] font-bold">1</span>
                    <span>{t('settings.wa_step1')}</span>
                    <span className="text-[11px] opacity-60">{t('settings.wa_new_win')}</span>
                  </a>
                  <a href="https://business.facebook.com/settings/system-users"
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[12px] text-brand-600 hover:text-brand-800 hover:underline transition-colors">
                    <span className="w-5 h-5 rounded bg-brand-600/10 flex items-center justify-center text-[12px] font-bold">2</span>
                    <span>{t('settings.wa_step2')}</span>
                    <span className="text-[11px] opacity-60">(System User)</span>
                  </a>
                  <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks"
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[12px] text-brand-600 hover:text-brand-800 hover:underline transition-colors">
                    <span className="w-5 h-5 rounded bg-brand-600/10 flex items-center justify-center text-[12px] font-bold">3</span>
                    <span>{t('settings.wa_step3')}</span>
                    <span className="text-[11px] opacity-60">{t('settings.wa_last_step')}</span>
                  </a>
                </div>
              </div>

              <Field label={t('settings.phone_id')}>
                <input type="text" value={whatsappForm.whatsappPhoneId}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, whatsappPhoneId: e.target.value })}
                  placeholder="ex: 819683327841970" className={inputCls} />
              </Field>

              <Field label={t('settings.token')}>
                <div className="relative">
                  <input type={showToken ? "text" : "password"}
                    value={whatsappForm.whatsappToken}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, whatsappToken: e.target.value })}
                    placeholder="EAASY1Mu..."
                    className={cn(inputCls, "pr-3 pl-10")} />
                  <button type="button" onClick={() => setShowToken(!showToken)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>

              <Field label={t('settings.webhook_url')} hint={t('settings.webhook_hint')}>
                <div className="flex gap-2">
                  <input readOnly value={webhookUrl}
                    className={cn(inputCls, "flex-1 text-[11px] text-muted-foreground font-mono cursor-text")} />
                  <button onClick={() => {
                    navigator.clipboard.writeText(webhookUrl)
                    showToast(t('settings.copied'))
                  }} className="shrink-0 px-3 py-2 bg-secondary border border-border rounded-xl text-sm font-medium hover:bg-secondary/80 hover:border-brand-300/60 transition-all">
                    {t('settings.copy')}
                  </button>
                </div>
              </Field>

              {/* Hint about webhook hosting — shows if app URL looks like a local/dev env */}
              {(!APP_URL || APP_URL.includes("localhost") || APP_URL.includes("127.0.0.1")) && (
                <div className="p-3 bg-white border border-brand-600/15 rounded-xl">
                  <p className="text-[11px] text-muted-foreground">
                    ℹ️ {t('settings.wa_env_hint')}
                  </p>
                </div>
              )}

              <Field label={t('settings.verify_token')} hint={t('settings.verify_hint')}>
                <div className="flex gap-2">
                  <input readOnly value={agent?.verifyToken || t('settings.wa_loading')}
                    className={cn(inputCls, "flex-1 text-[11px] text-muted-foreground font-mono cursor-text")} />
                  <button onClick={() => {
                    navigator.clipboard.writeText(agent?.verifyToken)
                    showToast(t('settings.copied'))
                  }} disabled={!agent?.verifyToken}
                  className="shrink-0 px-3 py-2 bg-secondary border border-border rounded-xl text-sm font-medium hover:bg-secondary/80 hover:border-brand-300/60 transition-all disabled:opacity-50">
                    {t('settings.copy')}
                  </button>
                </div>
              </Field>

              <button
                disabled={savingWA}
                onClick={async () => {
                  setSavingWA(true)
                  try {
                    const success = await updateAgent({
                      whatsappPhoneId: whatsappForm.whatsappPhoneId?.trim(),
                      whatsappToken: whatsappForm.whatsappToken?.trim(),
                    })
                    if (success === false) throw new Error("update failed")
                    showToast(t('settings.toast_wa_saved'))
                  } catch (err) {
                    console.error("Save WhatsApp failed:", err)
                    showToast(t('settings.toast_save_failed') || "فشل الحفظ", "error")
                  } finally {
                    setSavingWA(false)
                  }
                }}
                className="w-full flex items-center gap-2 justify-center bg-brand-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all shadow-md shadow-brand-600/25 disabled:opacity-50">
                {savingWA ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {savingWA ? t('settings.saving') : t('settings.save_whatsapp')}
              </button>

              <button onClick={handleTestWhatsAppConnection} disabled={testingWA}
                className="w-full flex items-center gap-2 justify-center bg-secondary border border-border text-foreground py-3.5 rounded-xl text-sm font-semibold hover:bg-secondary/80 hover:border-brand-300/60 transition-all disabled:opacity-50">
                {testingWA ? <Loader2 size={15} className="animate-spin" /> : <Phone size={15} />}
                {testingWA ? t('settings.testing') || "جاري الاختبار..." : t('settings.test_whatsapp')}
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ════ Tab: الإشعارات ══════════════════════════ */}
      {activeTab === "notifications" && (
        <div className="max-w-lg">
          <Section title={t('settings.notifications_title')}>
            <div className="flex flex-col divide-y divide-border/50">
              {[
                { key: "newOrder",           title: t('settings.notif_new_order'),   sub: t('settings.notif_new_order_sub') },
                { key: "dailyReport",        title: t('settings.notif_daily'),       sub: t('settings.notif_daily_sub') },
                { key: "highValueObjection", title: t('settings.notif_objection'),   sub: t('settings.notif_objection_sub') },
                { key: "weeklyReport",       title: t('settings.notif_weekly'),      sub: t('settings.notif_weekly_sub') },
                { key: "agentDown",          title: t('settings.notif_agent_down'),  sub: t('settings.notif_agent_down_sub') },
              ].map((item) => (
                <div key={item.key} className="py-4 first:pt-0 last:pb-0">
                  <Toggle
                    on={notificationSettings[item.key]}
                    onToggle={() => setNotificationSettings(p => ({ ...p, [item.key]: !p[item.key] }))}
                    label={item.title}
                    sub={item.sub}
                  />
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-border/60">
              <button onClick={handleSaveNotifications}
                className="w-full flex items-center gap-2 justify-center bg-brand-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all shadow-md shadow-brand-600/25">
                <Save size={16} />
                {t('settings.save_settings')}
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ════ Tab: الحساب ════════════════════════════ */}
      {activeTab === "account" && (
        <div className="flex flex-col gap-3 max-w-lg">

          {editingAccount ? (
            <Section title={t('settings.edit_account_title')}>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: t('settings.full_name'),  key: "name",  type: "text" },
                    { label: t('settings.email'),      key: "email", type: "email" },
                    { label: t('settings.phone'),      key: "phone", type: "tel" },
                  ].map(({ label, key, type }) => (
                    <Field key={key} label={label}>
                      <input type={type} value={accountForm[key] || ""}
                        onChange={(e) => setAccountForm({ ...accountForm, [key]: e.target.value })}
                        className={inputCls} />
                    </Field>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border/60">
                  <button onClick={() => setEditingAccount(false)}
                    className="w-full sm:w-auto sm:mr-auto px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                    {t('common.cancel')}
                  </button>
                  <button onClick={handleSaveAccount} disabled={accountLoading}
                    className="w-full sm:w-auto px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/20">
                    {accountLoading && <Loader2 size={14} className="animate-spin" />}
                    {t('settings.save_changes')}
                  </button>
                </div>
              </div>
            </Section>
          ) : (
            <Section title={t('settings.account_title')}>
              {/* Profile header */}
              <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border/60">
                <div className="w-14 h-14 rounded-2xl bg-brand-600/10 border border-brand-600/15 flex items-center justify-center text-xl font-bold text-brand-600 shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "؟"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground truncate">{user?.name || "-"}</p>
                  <p className="text-sm text-muted-foreground truncate">{user?.email || "-"}</p>
                  <p className="text-[12px] text-muted-foreground/70 mt-0.5">{user?.phone || "-"}</p>
                </div>
                <button onClick={() => setEditingAccount(true)}
                  className="shrink-0 text-sm border border-border px-3 py-1.5 rounded-xl hover:bg-secondary hover:border-brand-300/60 transition-all font-medium">
                  {t('settings.edit_btn')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: t('settings.full_name'),  value: user?.name || "-" },
                  { label: t('settings.email'),      value: user?.email || "-" },
                  { label: t('settings.phone'),      value: user?.phone || "-" },
                  { label: t('settings.join_date'),  value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : "-" },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-1 p-3.5 bg-secondary/40 rounded-xl border border-border/40">
                    <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
                    <p className="text-[15px] font-semibold text-foreground break-all">{item.value}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Danger Zone */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <p className="text-[12px] font-semibold text-muted-foreground tracking-widest uppercase flex items-center gap-1.5">
                <Shield size={13} /> {t('settings.danger_zone')}
              </p>
            </div>
            <div className="p-4 flex justify-between items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t('settings.delete_account')}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{t('settings.delete_account_sub')}</p>
              </div>
              <button onClick={() => setShowDeleteDialog(true)}
                className="shrink-0 text-sm border border-border text-muted-foreground px-3 py-1.5 rounded-xl hover:bg-secondary hover:border-brand-600/30 hover:text-foreground transition-all font-medium">
                {t('settings.delete_account')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteDialog(false)}
          />
          <div className="relative w-full max-w-sm border border-border rounded-2xl shadow-2xl animate-slideUp"
               style={{ backgroundColor: 'var(--modal-surface)' }}>

            {/* Header */}
            <div className="px-5 py-4 border-b border-border/50 bg-secondary/30">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-brand-600" />
                <p className="text-[15px] font-bold text-foreground">{t('settings.delete_confirm_title')}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <p className="text-[15px] text-foreground font-medium mb-2">
                {t('settings.delete_confirm_question')}
              </p>
              <div className="flex flex-col gap-1.5 mb-4">
                {[
                  t('settings.delete_item1'),
                  t('settings.delete_item2'),
                  t('settings.delete_item3'),
                  t('settings.delete_item4'),
                ].map(item => (
                  <div key={item}
                    className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-white0 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="p-3 bg-white border border-brand-600/15 rounded-xl">
                <p className="text-[12px] text-muted-foreground font-medium">
                  ⚠️ {t('settings.delete_irreversible')}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-border/50">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                {deleteLoading
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Trash2 size={14} />
                }
                {deleteLoading ? t('settings.deleting') : t('settings.confirm_delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "flex items-center gap-2.5 px-5 py-3 rounded-2xl",
          "text-sm font-medium shadow-xl border",
          "animate-slideUp whitespace-nowrap",
          toast.type === "error"
            ? "bg-card text-foreground border-border"
            : "bg-brand-600 text-white border-brand-400",
        )}>
          {toast.message}
        </div>
      )}

      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.5s ease-out forwards;
        }
        .animate-slideDown {
          animation: slideDown 0.4s ease-out forwards;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .ease-spring {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      {/* Textarea Modal */}
      <TextareaModal
        key={`${modalConfig.title || "modal"}:${modalConfig.value || ""}`}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalConfig.title}
        value={modalConfig.value}
        onChange={modalConfig.onSave}
        placeholder={modalConfig.placeholder}
        hint={modalConfig.hint}
      />
    </div>
  )
}
