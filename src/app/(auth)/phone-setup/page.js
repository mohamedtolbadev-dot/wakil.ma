"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppTheme } from "@/hooks/useAppTheme"
import { Loader2, Phone, ChevronDown, ShieldCheck, CheckCircle2, MessageCircle, RefreshCw } from "lucide-react"

function parseBiErr(msg, lang) {
  if (!msg || !msg.includes("fr:")) return msg
  const fr = msg.split("||ar:")[0]?.replace(/^fr:/, "")
  const ar = msg.split("||ar:")[1]
  return lang === "ar" ? (ar || msg) : (fr || msg)
}

const COUNTRIES = [
  { code: "MA", flag: "🇲🇦", fr: "Maroc",            ar: "المغرب",      dial: "+212", ph: "06 XX XX XX XX" },
  { code: "SA", flag: "🇸🇦", fr: "Arabie saoudite",   ar: "السعودية",    dial: "+966", ph: "05X XXX XXXX"  },
  { code: "AE", flag: "🇦🇪", fr: "Émirats arabes",    ar: "الإمارات",    dial: "+971", ph: "05X XXX XXXX"  },
  { code: "QA", flag: "🇶🇦", fr: "Qatar",             ar: "قطر",         dial: "+974", ph: "3X XX XXXX"    },
  { code: "KW", flag: "🇰🇼", fr: "Koweït",            ar: "الكويت",      dial: "+965", ph: "5X XX XXXX"    },
  { code: "BH", flag: "🇧🇭", fr: "Bahreïn",           ar: "البحرين",     dial: "+973", ph: "3X XX XXXX"    },
  { code: "OM", flag: "🇴🇲", fr: "Oman",              ar: "عُمان",       dial: "+968", ph: "9X XX XXXX"    },
  { code: "FR", flag: "🇫🇷", fr: "France",            ar: "فرنسا",       dial: "+33",  ph: "06 XX XX XX XX" },
  { code: "DE", flag: "🇩🇪", fr: "Allemagne",         ar: "ألمانيا",     dial: "+49",  ph: "015X XXXXXXX"  },
  { code: "GB", flag: "🇬🇧", fr: "Royaume-Uni",       ar: "بريطانيا",    dial: "+44",  ph: "07XXX XXXXXX"  },
  { code: "ES", flag: "🇪🇸", fr: "Espagne",           ar: "إسبانيا",     dial: "+34",  ph: "6XX XXX XXX"   },
  { code: "IT", flag: "🇮🇹", fr: "Italie",            ar: "إيطاليا",     dial: "+39",  ph: "3XX XXX XXXX"  },
  { code: "US", flag: "🇺🇸", fr: "États-Unis",        ar: "أمريكا",      dial: "+1",   ph: "(555) XXX-XXXX" },
  { code: "CA", flag: "🇨🇦", fr: "Canada",            ar: "كندا",        dial: "+1",   ph: "(555) XXX-XXXX" },
]

const OTP_LENGTH = 6
const STEP_PHONE = "phone"
const STEP_OTP   = "otp"

export default function PhoneSetupPage() {
  const router = useRouter()
  const { t, language, setLanguage, isRTL } = useLanguage()
  const { isDark } = useAppTheme()

  const [step, setStep]                     = useState(STEP_PHONE)
  const [localPhone, setLocalPhone]         = useState("")
  const [fullPhone, setFullPhone]           = useState("")
  const [masked, setMasked]                 = useState("")
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [showDrop, setShowDrop]             = useState(false)
  const [digits, setDigits]                 = useState(Array(OTP_LENGTH).fill(""))
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState(null)
  const [success, setSuccess]               = useState(false)
  const [resendTimer, setResendTimer]       = useState(0)
  const [expireTimer, setExpireTimer]       = useState(15 * 60)
  const dropRef    = useRef(null)
  const inputRefs  = useRef([])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/register"); return }
  }, [router])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setTimeout(() => setResendTimer(v => v - 1), 1000)
    return () => clearTimeout(id)
  }, [resendTimer])

  useEffect(() => {
    if (step !== STEP_OTP || expireTimer <= 0) return
    const id = setTimeout(() => setExpireTimer(v => v - 1), 1000)
    return () => clearTimeout(id)
  }, [step, expireTimer])

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0")
    const s = (secs % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  async function handleSendOtp(e) {
    e?.preventDefault()
    if (!localPhone.trim()) { setError(t("auth.phone_required")); return }
    const phone = selectedCountry.dial + localPhone.trim().replace(/^0+/, "")
    try {
      setLoading(true)
      setError(null)
      const res = await authAPI.phoneSetupSend(phone)
      setFullPhone(phone)
      setMasked(res.data?.masked || phone)
      if (res.data?.devCode) setDigits(res.data.devCode.split(""))
      setStep(STEP_OTP)
      setResendTimer(60)
      setExpireTimer(15 * 60)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(parseBiErr(err.message, language) || t("auth.register_error"))
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = useCallback(async () => {
    const code = digits.join("")
    if (code.length < OTP_LENGTH) { setError(t("auth.verify_incomplete")); return }
    try {
      setLoading(true)
      setError(null)
      const res = await authAPI.phoneSetupVerify(fullPhone, code)
      const verifiedPhone = res.data?.phone || fullPhone
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}")
        localStorage.setItem("user", JSON.stringify({ ...storedUser, phone: verifiedPhone }))
      } catch {}
      setSuccess(true)
      setTimeout(() => router.push("/dashboard"), 1200)
    } catch (err) {
      setError(parseBiErr(err.message, language) || t("auth.verify_error"))
      setDigits(Array(OTP_LENGTH).fill(""))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }, [digits, fullPhone, router, t, language])

  useEffect(() => {
    if (step === STEP_OTP && digits.every(d => d !== "") && !loading) handleVerify()
  }, [digits, step, handleVerify, loading])

  function handleDigitChange(index, value) {
    const digit = value.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError(null)
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus()
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

  async function handleResend() {
    if (resendTimer > 0) return
    try {
      setLoading(true)
      setError(null)
      const res = await authAPI.phoneSetupSend(fullPhone)
      if (res.data?.devCode) setDigits(res.data.devCode.split(""))
      else setDigits(Array(OTP_LENGTH).fill(""))
      setResendTimer(60)
      setExpireTimer(15 * 60)
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(parseBiErr(err.message, language) || t("auth.verify_resend_error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4" dir={isRTL ? "rtl" : "ltr"}>

      <div className="fixed inset-0 -z-20 transition-all duration-700" style={{
        backgroundImage: isDark ? "url('/img_hero_bg/img_home_page_darck_bg.jpg')" : "url('/img_hero_bg/img_hero_bg.jpg')",
        backgroundSize: "cover", backgroundPosition: "center center", backgroundRepeat: "no-repeat",
      }} />
      <div className={`fixed inset-0 -z-10 transition-all duration-700 ${isDark ? "bg-black/50" : "bg-white/45"}`} />

      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-6 flex items-center justify-end">
          <div className="flex items-center rounded-lg border border-border/60 overflow-hidden text-[11px] font-bold bg-background/60 backdrop-blur-sm">
            <button onClick={() => setLanguage("fr")} className={cn("px-2.5 py-1 transition-colors", language === "fr" ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-secondary")}>FR</button>
            <button onClick={() => setLanguage("ar")} className={cn("px-2.5 py-1 transition-colors", language === "ar" ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-secondary")}>AR</button>
          </div>
        </div>

        {/* Card */}
        <div className={`w-full backdrop-blur-md rounded-2xl p-4 sm:p-6 md:p-8 border transition-all duration-300
          ${isDark ? "bg-black/40 border-white/20" : "bg-white/70 border-brand-200/50"}`}>

          {/* Card header */}
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", success ? "bg-green-500/20" : "bg-brand-600/10")}>
              {success ? <CheckCircle2 size={20} className="text-green-500" /> : <Phone size={20} className="text-brand-600" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {success ? t("auth.verify_success_title") : step === STEP_PHONE ? t("auth.phone_setup_title") : t("auth.verify_title")}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {success
                  ? t("auth.verify_success_sub")
                  : step === STEP_PHONE
                    ? t("auth.phone_setup_subtitle")
                    : <>{t("auth.verify_subtitle")} <span className="font-semibold text-foreground" dir="ltr">{masked}</span></>
                }
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-5 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          {/* ── STEP 1: Phone Input ── */}
          {step === STEP_PHONE && !success && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("auth.phone")} <span className="text-red-500 ms-0.5">*</span>
                </label>
                <div className="flex items-stretch" dir="ltr" ref={dropRef}>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDrop(v => !v)}
                      className="flex items-center gap-1.5 h-full px-3 py-2.5 bg-background border border-border rounded-s-lg text-sm font-medium hover:bg-secondary transition-colors border-e-0 min-w-[90px]"
                    >
                      <span className="text-base">{selectedCountry.flag}</span>
                      <span className="text-muted-foreground text-xs">{selectedCountry.dial}</span>
                      <ChevronDown size={12} className={`text-muted-foreground transition-transform ${showDrop ? "rotate-180" : ""}`} />
                    </button>
                    {showDrop && (
                      <div className="absolute top-full left-0 mt-1 z-50 w-44 sm:w-52 max-h-56 overflow-y-auto bg-card border border-border rounded-xl shadow-xl py-1">
                        {COUNTRIES.map(c => (
                          <button key={c.code} type="button"
                            onClick={() => { setSelectedCountry(c); setShowDrop(false) }}
                            className={cn("w-full flex items-center gap-2 px-2 sm:gap-2.5 sm:px-3 py-2 text-xs sm:text-sm hover:bg-secondary transition-colors text-left", selectedCountry.code === c.code && "bg-brand-600/10 text-brand-700 font-medium")}
                          >
                            <span className="text-base">{c.flag}</span>
                            <span className="flex-1 truncate">{language === "ar" ? c.ar : c.fr}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{c.dial}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={localPhone}
                    onChange={e => { setLocalPhone(e.target.value); setError(null) }}
                    placeholder={selectedCountry.ph}
                    className="flex-1 px-3 py-2.5 bg-background border border-border rounded-e-lg text-sm outline-none focus:border-brand-400 transition-all"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <MessageCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-green-700 dark:text-green-400">{t("auth.phone_setup_hint")}</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "flex items-center justify-center gap-2 bg-brand-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:-translate-y-0.5"
                )}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" />{t("auth.phone_setup_sending")}</>
                  : <><Phone size={16} />{t("auth.phone_setup_btn")}</>
                }
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP Input ── */}
          {step === STEP_OTP && !success && (
            <>
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-6">
                <MessageCircle size={16} className="text-green-600 shrink-0" />
                <p className="text-xs text-green-700 dark:text-green-400">{t("auth.verify_whatsapp_hint")}</p>
              </div>

              <div className="flex gap-1.5 sm:gap-2 justify-center mb-6" dir="ltr">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className={cn(
                      "w-9 h-12 sm:w-11 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl border-2 outline-none transition-all bg-background",
                      d ? "border-brand-600 text-brand-600 bg-brand-600/5" : "border-border text-foreground focus:border-brand-400"
                    )}
                  />
                ))}
              </div>

              <p className="text-center text-xs text-muted-foreground mb-5">
                {expireTimer > 0
                  ? <>{t("auth.verify_expires")} <span className={cn("font-mono font-semibold", expireTimer < 60 ? "text-red-500" : "text-foreground")}>{fmtTime(expireTimer)}</span></>
                  : <span className="text-red-500">{t("auth.verify_expired")}</span>
                }
              </p>

              <button
                onClick={handleVerify}
                disabled={loading || digits.some(d => !d)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all mb-4",
                  "disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:-translate-y-0.5"
                )}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" />{t("auth.verify_verifying")}</>
                  : <><ShieldCheck size={16} />{t("auth.verify_btn")}</>
                }
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <button
                  onClick={() => { setStep(STEP_PHONE); setDigits(Array(OTP_LENGTH).fill("")); setError(null) }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >← {t("auth.phone_setup_change")}</button>
                <button
                  onClick={handleResend}
                  disabled={resendTimer > 0 || loading}
                  className="inline-flex items-center justify-center gap-1.5 text-muted-foreground hover:text-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={13} />
                  {resendTimer > 0 ? t("auth.verify_resend_in").replace("{s}", resendTimer) : t("auth.verify_resend")}
                </button>
              </div>
            </>
          )}

          {/* ── Success ── */}
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
