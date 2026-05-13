"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import fetchAPI from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  AlertCircle,
  CalendarDays,
  CheckCircle,
  Clock,
  Hash,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  Tag,
  Truck,
  User,
  XCircle,
  DollarSign,
} from "lucide-react"

const ORDER_STATUS = {
  PENDING: { label: "En attente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", icon: Clock },
  CONFIRMED: { label: "Confirme", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400", icon: CheckCircle },
  SHIPPED: { label: "Expedie", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400", icon: Truck },
  DELIVERED: { label: "Livre", cls: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400", icon: CheckCircle },
  CANCELLED: { label: "Annule", cls: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400", icon: XCircle },
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

function StatusBadge({ status }) {
  const cfg = ORDER_STATUS[status] || ORDER_STATUS.PENDING
  const Icon = cfg.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold", cfg.cls)}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

function Info({ icon: Icon, label, value, full = false }) {
  return (
    <div className={cn("flex items-start gap-2", full && "sm:col-span-2")}>
      <Icon size={13} className="text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value || "—"}</p>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 pb-8 animate-pulse">
      <div className="h-4 w-40 bg-secondary rounded-lg" />
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
        <div className="h-5 w-48 bg-secondary rounded-lg" />
        <div className="h-3 w-32 bg-secondary rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((item) => (
          <div key={item} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
            <div className="h-4 w-28 bg-secondary rounded-lg" />
            <div className="h-3 w-full bg-secondary rounded-lg" />
            <div className="h-3 w-2/3 bg-secondary rounded-lg" />
            <div className="h-3 w-1/2 bg-secondary rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminOrderDetailPage() {
  const { userId, orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchAPI(`/api/admin/users/${userId}/orders/${orderId}`)
      setOrder(res.data || null)
    } catch (err) {
      setError(err?.message || "Failed to load order")
    } finally {
      setLoading(false)
    }
  }, [orderId, userId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  if (loading) return <Skeleton />

  if (!order) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-center">
        <AlertCircle size={28} className="text-red-500/70" />
        <p className="text-sm text-muted-foreground">{error || "Order not found"}</p>
        <Link
          href={`/dashboard/admin/users/${userId}`}
          className="text-sm font-medium text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-200 transition-colors"
        >
          Retour a l&apos;utilisateur
        </Link>
      </div>
    )
  }

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
          onClick={fetchOrder}
          className="w-9 h-9 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                <Package size={18} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground break-words">{order.productName}</h1>
                <p className="text-[12px] text-muted-foreground">#{order.id}</p>
              </div>
            </div>
            {order.variant && (
              <p className="text-sm text-muted-foreground mt-1">{order.variant}</p>
            )}
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.isDraft && (
          <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Draft order</p>
            {order.missingFields && (
              <p className="text-[12px] text-amber-700/90 dark:text-amber-400/90 mt-1 break-words">{order.missingFields}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          <Info icon={DollarSign} label="Total" value={`${order.totalAmount ?? 0} MAD`} />
          <Info icon={Hash} label="Quantite" value={order.quantity} />
          <Info icon={CalendarDays} label="Creation" value={fmtDateTime(order.createdAt)} />
          <Info icon={CalendarDays} label="Mise a jour" value={fmtDateTime(order.updatedAt)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Client</h2>
            <p className="text-[12px] text-muted-foreground">Informations de la commande</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Info icon={User} label="Nom" value={order.customerName} />
            <Info icon={Phone} label="Telephone" value={order.customerPhone} />
            <Info icon={Tag} label="Tag" value={order.customer?.tag || "—"} />
            <Info icon={DollarSign} label="Total depense" value={order.customer ? `${order.customer.totalSpent} MAD` : "—"} />
            <Info icon={Hash} label="Nb commandes" value={order.customer?.ordersCount ?? "—"} />
            <Info icon={CalendarDays} label="Derniere activite" value={order.customer?.lastSeen ? fmtDateTime(order.customer.lastSeen) : "—"} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Livraison</h2>
            <p className="text-[12px] text-muted-foreground">Adresse, ville et suivi</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Info icon={MapPin} label="Ville" value={order.city} />
            <Info icon={Truck} label="Tracking" value={order.trackingNumber} />
            <Info icon={CheckCircle} label="Confirmation envoyee" value={order.confirmSent ? "Oui" : "Non"} />
            <Info icon={Truck} label="Expedition envoyee" value={order.shipSent ? "Oui" : "Non"} />
            <Info icon={CheckCircle} label="Livraison envoyee" value={order.deliverSent ? "Oui" : "Non"} />
            <Info icon={MapPin} label="Adresse" value={order.address} full />
            <Info icon={Mail} label="Notes" value={order.notes} full />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {order.conversationId ? (
          <Link
            href={`/dashboard/admin/users/${userId}/conversations/${order.conversationId}`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-sm font-medium text-foreground"
          >
            <MessageCircle size={15} />
            Ouvrir la conversation
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-secondary/40 text-sm text-muted-foreground">
            <MessageCircle size={15} />
            Aucune conversation liee
          </div>
        )}
      </div>
    </div>
  )
}
