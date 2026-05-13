"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import fetchAPI from "@/lib/api"
import { cn } from "@/lib/utils"
import { getInitials, getScoreColor, getToken } from "@/lib/helpers"
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  FileText,
  Hash,
  ImageIcon,
  Loader2,
  MessageCircle,
  Mic,
  Package,
  Phone,
  RefreshCw,
  User,
  Video,
} from "lucide-react"

const STAGE_CONFIG = {
  GREETING: { label: "Accueil", cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  DISCOVERY: { label: "Decouverte", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
  PITCHING: { label: "Pitch", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400" },
  OBJECTION: { label: "Objection", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  CLOSING: { label: "Cloture", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400" },
  CLOSED: { label: "Ferme", cls: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  ABANDONED: { label: "Abandonne", cls: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400" },
  ARCHIVED: { label: "Archive", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
}

const MEDIA_TAGS = {
  image: ["[\u0635\u0648\u0631\u0629]", "[صورة]", "[ØµÙˆØ±Ø©]"],
  video: ["[\u0641\u064A\u062F\u064A\u0648]", "[فيديو]", "[ÙÙŠØ¯ÙŠÙˆ]"],
  voice: ["[\u0631\u0633\u0627\u0644\u0629 \u0635\u0648\u062A\u064A\u0629]", "[رسالة صوتية]", "[Ø±Ø³Ø§Ù„Ø© ØµÙˆØªÙŠØ©]"],
  document: ["[\u0645\u0633\u062A\u0646\u062F:", "[مستند:", "[Ù…Ø³ØªÙ†Ø¯:"],
}

function fmtDateTime(value) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function firstMatchingTag(content, tags) {
  return tags.find((tag) => content.startsWith(tag)) || null
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
  const match = content.match(/\[(?:\u0645\u0633\u062A\u0646\u062F|مستند|Ù…Ø³ØªÙ†Ø¯):\s*(.+?)\]/)
  return match?.[1] || "document"
}

function getMediaInfo(message) {
  const content = String(message?.content || "").trim()
  const imageTag = firstMatchingTag(content, MEDIA_TAGS.image)
  const videoTag = firstMatchingTag(content, MEDIA_TAGS.video)
  const documentTag = firstMatchingTag(content, MEDIA_TAGS.document)
  const voiceTag = MEDIA_TAGS.voice.find((tag) => content.startsWith(tag.replace(/\]$/, ""))) || null
  const mediaUrl = extractMediaUrl(content)

  const isImage = Boolean(imageTag)
  const isVideo = Boolean(videoTag)
  const isDocument = Boolean(documentTag)
  const isVoice = Boolean(voiceTag)
  const isTranscribedVoice = Boolean(
    (message?.whatsappMediaId || mediaUrl) &&
    message?.role === "USER" &&
    content &&
    !content.startsWith("[") &&
    !isImage &&
    !isVideo &&
    !isDocument &&
    !isVoice
  )

  return {
    mediaUrl,
    isImage,
    isVideo,
    isDocument,
    isVoice,
    isTranscribedVoice,
    imageCaption: isImage ? stripMediaUrl(stripMediaTag(content, imageTag), mediaUrl) : "",
    documentFilename: getDocumentFilename(content),
  }
}

function buildProxyPath({ userId, conversationId, messageId, type }) {
  return `/api/admin/users/${userId}/conversations/${conversationId}/messages/${messageId}/${type}`
}

function Avatar({ name }) {
  return (
    <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold shrink-0">
      {getInitials(name)}
    </div>
  )
}

function StageBadge({ stage }) {
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.GREETING
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold", cfg.cls)}>
      {cfg.label}
    </span>
  )
}

function ImageMessageViewer({ userId, conversationId, messageId, mediaUrl, alt }) {
  const [src, setSrc] = useState(mediaUrl || null)
  const [loading, setLoading] = useState(!mediaUrl)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    if (mediaUrl || !userId || !conversationId || !messageId) return
    let objectUrl = null
    const token = getToken()

    fetch(buildProxyPath({ userId, conversationId, messageId, type: "media" }), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("image")
        return res.blob()
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => setErrored(true))
      .finally(() => setLoading(false))

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [conversationId, mediaUrl, messageId, userId])

  if (loading) {
    return <div className="w-48 h-32 bg-secondary/40 rounded-xl animate-pulse" />
  }

  if (errored || !src) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <ImageIcon size={14} />
        <span>Image indisponible</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full max-w-[280px] max-h-[240px] object-contain rounded-xl border border-border bg-secondary/20"
    />
  )
}

function VideoMessageViewer({ userId, conversationId, messageId, mediaUrl }) {
  const [src, setSrc] = useState(mediaUrl || null)
  const [loading, setLoading] = useState(!mediaUrl)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    if (mediaUrl || !userId || !conversationId || !messageId) return
    let objectUrl = null
    const token = getToken()

    fetch(buildProxyPath({ userId, conversationId, messageId, type: "media" }), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("video")
        return res.blob()
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => setErrored(true))
      .finally(() => setLoading(false))

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [conversationId, mediaUrl, messageId, userId])

  if (loading) {
    return <div className="w-48 h-32 bg-secondary/40 rounded-xl animate-pulse" />
  }

  if (errored || !src) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Video size={14} />
        <span>Video indisponible</span>
      </div>
    )
  }

  return (
    <video
      src={src}
      controls
      preload="metadata"
      className="w-full max-w-[300px] max-h-[260px] object-contain rounded-xl border border-border bg-black"
    />
  )
}

function VoiceMessagePlayer({ userId, conversationId, messageId }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl
    const controller = new AbortController()
    const token = getToken()

    ;(async () => {
      try {
        const res = await fetch(buildProxyPath({ userId, conversationId, messageId, type: "audio" }), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error("audio")
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      }
    })()

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [conversationId, messageId, userId])

  if (failed) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Mic size={14} />
        <span>Audio indisponible</span>
      </div>
    )
  }

  if (!url) {
    return <Loader2 size={14} className="animate-spin text-brand-600" />
  }

  return <audio src={url} controls preload="none" className="max-w-[280px] h-8" />
}

function DocumentMessageViewer({ userId, conversationId, messageId, mediaUrl, filename }) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(false)

  const handleDownload = useCallback(async () => {
    try {
      setDownloading(true)
      setError(false)

      if (mediaUrl) {
        const link = document.createElement("a")
        link.href = mediaUrl
        link.download = filename
        link.rel = "noopener noreferrer"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      const token = getToken()
      const res = await fetch(buildProxyPath({ userId, conversationId, messageId, type: "media" }), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("document")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      setError(true)
    } finally {
      setDownloading(false)
    }
  }, [conversationId, filename, mediaUrl, messageId, userId])

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/20 hover:bg-secondary transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-600/10 flex items-center justify-center shrink-0">
        {downloading ? <Loader2 size={18} className="animate-spin text-brand-600" /> : <FileText size={18} className="text-brand-600" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{filename}</p>
        <p className="text-[12px] text-muted-foreground">{error ? "Telechargement impossible" : "Telecharger le document"}</p>
      </div>
    </button>
  )
}

function MessageBubble({ userId, conversationId, message, customerName }) {
  const isAgent = message.role === "AGENT"
  const content = String(message?.content || "").trim()
  const mediaInfo = getMediaInfo(message)

  return (
    <div className={cn("flex gap-3 items-end", !isAgent && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0",
          isAgent ? "bg-secondary text-foreground border border-border" : "bg-brand-600 text-white"
        )}
      >
        {isAgent ? "A" : getInitials(customerName)}
      </div>

      <div className={cn("max-w-[78%] flex flex-col gap-1", !isAgent && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-[13px] leading-relaxed break-words border",
            isAgent
              ? "bg-secondary text-foreground border-border rounded-tl-sm"
              : "bg-card text-foreground border-border rounded-tr-sm"
          )}
        >
          {mediaInfo.isImage ? (
            <div className="flex flex-col gap-2">
              <ImageMessageViewer
                userId={userId}
                conversationId={conversationId}
                messageId={message.id}
                mediaUrl={mediaInfo.mediaUrl}
                alt="Image"
              />
              {mediaInfo.imageCaption && <span>{mediaInfo.imageCaption}</span>}
            </div>
          ) : mediaInfo.isVideo ? (
            <VideoMessageViewer
              userId={userId}
              conversationId={conversationId}
              messageId={message.id}
              mediaUrl={mediaInfo.mediaUrl}
            />
          ) : mediaInfo.isDocument ? (
            <DocumentMessageViewer
              userId={userId}
              conversationId={conversationId}
              messageId={message.id}
              mediaUrl={mediaInfo.mediaUrl}
              filename={mediaInfo.documentFilename}
            />
          ) : mediaInfo.isVoice || mediaInfo.isTranscribedVoice ? (
            <VoiceMessagePlayer
              userId={userId}
              conversationId={conversationId}
              messageId={message.id}
            />
          ) : (
            <span>{content}</span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground px-1">{fmtDateTime(message.createdAt)}</span>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 pb-8 animate-pulse">
      <div className="h-4 w-40 bg-secondary rounded-lg" />
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
        <div className="h-5 w-56 bg-secondary rounded-lg" />
        <div className="h-3 w-32 bg-secondary rounded-lg" />
      </div>
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className={cn("flex gap-3", item % 2 === 1 && "justify-end")}>
            <div className="w-8 h-8 rounded-full bg-secondary shrink-0" />
            <div className="h-16 w-64 bg-secondary rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminConversationDetailPage() {
  const { userId, conversationId } = useParams()
  const [conversation, setConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  const fetchConversation = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchAPI(`/api/admin/users/${userId}/conversations/${conversationId}`)
      setConversation(res.data || null)
    } catch (err) {
      setError(err?.message || "Failed to load conversation")
    } finally {
      setLoading(false)
    }
  }, [conversationId, userId])

  useEffect(() => {
    fetchConversation()
  }, [fetchConversation])

  useEffect(() => {
    const element = scrollRef.current
    if (!element || !conversation?.messages?.length) return
    requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight
    })
  }, [conversation?.messages])

  const relatedOrders = useMemo(() => conversation?.relatedOrders || [], [conversation?.relatedOrders])

  if (loading) return <Skeleton />

  if (!conversation) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-center">
        <AlertCircle size={28} className="text-red-500/70" />
        <p className="text-sm text-muted-foreground">{error || "Conversation not found"}</p>
        <Link
          href={`/dashboard/admin/users/${userId}`}
          className="text-sm font-medium text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-200 transition-colors"
        >
          Retour a l&apos;utilisateur
        </Link>
      </div>
    )
  }

  const customerName = conversation.customer?.name || conversation.customer?.phone || "Client"

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/dashboard/admin/users/${userId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight size={15} />
          Utilisateur
        </Link>
        <button
          type="button"
          onClick={fetchConversation}
          className="w-9 h-9 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={customerName} />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate">{customerName}</h1>
              <div className="flex items-center gap-3 text-[12px] text-muted-foreground flex-wrap mt-1">
                <span className="inline-flex items-center gap-1"><Phone size={12} />{conversation.customer?.phone || "—"}</span>
                <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{fmtDateTime(conversation.updatedAt)}</span>
                <span className="inline-flex items-center gap-1"><Hash size={12} />{conversation.messages?.length || 0} messages</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StageBadge stage={conversation.stage} />
            <span className={cn(
              "text-[11px] font-semibold px-2.5 py-1 rounded-full",
              conversation.isRead ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" : "bg-brand-600/10 text-brand-700 dark:text-brand-300"
            )}>
              {conversation.isRead ? "Lu" : "Non lu"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <User size={13} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Customer tag</p>
              <p className="text-sm font-medium text-foreground">{conversation.customer?.tag || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash size={13} className="text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, conversation.score || 0)}%`, backgroundColor: getScoreColor(conversation.score || 0) }}
                  />
                </div>
                <span className="text-sm font-semibold" style={{ color: getScoreColor(conversation.score || 0) }}>
                  {conversation.score || 0}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={13} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Created</p>
              <p className="text-sm font-medium text-foreground">{fmtDateTime(conversation.createdAt)}</p>
            </div>
          </div>
        </div>

        {relatedOrders.length > 0 && (
          <div className="pt-3 border-t border-border/60">
            <p className="text-sm font-semibold text-foreground mb-2">Commandes liees</p>
            <div className="flex flex-wrap gap-2">
              {relatedOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/admin/users/${userId}/orders/${order.id}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-secondary/20 hover:bg-secondary transition-colors"
                >
                  <Package size={14} className="text-brand-600" />
                  <span className="text-sm text-foreground">{order.productName}</span>
                  <span className="text-[11px] text-muted-foreground">{order.totalAmount} MAD</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto"
      >
        {conversation.messages?.length ? (
          conversation.messages.map((message) => (
            <MessageBubble
              key={message.id}
              userId={userId}
              conversationId={conversation.id}
              message={message}
              customerName={customerName}
            />
          ))
        ) : (
          <div className="py-12 flex flex-col items-center gap-2 text-center">
            <MessageCircle size={22} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucun message</p>
          </div>
        )}
      </div>
    </div>
  )
}
