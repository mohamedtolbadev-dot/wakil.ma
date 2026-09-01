"use client"

import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext"

function DirectionSync() {
  const { isRTL, language } = useLanguage()
  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr"
    document.documentElement.lang = language === "ar" ? "ar" : "fr"
  }, [isRTL, language])
  return null
}

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <LanguageProvider>
          <DirectionSync />
          {children}
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
