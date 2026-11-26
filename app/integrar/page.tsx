import type { Metadata } from "next"
import { SiteFooter, SiteHeader } from "@/components/site-header"
import { ReturnSection } from "@/components/plan/return-section"
import type * as T from "@/lib/fica/types"
import { buildAnalysis } from "@/lib/map/analysis"
import { loadTable } from "@/lib/map/load"

export const metadata: Metadata = {
  title: "Integrar+ · RJ.connect",
}

// Read at build time: only counts reach the browser.
export default function Page() {
  const analysis = buildAnalysis({
    participants: loadTable<T.Participant>("participantes"),
    placements: loadTable<T.Placement>("colocacoes"),
    training: loadTable<T.TrainingAction>("acoes_formacao"),
    contacts: loadTable<T.RawContact>("acompanhamentos"),
  })
  return (
    <div className="rj-page rj-report mx-auto flex min-h-dvh max-w-7xl flex-col px-4 py-4 sm:px-8 sm:py-6">
      <SiteHeader />
      <main className="flex-1">
        <ReturnSection analysis={analysis} />
      </main>
      <SiteFooter />
    </div>
  )
}
