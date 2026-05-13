"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Check, Infinity, MessageSquare, Menu, Moon, Sun, X, Zap,
} from "lucide-react"
import { Logo } from "@/components/shared/Logo"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppTheme } from "@/hooks/useAppTheme"

const copy = {
  fr: {
    nav: [
      { label: "Accueil", href: "/" },
      { label: "Fonctionnalites", href: "/features" },
      { label: "Tarifs", href: "/pricing", active: true },
      { label: "Blog", href: "/blogs" },
      { label: "FAQ", href: "/#faq" },
    ],
    login: "Connexion",
    start: "Commencer",
    eyebrow: "Tarifs transparents",
    title: "Choisissez le forfait qui vous convient",
    subtitle:
      "Commencez gratuitement et faites evoluer votre boutique selon vos besoins. Aucune carte bancaire requise pour demarrer.",
    footerText: "Agent de vente AI sur WhatsApp, concu pour les boutiques marocaines.",
    note: "Paiement manuel par virement bancaire ou WhatsApp. Pas d'abonnement automatique.",
    plans: [
      {
        key: "FREE",
        name: "Gratuit",
        price: "0",
        period: "Pour toujours",
        replies: "100",
        dailyCap: "50",
        popular: false,
        cta: "Commencer gratuitement",
        ctaHref: "/register",
        features: [
          { text: "Reponses IA WhatsApp", included: true },
          { text: "Gestion produits (jusqu'a 20)", included: true },
          { text: "Commandes manuelles", included: true },
          { text: "Suivi commandes simple", included: true },
          { text: "Campagnes WhatsApp", included: false },
          { text: "Statistiques avancees", included: false },
          { text: "Support prioritaire", included: false },
        ],
      },
      {
        key: "PRO",
        name: "Pro",
        price: "199",
        period: "DH / mois",
        replies: "5,000",
        dailyCap: "500",
        popular: true,
        cta: "S'abonner Pro",
        ctaHref: "/register",
        features: [
          { text: "Tout ce qui est gratuit", included: true },
          { text: "Campagnes WhatsApp (500/jour)", included: true },
          { text: "Statistiques avancees", included: true },
          { text: "Produits illimites", included: true },
          { text: "Messages vocaux + images", included: true },
          { text: "Support via WhatsApp", included: true },
          { text: "Personnalisation IA avancee", included: false },
        ],
      },
      {
        key: "BUSINESS",
        name: "Business",
        price: "399",
        period: "DH / mois",
        replies: "12,000",
        dailyCap: "1,200",
        popular: false,
        cta: "S'abonner Business",
        ctaHref: "/register",
        features: [
          { text: "Tout ce qui est en Pro", included: true },
          { text: "12 000 reponses IA / mois", included: true },
          { text: "Campagnes WhatsApp (1200/jour)", included: true },
          { text: "API Webhook personnalise", included: true },
          { text: "Rapports mensuels", included: true },
          { text: "Support prioritaire", included: true },
          { text: "Hebergement dedie", included: false },
        ],
      },
      {
        key: "ENTERPRISE",
        name: "Enterprise",
        price: null,
        period: "Contactez-nous",
        replies: "50,000",
        dailyCap: "5,000",
        popular: false,
        cta: "Nous contacter",
        ctaHref: "https://wa.me/212612455372",
        features: [
          { text: "Tout ce qui est en Business", included: true },
          { text: "50 000 reponses IA / mois", included: true },
          { text: "Campagnes illimitees", included: true },
          { text: "API complete personnalisee", included: true },
          { text: "Hebergement dedie", included: true },
          { text: "Support 24/7 par telephone", included: true },
          { text: "Formation de votre equipe", included: true },
        ],
      },
    ],
    badgePopular: "Le plus demande",
    repliesLabel: "reponses IA / mois",
    dailyLabel: "reponses / jour",
  },
  ar: {
    nav: [
      { label: "الرئيسية", href: "/" },
      { label: "المميزات", href: "/features" },
      { label: "الأسعار", href: "/pricing", active: true },
      { label: "المدونة", href: "/blogs" },
      { label: "الأسئلة", href: "/#faq" },
    ],
    login: "دخول",
    start: "ابدأ الآن",
    eyebrow: "أسعار شفافة",
    title: "اختر الباقة اللي تناسبك",
    subtitle:
      "ابدأ مجاناً وطور متجرك حسب احتياجاتك. لا بطاقة بنكية مطلوبة للبدء.",
    footerText: "وكيل مبيعات AI على واتساب، معمول للمتاجر المغربية.",
    note: "الدفع يدوي عبر التحويل البنكي أو واتساب. لا اشتراك تلقائي.",
    plans: [
      {
        key: "FREE",
        name: "مجاني",
        price: "0",
        period: "للأبد",
        replies: "100",
        dailyCap: "50",
        popular: false,
        cta: "ابدأ مجاناً",
        ctaHref: "/register",
        features: [
          { text: "ردود AI على واتساب", included: true },
          { text: "إدارة منتجات (حتى 20)", included: true },
          { text: "طلبيات يدوية", included: true },
          { text: "تتبع طلبيات بسيط", included: true },
          { text: "حملات واتساب", included: false },
          { text: "إحصائيات متقدمة", included: false },
          { text: "دعم أولوي", included: false },
        ],
      },
      {
        key: "PRO",
        name: "Pro",
        price: "199",
        period: "درهم / شهر",
        replies: "5,000",
        dailyCap: "500",
        popular: true,
        cta: "اشترك في Pro",
        ctaHref: "/register",
        features: [
          { text: "كل شيء في المجاني", included: true },
          { text: "حملات واتساب (500/يوم)", included: true },
          { text: "إحصائيات متقدمة", included: true },
          { text: "إدارة منتجات غير محدودة", included: true },
          { text: "رسائل صوتية + صور", included: true },
          { text: "دعم عبر واتساب", included: true },
          { text: "تخصيص AI متقدم", included: false },
        ],
      },
      {
        key: "BUSINESS",
        name: "Business",
        price: "399",
        period: "درهم / شهر",
        replies: "12,000",
        dailyCap: "1,200",
        popular: false,
        cta: "اشترك في Business",
        ctaHref: "/register",
        features: [
          { text: "كل شيء في Pro", included: true },
          { text: "12,000 رد AI / شهر", included: true },
          { text: "حملات واتساب (1,200/يوم)", included: true },
          { text: "API Webhook مخصص", included: true },
          { text: "تقارير شهرية", included: true },
          { text: "دعم أولوي", included: true },
          { text: "استضافة مخصصة", included: false },
        ],
      },
      {
        key: "ENTERPRISE",
        name: "Enterprise",
        price: null,
        period: "اتصل بنا",
        replies: "50,000",
        dailyCap: "5,000",
        popular: false,
        cta: "تواصل معنا",
        ctaHref: "https://wa.me/212612455372",
        features: [
          { text: "كل شيء في Business", included: true },
          { text: "50,000 رد AI / شهر", included: true },
          { text: "حملات غير محدودة", included: true },
          { text: "API كامل مخصص", included: true },
          { text: "استضافة مخصصة", included: true },
          { text: "دعم 24/7 هاتفي", included: true },
          { text: "تدريب فريقك", included: true },
        ],
      },
    ],
    badgePopular: "الأكثر طلباً",
    repliesLabel: "رد AI / شهر",
    dailyLabel: "رد / يوم",
  },
}

export default function PricingPage() {
  const { language, setLanguage } = useLanguage()
  const { isDark, toggleTheme } = useAppTheme()
  const isRTL = language === "ar"
  const data = isRTL ? copy.ar : copy.fr

  return (
    <div className="min-h-screen relative" dir={isRTL ? "rtl" : "ltr"}>
      {/* Background */}
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
      <div className={`fixed inset-0 -z-10 transition-all duration-700 ${isDark ? 'bg-black/50' : 'bg-white/45'}`} />

      <Header
        data={data}
        isDark={isDark}
        isRTL={isRTL}
        onToggleTheme={toggleTheme}
        onToggleLanguage={() => setLanguage(isRTL ? "fr" : "ar")}
      />

      {/* Pricing Content */}
      <main className="relative">
        {/* Hero / Intro */}
        <section className="px-4 pt-10 pb-6 sm:px-6 sm:pt-16 sm:pb-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 mb-6 shadow-sm ${isDark ? 'bg-white/10 border-white/20 text-white/90' : 'bg-white/80 border-slate-200/70 text-brand-700'}`}>
              <Zap size={13} className={isDark ? 'text-brand-300' : 'text-brand-600'} />
              <span className="text-xs sm:text-sm font-bold">{data.eyebrow}</span>
            </div>
            <h1 className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-brand-900'}`}>
              {data.title}
            </h1>
            <p className={`mt-4 text-sm sm:text-base leading-loose max-w-xl mx-auto ${isDark ? 'text-white/80' : 'text-slate-600'}`}>
              {data.subtitle}
            </p>
          </div>
        </section>

        {/* Plans Grid */}
        <section className="px-4 pb-16 sm:px-6 sm:pb-28">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {data.plans.map((plan, i) => (
                <PlanCard key={plan.key} plan={plan} index={i} isDark={isDark} isRTL={isRTL} data={data} />
              ))}
            </div>

            <p className={`text-center text-xs font-semibold mt-8 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              {data.note}
            </p>
          </div>
        </section>
      </main>

      {/* Floating WhatsApp */}
      <WhatsAppFloatButton />

      <Footer data={data} isDark={isDark} />
    </div>
  )
}

function PlanCard({ plan, index, isDark, isRTL, data }) {
  return (
    <div
      className={`relative rounded-2xl sm:rounded-3xl border backdrop-blur-md overflow-hidden flex flex-col
        ${plan.popular
          ? isDark
            ? 'bg-brand-600/15 border-brand-400/40 shadow-xl shadow-brand-900/20'
            : 'bg-brand-50/80 border-brand-300/60 shadow-xl shadow-brand-200/40'
          : isDark
            ? 'bg-white/10 border-white/20'
            : 'bg-white/80 border-slate-200/70'}`}
    >
      {plan.popular && (
        <div className={`text-center py-1.5 text-[11px] font-black uppercase tracking-wider ${isDark ? 'bg-brand-500 text-white' : 'bg-brand-600 text-white'}`}>
          {data.badgePopular}
        </div>
      )}

      <div className={`p-5 sm:p-6 flex-1 flex flex-col ${plan.popular ? 'pt-8' : ''}`}>
        <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-brand-900'}`}>{plan.name}</h3>

        <div className="mt-3 mb-4">
          {plan.price ? (
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl sm:text-4xl font-black ${isDark ? 'text-white' : 'text-brand-900'}`}>{plan.price}</span>
              <span className={`text-sm font-bold ${isDark ? 'text-white/70' : 'text-slate-500'}`}>DH</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Infinity size={28} className={isDark ? 'text-brand-300' : 'text-brand-600'} />
              <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-brand-900'}`}>{isRTL ? "مخصص" : "Sur mesure"}</span>
            </div>
          )}
          <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{plan.period}</p>
        </div>

        <div className={`rounded-xl p-3 mb-4 text-[12px] font-bold leading-5 ${isDark ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-700'}`}>
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className={isDark ? 'text-brand-300' : 'text-brand-600'} />
            <span>{plan.replies} {data.repliesLabel}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Zap size={14} className={isDark ? 'text-brand-300' : 'text-brand-600'} />
            <span>{plan.dailyCap} {data.dailyLabel}</span>
          </div>
        </div>

        <ul className="space-y-2.5 mb-6 flex-1">
          {plan.features.map((feature, fi) => (
            <li key={fi} className={`flex items-start gap-2 text-[13px] font-semibold leading-5
              ${feature.included
                ? isDark ? 'text-white/90' : 'text-slate-700'
                : isDark ? 'text-white/30' : 'text-slate-400'}`}>
              {feature.included ? (
                <Check size={15} className={`shrink-0 mt-0.5 ${isDark ? 'text-brand-300' : 'text-brand-600'}`} />
              ) : (
                <span className={`shrink-0 mt-0.5 w-[15px] h-[15px] rounded-full flex items-center justify-center text-[10px] font-bold ${isDark ? 'bg-white/10 text-white/30' : 'bg-slate-200 text-slate-400'}`}>×</span>
              )}
              <span className={feature.included ? '' : 'line-through'}>{feature.text}</span>
            </li>
          ))}
        </ul>

        {plan.key === "ENTERPRISE" ? (
          <a
            href={plan.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition-all hover:-translate-y-0.5 active:scale-95 border
              ${isDark
                ? 'border-white/25 text-white hover:bg-white/10 hover:border-white/40'
                : 'border-slate-300 text-brand-700 hover:bg-white hover:border-brand-300 bg-white/80'}`}
          >
            {plan.cta}
            <ArrowLeft size={14} className={isRTL ? 'rotate-180' : ''} />
          </a>
        ) : (
          <Link
            href={plan.ctaHref}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition-all hover:-translate-y-0.5 active:scale-95
              ${plan.popular
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700'
                : isDark
                  ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  : 'bg-slate-100 text-brand-700 border border-slate-200 hover:bg-white hover:border-slate-300'}`}
          >
            {plan.cta}
          </Link>
        )}
      </div>
    </div>
  )
}

function Header({ data, isDark, isRTL, onToggleTheme, onToggleLanguage }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${isDark ? 'border-white/10 bg-[#090817]/78' : 'border-brand-100 bg-white/78'}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-5 md:flex">
          {data.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`text-sm font-bold transition ${
                item.active
                  ? "text-brand-600"
                  : isDark
                    ? "text-white/60 hover:text-white"
                    : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
              isDark ? "border-white/12 bg-white/8 text-white" : "border-brand-100 bg-white text-brand-700"
            }`}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={onToggleLanguage}
            className={`h-9 rounded-xl border px-3 text-xs font-black transition ${
              isDark ? "border-white/12 bg-white/8 text-white" : "border-brand-100 bg-white text-brand-700"
            }`}
          >
            {isRTL ? "FR" : "عربي"}
          </button>
          <Link
            href="/login"
            className={`hidden rounded-xl px-3 py-2 text-sm font-bold transition sm:inline-flex ${
              isDark ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-950"
            }`}
          >
            {data.login}
          </Link>
          <Link
            href="/register"
            className="hidden rounded-xl bg-brand-600 px-3 py-2 text-sm font-black text-white transition hover:bg-brand-700 sm:inline-flex sm:px-4"
          >
            {data.start}
          </Link>

          {/* Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            className={`grid h-9 w-9 place-items-center rounded-xl border transition md:hidden ${
              isDark ? "border-white/12 bg-white/8 text-white" : "border-brand-100 bg-white text-brand-700"
            }`}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className={`md:hidden border-t px-4 py-3 space-y-1 ${isDark ? 'border-white/10 bg-[#090817]/95' : 'border-brand-100 bg-white/95'}`}>
          {data.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${
                item.active
                  ? isDark ? "bg-brand-600/15 text-brand-400" : "bg-brand-50 text-brand-600"
                  : isDark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className={`my-2 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`} />
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${
              isDark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            {data.login}
          </Link>
          <Link
            href="/register"
            onClick={() => setMobileOpen(false)}
            className="block rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white transition hover:bg-brand-700"
          >
            {data.start}
          </Link>
        </div>
      )}
    </header>
  )
}

function Footer({ data, isDark }) {
  return (
    <footer className={`border-t px-4 py-8 sm:px-6 ${isDark ? "border-white/10" : "border-brand-100"}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className={`mt-3 max-w-md text-sm leading-6 ${isDark ? "text-white/55" : "text-slate-600"}`}>{data.footerText}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-bold">
          {data.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.active ? "text-brand-600" : isDark ? "text-white/58 hover:text-white" : "text-slate-600 hover:text-slate-950"}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
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
