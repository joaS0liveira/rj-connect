"use client"

import { useMemo, useState } from "react"
import { PortugalMap } from "@/components/map/app"
import { Segmented } from "@/components/map/filters"
import { PageTitle } from "@/components/site-header"
import { GroupPlan } from "@/components/map/group-plan"
import { ReturnTrip } from "@/components/map/return-trip"
import { cellOf, type Analysis } from "@/lib/map/analysis"
import { ENTITY_IDS, PLACES, type EntityId } from "@/lib/map/places"

/**
 * Integrar+: the team's tool to keep people in work and bring back those who
 * left, for one person or a whole group, in any region.
 */
export function ReturnSection({ analysis }: { analysis: Analysis }) {
  // Lisbon first: it is where most exits come from.
  const [id, setId] = useState<EntityId>("E03")
  const [mode, setMode] = useState<"one" | "group">("one")
  const [hovered, setHovered] = useState<EntityId | null>(null)
  // Where the company being chosen is: the map draws the trip there.
  const [route, setRoute] = useState<EntityId | null>(null)
  const rates = useMemo(
    () =>
      Object.fromEntries(
        ENTITY_IDS.map((r) => {
          const { placed, stayed } = cellOf(analysis[r], 6, "all")
          return [r, placed ? stayed / placed : null]
        })
      ) as Record<EntityId, number | null>,
    [analysis]
  )

  function choose(next: EntityId) {
    setId(next)
    setRoute(null)
  }

  return (
    <section>
      <PageTitle
        title="Integrar+"
        lead="A nossa resposta ao problema das empresas: as pessoas são colocadas mas não ficam. Prepara o regresso de quem saiu e protege quem está em risco, uma pessoa ou um grupo de cada vez."
      />

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="order-2 lg:sticky lg:top-4 lg:order-1 print:hidden">
          <PortugalMap
            choice={id}
            hovered={hovered}
            route={route}
            rates={rates}
            onHover={setHovered}
            onChoose={choose}
          />
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Clica numa região para a escolher. A seta mostra a viagem até à
            empresa.
          </p>
        </div>
        <div className="order-1 min-w-0 lg:order-2">
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <label className="flex items-center gap-3 text-sm">
              Região
              <select
                className="min-h-10 rounded border bg-card px-3"
                value={id}
                onChange={(e) => choose(e.target.value as EntityId)}
              >
                {ENTITY_IDS.map((r) => (
                  <option key={r} value={r}>
                    {PLACES[r].name}
                  </option>
                ))}
              </select>
            </label>
            <Segmented
              compact
              label="Para quem"
              options={[
                { value: "one", label: "Uma pessoa" },
                { value: "group", label: "Um grupo" },
              ]}
              value={mode}
              onChange={setMode}
            />
          </div>

          <div className="mt-5 rounded-2xl border bg-card p-4 sm:p-6">
            {mode === "one" ? (
              <ReturnTrip
                key={id}
                id={id}
                region={analysis[id]}
                onRoute={setRoute}
                companyMap={
                  <PortugalMap
                    compact
                    choice={id}
                    hovered={null}
                    route={route}
                    rates={rates}
                    onHover={() => {}}
                    onChoose={choose}
                  />
                }
              />
            ) : (
              <GroupPlan
                key={id}
                id={id}
                region={analysis[id]}
                onRoute={setRoute}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
