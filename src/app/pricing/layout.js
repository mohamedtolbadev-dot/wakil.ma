import { getPageMetadata } from "@/lib/metadata"

export async function generateMetadata() {
  return getPageMetadata("pricing", "fr")
}

export default function PricingLayout({ children }) {
  return children
}
