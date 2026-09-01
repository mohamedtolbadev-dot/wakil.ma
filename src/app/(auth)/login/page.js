"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import Link from "next/link"
import { authAPI } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppTheme } from "@/hooks/useAppTheme"
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react"


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

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { isDark } = useAppTheme()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

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

      if (token) localStorage.setItem("token", token)
      if (user) localStorage.setItem("user", JSON.stringify(user))

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

  // Initialize Google Sign-In - with mobile check
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    const initGoogle = () => {
      if (!GOOGLE_CLIENT_ID) {
        console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured")
        setError(t('common.google_not_configured'))
        return
      }

      if (typeof window !== "undefined" && window.google) {
        console.log("Initializing Google Sign-In...", isMobile ? "(Mobile detected)" : "(Desktop)")
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: !isMobile,
            ux_mode: isMobile ? "redirect" : "popup",
          })
          console.log("Google Sign-In initialized successfully")
        } catch (err) {
          console.error("Error initializing Google Sign-In:", err)
        }
      } else if (typeof window !== "undefined") {
        console.log("Google not ready yet or missing client_id")
      }
    }

    initGoogle()
    const timer = setTimeout(initGoogle, 1000)
    return () => clearTimeout(timer)
  }, [handleGoogleResponse, t])

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!email || !password) {
      setError(t('auth.required_fields'))
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await authAPI.login(email, password)
      
      const token = response?.data?.token || response?.token
      const user = response?.data?.user || response?.user
      if (!token || !user) {
        throw new Error(t('auth.login_incomplete'))
      }

      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))

      await verifySessionToken(token)

      router.push("/dashboard")
    } catch (err) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      setError(err.message || t('auth.login_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4" dir="rtl">
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
          console.log("Google Script loaded!")
          if (!GOOGLE_CLIENT_ID) {
            console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured")
            return
          }

          if (typeof window !== "undefined" && window.google) {
            try {
              window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: (response) => {
                  console.log("Google callback received")
                  handleGoogleResponse(response)
                },
              })
              console.log("Google Sign-In initialized on Script load")
            } catch (err) {
              console.error("Error initializing Google Sign-In on load:", err)
            }
          }
        }}
        onError={(e) => {
          console.error("Error loading Google Script:", e)
        }}
      />

      <div className="w-full max-w-md">
        {/* Back to home */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={16} />
            {t('auth.back_home')}
          </Link>
        </div>

        {/* Form Card — matching home page style */}
        <div className={`w-full max-w-md backdrop-blur-md rounded-2xl p-8 border transition-all duration-300 hover:shadow-xl
          ${isDark 
            ? 'bg-black/40 border-white/20 hover:bg-black/50 hover:border-white/30 hover:shadow-white/5' 
            : 'bg-white/70 border-brand-200/50 hover:bg-white/80 hover:border-brand-300/50 hover:shadow-brand-600/10'}`}>
          
          {/* Header with Icon */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Mail size={20} className="text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('auth.login')}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{t('auth.login_subtitle')}</p>
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
                // Check if mobile
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                if (isMobile) {
                  // On mobile, use redirect flow instead of prompt
                  window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                      // If One Tap is not displayed, try redirect
                      window.google.accounts.id.disableAutoSelect()
                    }
                  })
                } else {
                  // Desktop: use normal prompt
                  window.google.accounts.id.prompt()
                }
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
            <span className="text-lg">{t('auth.google')}</span>
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
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t('auth.email')}</label>
              <div className="relative group">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand-600 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pr-10 pl-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-brand-400 transition-all"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">{t('auth.password')}</label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                >
                  {t('auth.forgot_password') || "نسيت كلمة السر؟"}
                </Link>
              </div>
              <div className="relative group">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand-600 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-10 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-brand-400 transition-all"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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
                  {t('auth.login_loading')}
               </>
              ) : (
                t('auth.login')
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.no_account')}{" "}
              <Link 
                href="/register" 
                className="text-brand-600 font-semibold hover:text-brand-800 transition-colors"
              >
                {t('auth.register_now')}
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
