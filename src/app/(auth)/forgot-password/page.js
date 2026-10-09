"use client"

import { useState } from "react"
import Link from "next/link"
import { authAPI } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppTheme } from "@/hooks/useAppTheme"
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const { t, language, setLanguage, isRTL } = useLanguage()
  const { isDark } = useAppTheme()

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) {
      setError(t('auth.email_required') || "البريد الإلكتروني مطلوب")
      return
    }

    try {
      setLoading(true)
      setError(null)
      await authAPI.forgotPassword(email.trim())
      setSuccess(true)
    } catch (err) {
      setError(t('auth.forgot_send_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4" dir={isRTL ? "rtl" : "ltr"}>
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
      <div className={`fixed inset-0 -z-10 transition-all duration-700
        ${isDark ? 'bg-black/50' : 'bg-white'}`}
      />

      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={16} />
            {t('auth.back_login') || "رجوع لتسجيل الدخول"}
          </Link>
          <div className="flex items-center rounded-lg border border-border/60 overflow-hidden text-[11px] font-bold bg-background/60 backdrop-blur-sm">
            <button
              onClick={() => setLanguage('fr')}
              className={cn("px-2.5 py-1 transition-colors", language === 'fr' ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-secondary")}
            >FR</button>
            <button
              onClick={() => setLanguage('ar')}
              className={cn("px-2.5 py-1 transition-colors", language === 'ar' ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-secondary")}
            >AR</button>
          </div>
        </div>

        <div className={`w-full max-w-md backdrop-blur-md rounded-2xl p-8 border transition-all duration-300 hover:shadow-xl
          ${isDark
            ? 'bg-black/40 border-white/20 hover:bg-black/50'
            : 'bg-white/70 border-brand-200/50 hover:bg-white/80'}`}>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Mail size={20} className="text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {t('auth.forgot_title') || "نسيت كلمة السر؟"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('auth.forgot_subtitle') || "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين"}
              </p>
            </div>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-14 h-14 rounded-full bg-brand-600/10 flex items-center justify-center">
                <CheckCircle size={28} className="text-brand-600" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-foreground mb-1">
                  {t('auth.forgot_sent_title') || "تم الإرسال ✉️"}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('auth.forgot_sent_desc') || "إذا كان البريد مسجّلاً في النظام، ستصلك رسالة فيها رابط لإعادة تعيين كلمة السر خلال بضع دقائق."}
                </p>
              </div>
              <Link
                href="/login"
                className="mt-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-all shadow-sm"
              >
                {t('auth.back_login') || "رجوع لتسجيل الدخول"}
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-5 text-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                      autoFocus
                    />
                  </div>
                </div>

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
                      {t('common.loading') || "جاري الإرسال..."}
                    </>
                  ) : (
                    t('auth.send_reset_link') || "إرسال رابط الإعادة"
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  {t('auth.remember_password') || "تذكرت كلمة السر؟"}{" "}
                  <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-800 transition-colors">
                    {t('auth.login') || "تسجيل الدخول"}
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
