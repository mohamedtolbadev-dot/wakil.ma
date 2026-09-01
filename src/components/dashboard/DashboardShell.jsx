"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { MobileMenuProvider } from "@/contexts/MobileMenuContext"
import { Sidebar, MobileNav } from "@/components/dashboard/Sidebar"
import { TopBar } from "@/components/dashboard/TopBar"
import { readAuthStatusSnapshot, subscribeAuth } from "@/lib/browserState"
import { useLanguage } from "@/contexts/LanguageContext"
import fetchAPI from "@/lib/api"

export function DashboardShell({ children }) {
  const router = useRouter()
  const status = useSyncExternalStore(subscribeAuth, readAuthStatusSnapshot, () => "loading")
  const { dir } = useLanguage()
  const checkedOnboarding = useRef(false)

  useEffect(() => {
    if (status === "unauth") {
      router.replace("/login")
    }
  }, [router, status])

  useEffect(() => {
    if (status !== "auth" || checkedOnboarding.current) return
    checkedOnboarding.current = true

    if (typeof window !== "undefined" && sessionStorage.getItem("onboardingSkipped") === "1") {
      return
    }

    fetchAPI("/api/onboarding/status")
      .then((res) => {
        if (res?.data && !res.data.completed) {
          router.replace("/onboarding")
        }
      })
      .catch(() => {})
  }, [router, status])

  if (status !== "auth") return null

  return (
    <MobileMenuProvider>
      <div className="dashboard-layout flex h-screen overflow-hidden bg-background text-foreground" dir={dir}>
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-secondary/20 dark:bg-background pb-20 md:pb-6">
            <div className="w-full px-3 md:px-6 pt-3 md:pt-5">
              {children}
            </div>
          </main>
        </div>
        <MobileNav />
      </div>
    </MobileMenuProvider>
  )
}
