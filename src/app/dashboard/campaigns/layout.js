import { getPageMetadata } from "@/lib/metadata"

export const metadata = getPageMetadata("campaigns", "fr")

export default function CampaignsLayout({ children }) {
  return children
}
