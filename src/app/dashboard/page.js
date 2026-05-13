"use client"

import React, { useState, useEffect, useRef, useMemo, memo } from "react"
import { useRouter } from "next/navigation"
import { statsAPI, conversationsAPI, agentAPI } from "@/lib/api"
import { getStageConfig, getStageLabel, getStageClassName, getScoreColor, getInitials } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import {
  Bot, Plus, ChevronLeft, MessageCircle,
  BarChart3, Sparkles, ArrowUpRight, ShoppingBag,
  AlertCircle, RefreshCw, Activity, Zap, Settings2,
  Brain, Globe, Languages, Truck, Package, CheckCircle2, Clock, AlertTriangle,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import UsageWidget from "@/components/UsageWidget"

/* ─────────────── Global Effects Styles ─────────────── */
const globalStyles = `
  .card-glow {
    position: relative;
    overflow: hidden;
  }
  .card-glow::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 30% 30%, rgba(83, 74, 183, 0.15) 0%, transparent 50%);
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
    z-index: 0;
  }
  .card-glow:hover::before {
    opacity: 1;
  }
  
  .shimmer-border {
    position: relative;
    background: linear-gradient(135deg, rgba(83, 74, 183, 0.1) 0%, rgba(83, 74, 183, 0.05) 100%);
    border: 1px solid rgba(83, 74, 183, 0.2);
    transition: all 0.3s ease;
  }
  .shimmer-border:hover {
    border-color: rgba(83, 74, 183, 0.4);
    box-shadow: 0 0 20px rgba(83, 74, 183, 0.15), inset 0 1px 0 rgba(255,255,255,0.1);
  }
  
  .glass-purple {
    background: linear-gradient(135deg, rgba(83, 74, 183, 0.95) 0%, rgba(83, 74, 183, 0.85) 100%);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.15);
  }
  
  .glass-purple-strong {
    background: linear-gradient(145deg, rgba(83, 74, 183, 0.98) 0%, rgba(70, 60, 160, 0.95) 50%, rgba(83, 74, 183, 0.98) 100%);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.2);
    box-shadow: 
      0 8px 32px rgba(83, 74, 183, 0.4),
      inset 0 1px 0 rgba(255,255,255,0.2),
      inset 0 -1px 0 rgba(0,0,0,0.1);
  }
  
  .float-hover {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .float-hover:hover {
    transform: translateY(-4px) scale(1.01);
  }
  
  .icon-pulse {
    position: relative;
  }
  .icon-pulse::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: rgba(83, 74, 183, 0.2);
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.3s ease;
  }
  .group:hover .icon-pulse::after {
    opacity: 1;
    transform: scale(1.2);
  }
  
  .gradient-text {
    background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .shine-effect {
    position: relative;
    overflow: hidden;
  }
  .shine-effect::after {
    content: '';
    position: absolute;
    top: -100%;
    left: -100%;
    width: 50%;
    height: 200%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255,255,255,0.1),
      transparent
    );
    transform: rotate(25deg);
    transition: all 0.6s ease;
  }
  .shine-effect:hover::after {
    left: 150%;
  }
  
  .ripple-btn {
    position: relative;
    overflow: hidden;
  }
  .ripple-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.3) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .ripple-btn:hover::before {
    opacity: 1;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }
  
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(83, 74, 183, 0.3); }
    50% { box-shadow: 0 0 40px rgba(83, 74, 183, 0.5), 0 0 60px rgba(83, 74, 183, 0.2); }
  }
  
  @keyframes border-glow {
    0%, 100% { border-color: rgba(83, 74, 183, 0.3); }
    50% { border-color: rgba(83, 74, 183, 0.6); }
  }
  
  @keyframes slide-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  
  .animate-glow-pulse {
    animation: glow-pulse 2s ease-in-out infinite;
  }
  
  .animate-border-glow {
    animation: border-glow 2s ease-in-out infinite;
  }
  
  .slide-in {
    animation: slide-in-up 0.5s ease-out forwards;
  }
  
  .stat-icon-bg {
    background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%);
    box-shadow: 
      inset 0 1px 0 rgba(255,255,255,0.3),
      0 4px 12px rgba(0,0,0,0.1);
  }
  
  .progress-glow {
    box-shadow: 0 0 10px rgba(83, 74, 183, 0.5);
  }
  
  .table-row-hover {
    position: relative;
    transition: all 0.2s ease;
  }
  .table-row-hover::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(83, 74, 183, 0.03), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .table-row-hover:hover::before {
    opacity: 1;
  }
`;

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

/* ─────────────── Score Bar ─────────────── */
function ScoreBar({ score, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[13px] font-bold tabular-nums" style={{ color }}>{score}%</span>
    </div>
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
    <div className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-secondary/40 transition-colors duration-200 cursor-default group">
      <span className="text-[13px] text-muted-foreground font-medium min-w-[50px] group-hover:text-foreground transition-colors">{label}</span>
      <div className="flex-1 h-[3px] bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: "var(--color-brand-600)",
            width: animated ? pct : "0%",
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
      <span className="text-[13px] font-bold text-foreground min-w-[18px] text-left">{count}</span>
    </div>
  )
}

/* ─────────────── Stat Card ─────────────── */
function StatCard({ icon: Icon, label, value, suffix = "", badge, badgeVariant = "default", delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className="group rounded-xl p-3.5 sm:p-5 overflow-hidden cursor-default transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 bg-brand-600"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <Icon size={17} className="text-white" />
        </div>
        {badge && (
          <span className="text-[13px] font-semibold px-2 py-0.5 rounded-md bg-white/15 border border-white/20 text-white/90">
            {badge}
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums">
        <AnimatedNumber value={typeof value === "number" ? value : 0} suffix={suffix} />
      </p>
      <p className="text-[13px] text-white/70 mt-1 font-medium">{label}</p>
      <div className="mt-3 h-[2px] w-0 bg-white/50 rounded-full group-hover:w-full transition-all duration-500 ease-out" />
    </div>
  )
}

function DeliveryOverview({ delivery = {}, onManage, t }) {
  const items = [
    {
      key: "ready",
      icon: Clock,
      label: t('dash.delivery_ready'),
      value: delivery.readyToExport || 0,
    },
    {
      key: "exported",
      icon: Package,
      label: t('dash.delivery_exported'),
      value: delivery.exportedPending || 0,
    },
    {
      key: "transit",
      icon: Truck,
      label: t('dash.delivery_in_transit'),
      value: delivery.inTransit || 0,
    },
    {
      key: "delivered",
      icon: CheckCircle2,
      label: t('dash.delivery_delivered'),
      value: delivery.delivered || 0,
    },
  ]
  const successRate = Math.max(0, Math.min(100, Number(delivery.successRate || 0)))

  return (
    <div className="bg-card border border-border rounded-xl p-4 transition-shadow duration-300 hover:shadow-lg">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600/10 border border-brand-600/20 flex items-center justify-center">
            <Truck size={17} className="text-brand-600" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-foreground">{t('dash.delivery_title')}</p>
            <p className="text-[12px] text-muted-foreground">{t('dash.delivery_subtitle')}</p>
          </div>
        </div>
        <button
          onClick={onManage}
          className="order-last lg:order-none self-start lg:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[13px] font-semibold text-foreground hover:border-brand-600/40 hover:text-brand-600 transition-all"
        >
          {t('dash.delivery_manage')}
          <ArrowUpRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
        {items.map(({ key, icon: Icon, label, value }) => (
          <div key={key} className="rounded-lg border border-brand-600/15 bg-brand-600/5 px-3 py-2.5 text-brand-700 dark:text-brand-300">
            <div className="flex items-center justify-between gap-2">
              <Icon size={15} />
              <span className="text-lg font-bold tabular-nums">{value}</span>
            </div>
            <p className="text-[12px] font-semibold mt-1 truncate">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[13px] font-semibold text-foreground">{t('dash.delivery_success_rate')}</span>
            <span className="text-[13px] font-bold text-brand-600">{successRate}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-700"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-brand-600/15 bg-brand-600/5 px-3 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={15} className="text-brand-600 shrink-0" />
            <span className="text-[13px] font-semibold text-brand-700 dark:text-brand-300 truncate">{t('dash.delivery_missing_tracking')}</span>
          </div>
          <span className="text-[16px] font-bold text-brand-700 dark:text-brand-300 tabular-nums">{delivery.missingTracking || 0}</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Agent Info Chip ─────────────── */
function AgentChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg px-3 py-2 transition-colors duration-200 cursor-default">
      <Icon size={11} className="text-white/50 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-white/40 leading-none mb-0.5">{label}</p>
        <p className="text-[13px] font-semibold text-white truncate leading-tight">{value}</p>
      </div>
    </div>
  )
}

/* ─────────────── Dashboard Skeleton ─────────────── */
const skeletonStyles = `
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes glow-pulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1;   }
  }
  @keyframes border-breathe {
    0%, 100% { border-color: rgba(83,74,183,0.15); box-shadow: 0 0 0 0 rgba(83,74,183,0); }
    50%       { border-color: rgba(83,74,183,0.40); box-shadow: 0 0 18px 2px rgba(83,74,183,0.12); }
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }

  /* ── base bone ── */
  .sk-bone {
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      rgba(83,74,183,0.07) 0%,
      rgba(83,74,183,0.16) 40%,
      rgba(83,74,183,0.07) 80%
    );
    background-size: 600px 100%;
    animation: shimmer 1.6s ease-in-out infinite;
  }

  /* ── card wrapper ── */
  .sk-card {
    border-radius: 14px;
    background: rgba(83,74,183,0.04);
    border: 1px solid rgba(83,74,183,0.12);
    animation: border-breathe 3s ease-in-out infinite;
    overflow: hidden;
  }

  /* ── stat card (matches bg-brand-600 originals) ── */
  .sk-stat-card {
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(83,74,183,0.18) 0%, rgba(83,74,183,0.10) 100%);
    border: 1px solid rgba(83,74,183,0.22);
    padding: 18px 20px 16px;
    animation: fade-in 0.5s ease both;
    overflow: hidden;
    position: relative;
  }
  .sk-stat-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(83,74,183,0.08) 50%,
      transparent 100%
    );
    background-size: 600px 100%;
    animation: shimmer 2s ease-in-out infinite;
  }

  /* ── agent card (matches bg-brand-600 solid) ── */
  .sk-agent-card {
    border-radius: 14px;
    background: linear-gradient(145deg, rgba(83,74,183,0.22) 0%, rgba(70,60,160,0.18) 100%);
    border: 1px solid rgba(83,74,183,0.30);
    overflow: hidden;
    animation: border-breathe 3s ease-in-out infinite;
    position: relative;
  }
  .sk-agent-card::before {
    content: '';
    position: absolute;
    top: -60%;
    left: -40%;
    width: 180%;
    height: 180%;
    background: radial-gradient(circle, rgba(83,74,183,0.12) 0%, transparent 60%);
    animation: glow-pulse 3s ease-in-out infinite;
    pointer-events: none;
  }

  /* ── stagger helpers ── */
  .sk-d0  { animation-delay: 0ms; }
  .sk-d1  { animation-delay: 80ms; }
  .sk-d2  { animation-delay: 160ms; }
  .sk-d3  { animation-delay: 240ms; }
  .sk-d4  { animation-delay: 320ms; }
  .sk-d5  { animation-delay: 400ms; }
  .sk-d6  { animation-delay: 480ms; }

  /* utility */
  .sk-row    { display: flex; align-items: center; gap: 10px; }
  .sk-col    { display: flex; flex-direction: column; gap: 8px; }
  .sk-circle { border-radius: 9999px !important; }
  .sk-round  { border-radius: 6px !important; }

  /* responsive */
  @media (max-width: 1024px) {
    .sk-main-grid { grid-template-columns: 1fr !important; }
    .sk-sidebar { order: -1; }
  }
  @media (max-width: 768px) {
    .sk-stat-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
    .sk-header-buttons { display: none !important; }
    .sk-table-header { display: none !important; }
    .sk-hidden-mobile { display: none !important; }
    .sk-desktop-rows { display: none !important; }
    .sk-mobile-rows { display: block !important; }
    .sk-mobile-row {
      flex-direction: row !important;
      align-items: center !important;
      gap: 12px !important;
    }
    .sk-mobile-row .sk-bone { flex-shrink: 0 !important; }
    .sk-mobile-row > div { flex: 1 !important; }
    .sk-filter-tabs { overflow-x: auto !important; }
    .sk-header-flex {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 12px !important;
    }
  }
  @media (min-width: 769px) {
    .sk-mobile-rows { display: none !important; }
  }
`;

/* ── Bone primitive ── */
function B({ w, h, r, className = "", style = {} }) {
  return (
    <div
      className={`sk-bone ${className}`}
      style={{
        width: w,
        height: h,
        borderRadius: r,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/* ── Row of avatar + text (conversations) ── */
function ConvRow({ delay = "" }) {
  return (
    <div className={`sk-row ${delay}`} style={{ padding: "14px 16px", borderTop: "1px solid rgba(83,74,183,0.08)" }}>
      <B w={34} h={34} r="50%" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <B w={90} h={11} r={6} />
        <B w="60%" h={10} r={6} />
      </div>
      <B w={64} h={22} r={6} className="hidden-mobile" />
      <B w={52} h={10} r={6} className="hidden-mobile" />
    </div>
  );
}

/* ── Main component ── */
function DashboardSkeleton() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: skeletonStyles }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ══ 1. HEADER ══ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="sk-header-flex">
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <B w={120} h={20} r={8} className="sk-d0" />
            <B w={200} h={12} r={6} className="sk-d1 sk-hidden-mobile" />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }} className="sk-header-buttons">
            <B w={110} h={32} r={10} className="sk-d1" />
            <B w={100} h={32} r={10} className="sk-d2" />
            <B w={100} h={32} r={10} className="sk-d3" />
          </div>
        </div>

        {/* ══ 2. STAT CARDS (4) ══ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }} className="sk-stat-grid">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="sk-stat-card sk-d0"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* icon + badge */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                <B w={32} h={32} r={8} style={{ background: "rgba(83,74,183,0.20)" }} />
                <B w={44} h={22} r={6} className="sk-hidden-mobile" />
              </div>
              {/* big number */}
              <B w={80} h={30} r={6} style={{ marginBottom: 8 }} />
              {/* label */}
              <B w={100} h={11} r={5} style={{ opacity: 0.6 }} className="sk-hidden-mobile" />
              {/* bottom bar */}
              <div style={{
                marginTop: 14,
                height: 2,
                width: "100%",
                background: "rgba(83,74,183,0.15)",
                borderRadius: 99,
                overflow: "hidden"
              }}>
                <div style={{
                  height: "100%",
                  width: "60%",
                  background: "linear-gradient(90deg, rgba(83,74,183,0.3), rgba(83,74,183,0.6))",
                  borderRadius: 99,
                  animation: "shimmer 2s ease-in-out infinite",
                  backgroundSize: "200px 100%",
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* 3. Delivery overview */}
        <div className="sk-card" style={{ padding: 16 }}>
          <div
            className="sk-header-flex"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div className="sk-row" style={{ alignItems: "flex-start" }}>
              <B w={32} h={32} r={8} style={{ background: "rgba(83,74,183,0.14)" }} />
              <div className="sk-col" style={{ gap: 7 }}>
                <B w={92} h={18} r={6} />
                <B w={210} h={11} r={5} className="sk-hidden-mobile" />
              </div>
            </div>
            <B w={86} h={34} r={10} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }} className="sk-stat-grid">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  minHeight: 84,
                  borderRadius: 12,
                  border: "1px solid rgba(83,74,183,0.12)",
                  background: "rgba(83,74,183,0.035)",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <B w={28} h={28} r={8} />
                  <B w={24} h={10} r={5} className="sk-hidden-mobile" />
                </div>
                <div className="sk-col" style={{ gap: 7 }}>
                  <B w={38} h={20} r={6} />
                  <B w={82} h={11} r={5} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }} className="sk-main-grid">
            <div
              style={{
                borderRadius: 12,
                border: "1px solid rgba(83,74,183,0.10)",
                background: "rgba(255,255,255,0.45)",
                padding: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <B w={120} h={13} r={6} />
                <B w={38} h={18} r={6} style={{ background: "rgba(83,74,183,0.16)" }} />
              </div>
              <B w="100%" h={8} r={999} />
            </div>
            <div
              style={{
                borderRadius: 12,
                border: "1px solid rgba(83,74,183,0.10)",
                background: "rgba(255,255,255,0.45)",
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div className="sk-row">
                <B w={28} h={28} r={8} />
                <B w={128} h={13} r={6} />
              </div>
              <B w={34} h={20} r={6} />
            </div>
          </div>
        </div>

        {/* AI usage */}
        <div className="sk-card" style={{ padding: 16 }}>
          <div
            className="sk-header-flex"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 22,
            }}
          >
            <div className="sk-row">
              <B w={34} h={34} r={10} style={{ background: "rgba(83,74,183,0.16)" }} />
              <div className="sk-col" style={{ gap: 7 }}>
                <B w={142} h={18} r={6} />
                <B w={96} h={11} r={5} className="sk-hidden-mobile" />
              </div>
            </div>
            <B w={76} h={30} r={999} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <B w={92} h={20} r={6} />
            <B w={80} h={12} r={6} className="sk-hidden-mobile" />
          </div>
          <div style={{ height: 8, width: "100%", borderRadius: 999, background: "rgba(83,74,183,0.13)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: "72%",
                borderRadius: 999,
                background: "linear-gradient(90deg, rgba(83,74,183,0.35), rgba(83,74,183,0.70))",
                animation: "shimmer 2s ease-in-out infinite",
                backgroundSize: "200px 100%",
              }}
            />
          </div>

          <div style={{ height: 1, background: "rgba(83,74,183,0.10)", margin: "18px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="sk-main-grid">
            {[0, 1].map(i => (
              <div key={i} className="sk-col" style={{ gap: 7 }}>
                <B w={120} h={11} r={5} />
                <B w={72} h={20} r={6} />
              </div>
            ))}
          </div>
        </div>

        {/* 4. Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }} className="sk-main-grid">

          {/* ── Conversations Panel ── */}
          <div className="sk-card">

            {/* Panel header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 16px",
              borderBottom: "1px solid rgba(83,74,183,0.08)",
            }}>
              <div className="sk-row">
                <B w={28} h={28} r={8} />
                <B w={130} h={14} r={6} />
                <B w={70} h={22} r={6} className="sk-hidden-mobile" />
              </div>
              <B w={56} h={11} r={5} className="sk-hidden-mobile" />
            </div>

            {/* Filter tabs */}
            <div style={{
              display: "flex",
              gap: 8,
              padding: "10px 16px",
              borderBottom: "1px solid rgba(83,74,183,0.08)",
            }} className="sk-filter-tabs">
              {[56, 80, 80].map((w, i) => (
                <B key={i} w={w} h={28} r={8} />
              ))}
            </div>

            {/* Table header - desktop only */}
            <div style={{
              display: "flex",
              gap: 16,
              padding: "10px 16px",
              background: "rgba(83,74,183,0.03)",
              borderBottom: "1px solid rgba(83,74,183,0.08)",
            }} className="sk-table-header">
              {[100, 140, 80, 70].map((w, i) => (
                <B key={i} w={w} h={10} r={4} />
              ))}
            </div>

            {/* Rows - desktop */}
            <div className="sk-desktop-rows">
              {[0, 1, 2, 3, 4].map(i => (
                <ConvRow key={i} delay={`sk-d${i}`} />
              ))}
            </div>

            {/* Mobile rows */}
            <div className="sk-mobile-rows">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="sk-row sk-mobile-row" style={{ padding: "14px 16px", borderTop: "1px solid rgba(83,74,183,0.08)" }}>
                  <B w={36} h={36} r="50%" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <B w={100} h={12} r={6} />
                      <B w={50} h={20} r={6} />
                    </div>
                    <B w="80%" h={10} r={6} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="sk-sidebar">

            {/* Funnel card */}
            <div className="sk-card" style={{ padding: "18px 18px 14px" }}>
              {/* Header */}
              <div className="sk-row" style={{ marginBottom: 18 }}>
                <B w={28} h={28} r={8} />
                <B w={110} h={14} r={6} />
              </div>

              {/* Funnel bars */}
              {[100, 74, 47, 26, 17].map((pct, i) => (
                <div key={i} className="sk-row" style={{ marginBottom: 10 }}>
                  <B w={48} h={10} r={4} />
                  <div style={{
                    flex: 1,
                    height: 3,
                    background: "rgba(83,74,183,0.08)",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: 99,
                      background: "linear-gradient(90deg, rgba(83,74,183,0.25), rgba(83,74,183,0.50))",
                      animation: "shimmer 1.8s ease-in-out infinite",
                      backgroundSize: "200px 100%",
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                  <B w={18} h={10} r={4} />
                </div>
              ))}

              {/* Footer rate */}
              <div style={{
                marginTop: 10,
                paddingTop: 12,
                borderTop: "1px solid rgba(83,74,183,0.08)",
                display: "flex",
                justifyContent: "space-between",
              }}>
                <B w={100} h={10} r={4} />
                <B w={36} h={10} r={4} />
              </div>
            </div>

            {/* Agent card */}
            <div className="sk-agent-card" style={{ position: "relative" }}>
              <div style={{ padding: "16px 16px 12px" }}>

                {/* Agent header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div className="sk-row">
                    {/* Avatar glow ring */}
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "rgba(83,74,183,0.25)",
                      border: "2px solid rgba(83,74,183,0.30)",
                      flexShrink: 0,
                      animation: "glow-pulse 2.5s ease-in-out infinite",
                    }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      <B w={80} h={14} r={6} style={{ background: "rgba(255,255,255,0.18)" }} />
                      <B w={56} h={10} r={4} style={{ background: "rgba(255,255,255,0.10)" }} />
                    </div>
                  </div>
                  {/* Active badge */}
                  <B w={64} h={22} r={99} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }} />
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 14 }} />

                {/* 2×2 chip grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{
                      height: 44,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      padding: "8px 10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                    }}>
                      <B w={32} h={9} r={4} style={{ background: "rgba(255,255,255,0.12)" }} />
                      <B w="70%" h={11} r={4} style={{ background: "rgba(255,255,255,0.18)" }} />
                    </div>
                  ))}
                </div>

                {/* Conv-rate bar */}
                <div style={{ marginBottom: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <B w={90} h={10} r={4} style={{ background: "rgba(255,255,255,0.12)" }} />
                    <B w={30} h={10} r={4} style={{ background: "rgba(255,255,255,0.18)" }} />
                  </div>
                  <div style={{
                    height: 4,
                    width: "100%",
                    borderRadius: 99,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: "42%",
                      borderRadius: 99,
                      background: "linear-gradient(90deg, rgba(255,255,255,0.30), rgba(255,255,255,0.65))",
                      animation: "shimmer 2s ease-in-out infinite",
                      backgroundSize: "200px 100%",
                    }} />
                  </div>
                </div>
              </div>

              {/* CTA button row */}
              <div style={{
                padding: "10px 16px",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                justifyContent: "center",
              }}>
                <B w={120} h={13} r={6} style={{ background: "rgba(255,255,255,0.14)" }} />
              </div>
            </div>

            {/* Quick Actions Strip */}
            <div className="sk-card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {[0, 1, 2].map(i => (
                  <React.Fragment key={i}>
                    {i > 0 && <div style={{ width: 1, height: 32, background: "rgba(83,74,183,0.10)", flexShrink: 0 }} />}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "8px 0" }}>
                      <B w={20} h={20} r={5} />
                      <B w={52} h={10} r={4} />
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────── Main Page ─────────────── */
export default function DashboardPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [stats, setStats] = useState(null)
  const [conversations, setConversations] = useState([])
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const agentLanguageLabel = useMemo(() => {
    if (!agent?.language) return "—"
    if (agent.language === "auto") return t('settings.lang_auto') || "تلقائي"
    if (agent.language === "darija") return t('settings.lang_darija')
    if (agent.language === "arabic") return t('settings.lang_arabic')
    if (agent.language === "french") return t('settings.lang_french')
    return agent.language
  }, [agent?.language, t])

  // ✅ فلترة المحادثات
  const filteredConversations = useMemo(() => {
    if (!Array.isArray(conversations)) return []
    return conversations
  }, [conversations])

  useEffect(() => { fetchDashboardData() }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)
      const [statsData, conversationsData, agentData] = await Promise.all([
        statsAPI.getStats(),
        conversationsAPI.getAll({ limit: 5 }),
        agentAPI.get(),
      ])
      setStats(statsData.data)
      setConversations(conversationsData.data?.conversations || [])
      setAgent(agentData.data)
    } catch (err) {
      setError(err?.message || "error")
    } finally {
      setLoading(false)
    }
  }

  /* ── Loading skeleton ── */
  if (loading) return <DashboardSkeleton />

  /* ── Error state ── */
  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 rounded-full border border-brand-600/20 bg-brand-600/5 flex items-center justify-center">
          <AlertCircle size={20} className="text-brand-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{t('common.load_error')}</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors"
        >
          <RefreshCw size={15} />
          {t('common.retry')}
        </button>
      </div>
    )
  }

  /* ── Main render ── */
  return (
    <div className="flex flex-col gap-5">
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* ── 1. Header ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">{t('nav.dashboard')}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5 hidden sm:block">
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* ✅ 3 أزرار: تخصيص Agent | خدمة جديدة | منتج جديد */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-lg text-sm font-medium text-foreground hover:border-brand-300 hover:text-brand-600 transition-all duration-200"
          >
            <Bot size={15} />
            <span className="hidden sm:inline">{t('dash.customize_agent')}</span>
          </button>

          {/* زر منتج جديد */}
          <button
            onClick={() => router.push("/dashboard/products")}
            className="flex items-center gap-1.5 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors duration-200 shadow-sm"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">{t('dash.new_product')}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={MessageCircle} label={t('dash.today_convs')}    value={stats.todayConversations} badge="+12%" badgeVariant="up" delay={0} />
        <StatCard icon={ShoppingBag}  label={t('dash.today_sales')}     value={stats.todaySales}          badge={`${stats.conversionRate}%`} delay={80} />
        <StatCard icon={Sparkles}     label={t('dash.pitching')}        value={stats.pitching}            badge="Agent" badgeVariant="up" delay={160} />
        <StatCard icon={BarChart3}    label={t('dash.today_revenue')}   value={stats.todayRevenue || 0}   suffix={` ${t('common.currency')}`} delay={240} />
      </div>

      <DeliveryOverview
        delivery={stats.deliveryStats}
        onManage={() => router.push("/dashboard/orders")}
        t={t}
      />

      {/* ── AI Usage Widget ── */}
      <UsageWidget />

      {/* ── 3. Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Conversations Panel ── */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden transition-shadow duration-300 hover:shadow-lg group">
          {/* ✅ Panel header مع فلاتر */}
          <div className="flex flex-col gap-0 border-b border-border">

            {/* صف العنوان */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                  <MessageCircle size={15} className="text-brand-600" />
                </div>
                <span className="text-[15px] font-semibold">{t('dash.recent_convs')}</span>
                <span className="hidden sm:flex items-center justify-center text-[13px] font-semibold text-brand-600 bg-brand-600/10 border border-brand-200 rounded-md px-2 py-0.5">
                  {stats.todayConversations} {t('dash.today')}
                </span>
              </div>
              <button
                onClick={() => router.push("/dashboard/conversations")}
                className="flex items-center gap-0.5 text-[13px] font-semibold text-brand-600 hover:text-brand-800 hover:gap-1 transition-all duration-200"
              >
                {t('common.view_all')}
                <ChevronLeft size={12} />
              </button>
            </div>

          </div>

          {/* Desktop Table */}
          <table className="w-full hidden md:table">
            <thead>
              <tr>
                <th className="text-right text-[13px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-2.5 bg-secondary border-b border-border">{t('common.customer')}</th>
                <th className="text-right text-[13px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-2.5 bg-secondary border-b border-border">{t('conv.last_msg')}</th>
                <th className="text-right text-[13px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-2.5 bg-secondary border-b border-border">{t('common.stage')}</th>
                <th className="text-right text-[13px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-2.5 bg-secondary border-b border-border">{t('common.score')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredConversations.slice(0, 5).map((conv, idx) => {
                const scoreColor = getScoreColor(conv.score)
                const lastMessage = conv.messages?.[0]?.content || t('conv.no_messages')
                return (
                  <tr
                    key={conv.id}
                    onClick={() => router.push(`/dashboard/conversations?id=${conv.id}`)}
                    className="border-t border-border hover:bg-secondary cursor-pointer transition-colors duration-150 group"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-[13px] font-bold text-white">
                            {getInitials(conv.customer?.name)}
                          </div>
                          {!conv.isRead && (
                            <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-brand-600 border-2 border-card" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold text-foreground truncate">
                            {conv.customer?.name || t('common.customer')}
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-brand-600 shrink-0">
                            <ShoppingBag size={11} />
                            <span>{t('nav.products')}</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[160px]">
                      <p className="text-[13px] text-muted-foreground truncate group-hover:text-foreground transition-colors">{lastMessage}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[13px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${getStageClassName(conv.stage)}`}>
                        {getStageLabel(conv.stage, t)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <ScoreBar score={conv.score} color={scoreColor} />
                    </td>
                  </tr>
                )
              })}
              {filteredConversations.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                    {t('conv.no_convs')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {filteredConversations.slice(0, 5).map((conv) => {
              const scoreColor = getScoreColor(conv.score)
              return (
                <div
                  key={conv.id}
                  onClick={() => router.push(`/dashboard/conversations?id=${conv.id}`)}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary active:bg-secondary cursor-pointer transition-colors"
                >
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-[13px] font-bold text-white">
                      {getInitials(conv.customer?.name)}
                    </div>
                    {!conv.isRead && (
                      <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-brand-600 border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[13px] font-semibold text-foreground truncate">
                          {conv.customer?.name || t('common.customer')}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-brand-600 shrink-0">
                          <ShoppingBag size={11} />
                        </span>
                      </div>
                      <span className={`text-[13px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${getStageClassName(conv.stage)}`}>
                        {getStageLabel(conv.stage, t)}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                      {conv.messages?.[0]?.content || t('conv.no_messages')}
                    </p>
                  </div>
                  <span className="text-[13px] font-bold shrink-0 tabular-nums" style={{ color: scoreColor }}>
                    {conv.score}%
                  </span>
                </div>
              )
            })}
            {filteredConversations.length === 0 && (
              <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                {t('conv.no_convs')}
              </p>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="flex flex-col gap-4">

          {/* Stages Funnel */}
          <div className="bg-card border border-border rounded-xl p-5 transition-shadow duration-300 hover:shadow-lg group">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center transition-transform group-hover:scale-110">
                <Activity size={15} className="text-brand-600" />
              </div>
              <p className="text-[15px] font-semibold">{t('dash.funnel_title')}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              {[
                { label: t('stage.greeting'),  count: stats.stages?.greeting || 0, pct: "100%", delay: 200 },
                { label: t('stage.discovery'), count: stats.stages?.discovery || 0, pct: "74%",  delay: 280 },
                { label: t('stage.pitching'),  count: stats.stages?.pitching  || 0, pct: "47%",  delay: 360 },
                { label: t('stage.objection'), count: stats.stages?.objection || 0, pct: "26%",  delay: 440 },
                { label: t('stage.closed'),    count: stats.stages?.closed    || 0, pct: "17%",  delay: 520 },
              ].map(s => (
                <FunnelBar key={s.label} {...s} />
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground font-medium">{t('dash.close_rate')}</span>
              <span className="text-[13px] font-bold text-brand-600">{stats.conversionRate}%</span>
            </div>
          </div>

          {/* ── Agent Card ── */}
          <div
            className="rounded-xl overflow-hidden transition-shadow duration-300 hover:shadow-2xl bg-brand-600"
          >
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 ring-2 ring-white/25"
                    >
                      <Brain size={18} className="text-white" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-white border-2 border-brand-600" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-white leading-tight tracking-tight">
                      {agent?.name || "Agent"}
                    </p>
                    <p className="text-[13px] text-white/50 mt-0.5">{t('dash.agent_sub')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-white/10 border border-white/20">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                  </span>
                  <span className="text-[13px] font-semibold text-white/85">{t('common.active')}</span>
                </div>
              </div>

              <div className="h-px mb-3 bg-white/10" />

              <div className="grid grid-cols-2 gap-2 mb-3">
                <AgentChip icon={Globe}         label={t('agent.domain')}   value={agent?.domain   || "—"} />
                <AgentChip icon={Languages}     label={t('agent.language')} value={agentLanguageLabel} />
                <AgentChip icon={Sparkles}      label={t('agent.style')}    value={agent?.style    || "—"} />
                <AgentChip icon={MessageCircle} label={t('dash.today_msgs')}
                  value={<AnimatedNumber value={stats?.todayConversations ?? 0} />}
                />
              </div>
            </div>

            <div className="px-4 pb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] text-white/50">{t('dash.conv_rate')}</span>
                <span className="text-[13px] font-bold text-white/80">{stats?.conversionRate ?? 0}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${stats?.conversionRate ?? 0}%`,
                    background: "linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.9))",
                    transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard/settings")}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold transition-all duration-200 hover:gap-3 active:scale-[0.98] border-t border-white/10 bg-white/[0.07] hover:bg-white/15 text-white/85"
            >
              <Settings2 size={12} />
              {t('dash.edit_agent')}
              <ArrowUpRight size={12} />
            </button>
          </div>

          {/* Quick Actions Strip */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-2">
            <button
              onClick={() => router.push("/dashboard/conversations")}
              className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-lg hover:bg-secondary transition-colors duration-150 group"
            >
              <MessageCircle size={17} className="text-brand-600 group-hover:scale-110 transition-transform" />
              <span className="text-[13px] font-medium text-muted-foreground">{t('nav.conversations')}</span>
            </button>
            <div className="w-px h-8 bg-border" />
            <button
              onClick={() => router.push("/dashboard/products")}
              className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-lg hover:bg-secondary transition-colors duration-150 group"
            >
              <ShoppingBag size={17} className="text-brand-600 group-hover:scale-110 transition-transform" />
              <span className="text-[13px] font-medium text-muted-foreground">{t('nav.products')}</span>
            </button>
            <div className="w-px h-8 bg-border" />
            <button
              onClick={() => router.push("/dashboard/settings")}
              className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-lg hover:bg-secondary transition-colors duration-150 group"
            >
              <Zap size={17} className="text-brand-600 group-hover:scale-110 transition-transform" />
              <span className="text-[13px] font-medium text-muted-foreground">{t('nav.settings')}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  )}
