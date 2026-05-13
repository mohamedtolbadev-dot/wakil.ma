import { getPageMetadata } from "@/lib/metadata"

export const metadata = getPageMetadata("adminBlogs", "fr")

export default function AdminBlogsLayout({ children }) {
  return children
}
