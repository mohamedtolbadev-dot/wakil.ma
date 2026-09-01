"use client"

import { Shield, Lock, Eye, Trash2 } from "lucide-react"
import { PublicFooter } from "@/components/public/PublicFooter"
import { PublicHeader } from "@/components/public/PublicHeader"
import { useLanguage } from "@/contexts/LanguageContext"

const translations = {
  ar: {
    back: "العودة",
    title: "سياسة الخصوصية",
    lastUpdate: "آخر تحديث: 13 ماي 2026",
    section1: {
      title: "1. البيانات التي نجمعها",
      desc: "نجمع البيانات الضرورية لتشغيل Wakil.ma وتحسين تجربة البيع على واتساب:",
      items: [
        { label: "معلومات الحساب", text: "الاسم، البريد الإلكتروني، رقم الهاتف واسم المتجر" },
        { label: "محادثات العملاء", text: "رسائل واتساب الواردة والصادرة والوسائط المرتبطة بها" },
        { label: "بيانات المبيعات", text: "المنتجات، الطلبات، العملاء، حالات التوصيل والإحصائيات" },
        { label: "إعدادات المتجر", text: "إعدادات الوكيل، قوالب الرسائل وبيانات ربط WhatsApp Cloud API" },
      ],
    },
    section2: {
      title: "2. كيف نستخدم البيانات",
      items: [
        "تشغيل وكيل المبيعات الذكي والرد على العملاء حسب إعدادات متجرك",
        "إنشاء الطلبات، إدارة العملاء، التوصيل، الحملات والتحليلات",
        "إرسال التنبيهات ورسائل الحالة المرتبطة بالطلبات والحساب",
        "تحسين استقرار المنصة وجودة الخدمة",
      ],
    },
    section3: {
      title: "3. حماية البيانات ومزودو الخدمة",
      desc: "نطبق ضوابط عملية لحماية البيانات، ونستخدم مزودي خدمة ضروريين لتشغيل المنصة:",
      items: [
        "يتم نقل البيانات عبر HTTPS/TLS عند توفر الاستضافة المناسبة",
        "نستخدم مزودي خدمة مثل Meta WhatsApp، OpenAI، Cloudinary، البريد الإلكتروني، والاستضافة/قاعدة البيانات لتقديم الخدمة",
        "لا نبيع بياناتك، ولا نشاركها خارج ما يلزم لتشغيل المنصة أو الامتثال القانوني",
        "Token واتساب يُخزن في قاعدة بيانات التطبيق مع صلاحيات وصول محدودة، ولا نصفه كتشفير تطبيقي مستقل",
      ],
    },
    section4: {
      title: "4. حذف البيانات",
      desc: "يمكنك طلب حذف بيانات حسابك في أي وقت:",
      items: [
        "من الإعدادات: Dashboard → Settings → Delete Account",
        "أو عبر البريد: contact@wakil.ma",
        "يتم حذف بيانات الحساب النشطة عند تنفيذ الطلب، وقد تبقى نسخ تقنية مؤقتة في النسخ الاحتياطية أو السجلات حسب مزود الاستضافة",
      ],
    },
    contact: {
      title: "للتواصل بخصوص الخصوصية",
      desc: "إذا كان لديك أي سؤال حول سياسة الخصوصية:",
      email: "contact@wakil.ma",
    },
    footer: "جميع الحقوق محفوظة",
  },
  fr: {
    back: "Retour",
    title: "Politique de confidentialite",
    lastUpdate: "Derniere mise a jour: 13 mai 2026",
    section1: {
      title: "1. Donnees collectees",
      desc: "Nous collectons les donnees necessaires pour faire fonctionner Wakil.ma et ameliorer la vente sur WhatsApp:",
      items: [
        { label: "Informations du compte", text: "nom, email, numero de telephone et nom de boutique" },
        { label: "Conversations clients", text: "messages WhatsApp entrants et sortants, ainsi que les medias associes" },
        { label: "Donnees de vente", text: "produits, commandes, clients, statuts de livraison et statistiques" },
        { label: "Parametres boutique", text: "configuration de l'agent, templates de messages et donnees WhatsApp Cloud API" },
      ],
    },
    section2: {
      title: "2. Utilisation des donnees",
      items: [
        "Faire fonctionner l'agent de vente IA selon les parametres de votre boutique",
        "Creer les commandes, gerer les clients, la livraison, les campagnes et les analytics",
        "Envoyer les notifications liees aux commandes, aux statuts et au compte",
        "Ameliorer la stabilite de la plateforme et la qualite du service",
      ],
    },
    section3: {
      title: "3. Protection des donnees et prestataires",
      desc: "Nous appliquons des controles pratiques de securite et utilisons les prestataires necessaires au fonctionnement du service:",
      items: [
        "Les donnees sont transmises via HTTPS/TLS lorsque l'hebergement est configure correctement",
        "Nous utilisons des prestataires comme Meta WhatsApp, OpenAI, Cloudinary, l'email, l'hebergement et la base de donnees pour fournir le service",
        "Nous ne vendons pas vos donnees et ne les partageons que lorsque c'est necessaire au service ou requis par la loi",
        "Le token WhatsApp est stocke dans la base de donnees de l'application avec acces restreint; nous ne le presentons pas comme chiffre par une couche applicative dediee",
      ],
    },
    section4: {
      title: "4. Suppression des donnees",
      desc: "Vous pouvez demander la suppression de vos donnees a tout moment:",
      items: [
        "Depuis les parametres: Dashboard → Settings → Delete Account",
        "Ou par email: contact@wakil.ma",
        "Les donnees actives du compte sont supprimees lors de la demande; certaines copies techniques peuvent rester temporairement dans les sauvegardes ou journaux selon le prestataire",
      ],
    },
    contact: {
      title: "Contact concernant la confidentialite",
      desc: "Si vous avez des questions sur notre politique de confidentialite:",
      email: "contact@wakil.ma",
    },
    footer: "Tous droits reserves",
  },
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-brand-600 mt-0.5">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPage() {
  const { language } = useLanguage()
  const t = language === "fr" ? translations.fr : translations.ar
  const isRTL = language === "ar"

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.lastUpdate}</p>
        </div>

        <div className="space-y-8">
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Lock size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t.section1.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.section1.desc}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {t.section1.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-600 mt-0.5">•</span>
                  <span>
                    <strong>{item.label}:</strong> {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Eye size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t.section2.title}</h2>
            </div>
            <BulletList items={t.section2.items} />
          </section>

          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Lock size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t.section3.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t.section3.desc}</p>
            <BulletList items={t.section3.items} />
          </section>

          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Trash2 size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t.section4.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t.section4.desc}</p>
            <BulletList items={t.section4.items} />
          </section>

          <section className="bg-brand-600 text-white rounded-xl p-6">
            <h2 className="text-lg font-bold mb-2">{t.contact.title}</h2>
            <p className="text-sm text-white/80 mb-4">{t.contact.desc}</p>
            <a
              href={`mailto:${t.contact.email}`}
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {t.contact.email}
            </a>
          </section>
        </div>

      </main>

      <PublicFooter />
    </div>
  )
}
