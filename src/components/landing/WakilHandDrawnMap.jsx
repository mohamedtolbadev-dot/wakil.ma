"use client"

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
      <div
        className={`group relative overflow-hidden rounded-[18px] border p-3 backdrop-blur-xl transition-all duration-300 sm:rounded-[22px] sm:p-5 lg:min-h-[176px]
          ${isDark
            ? "border-white/15 bg-slate-950/60 text-white shadow-2xl shadow-black/25 hover:border-white/25"
            : "border-white/80 bg-white/90 text-brand-950 shadow-xl shadow-slate-900/10 hover:border-brand-200"}`}
      >
        <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-600 sm:h-1" />

        <div className="relative">
          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
            <span
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11 sm:rounded-2xl
                ${isDark ? "border-white/15 bg-white/10 text-white/70" : "border-slate-200 bg-white text-slate-500"}`}
            >
              <Icon size={16} className="sm:h-[18px] sm:w-[18px]" />
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-extrabold sm:px-2.5 sm:py-1 sm:text-xs ${isDark ? "border-white/15 bg-white/10 text-white/70" : "border-slate-200 bg-white text-slate-500"}`}>
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <h3 className={`mb-1.5 text-[13px] font-extrabold leading-snug sm:mb-2 sm:text-[15px] ${isDark ? "text-white" : "text-brand-900"}`}>
            {title}
          </h3>
          <p className={`text-[11px] leading-relaxed sm:text-xs ${isDark ? "text-white/70" : "text-slate-600"}`}>
            {desc}
          </p>
        </div>
      </div>
    </div>
  )
}

function SchematicConnectors({ isDark, isArabic, loopLabel }) {
  const stroke = isDark ? "#A9A3FF" : "#712DDE"
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
  const stroke = isDark ? "#A9A3FF" : "#712DDE"

  return (
    <div className="flex justify-center py-1.5 lg:hidden">
      <svg className="h-8 w-8" viewBox="0 0 44 58" fill="none" aria-hidden="true">
        <path
          d="M22 2 C17 15 28 23 22 35 C18 43 19 49 24 55"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="6 8"
          opacity={isDark ? "0.52" : "0.42"}
        />
        <path d="M24 55 L16 47 M24 55 L32 48" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function WakilHandDrawnMap({ theme }) {
  const { language } = useLanguage()
  const isDark = theme === "dark"
  const isArabic = language === "ar"

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
    <section id="ai-agent" className="relative overflow-hidden py-10 sm:py-18 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-6 max-w-3xl text-center sm:mb-8">
          <div
            className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold
              ${isDark ? "border-white/15 bg-white/10 text-brand-100" : "border-brand-100 bg-white/90 text-brand-700"}`}
          >
            <span className="h-2 w-2 rounded-full bg-brand-600" />
            {copy.badge}
          </div>
          <h2 className={`text-2xl font-black leading-tight tracking-tight sm:text-4xl md:text-6xl ${isDark ? "text-white" : "text-brand-950"}`}>
            {copy.title}
          </h2>
          <p className={`mx-auto mt-3 max-w-2xl text-[13px] leading-relaxed sm:mt-5 sm:text-base sm:leading-loose ${isDark ? "text-white/75" : "text-slate-600"}`}>
            {copy.subtitle}
          </p>
        </div>

        <div className="relative z-10 mx-auto max-w-[430px] lg:min-h-[520px] lg:max-w-none lg:px-8 lg:py-8" dir={isArabic ? "rtl" : "ltr"}>
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
                  className={index % 2 === 0 ? "lg:-rotate-[1deg]" : "lg:rotate-[1deg]"}
                />
                {index < flowSteps.length - 1 && <MobileSketchConnector isDark={isDark} />}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
