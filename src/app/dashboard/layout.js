import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { getPageMetadata } from "@/lib/metadata"

export const metadata = getPageMetadata("dashboard", "fr")

export default function DashboardLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>
}
