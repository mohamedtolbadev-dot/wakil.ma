"use client"

import { Scale, FileText, AlertTriangle, CheckCircle } from "lucide-react"
import { PublicFooter } from "@/components/public/PublicFooter"
import { PublicHeader } from "@/components/public/PublicHeader"
import { useLanguage } from "@/contexts/LanguageContext"

const translations = {
  ar: {
    back: "العودة",
    title: "شروط الاستخدام",
    lastUpdate: "آخر تحديث: 20 مارس 2025",
    section1: {
      title: "1. قبول الشروط",
      desc: "باستخدامك لـ wakil.ma، فإنك توافق على هذه الشروط والأحكام. إذا كنت لا توافق، يرجى عدم استخدام الخدمة."
    },
    section2: {
      title: "2. الخدمة",
      desc: "wakil.ma هي منصة تقدم:",
      items: [
        "وكيل مبيعات ذكي (AI) على واتساب",
        "إدارة المحادثات والعملاء",
        "تحليلات وإحصائيات المبيعات",
        "إدارة المنتجات"
      ]
    },
    section3: {
      title: "3. قواعد الاستخدام",
      desc: "يُمنع استخدام الخدمة للأغراض التالية:",
      items: [
        "إرسال رسائل غير مرغوب فيها (Spam)",
        "الاحتيال أو الخداع",
        "الأنشطة غير القانونية",
        "إساءة استخدام API أو محاولة اختراق النظام"
      ]
    },
    section4: {
      title: "4. المسؤولية",
      items: [
        "نحن غير مسؤولين عن محتوى المحادثات بينك وبين عملائك",
        "ردود AI هي توصيات، والمسؤولية النهائية على صاحب المتجر",
        "يجب الالتزام بشروط Meta (WhatsApp Business)"
      ]
    },
    section5: {
      title: "5. الاشتراكات والدفع",
      items: [
        "الخدمة تقدم باقات مجانية ومدفوعة",
        "يمكن إلغاء الاشتراك في أي وقت",
        "لا يوجد استرداد للمدفوعات السابقة"
      ]
    },
    section6: {
      title: "6. إنهاء الخدمة",
      desc: "نحتفظ بالحق في إنهاء حسابك في حال:",
      items: [
        "انتهاك شروط الاستخدام",
        "عدم الدفع (للباقات المدفوعة)",
        "إساءة استخدام النظام"
      ]
    },
    section7: {
      title: "7. التعديلات",
      desc: "نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إعلامك بأي تغييرات جوهرية عبر البريد الإلكتروني."
    },
    contact: {
      title: "للتواصل",
      desc: "إذا كان لديك أي استفسار حول الشروط:",
      email: "contact@wakil.ma"
    },
    footer: "جميع الحقوق محفوظة"
  },
  fr: {
    back: "Retour",
    title: "Conditions d'Utilisation",
    lastUpdate: "Dernière mise à jour: 20 Mars 2025",
    section1: {
      title: "1. Acceptation des conditions",
      desc: "En utilisant wakil.ma, vous acceptez ces termes et conditions. Si vous n'êtes pas d'accord, veuillez ne pas utiliser le service."
    },
    section2: {
      title: "2. Le Service",
      desc: "wakil.ma est une plateforme qui offre:",
      items: [
        "Agent de vente intelligent (AI) sur WhatsApp",
        "Gestion des conversations et clients",
        "Analyses et statistiques de ventes",
        "Gestion des produits"
      ]
    },
    section3: {
      title: "3. Règles d'utilisation",
      desc: "L'utilisation du service est interdite pour:",
      items: [
        "Envoi de messages indésirables (Spam)",
        "Fraude ou tromperie",
        "Activités illégales",
        "Abus de l'API ou tentative de piratage"
      ]
    },
    section4: {
      title: "4. Responsabilité",
      items: [
        "Nous ne sommes pas responsables du contenu des conversations entre vous et vos clients",
        "Les réponses AI sont des recommandations, la responsabilité finale incombe au propriétaire du magasin",
        "Vous devez respecter les conditions de Meta (WhatsApp Business)"
      ]
    },
    section5: {
      title: "5. Abonnements et Paiement",
      items: [
        "Le service propose des forfaits gratuits et payants",
        "L'abonnement peut être annulé à tout moment",
        "Aucun remboursement pour les paiements antérieurs"
      ]
    },
    section6: {
      title: "6. Résiliation",
      desc: "Nous nous réservons le droit de résilier votre compte si:",
      items: [
        "Violation des conditions d'utilisation",
        "Non-paiement (pour les forfaits payants)",
        "Abus du système"
      ]
    },
    section7: {
      title: "7. Modifications",
      desc: "Nous nous réservons le droit de modifier ces conditions à tout moment. Vous serez informé de tout changement substantiel par email."
    },
    contact: {
      title: "Contact",
      desc: "Si vous avez des questions sur les conditions:",
      email: "contact@wakil.ma"
    },
    footer: "Tous droits réservés"
  }
}

export default function TermsPage() {
  const { language } = useLanguage()
  const t = translations[language] || translations.ar
  const isRTL = language === "ar"
  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <PublicHeader />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <Scale size={32} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.lastUpdate}</p>
        </div>

        <div className="space-y-8">
          {/* Section 1 */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <FileText size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t.section1.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.section1.desc}</p>
          </section>

          {/* Section 2 */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <CheckCircle size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t.section2.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t.section2.desc}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {t.section2.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-600 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <AlertTriangle size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t.section3.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t.section3.desc}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {t.section3.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-600 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Scale size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t.section4.title}</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {t.section4.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-600 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 5 */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <FileText size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t.section5.title}</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {t.section5.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-600 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 6 */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <AlertTriangle size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t.section6.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.section6.desc}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {t.section6.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-brand-600 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 7 */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Scale size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t.section7.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.section7.desc}</p>
          </section>

          {/* Contact */}
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
