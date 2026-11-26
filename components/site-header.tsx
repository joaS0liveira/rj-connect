"use client"

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
