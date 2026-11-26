import { MapApp } from "@/components/map/app"
import type * as T from "@/lib/fica/types"
import { buildAnalysis } from "@/lib/map/analysis"
import { loadTable } from "@/lib/map/load"

// Read at build time: only counts per region reach the browser.
export default function Page() {
  const analysis = buildAnalysis({
    participants: loadTable<T.Participant>("participantes"),
    placements: loadTable<T.Placement>("colocacoes"),
    training: loadTable<T.TrainingAction>("acoes_formacao"),
    contacts: loadTable<T.RawContact>("acompanhamentos"),
  })
  return <MapApp analysis={analysis} />
}
