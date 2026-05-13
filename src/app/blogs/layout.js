import { generateMetadata } from "@/lib/metadata"

export const metadata = generateMetadata({
  title: "Blog WhatsApp Business et IA",
  description: "Guides Wakil.ma pour vendre sur WhatsApp, automatiser les commandes, gerer le CRM et optimiser la livraison au Maroc.",
  path: "/blogs",
})

export default function BlogsLayout({ children }) {
  return children
}
