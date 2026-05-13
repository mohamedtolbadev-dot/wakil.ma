import { getPageMetadata } from "@/lib/metadata"

export const metadata = getPageMetadata("admin", "fr")

export default function AdminLayout({ children }) {
  return children
}
