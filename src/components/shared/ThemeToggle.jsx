"use client"

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { updateThemePreference } from "@/lib/browserState"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark"
    setTheme(nextTheme)
    updateThemePreference(nextTheme)
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-transparent hover:border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  )
}
