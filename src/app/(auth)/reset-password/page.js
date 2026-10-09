"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { authAPI } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppTheme } from "@/hooks/useAppTheme"
import { Loader2, Lock, ArrowLeft, CheckCircle, Eye, EyeOff, AlertCircle } from "lucide-react"

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") || ""
  const { t, language, setLanguage, isRTL } = useLanguage()
  const { isDark } = useAppTheme()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError(t('auth.reset_no_token') || "رمز الإعادة مفقود في الرابط")
      return
    }
    if (password.length < 8) {
      setError(t('auth.password_min') || "كلمة السر يجب أن تكون 8 أحرف على الأقل")
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.password_mismatch') || "كلمتا السر غير متطابقتين")
      return
    }

    try {
      setLoading(true)
      await authAPI.resetPassword(token, password)
      setSuccess(true)
      // تلقائياً رجوع لصفحة الدخول بعد 3 ثواني
      setTimeout(() => router.push("/login"), 3000)
    } catch (err) {
      setError(t('auth.reset_error'))
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
              <Lock size={20} className="text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {t('auth.reset_title') || "إعادة تعيين كلمة السر"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('auth.reset_subtitle') || "أدخل كلمة السر الجديدة"}
              </p>
            </div>
          </div>

          {!token ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle size={28} className="text-red-500" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-foreground mb-1">
                  {t('auth.reset_invalid_title') || "رابط غير صالح"}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('auth.reset_invalid_desc') || "الرابط الذي استخدمته مفقود أو غير صحيح. اطلب رابطاً جديداً."}
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="mt-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-all shadow-sm"
              >
                {t('auth.request_new_link') || "طلب رابط جديد"}
              </Link>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-14 h-14 rounded-full bg-brand-600/10 flex items-center justify-center">
                <CheckCircle size={28} className="text-brand-600" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-foreground mb-1">
                  {t('auth.reset_success_title') || "تم تحديث كلمة السر ✅"}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('auth.reset_success_desc') || "سيتم توجيهك لصفحة تسجيل الدخول تلقائياً..."}
                </p>
              </div>
              <Link
                href="/login"
                className="mt-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-all shadow-sm"
              >
                {t('auth.login') || "تسجيل الدخول الآن"}
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
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t('auth.new_password') || "كلمة السر الجديدة"}
                  </label>
                  <div className="relative group">
                    <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-10 pl-10 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-brand-400 transition-all"
                      dir="ltr"
                      autoFocus
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

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t('auth.confirm_password') || "تأكيد كلمة السر"}
                  </label>
                  <div className="relative group">
                    <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-10 pl-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-brand-400 transition-all"
                      dir="ltr"
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
                      {t('common.loading') || "جاري التحديث..."}
                    </>
                  ) : (
                    t('auth.reset_button') || "تحديث كلمة السر"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-600" />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  )
}
