// Central metadata helpers for Wakil.ma pages.

export const siteConfig = {
  name: "Wakil.ma",
  shortName: "Wakil",
  domain: "wakil.ma",
  url: "https://wakil.ma",
  ogImage: "/og-image.jpg",
  twitter: "@wakilma",
  verification: {
    google: "FQR2XC0zOF9fi9ihgcZ4uJ3zhEEgh3XA5N0DfwXoPSo",
  },
  description: {
    fr: "Wakil.ma est un agent commercial IA pour WhatsApp: il repond aux clients, presente vos produits, collecte les informations de livraison et cree les commandes.",
    ar: "Wakil.ma وكيل مبيعات بالذكاء الاصطناعي على واتساب: يرد على العملاء، يعرض المنتجات، يجمع معلومات التوصيل وينشئ الطلبيات.",
  },
  keywords: {
    fr: [
      "agent IA WhatsApp",
      "vente WhatsApp Maroc",
      "automatisation commandes",
      "chatbot e-commerce Maroc",
      "CRM WhatsApp",
      "gestion commandes WhatsApp",
    ],
    ar: [
      "وكيل مبيعات واتساب",
      "ذكاء اصطناعي واتساب",
      "إدارة طلبيات",
      "تجارة إلكترونية المغرب",
      "أتمتة واتساب",
      "CRM واتساب",
    ],
  },
}

export function generateMetadata({
  title,
  description,
  lang = "fr",
  path = "",
  noIndex = false,
} = {}) {
  const isAr = lang === "ar"
  const siteName = siteConfig.name
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} | Agent commercial IA WhatsApp`
  const fullDescription = description || siteConfig.description[lang] || siteConfig.description.fr
  const url = `${siteConfig.url}${path || ""}`

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: siteConfig.keywords[lang] || siteConfig.keywords.fr,
    applicationName: siteName,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: path || "/",
    },
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url,
      siteName,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      locale: isAr ? "ar_MA" : "fr_MA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: fullDescription,
      images: [siteConfig.ogImage],
      creator: siteConfig.twitter,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    verification: siteConfig.verification,
  }
}

export const pageMetadata = {
  home: {
    fr: {
      title: "Agent commercial IA pour WhatsApp",
      description: siteConfig.description.fr,
    },
    ar: {
      title: "وكيل مبيعات ذكي على واتساب",
      description: siteConfig.description.ar,
    },
    path: "/",
  },

  features: {
    fr: {
      title: "Fonctionnalites WhatsApp pour e-commerce au Maroc",
      description:
        "Decouvrez les fonctionnalites Wakil.ma: agent IA WhatsApp, catalogue produits, conversations, commandes, clients, livraison CSV, campagnes et analytics.",
    },
    ar: {
      title: "مميزات وكيل لإدارة البيع على واتساب",
      description:
        "اكتشف مميزات Wakil.ma: وكيل ذكاء اصطناعي على واتساب، كاتالوغ المنتجات، المحادثات، الطلبيات، العملاء، التوصيل CSV، الحملات والتحليلات.",
    },
    path: "/features",
  },

  login: {
    fr: { title: "Connexion", description: "Connectez-vous a votre compte Wakil.ma." },
    ar: { title: "تسجيل الدخول", description: "سجل الدخول إلى حسابك في Wakil.ma." },
    path: "/login",
    noIndex: true,
  },
  register: {
    fr: { title: "Creer un compte", description: "Creez votre compte Wakil.ma et connectez votre boutique WhatsApp." },
    ar: { title: "إنشاء حساب", description: "أنشئ حسابك في Wakil.ma واربط متجرك بواتساب." },
    path: "/register",
    noIndex: true,
  },
  verify: {
    fr: { title: "Verification", description: "Verifiez votre compte Wakil.ma." },
    ar: { title: "التحقق", description: "تحقق من حسابك في Wakil.ma." },
    path: "/verify",
    noIndex: true,
  },
  phoneSetup: {
    fr: { title: "Configuration WhatsApp", description: "Configurez votre numero WhatsApp Business." },
    ar: { title: "إعداد واتساب", description: "اضبط رقم WhatsApp Business الخاص بك." },
    path: "/phone-setup",
    noIndex: true,
  },
  forgotPassword: {
    fr: { title: "Mot de passe oublie", description: "Recuperez l'acces a votre compte Wakil.ma." },
    ar: { title: "نسيت كلمة المرور", description: "استرجع الوصول إلى حسابك في Wakil.ma." },
    path: "/forgot-password",
    noIndex: true,
  },
  resetPassword: {
    fr: { title: "Reinitialiser le mot de passe", description: "Choisissez un nouveau mot de passe pour Wakil.ma." },
    ar: { title: "إعادة تعيين كلمة المرور", description: "اختر كلمة مرور جديدة لحساب Wakil.ma." },
    path: "/reset-password",
    noIndex: true,
  },

  dashboard: {
    fr: { title: "Tableau de bord", description: "Vue d'ensemble de vos ventes, commandes et conversations WhatsApp." },
    ar: { title: "لوحة التحكم", description: "نظرة عامة على المبيعات والطلبيات ومحادثات واتساب." },
    path: "/dashboard",
    noIndex: true,
  },
  conversations: {
    fr: { title: "Conversations", description: "Suivez et gerez les conversations WhatsApp avec vos clients." },
    ar: { title: "المحادثات", description: "تابع وأدر محادثات واتساب مع العملاء." },
    path: "/dashboard/conversations",
    noIndex: true,
  },
  archive: {
    fr: { title: "Archive", description: "Conversations archivees de votre espace Wakil.ma." },
    ar: { title: "الأرشيف", description: "المحادثات المؤرشفة في حساب Wakil.ma." },
    path: "/dashboard/archive",
    noIndex: true,
  },
  orders: {
    fr: { title: "Commandes", description: "Gerez les commandes, statuts, suivi et informations de livraison." },
    ar: { title: "الطلبيات", description: "أدر الطلبيات والحالات والتتبع ومعلومات التوصيل." },
    path: "/dashboard/orders",
    noIndex: true,
  },
  products: {
    fr: { title: "Produits", description: "Gerez les produits, prix, images, variantes et stock." },
    ar: { title: "المنتجات", description: "أدر المنتجات والأسعار والصور والخيارات والمخزون." },
    path: "/dashboard/products",
    noIndex: true,
  },
  services: {
    fr: { title: "Services", description: "Gerez les services et les disponibilites si ce module est active." },
    ar: { title: "الخدمات", description: "أدر الخدمات والتوفر إذا كان هذا الموديل مفعلاً." },
    path: "/dashboard/services",
    noIndex: true,
  },
  appointments: {
    fr: { title: "Rendez-vous", description: "Gerez les rendez-vous et confirmations si ce module est active." },
    ar: { title: "المواعيد", description: "أدر المواعيد والتأكيدات إذا كان هذا الموديل مفعلاً." },
    path: "/dashboard/appointments",
    noIndex: true,
  },
  customers: {
    fr: { title: "Clients", description: "Consultez vos clients, commandes et historique d'achat." },
    ar: { title: "العملاء", description: "تابع العملاء والطلبيات وسجل الشراء." },
    path: "/dashboard/customers",
    noIndex: true,
  },
  analytics: {
    fr: { title: "Analytiques", description: "Analysez les ventes, commandes, clients et performances de l'agent IA." },
    ar: { title: "التحليلات", description: "حلل المبيعات والطلبيات والعملاء وأداء وكيل الذكاء الاصطناعي." },
    path: "/dashboard/analytics",
    noIndex: true,
  },
  campaigns: {
    fr: { title: "Campagnes", description: "Gerez vos campagnes WhatsApp et vos segments clients." },
    ar: { title: "الحملات", description: "أدر حملات واتساب وشرائح العملاء." },
    path: "/dashboard/campaigns",
    noIndex: true,
  },
  invoices: {
    fr: { title: "Factures", description: "Consultez vos factures et paiements Wakil.ma." },
    ar: { title: "الفواتير", description: "تابع فواتير ومدفوعات Wakil.ma." },
    path: "/dashboard/invoices",
    noIndex: true,
  },
  settings: {
    fr: { title: "Parametres", description: "Configurez l'agent IA, WhatsApp, messages et suivi des commandes." },
    ar: { title: "الإعدادات", description: "اضبط وكيل الذكاء الاصطناعي وواتساب ورسائل الطلبيات." },
    path: "/dashboard/settings",
    noIndex: true,
  },
  onboarding: {
    fr: { title: "Configuration initiale", description: "Configurez votre boutique, WhatsApp et vos premiers produits." },
    ar: { title: "الإعداد الأولي", description: "اضبط المتجر وواتساب وأول المنتجات." },
    path: "/onboarding",
    noIndex: true,
  },
  admin: {
    fr: { title: "Administration", description: "Espace d'administration Wakil.ma." },
    ar: { title: "الإدارة", description: "مساحة إدارة Wakil.ma." },
    path: "/dashboard/admin",
    noIndex: true,
  },
  adminBlogs: {
    fr: { title: "Administration blogs", description: "Creez et gerez les articles SEO Wakil.ma." },
    ar: { title: "إدارة المدونة", description: "أنشئ وأدر مقالات SEO الخاصة بـ Wakil.ma." },
    path: "/dashboard/admin/blogs",
    noIndex: true,
  },

  privacy: {
    fr: { title: "Politique de confidentialite", description: "Comment Wakil.ma collecte, utilise et protege vos donnees." },
    ar: { title: "سياسة الخصوصية", description: "كيف تجمع Wakil.ma بياناتك وتستعملها وتحميها." },
    path: "/privacy",
  },
  terms: {
    fr: { title: "Conditions d'utilisation", description: "Conditions d'utilisation de la plateforme Wakil.ma." },
    ar: { title: "شروط الاستخدام", description: "شروط استعمال منصة Wakil.ma." },
    path: "/terms",
  },
  deleteData: {
    fr: { title: "Suppression des donnees", description: "Demandez la suppression de vos donnees Wakil.ma." },
    ar: { title: "حذف البيانات", description: "اطلب حذف بياناتك من Wakil.ma." },
    path: "/delete-data",
    noIndex: true,
  },
}

export function getPageMetadata(pageKey, lang = "fr") {
  const page = pageMetadata[pageKey]
  if (!page) return generateMetadata({ lang, noIndex: true })

  const localized = page[lang] || page.fr
  return generateMetadata({
    title: localized.title,
    description: localized.description,
    lang,
    path: page.path,
    noIndex: page.noIndex,
  })
}
