"use client"

import Link from "next/link"
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Brain,
  CheckCircle2,
  FileSpreadsheet,
  Megaphone,
  MessageCircle,
  MessageSquare,
  PackageCheck,
  Phone,
  Settings2,
  Shield,
  ShoppingBag,
  Truck,
  Upload,
  Users,
} from "lucide-react"
import { PublicFooter } from "@/components/public/PublicFooter"
import { PublicHeader } from "@/components/public/PublicHeader"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppTheme } from "@/hooks/useAppTheme"

const copy = {
  fr: {
    nav: [
      { label: "Accueil", href: "/" },
      { label: "Fonctionnalites", href: "/features", active: true },
      { label: "Blog", href: "/blogs" },
      { label: "FAQ", href: "/#faq" },
    ],
    login: "Connexion",
    start: "Commencer",
    eyebrow: "Plateforme WhatsApp pour e-commerce marocain",
    title: "Tous les outils Wakil.ma pour vendre, confirmer et suivre vos commandes WhatsApp",
    subtitle:
      "Centralisez votre catalogue, vos conversations, l'agent IA, les commandes, les clients, les campagnes et le suivi livraison dans un seul espace.",
    primaryCta: "Creer un compte",
    secondaryCta: "Voir l'agent IA",
    proof: ["Agent IA configure par boutique", "Commandes et clients synchronises", "Export CSV livraison et tracking"],
    panelTitle: "Commande WhatsApp traitee par Wakil.ma",
    panelClient: "Salam, je veux commander Oud Royal",
    panelAgent: "Bien recu. Donnez-moi la ville, l'adresse et le nom complet pour preparer la commande.",
    panelOrder: "Commande confirmee",
    panelDelivery: "Tracking pret",
    sectionEyebrow: "Fonctionnalites",
    sectionTitle: "Ce que la plateforme gere aujourd'hui",
    sectionText:
      "Chaque module est pense pour reduire le travail manuel dans une boutique qui vend par WhatsApp.",
    workflowEyebrow: "Workflow",
    workflowTitle: "De la premiere question client jusqu'au suivi livraison",
    workflowText:
      "Wakil.ma garde le meme fil entre conversation, commande, client et statut livraison.",
    ctaTitle: "Pret a transformer WhatsApp en canal de vente organise ?",
    ctaText: "Connectez votre boutique, ajoutez vos produits et laissez l'agent IA assister vos clients.",
    footerText: "Agent commercial IA pour WhatsApp, concu pour les boutiques marocaines.",
    features: [
      {
        key: "catalog",
        icon: ShoppingBag,
        title: "Catalogue produits",
        text: "Ajoutez vos produits avec prix, images, description, variantes et stock pour que l'agent reponde avec des informations exactes.",
        points: ["Images et prix", "Variantes et stock", "Import rapide"],
      },
      {
        key: "agent",
        icon: Bot,
        title: "Agent IA WhatsApp",
        text: "L'agent comprend le message du client, presente les produits, traite les objections et collecte les informations de commande.",
        points: ["Langue automatique", "Instructions par boutique", "Collecte des informations"],
      },
      {
        key: "conversations",
        icon: MessageSquare,
        title: "Boite conversations",
        text: "Suivez les discussions WhatsApp, les messages, les medias et les vocaux depuis un espace clair.",
        points: ["Historique complet", "Reponse manuelle", "Media et vocaux"],
      },
      {
        key: "orders",
        icon: PackageCheck,
        title: "Commandes automatiques",
        text: "Quand le client confirme, la commande garde le produit, la quantite, le client, la ville, l'adresse et le montant.",
        points: ["Resume commande", "Statuts", "Details client"],
      },
      {
        key: "customers",
        icon: Users,
        title: "Clients et historique",
        text: "Retrouvez les informations client, ses commandes et son historique pour mieux suivre chaque acheteur.",
        points: ["Profil client", "Historique achat", "Segmentation"],
      },
      {
        key: "delivery",
        icon: Truck,
        title: "Livraison CSV et tracking",
        text: "Exportez les commandes confirmees, importez les numeros de suivi et notifiez le client selon vos templates.",
        points: ["Export livraison", "Import tracking", "Mise a jour en masse"],
      },
      {
        key: "campaigns",
        icon: Megaphone,
        title: "Campagnes WhatsApp",
        text: "Preparez des campagnes avec templates, segments et suivi pour relancer vos clients proprement.",
        points: ["Templates Meta", "Segments clients", "Suivi des envois"],
      },
      {
        key: "analytics",
        icon: BarChart3,
        title: "Analytics",
        text: "Suivez les ventes, commandes, performance de l'agent IA, consommation et indicateurs livraison.",
        points: ["Ventes", "Conversion", "Consommation IA"],
      },
      {
        key: "settings",
        icon: Settings2,
        title: "Parametres boutique",
        text: "Controlez WhatsApp Cloud API, la langue de communication, les templates de messages et le tracking.",
        points: ["Templates commande", "URL tracking", "Regles agent"],
      },
    ],
    workflow: [
      { title: "Message WhatsApp", text: "Le client pose une question ou demande un produit.", icon: MessageCircle },
      { title: "Reponse agent IA", text: "L'agent repond avec le catalogue et guide la vente.", icon: Brain },
      { title: "Commande creee", text: "Les informations utiles sont conservees dans Orders.", icon: PackageCheck },
      { title: "Export livraison", text: "L'admin exporte un CSV pour la societe de livraison.", icon: FileSpreadsheet },
      { title: "Tracking client", text: "Le suivi et les notifications WhatsApp restent dans le systeme.", icon: Truck },
    ],
  },
  ar: {
    nav: [
      { label: "الرئيسية", href: "/" },
      { label: "المميزات", href: "/features", active: true },
      { label: "المدونة", href: "/blogs" },
      { label: "الأسئلة", href: "/#faq" },
    ],
    login: "دخول",
    start: "ابدأ الآن",
    eyebrow: "منصة واتساب للمتاجر المغربية",
    title: "كل أدوات Wakil.ma باش تبيع، تأكد وتتابع طلبيات واتساب",
    subtitle:
      "جمع الكاتالوغ، المحادثات، وكيل AI، الطلبيات، العملاء، الحملات وتتبع التوصيل فمساحة وحدة واضحة.",
    primaryCta: "أنشئ حساب",
    secondaryCta: "شوف وكيل AI",
    proof: ["وكيل AI مضبوط على المتجر", "الطلبيات والعملاء مربوطين", "Export CSV للتوصيل والتتبع"],
    panelTitle: "طلبية واتساب خدمها Wakil.ma",
    panelClient: "سلام، بغيت نطلب Oud Royal",
    panelAgent: "واخا. عطيني المدينة، العنوان والاسم الكامل باش نوجد الطلبية.",
    panelOrder: "الطلبية تأكدات",
    panelDelivery: "رقم التتبع واجد",
    sectionEyebrow: "المميزات",
    sectionTitle: "شنو كتسير المنصة دابا",
    sectionText:
      "كل موديل معمول باش ينقص الخدمة اليدوية عند متجر كيبيع من واتساب.",
    workflowEyebrow: "المسار",
    workflowTitle: "من أول سؤال ديال الزبون حتى تتبع التوصيل",
    workflowText:
      "Wakil.ma كيخلي نفس الخيط مربوط بين المحادثة، الطلبية، العميل وحالة التوصيل.",
    ctaTitle: "واجد تخلي واتساب قناة بيع منظمة؟",
    ctaText: "ربط المتجر ديالك، زيد المنتجات وخلي وكيل AI يعاون العملاء ديالك.",
    footerText: "وكيل مبيعات AI على واتساب، معمول للمتاجر المغربية.",
    features: [
      {
        key: "catalog",
        icon: ShoppingBag,
        title: "كاتالوغ المنتجات",
        text: "زيد المنتجات بالثمن، الصور، الوصف، الخيارات والمخزون باش الوكيل يجاوب بمعلومات صحيحة.",
        points: ["صور وأثمنة", "خيارات ومخزون", "Import سريع"],
      },
      {
        key: "agent",
        icon: Bot,
        title: "وكيل AI على واتساب",
        text: "الوكيل كيفهم رسالة الزبون، كيقدم المنتجات، كيتعامل مع الاعتراضات وكيجمع معلومات الطلبية.",
        points: ["لغة تلقائية", "تعليمات لكل متجر", "جمع معلومات الطلب"],
      },
      {
        key: "conversations",
        icon: MessageSquare,
        title: "صندوق المحادثات",
        text: "تابع محادثات واتساب، الرسائل، الصور والرسائل الصوتية من بلاصة واضحة.",
        points: ["تاريخ كامل", "رد يدوي", "صور وفوكالات"],
      },
      {
        key: "orders",
        icon: PackageCheck,
        title: "طلبيات أوتوماتيك",
        text: "ملي الزبون كيأكد، الطلبية كتحفظ المنتج، الكمية، العميل، المدينة، العنوان والمجموع.",
        points: ["ملخص الطلبية", "الحالات", "معلومات العميل"],
      },
      {
        key: "customers",
        icon: Users,
        title: "العملاء والتاريخ",
        text: "شوف معلومات العميل، الطلبيات ديالو والتاريخ باش تبقى متابع كل مشتري.",
        points: ["بروفايل العميل", "تاريخ الشراء", "تقسيم العملاء"],
      },
      {
        key: "delivery",
        icon: Truck,
        title: "التوصيل CSV والتتبع",
        text: "خرج الطلبيات المؤكدة، دخل أرقام التتبع وصيفط إشعارات واتساب حسب القوالب ديالك.",
        points: ["Export للتوصيل", "Import للتتبع", "تحديث جماعي"],
      },
      {
        key: "campaigns",
        icon: Megaphone,
        title: "حملات واتساب",
        text: "وجد حملات بالقوالب، الشرائح والتتبع باش ترجع تتواصل مع العملاء بطريقة منظمة.",
        points: ["Templates Meta", "شرائح العملاء", "تتبع الإرسال"],
      },
      {
        key: "analytics",
        icon: BarChart3,
        title: "التحليلات",
        text: "تابع المبيعات، الطلبيات، أداء وكيل AI، الاستهلاك ومؤشرات التوصيل.",
        points: ["المبيعات", "التحويل", "استهلاك AI"],
      },
      {
        key: "settings",
        icon: Settings2,
        title: "إعدادات المتجر",
        text: "تحكم فـ WhatsApp Cloud API، لغة التواصل، قوالب الرسائل والتتبع.",
        points: ["قوالب الطلبية", "رابط التتبع", "قواعد الوكيل"],
      },
    ],
    workflow: [
      { title: "رسالة واتساب", text: "الزبون كيسول أو كيطلب منتج.", icon: MessageCircle },
      { title: "رد وكيل AI", text: "الوكيل كيجاوب من الكاتالوغ وكيعاون فالبيع.", icon: Brain },
      { title: "إنشاء الطلبية", text: "المعلومات المهمة كتبقى محفوظة فـ Orders.", icon: PackageCheck },
      { title: "Export للتوصيل", text: "الأدمن كيخرج CSV لشركة التوصيل.", icon: FileSpreadsheet },
      { title: "تتبع العميل", text: "التتبع وإشعارات واتساب كيبقاو فالسيستم.", icon: Truck },
    ],
  },
}

Object.assign(copy, {
  ar: {
    nav: [
      { label: "الرئيسية", href: "/" },
      { label: "المميزات", href: "/features", active: true },
      { label: "المدونة", href: "/blogs" },
      { label: "الأسئلة", href: "/#faq" },
    ],
    login: "دخول",
    start: "ابدأ الآن",
    eyebrow: "منصة واتساب للمتاجر المغربية",
    title: "كل أدوات Wakil.ma للبيع وتأكيد وتتبع طلبيات واتساب",
    subtitle:
      "جمع الكاتالوغ، المحادثات، وكيل AI، الطلبيات، العملاء، الحملات وتتبع التوصيل في مساحة واحدة واضحة.",
    primaryCta: "أنشئ حساب",
    secondaryCta: "شوف وكيل AI",
    proof: ["وكيل AI مضبوط على المتجر", "الطلبيات والعملاء مربوطين", "Export CSV للتوصيل والتتبع"],
    panelTitle: "طلبية واتساب خدمها Wakil.ma",
    panelClient: "سلام، بغيت نطلب Oud Royal",
    panelAgent: "واخا. عطيني المدينة، العنوان والاسم الكامل باش نوجد الطلبية.",
    panelOrder: "الطلبية تأكدات",
    panelDelivery: "رقم التتبع واجد",
    sectionEyebrow: "المميزات",
    sectionTitle: "شنو كتسير المنصة دابا",
    sectionText:
      "كل وحدة معمولة باش تنقص الخدمة اليدوية عند متجر كيبِيع من واتساب.",
    workflowEyebrow: "المسار",
    workflowTitle: "من أول سؤال ديال الزبون حتى تتبع التوصيل",
    workflowText:
      "Wakil.ma كيخلي نفس الخيط مربوط بين المحادثة، الطلبية، العميل وحالة التوصيل.",
    ctaTitle: "واجد تخلي واتساب قناة بيع منظمة؟",
    ctaText: "ربط المتجر ديالك، زيد المنتجات وخلي وكيل AI يعاون العملاء ديالك.",
    footerText: "وكيل مبيعات AI على واتساب، معمول للمتاجر المغربية.",
    features: [
      {
        key: "catalog",
        icon: ShoppingBag,
        title: "كاتالوغ المنتجات",
        text: "زيد المنتجات بالثمن، الصور، الوصف، الخيارات والمخزون باش الوكيل يجاوب بمعلومات صحيحة.",
        points: ["صور وأثمنة", "خيارات ومخزون", "Import سريع"],
      },
      {
        key: "agent",
        icon: Bot,
        title: "وكيل AI على واتساب",
        text: "الوكيل كيفهم رسالة الزبون، كيقدم المنتجات، كيتعامل مع الاعتراضات وكيجمع معلومات الطلبية.",
        points: ["لغة تلقائية", "تعليمات لكل متجر", "جمع معلومات الطلب"],
      },
      {
        key: "conversations",
        icon: MessageSquare,
        title: "صندوق المحادثات",
        text: "تابع محادثات واتساب، الرسائل، الصور والرسائل الصوتية من بلاصة واضحة.",
        points: ["تاريخ كامل", "رد يدوي", "صور وفوكالات"],
      },
      {
        key: "orders",
        icon: PackageCheck,
        title: "طلبيات أوتوماتيك",
        text: "ملي الزبون كيأكد، الطلبية كتحفظ المنتج، الكمية، العميل، المدينة، العنوان والمجموع.",
        points: ["ملخص الطلبية", "الحالات", "معلومات العميل"],
      },
      {
        key: "customers",
        icon: Users,
        title: "العملاء والتاريخ",
        text: "شوف معلومات العميل، الطلبيات ديالو والتاريخ باش تبقى متابع كل مشتري.",
        points: ["بروفايل العميل", "تاريخ الشراء", "تقسيم العملاء"],
      },
      {
        key: "delivery",
        icon: Truck,
        title: "التوصيل CSV والتتبع",
        text: "خرج الطلبيات المؤكدة، دخل أرقام التتبع وصيفط إشعارات واتساب حسب القوالب ديالك.",
        points: ["Export للتوصيل", "Import للتتبع", "تحديث جماعي"],
      },
      {
        key: "campaigns",
        icon: Megaphone,
        title: "حملات واتساب",
        text: "وجد حملات بالقوالب، الشرائح والتتبع باش ترجع تتواصل مع العملاء بطريقة منظمة.",
        points: ["Templates Meta", "شرائح العملاء", "تتبع الإرسال"],
      },
      {
        key: "analytics",
        icon: BarChart3,
        title: "التحليلات",
        text: "تابع المبيعات، الطلبيات، أداء وكيل AI، الاستهلاك ومؤشرات التوصيل.",
        points: ["المبيعات", "التحويل", "استهلاك AI"],
      },
      {
        key: "settings",
        icon: Settings2,
        title: "إعدادات المتجر",
        text: "تحكم في WhatsApp Cloud API، لغة التواصل، قوالب الرسائل والتتبع.",
        points: ["قوالب الطلبية", "رابط التتبع", "قواعد الوكيل"],
      },
    ],
    workflow: [
      { title: "رسالة واتساب", text: "الزبون كيسول أو كيطلب منتج.", icon: MessageCircle },
      { title: "رد وكيل AI", text: "الوكيل كيجاوب من الكاتالوغ وكيعاون فالبيع.", icon: Brain },
      { title: "إنشاء الطلبية", text: "المعلومات المهمة كتبقى محفوظة في Orders.", icon: PackageCheck },
      { title: "Export للتوصيل", text: "الأدمن كيخرج CSV لشركة التوصيل.", icon: FileSpreadsheet },
      { title: "تتبع العميل", text: "التتبع وإشعارات واتساب كيبقاو في السيستم.", icon: Truck },
    ],
  },
})

export default function FeaturesPage() {
  const { language } = useLanguage()
  const { isDark } = useAppTheme()
  const lang = language === "ar" ? "ar" : "fr"
  const data = copy[lang]
  const isRTL = lang === "ar"

  return (
    <main
      dir={isRTL ? "rtl" : "ltr"}
      className={`min-h-screen overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#090817] text-white" : "bg-white text-slate-950"
      }`}
    >
      <PublicHeader />

      <section className="relative px-4 sm:px-6 pt-12 pb-14 sm:pt-16 sm:pb-18">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div className={isRTL ? "text-right" : "text-left"}>
            <p
              className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                isDark
                  ? "border-white/15 bg-white/8 text-brand-200"
                  : "border-brand-200 bg-white text-brand-700"
              }`}
            >
              <Shield size={14} />
              {data.eyebrow}
            </p>
            <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              {data.title}
            </h1>
            <p className={`mt-5 max-w-2xl text-base leading-8 sm:text-lg ${isDark ? "text-white/68" : "text-slate-600"}`}>
              {data.subtitle}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
              >
                {data.primaryCta}
                <ArrowLeft size={17} className={isRTL ? "" : "rotate-180"} />
              </Link>
              <Link
                href="/#ai-agent"
                className={`inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-black transition ${
                  isDark
                    ? "border-white/15 bg-white/8 text-white hover:bg-white/12"
                    : "border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
                }`}
              >
                {data.secondaryCta}
              </Link>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {data.proof.map((item) => (
                <div
                  key={item}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold ${
                    isDark ? "border-white/10 bg-white/6 text-white/78" : "border-brand-100 bg-white text-slate-700"
                  }`}
                >
                  <CheckCircle2 size={16} className="shrink-0 text-brand-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <HeroPanel data={data} isDark={isDark} isRTL={isRTL} />
        </div>
      </section>

      <section className="px-4 sm:px-6 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            eyebrow={data.sectionEyebrow}
            title={data.sectionTitle}
            text={data.sectionText}
            isDark={isDark}
            isRTL={isRTL}
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.features.map((feature) => (
              <FeatureCard key={feature.key} feature={feature} isDark={isDark} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div
            className={`rounded-[28px] border p-5 sm:p-8 ${
              isDark ? "border-white/10 bg-white/6" : "border-brand-100 bg-white"
            }`}
          >
            <SectionIntro
              eyebrow={data.workflowEyebrow}
              title={data.workflowTitle}
              text={data.workflowText}
              isDark={isDark}
              isRTL={isRTL}
            />

            <div className="mt-8 grid gap-4 md:grid-cols-5">
              {data.workflow.map((step, index) => (
                <WorkflowStep
                  key={step.title}
                  step={step}
                  index={index}
                  isDark={isDark}
                  showLine={index < data.workflow.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-10 sm:py-16">
        <div
          className={`mx-auto max-w-6xl rounded-[30px] border px-5 py-8 text-center sm:px-8 sm:py-11 ${
            isDark ? "border-white/10 bg-white/8" : "border-brand-100 bg-white"
          }`}
        >
          <h2 className="text-2xl font-black sm:text-4xl">{data.ctaTitle}</h2>
          <p className={`mx-auto mt-4 max-w-2xl text-sm leading-7 sm:text-base ${isDark ? "text-white/65" : "text-slate-600"}`}>
            {data.ctaText}
          </p>
          <div className="mt-7 flex justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
            >
              {data.start}
              <ArrowLeft size={17} className={isRTL ? "" : "rotate-180"} />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}

function HeroPanel({ data, isDark, isRTL }) {
  return (
    <div
      className={`relative rounded-[32px] border p-4 shadow-2xl ${
        isDark ? "border-white/10 bg-white/8 shadow-black/30" : "border-brand-100 bg-white shadow-brand-200/40"
      }`}
    >
      <div className={`rounded-[24px] border p-4 ${isDark ? "border-white/10 bg-[#111026]" : "border-brand-100 bg-white"}`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className={`text-xs font-bold ${isDark ? "text-white/45" : "text-slate-500"}`}>wakil.ma</p>
            <h2 className="mt-1 text-lg font-black">{data.panelTitle}</h2>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white">
            <Bot size={22} />
          </div>
        </div>

        <div className="space-y-3">
          <MessageBubble align={isRTL ? "left" : "right"} text={data.panelClient} isDark={isDark} />
          <MessageBubble align={isRTL ? "right" : "left"} text={data.panelAgent} isDark={isDark} agent />
        </div>

        <div className={`mt-5 rounded-2xl border p-4 ${isDark ? "border-white/10 bg-white/8" : "border-brand-100 bg-white"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-xs font-bold ${isDark ? "text-white/50" : "text-slate-500"}`}>#WK-8F3A2C1B</p>
              <p className="mt-1 text-base font-black">{data.panelOrder}</p>
            </div>
            <PackageCheck className="text-brand-600" size={24} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <MiniMetric label="Oud Royal" value="210 DH" isDark={isDark} />
            <MiniMetric label={data.panelDelivery} value="CTD123456" isDark={isDark} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[Phone, Upload, Truck].map((Icon, index) => (
          <div
            key={index}
            className={`grid min-h-20 place-items-center rounded-2xl border ${
              isDark ? "border-white/10 bg-white/6 text-brand-200" : "border-brand-100 bg-white text-brand-600"
            }`}
          >
            <Icon size={24} />
          </div>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ text, align, isDark, agent = false }) {
  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${
          agent
            ? "bg-brand-600 text-white"
            : isDark
              ? "bg-white/10 text-white/85"
              : "bg-white text-slate-800"
        }`}
      >
        {text}
      </div>
    </div>
  )
}

function MiniMetric({ label, value, isDark }) {
  return (
    <div className={`rounded-xl p-3 ${isDark ? "bg-black/20" : "bg-white"}`}>
      <p className={`text-[11px] font-bold ${isDark ? "text-white/45" : "text-slate-500"}`}>{label}</p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  )
}

function SectionIntro({ eyebrow, title, text, isDark, isRTL }) {
  return (
    <div className={`max-w-3xl ${isRTL ? "text-right" : "text-left"}`}>
      <p className="text-sm font-black text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black leading-tight sm:text-4xl">{title}</h2>
      <p className={`mt-3 text-sm leading-7 sm:text-base ${isDark ? "text-white/62" : "text-slate-600"}`}>{text}</p>
    </div>
  )
}

function FeatureCard({ feature, isDark }) {
  const Icon = feature.icon

  return (
    <article
      className={`rounded-3xl border p-5 transition hover:-translate-y-0.5 ${
        isDark ? "border-white/10 bg-white/6 hover:bg-white/8" : "border-brand-100 bg-white hover:border-brand-200"
      }`}
    >
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white">
        <Icon size={22} />
      </div>
      <h3 className="mt-5 text-lg font-black">{feature.title}</h3>
      <p className={`mt-3 min-h-[78px] text-sm leading-7 ${isDark ? "text-white/62" : "text-slate-600"}`}>{feature.text}</p>
      <div className="mt-5 space-y-2">
        {feature.points.map((point) => (
          <div key={point} className={`flex items-center gap-2 text-sm font-bold ${isDark ? "text-white/75" : "text-slate-700"}`}>
            <CheckCircle2 size={16} className="shrink-0 text-brand-600" />
            <span>{point}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

function WorkflowStep({ step, index, isDark, showLine }) {
  const Icon = step.icon

  return (
    <div className="relative">
      {showLine && <div className={`absolute top-6 hidden h-px w-full md:block ${isDark ? "bg-white/10" : "bg-brand-100"}`} />}
      <div
        className={`relative rounded-2xl border p-4 ${
          isDark ? "border-white/10 bg-[#090817]" : "border-brand-100 bg-white"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white">
            <Icon size={20} />
          </div>
          <span className={`text-xs font-black ${isDark ? "text-white/35" : "text-slate-400"}`}>0{index + 1}</span>
        </div>
        <h3 className="text-sm font-black">{step.title}</h3>
        <p className={`mt-2 text-xs leading-6 ${isDark ? "text-white/58" : "text-slate-600"}`}>{step.text}</p>
      </div>
    </div>
  )
}
