"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/fica/theme-toggle"
import { Logo } from "@/components/logo"

const PAGES = [
  { href: "/", label: "Mapa" },
  { href: "/painel", label: "Painel" },
  { href: "/integrar", label: "Integrar+" },
  { href: "/plano-de-acao", label: "Plano" },
]

export function SiteHeader() {
  const pathname = usePathname()
  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b pb-3 sm:gap-x-8 print:hidden">
      <Link
        href="/"
        aria-label="RJ.connect, página inicial"
        className="inline-flex items-center gap-1"
      >
        <Logo />
        <span aria-hidden="true" className="text-2xl font-bold tracking-tight">
          <span className="text-highlight">.</span>connect
        </span>
      </Link>
      <nav
        aria-label="Páginas"
        className="order-last flex w-full gap-5 sm:order-none sm:w-auto sm:gap-6"
      >
        {PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            aria-current={pathname === p.href ? "page" : undefined}
            className="relative inline-flex min-h-11 items-center text-sm font-semibold tracking-wide text-muted-foreground uppercase transition-colors after:absolute after:inset-x-0 after:-bottom-3 after:h-[3px] after:bg-highlight after:opacity-0 hover:text-foreground aria-[current]:text-foreground aria-[current]:after:opacity-100"
          >
            {p.label}
          </Link>
        ))}
      </nav>
      <div className="ms-auto flex items-center gap-3">
        <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
          Dados atualizados a 31/12/2025
        </span>
        <ThemeToggle
          compact
          className="size-11 justify-center rounded-full px-0"
        />
      </div>
    </header>
  )
}

/** The opening of a page, set like a newspaper feature. */
export function PageTitle({
  title,
  lead,
  titleRef,
}: {
  title: React.ReactNode
  lead?: React.ReactNode
  titleRef?: React.Ref<HTMLHeadingElement>
}) {
  return (
    <div className="mt-5 max-w-4xl">
      <h1
        ref={titleRef}
        tabIndex={-1}
        className="text-3xl leading-tight font-semibold tracking-tight text-balance outline-none sm:text-4xl"
      >
        {title}
      </h1>
      {lead && (
        <p className="mt-1 max-w-3xl text-pretty text-muted-foreground">
          {lead}
        </p>
      )}
    </div>
  )
}

export function SiteFooter({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="mt-14 border-t pt-4 text-sm text-muted-foreground print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">{children}</div>
        <p className="font-heading text-base font-semibold text-foreground">
          RJ<span className="text-highlight">.</span>connect
        </p>
      </div>
      <p className="mt-2 text-xs">
        Dados do programa de janeiro de 2024 a dezembro de 2025, atualizados a
        31/12/2025, com nomes de empresas fictícios. Só chegam ao browser
        totais, nunca dados de pessoas.
      </p>
    </footer>
  )
}
