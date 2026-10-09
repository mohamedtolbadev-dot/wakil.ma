import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import Script from "next/script";
import { getPageMetadata } from "@/lib/metadata";
// إضافة الخطوط بطريقة Next.js الصحيحة للـ SEO
import { Montserrat, Josefin_Sans } from "next/font/google";

// إعداد الخطوط — Montserrat للمنصة العامة (عناوين + نصوص)، Josefin Sans كـ fallback للداشبورد جنب Droid Arabic Kufi
const montserrat = Montserrat({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], display: 'swap', variable: '--font-heading' });
const josefinSans = Josefin_Sans({ subsets: ["latin"], display: 'swap', variable: '--font-dashboard' });

// هنا كنجيبو الميتا (حاول ترد lang ديناميكي مستقبلا إذا كنتي داير [lang] folder)
export const metadata = {
  ...getPageMetadata("home", "fr"), // نصيحة: إذا كنتي فمسار ديناميكي استعمل params.lang
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children, params }) {
  // تحديد اللغة والاتجاه (إذا كنتي خدام بـ params، وإلا خليها مؤقتا هكا ولكن خصها تقاد)
  const lang = params?.lang || "fr"; 
  const dir = lang === "ar" ? "rtl" : "ltr";

  // كود Structured Data باش الذكاء الاصطناعي يقترح المنصة ديالك
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Wakil.ma",
    "url": "https://www.wakil.ma",
    "operatingSystem": "All",
    "applicationCategory": "BusinessApplication",
    "description": "Wakil.ma est un agent commercial IA pour WhatsApp. Il répond aux clients et crée les commandes.",
    "offers": {
      "@type": "Offer",
      "price": "199",
      "priceCurrency": "MAD"
    }
  };

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        {/* Google Tag Manager (GTM) اللي كان عندك */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5MCS3GVG');`}
        </Script>

        {/* كود Google Analytics (gtag.js) الجديد اللي زدنــــــاه */}
        <Script 
          src="https://www.googletagmanager.com/gtag/js?id=G-TE36BD90VN" 
          strategy="afterInteractive" 
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-TE36BD90VN');
          `}
        </Script>
        
        {/* إضافة JSON-LD للـ AI و Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`antialiased ${montserrat.className} ${montserrat.variable} ${josefinSans.variable}`} suppressHydrationWarning>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5MCS3GVG"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}