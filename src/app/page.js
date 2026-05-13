"use client"

import { useState, useEffect, useRef, useMemo, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  notifyAuthChange,
  readIsLoggedInSnapshot,
  readUserSnapshot,
  subscribeAuth,
} from "@/lib/browserState"
import WakilHandDrawnMap from "@/components/landing/WakilHandDrawnMap"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppTheme } from "@/hooks/useAppTheme"
import {
  MessageCircle, Zap, BarChart3, Users, User, ArrowLeft, Sparkles,
  Clock, Shield, Bot, Brain, Target, TrendingUp, MessageSquare,
  Phone, Star, ChevronDown, Menu, X, Sun, Moon, ShoppingBag,
  ChevronLeft, ChevronRight, LogOut, Upload, Truck, MapPin,
  ClipboardCheck, PlayCircle, CheckCircle2,
  Mail, Send, Check, Infinity,
} from "lucide-react"

// ═══════════════════════════════════════════════════════════
// 1. CONTENT DATA
// ═══════════════════════════════════════════════════════════

const CONTENT = {
  nav: {
    links: [
      { href: "#ai-agent", key: "nav_agent" },
      { href: "/features", key: "nav_features" },
      { href: "/pricing", key: "landing.pricing" },
      { href: "/blogs", key: "nav_blog" },
      { href: "#faq", key: "nav_faq" },
    ],
  },
  hero: {
    stats: [
      { value: "AI", key: "stat_msgs", icon: MessageSquare },
      { value: "CRM", key: "stat_biz", icon: ShoppingBag },
      { value: "CSV", key: "stat_auto", icon: Bot },
    ],
    whatsappImages: [
      { src: "/imgs/WhatsApp Image 2026-04-01 at 12.09.10.jpeg", alt: "WhatsApp Chat 1" },
      { src: "/imgs/WhatsApp Image 2026-04-01 at 12.09.10 (1).jpeg", alt: "WhatsApp Chat 2" },
      { src: "/imgs/WhatsApp Image 2026-04-01 at 12.09.11.jpeg", alt: "WhatsApp Chat 3" },
    ],
  },
  agent: {
    cards: [
      { icon: Bot, titleKey: "card1_title", descKey: "card1_desc" },
      { icon: Target, titleKey: "card2_title", descKey: "card2_desc" },
      { icon: TrendingUp, titleKey: "card3_title", descKey: "card3_desc" },
      { icon: Clock, titleKey: "card4_title", descKey: "card4_desc" },
    ],
  },
  features: {
    items: [
      { icon: ShoppingBag, titleKey: "feat1_title", descKey: "feat1_desc" },
      { icon: Bot, titleKey: "feat2_title", descKey: "feat2_desc" },
      { icon: MessageSquare, titleKey: "feat3_title", descKey: "feat3_desc" },
      { icon: Users, titleKey: "feat4_title", descKey: "feat4_desc" },
      { icon: Upload, titleKey: "feat5_title", descKey: "feat5_desc" },
      { icon: Brain, titleKey: "feat6_title", descKey: "feat6_desc" },
      { icon: MessageCircle, titleKey: "feat7_title", descKey: "feat7_desc" },
      { icon: Phone, titleKey: "feat8_title", descKey: "feat8_desc" },
      { icon: Mail, titleKey: "feat9_title", descKey: "feat9_desc" },
      { icon: Shield, titleKey: "feat10_title", descKey: "feat10_desc" },
      { icon: BarChart3, titleKey: "feat11_title", descKey: "feat11_desc" },
    ],
  },
  testimonials: {
    items: [
      { nameKey: "testi1_name", storeKey: "testi1_store", textKey: "testi1_text" },
      { nameKey: "testi2_name", storeKey: "testi2_store", textKey: "testi2_text" },
      { nameKey: "testi3_name", storeKey: "testi3_store", textKey: "testi3_text" },
    ],
  },
  footer: {
    links: ["footer_terms", "footer_privacy", "footer_contact"],
  },
}

// ═══════════════════════════════════════════════════════════
// 2. CUSTOM HOOKS
// ═══════════════════════════════════════════════════════════

function useReveal(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, visible }
}

function useCounter(target, duration = 1800, visible) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!visible) return
    const end = parseFloat(target)
    const step = end / (duration / 16)
    let cur = 0
    const timer = setInterval(() => {
      cur = Math.min(cur + step, end)
      setCount(Math.floor(cur))
      if (cur >= end) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [visible, target, duration])

  return count
}

function useLightboxKeyboard({ isOpen, onClose, onPrev, onNext, length }) {
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onNext()
      if (e.key === "ArrowRight") onPrev()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose, onPrev, onNext, length])
}

function useAuth() {
  const router = useRouter()
  const isLoggedIn = useSyncExternalStore(subscribeAuth, readIsLoggedInSnapshot, () => false)
  const storedUser = useSyncExternalStore(subscribeAuth, readUserSnapshot, () => null)
  const user = useMemo(() => {
    if (!storedUser) return null
    try {
      return JSON.parse(storedUser)
    } catch {
      return null
    }
  }, [storedUser])

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    notifyAuthChange()
    router.push("/login")
  }

  const getInitials = (u) => {
    if (!u?.name) return "؟"
    const parts = u.name.trim().split(" ")
    return parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0].slice(0, 2)
  }

  return { isLoggedIn, user, logout, getInitials }
}

function useScrollDetection() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return scrolled
}

// ═══════════════════════════════════════════════════════════
// 3. UI COMPONENTS
// ═══════════════════════════════════════════════════════════

function Logo({ theme }) {
  return (
    <Link href="/" dir="ltr" className="flex shrink-0 items-center gap-2" aria-label="wakil.ma">
      <Image
        src="/favicon.svg"
        alt=""
        width={34}
        height={34}
        className="h-8 w-8 sm:hidden"
        priority
      />
      <Image
        src={theme === "dark" ? "/logo/wakil-logo-dark.svg" : "/logo/wakil-logo-light.svg"}
        alt="wakil.ma"
        width={168}
        height={38}
        className="hidden h-8 w-auto sm:block md:h-9"
        priority
      />
    </Link>
  )
}

function SectionBadge({ icon: Icon, label, isDark = false }) {
  return (
    <div className={`inline-flex items-center gap-2 backdrop-blur-md rounded-full px-5 py-2.5 mb-6 shadow-sm
      ${isDark
        ? 'bg-white/10 border border-white/20'
        : 'bg-white/80 border border-slate-200/70'}`}>
      <Icon size={15} className={isDark ? 'text-brand-300 shrink-0' : 'text-brand-600 shrink-0'} />
      <span className={`text-sm font-bold ${isDark ? 'text-white/90' : 'text-brand-700'}`}>{label}</span>
    </div>
  )
}

function AnimatedBadge({ text, visible, isDark = false }) {
  return (
    <div className={`w-full transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="mx-auto mb-4 inline-flex max-w-[19rem] items-center justify-center gap-2 font-bold cursor-default sm:mb-6 sm:max-w-none">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${isDark ? 'bg-brand-400' : 'bg-brand-500'}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isDark ? 'bg-brand-300' : 'bg-brand-600'}`} />
        </span>
        <Sparkles size={12} className={`shrink-0 ${isDark ? 'text-brand-300' : 'text-brand-600'}`} />
        <span className={`relative text-center text-[11px] font-bold leading-relaxed sm:text-xs ${isDark ? 'text-white/90' : 'text-brand-700'}`}>
          {text}
          <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-[#534AB7]" />
        </span>
      </div>
    </div>
  )
}

function Lightbox({ images, currentIndex, onClose, onPrev, onNext, onGoTo }) {
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  useLightboxKeyboard({
    isOpen: currentIndex !== null,
    onClose,
    onPrev,
    onNext,
    length: images.length,
  })

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)" }}
      onClick={onClose}
    >
      <div className="relative w-full max-w-[200px]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-20 w-10 h-10 rounded-full bg-white text-gray-800
            font-bold text-base flex items-center justify-center shadow-xl
            hover:scale-110 active:scale-95 transition-transform duration-200"
          aria-label="close"
        >
          <X size={16} />
        </button>

        <div className="rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl transition-all duration-300">
          <Image
            src={images[currentIndex].src}
            alt={images[currentIndex].alt}
            width={200}
            height={350}
            className="w-full h-auto object-cover"
            priority
          />
        </div>

        <div className="flex items-center justify-center gap-5 mt-5">
          <button
            onClick={onPrev}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15
              hover:bg-white/30 text-white transition-all duration-200 hover:scale-110
              active:scale-95 border border-white/20"
            aria-label="previous"
          >
            <ChevronRight size={18} />
          </button>

          <div className="flex items-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => onGoTo(i)}
                className={`rounded-full transition-all duration-300
                  ${i === currentIndex ? "w-6 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"}`}
                aria-label={`image ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={onNext}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15
              hover:bg-white/30 text-white transition-all duration-200 hover:scale-110
              active:scale-95 border border-white/20"
            aria-label="next"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <p className="text-center text-white/50 text-xs mt-3 font-medium tracking-widest">
          {currentIndex + 1} / {images.length}
        </p>
      </div>
    </div>
  )
}

function WhatsAppFan({ images, visible, isDark, onImageClick, className = "" }) {
  return (
    <div className={`relative flex items-end justify-center ${className}`}>
      {images.map((img, i) => {
        const rotation = (i - 1) * 15
        const translateY = Math.abs(i - 1) * -20
        const translateX = (i - 1) * 54
        const zIndex = i === 1 ? 30 : 20 - Math.abs(i - 1) * 5

        return (
          <div
            key={i}
            className={`absolute bottom-0 transition-all duration-700 ease-out group
              ${visible ? "opacity-100" : "opacity-0"}`}
            style={{
              transitionDelay: visible ? `${200 + i * 170}ms` : "0ms",
              transform: visible
                ? `rotate(${rotation}deg) translateX(${translateX}px) translateY(${translateY}px)`
                : `rotate(0deg) translateX(${(i - 1) * 18}px) translateY(50px)`,
              zIndex,
            }}
          >
            <div
              onClick={() => onImageClick(i)}
              className={`relative p-2 sm:p-3 cursor-pointer select-none
                ${isDark ? 'bg-black/60' : 'bg-slate-100/90'}
                rounded-2xl sm:rounded-3xl shadow-2xl
                transition-all duration-300
                group-hover:scale-110 group-hover:-translate-y-4`}
            >
              <div className={`rounded-xl sm:rounded-2xl overflow-hidden border-2 w-[155px] sm:w-[185px] lg:w-[205px]
                ${isDark ? 'border-white/20' : 'border-slate-300'}`}>
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={220}
                  height={440}
                  className="w-full h-auto object-cover"
                />
              </div>

              <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold shadow-lg bg-green-500 text-white">
                <MessageCircle size={10} />
                WhatsApp
              </div>

              <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-opacity duration-300
                ${isDark ? 'bg-black/30' : 'bg-black/20'}`}>
                <div className="bg-white/90 rounded-full p-2.5 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="#534AB7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </div>
              </div>

              <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full blur-sm
                ${isDark ? 'bg-white/30' : 'bg-black/20'}`} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function UserAvatar({ user, getInitials }) {
  return (
    <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center
      text-[11px] font-bold text-white shadow-sm shrink-0">
      {getInitials(user)}
    </div>
  )
}

function NavLink({ href, label, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="text-[15px] font-medium text-muted-foreground hover:text-brand-600
        transition-colors relative group py-1"
    >
      {label}
      <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-brand-600 rounded-full
        group-hover:w-full transition-all duration-300" />
    </a>
  )
}

function IconButton({ onClick, icon: Icon, label, className = "" }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`p-1.5 rounded-lg border border-border hover:bg-secondary
        transition-all hover:scale-105 active:scale-95 text-foreground ${className}`}
    >
      <Icon size={14} className="sm:w-4 sm:h-4" />
    </button>
  )
}

function LanguageToggle({ language, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-all
        hover:scale-105 active:scale-95 text-xs font-bold text-brand-600 min-w-[32px]"
    >
      {language === "ar" ? "FR" : "عر"}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════
// WhatsApp Preview — بمقاسات iPhone 17 الحقيقية (390×844 → نسبة 19.5:9)
// ═══════════════════════════════════════════════════════════
function HeroWhatsAppPreview({ isDark, compact = false }) {

  const messages = [
  {
    from: "client",
    text: "Salam, chno les parfums li 3ndkom?"
  },

  {
    from: "agent",
    text: "عندنا Lattafa ASAD و Oud Royal. نقدر نوريك الثمن والتفاصيل."
  },

  {
    from: "client",
    text: "Bgit nakhod Oud Royal, 2"
  },

  {
    from: "agent",
    text: "مزيان. شنو هي المدينة والعنوان الكامل باش نوجد الطلبية؟"
  },

  {
    from: "client",
    text: "Fes, Hay Narjis. Hasan wazani"
  },

  {
    from: "agent",
    text: "📦 Oud Royal × 2\n🏙️ فاس\n💰 420 DH"
  },

  {
    from: "client",
    text: "ok"
  },

  {
    from: "agent",
    text: "واخا، غادي نأكد ليك الطلب دابا ✅"
  },
]

  return (
    <div
      dir="ltr"
      className="
        relative mx-auto
        w-[82vw]
        max-w-[290px]
        sm:w-[320px]
        lg:w-[360px]
      "
    >

      {/* glow */}
      <div className="absolute inset-x-6 -bottom-5 h-8 rounded-full bg-brand-600/25 blur-2xl" />

      {/* iphone */}
      <div
        className={`
          relative overflow-hidden
          rounded-[3rem]
          border-[10px]
          shadow-2xl
          aspect-[9/18.6]
          ${isDark ? "border-[#1c1c1e] bg-[#0b141a]" : "border-[#d1d1d6] bg-[#efeae2]"}
        `}
      >

        {/* dynamic island */}
        <div
          className="
            absolute left-1/2 top-3 z-30
            h-7 w-24
            -translate-x-1/2
            rounded-full
            bg-black
          "
        />

        {/* whatsapp header */}
        <div
          className={`
            flex items-center justify-between
            px-4 pt-12 pb-3
            text-white
            ${isDark ? "bg-[#0f1c24]" : "bg-[#075E54]"}
          `}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[12px] font-black">
              W
            </div>

            <div>
              <p className="text-[13px] font-extrabold leading-4">
                Wakil AI
              </p>

              <p className="text-[10px] text-white/80">
                en ligne
              </p>
            </div>
          </div>

          <MessageCircle size={16} />
        </div>

        {/* chat */}
        <div
          className="
            flex-1
            overflow-hidden
            px-3 py-3
            space-y-2
          "
          style={{
            height: "calc(100% - 145px)",
          }}
        >
          {messages.map((message, index) => {
            const isAgent = message.from === "agent"

            return (
              <div
                key={index}
                className={`flex ${
                  isAgent ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  dir={isAgent ? "rtl" : "ltr"}
                  className={`
                    relative
                    max-w-[84%]
                    whitespace-pre-line
                    px-3 py-2
                    text-[11px]
                    leading-relaxed
                    shadow-sm
                    ${
                      isAgent
                        ? isDark
                          ? "bg-[#1f2c34] text-white rounded-2xl rounded-tl-md"
                          : "bg-white text-slate-900 rounded-2xl rounded-tl-md"
                        : "bg-[#dcf8c6] text-slate-900 rounded-2xl rounded-tr-md"
                    }
                  `}
                >
                  {message.text}
                </div>
              </div>
            )
          })}
        </div>

        {/* input */}
        <div
          className={`
            absolute bottom-0 left-0 right-0
            flex items-center gap-2
            px-3 py-2
            ${isDark ? "bg-[#0f1c24]" : "bg-[#f0f2f5]"}
          `}
        >
          <div
            className={`
              flex-1 rounded-full px-4 py-2 text-[11px]
              ${isDark ? "bg-white/10 text-white/50" : "bg-white text-slate-400"}
            `}
          >
            Message
          </div>

          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884] text-white">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
// ═══════════════════════════════════════════════════════════
// 4. SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════

function Header({ theme, toggleTheme }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const scrolled = useScrollDetection()
  const { isLoggedIn, user, logout, getInitials } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    setMobileMenuOpen(false)
  }

  const navLinks = CONTENT.nav.links.map((link) => ({
    href: link.href,
    label: t(`land.${link.key}`),
  }))

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300
      ${scrolled
        ? "bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm shadow-black/5"
        : "bg-card/60 backdrop-blur-md border-b border-border/30"}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <Logo theme={theme} />

        <nav className="hidden md:flex items-center gap-5 lg:gap-6">
          {navLinks.map(({ href, label }) => (
            <NavLink key={href} href={href} label={label} />
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <IconButton onClick={toggleTheme} icon={theme === "light" ? Moon : Sun} label="toggle theme" />
          <LanguageToggle language={language} onToggle={() => setLanguage(language === "ar" ? "fr" : "ar")} />

          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 ml-1">
                <UserAvatar user={user} getInitials={getInitials} />
                <span className="hidden md:block text-[12px] font-medium text-muted-foreground truncate max-w-[70px]">
                  {user?.name || "User"}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                title={t("topbar.logout")}
                className="p-1.5 rounded-lg hover:bg-red-500/10 border border-transparent
                  hover:border-red-500/20 text-muted-foreground hover:text-red-500 transition-all duration-200"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex text-sm font-semibold text-muted-foreground
                hover:text-foreground transition-colors px-2 sm:px-3 py-1.5">
                {t("land.login")}
              </Link>
              <Link href="/register" className="text-sm font-bold bg-brand-600 text-white px-3 sm:px-4
                py-1.5 sm:py-2 rounded-xl hover:bg-brand-700 transition-all hover:shadow-md
                hover:shadow-brand-600/30 hover:-translate-y-0.5 active:scale-95 whitespace-nowrap">
                {t("land.free_trial")}
              </Link>
            </>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="menu"
            className="md:hidden p-1.5 rounded-lg border border-border hover:bg-secondary transition-all text-foreground"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300
        ${mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="border-t border-border bg-card/90 backdrop-blur-xl px-4 py-3 space-y-1">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center px-4 py-3 rounded-xl text-sm font-medium
                text-muted-foreground hover:text-brand-600 hover:bg-secondary transition-colors"
            >
              {label}
            </a>
          ))}
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-medium
                  text-brand-600 hover:bg-slate-50 dark:hover:bg-brand-600/10 transition-colors gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center
                  text-[10px] font-bold text-white shrink-0">
                  {getInitials(user)}
                </div>
                {t("nav.dashboard")}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 rounded-xl text-sm font-medium
                  text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors gap-2"
              >
                <LogOut size={16} />
                {t("topbar.logout")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-medium
                  text-muted-foreground hover:text-brand-600 hover:bg-secondary transition-colors"
              >
                {t("land.login")}
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-medium
                  text-brand-600 hover:bg-slate-50 dark:hover:bg-brand-600/10 transition-colors"
              >
                {t("land.free_trial")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function HeroSection({ theme }) {
  const { ref, visible } = useReveal(0.05)
  const { language } = useLanguage()
  const isDark = theme === "dark"
  const isRTL = language === "ar"
  const hero = isRTL
    ? {
        badge: "مصمم للمتاجر الإلكترونية فالمغرب 🇲🇦",
        title1: "حوّل محادثاتك",
        title2: "لطلبيات واجدة للتوصيل",
        sub: "Wakil AI كيرد، كينصح، وكيحوّل زبناء واتساب لطلبيات منظمة. كيجمع المعلومات، كينشئ الطلبية، وكيعاونك تتابع التوصيل من نفس البلاصة.",
        ctaPrimary: "جرب Wakil AI مجاناً",
        ctaSecondary: "شوف الديمو",
        note: "ردود ذكية، طلبيات منظمة، وتوصيل متابع بلا خدمة يدوية كثيرة.",
        features: [
          { icon: MessageCircle, title: "ردود أوتوماتيكية", text: "ذكية وسريعة" },
          { icon: ClipboardCheck, title: "طلبيات منظمة", text: "فلوحة التحكم" },
          { icon: Truck, title: "توصيل وتتبع", text: "مربوطين بالطلبية" },
        ],
        flow: [
          { icon: User, title: "الزبون كيصيفط", text: "رسالة فواتساب" },
          { icon: Bot, title: "Wakil AI كيرد", text: "فالحين وبالسياق" },
          { icon: MessageSquare, title: "كيجمع المعلومات", text: "المنتج، العنوان..." },
          { icon: ClipboardCheck, title: "كتتخلق الطلبية", text: "فالداشبورد" },
          { icon: Truck, title: "كتصيفط للتوصيل", text: "عبر CSV" },
          { icon: MapPin, title: "الزبون يتوصل", text: "برقم التتبع" },
        ],
      }
    : {
        badge: "Pensé pour les e-commerces au Maroc 🇲🇦",
        title1: "Transformez vos conversations",
        title2: "en commandes prêtes à livrer",
        sub: "Wakil AI répond, conseille, et convertit vos clients sur WhatsApp. Il collecte les informations, crée les commandes et aide à suivre la livraison automatiquement.",
        ctaPrimary: "Essayer Wakil AI gratuitement",
        ctaSecondary: "Voir la démo",
        note: "Réponses intelligentes, commandes organisées et suivi livraison sans travail manuel lourd.",
        features: [
          { icon: MessageCircle, title: "Réponses automatiques", text: "intelligentes" },
          { icon: ClipboardCheck, title: "Commandes organisées", text: "dans le dashboard" },
          { icon: Truck, title: "Livraison et suivi", text: "liés à la commande" },
        ],
        flow: [
          { icon: User, title: "Client envoie", text: "un message" },
          { icon: Bot, title: "Wakil AI répond", text: "instantanément" },
          { icon: MessageSquare, title: "Collecte les infos", text: "produit, adresse..." },
          { icon: ClipboardCheck, title: "Commande créée", text: "dans le dashboard" },
          { icon: Truck, title: "Envoyée au livreur", text: "via fichier CSV" },
          { icon: MapPin, title: "Client reçoit", text: "le suivi livraison" },
        ],
      }

  return (
    <section ref={ref} className="relative overflow-visible px-4 pt-5 pb-6 sm:px-6 sm:pt-8 lg:pt-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(310px,0.72fr)] lg:gap-10 xl:gap-12">
          <div className={`relative z-10 ${isRTL ? "text-right" : "text-left"}`}>
            <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-[12px] font-extrabold text-white shadow-lg shadow-brand-600/20 sm:text-[13px] md:px-5">
                <span className="truncate">{hero.badge}</span>
              </div>
            </div>

            <div className={`transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <h1 className={`mt-6 max-w-[620px] text-[2.05rem] font-black leading-[1.08] tracking-normal min-[390px]:text-[2.35rem] sm:text-[3.35rem] lg:text-[3.9rem] xl:text-[4.35rem] ${isDark ? "text-white" : "text-[#080d35]"}`}>
                {hero.title1}
                <br />
                <span className={isDark ? "text-brand-300" : "text-brand-600"}>{hero.title2}</span>
              </h1>
            </div>

            <div className={`transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <p className={`mt-5 max-w-[570px] text-[14px] font-medium leading-7 sm:text-[16px] ${isDark ? "text-white/76" : "text-slate-700"}`}>
                {hero.sub}
              </p>
            </div>

            <div className={`mt-6 grid max-w-[600px] gap-3 sm:grid-cols-3 transition-all duration-700 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              {hero.features.map((item) => (
                <HeroFeatureItem key={item.title} item={item} isDark={isDark} />
              ))}
            </div>

            <div className={`mt-7 flex flex-col gap-3 sm:flex-row transition-all duration-700 delay-[400ms] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-brand-600 px-5 py-3.5 text-[14px] font-extrabold text-white shadow-xl shadow-brand-600/25 transition hover:-translate-y-0.5 hover:bg-brand-700 sm:px-7"
              >
                {hero.ctaPrimary}
                <ArrowLeft size={18} className={`transition ${isRTL ? "group-hover:-translate-x-1" : "rotate-180 group-hover:translate-x-1"}`} />
              </Link>
              <a
                href="#ai-agent"
                className={`inline-flex items-center justify-center gap-3 rounded-2xl border px-5 py-3.5 text-[14px] font-extrabold backdrop-blur-md transition hover:-translate-y-0.5 sm:px-7 ${
                  isDark
                    ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
                    : "border-slate-200 bg-white/85 text-brand-700 hover:border-slate-300 hover:bg-white"
                }`}
              >
                {hero.ctaSecondary}
                <PlayCircle size={19} className="text-brand-600" />
              </a>
            </div>

            <p className={`mt-5 max-w-[590px] text-[12px] font-bold leading-6 ${isDark ? "text-white/58" : "text-slate-600"}`}>
              {hero.note}
            </p>
          </div>

          {/* ── Phone column ── */}
          <div className={`relative z-10 flex justify-center transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {/* Mobile: compact iPhone 17 */}
            <div className="sm:hidden flex justify-center py-4">
              <HeroWhatsAppPreview isDark={isDark} compact />
            </div>
            {/* Desktop/tablet: full iPhone 17 */}
            <div className="hidden sm:flex justify-center">
              <HeroWhatsAppPreview isDark={isDark} />
            </div>
          </div>
        </div>

        <HeroFlow steps={hero.flow} isDark={isDark} isRTL={isRTL} visible={visible} />
      </div>
    </section>
  )
}

function HeroFeatureItem({ item, isDark }) {
  const Icon = item.icon

  return (
    <div className="flex items-start gap-3">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${isDark ? "bg-white/10 text-brand-200" : "border border-slate-200 bg-white text-brand-600"}`}>
        <Icon size={22} strokeWidth={2.4} />
      </div>
      <div>
        <h3 className={`text-[12px] font-black leading-5 ${isDark ? "text-white" : "text-[#0b1038]"}`}>{item.title}</h3>
        <p className={`mt-0.5 text-[11px] font-bold leading-5 ${isDark ? "text-white/62" : "text-slate-600"}`}>{item.text}</p>
      </div>
    </div>
  )
}

function HeroFlow({ steps, isDark, isRTL, visible }) {
  return (
    <div className={`mt-5 rounded-[24px] border p-3 shadow-xl backdrop-blur-xl transition-all duration-700 delay-500 sm:p-4 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${isDark ? "border-white/10 bg-white/10 shadow-black/20" : "border-slate-200/70 bg-white/78 shadow-slate-200/60"}`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-2">
        {steps.map((step, index) => (
          <HeroFlowStep key={step.title} step={step} index={index} isDark={isDark} isRTL={isRTL} showArrow={index < steps.length - 1} />
        ))}
      </div>
    </div>
  )
}

function HeroFlowStep({ step, index, isDark, isRTL, showArrow }) {
  const Icon = step.icon

  return (
    <div className="relative flex flex-col items-center gap-2 rounded-2xl px-1 py-1 text-center lg:block lg:px-0 lg:py-0">
      {showArrow && (
        <div className={`absolute top-7 hidden w-[42%] border-t border-dashed lg:block ${isRTL ? "left-[-21%]" : "right-[-21%]"} ${isDark ? "border-brand-300/50" : "border-brand-400/70"}`}>
          <ArrowLeft className={`absolute -top-2 h-4 w-4 text-brand-600 ${isRTL ? "-left-1" : "-right-1 rotate-180"}`} />
        </div>
      )}
      <div className="relative mx-auto grid h-12 w-12 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-brand-600 lg:h-16 lg:w-16">
        <Icon size={22} strokeWidth={2.4} className="lg:h-[25px] lg:w-[25px]" />
        {index === 0 && <span className="absolute -right-1 top-0 grid h-5 w-5 place-items-center rounded-full bg-green-500 text-white"><MessageCircle size={12} /></span>}
      </div>
      <div className="min-w-0 lg:mt-2">
        <h3 className={`text-[12px] font-black leading-5 ${isDark ? "text-white" : "text-[#0b1038]"}`}>
          {index + 1}. {step.title}
        </h3>
        <p className={`mt-0.5 text-[11px] font-bold leading-4 ${isDark ? "text-white/60" : "text-slate-600"}`}>{step.text}</p>
      </div>
    </div>
  )
}

function FeaturesSection({ theme }) {
  const { ref, visible } = useReveal()
  const { t, language } = useLanguage()
  const isRTL = language === "ar"
  const isDark = theme === "dark"

  const features = CONTENT.features.items.map((feature) => ({
    ...feature,
    title: t(`land.${feature.titleKey}`),
    desc: t(`land.${feature.descKey}`),
  }))

  return (
    <section id="features" className="py-12 sm:py-16 md:py-28 relative overflow-hidden">
      <div ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={`mx-auto max-w-2xl text-center mb-8 sm:mb-14 transition-all duration-700
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <SectionBadge icon={Zap} label={t("land.feat_badge")} isDark={isDark} />
          <h2 className={`mx-auto max-w-[19rem] sm:max-w-2xl text-[1.65rem] leading-[1.15] sm:text-3xl md:text-5xl font-extrabold mb-3 sm:mb-5 ${isRTL ? "tracking-normal" : "tracking-tight"} ${isDark ? 'text-white' : 'text-brand-900'}`}>
            {t("land.feat_title")}
          </h2>
          <p className={`mx-auto max-w-xl text-[13px] sm:text-base leading-relaxed sm:leading-loose ${isDark ? 'text-white/80' : 'text-slate-600'}`}>
            {t("land.feat_sub")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              dir={isRTL ? "rtl" : "ltr"}
              className={`backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 transition-all duration-500 hover:-translate-y-1.5 group relative overflow-hidden flex items-start gap-3.5 sm:block ${isRTL ? "text-right" : "text-left"}
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
                ${isDark
                  ? 'bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 hover:shadow-2xl hover:shadow-white/10'
                  : 'bg-white/80 border border-slate-200/70 hover:bg-white hover:border-slate-300/70 hover:shadow-2xl hover:shadow-slate-200/70'}`}
              style={{ transitionDelay: visible ? `${150 + i * 80}ms` : "0ms" }}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center mb-0 sm:mb-5 relative transition-all duration-300
                ${isDark
                  ? 'bg-white/10 border border-white/20 group-hover:border-white/30'
                  : 'bg-white/80 border border-slate-200/70 group-hover:border-brand-300/50'}`}>
                <feature.icon
                  size={20}
                  className={`group-hover:scale-110 transition-transform duration-300 ${isDark ? 'text-brand-300' : 'text-brand-600'}`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className={`font-bold mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg leading-snug transition-colors duration-300
                  ${isDark ? 'text-white group-hover:text-brand-300' : 'text-brand-800 group-hover:text-brand-600'}`}>
                  {feature.title}
                </h3>
                <p className={`text-[12px] sm:text-sm leading-relaxed relative ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                  {feature.desc}
                </p>

                <div className={`mt-4 sm:mt-5 h-0.5 w-10 sm:w-0 rounded-full sm:group-hover:w-full transition-all duration-500
                  ${isDark ? 'bg-white/30' : 'bg-slate-300/60'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ScreenshotsSection({ theme }) {
  const { ref, visible } = useReveal()
  const { t, language } = useLanguage()
  const isRTL = language === "ar"
  const isDark = theme === "dark"

  const [lightboxIndex, setLightboxIndex] = useState(null)

  const screenshots = [
    { src: "/imgs/WhatsApp Image 2026-04-01 at 12.09.10.jpeg", alt: "AI conversation 1" },
    { src: "/imgs/WhatsApp Image 2026-04-01 at 12.09.10 (1).jpeg", alt: "AI conversation 2" },
    { src: "/imgs/WhatsApp Image 2026-04-01 at 12.09.11.jpeg", alt: "AI conversation 3" },
  ]

  const closeLightbox = () => setLightboxIndex(null)
  const prevImage = () => setLightboxIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length)
  const nextImage = () => setLightboxIndex((prev) => (prev + 1) % screenshots.length)

  return (
    <section id="screenshots" className="py-10 sm:py-16 md:py-28 relative overflow-hidden">
      {lightboxIndex !== null && (
        <Lightbox
          images={screenshots}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
          onGoTo={(i) => setLightboxIndex(i)}
        />
      )}

      <div ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-8 sm:mb-14 transition-all duration-700
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <SectionBadge icon={MessageCircle} label={language === "ar" ? "حوارات حقيقية" : "Conversations réelles"} isDark={isDark} />
          <h2 className={`text-2xl sm:text-3xl md:text-5xl font-extrabold mb-3 sm:mb-5 tracking-tight ${isDark ? 'text-white' : 'text-brand-900'}`}>
            {language === "ar" ? "شوف كيفاش الوكيل كيتعامل مع الزبناء" : "Voir comment l'agent interagit avec les clients"}
          </h2>
          <p className={`text-sm sm:text-base leading-loose max-w-2xl mx-auto ${isDark ? 'text-white/80' : 'text-slate-600'}`}>
            {language === "ar"
              ? "حوارات واتساب حقيقية — الوكيل الذكي كيجاوب، كيعرض المنتجات، وكيجمع معلومات الطلبية"
              : "Vraies conversations WhatsApp — l'agent IA répond, présente les produits et collecte les informations de commande"}
          </p>
        </div>

        <div className="relative h-[400px] sm:h-[450px] flex items-end justify-center">
          {screenshots.map((img, i) => {
            const rotation = (i - 1) * 15
            const translateY = Math.abs(i - 1) * -20
            const translateX = (i - 1) * 60
            const zIndex = i === 1 ? 30 : 20 - Math.abs(i - 1) * 5

            return (
              <div
                key={i}
                className={`absolute bottom-0 transition-all duration-700 ease-out group
                  ${visible ? "opacity-100" : "opacity-0"}`}
                style={{
                  transitionDelay: visible ? `${200 + i * 200}ms` : "0ms",
                  transform: visible
                    ? `rotate(${rotation}deg) translateX(${translateX}px) translateY(${translateY}px)`
                    : `rotate(0deg) translateX(${(i - 1) * 20}px) translateY(50px)`,
                  zIndex,
                }}
              >
                <div
                  onClick={() => setLightboxIndex(i)}
                  className={`relative p-2 sm:p-3 cursor-pointer select-none
                    ${isDark ? 'bg-black/60' : 'bg-slate-100/90'}
                    rounded-2xl sm:rounded-3xl shadow-2xl
                    transition-all duration-300
                    group-hover:scale-110 group-hover:-translate-y-4`}
                >
                  <div className={`rounded-xl sm:rounded-2xl overflow-hidden border-2 w-[180px] sm:w-[220px]
                    ${isDark ? 'border-white/20' : 'border-slate-300'}`}>
                    <Image
                      src={img.src}
                      alt={img.alt}
                      width={220}
                      height={440}
                      className="w-full h-auto object-cover"
                    />
                  </div>

                  <div className={`absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold shadow-lg
                    ${isDark ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}`}>
                    <MessageCircle size={10} />
                    WhatsApp
                  </div>

                  <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    ${isDark ? 'bg-black/30' : 'bg-black/20'}`}>
                    <div className="bg-white/90 rounded-full p-2.5 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="#534AB7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                    </div>
                  </div>

                  <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full blur-sm
                    ${isDark ? 'bg-white/30' : 'bg-black/20'}`} />
                </div>
              </div>
            )
          })}
        </div>

        <div className={`mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8 transition-all duration-700 delay-500
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          {[
            { icon: Bot, text: language === "ar" ? "ردود واتساب تلقائية" : "Réponses WhatsApp automatisées" },
            { icon: MessageCircle, text: language === "ar" ? "دارija طبيعية" : "Darija naturelle" },
            { icon: Sparkles, text: language === "ar" ? "ذكاء اصطناعي مضبوط" : "IA configurée" },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-2 text-sm font-medium
              ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
              <item.icon size={18} className={isDark ? 'text-brand-300' : 'text-brand-600'} />
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQSection({ theme }) {
  const { ref, visible } = useReveal()
  const { t, language } = useLanguage()
  const isRTL = language === "ar"
  const isDark = theme === "dark"
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    { q: t("land.faq1_q"), a: t("land.faq1_a"), icon: Shield },
    { q: t("land.faq2_q"), a: t("land.faq2_a"), icon: Zap },
    { q: t("land.faq3_q"), a: t("land.faq3_a"), icon: MessageCircle },
    { q: t("land.faq4_q"), a: t("land.faq4_a"), icon: ShoppingBag },
    { q: t("land.faq5_q"), a: t("land.faq5_a"), icon: Phone },
  ]

  return (
    <section id="faq" className="py-10 sm:py-16 md:py-28 relative overflow-hidden">
      <div ref={ref} className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-8 sm:mb-14 transition-all duration-700
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <SectionBadge icon={MessageCircle} label={t("land.faq_badge")} isDark={isDark} />
          <h2 className={`text-2xl sm:text-3xl md:text-5xl font-extrabold mb-3 sm:mb-5 tracking-tight ${isDark ? 'text-white' : 'text-brand-900'}`}>
            {t("land.faq_title")}
          </h2>
          <p className={`text-sm sm:text-base leading-loose ${isDark ? 'text-white/80' : 'text-slate-600'}`}>
            {t("land.faq_sub")}
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-500
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
                ${isDark
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-white/80 border border-slate-200/70'}`}
              style={{ transitionDelay: visible ? `${200 + i * 100}ms` : "0ms" }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className={`w-full flex items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 lg:p-6 transition-colors
                  ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}
                  ${isDark ? 'hover:bg-white/15' : 'hover:bg-white/80'}`}
              >
                <span className={`font-bold text-sm sm:text-base lg:text-lg leading-relaxed ${isDark ? 'text-white' : 'text-brand-800'}`}>
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0 align-middle mx-2
                    ${isDark ? 'bg-white/10 text-brand-300' : 'border border-slate-200 bg-white text-brand-600'}`}>
                    <faq.icon size={16} />
                  </span>
                  {faq.q}
                </span>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300
                  ${openIndex === i ? "rotate-180" : ""}
                  ${isDark ? 'bg-white/10' : 'border border-slate-200 bg-white/80'}`}>
                  <ChevronDown size={14} className={`sm:w-4 sm:h-4 ${isDark ? 'text-brand-300' : 'text-brand-600'}`} />
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openIndex === i ? "max-h-[500px]" : "max-h-0"}`}>
                <div className={`px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6 text-sm sm:text-base leading-relaxed border-t pt-3 sm:pt-4
                  ${isDark ? 'text-white/80 border-white/20' : 'text-slate-600 border-slate-200/70'}`}>
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhatsAppFloatButton() {
  return (
    <a
      href="https://wa.me/212612455372"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
      style={{ backgroundColor: "#534AB7", boxShadow: "0 10px 25px rgba(83,74,183,0.35)" }}
      aria-label="WhatsApp"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.747.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.13 1.521 5.897L.575 24l6.334-1.654a11.87 11.87 0 005.642 1.411h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  )
}

function CTASection({ theme }) {
  const { ref, visible } = useReveal()
  const { t } = useLanguage()
  const isDark = theme === "dark"

  return (
    <section ref={ref} className="py-10 sm:py-16 md:py-28 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative">
        <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className={`inline-flex items-center gap-2 backdrop-blur-sm rounded-full px-4 py-2 mb-6 shadow-sm
            ${isDark
              ? 'bg-white/10 border border-white/20'
              : 'bg-white/80 border border-slate-200/70'}`}>
            <Zap size={13} className={isDark ? 'text-brand-300 shrink-0' : 'text-brand-600 shrink-0'} />
            <span className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white/90' : 'text-brand-700'}`}>{t("land.cta_badge")}</span>
          </div>
        </div>

        <div className={`transition-all duration-700 delay-150 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className={`text-2xl sm:text-4xl md:text-6xl font-extrabold mb-4 sm:mb-7 leading-tight tracking-tight ${isDark ? 'text-white' : 'text-brand-900'}`}>
            {t("land.cta_title1")}
            <br />
            {t("land.cta_title2")}
          </h2>
        </div>

        <div className={`transition-all duration-700 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className={`text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed ${isDark ? 'text-white/80' : 'text-slate-600'}`}>
            {t("land.cta_sub")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 w-full sm:w-auto">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5
                bg-brand-600 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-extrabold text-sm sm:text-base
                hover:bg-brand-700 transition-all hover:shadow-2xl hover:shadow-brand-600/30
                hover:-translate-y-1.5 active:scale-95 group"
            >
              {t("land.cta_btn")}
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors px-5 sm:px-7 py-3 sm:py-4 rounded-xl sm:rounded-2xl backdrop-blur-sm
                ${isDark
                  ? 'text-white/80 hover:text-white border border-white/25 hover:border-white/50 hover:bg-white/10'
                  : 'text-brand-700 hover:text-brand-800 border border-slate-200/80 hover:border-slate-300 hover:bg-white bg-white/80'}`}
            >
              {t("land.cta_login")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer({ theme }) {
  const { t, language } = useLanguage()
  const isDark = theme === "dark"
  const isRTL = language === "ar"

  const logoSrc = isDark
    ? "/logo/wakil-logo-dark.svg"
    : "/logo/wakil-logo-light.svg"

  const footerLinks = {
    product: [
      { key: "nav_features", href: "/features" },
      { key: "nav_agent", href: "#ai-agent" },
      { key: "nav_blog", href: "/blogs" },
      { key: "nav_faq", href: "#faq" },
    ],
    support: [
      { key: "footer_terms", href: "/terms" },
      { key: "footer_privacy", href: "/privacy" },
      { key: "footer_contact", href: "mailto:contact@wakil.ma" },
    ],
  }

  const socialLinks = [
    { icon: MessageCircle, href: "https://wa.me/212612455372", label: "WhatsApp" },
    { icon: Mail, href: "mailto:contact@wakil.ma", label: "Email" },
  ]

  return (
    <footer className={`border-t backdrop-blur-md transition-colors duration-300
      ${isDark
        ? 'border-white/10 bg-black/40'
        : 'border-slate-200/70 bg-white/60'}`}>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 ${isRTL ? 'text-right' : 'text-left'}`}>

          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <Link href="/" dir="ltr" className="flex items-center">
                <Image
                  src={logoSrc}
                  alt="wakil.ma"
                  width={168}
                  height={38}
                  className="h-7 w-auto sm:h-8 md:h-9"
                />
              </Link>
            </div>
            <p className={`text-sm leading-relaxed mb-6 max-w-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              {language === "ar"
                ? "وكيل المبيعات الذكي على واتساب — أتمتة المحادثات، زيادة المبيعات، وتجربة عملاء متميزة للمتاجر المغربية."
                : "Agent de vente intelligent sur WhatsApp — automatisez vos conversations, augmentez vos ventes et offrez une expérience client exceptionnelle."
              }
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center
                    transition-all duration-300
                    ${isDark
                      ? 'bg-white/10 border border-white/20 text-white/70 hover:text-white hover:bg-white/20 hover:border-white/30'
                      : 'bg-white/80 border border-slate-200/70 text-brand-600 hover:text-brand-700 hover:border-brand-300/50 hover:bg-white'}`}
                  aria-label={social.label}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className={`font-bold mb-4 text-sm uppercase tracking-wider ${isDark ? 'text-white/80' : 'text-brand-800'}`}>
              {language === "ar" ? "المنتج" : "Produit"}
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    className={`text-sm transition-colors duration-200
                      ${isDark ? 'text-white/50 hover:text-brand-300' : 'text-slate-600 hover:text-brand-600'}`}
                  >
                    {t(`land.${link.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`font-bold mb-4 text-sm uppercase tracking-wider ${isDark ? 'text-white/80' : 'text-brand-800'}`}>
              {language === "ar" ? "الدعم" : "Support"}
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    className={`text-sm transition-colors duration-200
                      ${isDark ? 'text-white/50 hover:text-brand-300' : 'text-slate-600 hover:text-brand-600'}`}
                  >
                    {t(`land.${link.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={`border-t ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-200/70 bg-white/45'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <p className={`text-xs text-center sm:text-left ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
              © {new Date().getFullYear()} wakil.ma — {t("land.footer_copy")}
            </p>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                ${isDark ? 'bg-white/10 border border-white/20' : 'bg-white/80 border border-slate-200/70'}`}>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-brand-700'}`}>
                  {language === "ar" ? "النظام يعمل" : "Système opérationnel"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ═══════════════════════════════════════════════════════════
// 5. PAGE
// ═══════════════════════════════════════════════════════════

export default function LandingPage() {
  const { dir } = useLanguage()
  const { theme, toggleTheme } = useAppTheme()
  const isDark = theme === "dark"

  return (
    <div className="min-h-screen relative" dir={dir}>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping { animation: ping 1.5s cubic-bezier(0,0,.2,1) infinite; }
        @keyframes heroChatIn {
          0%, 8% { opacity: 0; transform: translateY(8px); }
          16%, 86% { opacity: 1; transform: translateY(0); }
          100% { opacity: .88; transform: translateY(0); }
        }
      `}</style>

      {/* خلفية الصفحة */}
      <div
        className="fixed inset-0 -z-20 transition-all duration-700"
        style={{
          backgroundImage: isDark
            ? "url('/img_hero_bg/img_home_page_darck_bg.jpg')"
            : "url('/img_hero_bg/img_hero_bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className={`fixed inset-0 -z-10 transition-all duration-700
        ${isDark ? 'bg-black/50' : 'bg-white/45'}`}
      />

      <Header theme={theme} toggleTheme={toggleTheme} />
      <HeroSection theme={theme} />
      <WakilHandDrawnMap theme={theme} />
      <FeaturesSection theme={theme} />
      <FAQSection theme={theme} />
      <WhatsAppFloatButton />
      <CTASection theme={theme} />
      <Footer theme={theme} />
    </div>
  )
}