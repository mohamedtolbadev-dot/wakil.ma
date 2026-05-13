"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

const MobileMenuContext = createContext({
  isOpen: false,
  open: () => {},
  close: () => {},
})

export function MobileMenuProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const value = useMemo(() => ({
    isOpen,
    open,
    close,
  }), [isOpen, open, close])

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  )
}

export const useMobileMenu = () => useContext(MobileMenuContext)
