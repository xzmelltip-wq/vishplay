"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  clickable?: boolean
}

export function Logo({ size = "md", clickable = false }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-5xl"
  }

  const content = (
    <span 
      className={cn(
        "font-[var(--font-display)] font-bold tracking-wider text-foreground transition-all duration-300",
        sizeClasses[size],
        clickable && "hover:text-primary cursor-pointer"
      )}
      style={{ fontFamily: "var(--font-display)" }}
    >
      vi<span className="text-primary">play</span>
    </span>
  )

  if (clickable) {
    return (
      <Link href="/" className="inline-block">
        {content}
      </Link>
    )
  }

  return content
}
