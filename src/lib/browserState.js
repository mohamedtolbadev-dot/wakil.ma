"use client"

const THEME_EVENT = "salesbot:theme-change"
const LANGUAGE_EVENT = "salesbot:language-change"
const AUTH_EVENT = "salesbot:auth-change"

function subscribeToWindowEvents(callback, events) {
  if (typeof window === "undefined") return () => {}

  const handler = () => callback()

  for (const eventName of events) {
    window.addEventListener(eventName, handler)
  }

  return () => {
    for (const eventName of events) {
      window.removeEventListener(eventName, handler)
    }
  }
}

export function readThemeSnapshot() {
  if (typeof window === "undefined") return "light"

  const savedTheme = localStorage.getItem("theme")

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function subscribeTheme(callback) {
  return subscribeToWindowEvents(callback, ["storage", THEME_EVENT])
}

export function syncThemeDocument(theme) {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export function updateThemePreference(theme) {
  if (theme !== "light" && theme !== "dark") return
  if (typeof window === "undefined") return

  localStorage.setItem("theme", theme)
  syncThemeDocument(theme)
  window.dispatchEvent(new Event(THEME_EVENT))
}

export function readLanguageSnapshot() {
  if (typeof window === "undefined") return "fr"

  const storedLanguage = localStorage.getItem("salesbot_lang")
  if (storedLanguage === "ar" || storedLanguage === "fr") return storedLanguage

  const cookieLanguage = document.cookie
    .split("; ")
    .find((row) => row.startsWith("salesbot_lang="))
    ?.split("=")[1]

  return cookieLanguage === "ar" || cookieLanguage === "fr" ? cookieLanguage : "fr"
}

export function subscribeLanguage(callback) {
  return subscribeToWindowEvents(callback, ["storage", LANGUAGE_EVENT])
}

export function syncLanguageCookie(language) {
  if (language !== "fr" && language !== "ar") return
  if (typeof document === "undefined") return

  document.cookie = `salesbot_lang=${language}; path=/; max-age=31536000; SameSite=Lax`
}

export function updateLanguagePreference(language) {
  if (language !== "fr" && language !== "ar") return
  if (typeof window === "undefined") return

  localStorage.setItem("salesbot_lang", language)
  syncLanguageCookie(language)
  window.dispatchEvent(new Event(LANGUAGE_EVENT))
}

export function readAuthStatusSnapshot() {
  if (typeof window === "undefined") return "loading"

  const token = localStorage.getItem("token")
  const user = localStorage.getItem("user")
  return token && user ? "auth" : "unauth"
}

export function readIsLoggedInSnapshot() {
  if (typeof window === "undefined") return false
  return Boolean(localStorage.getItem("token"))
}

export function readUserSnapshot() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("user")
}

export function subscribeAuth(callback) {
  return subscribeToWindowEvents(callback, ["storage", "focus", AUTH_EVENT])
}

export function notifyAuthChange() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(AUTH_EVENT))
}
