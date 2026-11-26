import type { Metadata } from "next"
import { PlanPage } from "@/components/plan/plan-page"
import type * as T from "@/lib/fica/types"
import { loadTable } from "@/lib/map/load"
import { buildPilot } from "@/lib/map/pilot"

export const metadata: Metadata = {
  title: "Plano de ação · RJ.connect",
}

// Read at build time: only counts reach the browser.
export default function Page() {
  const participants = loadTable<T.Participant>("participantes")
  const placements = loadTable<T.Placement>("colocacoes")
  const pilot = buildPilot({ participants, placements })
  return <PlanPage pilot={pilot} />
}
