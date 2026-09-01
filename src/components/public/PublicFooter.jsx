"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mail, MessageCircle } from "lucide-react"
import { Logo } from "@/components/shared/Logo"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppTheme } from "@/hooks/useAppTheme"

function FooterLink({ href, children, className = "" }) {
  if (href.startsWith("mailto:") || href.startsWith("http")) {
    return (
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className={className}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

export function PublicFooter() {
  const pathname = usePathname() || "/"
  const { language, t, isRTL } = useLanguage()
  const { isDark } = useAppTheme()
  const currentYear = new Date().getFullYear()

  const anchorPrefix = pathname === "/" ? "" : "/"
  const copy =
    language === "ar"
      ? {
          description: "وكيل مبيعات ذكي على واتساب للمتاجر المغربية: محادثات، طلبات، زبائن، حملات وتتبع في منصة واحدة.",
          platform: "المنصة",
          support: "الدعم",
          deleteData: "حذف البيانات",
          status: "النظام يعمل",
        }
      : {
          description: "Agent de vente intelligent sur WhatsApp pour les boutiques marocaines: conversations, commandes, clients, campagnes et suivi dans une seule plateforme.",
          platform: "Plateforme",
          support: "Support",
          deleteData: "Suppression des donnees",
          status: "Systeme operationnel",
        }

  const productLinks = [
    { href: "/features", label: t("land.nav_features"), active: pathname === "/features" },
    { href: `${anchorPrefix}#ai-agent`, label: t("land.nav_agent"), active: false },
    { href: "/pricing", label: t("landing.pricing"), active: pathname === "/pricing" },
    { href: "/blogs", label: t("land.nav_blog"), active: pathname.startsWith("/blogs") },
    { href: `${anchorPrefix}#faq`, label: t("land.nav_faq"), active: false },
  ]

  const supportLinks = [
    { href: "/terms", label: t("land.footer_terms"), active: pathname === "/terms" },
    { href: "/privacy", label: t("land.footer_privacy"), active: pathname === "/privacy" },
    { href: "/delete-data", label: copy.deleteData, active: pathname === "/delete-data" },
    { href: "mailto:contact@wakil.ma", label: t("land.footer_contact"), active: false },
  ]

  const linkClass = (active) =>
    `text-sm transition-colors duration-200 ${
      active
        ? "font-black text-brand-600"
        : isDark
          ? "font-bold text-white/55 hover:text-brand-300"
          : "font-bold text-slate-600 hover:text-brand-600"
    }`

  return (
    <footer
      dir={isRTL ? "rtl" : "ltr"}
      className={`border-t backdrop-blur-md transition-colors duration-300 ${
        isDark ? "border-white/10 bg-black/40" : "border-slate-200/70 bg-white/65"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className={`grid grid-cols-2 gap-7 sm:gap-8 lg:grid-cols-4 lg:gap-12 ${isRTL ? "text-right" : "text-left"}`}>
          <div className="col-span-2">
            <Logo />
            <p className={`mt-4 max-w-md text-sm leading-7 ${isDark ? "text-white/62" : "text-slate-600"}`}>
              {copy.description}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://wa.me/212612455372"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className={`grid h-10 w-10 place-items-center rounded-xl border transition ${
                  isDark
                    ? "border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
                    : "border-slate-200/80 bg-white text-brand-600 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                <MessageCircle size={18} />
              </a>
              <a
                href="mailto:contact@wakil.ma"
                aria-label="Email"
                className={`grid h-10 w-10 place-items-center rounded-xl border transition ${
                  isDark
                    ? "border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
                    : "border-slate-200/80 bg-white text-brand-600 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className={`mb-4 text-sm font-black uppercase ${isDark ? "text-white/80" : "text-brand-800"}`}>
              {copy.platform}
            </h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} className={linkClass(link.active)}>
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`mb-4 text-sm font-black uppercase ${isDark ? "text-white/80" : "text-brand-800"}`}>
              {copy.support}
            </h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} className={linkClass(link.active)}>
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={`border-t ${isDark ? "border-white/10 bg-black/20" : "border-slate-200/70 bg-white/45"}`}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-5 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className={`text-xs ${isDark ? "text-white/40" : "text-slate-500"}`}>
            © {currentYear} wakil.ma - {t("land.footer_copy")}
          </p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${
              isDark ? "border-white/15 bg-white/10" : "border-slate-200/80 bg-white/80"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className={`text-xs font-bold ${isDark ? "text-white/70" : "text-brand-700"}`}>
              {copy.status}
            </span>
          </span>
        </div>
      </div>
    </footer>
  )
}
