"use client"

import Image from "next/image"
import {
  Bot,
  ClipboardCheck,
  MessageCircle,
  PackageCheck,
  Send,
  Truck,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

function SketchCard({ icon: Icon, index, title, desc, isDark, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <span className={`absolute -top-2 left-8 z-20 h-5 w-14 -rotate-3 rounded-sm ${isDark ? "bg-white/10" : "bg-slate-200/70"}`} />

      <div
        className={`relative min-h-[168px] rounded-[22px] p-4 backdrop-blur-md sm:p-5
          ${isDark ? "bg-black/25 text-white" : "bg-white/72 text-brand-950"}`}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 240 160" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M12 10 C58 2 123 8 225 12 C237 46 229 99 232 148 C168 158 71 151 12 147 C3 101 8 51 12 10Z"
            fill="none"
            stroke="#534AB7"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={isDark ? "0.6" : "0.48"}
          />
          <path
            d="M18 17 C72 10 126 15 219 18 C225 56 219 100 224 142"
            fill="none"
            stroke="#534AB7"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity={isDark ? "0.28" : "0.22"}
          />
        </svg>

        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            <span
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2
                ${isDark ? "border-brand-300/60 bg-white/10 text-brand-300" : "border-slate-200 bg-white text-brand-600"}`}
            >
              <svg className="absolute inset-[-5px] h-[50px] w-[50px]" viewBox="0 0 52 52" fill="none" aria-hidden="true">
                <path
                  d="M25 4 C37 4 48 12 48 26 C48 39 38 48 25 48 C12 48 4 39 4 26 C4 12 14 5 25 4Z"
                  stroke="#534AB7"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeDasharray="4 5"
                  opacity={isDark ? "0.55" : "0.38"}
                />
              </svg>
              <Icon size={17} />
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-extrabold ${isDark ? "border-white/15 text-brand-300" : "border-slate-200 text-brand-600"}`}>
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <h3 className={`mb-2 text-sm font-extrabold leading-snug sm:text-[15px] ${isDark ? "text-white" : "text-brand-900"}`}>
            {title}
          </h3>
          <p className={`text-xs leading-relaxed ${isDark ? "text-white/72" : "text-slate-600"}`}>
            {desc}
          </p>
        </div>
      </div>
    </div>
  )
}

function SchematicConnectors({ isDark, isArabic, loopLabel }) {
  const stroke = isDark ? "#A9A3FF" : "#534AB7"
  const opacity = isDark ? "0.48" : "0.42"

  return (
    <svg
      className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
      viewBox="0 0 1200 520"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <marker id="wakilSketchArrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
          <path d="M2 2 L10 6 L2 10" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      <path d="M205 102 C295 36 365 166 475 105" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="10 11" opacity={opacity} markerEnd="url(#wakilSketchArrow)" />
      <path d="M720 104 C810 36 880 168 995 104" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="10 11" opacity={opacity} markerEnd="url(#wakilSketchArrow)" />
      <path d="M1042 148 C1150 210 1136 338 1035 400" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="10 11" opacity={opacity} markerEnd="url(#wakilSketchArrow)" />
      <path d="M935 420 C830 475 760 354 650 414" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="10 11" opacity={opacity} markerEnd="url(#wakilSketchArrow)" />
      <path d="M470 420 C360 478 300 355 190 414" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="10 11" opacity={opacity} markerEnd="url(#wakilSketchArrow)" />

      <path d="M165 378 C58 330 56 192 168 142" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="7 10" opacity={isDark ? "0.4" : "0.34"} markerEnd="url(#wakilSketchArrow)" />
      <path d="M116 254 C109 219 129 189 158 177 C127 180 101 198 90 225" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" opacity={isDark ? "0.25" : "0.22"} />

      <g opacity={isDark ? "0.45" : "0.36"}>
        <path d="M108 286 C154 272 189 293 174 322 C157 351 104 345 96 314 C89 289 113 270 147 275" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeDasharray="5 7" />
        <text
          x={isArabic ? "145" : "96"}
          y="368"
          fill={stroke}
          fontSize="22"
          fontWeight="900"
          textAnchor={isArabic ? "middle" : "start"}
          direction={isArabic ? "rtl" : "ltr"}
        >
          {loopLabel}
        </text>
      </g>
    </svg>
  )
}

function MobileSketchConnector({ isDark }) {
  const stroke = isDark ? "#A9A3FF" : "#534AB7"

  return (
    <div className="flex justify-center py-2 lg:hidden">
      <svg className="h-12 w-10" viewBox="0 0 44 58" fill="none" aria-hidden="true">
        <path
          d="M22 2 C17 15 28 23 22 35 C18 43 19 49 24 55"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="6 8"
          opacity={isDark ? "0.52" : "0.42"}
        />
        <path d="M24 55 L16 47 M24 55 L32 48" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function MiniCompany({ children, isDark }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[12px] font-bold
        ${isDark
          ? "border-white/20 bg-white/10 text-white/80"
          : "border-slate-200 bg-white/85 text-brand-700"}`}
    >
      {children}
    </span>
  )
}

export default function WakilHandDrawnMap({ theme }) {
  const { language } = useLanguage()
  const isDark = theme === "dark"
  const isArabic = language === "ar"
  const logoSrc = isDark ? "/logo/wakil-logo-dark.svg" : "/logo/wakil-logo-light.svg"

  const copy = isArabic
    ? {
        badge: "خطاطة الخدمة",
        title: "من رسالة واتساب حتى شركة التوصيل",
        subtitle:
          "Wakil كيحوّل المحادثة لطلبية واضحة، كيوجدها للتصدير لشركة التوصيل، ومن بعد كيساعدك ترجع التتبع والحالة للعميل.",
        whatsappTitle: "الزبون فواتساب",
        whatsappDesc: "سؤال على المنتج، الثمن، التوصيل، أو رغبة مباشرة فالشراء.",
        aiTitle: "الوكيل الذكي",
        aiDesc: "كيجاوب، كيعالج الاعتراضات، وكيجمع الاسم والمدينة والعنوان.",
        orderTitle: "طلبية منظمة",
        orderDesc: "المنتج، الكمية، الهاتف، العنوان، المبلغ والملاحظات واجدين.",
        csvTitle: "CSV لشركة التوصيل",
        csvDesc: "تصدير الطلبيات المؤكدة بالصيغة اللي تقدر ترفعها عند الناقل.",
        carrierTitle: "شركة التوصيل",
        carrierDesc: "كتستلم الملف، كتسجل الطرود، وكتعطيك رقم التتبع أو حالة كل طلبية.",
        trackingTitle: "تتبع ورسائل",
        trackingDesc: "استورد tracking أو status، والمنصة تحدث الطلبية وتقدر ترسل إشعار للزبون.",
        companies: "أمثلة شركات التوصيل",
        companiesHint:
          "خدامة مع أي شركة كتقبل CSV أو كترجع ملف فيه reference و tracking/status.",
        loopLabel: "تتبع",
      }
    : {
        badge: "Schéma du workflow",
        title: "Du message WhatsApp au transporteur",
        subtitle:
          "Wakil transforme la conversation en commande claire, prépare l'export transporteur, puis vous aide à réimporter le tracking et le statut.",
        whatsappTitle: "Client WhatsApp",
        whatsappDesc: "Question produit, prix, livraison ou intention d'achat.",
        aiTitle: "Agent IA",
        aiDesc: "Répond, traite les objections et collecte nom, ville et adresse.",
        orderTitle: "Commande claire",
        orderDesc: "Produit, quantité, téléphone, adresse, montant et notes prêts.",
        csvTitle: "CSV transporteur",
        csvDesc: "Export des commandes confirmées dans un fichier exploitable par le transporteur.",
        carrierTitle: "Transporteur",
        carrierDesc: "Il reçoit le fichier, enregistre les colis et renvoie tracking ou statut.",
        trackingTitle: "Suivi et messages",
        trackingDesc: "Importez tracking ou statut, la commande se met à jour et le client peut être notifié.",
        companies: "Exemples transporteurs",
        companiesHint: "Compatible avec tout transporteur qui accepte un CSV ou renvoie reference + tracking/status.",
        loopLabel: "suivi",
      }

  const flowSteps = [
    { icon: MessageCircle, title: copy.whatsappTitle, desc: copy.whatsappDesc },
    { icon: Bot, title: copy.aiTitle, desc: copy.aiDesc },
    { icon: ClipboardCheck, title: copy.orderTitle, desc: copy.orderDesc },
    { icon: Truck, title: copy.csvTitle, desc: copy.csvDesc },
    { icon: PackageCheck, title: copy.carrierTitle, desc: copy.carrierDesc },
    { icon: Send, title: copy.trackingTitle, desc: copy.trackingDesc },
  ]

  const sketchPositions = [
    "lg:col-start-1 lg:row-start-1",
    "lg:col-start-2 lg:row-start-1",
    "lg:col-start-3 lg:row-start-1",
    "lg:col-start-3 lg:row-start-2",
    "lg:col-start-2 lg:row-start-2",
    "lg:col-start-1 lg:row-start-2",
  ]

  return (
    <section id="ai-agent" className="relative overflow-hidden py-10 sm:py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <div
            className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold
              ${isDark ? "border-white/15 bg-white/10 text-brand-200" : "border-slate-200 bg-white/85 text-brand-700"}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
            {copy.badge}
          </div>
          <h2 className={`text-2xl font-extrabold tracking-tight sm:text-3xl md:text-5xl ${isDark ? "text-white" : "text-brand-950"}`}>
            {copy.title}
          </h2>
          <p className={`mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base ${isDark ? "text-white/70" : "text-slate-600"}`}>
            {copy.subtitle}
          </p>
        </div>

        <div
          className={`relative mx-auto overflow-hidden rounded-[28px] border p-4 sm:rounded-[34px] sm:p-7
            ${isDark ? "border-white/15 bg-black/20" : "border-slate-200/70 bg-white/70"}`}
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              backgroundImage: isDark
                ? "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)"
                : "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.055) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 mx-auto mb-6 flex h-[96px] w-full max-w-[270px] items-center justify-center rounded-[26px] border-2 border-dashed border-slate-300/70 px-5 sm:h-[110px] sm:max-w-[320px] dark:border-white/20">
            <Image src={logoSrc} alt="wakil.ma" width={176} height={44} className="h-10 w-auto" />
          </div>

          <div className="relative z-10 lg:min-h-[520px] lg:px-8 lg:py-8">
            <SchematicConnectors isDark={isDark} isArabic={isArabic} loopLabel={copy.loopLabel} />

            <div className="relative z-10 grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:grid-rows-2 lg:gap-x-20 lg:gap-y-20">
              {flowSteps.map((step, index) => (
                <div key={step.title} className={`relative ${sketchPositions[index]}`}>
                  <SketchCard
                    isDark={isDark}
                    icon={step.icon}
                    index={index}
                    title={step.title}
                    desc={step.desc}
                    className={index % 2 === 0 ? "lg:-rotate-[1.5deg]" : "lg:rotate-[1.5deg]"}
                  />
                  {index < flowSteps.length - 1 && <MobileSketchConnector isDark={isDark} />}
                </div>
              ))}
            </div>
          </div>

          <div
            className={`relative z-10 mt-6 rounded-[22px] border p-4 text-center
              ${isDark ? "border-white/15 bg-black/25" : "border-slate-200/70 bg-white/85"}`}
          >
            <div className="mb-2 flex items-center justify-center gap-2">
              <PackageCheck size={16} className={isDark ? "text-brand-200" : "text-brand-600"} />
              <span className={`text-[12px] font-extrabold ${isDark ? "text-white/80" : "text-brand-800"}`}>
                {copy.companies}
              </span>
            </div>
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {["Cathedis", "Amana", "Speedaf", "Atlas"].map((name) => (
                <MiniCompany key={name} isDark={isDark}>
                  {name}
                </MiniCompany>
              ))}
            </div>
            <p className={`mx-auto max-w-2xl text-[12px] font-medium leading-relaxed ${isDark ? "text-white/62" : "text-slate-600"}`}>
              {copy.companiesHint}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
