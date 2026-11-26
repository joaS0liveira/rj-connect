"use client"

import { type FilterState } from "@/components/map/filters"
import { TickGauge } from "@/components/ui/tick-gauge"
import { integer, percent, points } from "@/lib/fica/format"
import { cellOf, type Analysis } from "@/lib/map/analysis"
import { ENTITY_IDS, PLACES, type EntityId } from "@/lib/map/places"

/**
 * The starting view: every region on the map, and the arc for the one under
 * the pointer, against the programme average. Clicking a region opens it.
 */
export function Overview({
  analysis,
  filters,
  shown,
}: {
  analysis: Analysis
  filters: FilterState
  shown: EntityId | null
}) {
  const rows = ENTITY_IDS.map((id) => {
    const { placed, stayed } = cellOf(
      analysis[id],
      filters.months,
      filters.contract
    )
    return { id, placed, stayed, rate: placed ? stayed / placed : 0 }
  })
  const active = rows.find((r) => r.id === shown)
  const totals = rows.reduce(
    (t, r) => ({ placed: t.placed + r.placed, stayed: t.stayed + r.stayed }),
    { placed: 0, stayed: 0 }
  )
  const average = totals.placed ? totals.stayed / totals.placed : 0
  const displayed = active ?? totals

  const rate = displayed.placed ? displayed.stayed / displayed.placed : null
  // Green at or above the programme average, red below it.
  const tone =
    rate === null || !active ? "" : rate >= average ? "rj-up" : "rj-down"
  const name = active ? PLACES[active.id].name : "Todas as regiões"
  return (
    <div className={`rj-cut rj-result ${tone}`}>
      <h2>{name}</h2>
      {rate === null ? (
        <p>Sem colocações com tempo de observação suficiente.</p>
      ) : (
        <TickGauge
          unframed
          ticks={36}
          locale="pt-PT"
          title={`Permanência aos ${filters.months} meses`}
          value={rate}
          target={active ? average : undefined}
          targetLabel="100%"
          caption={`${integer(displayed.stayed)} de ${integer(displayed.placed)} pessoas ficaram`}
        />
      )}
      <dl>
        <div>
          <dt>Média do programa</dt>
          <dd>{totals.placed ? percent(average) : "—"}</dd>
        </div>
        {active && (
          <div>
            <dt>Diferença para a média</dt>
            <dd className="rj-delta">
              {rate === null ? "—" : `${points(rate - average)} pontos`}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
