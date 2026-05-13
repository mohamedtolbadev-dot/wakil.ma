"use client"

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { conversationsAPI } from "@/lib/api"
import { getStageConfig, getStageClassName, getScoreColor, timeAgo, getInitials, getToken } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import { Search, Download, MessageCircle, Sparkles,
  Users, CheckCircle, AlertCircle, Loader2,
  RefreshCw, ChevronRight, Trash2, AlertTriangle,
  X, ShoppingBag, Send, Mic, Copy, Check, MoreVertical,
  Paperclip, ImageIcon, FileText, Video, Eye, Play, Pause,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

/* ─────────────── Stage Label Helper ─────────────── */
function useStageLabel() {
  const { t } = useLanguage()
  return (stage, type = "product") => {
    if (stage === "CLOSED") {
      return type === "service" ? t('conv.stage_booked') : t('conv.stage_ordered')
    }
    const labels = {
      GREETING:  t('stage.greeting'),
      DISCOVERY: t('stage.discovery'),
      PITCHING:  t('stage.pitching'),
      OBJECTION: t('stage.objection'),
      CLOSING:   t('stage.closing'),
      ABANDONED: t('stage.abandoned'),
    }
    return labels[stage] || stage
  }
}

/* ─────────────── Skeleton ─────────────── */
function ConversationsSkeleton() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-4 pb-6">
      <style>{`
        @keyframes sk-shimmer {
          0%   { background-position: -700px 0; }
          100% { background-position:  700px 0; }
        }
        .sk {
          border-radius: 6px;
          background: linear-gradient(90deg,
            var(--color-background-secondary, rgba(0,0,0,0.06)) 25%,
            var(--color-background-tertiary,  rgba(0,0,0,0.11)) 50%,
            var(--color-background-secondary, rgba(0,0,0,0.06)) 75%
          );
          background-size: 700px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
        }
        .sk-bubble-agent {
          border-radius: 14px 14px 14px 4px;
          background: linear-gradient(90deg,
            var(--color-background-secondary, rgba(0,0,0,0.06)) 25%,
            var(--color-background-tertiary,  rgba(0,0,0,0.11)) 50%,
            var(--color-background-secondary, rgba(0,0,0,0.06)) 75%
          );
          background-size: 700px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
        }
        .sk-bubble-customer {
          border-radius: 14px 14px 4px 14px;
          background: linear-gradient(90deg,
            rgba(83,74,183,0.38) 25%,
            rgba(83,74,183,0.62) 50%,
            rgba(83,74,183,0.38) 75%
          );
          background-size: 700px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-center bg-card border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="sk w-8 h-8 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <div className="sk h-4 w-[90px]" />
            <div className="sk h-[11px] w-[130px]" />
          </div>
        </div>
        <div className="sk h-8 w-[90px] rounded-lg" />
      </div>

      {/* Type Tabs */}
      <div className="sk h-10 w-[220px] rounded-xl" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[36, 48, 40, 52].map((w, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col gap-2.5">
            <div className="flex justify-between items-start">
              <div className="sk w-8 h-8 rounded-lg" />
              <div className="sk h-5 rounded-md" style={{ width: w }} />
            </div>
            <div className="sk h-[26px] rounded-md w-10" />
            <div className="sk h-[11px] w-24" />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-1.5 bg-card border border-border rounded-lg p-2">
          {[70, 64, 68, 72].map((w, i) => (
            <div key={i} className="sk h-[30px] rounded-lg" style={{ width: w }} />
          ))}
        </div>
        <div className="relative bg-card border border-border rounded-lg px-3 py-2.5 flex items-center">
          <div className="sk absolute right-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded" />
          <div className="sk h-3 w-[160px] mr-5" />
        </div>
      </div>

      {/* List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2 bg-card border border-border rounded-xl p-2.5 min-h-[420px]">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="sk w-9 h-9 rounded-full" />
                  <div className="flex flex-col gap-1.5">
                    <div className="sk h-[13px] w-20" />
                  </div>
                </div>
                <div className="sk h-[10px] w-10" />
              </div>
              <div className="sk h-[11px] w-40 mr-10" />
              <div className="flex items-center justify-between">
                <div className="sk h-[22px] w-14 rounded-md" />
                <div className="sk h-2 w-[72px] rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="col-span-2 hidden lg:flex bg-card border border-border rounded-xl min-h-[420px] items-center justify-center">
          <div className="sk w-16 h-16 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Animated Number ─────────────── */
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    const target = typeof value === "number" && !isNaN(value)
      ? Math.max(0, value)
      : 0
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
  return <>{display}</>
}

/* ─────────────── Score Bar ─────────────── */
function ScoreBar({ score, color, width = "w-10" }) {
  const safeScore = typeof score === "number" && !isNaN(score)
    ? Math.min(100, Math.max(0, score))
    : 0
  return (
    <div className="flex items-center gap-1.5">
      <div className={`${width} h-[3px] bg-border rounded-full overflow-hidden`}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${safeScore}%`, backgroundColor: color }} />
      </div>
      <span className="text-[12px] font-bold tabular-nums" style={{ color }}>{safeScore}%</span>
    </div>
  )
}

/* ─────────────── Stat Card ─────────────── */
function getPendingOrderSummary(conversation) {
  const summary = conversation?.context?.pendingOrderSummary
  return summary && typeof summary === "object" && summary.productName ? summary : null
}

function getConversationOrderAmount(conversation) {
  const pending = getPendingOrderSummary(conversation)
  const current = conversation?.context?.currentOrder
  const amount = conversation?.totalAmount ?? pending?.totalAmount ?? current?.totalAmount
  const number = Number(amount)
  return Number.isFinite(number) && number > 0 ? number : null
}

function formatOrderAmount(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return null
  return number.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

function PendingOrderInline({ conversation }) {
  const { language } = useLanguage()
  const pending = getPendingOrderSummary(conversation)
  if (!pending) return null
  const amount = formatOrderAmount(pending.totalAmount)
  return (
    <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
      <ShoppingBag size={11} className="shrink-0" />
      <span className="truncate">{language === "ar" ? "كتسنى التأكيد" : "À confirmer"}</span>
      {amount && <span className="shrink-0">· {amount} DH</span>}
    </span>
  )
}

function PendingOrderNotice({ conversation }) {
  const { language } = useLanguage()
  const pending = getPendingOrderSummary(conversation)
  if (!pending) return null
  const amount = formatOrderAmount(pending.totalAmount)
  const title = language === "ar" ? "طلبية كتسنى التأكيد" : "Commande à confirmer"
  const confirmText = language === "ar" ? "الزبون مازال ما أكدش الطلبية" : "Le client n'a pas encore confirmé"
  return (
    <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-amber-800">
      <ShoppingBag size={15} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-bold">{title}</p>
          {amount && <span className="shrink-0 text-[12px] font-bold">{amount} DH</span>}
        </div>
        <p className="truncate text-[12px] font-medium">{pending.productName}</p>
        <p className="text-[11px] text-amber-700/80">{confirmText}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, badge, icon: Icon, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div
      className="group bg-card border border-border rounded-xl p-3 sm:p-4 cursor-default transition-all duration-300 hover:border-brand-300 hover:shadow-lg hover:-translate-y-0.5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-secondary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <Icon size={16} className="text-brand-600" />
        </div>
        <span className="text-[11px] sm:text-[12px] font-semibold text-brand-600 bg-secondary border border-brand-200 px-1.5 py-0.5 rounded-md">
          {badge}
        </span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-brand-600 transition-colors duration-300 tabular-nums">
        <AnimatedNumber value={value} />
      </p>
      <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5 font-medium">{label}</p>
      <div className="mt-3 h-[2px] w-0 bg-brand-600 rounded-full group-hover:w-full transition-all duration-500 ease-out" />
    </div>
  )
}

/* ─────────────── Avatar ─────────────── */
function Avatar({ name, size = "sm" }) {
  const dims = size === "lg" ? "w-11 h-11 text-sm"
             : size === "md" ? "w-10 h-10 text-sm"
             : "w-9 h-9 text-sm"
  return (
    <div className="relative shrink-0">
      <div className="absolute -inset-[2px] rounded-full bg-brand-600" />
      <div className={`${dims} rounded-full bg-brand-600 flex items-center justify-center font-bold text-white relative`}>
        {getInitials(name)}
      </div>
    </div>
  )
}

/* ─────────────── Voice (WhatsApp media — مجاني عبر بروكسي) ─────────────── */
const VOICE_WAVEFORM_BARS = [9, 15, 22, 13, 28, 18, 34, 16, 25, 38, 20, 30, 14, 26, 18, 34, 12, 24, 16, 29, 14, 21]

function formatVoiceTime(value) {
  if (!Number.isFinite(value) || value < 0) return "0:00"
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function VoiceUnavailablePill() {
  const { t, language } = useLanguage()
  return (
    <div className="flex min-w-[190px] items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-brand-600">
        <Mic size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-foreground">{t('conv.voice_message')}</p>
        <p className="text-[10px] text-muted-foreground">{language === "ar" ? "الصوت غير متاح" : "Audio indisponible"}</p>
      </div>
    </div>
  )
}

function VoiceMessagePlayer({ conversationId, messageId, isAgent = false }) {
  const { t, language } = useLanguage()
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    let objectUrl
    const ac = new AbortController()
    ;(async () => {
      try {
        const token = getToken()
        if (!token) {
          setFailed(true)
          return
        }
        const res = await fetch(
          `/api/conversations/${conversationId}/messages/${messageId}/audio`,
          { headers: { Authorization: `Bearer ${token}` }, signal: ac.signal }
        )
        if (!res.ok) throw new Error("audio")
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      } catch {
        if (!ac.signal.aborted) setFailed(true)
      }
    })()
    return () => {
      ac.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [conversationId, messageId])

  const canSeek = duration > 0
  const progress = canSeek ? Math.min(currentTime / duration, 1) : 0

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      try {
        await audio.play()
      } catch {
        setFailed(true)
      }
    } else {
      audio.pause()
    }
  }

  const handleSeek = (event) => {
    const audio = audioRef.current
    if (!audio || !canSeek) return
    const next = Number(event.target.value)
    audio.currentTime = next
    setCurrentTime(next)
  }

  if (failed) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/5 px-3 py-2 text-[12px] text-red-600">
        <AlertCircle size={14} />
        <span>{language === "ar" ? "تعذر تشغيل الصوت" : `${t('conv.voice_message')} - audio unavailable`}</span>
      </div>
    )
  }
  if (!url) {
    return (
      <div className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-border bg-secondary/25 px-3 py-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600/10">
          <Loader2 size={15} className="animate-spin text-brand-600" aria-hidden />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="h-2 w-28 rounded-full bg-border/70" />
          <div className="h-2 w-20 rounded-full bg-border/50" />
        </div>
      </div>
    )
  }
  return (
    <div
      className={cn(
        "w-[min(292px,72vw)] rounded-2xl border px-3 py-1.5 shadow-sm",
        isAgent
          ? "border-border bg-card/70"
          : "border-brand-600/15 bg-brand-600/[0.06]"
      )}
    >
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (audioRef.current) audioRef.current.currentTime = 0
          setIsPlaying(false)
          setCurrentTime(0)
        }}
      />
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all active:scale-95",
            isAgent
              ? "bg-secondary text-foreground hover:bg-border/70"
              : "bg-brand-600 text-white hover:bg-brand-700"
          )}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ms-0.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="relative flex h-7 items-center">
            <div className="flex h-full w-full items-center gap-[2px]">
              {VOICE_WAVEFORM_BARS.map((height, index) => {
                const active = index / VOICE_WAVEFORM_BARS.length <= progress
                return (
                  <span
                    key={index}
                    className={cn(
                      "w-[3px] rounded-full transition-colors",
                      active ? "bg-brand-600" : "bg-muted-foreground/25"
                    )}
                    style={{ height: Math.max(6, Math.round(height * 0.72)) }}
                  />
                )
              })}
            </div>
            <input
              type="range"
              min="0"
              max={duration || 1}
              step="0.1"
              value={canSeek ? currentTime : 0}
              onChange={handleSeek}
              disabled={!canSeek}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
              aria-label="Audio progress"
            />
          </div>
          <div className="mt-0 flex items-center justify-between text-[10px] font-medium leading-none text-muted-foreground">
            <span>{t('conv.voice_message')}</span>
            <span className="tabular-nums">{formatVoiceTime(currentTime)} / {formatVoiceTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Media Attach Button with Preview ─────────────── */
function MediaAttachButton({ conversationId, disabled, onSent }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  // Preview state
  const [preview, setPreview] = useState(null) // { file, mediaType, url, name, size }

  const imageInputRef = useRef(null)
  const docInputRef = useRef(null)
  const menuRef = useRef(null)

  // Cleanup preview blob URL on unmount or change
  useEffect(() => {
    return () => {
      if (preview?.url?.startsWith("blob:")) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  // Close menu on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Compress image using Canvas API to reduce file size
  const compressImage = useCallback(async (file) => {
    return new Promise((resolve) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        let { width, height } = img
        const maxDim = 1600
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg", lastModified: Date.now()
          }))
        }, "image/jpeg", 0.8)
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
      img.src = objectUrl
    })
  }, [])

  const handleFileSelect = useCallback(async (file, mediaType) => {
    if (!file) return
    setOpen(false)
    setError(null)

    let processedFile = file

    // Always compress images to reduce upload size
    if (mediaType === "image") {
      processedFile = await compressImage(file)
    }

    // Create preview URL for images
    const url = mediaType === "image"
      ? URL.createObjectURL(processedFile) : null

    setPreview({ file: processedFile, mediaType, url, name: file.name, size: processedFile.size })
  }, [compressImage])

  const handleCancelPreview = useCallback(() => {
    if (preview?.url?.startsWith("blob:")) URL.revokeObjectURL(preview.url)
    setPreview(null)
    setError(null)
    if (imageInputRef.current) imageInputRef.current.value = ""
    if (docInputRef.current) docInputRef.current.value = ""
  }, [preview])

  const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024 // 4MB — safe margin for Vercel 4.5MB limit

  const handleSend = useCallback(async () => {
    if (!preview?.file || !conversationId) return
    setSending(true)
    setError(null)

    try {
      const token = getToken()
      const isLargeFile = preview.file.size > DIRECT_UPLOAD_LIMIT

      if (isLargeFile) {
        // ── Large file: upload directly to Cloudinary from browser ──
        // 1. Get signed upload credentials from our API (tiny request)
        const signRes = await fetch("/api/upload-media/sign", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
        const signData = await signRes.json()
        if (!signRes.ok) throw new Error(signData.error || t('conv.send_failed'))
        const { timestamp, signature, folder, api_key, cloud_name } = signData.data

        // 2. Upload directly to Cloudinary (bypasses Vercel 4.5MB limit)
        const cloudFd = new FormData()
        cloudFd.append("file", preview.file)
        cloudFd.append("timestamp", timestamp)
        cloudFd.append("signature", signature)
        cloudFd.append("folder", folder)
        cloudFd.append("api_key", api_key)
        cloudFd.append("resource_type", "auto")

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`,
          { method: "POST", body: cloudFd }
        )
        const cloudData = await cloudRes.json()
        if (!cloudRes.ok) throw new Error(cloudData.error?.message || t('conv.send_failed'))

        // 3. Send Cloudinary URL to our API (tiny JSON request)
        const res = await fetch(`/api/conversations/${conversationId}/send-media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaUrl: cloudData.secure_url,
            type: preview.mediaType,
            fileName: preview.name,
          }),
        })
        let data
        try { data = await res.json() } catch { data = {} }
        if (!res.ok) throw new Error(data.error || t('conv.send_failed'))
      } else {
        // ── Small file: send directly via FormData ──
        const fd = new FormData()
        fd.append("file", preview.file)
        fd.append("type", preview.mediaType)

        const res = await fetch(`/api/conversations/${conversationId}/send-media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })

        if (res.status === 413) throw new Error(t('conv.file_too_large'))

        let data
        try { data = await res.json() } catch { data = {} }
        if (!res.ok) throw new Error(data.error || t('conv.send_failed'))
      }

      handleCancelPreview()
      onSent?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }, [preview, conversationId, onSent, handleCancelPreview, DIRECT_UPLOAD_LIMIT, t])

  // Escape key to close preview
  useEffect(() => {
    if (!preview) return
    const handler = (e) => { if (e.key === "Escape") handleCancelPreview() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [preview, handleCancelPreview])

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, "image") }} />
        <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, "document") }} />

        {/* Attach button */}
        <button
          onClick={() => setOpen(prev => !prev)}
          disabled={disabled || sending}
          className={cn(
            "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            "bg-secondary border border-border text-muted-foreground",
            "hover:text-foreground hover:border-brand-400",
            "active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
            sending && "animate-pulse"
          )}
          title={t('conv.attach_file')}
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
        </button>

        {/* Dropdown menu */}
        {open && !sending && (
          <div className="absolute bottom-12 -left-2 z-50 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <ImageIcon size={15} className="text-brand-600" />
              {t('conv.media_image')}
              <span className="text-[10px] text-muted-foreground mr-auto">{t('conv.media_image_types')}</span>
            </button>
            <div className="h-px bg-border" />
            <button
              onClick={() => docInputRef.current?.click()}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <FileText size={15} className="text-brand-600" />
              {t('conv.media_document')}
              <span className="text-[10px] text-muted-foreground mr-auto">{t('conv.media_doc_types')}</span>
            </button>
          </div>
        )}

        {/* Error toast (only when no preview open) */}
        {error && !preview && (
          <div className="absolute bottom-12 -left-2 z-50 w-52 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
            <p className="text-[11px] text-red-600 font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* ── Preview Modal (Portal-style overlay) ── */}
      {preview && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleCancelPreview() }}>
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-brand-600" />
                <span className="text-[13px] font-semibold text-foreground">{t('conv.preview_title')}</span>
              </div>
              <button onClick={handleCancelPreview}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Preview content */}
            <div className="p-4">
              {/* Image preview */}
              {preview.mediaType === "image" && preview.url && (
                <div className="rounded-xl overflow-hidden border border-border bg-secondary/20 mb-3">
                  <img src={preview.url} alt={preview.name}
                    className="w-full max-h-[280px] object-contain bg-black/5" />
                </div>
              )}

              {/* Document preview */}
              {preview.mediaType === "document" && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/20 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-600/10 flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{preview.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatFileSize(preview.size)}</p>
                  </div>
                </div>
              )}

              {/* File info for image */}
              {preview.mediaType === "image" && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] text-muted-foreground truncate flex-1">{preview.name}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{formatFileSize(preview.size)}</span>
                </div>
              )}

              {/* Error inside modal */}
              {error && (
                <p className="text-[11px] text-red-600 font-medium mt-2">{error}</p>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-secondary/20">
              <button onClick={handleCancelPreview} disabled={sending}
                className="flex-1 px-3 py-2 rounded-xl text-[13px] font-medium text-muted-foreground
                  bg-secondary border border-border hover:text-foreground hover:bg-secondary/80 transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed">
                {t('common.cancel')}
              </button>
              <button onClick={handleSend} disabled={sending}
                className="flex-1 px-3 py-2 rounded-xl text-[13px] font-semibold text-white
                  bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all
                  disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {sending
                  ? <><Loader2 size={14} className="animate-spin" /> {t('conv.sending')}</>
                  : <><Send size={14} /> {t('conv.send_now')}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ─────────────── Image Message Viewer ─────────────── */
function ImageMessageViewer({ conversationId, messageId, mediaUrl = null }) {
  const { t } = useLanguage()
  const [src, setSrc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (mediaUrl) return
    if (!conversationId || !messageId) return
    let objectUrl = null
    const token = getToken()
    fetch(`/api/conversations/${conversationId}/messages/${messageId}/media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error()
        return res.blob()
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
        setLoading(false)
      })
      .catch(() => {
        setErrored(true)
        setLoading(false)
      })

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [conversationId, messageId, mediaUrl])

  const displaySrc = mediaUrl || src
  const isLoading = !mediaUrl && loading
  const hasErrored = !mediaUrl && errored

  if (isLoading) {
    return (
      <div className="w-48 h-32 bg-secondary/30 rounded-lg animate-pulse" />
    )
  }
  if (hasErrored || !displaySrc) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <ImageIcon size={14} />
        <span>{t('conv.image_load_failed')}</span>
      </div>
    )
  }

  return (
    <>
      <img
        src={displaySrc}
        alt={t('conv.media_image')}
        className="max-w-[240px] max-h-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
        onClick={() => setFullscreen(true)}
      />
      {fullscreen && (
        <div
          className="fixed inset-0 z-100 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={displaySrc}
            alt={t('conv.media_image')}
            className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

/* ─────────────── Document Message Viewer ─────────────── */
function DocumentMessageViewer({ conversationId, messageId, content, mediaUrl = null, documentFilename = null }) {
  const { t } = useLanguage()
  const [downloading, setDownloading] = useState(false)
  const filenameMatch = content?.match(/\[مستند:\s*(.+?)\]/)
  const filename = filenameMatch?.[1] || "document"
  const displayFilename = documentFilename || filename

  const handleDownload = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      const token = getToken()
      const res = await fetch(
        `/api/conversations/${conversationId}/messages/${messageId}/media`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = displayFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      console.error("Document download failed")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-2 bg-secondary/60 hover:bg-secondary border border-border rounded-lg px-3 py-2 transition-colors group"
    >
      <div className="w-8 h-8 rounded-lg bg-brand-600/10 flex items-center justify-center shrink-0">
        <FileText size={16} className="text-brand-600" />
      </div>
      <div className="text-right min-w-0">
        <p className="text-[12px] font-semibold text-foreground truncate max-w-[160px]">{displayFilename}</p>
        <p className="text-[10px] text-muted-foreground">
          {downloading ? t('conv.downloading') : t('conv.tap_to_download')}
        </p>
      </div>
      {downloading
        ? <Loader2 size={14} className="animate-spin text-brand-600 shrink-0" />
        : <Download size={14} className="text-muted-foreground group-hover:text-brand-600 shrink-0 transition-colors" />
      }
    </button>
  )
}

/* ─────────────── Video Message Viewer ─────────────── */
function VideoMessageViewer({ conversationId, messageId, mediaUrl = null }) {
  const { t } = useLanguage()
  const [src, setSrc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    if (mediaUrl) return
    if (!conversationId || !messageId) return
    let objectUrl = null
    const token = getToken()
    fetch(`/api/conversations/${conversationId}/messages/${messageId}/media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error()
        return res.blob()
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
        setLoading(false)
      })
      .catch(() => {
        setErrored(true)
        setLoading(false)
      })

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [conversationId, messageId, mediaUrl])

  const displaySrc = mediaUrl || src
  const isLoading = !mediaUrl && loading
  const hasErrored = !mediaUrl && errored

  if (isLoading) {
    return (
      <div className="w-48 h-32 bg-secondary/30 rounded-lg animate-pulse" />
    )
  }
  if (hasErrored || !displaySrc) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Video size={14} />
        <span>{t('conv.video_load_failed')}</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-black max-w-[280px]">
      <video src={displaySrc} controls preload="metadata" className="w-full max-h-[200px] object-contain" />
    </div>
  )
}

/* ─────────────── Message Bubble ─────────────── */
const MEDIA_TAGS = {
  image: ["[صورة]", "[ØµÙˆØ±Ø©]", "[Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©]"],
  video: ["[فيديو]", "[ÙÙŠØ¯ÙŠÙˆ]", "[Ã™ÂÃ™Å Ã˜Â¯Ã™Å Ã™Ë†]"],
  voice: ["[رسالة صوتية]", "[Ø±Ø³Ø§Ù„Ø© ØµÙˆØªÙŠØ©]", "[Ã˜Â±Ã˜Â³Ã˜Â§Ã™â€žÃ˜Â© Ã˜ÂµÃ™Ë†Ã˜ÂªÃ™Å Ã˜Â©]"],
  document: ["[مستند:", "[Ù…Ø³ØªÙ†Ø¯:", "[Ã™â€¦Ã˜Â³Ã˜ÂªÃ™â€ Ã˜Â¯:"],
}

function firstMatchingTag(content, tags) {
  return tags.find(tag => content.startsWith(tag)) || null
}

function extractMediaUrl(content) {
  return content.match(/https?:\/\/\S+/i)?.[0] || null
}

function stripMediaTag(content, tag) {
  return tag ? content.slice(tag.length).trim() : content
}

function stripMediaUrl(content, mediaUrl) {
  return mediaUrl ? content.replace(mediaUrl, "").trim() : content.trim()
}

function getDocumentFilename(content) {
  const match = content.match(/\[(?:مستند|Ù…Ø³ØªÙ†Ø¯|Ã™â€¦Ã˜Â³Ã˜ÂªÃ™â€ Ã˜Â¯):\s*(.+?)\]/)
  return match?.[1] || "document"
}

function getMediaInfo(msg) {
  const content = String(msg?.content || "").trim()
  const imageTag = firstMatchingTag(content, MEDIA_TAGS.image)
  const videoTag = firstMatchingTag(content, MEDIA_TAGS.video)
  const documentTag = firstMatchingTag(content, MEDIA_TAGS.document)
  const voiceTag = firstMatchingTag(content, MEDIA_TAGS.voice)
  const mediaUrl = extractMediaUrl(content)
  const hasSource = Boolean(msg?.whatsappMediaId || mediaUrl)

  const isImage = Boolean(imageTag && hasSource)
  const isVideo = Boolean(videoTag && hasSource)
  const isDocument = Boolean(documentTag && hasSource)
  const isVoice = Boolean(voiceTag && msg?.whatsappMediaId)
  const isCustomerImage = Boolean(imageTag && !hasSource)
  const isCustomerVideo = Boolean(videoTag && !hasSource)
  const isCustomerVoice = Boolean(voiceTag && !msg?.whatsappMediaId)
  const isTranscribedVoice = Boolean(
    msg?.whatsappMediaId &&
    msg?.role === "USER" &&
    content &&
    !content.startsWith("[") &&
    !isImage &&
    !isVideo &&
    !isDocument &&
    !isVoice
  )

  const imageCaption = isImage
    ? stripMediaUrl(stripMediaTag(content, imageTag), mediaUrl)
    : ""

  return {
    isImage,
    isVideo,
    isDocument,
    isVoice,
    isCustomerImage,
    isCustomerVideo,
    isCustomerVoice,
    isTranscribedVoice,
    mediaUrl,
    imageCaption,
    documentFilename: getDocumentFilename(content),
  }
}

const BAD_CUSTOMER_DISPLAY_RE = /\b(?:rah|ra|rani|hani|sift|syft|siftlik|syftlik|siftlek|smyti|smiti|smiyti|smitiya|name|nom|sent|send|already|deja|déjà|عطيتك|رسلت|رسلتلك|صيفطت|صيفطتلك|سميتي|الاسم|الإسم|قبل|من\s*قبل|راه|ها|هادي|هدا)\b/i

function getCustomerDisplayName(customer) {
  const name = String(customer?.name || "").trim()
  const phone = String(customer?.phone || "").trim()
  if (!name) return phone || "Client"
  if (BAD_CUSTOMER_DISPLAY_RE.test(name.toLowerCase())) return phone || "Client"
  if (/[؟?!]/.test(name)) return phone || "Client"
  return name
}

function copyTextToClipboard(text) {
  const value = String(text || "").trim()
  if (!value) return Promise.resolve(false)

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value).then(() => true)
  }

  if (typeof document === "undefined") return Promise.resolve(false)

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.style.position = "absolute"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()

  let success = false
  try {
    success = document.execCommand("copy")
  } catch {
    success = false
  } finally {
    document.body.removeChild(textarea)
  }

  return Promise.resolve(success)
}

function getMessageCopyText(msg, t) {
  const contentStr = String(msg?.content || "").trim()
  if (!contentStr) return ""

  const mediaInfo = getMediaInfo(msg)
  if (mediaInfo.isImage || mediaInfo.isCustomerImage) {
    return mediaInfo.imageCaption || t('conv.media_image')
  }
  if (mediaInfo.isVideo || mediaInfo.isCustomerVideo) {
    return t('conv.media_video')
  }
  if (mediaInfo.isVoice || mediaInfo.isCustomerVoice) {
    return t('conv.voice_message')
  }
  if (mediaInfo.isDocument) {
    return mediaInfo.documentFilename || t('conv.media_document')
  }
  if (mediaInfo.isTranscribedVoice) {
    return t('conv.voice_message')
  }

  const isImage = contentStr.startsWith("[صورة]") && msg?.whatsappMediaId
  const isVideo = contentStr.startsWith("[فيديو]") && msg?.whatsappMediaId
  const isDocument = contentStr.startsWith("[مستند:") && msg?.whatsappMediaId
  const isVoice = contentStr === "[رسالة صوتية]" && msg?.whatsappMediaId
  const isCustomerImage = contentStr === "[صورة]" && !msg?.whatsappMediaId
  const isCustomerVoice = contentStr === "[رسالة صوتية]" && !msg?.whatsappMediaId
  const isCustomerVideo = contentStr === "[فيديو]" && !msg?.whatsappMediaId

  if (isImage) {
    return contentStr.replace(/^\[صورة\]\s*/, "").trim() || t('conv.media_image')
  }

  if (isVideo || isCustomerVideo) {
    return t('conv.media_video')
  }

  if (isVoice || isCustomerVoice) {
    return t('conv.voice_message')
  }

  if (isDocument) {
    const filenameMatch = contentStr.match(/\[مستند:\s*(.+?)\]/)
    return filenameMatch?.[1] || t('conv.media_document')
  }

  if (isCustomerImage) {
    return t('conv.media_image')
  }

  return contentStr
}

function MessageBubble({ msg, customerName, conversationId }) {
  const { t } = useLanguage()
  const isAgent = msg.role === "AGENT"
  const contentStr = String(msg.content || "").trim()

  // Detect message types
  const isImage = contentStr.startsWith("[صورة]") && msg.whatsappMediaId
  const isVideo = contentStr.startsWith("[فيديو]") && msg.whatsappMediaId  // ✅ Add video detection
  const isDocument = contentStr.startsWith("[مستند:") && msg.whatsappMediaId
  const isVoice = contentStr === "[رسالة صوتية]" && msg.whatsappMediaId
  const isCustomerImage = contentStr === "[صورة]" && !msg.whatsappMediaId
  const isCustomerVoice = contentStr === "[رسالة صوتية]" && !msg.whatsappMediaId
  const isCustomerVideo = contentStr === "[فيديو]" && !msg.whatsappMediaId  // ✅ Customer video without mediaId

  // Show voice player for messages with whatsappMediaId that are voice
  const showVoice = Boolean(isVoice && conversationId)

  // Caption text after the tag
  const imageCaption = isImage ? contentStr.replace(/^\[صورة\]\s*/, "").trim() : ""

  return (
    <div className={cn("flex gap-2 items-end",
      !isAgent && "flex-row-reverse")}>
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
        isAgent
          ? "bg-secondary text-foreground border border-border"
          : "bg-card text-foreground border border-border"
      )}>
        {isAgent ? "و" : getInitials(customerName)}
      </div>
      <div className={cn(
        "rounded-2xl px-2.5 py-1.5 text-[13px] max-w-[78%] leading-relaxed whitespace-pre-wrap break-words",
        isAgent
          ? "bg-secondary text-foreground border border-border rounded-tl-sm"
          : "bg-card text-foreground border border-border rounded-tr-sm"
      )}>
        {isImage ? (
          <div className="flex flex-col gap-1.5">
            <ImageMessageViewer
              conversationId={conversationId}
              messageId={msg.id}
            />
            {imageCaption && (
              <span className="text-[12px] text-muted-foreground">{imageCaption}</span>
            )}
          </div>
        ) : isVideo ? (
          <div className="flex flex-col gap-1.5">
            <VideoMessageViewer
              conversationId={conversationId}
              messageId={msg.id}
            />
          </div>
        ) : isDocument ? (
          <DocumentMessageViewer
            conversationId={conversationId}
            messageId={msg.id}
            content={msg.content}
          />
        ) : showVoice ? (
          <div className="flex flex-col gap-1.5">
            <VoiceMessagePlayer
              conversationId={conversationId}
              messageId={msg.id}
              isAgent={isAgent}
            />
          </div>
        ) : isCustomerImage ? (
          <div className="flex items-center gap-1.5">
            <ImageIcon size={12} className="text-muted-foreground shrink-0" />
            <span className="text-[12px] italic text-muted-foreground">{t('conv.media_image')}</span>
          </div>
        ) : isCustomerVoice ? (
          <VoiceUnavailablePill />
        ) : isCustomerVideo ? (
          <div className="flex items-center gap-1.5">
            <Video size={12} className="text-muted-foreground shrink-0" />
            <span className="text-[12px] italic text-muted-foreground">{t('conv.media_video')}</span>
          </div>
        ) : (
          msg.content
        )}
      </div>
    </div>
  )
}

function ActionableMessageBubble({
  msg,
  customerName,
  conversationId,
  onCopyMessage,
  onDeleteMessage,
  deletingMessageId,
}) {
  const { t } = useLanguage()
  const isAgent = msg.role === "AGENT"
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const actionRef = useRef(null)
  const longPressRef = useRef(null)
  const canDelete = Boolean(onDeleteMessage && msg?.id && !String(msg.id).startsWith("temp-"))
  const isDeleting = deletingMessageId === msg.id

  const mediaInfo = getMediaInfo(msg)
  const {
    isImage,
    isVideo,
    isDocument,
    isVoice,
    isCustomerImage,
    isCustomerVoice,
    isCustomerVideo,
    isTranscribedVoice,
    mediaUrl,
    imageCaption,
    documentFilename,
  } = mediaInfo
  const showVoice = Boolean(isVoice && conversationId)

  useEffect(() => {
    if (!menuOpen) return

    const handleOutsideClick = (event) => {
      if (actionRef.current && !actionRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("touchstart", handleOutsideClick)

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("touchstart", handleOutsideClick)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(timer)
  }, [copied])

  useEffect(() => () => {
    if (longPressRef.current) clearTimeout(longPressRef.current)
  }, [])

  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }

  const handleTouchStart = () => {
    clearLongPress()
    longPressRef.current = setTimeout(() => {
      setMenuOpen(true)
      longPressRef.current = null
    }, 450)
  }

  const handleCopyClick = async () => {
    const textToCopy = getMessageCopyText(msg, t)
    const success = await (onCopyMessage
      ? onCopyMessage(msg, textToCopy)
      : copyTextToClipboard(textToCopy))

    if (success) {
      setCopied(true)
      setMenuOpen(false)
    }
  }

  return (
    <div className={cn("flex gap-2 items-end", !isAgent && "flex-row-reverse")}>
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
        isAgent
          ? "bg-secondary text-foreground border border-border"
          : "bg-card text-foreground border border-border"
      )}>
        {isAgent ? "و" : getInitials(customerName)}
      </div>

      <div
        ref={actionRef}
        className="relative max-w-[78%] group/message"
        onTouchStart={handleTouchStart}
        onTouchEnd={clearLongPress}
        onTouchMove={clearLongPress}
        onTouchCancel={clearLongPress}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(prev => !prev)}
          className={cn(
            "absolute -top-2 z-10 w-7 h-7 rounded-full border border-border bg-card/95 backdrop-blur-sm",
            "items-center justify-center text-muted-foreground shadow-sm transition-all",
            "hover:text-foreground hover:border-brand-300 active:scale-95",
            menuOpen ? "flex opacity-100" : "opacity-0 group-hover/message:opacity-100 md:flex",
            isAgent ? "-right-2" : "-left-2"
          )}
          title={t('conv.message_actions')}
        >
          <MoreVertical size={14} />
        </button>

        {menuOpen && (
          <div
            className={cn(
              "absolute -top-12 z-20 flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-1 shadow-lg",
              isAgent ? "right-0" : "left-0"
            )}
          >
            <button
              type="button"
              onClick={handleCopyClick}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-brand-600 hover:bg-secondary transition-colors"
              title={t('common.copy')}
            >
              {copied ? <Check size={14} className="text-brand-600" /> : <Copy size={14} />}
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onDeleteMessage?.(msg)
                }}
                disabled={isDeleting}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('common.delete')}
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin text-red-600" /> : <Trash2 size={14} />}
              </button>
            )}
          </div>
        )}

        <div className={cn(
          "rounded-2xl px-2.5 py-1.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words",
          isAgent
            ? "bg-secondary text-foreground border border-border rounded-tl-sm"
            : "bg-card text-foreground border border-border rounded-tr-sm"
        )}>
          {isImage ? (
            <div className="flex flex-col gap-1.5">
              <ImageMessageViewer conversationId={conversationId} messageId={msg.id} mediaUrl={mediaUrl} />
              {imageCaption && (
                <span className="text-[12px] text-muted-foreground">{imageCaption}</span>
              )}
            </div>
          ) : isVideo ? (
            <div className="flex flex-col gap-1.5">
              <VideoMessageViewer conversationId={conversationId} messageId={msg.id} mediaUrl={mediaUrl} />
            </div>
          ) : isDocument ? (
            <DocumentMessageViewer
              conversationId={conversationId}
              messageId={msg.id}
              content={msg.content}
              mediaUrl={mediaUrl}
              documentFilename={documentFilename}
            />
          ) : showVoice ? (
            <div className="flex flex-col gap-1.5">
            <VoiceMessagePlayer conversationId={conversationId} messageId={msg.id} isAgent={isAgent} />
            </div>
          ) : isTranscribedVoice ? (
            <div className="flex flex-col gap-1.5">
              <VoiceMessagePlayer conversationId={conversationId} messageId={msg.id} isAgent={isAgent} />
            </div>
          ) : isCustomerImage ? (
            <div className="flex items-center gap-1.5">
              <ImageIcon size={12} className="text-muted-foreground shrink-0" />
              <span className="text-[12px] italic text-muted-foreground">{t('conv.media_image')}</span>
            </div>
          ) : isCustomerVoice ? (
            <VoiceUnavailablePill />
          ) : isCustomerVideo ? (
            <div className="flex items-center gap-1.5">
              <Video size={12} className="text-muted-foreground shrink-0" />
              <span className="text-[12px] italic text-muted-foreground">{t('conv.media_video')}</span>
            </div>
          ) : (
            msg.content
          )}
        </div>
      </div>
    </div>
  )
}

function MessagesSkeleton() {
  const rows = [
    { side: "left", width: "w-[72%]", lines: ["w-[82%]", "w-[55%]"] },
    { side: "right", width: "w-[58%]", lines: ["w-[76%]"] },
    { side: "left", width: "w-[66%]", lines: ["w-[88%]", "w-[48%]"] },
    { side: "right", width: "w-[44%]", lines: ["w-[64%]"] },
    { side: "left", width: "w-[60%]", lines: ["w-[72%]", "w-[38%]"] },
  ]

  return (
    <div className="flex flex-col gap-3 px-1 py-2" aria-hidden="true">
      {rows.map((row, index) => (
        <div
          key={index}
          className={cn(
            "flex w-full",
            row.side === "right" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "rounded-2xl px-4 py-3 shadow-sm animate-pulse",
              row.width,
              row.side === "right"
                ? "rounded-br-md bg-brand-600/20"
                : "rounded-bl-md bg-secondary border border-border"
            )}
          >
            <div className="flex flex-col gap-2">
              {row.lines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  className={cn(
                    "h-2.5 rounded-full",
                    line,
                    row.side === "right" ? "bg-brand-600/25" : "bg-muted-foreground/15"
                  )}
                />
              ))}
              <div
                className={cn(
                  "mt-1 h-2 rounded-full self-end",
                  row.side === "right" ? "w-10 bg-brand-600/20" : "w-8 bg-muted-foreground/10"
                )}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Scrolls to newest messages when opening a thread or when messages update */
function ConversationMessagesScroll({
  className,
  conversationId,
  messages,
  messagesLoading,
  messagesError,
  onRetryMessages,
  customerName,
  onCopyMessage,
  onDeleteMessage,
  deletingMessageId,
}) {
  const { t } = useLanguage()
  const scrollRef = useRef(null)
  const last = messages[messages.length - 1]
  const scrollKey = last
    ? `${messages.length}:${last.id ?? ""}:${last.createdAt ?? ""}`
    : `${messages.length}`

  useLayoutEffect(() => {
    if (messagesError) return
    const el = scrollRef.current
    if (!el || messages.length === 0) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [conversationId, messagesError, scrollKey])

  return (
    <div ref={scrollRef} className={className}>
      {messagesLoading ? (
        <MessagesSkeleton />
      ) : messagesError ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 min-h-[120px]">
          <AlertCircle size={20} className="text-red-500" />
          <p className="text-xs text-muted-foreground">{messagesError}</p>
          <button
            type="button"
            onClick={onRetryMessages}
            className="text-xs text-brand-600 hover:text-brand-800 transition-colors">
            {t('common.retry')}
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-[14px] text-muted-foreground min-h-[120px]">
          {t('conv.no_messages')}
        </div>
      ) : (
        messages.map(msg => (
          <ActionableMessageBubble
            key={msg.id || `${msg.role}-${msg.createdAt}`}
            msg={msg}
            customerName={customerName}
            conversationId={conversationId}
            onCopyMessage={onCopyMessage}
            onDeleteMessage={onDeleteMessage}
            deletingMessageId={deletingMessageId}
          />
        ))
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════
   FILTER CONFIG
════════════════════════════════════════════════ */
const STAGE_FILTERS = {
  product: [
    { key: "all",       labelKey: "conv.filter_all"      },
    { key: "PITCHING",  labelKey: "conv.filter_pitching"  },
    { key: "OBJECTION", labelKey: "conv.filter_objection" },
    { key: "CLOSING",   labelKey: "conv.filter_closing"   },
    { key: "RECOVERY",  labelKey: "recovery"              },
    { key: "CLOSED",    labelKey: "conv.filter_closed"    },
  ],
}

function recoveryLabel(language) {
  return language === "ar" ? "متابعة" : "Relance"
}

function recoveryReasonLabel(reason, language) {
  const ar = {
    unanswered_customer: "رسالة زبون بلا جواب",
    almost_closed: "قريبة من التأكيد",
    stale_conversation: "محادثة متوقفة",
  }
  const fr = {
    unanswered_customer: "Client sans réponse",
    almost_closed: "Presque confirmée",
    stale_conversation: "Conversation inactive",
  }
  return (language === "ar" ? ar : fr)[reason] || recoveryLabel(language)
}

/* ════════════════════════════════════════════════
   Main Page
════════════════════════════════════════════════ */
function ConversationsContent() {
  const { t } = useLanguage()
  const getStageLabel = useStageLabel()
  const searchParams = useSearchParams()
  const [conversations, setConversations]       = useState([])
  const [loading, setLoading]                   = useState(true)
  const [error, setError]                       = useState(null)
  const [filter, setFilter]                     = useState("all")
  const [search, setSearch]                     = useState("")
  const [selected, setSelected]                 = useState(null)
  const [messages, setMessages]                 = useState([])
  const [messagesLoading, setMessagesLoading]   = useState(false)
  const [messagesError, setMessagesError]       = useState(null)
  const [deleteModal, setDeleteModal]           = useState({ open: false, id: null, name: "" })
  const [messageDeleteDialog, setMessageDeleteDialog] = useState({ open: false, messageId: null, preview: "" })
  const [deletingMessageId, setDeletingMessageId] = useState(null)
  const [agentIsActive, setAgentIsActive]       = useState(true)
  const [replyText, setReplyText]               = useState("")
  const [replySending, setReplySending]         = useState(false)
  const [replyError, setReplyError]             = useState(null)
  const [newMsgToast, setNewMsgToast]           = useState(null)
  const prevConvsRef     = useRef(null)
  const selectedRef      = useRef(null)
  const toastTimerRef    = useRef(null)
  const hasAutoSelectedRef = useRef(false)
  const router = useRouter()

  const handleDeleteConversation = useCallback((id, name) => {
    setDeleteModal({ open: true, id, name })
  }, [])

  const handleManualReply = useCallback(async () => {
    if (!replyText.trim() || !selected?.id) return
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      role: "AGENT",
      content: replyText.trim(),
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, optimisticMsg])
    const textToSend = replyText.trim()
    setReplyText("")
    try {
      setReplySending(true)
      setReplyError(null)
      const token = getToken()
      const res = await fetch(`/api/conversations/${selected.id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ message: textToSend }),
      })
      const data = await res.json()
      if (!res.ok) {
        // rollback optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
        setReplyText(textToSend)
        throw new Error(data.error || t('conv.send_failed'))
      }
      // replace optimistic with real message
      setMessages(prev => prev.map(m =>
        m.id === optimisticMsg.id ? data.data : m
      ))
    } catch (err) {
      setReplyError(err.message)
    } finally {
      setReplySending(false)
    }
  }, [replyText, selected?.id, t])

  // 🔧 FIX: Callback to refresh messages after sending voice
  // 📍 LOCATION: ConversationsContent, after handleManualReply
  const handleCopyMessage = useCallback(async (_msg, textToCopy) => {
    return copyTextToClipboard(textToCopy)
  }, [])

  const handleDeleteMessage = useCallback((message) => {
    setMessageDeleteDialog({
      open: true,
      messageId: message?.id || null,
      preview: getMessageCopyText(message, t),
    })
  }, [t])

  const cancelDeleteMessage = useCallback(() => {
    setMessageDeleteDialog({ open: false, messageId: null, preview: "" })
  }, [])

  const confirmDeleteMessage = useCallback(async () => {
    if (!selected?.id || !messageDeleteDialog.messageId || deletingMessageId) return

    try {
      setDeletingMessageId(messageDeleteDialog.messageId)
      const token = getToken()
      const res = await fetch(
        `/api/conversations/${selected.id}/messages/${messageDeleteDialog.messageId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t('conv.message_delete_failed'))
      }

      const conversationData = data.data?.conversation
      setMessages(prev => prev.filter(message => message.id !== messageDeleteDialog.messageId))
      setSelected(prev => (
        prev?.id === selected.id && conversationData
          ? { ...prev, updatedAt: conversationData.updatedAt }
          : prev
      ))
      setConversations(prev => prev.map((conversation) => {
        if (conversation.id !== selected.id) return conversation

        return {
          ...conversation,
          updatedAt: conversationData?.updatedAt || conversation.updatedAt,
          messages: conversationData?.lastMessage ? [conversationData.lastMessage] : [],
          _count: {
            ...conversation._count,
            messages: conversationData?.messagesCount ?? Math.max((conversation._count?.messages || 1) - 1, 0),
          },
        }
      }))
      setMessageDeleteDialog({ open: false, messageId: null, preview: "" })
    } catch (err) {
      console.error("Delete message failed:", err)
      setReplyError(t('conv.message_delete_failed') || "فشل حذف الرسالة")
      setTimeout(() => setReplyError(null), 4000)
    } finally {
      setDeletingMessageId(null)
    }
  }, [deletingMessageId, messageDeleteDialog.messageId, selected?.id, t])

  const handleRefreshMessages = useCallback(async () => {
    if (!selected?.id) return
    try {
      const res = await conversationsAPI.getById(selected.id)
      if (res?.data?.messages) {
        setMessages(res.data.messages)
        console.log(`✅ Messages refreshed: ${res.data.messages.length} messages`)
      }
    } catch (err) {
      console.error("❌ Failed to refresh messages:", err)
      // لا نعرض رسالة خطأ هنا — فقط silent fail
      // البولينج سيحدّث الرسائل في خلال 3 ثوان
    }
  }, [selected?.id])

  const confirmDelete = useCallback(async () => {
    const { id } = deleteModal
    if (!id) return
    try {
      await conversationsAPI.delete(id)
      setConversations(prev => prev.filter(c => c.id !== id))
      if (selected?.id === id) { setSelected(null); setMessages([]) }
      setDeleteModal({ open: false, id: null, name: "" })
    } catch (err) {
      console.error("Delete conversation failed:", err)
      // Keep modal open so user can retry; surface error in UI
      setError(t('conv.delete_failed') || "فشل حذف المحادثة")
      setTimeout(() => setError(null), 4000)
      setDeleteModal({ open: false, id: null, name: "" })
    }
  }, [deleteModal, selected, t])

  const cancelDelete = useCallback(() => {
    setDeleteModal({ open: false, id: null, name: "" })
  }, [])

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const response = await conversationsAPI.getAll({})
      const convs = response.data?.conversations || []
      setConversations(convs)
      prevConvsRef.current = Object.fromEntries(convs.map(c => [c.id, c.updatedAt]))
    } catch {
      setError("load_error")
    } finally {
      setLoading(false)
    }
  }, [])

  const pollConversations = useCallback(async () => {
    if (!prevConvsRef.current || !getToken()) return
    // Skip when tab hidden — avoid wasted bandwidth/battery
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return
    try {
      const response = await conversationsAPI.getAll({})
      const newConvs = response.data?.conversations || []
      for (const conv of newConvs) {
        const prevUpdatedAt = prevConvsRef.current[conv.id]
        if (prevUpdatedAt === undefined) continue
        if (
          prevUpdatedAt !== conv.updatedAt &&
          !conv.isRead &&
          selectedRef.current?.id !== conv.id
        ) {
          setNewMsgToast(conv)
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
          toastTimerRef.current = setTimeout(() => setNewMsgToast(null), 8000)
          break
        }
      }
      prevConvsRef.current = Object.fromEntries(newConvs.map(c => [c.id, c.updatedAt]))
      setConversations(newConvs)
    } catch (err) {
      console.warn("pollConversations failed — will retry next tick:", err?.message)
    }
  }, [])

  const handleToastOpen = useCallback((conv) => {
    setSelected(conv)
    setNewMsgToast(null)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  const handleToastClose = useCallback(() => {
    setNewMsgToast(null)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  useEffect(() => {
    const interval = setInterval(pollConversations, 4000)
    return () => clearInterval(interval)
  }, [pollConversations])

  useEffect(() => { selectedRef.current = selected }, [selected])

  // Mark conversation as read when opened (so sidebar badge clears)
  useEffect(() => {
    if (!selected?.id) return
    if (selected.isRead) return

    // Optimistic UI: clear "new" badge immediately
    setSelected(prev => (prev?.id === selected.id ? { ...prev, isRead: true } : prev))
    setConversations(prev =>
      prev.map(c => (c.id === selected.id ? { ...c, isRead: true } : c))
    )

    conversationsAPI
      .update(selected.id, { isRead: true })
      .then(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("sb:counts-refresh"))
        }
      })
      .catch(() => {
        // If it fails, we keep optimistic state; next poll will reconcile.
      })
  }, [selected?.id, selected?.isRead])

  useEffect(() => {
    if (!selected?.id) return
    setNewMsgToast(prev => prev?.id === selected.id ? null : prev)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [selected?.id])

  useEffect(() => {
    const tick = async () => {
      const token = getToken()
      if (!token) return
      try {
        const res = await fetch("/api/agent", {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setAgentIsActive(data.data?.isActive ?? true)
      } catch {}
    }
    tick()
    const interval = setInterval(tick, 10000)
    return () => clearInterval(interval)
  }, [])

  // Auto-select from URL ?id= param — runs once then clears URL
  useEffect(() => {
    if (hasAutoSelectedRef.current) return
    const targetId = searchParams?.get("id")
    if (!targetId || conversations.length === 0) return
    const match = conversations.find(c => c.id === targetId)
    if (!match) return
    
    hasAutoSelectedRef.current = true
    setFilter("all")
    setSelected(match)
    
    // Clear ?id= from URL so polling won't re-select after user exits
    const newUrl = window.location.pathname
    router.replace(newUrl, { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, searchParams])

  useEffect(() => {
    if (!selected?.id) { setMessages([]); setMessagesError(null); return }
    setReplyText("")
    setReplyError(null)
    setMessagesLoading(true)  // Show spinner while fetching new thread
    ;(async () => {
      try {
        setMessagesError(null)
        const res = await conversationsAPI.getById(selected.id)
        setMessages(res.data?.messages || [])
      } catch (err) {
        setMessages([])
        setMessagesError(t('conv.messages_load_failed'))
        console.error("Fetch messages error:", err)
      }
      finally { setMessagesLoading(false) }
    })()
  }, [selected?.id, t])

  // Refresh open thread whenever AI is on OR off — WhatsApp messages must appear without refresh
  useEffect(() => {
    if (!selected?.id) return
    let cancelled = false
    const tick = async () => {
      if (!getToken()) return
      // Skip when tab hidden — resume on focus
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return
      try {
        const res = await conversationsAPI.getById(selected.id)
        if (cancelled) return
        const conversation = res.data || null
        const incoming = res.data?.messages || []
        if (conversation) {
          setSelected(prev => (
            prev?.id === conversation.id
              ? {
                  ...prev,
                  ...conversation,
                  messages: prev.messages,
                }
              : prev
          ))
          setConversations(prev => prev.map(conv => (
            conv.id === conversation.id
              ? {
                  ...conv,
                  ...conversation,
                  messages: conversation.messages?.length
                    ? [conversation.messages[conversation.messages.length - 1]]
                    : conv.messages,
                  _count: {
                    ...conv._count,
                    messages: conversation.messages?.length ?? conv._count?.messages,
                  },
                }
              : conv
          )))
        }
        setMessages(prev => {
          const a = prev[prev.length - 1]
          const b = incoming[incoming.length - 1]
          if (incoming.length !== prev.length || a?.id !== b?.id || a?.content !== b?.content) {
            return incoming
          }
          return prev
        })
      } catch (err) {
        if (!cancelled) console.warn("Message poll failed:", err?.message)
      }
    }
    const interval = setInterval(tick, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [selected?.id])

  const productConvs = useMemo(() =>
    conversations.filter(c => c.stage !== "ARCHIVED"),
    [conversations])

  const activeConvs = productConvs

  const filtered = useMemo(() => {
    let result = activeConvs
    if (filter === "RECOVERY") {
      result = result.filter(c => c.recovery?.needsRecovery)
    } else if (filter !== "all") {
      result = result.filter(c => c.stage === filter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(c =>
        getCustomerDisplayName(c.customer).toLowerCase().includes(q) ||
        c.customer?.phone?.includes(q)  // phone is numeric — no case folding needed
      )
    }
    return result
  }, [activeConvs, filter, search])

  const unreadCount = conversations.filter(c => !c.isRead).length

  const filterButtons = useMemo(() =>
    STAGE_FILTERS.product.map(f => ({
      ...f,
      count: f.key === "all"
        ? activeConvs.length
        : f.key === "RECOVERY"
          ? activeConvs.filter(c => c.recovery?.needsRecovery).length
          : activeConvs.filter(c => c.stage === f.key).length
    }))
  , [activeConvs])

  const stats = useMemo(() => ({
    total:     activeConvs.length,
    closed:    activeConvs.filter(c => c.stage === "CLOSED").length,
    pitching:  activeConvs.filter(c => c.stage === "PITCHING").length,
    objection: activeConvs.filter(c => c.stage === "OBJECTION").length,
    recovery:  activeConvs.filter(c => c.recovery?.needsRecovery).length,
  }), [activeConvs])

  if (loading) return <ConversationsSkeleton />

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 rounded-full border border-red-200 bg-red-50 flex items-center justify-center">
        <AlertCircle size={22} className="text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{t('common.load_error')}</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
      <button onClick={fetchConversations}
        className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors">
        <RefreshCw size={15} /> {t('common.retry')}
      </button>
    </div>
  )

  /* Mobile full-screen detail */
  if (selected) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex flex-col lg:hidden bg-card">
          <div className="flex items-center gap-3 px-3 py-3 border-b border-border bg-card/95 backdrop-blur-sm shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
            <button onClick={() => { setSelected(null); setMessages([]) }}
              className="flex items-center gap-1 text-brand-600 font-semibold text-sm shrink-0">
              <ChevronRight size={22} />
              {unreadCount > 0 && (
                <span className="text-[12px] text-muted-foreground font-normal">{unreadCount}</span>
              )}
            </button>
            <Avatar name={getCustomerDisplayName(selected.customer)} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-foreground truncate">{getCustomerDisplayName(selected.customer)}</p>
              <p className="text-[12px] text-muted-foreground">{selected.customer?.phone}</p>
            </div>
            <span className={cn("text-[12px] font-semibold px-2 py-0.5 rounded-md border",
              getStageClassName(selected.stage, selected.type))}>
              {getStageLabel(selected.stage, selected.type, t)}
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-secondary/20 shrink-0">
            <span className="text-[12px] text-muted-foreground font-medium">{t('conv.score')}</span>
            <div className="flex-1 h-[3px] bg-border rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${selected.score}%`, backgroundColor: getScoreColor(selected.score) }} />
            </div>
            <span className="text-[13px] font-bold tabular-nums shrink-0"
              style={{ color: getScoreColor(selected.score) }}>
              {selected.score}%
            </span>
          </div>
          <PendingOrderNotice conversation={selected} />
          <ConversationMessagesScroll
            className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0"
            conversationId={selected.id}
            messages={messages}
            messagesLoading={messagesLoading}
            messagesError={messagesError}
            onRetryMessages={() => setSelected({ ...selected })}
            customerName={getCustomerDisplayName(selected.customer)}
            onCopyMessage={handleCopyMessage}
            onDeleteMessage={handleDeleteMessage}
            deletingMessageId={deletingMessageId}
          />

          {/* Manual Reply — mobile */}
          {agentIsActive === false && (
            <div className="px-4 py-3 border-t border-border shrink-0">
              {/* Banner */}
              <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg
                bg-brand-600/10 border border-brand-600/20">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse shrink-0" />
                <p className="text-[11px] text-foreground font-medium flex-1">
                  {t('conv.manual_mode_banner')}
                </p>
                <span className="text-[10px] text-brand-600 font-bold px-1.5 py-0.5
                  rounded-md bg-brand-600/10 border border-brand-600/20">
                  {t('conv.live')}
                </span>
              </div>
              {replyError && (
                <p className="text-[11px] text-red-500 mb-2 px-1">{replyError}</p>
              )}
              {/* Input row */}
              <div className="flex items-end gap-2">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleManualReply()
                    }
                  }}
                  placeholder={t('conv.reply_placeholder')}
                  rows={2}
                  maxLength={1000}
                  className="flex-1 px-3 py-2 bg-secondary border border-border rounded-xl
                    text-[14px] outline-none focus:border-brand-400 transition-colors
                    resize-none leading-relaxed placeholder:text-muted-foreground/50"
                />
                <MediaAttachButton
                  conversationId={selected.id}
                  disabled={replySending}
                  onSent={handleRefreshMessages}
                />
                <button
                  onClick={handleManualReply}
                  disabled={replySending || !replyText.trim()}
                  className="shrink-0 w-10 h-10 rounded-xl bg-brand-600 text-white
                    flex items-center justify-center transition-all hover:bg-brand-700
                    active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                  {replySending
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Send size={16} />
                  }
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-left mt-1">
                {replyText.length}/1000
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 px-3 py-3 border-t border-border bg-secondary/10 shrink-0"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
            {[
              { label: t('conv.messages'),  value: `${messages.length}` },
              { label: t('conv.duration'),  value: timeAgo(selected.createdAt, t) },
              {
                label: t('conv.order_val'),
                value: getConversationOrderAmount(selected) ? `${getConversationOrderAmount(selected)}` : "—"
              },
            ].map(item => (
              <div key={item.label} className="bg-secondary/40 border border-border rounded-lg p-2 text-center">
                <p className="text-[12px] text-muted-foreground mb-0.5">{item.label}</p>
                <p className="text-[13px] font-bold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <MainLayout
          stats={stats} filtered={filtered} filter={filter} setFilter={setFilter}
          search={search} setSearch={setSearch} filterButtons={filterButtons}
          selected={selected} setSelected={setSelected}
          messages={messages} messagesLoading={messagesLoading} messagesError={messagesError}
          onRetryMessages={() => setSelected({ ...selected })}
          unreadCount={unreadCount}
          onDeleteConversation={handleDeleteConversation}
          deleteModal={deleteModal} confirmDelete={confirmDelete} cancelDelete={cancelDelete}
          messageDeleteDialog={messageDeleteDialog} cancelDeleteMessage={cancelDeleteMessage} confirmDeleteMessage={confirmDeleteMessage}
          agentIsActive={agentIsActive}
          replyText={replyText} setReplyText={setReplyText}
          replySending={replySending} replyError={replyError}
          onManualReply={handleManualReply}
          onRefreshMessages={handleRefreshMessages}
          onCopyMessage={handleCopyMessage}
          onDeleteMessage={handleDeleteMessage}
          deletingMessageId={deletingMessageId}
        />
        {newMsgToast && (
          <NewMessageToast conv={newMsgToast} onOpen={handleToastOpen} onClose={handleToastClose} />
        )}
      </>
    )
  }

  return (
    <>
      <MainLayout
        stats={stats} filtered={filtered} filter={filter} setFilter={setFilter}
        search={search} setSearch={setSearch} filterButtons={filterButtons}
        selected={selected} setSelected={setSelected}
        messages={messages} messagesLoading={messagesLoading} messagesError={messagesError}
        onRetryMessages={() => setSelected({ ...selected })}
        unreadCount={unreadCount}
        onDeleteConversation={handleDeleteConversation}
        deleteModal={deleteModal} confirmDelete={confirmDelete} cancelDelete={cancelDelete}
        messageDeleteDialog={messageDeleteDialog} cancelDeleteMessage={cancelDeleteMessage} confirmDeleteMessage={confirmDeleteMessage}
        agentIsActive={agentIsActive}
        replyText={replyText} setReplyText={setReplyText}
        replySending={replySending} replyError={replyError}
        onManualReply={handleManualReply}
        onRefreshMessages={handleRefreshMessages}
        onCopyMessage={handleCopyMessage}
        onDeleteMessage={handleDeleteMessage}
        deletingMessageId={deletingMessageId}
      />
      {newMsgToast && (
        <NewMessageToast conv={newMsgToast} onOpen={handleToastOpen} onClose={handleToastClose} />
      )}
    </>
  )
}

/* ─────────────── Main Layout ─────────────── */
// 🔧 FIX: Added onRefreshMessages to refresh messages after voice send
// 📍 LOCATION: MainLayout props signature
function MainLayout({
  stats, filtered, filter, setFilter,
  search, setSearch, filterButtons,
  selected, setSelected, messages, messagesLoading, messagesError,
  onRetryMessages,
  unreadCount, onDeleteConversation,
  deleteModal, confirmDelete, cancelDelete,
  messageDeleteDialog, cancelDeleteMessage, confirmDeleteMessage,
  agentIsActive, replyText, setReplyText, replySending, replyError, onManualReply,
  onRefreshMessages,
  onCopyMessage, onDeleteMessage, deletingMessageId,
}) {
  const { t, language } = useLanguage()
  // ✅ FIX: تعريف getStageLabel هنا لأن MainLayout تستخدمه في الـ map
  const getStageLabel = useStageLabel()

  return (
    <div className="flex flex-col gap-5 pb-6">

      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <MessageCircle size={17} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{t('nav.conversations')}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} ${t('notif.unread')}` : t('conv.all_read')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats 4 كاردات ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label={t('conv.total_product')}
          value={stats.total} icon={Users} badge={t('conv.filter_all')} delay={0} />
        <StatCard
          label={t('conv.closed_sales')}
          value={stats.closed} icon={CheckCircle} badge={t('conv.filter_closed')} delay={80} />
        <StatCard
          label={t('conv.filter_pitching')}
          value={stats.pitching} icon={Sparkles} badge={t('conv.filter_pitching')} delay={160} />
        <StatCard
          label={t('conv.needs_attention')}
          value={stats.objection} icon={AlertCircle} badge={t('conv.filter_objection')} delay={240} />
        <StatCard
          label={recoveryLabel(language)}
          value={stats.recovery} icon={RefreshCw} badge={recoveryLabel(language)} delay={320} />
      </div>

      {/* ── فلاتر المرحلة + بحث ── */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none bg-secondary/30 border border-border rounded-xl p-2">
          {filterButtons.map(f => (
            <button key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold border shrink-0 transition-all duration-200",
                filter === f.key
                  ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-brand-300"
              )}>
              {f.key === "RECOVERY" ? recoveryLabel(language) : t(f.labelKey)}
              <span className={cn(
                "text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums",
                filter === f.key ? "bg-white/20 text-white" : "bg-border/80 text-muted-foreground"
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('conv.search_product')}
            className="w-full pr-9 pl-3 py-2 bg-card border border-border rounded-xl text-[14px] outline-none focus:border-brand-400 transition-colors duration-200" />
        </div>
      </div>

      {/* ── القائمة + التفاصيل ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* القائمة */}
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="border border-border rounded-xl p-4 text-center bg-secondary/20">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
                <ShoppingBag size={22} className="text-brand-600" />
              </div>
              <p className="text-[14px] text-muted-foreground">
                {t('conv.no_product_convs')}
              </p>
            </div>
          ) : (
            filtered.map((conv, idx) => {
              const safeScore = typeof conv.score === "number" && !isNaN(conv.score)
                ? conv.score : 0
              // ✅ getStageLabel متاح الآن لأننا عرّفناه أعلى في MainLayout
              const stageLabel    = getStageLabel(conv.stage, conv.type, t)
              const stageClassName = getStageClassName(conv.stage, conv.type)
              const stage         = getStageConfig(conv.stage, t, conv.type)
              const scoreColor    = getScoreColor(safeScore)
              return (
                <ConvCard
                  key={conv.id}
                  conv={conv}
                  stage={stage}
                  scoreColor={scoreColor}
                  stageLabel={stageLabel}
                  stageClassName={stageClassName}
                  isSelected={selected?.id === conv.id}
                  onSelect={() => setSelected(conv)}
                  onDelete={onDeleteConversation}
                  delay={idx * 40}
                  safeScore={safeScore}
                />
              )
            })
          )}
        </div>

        {/* التفاصيل */}
        <div className="col-span-2 hidden lg:block">
          {!selected ? (
            <div className="bg-card border border-border rounded-xl h-full min-h-[420px] flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                <ShoppingBag size={26} className="text-brand-600" />
              </div>
              <p className="text-[14px] text-muted-foreground font-medium">
                {t('conv.select_product')}
              </p>
            </div>
          ) : (
            //  LOCATION: MainLayout, DetailPanel call
            <DetailPanel
              selected={selected}
              messages={messages}
              messagesLoading={messagesLoading}
              messagesError={messagesError}
              onRetryMessages={onRetryMessages}
              agentIsActive={agentIsActive}
              replyText={replyText} setReplyText={setReplyText}
              replySending={replySending} replyError={replyError}
              onManualReply={onManualReply}
              onRefreshMessages={onRefreshMessages}
              onCopyMessage={onCopyMessage}
              onDeleteMessage={onDeleteMessage}
              deletingMessageId={deletingMessageId}
            />
          )}
        </div>
      </div>

      {/* ── Delete Modal ── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={cancelDelete} />
          <div
            className="relative w-full max-w-sm border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: "var(--modal-surface, hsl(var(--card)))" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-red-500/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <p className="text-sm font-bold text-red-500">{t('conv.delete_title')}</p>
              </div>
              <button onClick={cancelDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-foreground font-medium mb-1">
                {t('conv.delete_confirm')}
                <span className="text-brand-600 font-bold mx-1">{deleteModal.name}</span>?
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('conv.delete_warning')}
              </p>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border/60 bg-secondary/20">
              <button onClick={cancelDelete}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-all">
                {t('common.cancel')}
              </button>
              <button onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
                <Trash2 size={12} />
                {t('common.yes')}, {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {messageDeleteDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={cancelDeleteMessage} />
          <div
            className="relative w-full max-w-sm border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: "var(--modal-surface, hsl(var(--card)))" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-red-500/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <p className="text-sm font-bold text-red-500">{t('conv.message_delete_title')}</p>
              </div>
              <button
                onClick={cancelDeleteMessage}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-foreground font-medium mb-1">
                {t('conv.message_delete_confirm')}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 break-words">
                {messageDeleteDialog.preview || t('conv.no_message')}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                {t('conv.message_delete_warning')}
              </p>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border/60 bg-secondary/20">
              <button
                onClick={cancelDeleteMessage}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDeleteMessage}
                disabled={Boolean(deletingMessageId)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deletingMessageId
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Trash2 size={12} />
                }
                {t('common.yes')}, {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────── Conv Card ─────────────── */
// ✅ يستقبل stageLabel كـ prop من MainLayout — لا يستدعي useStageLabel مرة ثانية
function ConvCard({ conv, stageLabel, stageClassName, scoreColor, isSelected, onSelect, onDelete, delay, safeScore }) {
  const { t, language } = useLanguage()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div onClick={onSelect}
      className={cn(
        "group bg-card border rounded-xl p-4 cursor-pointer transition-all duration-200 active:scale-[0.99]",
        isSelected
          ? "border-brand-400 shadow-sm"
          : "border-border hover:border-brand-300 hover:bg-secondary/20"
      )}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.35s ease, transform 0.35s ease, border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={getCustomerDisplayName(conv.customer)} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-bold text-foreground truncate">
                {getCustomerDisplayName(conv.customer)}
              </span>
              {!conv.isRead && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0 animate-pulse" />
              )}
            </div>
            {!conv.isRead && (
              <span className="text-[12px] text-brand-600 font-semibold">{t('conv.new_message')}</span>
            )}
            {conv.recovery?.needsRecovery && (
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md border border-amber-500/25 bg-amber-500/10 text-amber-700">
                <RefreshCw size={11} />
                {recoveryReasonLabel(conv.recovery.reason, language)}
              </span>
            )}
            <PendingOrderInline conversation={conv} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn(
            "text-[11px] px-1.5 py-0.5 rounded-md border font-bold",
            "bg-secondary text-brand-600 border-brand-200"
          )}>
            {t('nav.products')}
          </span>
          <span className="text-[12px] text-muted-foreground">{timeAgo(conv.updatedAt, t)}</span>
        </div>
      </div>

      <p className="text-[13px] text-muted-foreground truncate mb-2.5">
        {conv.messages?.[conv.messages.length - 1]?.content || t('conv.no_messages')}
      </p>

      <div className="flex items-center justify-between">
        {/* ✅ stageLabel جاهز من الـ prop */}
        <span className={cn("text-[12px] font-semibold px-2 py-0.5 rounded-md border", stageClassName)}>
          {stageLabel}
        </span>
        <div className="flex items-center gap-2">
          <ScoreBar score={safeScore} color={scoreColor} />
          <button
            onClick={e => { e.stopPropagation(); onDelete(conv.id, getCustomerDisplayName(conv.customer)) }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-secondary transition-colors lg:opacity-0 lg:group-hover:opacity-100"
            title={t('conv.delete_title')}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Detail Panel ─────────────── */
// 🔧 FIX: Added onRefreshMessages to refresh messages after voice send
// 📍 LOCATION: DetailPanel props signature
function DetailPanel({
  selected,
  messages,
  messagesLoading,
  messagesError,
  onRetryMessages,
  agentIsActive,
  replyText,
  setReplyText,
  replySending,
  replyError,
  onManualReply,
  onRefreshMessages,
  onCopyMessage,
  onDeleteMessage,
  deletingMessageId,
}) {
  const { t, language } = useLanguage()
  // ✅ useStageLabel مستدعى على مستوى الـ component مباشرة — Rules of Hooks
  const getStageLabel = useStageLabel()
  const scoreColor     = getScoreColor(selected.score)
  const stageClassName = getStageClassName(selected.stage, selected.type)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/20 shrink-0">
        <div className="flex items-center gap-2.5">
          <Avatar name={getCustomerDisplayName(selected.customer)} size="md" />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[14px] font-bold text-foreground">{getCustomerDisplayName(selected.customer)}</p>
              <span className={cn(
                "text-[11px] px-1.5 py-0.5 rounded-md border font-bold",
                "bg-secondary text-brand-600 border-brand-200"
              )}>
                {t('nav.products')}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground">{selected.customer?.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={cn("text-[12px] font-semibold px-2 py-1 rounded-md border", stageClassName)}>
            {getStageLabel(selected.stage, selected.type, t)}
          </span>
          <ScoreBar score={selected.score} color={scoreColor} width="w-16" />
        </div>
      </div>

      {/* الرسائل — تمرير تلقائي لآخر رسالة */}
      {selected.recovery?.needsRecovery && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-amber-500/20 bg-amber-500/10 text-amber-700 text-[12px] font-semibold">
          <RefreshCw size={13} />
          <span>{recoveryReasonLabel(selected.recovery.reason, language)}</span>
          <span className="ms-auto tabular-nums">{selected.recovery.ageHours}h</span>
        </div>
      )}
      <PendingOrderNotice conversation={selected} />

      <ConversationMessagesScroll
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0 max-h-80"
        conversationId={selected.id}
        messages={messages}
        messagesLoading={messagesLoading}
        messagesError={messagesError}
        onRetryMessages={onRetryMessages}
        customerName={getCustomerDisplayName(selected.customer)}
        onCopyMessage={onCopyMessage}
        onDeleteMessage={onDeleteMessage}
        deletingMessageId={deletingMessageId}
      />

      {/* Manual Reply — desktop */}
      {agentIsActive === false && (
        <div className="px-4 py-3 border-t border-border shrink-0">
          {/* Banner */}
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg
            bg-brand-600/10 border border-brand-600/20">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse shrink-0" />
            <p className="text-[11px] text-foreground font-medium flex-1">
              {t('conv.manual_mode_banner')}
            </p>
            <span className="text-[10px] text-brand-600 font-bold px-1.5 py-0.5
              rounded-md bg-brand-600/10 border border-brand-600/20">
              {t('conv.live')}
            </span>
          </div>
          {replyError && (
            <p className="text-[11px] text-red-500 mb-2 px-1">{replyError}</p>
          )}
          {/* Input row */}
          <div className="flex items-end gap-2">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  onManualReply()
                }
              }}
              placeholder={t('conv.reply_placeholder')}
              rows={2}
              maxLength={1000}
              className="flex-1 px-3 py-2 bg-secondary border border-border rounded-xl
                text-[14px] outline-none focus:border-brand-400 transition-colors
                resize-none leading-relaxed placeholder:text-muted-foreground/50"
            />
            <MediaAttachButton
              conversationId={selected.id}
              disabled={replySending}
              onSent={onRefreshMessages}
            />
            <button
              onClick={onManualReply}
              disabled={replySending || !replyText.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-brand-600 text-white
                flex items-center justify-center transition-all hover:bg-brand-700
                active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
              {replySending
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-left mt-1">
            {replyText.length}/1000
          </p>
        </div>
      )}

      {/* Footer stats */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: t('conv.messages'), value: `${messages.length}` },
            { label: t('conv.duration'), value: timeAgo(selected.createdAt, t) },
            {
              label: t('conv.order_val'),
              value: getConversationOrderAmount(selected) ? `${getConversationOrderAmount(selected)}` : "—",
            },
          ].map(item => (
            <div key={item.label}
              className="bg-secondary/40 border border-border rounded-lg p-2.5 text-center">
              <p className="text-[12px] text-muted-foreground mb-0.5">{item.label}</p>
              <p className="text-[14px] font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────── New Message Toast ─────────────── */
function NewMessageToast({ conv, onOpen, onClose }) {
  const { t } = useLanguage()
  const getStageLabel = useStageLabel()
  const stageLabel     = getStageLabel(conv.stage, conv.type)
  const stageClassName = getStageClassName(conv.stage, conv.type)
  const scoreColor     = getScoreColor(conv.score || 0)
  const lastMsg = conv.messages?.[conv.messages.length - 1]?.content
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      onClick={() => onOpen(conv)}
      style={{
        transform: visible ? "translateY(0)" : "translateY(110%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
      }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 w-[340px] max-w-[calc(100vw-24px)] bg-card border border-border rounded-2xl shadow-lg cursor-pointer overflow-hidden"
    >
      <style>{`
        @keyframes toast-shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
      <div className="h-[2.5px] bg-brand-600/15 overflow-hidden">
        <div
          className="h-full bg-brand-600 origin-left"
          style={{ animation: "toast-shrink 8s linear forwards" }}
        />
      </div>
      <div className="p-4 flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="absolute -inset-[2px] rounded-full bg-brand-600/20" />
          <div className="w-11 h-11 rounded-full bg-brand-600 flex items-center justify-center font-bold text-white text-sm relative">
            {getInitials(getCustomerDisplayName(conv.customer))}
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-600 border-2 border-card animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[14px] font-bold text-foreground truncate">{getCustomerDisplayName(conv.customer)}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(conv.updatedAt, t)}</span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onClose() }}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-0.5">
              <X size={14} />
            </button>
          </div>
          <span className="text-[12px] text-brand-600 font-semibold">{t('conv.new_message')}</span>
          {lastMsg && (
            <p className="text-[13px] text-muted-foreground truncate mt-0.5">{lastMsg}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded-md border", stageClassName)}>
              {stageLabel}
            </span>
            <div className="flex items-center gap-1">
              <div className="w-10 h-[3px] bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${conv.score || 0}%`, backgroundColor: scoreColor }} />
              </div>
              <span className="text-[11px] font-bold tabular-nums" style={{ color: scoreColor }}>{conv.score || 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={null}>
      <ConversationsContent />
    </Suspense>
  )
}
