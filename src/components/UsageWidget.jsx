"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Zap, AlertTriangle, TrendingUp, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getToken } from "@/lib/helpers"

/**
 * Compact AI-usage widget. Fetches /api/usage/me and shows:
 *   - plan label
 *   - used / limit progress bar (color shifts at 80% / 100%)
 *   - remaining count
 *   - estimated USD cost this month
 *
 * Safe to drop anywhere in an authenticated page.
 */
export default function UsageWidget({ className = "", compact = false }) {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchUsage = async () => {
      try {
        const token = getToken()
        if (!token) return
        const res = await fetch("/api/usage/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (!cancelled) {
          if (json?.data) setData(json.data)
          else setError(json?.error || "fetch_failed")
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "fetch_failed")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchUsage()
    // Refresh every 60 seconds while mounted
    const interval = setInterval(fetchUsage, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (loading) {
    return (
      <div className={cn(
        "bg-card border border-border rounded-xl p-4 flex items-center gap-3",
        className
      )}>
        <Loader2 size={16} className="animate-spin text-brand-600" />
        <span className="text-[13px] text-muted-foreground">
          {t("usage.loading")}
        </span>
      </div>
    )
  }

  if (error || !data) {
    return null  // Silent fail — non-critical widget
  }

  const { plan, planLabel, usage, limits, remaining, percentUsed, allowed } = data
  const pctColor = "bg-brand-600"
  const tone = allowed
    ? "border-border bg-card"
    : "border-brand-600/30 bg-white"

  return (
    <div className={cn(
      "border rounded-xl p-4 transition-colors",
      tone,
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600/10 flex items-center justify-center">
            <Zap size={14} className="text-brand-600" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-foreground">
              {t("usage.title")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("usage.plan")}: <span className="font-semibold text-brand-600">{planLabel || plan}</span>
            </p>
          </div>
        </div>
        {!allowed && (
          <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-brand-600/10 text-brand-600 border border-brand-600/20 flex items-center gap-1">
            <AlertTriangle size={11} />
            {t("usage.limit_reached")}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="mb-2">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[12px] text-muted-foreground">
            {t("usage.ai_replies")}
          </span>
          <span className="text-[13px] font-bold text-foreground tabular-nums">
            {usage.aiReplies.toLocaleString()} / {limits.aiReplies.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", pctColor)}
            style={{ width: `${Math.min(100, percentUsed)}%` }}
          />
        </div>
      </div>

      {/* Secondary stats (hidden in compact) */}
      {!compact && (
        <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-border/60">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              {t("usage.remaining")}
            </p>
            <p className="text-[14px] font-bold text-foreground tabular-nums">
              {remaining.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 flex items-center gap-1">
              <TrendingUp size={10} /> {t("usage.est_cost")}
            </p>
            <p className="text-[14px] font-bold text-foreground tabular-nums">
              ${usage.estimatedCostUsd?.toFixed(3) ?? "0.000"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
