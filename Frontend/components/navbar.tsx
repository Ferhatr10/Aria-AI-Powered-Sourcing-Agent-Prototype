"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">Aria</span>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/upload"
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/upload"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              Upload
            </Link>
            <Link
              href="/search"
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/search"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              Discovery
            </Link>
            <Link
              href="/ingest"
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/ingest"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              Ingest
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

function Button({ className, variant, size, ...props }: any) {
  const variants: any = {
    ghost: "hover:bg-accent hover:text-accent-foreground",
  }
  const sizes: any = {
    sm: "h-8 px-3 text-xs",
  }
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${variants[variant || ""]} ${sizes[size || ""]} ${className}`}
      {...props}
    />
  )
}
