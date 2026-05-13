"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import Link from "next/link"
import { authAPI } from "@/lib/api"
import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"
import { useAppTheme } from "@/hooks/useAppTheme"
import { Loader2, User, Mail, Lock, ArrowLeft, CheckCircle, Phone, ChevronDown } from "lucide-react"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

async function verifySessionToken(token) {
  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "same-origin",
  })

  let data = null
  try {
    data = await response.json()
  } catch {}

  if (!response.ok) {
    throw new Error(data?.error || "Session verification failed")
  }

  return data?.data || data
}

function parseBiErr(msg, lang) {
  if (!msg || !msg.includes("||fr:") && !msg.includes("fr:")) return msg
  const fr = msg.split("||ar:")[0]?.replace(/^fr:/, "")
  const ar = msg.split("||ar:")[1] || msg.split("||")?.[1]
  return lang === "ar" ? (ar || msg) : (fr || msg)
}

/* ─── Country dial codes ─── */
const COUNTRIES = [
  { code: "MA", flag: "\uD83C\uDDF2\uD83C\uDDE6", fr: "Maroc",           ar: "\u0627\u0644\u0645\u063a\u0631\u0628",     dial: "+212", ph: "06 XX XX XX XX" },
  { code: "SA", flag: "\uD83C\uDDF8\uD83C\uDDE6", fr: "Arabie saoudite",  ar: "\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629",   dial: "+966", ph: "05X XXX XXXX"  },
  { code: "AE", flag: "\uD83C\uDDE6\uD83C\uDDEA", fr: "\u00c9mirats arabes",   ar: "\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a",   dial: "+971", ph: "05X XXX XXXX"  },
  { code: "QA", flag: "\uD83C\uDDF6\uD83C\uDDE6", fr: "Qatar",            ar: "\u0642\u0637\u0631",         dial: "+974", ph: "3X XX XXXX"    },
  { code: "KW", flag: "\uD83C\uDDF0\uD83C\uDDFC", fr: "Kowe\u00ebt",           ar: "\u0627\u0644\u0643\u0648\u064a\u062a",     dial: "+965", ph: "5X XX XXXX"    },
  { code: "BH", flag: "\uD83C\uDDE7\uD83C\uDDED", fr: "Bahre\u00efn",          ar: "\u0627\u0644\u0628\u062d\u0631\u064a\u0646",   dial: "+973", ph: "3X XX XXXX"    },
  { code: "OM", flag: "\uD83C\uDDF4\uD83C\uDDF2", fr: "Oman",             ar: "\u0639\u064f\u0645\u0627\u0646",        dial: "+968", ph: "9X XX XXXX"    },
  { code: "FR", flag: "\uD83C\uDDEB\uD83C\uDDF7", fr: "France",           ar: "\u0641\u0631\u0646\u0633\u0627",       dial: "+33",  ph: "06 XX XX XX XX" },
  { code: "DE", flag: "\uD83C\uDDE9\uD83C\uDDEA", fr: "Allemagne",        ar: "\u0623\u0644\u0645\u0627\u0646\u064a\u0627",      dial: "+49",  ph: "015X XXXXXXX"  },
  { code: "GB", flag: "\uD83C\uDDEC\uD83C\uDDE7", fr: "Royaume-Uni",      ar: "\u0628\u0631\u064a\u0637\u0627\u0646\u064a\u0627",    dial: "+44",  ph: "07XXX XXXXXX"  },
  { code: "ES", flag: "\uD83C\uDDEA\uD83C\uDDF8", fr: "Espagne",          ar: "\u0625\u0633\u0628\u0627\u0646\u064a\u0627",     dial: "+34",  ph: "6XX XXX XXX"   },
  { code: "IT", flag: "\uD83C\uDDEE\uD83C\uDDF9", fr: "Italie",           ar: "\u0625\u064a\u0637\u0627\u0644\u064a\u0627",     dial: "+39",  ph: "3XX XXX XXXX"  },
  { code: "US", flag: "\uD83C\uDDFA\uD83C\uDDF8", fr: "\u00c9tats-Unis",       ar: "\u0623\u0645\u0631\u064a\u0643\u0627",      dial: "+1",   ph: "(555) XXX-XXXX" },
  { code: "CA", flag: "\uD83C\uDDE8\uD83C\uDDE6", fr: "Canada",           ar: "\u0643\u0646\u062f\u0627",        dial: "+1",   ph: "(555) XXX-XXXX" },
]

// Google Icon Component - Brand Colors
function GoogleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const { t, language, setLanguage, isRTL } = useLanguage()
  const { isDark } = useAppTheme()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [showCountryDrop, setShowCountryDrop] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowCountryDrop(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleGoogleResponse = useCallback(async (response) => {
    try {
      setGoogleLoading(true)
      setError(null)

      const result = await authAPI.googleLogin(response.credential)
      const token = result?.data?.token || result?.token
      const user = result?.data?.user || result?.user
      if (!token || !user) {
        throw new Error(t('auth.google_incomplete'))
      }

      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))

      await verifySessionToken(token)

      router.push("/dashboard")
    } catch (err) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      setError(err.message || t('auth.google_error'))
    } finally {
      setGoogleLoading(false)
    }
  }, [router, t])

  // Initialize Google Sign-In
  useEffect(() => {
    const initGoogle = () => {
      if (!GOOGLE_CLIENT_ID) {
        console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured")
        setError(t('common.google_not_configured'))
        return
      }
      if (typeof window !== "undefined" && window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
          })
        } catch (err) {
          console.error("Error initializing Google Sign-In:", err)
        }
      }
    }

    initGoogle()
    const timer = setTimeout(initGoogle, 1000)
    return () => clearTimeout(timer)
  }, [handleGoogleResponse, t])

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.password) {
      setError(t('auth.required_all'))
      return
    }
    if (formData.password.length < 8) {
      setError(t('auth.password_min'))
      return
    }

    try {
      setLoading(true)
      setError(null)

      const phone = formData.phone?.trim()
        ? selectedCountry.dial + formData.phone.trim().replace(/^0+/, "")
        : undefined

      const res = await authAPI.sendOtp({
        name:     formData.name,
        email:    formData.email,
        password: formData.password,
        phone,
      })

      sessionStorage.setItem("otp_email",  formData.email)
      sessionStorage.setItem("otp_masked", res.data?.masked || formData.email)
      if (res.data?.devCode) sessionStorage.setItem("otp_dev", res.data.devCode)

      router.push("/verify")
    } catch (err) {
      setError(parseBiErr(err.message, language) || t('auth.register_error'))
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* ✅ خلفية الصفحة — fixed على مستوى الجذر */}
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
      {/* ✅ overlay خفيف يحسن قراءة النص */}
      <div className={`fixed inset-0 -z-10 transition-all duration-700
        ${isDark ? 'bg-black/50' : 'bg-white/45'}`}
      />
      {/* Load Google Identity Services */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="lazyOnload"
        onLoad={() => {
          if (!GOOGLE_CLIENT_ID) {
            console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured")
            return
          }

          if (typeof window !== "undefined" && window.google) {
            try {
              window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
              })
            } catch (err) {
              console.error("Error initializing Google Sign-In on load:", err)
            }
          }
        }}
      />

      <div className="w-full max-w-md">
        {/* Back to home + Language switcher */}
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={16} />
            {t('auth.back_home')}
          </Link>
          <div className="flex items-center rounded-lg border border-border/60 overflow-hidden text-[11px] font-bold bg-background/60 backdrop-blur-sm">
            <button
              onClick={() => setLanguage('fr')}
              className={cn(
                "px-2.5 py-1 transition-colors",
                language === 'fr' ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-secondary"
              )}
            >FR</button>
            <button
              onClick={() => setLanguage('ar')}
              className={cn(
                "px-2.5 py-1 transition-colors",
                language === 'ar' ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-secondary"
              )}
            >AR</button>
          </div>
        </div>

        {/* Form Card — matching home page style */}
        <div className={`w-full max-w-md backdrop-blur-md rounded-2xl p-8 border transition-all duration-300 hover:shadow-xl
          ${isDark 
            ? 'bg-black/40 border-white/20 hover:bg-black/50 hover:border-white/30 hover:shadow-white/5' 
            : 'bg-white/70 border-brand-200/50 hover:bg-white/80 hover:border-brand-300/50 hover:shadow-brand-600/10'}`}>
          
          {/* Header with Icon */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <User size={20} className="text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('auth.register')}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{t('auth.register_subtitle')}</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-5 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={() => {
              if (!GOOGLE_CLIENT_ID) {
                setError("Google Client ID is not configured")
                return
              }
              if (window.google) {
                window.google.accounts.id.prompt()
              } else {
                setError(t('auth.google_loading'))
              }
            }}
            disabled={googleLoading || !GOOGLE_CLIENT_ID}
            className={cn(
              "w-full flex items-center justify-center gap-3 border py-2.5 rounded-lg font-semibold transition-all mb-4",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isDark 
                ? "bg-white/10 border-white/20 text-white hover:bg-white/20" 
                : "bg-white border-border text-foreground hover:bg-secondary"
            )}
          >
            {googleLoading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <GoogleIcon size={22} />
            )}
            <span className="text-lg">{t('auth.register_google')}</span>
          </button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">{t('auth.or')}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t('auth.full_name')} <span className="text-red-500">*</span></label>
              <div className="relative group">
                <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand-600 transition-colors" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('auth.name_placeholder')}
                  className="w-full pr-10 pl-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-brand-400 transition-all"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t('auth.email')} <span className="text-red-500">*</span></label>
              <div className="relative group">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand-600 transition-colors" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full pr-10 pl-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-brand-400 transition-all"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                <Phone size={12} className="inline me-1 mb-0.5" />
                {t('auth.phone')} <span className="text-muted-foreground text-[10px] ms-1">({t('auth.optional')})</span>
              </label>
              <div className="flex items-stretch gap-0" dir="ltr" ref={dropRef}>

                {/* Country selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryDrop(v => !v)}
                    className="flex items-center gap-1.5 h-full px-3 py-2.5 bg-background border border-border rounded-s-lg text-sm font-medium hover:bg-secondary transition-colors border-e-0 min-w-[90px]"
                  >
                    <span className="text-base leading-none">{selectedCountry.flag}</span>
                    <span className="text-muted-foreground text-xs">{selectedCountry.dial}</span>
                    <ChevronDown size={12} className={`text-muted-foreground transition-transform ${showCountryDrop ? "rotate-180" : ""}`} />
                  </button>

                  {showCountryDrop && (
                    <div className="absolute top-full left-0 mt-1 z-50 w-52 max-h-56 overflow-y-auto bg-card border border-border rounded-xl shadow-xl py-1">
                      {COUNTRIES.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setSelectedCountry(c); setShowCountryDrop(false) }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left",
                            selectedCountry.code === c.code && "bg-brand-600/10 text-brand-700 font-medium"
                          )}
                        >
                          <span className="text-base">{c.flag}</span>
                          <span className="flex-1 truncate">{language === 'ar' ? c.ar : c.fr}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{c.dial}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Number input */}
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={selectedCountry.ph}
                  className="flex-1 px-3 py-2.5 bg-background border border-border rounded-e-lg text-sm outline-none focus:border-brand-400 transition-all"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t('auth.password')} <span className="text-red-500">*</span></label>
              <div className="relative group">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand-600 transition-colors" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-brand-400 transition-all"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Submit Button - Dashboard Style */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex items-center justify-center gap-2 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-all mt-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-sm hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('auth.creating')}
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  {t('auth.register')}
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.has_account')}{" "}
              <Link 
                href="/login" 
                className="text-brand-600 font-semibold hover:text-brand-800 transition-colors"
              >
                {t('auth.login_link')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {t('auth.salesbot_tagline')}
        </p>
      </div>
    </div>
  )
}
