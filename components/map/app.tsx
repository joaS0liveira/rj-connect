"use client"

import { useRef, useState } from "react"
import { Dashboard, type Choice, type Tab } from "@/components/map/dashboard"
import { Filters, type FilterState } from "@/components/map/filters"
import { Overview } from "@/components/map/overview"
import { PageTitle, SiteFooter, SiteHeader } from "@/components/site-header"
import { percent } from "@/lib/fica/format"
import { cellOf, type Analysis } from "@/lib/map/analysis"
import { ENTITY_IDS, PLACES, type EntityId } from "@/lib/map/places"
import { MAP_VIEW, SHAPES } from "@/lib/map/shapes"
import { cn } from "@/lib/utils"

/**
 * Where each region's name sits on the map, found so that the name and the
 * percentage fit inside the border. Narrow regions use smaller text; the
 * Algarve, low and wide, puts both on one line.
 */
const LABELS: Record<EntityId, [number, number]> = {
  E05: [139, 109],
  E01: [230, 122],
  E02: [184, 237],
  E03: [122, 365],
  E04: [132.5, 439],
  E06: [200, 373],
  E07: [155.5, 546],
  E08: [298, 521],
}
const LABEL_SIZE: Partial<Record<EntityId, { name: number; value: number }>> = {
  E05: { name: 10, value: 11 },
  E04: { name: 9, value: 10 },
  E07: { name: 10, value: 11 },
}
const INLINE: EntityId[] = ["E07"]

/** Drawn as an inset, like on most maps of Portugal. Not to scale. */
const ISLANDS = [
  [264, 496, 3],
  [272, 490, 2.5],
  [284, 499, 3],
  [290, 493, 3],
  [296, 501, 4],
  [305, 495, 3.5],
  [321, 504, 4.5],
  [327, 512, 2],
  [296, 546, 6],
  [305, 547, 5],
  [320, 538, 3],
]

export function MapApp({ analysis }: { analysis: Analysis }) {
  const [choice, setChoice] = useState<Choice>("all")
  // Kept here so that changing region or tab keeps the same filters and view.
  const [filters, setFilters] = useState<FilterState>({
    months: 6,
    contract: "all",
  })
  const [tab, setTab] = useState<Tab>("results")
  const [hovered, setHovered] = useState<EntityId | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const open = detailsOpen && choice !== "all"
  const displayed = open ? choice : (hovered ?? choice)
  const panel = useRef<HTMLElement>(null)
  // Where the company chosen in "Voltar ao trabalho" is.
  const [route, setRoute] = useState<EntityId | null>(null)
  const rates = Object.fromEntries(
    ENTITY_IDS.map((id) => {
      const { placed, stayed } = cellOf(
        analysis[id],
        filters.months,
        filters.contract
      )
      return [id, placed ? stayed / placed : null]
    })
  ) as Record<EntityId, number | null>

  function choose(id: Choice) {
    setChoice(id)
    setHovered(null)
    setDetailsOpen(id !== "all")
    setTab("results")
    if (id !== choice) setRoute(null)
    // On a phone the map sits below the panel: bring the panel into view.
    if (id !== "all" && window.matchMedia("(max-width: 1023px)").matches)
      requestAnimationFrame(() =>
        panel.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        })
      )
  }

  function changeFilters(change: Partial<FilterState>) {
    setFilters((current) => ({ ...current, ...change }))
  }

  return (
    <div className="rj-page rj-report mx-auto flex min-h-dvh max-w-7xl flex-col px-4 py-4 sm:px-8 sm:py-6">
      <SiteHeader />

      <main className="flex-1">
        <div className="rj-toolbar">
          <PageTitle title="Permanência no emprego" />
          <Filters value={filters} onChange={changeFilters} compact />
        </div>
        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="order-2 lg:sticky lg:top-4 lg:order-1">
            <PortugalMap
              choice={open ? choice : displayed}
              hovered={hovered}
              route={displayed === choice ? route : null}
              rates={rates}
              onHover={setHovered}
              onChoose={choose}
            />
          </div>
          <section
            ref={panel}
            aria-label="Resultado da seleção"
            className="order-1 min-w-0 scroll-mt-2 lg:order-2"
          >
            <label className="mb-3 flex items-center gap-3 text-sm">
              Região
              <select
                className="rounded border bg-card px-3 py-2"
                value={choice}
                onChange={(e) => choose(e.target.value as Choice)}
              >
                <option value="all">Todas as regiões</option>
                {ENTITY_IDS.map((id) => (
                  <option key={id} value={id}>
                    {PLACES[id].name}
                  </option>
                ))}
              </select>
            </label>
            {open ? (
              <div className="rj-cut p-5 sm:p-7">
                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  className="min-h-10 text-sm underline underline-offset-4"
                >
                  ← Voltar ao gráfico
                </button>
                <Dashboard
                  choice={choice}
                  region={analysis[choice]}
                  filters={filters}
                  tab={tab}
                  onTab={setTab}
                  onRoute={setRoute}
                />
              </div>
            ) : (
              <Overview
                analysis={analysis}
                filters={filters}
                shown={displayed === "all" ? null : displayed}
              />
            )}
          </section>
        </div>
      </main>

      <SiteFooter>
        <details>
          <summary className="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4">
            De onde vêm estes números?
          </summary>
          <p className="max-w-2xl pb-4 leading-relaxed">
            Cada região é uma entidade social do programa. Os limites no mapa
            foram desenhados por nós, porque os dados não os têm. Em cada
            período só entram colocações com esse tempo de observação até
            31/12/2025, e ficam de fora 46 que acabam antes de começar. Cada
            pessoa tem no máximo uma colocação. Sair conta qualquer motivo,
            mesmo mudar para outro emprego. A região selecionada aparece a
            turquesa.
          </p>
        </details>
      </SiteFooter>
    </div>
  )
}

export function PortugalMap({
  choice,
  hovered,
  route,
  rates,
  onHover,
  onChoose,
  compact = false,
}: {
  choice: Choice
  hovered: EntityId | null
  route: EntityId | null
  rates: Record<EntityId, number | null>
  onHover: (id: EntityId | null) => void
  onChoose: (id: EntityId) => void
  /** A small map, for showing the trip on a phone. */
  compact?: boolean
}) {
  const [x, y, , height] = MAP_VIEW.split(" ").map(Number)

  const interactive = (id: EntityId) => ({
    role: "button",
    tabIndex: 0,
    "aria-label": `${PLACES[id].name}: ${label(id)}`,
    "aria-pressed": choice === id,
    onClick: () => onChoose(id),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return
      e.preventDefault()
      onChoose(id)
    },
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") onHover(id)
    },
    onPointerLeave: () => onHover(null),
    onFocus: () => onHover(id),
    onBlur: () => onHover(null),
  })
  const fill = (id: EntityId) =>
    id === choice ? "var(--rj-turquoise)" : "var(--rj-region)"
  const label = (id: EntityId) =>
    rates[id] === null ? "—" : percent(rates[id]!)
  const showRate = (id: EntityId) => id === hovered || id === choice

  return (
    <div>
      <div className="py-2">
        <svg
          viewBox={`${x} ${y} 296 ${height + 12}`}
          role="group"
          aria-label="Mapa de Portugal por regiões"
          className={cn(
            "mx-auto block w-full touch-manipulation",
            compact ? "h-72" : "h-[58dvh] max-h-[640px] min-h-80 md:h-[70dvh]"
          )}
        >
          <g
            transform="translate(9 9)"
            className="fill-foreground/10"
            aria-hidden="true"
          >
            {SHAPES.map((s) => (
              <path key={s.id} d={s.d} />
            ))}
          </g>
          {/* Keeps the shadow from showing through the faded regions. */}
          <g className="fill-background" aria-hidden="true">
            {SHAPES.map((s) => (
              <path key={s.id} d={s.d} />
            ))}
          </g>
          {SHAPES.map((s) => (
            <path
              key={s.id}
              d={s.d}
              {...interactive(s.id)}
              fill={fill(s.id)}
              strokeWidth={1.4}
              className="cursor-pointer stroke-card outline-none motion-safe:transition-[fill] motion-safe:duration-500"
              strokeLinejoin="round"
            />
          ))}
          <g {...interactive("E08")} className="cursor-pointer outline-none">
            <rect
              x={256}
              y={482}
              width={84}
              height={76}
              rx={8}
              className={cn(
                "fill-card stroke-border",
                (hovered === "E08" || choice === "E08") &&
                  "stroke-foreground stroke-2"
              )}
            />
            {ISLANDS.map(([cx, cy, r]) => (
              <circle
                key={`${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={r}
                fill={fill("E08")}
                className="motion-safe:transition-[fill] motion-safe:duration-500"
              />
            ))}
          </g>
          {(() => {
            // The chosen region floats: a soft shadow stays on the map and a
            // copy of the region rises above it. Keyed by region, so it lifts
            // again every time the choice changes.
            const shape = SHAPES.find((s) => s.id === choice)
            return (
              shape && (
                <g key={shape.id} className="pointer-events-none">
                  <path
                    d={shape.d}
                    className="rj-lift-shadow fill-foreground/25"
                  />
                  <g className="rj-lift">
                    <path
                      d={shape.d}
                      fill={fill(shape.id)}
                      className="stroke-foreground"
                      strokeWidth={2.8}
                      strokeLinejoin="round"
                    />
                  </g>
                </g>
              )
            )
          })()}
          {hovered && hovered !== choice && (
            <path
              d={SHAPES.find((s) => s.id === hovered)?.d}
              className="pointer-events-none fill-none stroke-foreground"
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          )}
          {choice !== "all" && route && (
            <Route from={LABELS[choice]} to={LABELS[route]} />
          )}
          {ENTITY_IDS.map((id) => (
            <text
              key={id}
              x={LABELS[id][0]}
              y={LABELS[id][1]}
              textAnchor="middle"
              fontSize={LABEL_SIZE[id]?.name ?? 11}
              fontWeight={choice === id ? 800 : 600}
              aria-hidden="true"
              className={cn(
                "pointer-events-none",
                choice === id && id !== "E08" && "rj-lift"
              )}
              // A halo in the region colour keeps the text clear of borders.
              stroke={id === "E08" ? "var(--background)" : fill(id)}
              strokeWidth={3}
              strokeLinejoin="round"
              paintOrder="stroke"
              fill={id === "E08" ? "var(--foreground)" : "var(--rj-navy)"}
            >
              {PLACES[id].name}
              <tspan
                x={INLINE.includes(id) ? undefined : LABELS[id][0]}
                dx={INLINE.includes(id) ? 4 : undefined}
                dy={INLINE.includes(id) ? 0 : (LABEL_SIZE[id]?.value ?? 13)}
                fontSize={LABEL_SIZE[id]?.value ?? 13}
                fontWeight={700}
                className="tabular-nums"
              >
                {showRate(id) ? label(id) : ""}
              </tspan>
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}

/** From the region to where the company is. A pin alone when it is the same place. */
function Route({ from, to }: { from: [number, number]; to: [number, number] }) {
  const [x1, y1] = [from[0], from[1] - 14]
  const [x2, y2] = [to[0], to[1] - 14]
  const same = x1 === x2 && y1 === y2
  const bend = Math.max(Math.abs(y2 - y1), 40) * 0.35
  return (
    <g aria-hidden="true" className="pointer-events-none">
      {!same && (
        <path
          d={`M${x1} ${y1} Q${(x1 + x2) / 2 + bend} ${(y1 + y2) / 2} ${x2} ${y2}`}
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="route-dash stroke-foreground"
        />
      )}
      <circle cx={x2} cy={y2} r={9} className="route-pulse fill-primary/30" />
      <path
        d={`M${x2} ${y2 + 1}c-4-5-6-8-6-11a6 6 0 0 1 12 0c0 3-2 6-6 11z`}
        className="fill-primary stroke-card"
        strokeWidth={1.5}
      />
      <circle cx={x2} cy={y2 - 10} r={2.2} className="fill-card" />
    </g>
  )
}
