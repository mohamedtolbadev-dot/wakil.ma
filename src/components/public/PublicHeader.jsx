"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Menu, Moon, Sun, X } from "lucide-react"
import { Logo } from "@/components/shared/Logo"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppTheme } from "@/hooks/useAppTheme"
import {
  notifyAuthChange,
  readIsLoggedInSnapshot,
  readUserSnapshot,
  subscribeAuth,
} from "@/lib/browserState"

function useScrollDetection() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return scrolled
}

function usePublicAuth() {
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

  function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    notifyAuthChange()
    router.push("/login")
  }

  function getInitials() {
    const name = String(user?.name || "").trim()
    if (!name) return "WK"

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }

  return { isLoggedIn, user, logout, getInitials }
}

function UserAvatar({ initials }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white shadow-sm">
      {initials}
    </div>
  )
}

function HeaderIconButton({ onClick, label, children, isDark, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-9 w-9 place-items-center rounded-xl border transition hover:scale-105 active:scale-95 ${
        isDark
          ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
          : "border-brand-100 bg-white text-brand-700 hover:bg-brand-50"
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname() || "/"
  const scrolled = useScrollDetection()
  const { language, setLanguage, t, isRTL } = useLanguage()
  const { isDark, toggleTheme } = useAppTheme()
  const { isLoggedIn, user, logout, getInitials } = usePublicAuth()

  const navLinks = [
    {
      href: "/",
      label: language === "ar" ? "الرئيسية" : "Accueil",
      active: pathname === "/",
    },
    {
      href: pathname === "/" ? "#ai-agent" : "/#ai-agent",
      label: t("land.nav_agent"),
      active: false,
    },
    {
      href: "/features",
      label: t("land.nav_features"),
      active: pathname === "/features",
    },
    {
      href: "/pricing",
      label: t("landing.pricing"),
      active: pathname === "/pricing",
    },
    {
      href: "/blogs",
      label: t("land.nav_blog"),
      active: pathname.startsWith("/blogs"),
    },
    {
      href: pathname === "/" ? "#faq" : "/#faq",
      label: t("land.nav_faq"),
      active: false,
    },
  ]

  const toggleLanguage = () => setLanguage(isRTL ? "fr" : "ar")
  const closeMobileMenu = () => setMobileMenuOpen(false)
  const initials = getInitials()

  function handleLogout() {
    logout()
    closeMobileMenu()
  }

  return (
    <header
      dir={isRTL ? "rtl" : "ltr"}
      className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-300 ${
        isDark ? "border-white/10 bg-[#090817]/80" : "border-brand-100 bg-white/80"
      } ${scrolled ? "shadow-sm shadow-black/5" : ""}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6 sm:py-3">
        <Logo />

        <nav className="hidden items-center gap-4 md:flex lg:gap-5">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`relative py-1 text-sm font-bold transition ${
                item.active
                  ? "text-brand-600"
                  : isDark
                    ? "text-white/65 hover:text-white"
                    : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {item.label}
              <span
                className={`absolute bottom-0 h-0.5 rounded-full bg-brand-600 transition-all duration-300 ${
                  isRTL ? "right-0" : "left-0"
                } ${item.active ? "w-full" : "w-0"}`}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <HeaderIconButton onClick={toggleTheme} label="Toggle theme" isDark={isDark}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </HeaderIconButton>

          <button
            type="button"
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className={`h-9 rounded-xl border px-3 text-xs font-black transition hover:scale-105 active:scale-95 ${
              isDark
                ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
                : "border-brand-100 bg-white text-brand-700 hover:bg-brand-50"
            }`}
          >
            {isRTL ? "FR" : "عربي"}
          </button>

          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="hidden items-center gap-1.5 sm:flex">
                <UserAvatar initials={initials} />
                <span
                  className={`hidden max-w-[74px] truncate text-xs font-semibold md:block ${
                    isDark ? "text-white/65" : "text-slate-600"
                  }`}
                >
                  {user?.name || "User"}
                </span>
              </Link>
              <HeaderIconButton onClick={handleLogout} label={t("topbar.logout")} isDark={isDark}>
                <LogOut size={15} />
              </HeaderIconButton>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`hidden rounded-xl px-3 py-2 text-sm font-bold transition sm:inline-flex ${
                  isDark ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {t("land.login")}
              </Link>
              <Link
                href="/register"
                className="hidden rounded-xl bg-brand-600 px-3 py-2 text-sm font-black text-white transition hover:bg-brand-700 sm:inline-flex sm:px-4"
              >
                {t("land.free_trial")}
              </Link>
            </>
          )}

          <HeaderIconButton
            onClick={() => setMobileMenuOpen((open) => !open)}
            label="Menu"
            isDark={isDark}
            className="md:hidden"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </HeaderIconButton>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 md:hidden ${
          mobileMenuOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className={`border-t px-4 py-3 ${isDark ? "border-white/10 bg-[#090817]/95" : "border-brand-100 bg-white/95"}`}>
          <div className="space-y-1">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                aria-current={item.active ? "page" : undefined}
                className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${
                  item.active
                    ? isDark
                      ? "bg-brand-600/15 text-brand-300"
                      : "bg-brand-50 text-brand-600"
                    : isDark
                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className={`my-2 border-t ${isDark ? "border-white/10" : "border-slate-100"}`} />

          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                onClick={closeMobileMenu}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  isDark ? "text-brand-300 hover:bg-white/10" : "text-brand-600 hover:bg-brand-50"
                }`}
              >
                <UserAvatar initials={initials} />
                {t("nav.dashboard")}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-red-500 transition hover:bg-red-500/10"
              >
                <LogOut size={16} />
                {t("topbar.logout")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${
                  isDark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {t("land.login")}
              </Link>
              <Link
                href="/register"
                onClick={closeMobileMenu}
                className="block rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white transition hover:bg-brand-700"
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
