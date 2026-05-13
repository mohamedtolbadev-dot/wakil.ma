import { getPageMetadata } from "@/lib/metadata"

export const metadata = getPageMetadata("invoices", "fr")

export default function InvoicesLayout({ children }) {
  return children
}
