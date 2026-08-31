"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MobileMenuProvider } from "@/contexts/MobileMenuContext"
import { Sidebar, MobileNav } from "@/components/dashboard/Sidebar"
import { TopBar } from "@/components/dashboard/TopBar"
import { useLanguage } from "@/contexts/LanguageContext"

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const [status, setStatus] = useState("loading")
  const { dir } = useLanguage()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const user  = localStorage.getItem("user")

    if (!token || !user) {
      router.push("/login")
      setStatus("unauth")
    } else {
      setStatus("auth")
    }
  }, [router])

  if (status === "unauth") return null

  return (
    <MobileMenuProvider>
      <div className="flex h-screen overflow-hidden bg-background" dir={dir}>

        {/* Sidebar — desktop */}
        <Sidebar />

        {/* Main column */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-secondary/20 pb-20 md:pb-6 dashboard-content">
            <div className="w-full px-3 md:px-6 pt-3 md:pt-5">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Drawer */}
        <MobileNav />

      </div>
    </MobileMenuProvider>
  )
}