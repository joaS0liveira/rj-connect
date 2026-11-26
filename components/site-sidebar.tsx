"use client"

import {
  ChartBar,
  ListChecks,
  MapTrifold,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/fica/theme-toggle"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"

const PAGES: { href: string; label: string; icon: Icon }[] = [
  { href: "/", label: "Mapa", icon: MapTrifold },
  { href: "/painel", label: "Painel", icon: ChartBar },
  { href: "/integrar", label: "Integrar+", icon: UsersThree },
  { href: "/plano-de-acao", label: "Plano", icon: ListChecks },
]

/**
 * The app's menu. A column down the side on wide screens. On a phone the
 * logo stays at the top and the pages become a tab bar along the bottom,
 * within reach of the thumb, with all four always in view.
 */
export function SiteSidebar() {
  const pathname = usePathname()
  return (
    <aside className="z-20 border-b bg-card lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:flex-none lg:flex-col lg:border-e lg:border-b-0 print:hidden">
      <div className="flex items-center gap-x-4 px-4 py-1.5 lg:flex-1 lg:flex-col lg:items-stretch lg:gap-6 lg:px-4 lg:py-6">
        <Link
          href="/"
          aria-label="RJ.connect, página inicial"
          className="inline-flex items-center gap-1"
        >
          <Logo className="size-10 lg:size-14" />
          <span
            aria-hidden="true"
            className="font-heading text-xl font-bold tracking-tight lg:text-2xl"
          >
            <span className="text-highlight">.</span>connect
          </span>
        </Link>
        <nav
          aria-label="Páginas"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(0_0_0/0.06)] lg:static lg:flex lg:flex-col lg:gap-1 lg:border-0 lg:bg-transparent lg:pb-0 lg:shadow-none"
        >
          {PAGES.map(({ href, label, icon: PageIcon }) => {
            const current = pathname === href
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-[3px] text-[11px] font-semibold tracking-wide uppercase transition-colors",
                  "lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:border-s-4 lg:border-t-0 lg:px-3 lg:text-base",
                  "font-[family-name:var(--font-title)]",
                  current
                    ? "border-highlight text-foreground lg:bg-accent"
                    : "border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <PageIcon
                  weight={current ? "fill" : "regular"}
                  className="size-5 flex-none"
                  aria-hidden="true"
                />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="ms-auto flex items-center gap-2 lg:ms-0 lg:mt-auto lg:flex-col lg:items-stretch">
          <ThemeToggle className="lg:w-full" compact />
          <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline lg:order-last lg:px-3">
            Dados atualizados a 31/12/2025
          </span>
        </div>
      </div>
    </aside>
  )
}
