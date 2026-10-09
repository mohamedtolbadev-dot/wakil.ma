"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authAPI } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppTheme } from "@/hooks/useAppTheme"
import { Loader2, ArrowLeft, Mail, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react"

function parseBiErr(msg, lang) {
  if (!msg || !msg.includes("fr:")) return msg
  const fr = msg.split("||ar:")[0]?.replace(/^fr:/, "")
  const ar = msg.split("||ar:")[1]
  return lang === "ar" ? (ar || msg) : (fr || msg)
}

const OTP_LENGTH = 6

export default function VerifyPage() {
  const router = useRouter()
  const { t, language, setLanguage, isRTL } = useLanguage()
  const { isDark } = useAppTheme()

  const [digits, setDigits]         = useState(Array(OTP_LENGTH).fill(""))
  const [loading, setLoading]       = useState(false)
  const [resending, setResending]   = useState(false)
  const [error, setError]           = useState(null)
  const [success, setSuccess]       = useState(false)
  const [email, setEmail]           = useState("")
  const [masked, setMasked]         = useState("")
  const [resendTimer, setResendTimer] = useState(60)
  const [expireTimer, setExpireTimer] = useState(15 * 60)
  const inputRefs = useRef([])

  useEffect(() => {
    const e = sessionStorage.getItem("otp_email")
    const m = sessionStorage.getItem("otp_masked")
    if (!e) { router.push("/register"); return }
    setEmail(e)
    setMasked(m || e)

    const devCode = sessionStorage.getItem("otp_dev")
    if (devCode) setDigits(devCode.split(""))

    inputRefs.current[0]?.focus()
  }, [router])

  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setTimeout(() => setResendTimer(v => v - 1), 1000)
    return () => clearTimeout(id)
  }, [resendTimer])

  useEffect(() => {
    if (expireTimer <= 0) return
    const id = setTimeout(() => setExpireTimer(v => v - 1), 1000)
    return () => clearTimeout(id)
  }, [expireTimer])

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0")
    const s = (secs % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  function handleDigitChange(index, value) {
    const digit = value.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError(null)
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    if (!text) return
    const next = Array(OTP_LENGTH).fill("")
    text.split("").forEach((c, i) => { next[i] = c })
    setDigits(next)
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus()
  }

  const handleVerify = useCallback(async () => {
    const code = digits.join("")
    if (code.length < OTP_LENGTH) { setError(t("auth.verify_incomplete")); return }
    try {
      setLoading(true)
      setError(null)
      const res = await authAPI.verifyOtp({ email, code })
      const token = res?.data?.token || res?.token
      const user = res?.data?.user || res?.user
      if (token) localStorage.setItem("token", token)
      if (user) localStorage.setItem("user", JSON.stringify(user))
      sessionStorage.removeItem("otp_email")
      sessionStorage.removeItem("otp_masked")
      sessionStorage.removeItem("otp_dev")
      setSuccess(true)
      setTimeout(() => router.push("/dashboard"), 1200)
    } catch (err) {
      setError(parseBiErr(err.message, language) || t("auth.verify_error"))
      setDigits(Array(OTP_LENGTH).fill(""))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }, [digits, email, router, t, language])

  useEffect(() => {
    if (digits.every(d => d !== "") && !loading) handleVerify()
  }, [digits, handleVerify, loading])

  async function handleResend() {
    if (resendTimer > 0 || !email) return
    try {
      setResending(true)
      setError(null)
      const res = await authAPI.resendOtp(email)
      if (res.data?.devCode) setDigits(res.data.devCode.split(""))
      setResendTimer(60)
      setExpireTimer(15 * 60)
      if (!res.data?.devCode) setDigits(Array(OTP_LENGTH).fill(""))
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(parseBiErr(err.message, language) || t("auth.verify_resend_error"))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4" dir={isRTL ? "rtl" : "ltr"}>

      {/* Background */}
      <div
        className="fixed inset-0 -z-20 transition-all duration-700"
        style={{
          backgroundImage: isDark
            ? "url('/img_hero_bg/img_home_page_darck_bg.jpg')"
            : "none",
          backgroundColor: isDark ? undefined : "#ffffff",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className={`fixed inset-0 -z-10 transition-all duration-700 ${isDark ? "bg-black/50" : "bg-white"}`} />

      <div className="w-full max-w-md">

        {/* Header row */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={16} />
            {t("auth.back_register")}
          </Link>
          <div className="flex items-center rounded-lg border border-border/60 overflow-hidden text-[11px] font-bold bg-background/60 backdrop-blur-sm">
            <button
              onClick={() => setLanguage("fr")}
              className={cn("px-2.5 py-1 transition-colors", language === "fr" ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-secondary")}
            >FR</button>
            <button
              onClick={() => setLanguage("ar")}
              className={cn("px-2.5 py-1 transition-colors", language === "ar" ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-secondary")}
            >AR</button>
          </div>
        </div>

        {/* Card */}
        <div className={`w-full backdrop-blur-md rounded-2xl p-4 sm:p-6 md:p-8 border transition-all duration-300
          ${isDark
            ? "bg-black/40 border-white/20 hover:bg-black/50 hover:border-white/30"
            : "bg-white/70 border-brand-200/50 hover:bg-white/80 hover:border-brand-300/50"}`}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              success ? "bg-green-500/20" : "bg-brand-600/10"
            )}>
              {success
                ? <CheckCircle2 size={20} className="text-green-500" />
                : <ShieldCheck   size={20} className="text-brand-600" />
              }
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {success ? t("auth.verify_success_title") : t("auth.verify_title")}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {success
                  ? t("auth.verify_success_sub")
                  : <>{t("auth.verify_subtitle")} <span className="font-semibold text-foreground" dir="ltr">{masked}</span></>
                }
              </p>
            </div>
          </div>

          {/* Email hint */}
          {!success && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-6">
              <Mail size={16} className="text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-400">{t("auth.verify_email_hint")}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-5 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          {!success && (
            <>
              {/* OTP boxes */}
              <div className="flex gap-1.5 sm:gap-2 justify-center mb-6" dir="ltr">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className={cn(
                      "w-9 h-12 sm:w-11 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl border-2 outline-none transition-all bg-background",
                      d
                        ? "border-brand-600 text-brand-600 bg-white"
                        : "border-border text-foreground focus:border-brand-400"
                    )}
                  />
                ))}
              </div>

              {/* Expire timer */}
              <p className="text-center text-xs text-muted-foreground mb-5">
                {expireTimer > 0
                  ? <>{t("auth.verify_expires")} <span className={cn("font-mono font-semibold", expireTimer < 60 ? "text-red-500" : "text-foreground")}>{fmtTime(expireTimer)}</span></>
                  : <span className="text-red-500">{t("auth.verify_expired")}</span>
                }
              </p>

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={loading || digits.some(d => !d)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all mb-4",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "shadow-sm hover:shadow-md hover:-translate-y-0.5"
                )}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" />{t("auth.verify_verifying")}</>
                  : <><ShieldCheck size={16} />{t("auth.verify_btn")}</>
                }
              </button>

              {/* Resend */}
              <div className="text-center">
                <button
                  onClick={handleResend}
                  disabled={resendTimer > 0 || resending}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
                  {resendTimer > 0
                    ? t("auth.verify_resend_in").replace("{s}", resendTimer)
                    : t("auth.verify_resend")
                  }
                </button>
              </div>
            </>
          )}

          {/* Success state */}
          {success && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground text-center">{t("auth.verify_redirecting")}</p>
              <Loader2 size={18} className="animate-spin text-brand-600" />
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">{t("auth.salesbot_tagline")}</p>
      </div>
    </div>
  )
}
