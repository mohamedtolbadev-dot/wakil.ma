"use client"

import Link from "next/link"
import Image from "next/image"
import { useAppTheme } from "@/hooks/useAppTheme"

export function Logo({ href = "/" }) {
  const { isDark } = useAppTheme()

  return (
    <Link href={href} dir="ltr" className="flex items-center">
      <Image
        src={isDark ? "/logo/wakil-logo-dark.svg" : "/logo/wakil-logo-light.svg"}
        alt="wakil.ma"
        width={168}
        height={38}
        className="h-7 w-auto sm:h-8 md:h-9"
        priority
        loading="eager"
      />
    </Link>
  )
}
