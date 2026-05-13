"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { syncLanguageCookie } from "@/lib/browserState"

export function BlogLanguageRefresh({ initialLanguage }) {
  const router = useRouter()
  const { language } = useLanguage()

  useEffect(() => {
    if (language !== initialLanguage) {
      syncLanguageCookie(language)
      router.refresh()
    }
  }, [initialLanguage, language, router])

  return null
}
