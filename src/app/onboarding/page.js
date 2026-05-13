"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import fetchAPI, { agentAPI, productsAPI } from "@/lib/api"
import {
  Loader2, Store, MessageCircle, Package, CheckCircle2,
  ArrowRight, ArrowLeft, Phone, Key, Copy, Check, Sparkles,
  ShoppingBag, PartyPopper,
} from "lucide-react"

/* ─── Step Header ─── */
function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-11 h-11 rounded-xl bg-brand-600/10 flex items-center justify-center shrink-0">
        <Icon size={22} className="text-brand-600" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

/* ─── Progress Bar ─── */
function ProgressBar({ current, total, labels }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {labels.map((label, i) => {
          const step = i + 1
          const done = step < current
          const active = step === current
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                done ? "bg-brand-600 text-white" :
                active ? "bg-brand-600 text-white ring-4 ring-brand-600/20 scale-110" :
                "bg-secondary text-muted-foreground"
              )}>
                {done ? <Check size={16} /> : step}
              </div>
              <span className={cn(
                "text-[10px] font-semibold text-center leading-tight",
                active || done ? "text-foreground" : "text-muted-foreground/60"
              )}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
      <div className="h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 transition-all duration-500"
          style={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}

/* ─── Input Field ─── */
const inputCls = "w-full px-4 py-3 bg-secondary/50 border border-border/60 rounded-xl text-sm outline-none focus:border-brand-600/50 focus:bg-secondary focus:ring-4 focus:ring-brand-600/5 transition-all"

/* ═══════════════════════════════════════════════
   Main Onboarding Page
═══════════════════════════════════════════════ */
export default function OnboardingPage() {
  const router = useRouter()
  const { t, language, setLanguage, isRTL } = useLanguage()

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  // Step 1 — Store Info
  const [storeInfo, setStoreInfo] = useState({
    storeName: "",
    agentName: "",
    domain: "تجارة عامة",
    language: "auto",
    style: "friendly",
  })

  // Step 2 — WhatsApp
  const [whatsapp, setWhatsapp] = useState({
    whatsappPhoneId: "",
    whatsappToken: "",
    verifyToken: "",
  })

  // Step 3 — First Product
  const [product, setProduct] = useState({
    name: "",
    price: "",
    description: "",
    stock: 10,
  })

  // App URL for webhook
  const [appUrl, setAppUrl] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin)
    }
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetchAPI("/api/onboarding/status")
      const data = res?.data || {}

      // Pre-fill form with existing data
      if (data.user) {
        setStoreInfo(s => ({ ...s, storeName: data.user.storeName || s.storeName }))
      }
      if (data.agent) {
        setStoreInfo(s => ({
          ...s,
          agentName: data.agent.name || s.agentName,
          domain: data.agent.domain || s.domain,
          language: data.agent.language || s.language,
          style: data.agent.style || s.style,
        }))
        setWhatsapp(w => ({
          ...w,
          whatsappPhoneId: data.agent.whatsappPhoneId || "",
          whatsappToken: data.agent.whatsappToken || "",
        }))
        // Fetch verify token
        try {
          const agentFull = await agentAPI.get()
          if (agentFull?.data?.verifyToken) {
            setWhatsapp(w => ({ ...w, verifyToken: agentFull.data.verifyToken }))
          }
        } catch {}
      }

      // Resume from appropriate step
      if (data.completed) {
        router.push("/dashboard")
        return
      }
      if (data.steps) {
        if (!data.steps.storeInfo) setCurrentStep(1)
        else if (!data.steps.whatsapp) setCurrentStep(2)
        else if (!data.steps.product) setCurrentStep(3)
        else setCurrentStep(4)
      }
    } catch (err) {
      console.error("Fetch status error:", err)
    } finally {
      setLoading(false)
    }
  }

  async function saveStep1() {
    if (!storeInfo.storeName?.trim() || !storeInfo.agentName?.trim()) {
      setError(t('onboarding.step1_required') || "اسم المتجر واسم Agent مطلوبان")
      return false
    }
    try {
      setSaving(true)
      setError(null)
      // Update user storeName
      try {
        await fetchAPI("/api/auth/update-profile", {
          method: "PATCH",
          body: JSON.stringify({ storeName: storeInfo.storeName.trim() }),
        })
      } catch {
        // non-blocking: storeName might already be set
      }
      // Update agent
      await agentAPI.update({
        name: storeInfo.agentName.trim(),
        domain: storeInfo.domain,
        language: storeInfo.language,
        style: storeInfo.style,
      })
      return true
    } catch (err) {
      setError(t('onboarding.save_error'))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveStep2() {
    if (!whatsapp.whatsappPhoneId?.trim() || !whatsapp.whatsappToken?.trim()) {
      setError(t('onboarding.step2_required') || "Phone ID و Token مطلوبان")
      return false
    }
    try {
      setSaving(true)
      setError(null)
      await agentAPI.update({
        whatsappPhoneId: whatsapp.whatsappPhoneId.trim(),
        whatsappToken: whatsapp.whatsappToken.trim(),
      })
      return true
    } catch (err) {
      setError(t('onboarding.save_error'))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveStep3() {
    if (!product.name?.trim() || !product.price) {
      setError(t('onboarding.step3_required') || "اسم المنتج والسعر مطلوبان")
      return false
    }
    const priceNum = parseFloat(product.price)
    if (isNaN(priceNum) || priceNum <= 0) {
      setError(t('onboarding.step3_invalid_price') || "السعر غير صالح")
      return false
    }
    try {
      setSaving(true)
      setError(null)
      await productsAPI.create({
        name: product.name.trim(),
        price: priceNum,
        description: product.description?.trim() || null,
        stock: parseInt(product.stock) || 0,
        isActive: true,
      })
      return true
    } catch (err) {
      setError(t('onboarding.add_product_error'))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleNext() {
    let success = true
    if (currentStep === 1) success = await saveStep1()
    else if (currentStep === 2) success = await saveStep2()
    else if (currentStep === 3) success = await saveStep3()

    if (success && currentStep < 4) {
      setCurrentStep(s => s + 1)
    }
  }

  function handleBack() {
    setError(null)
    if (currentStep > 1) setCurrentStep(s => s - 1)
  }

  function handleFinish() {
    router.push("/dashboard")
  }

  function copyWebhookUrl() {
    const webhookUrl = `${appUrl}/api/webhook/whatsapp`
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stepLabels = [
    t('onboarding.step_store') || "المتجر",
    t('onboarding.step_whatsapp') || "واتساب",
    t('onboarding.step_product') || "منتج",
    t('onboarding.step_ready') || "جاهز",
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative py-8 px-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">
                {t('onboarding.title') || "إعداد حسابك"}
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {t('onboarding.subtitle') || "4 خطوات بسيطة لتبدأ البيع"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border/60 overflow-hidden text-[11px] font-bold">
              <button
                onClick={() => setLanguage('fr')}
                className={cn("px-2.5 py-1 transition-colors", language === 'fr' ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-secondary")}
              >FR</button>
              <button
                onClick={() => setLanguage('ar')}
                className={cn("px-2.5 py-1 transition-colors", language === 'ar' ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-secondary")}
              >AR</button>
            </div>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("onboardingSkipped", "1")
                }
                router.push("/dashboard")
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              {t('onboarding.skip') || "تخطي"}
            </button>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar current={currentStep} total={4} labels={stepLabels} />

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-5 text-sm">
              {error}
            </div>
          )}

          {/* ═══ Step 1: Store Info ═══ */}
          {currentStep === 1 && (
            <div>
              <StepHeader
                icon={Store}
                title={t('onboarding.step1_title') || "معلومات المتجر"}
                subtitle={t('onboarding.step1_subtitle') || "عرّفنا بمتجرك وAgent الذي يمثّله"}
              />

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    {t('onboarding.store_name') || "اسم المتجر"} *
                  </label>
                  <input
                    type="text"
                    value={storeInfo.storeName}
                    onChange={(e) => setStoreInfo({ ...storeInfo, storeName: e.target.value })}
                    placeholder={t('onboarding.store_name_placeholder') || "بوتيك الأناقة"}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    {t('onboarding.agent_name') || "اسم Agent"} *
                  </label>
                  <input
                    type="text"
                    value={storeInfo.agentName}
                    onChange={(e) => setStoreInfo({ ...storeInfo, agentName: e.target.value })}
                    placeholder={t('onboarding.agent_name_placeholder') || "ليلى"}
                    className={inputCls}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {t('onboarding.agent_name_hint') || "هذا هو الاسم الذي سيستخدمه AI عند التحدث مع الزبائن"}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      {t('onboarding.language') || "اللغة"}
                    </label>
                    <select
                      value={storeInfo.language}
                      onChange={(e) => setStoreInfo({ ...storeInfo, language: e.target.value })}
                      className={inputCls}
                    >
                      <option value="auto">{t('settings.lang_auto') || "تلقائي"}</option>
                      <option value="darija">{t('settings.lang_darija') || "دارجة"}</option>
                      <option value="arabic">{t('settings.lang_arabic') || "عربية"}</option>
                      <option value="french">{t('settings.lang_french') || "فرنسية"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      {t('onboarding.style') || "الأسلوب"}
                    </label>
                    <select
                      value={storeInfo.style}
                      onChange={(e) => setStoreInfo({ ...storeInfo, style: e.target.value })}
                      className={inputCls}
                    >
                      <option value="friendly">{t('settings.friendly_short') || "ودود"}</option>
                      <option value="formal">{t('settings.formal_short') || "رسمي"}</option>
                      <option value="persuasive">{t('settings.persuasive_short') || "مقنع"}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 2: WhatsApp ═══ */}
          {currentStep === 2 && (
            <div>
              <StepHeader
                icon={MessageCircle}
                title={t('onboarding.step2_title') || "ربط WhatsApp"}
                subtitle={t('onboarding.step2_subtitle') || "أدخل بيانات WhatsApp Cloud API"}
              />

              <div className="bg-brand-600/5 border border-brand-600/15 rounded-xl p-4 mb-5">
                <p className="text-xs font-semibold text-foreground mb-2">
                  💡 {t('onboarding.wa_help') || "تحتاج إعداد WhatsApp Business API أولاً من Meta"}
                </p>
                <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>{t('onboarding.wa_step1') || "أنشئ App في"} <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Meta Developers</a></li>
                  <li>{t('onboarding.wa_step2') || "فعّل WhatsApp Business API"}</li>
                  <li>{t('onboarding.wa_step3') || "انسخ Phone ID و Access Token"}</li>
                  <li>{t('onboarding.wa_step4') || "ألصقهم هنا ↓"}</li>
                </ol>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    <Phone size={12} className="inline me-1" />
                    {t('onboarding.phone_id') || "WhatsApp Phone ID"} *
                  </label>
                  <input
                    type="text"
                    value={whatsapp.whatsappPhoneId}
                    onChange={(e) => setWhatsapp({ ...whatsapp, whatsappPhoneId: e.target.value })}
                    placeholder="123456789012345"
                    dir="ltr"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    <Key size={12} className="inline me-1" />
                    {t('onboarding.access_token') || "Access Token"} *
                  </label>
                  <input
                    type="password"
                    value={whatsapp.whatsappToken}
                    onChange={(e) => setWhatsapp({ ...whatsapp, whatsappToken: e.target.value })}
                    placeholder="EAAxxxxxxxxxxxxxxxxxxx"
                    dir="ltr"
                    className={inputCls}
                  />
                </div>

                {appUrl && (
                  <div className="p-3 bg-secondary/40 border border-border rounded-xl">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      📌 {t('onboarding.webhook_url') || "رابط الـ Webhook (ستحتاجه في Meta):"}
                    </p>
                    <div className="flex items-center gap-2">
                      <code dir="ltr" className="flex-1 text-[11px] bg-background border border-border rounded-lg px-2.5 py-1.5 break-all">
                        {appUrl}/api/webhook/whatsapp
                      </code>
                      <button
                        onClick={copyWebhookUrl}
                        className="p-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors shrink-0"
                        title="Copy"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    {whatsapp.verifyToken && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          🔑 Verify Token:
                        </p>
                        <code dir="ltr" className="block text-[11px] bg-background border border-border rounded-lg px-2.5 py-1.5 break-all">
                          {whatsapp.verifyToken}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ Step 3: First Product ═══ */}
          {currentStep === 3 && (
            <div>
              <StepHeader
                icon={Package}
                title={t('onboarding.step3_title') || "أضف أول منتج"}
                subtitle={t('onboarding.step3_subtitle') || "يمكنك إضافة المزيد لاحقاً من الـ dashboard"}
              />

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    {t('onboarding.product_name') || "اسم المنتج"} *
                  </label>
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) => setProduct({ ...product, name: e.target.value })}
                    placeholder={t('onboarding.product_name_placeholder') || "جلباب مغربي"}
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      {t('onboarding.product_price') || "السعر (درهم)"} *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.price}
                      onChange={(e) => setProduct({ ...product, price: e.target.value })}
                      placeholder="350"
                      className={inputCls}
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      {t('onboarding.product_stock') || "المخزون"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={product.stock}
                      onChange={(e) => setProduct({ ...product, stock: e.target.value })}
                      placeholder="10"
                      className={inputCls}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    {t('onboarding.product_desc') || "وصف قصير"}
                  </label>
                  <textarea
                    rows={3}
                    value={product.description}
                    onChange={(e) => setProduct({ ...product, description: e.target.value })}
                    placeholder={t('onboarding.product_desc_placeholder') || "قماش أصلي، مقاسات متعددة، ألوان متنوعة"}
                    className={cn(inputCls, "resize-none")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 4: Ready ═══ */}
          {currentStep === 4 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-brand-600/10 flex items-center justify-center mx-auto mb-5">
                <PartyPopper size={36} className="text-brand-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t('onboarding.ready_title') || "مبروك! 🎉"}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-md mx-auto">
                {t('onboarding.ready_subtitle') || "متجرك جاهز. AI agent دابا قادر يستقبل رسائل واتساب ويبيع منتجاتك تلقائياً."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-lg mx-auto">
                {[
                  { icon: CheckCircle2, label: t('onboarding.ready_step1') || "المتجر مُعد" },
                  { icon: CheckCircle2, label: t('onboarding.ready_step2') || "واتساب مربوط" },
                  { icon: CheckCircle2, label: t('onboarding.ready_step3') || "منتج مضاف" },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="bg-brand-600/5 border border-brand-600/15 rounded-xl p-3 flex items-center gap-2">
                      <Icon size={16} className="text-brand-600 shrink-0" />
                      <span className="text-xs font-semibold text-foreground">{item.label}</span>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={handleFinish}
                className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all shadow-md hover:shadow-lg"
              >
                <ShoppingBag size={16} />
                {t('onboarding.go_dashboard') || "الذهاب للـ Dashboard"}
              </button>
            </div>
          )}

          {/* Actions */}
          {currentStep < 4 && (
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
              <button
                onClick={handleBack}
                disabled={currentStep === 1 || saving}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors",
                  "disabled:opacity-30 disabled:cursor-not-allowed hover:text-foreground"
                )}
              >
                <ArrowRight size={15} className={cn(isRTL ? "" : "rotate-180")} />
                {t('onboarding.back') || "رجوع"}
              </button>

              <button
                onClick={handleNext}
                disabled={saving}
                className={cn(
                  "flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  "hover:bg-brand-700 hover:shadow-md",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {currentStep === 3
                  ? (t('onboarding.finish') || "إنهاء")
                  : (t('onboarding.next') || "التالي")}
                {!saving && <ArrowLeft size={15} className={cn(isRTL ? "" : "rotate-180")} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
