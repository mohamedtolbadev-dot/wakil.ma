"use client"

import { useState, useEffect, useMemo } from "react"
import { conversationsAPI } from "@/lib/api"
import { getStageConfig, getScoreColor, timeAgo, getInitials } from "@/lib/helpers"
import { cn } from "@/lib/utils"
import {
  Archive,
  RotateCcw,
  Trash2,
  Search,
  MessageCircle,
  RefreshCw,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import Link from "next/link"

/* ─────────────── Avatar ─────────────── */
function Avatar({ name, size = "sm" }) {
  const dims = size === "lg" ? "w-10 h-10 text-sm" : size === "md" ? "w-9 h-9 text-xs" : "w-8 h-8 text-xs"
  return (
    <div className="relative shrink-0">
      <div className="absolute -inset-[2px] rounded-full bg-brand-600" />
      <div className={`${dims} rounded-full bg-brand-600 flex items-center justify-center font-bold text-white relative`}>
        {getInitials(name)}
      </div>
    </div>
  )
}

/* ─────────────── Score Bar ─────────────── */
function ScoreBar({ score, color, width = "w-10" }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`${width} h-[3px] bg-border rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{score}%</span>
    </div>
  )
}

/* ─────────────── Conversation Card ─────────────── */
function ConvCard({ conv, stage, scoreColor, onRestore, onDelete }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-card border border-border rounded-xl p-3 transition-all duration-200 relative group"
    >
      {/* Action Buttons - appear on hover */}
      <div className="absolute left-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <button
          onClick={() => onRestore(conv.id)}
          className="w-7 h-7 rounded-full bg-brand-600/10 hover:bg-brand-600/20 flex items-center justify-center"
          title="استعادة من الأرشيف"
        >
          <RotateCcw size={14} className="text-brand-600" />
        </button>
        <button
          onClick={() => onDelete(conv.id)}
          className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center"
          title="حذف نهائياً"
        >
          <Trash2 size={14} className="text-red-600" />
        </button>
      </div>

      {/* Top */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={conv.customer?.name} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-foreground truncate">{conv.customer?.name}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{conv.customer?.phone}</span>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(conv.updatedAt)}</span>
      </div>

      {/* Last message */}
      <p className="text-[11px] text-muted-foreground truncate mb-2.5 pr-10">
        {conv.messages?.[0]?.content || "لا توجد رسائل"}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-md border", stage.className)}>
          {stage.label}
        </span>
        <ScoreBar score={conv.score} color={scoreColor} />
      </div>
    </div>
  )
}

export default function ArchivePage() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")

  const fetchArchived = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await conversationsAPI.getAll({ stage: "CLOSED" })
      setConversations(response.data?.conversations || [])
    } catch {
      setError("فشل في تحميل الأرشيف")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArchived()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    return conversations.filter(
      (c) => c.customer?.name?.includes(search) || c.customer?.phone?.includes(search)
    )
  }, [conversations, search])

  const handleRestore = async (id) => {
    if (!confirm("هل تريد استعادة هذه المحادثة من الأرشيف؟")) return
    try {
      await conversationsAPI.update(id, { stage: "GREETING" })
      setConversations(prev => prev.filter(c => c.id !== id))
    } catch {
      alert("فشل في استعادة المحادثة")
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذه المحادثة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) return
    try {
      await conversationsAPI.delete(id)
      setConversations(prev => prev.filter(c => c.id !== id))
    } catch {
      alert("فشل في حذف المحادثة")
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 size={32} className="animate-spin text-brand-600" />
        <p className="text-sm text-muted-foreground">جاري تحميل الأرشيف...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 rounded-full border border-red-200 bg-red-50 flex items-center justify-center">
          <Archive size={20} className="text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">فشل في تحميل الأرشيف</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
        <button
          onClick={fetchArchived}
          className="flex items-center gap-2 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
        >
          <RefreshCw size={13} />
          إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pb-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Archive size={15} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">أرشيف المحادثات</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {conversations.length} محادثة مؤرشفة
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/conversations"
          className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 transition-colors"
        >
          <ArrowLeft size={16} />
          العودة للمحادثات
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-brand-600">{conversations.length}</div>
          <p className="text-xs text-muted-foreground">إجمالي المؤرشفة</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">
            {conversations.filter(c => c.totalAmount).length}
          </div>
          <p className="text-xs text-muted-foreground">مبيعات مكتملة</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-foreground">
            {conversations.reduce((sum, c) => sum + (c.totalAmount || 0), 0)} د
          </div>
          <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في الأرشيف..."
          className="w-full pr-9 pl-3 py-2 bg-card border border-border rounded-lg text-[12px] outline-none focus:border-brand-400 transition-colors duration-200"
        />
      </div>

      {/* Archived List */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
              <Archive size={20} className="text-brand-600" />
            </div>
            <p className="text-[12px] text-muted-foreground mb-2">لا توجد محادثات مؤرشفة</p>
            <Link
              href="/dashboard/conversations"
              className="text-xs text-brand-600 hover:text-brand-800"
            >
              العودة للمحادثات
            </Link>
          </div>
        ) : (
          filtered.map((conv) => {
            const stage = getStageConfig(conv.stage)
            const scoreColor = getScoreColor(conv.score)
            return (
              <ConvCard
                key={conv.id}
                conv={conv}
                stage={stage}
                scoreColor={scoreColor}
                onRestore={handleRestore}
                onDelete={handleDelete}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
