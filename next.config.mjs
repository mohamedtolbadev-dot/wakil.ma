/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-XSS-Protection",          value: "1; mode=block" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=*, geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]

const nextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pdfkit/js/data/**/*",
    ],
    "/api/invoices/[id]/pdf": [
      "./node_modules/pdfkit/js/data/**/*",
    ],
    "/api/public/invoices/[id]/pdf": [
      "./node_modules/pdfkit/js/data/**/*",
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
  // إضافة التوجيه الإجباري (301 Redirect) لحل مشكل تشتت الدومين في SEO
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'wakil.ma',
          },
        ],
        destination: 'https://www.wakil.ma/:path*',
        permanent: true, // مهمة جدا لجوجل باش يعرف بلي التغيير دائم
      },
    ];
  },
};

export default nextConfig;