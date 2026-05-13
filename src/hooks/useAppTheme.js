"use client"

import { useEffect, useSyncExternalStore } from "react"
import {
  readThemeSnapshot,
  subscribeTheme,
  syncThemeDocument,
  updateThemePreference,
} from "@/lib/browserState"

export function useAppTheme() {
  const theme = useSyncExternalStore(subscribeTheme, readThemeSnapshot, () => "light")

  useEffect(() => {
    syncThemeDocument(theme)
  }, [theme])

  function toggleTheme() {
    updateThemePreference(theme === "dark" ? "light" : "dark")
  }

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
  }
}
