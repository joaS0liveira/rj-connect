import type { Metadata } from "next"
import { Dashboard } from "@/components/stability/dashboard"
import type * as T from "@/lib/fica/types"
import { loadTable } from "@/lib/map/load"
import { buildStability } from "@/lib/map/stability"

export const metadata: Metadata = {
  title: "Painel de estabilidade · RJ.connect",
}

// Read at build time: only counts reach the browser.
export default function Page() {
  const stability = buildStability({
    participants: loadTable<T.Participant>("participantes"),
    placements: loadTable<T.Placement>("colocacoes"),
    companies: loadTable<T.Company>("empresas_parceiras"),
    entities: loadTable<{ id: string; nome: string }>("entidades_sociais"),
    contacts: loadTable<T.RawContact>("acompanhamentos"),
    history: loadTable<{ id_colocacao: string; tipo_evento: string }>(
      "historico_emprego"
    ),
  })
  return <Dashboard stability={stability} />
}
