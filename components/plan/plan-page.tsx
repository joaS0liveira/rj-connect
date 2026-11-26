"use client"

import { useInView } from "motion/react"
import { useRef, useState } from "react"
import { Swatch } from "@/components/map/charts"
import { SiteFooter, SiteHeader } from "@/components/site-header"
import { integer, percent } from "@/lib/fica/format"
import { sampleSize, type Pilot } from "@/lib/map/pilot"
import { PLACES, type EntityId } from "@/lib/map/places"
import { cn } from "@/lib/utils"

type Kind = "fact" | "hypothesis" | "action" | "definition"
const KINDS: Record<Kind, { label: string; hint: string; className: string }> =
  {
    fact: {
      label: "Facto",
      hint: "está nos dados",
      className: "bg-foreground text-background",
    },
    hypothesis: {
      label: "Hipótese",
      hint: "explicação possível, por provar",
      className: "border border-foreground/40",
    },
    action: {
      label: "Recomendação",
      hint: "proposta de ação",
      className: "bg-primary text-primary-foreground",
    },
    definition: {
      label: "Definição",
      hint: "como a app usa a palavra",
      className: "bg-muted",
    },
  }

/** Several facts side by side get a number and a colour each. */
const FACT_COLORS = ["bg-foreground text-background", "bg-[#b45309] text-white"]

function Badge({ kind, n }: { kind: Kind; n?: number }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
        n ? FACT_COLORS[(n - 1) % FACT_COLORS.length] : KINDS[kind].className
      )}
    >
      {KINDS[kind].label}
      {n ? ` ${n}` : ""}
    </span>
  )
}

const PHASES: {
  when: string
  title: string
  what: string[]
  output: string
}[] = [
  {
    when: "Dez. 2026 · 4 semanas",
    title: "Preparar",
    what: [
      "Confirmar com a E03 como se combinam os contratos.",
      "Criar três campos: data de fim prevista, quem decidiu o tipo de contrato e motivo de saída dito pelos dois lados.",
      "Verificar os contactos de 22 a 30 de dezembro, identificar a empresa registada como P99 e rever as 46 colocações que terminam antes de começar.",
      "Escrever, antes de começar, o que conta como sucesso.",
    ],
    output: "Regras fixadas antes de começar",
  },
  {
    when: "Jan.–mai. 2027",
    title: "Arrancar o piloto",
    what: [
      "Cada nova colocação temporária da E03 é sorteada para um de dois grupos.",
      "Reforçado: lista semanal, contacto ao dia 45, contacto 30 dias antes do fim previsto e um pedido à empresa: renovar, prolongar ou dizer porquê não.",
      "Habitual: o acompanhamento de hoje.",
    ],
    output: "Dois grupos comparáveis",
  },
  {
    when: "Até nov. 2027",
    title: "Seguir seis meses",
    what: [
      "A aba “Um grupo” da app gera a lista semanal e o calendário da equipa.",
      "Registar se cada contacto foi feito a tempo.",
    ],
    output: "Contactos feitos a tempo (%)",
  },
  {
    when: "Dez. 2027",
    title: "Avaliar",
    what: [
      "Comparar a permanência aos 6 meses entre os dois grupos, com intervalo de 95%.",
      "Contar toda a gente sorteada, mesmo quem não chegou a ser contactado.",
    ],
    output: "Decisão: alargar, ajustar ou parar",
  },
  {
    when: "2028",
    title: "Alargar",
    what: ["Levar às entidades com mais temporários, com o mesmo painel."],
    output: "Mesmo método, mais entidades",
  },
]

const INDICATORS: { name: string; today: boolean; note: string }[] = [
  {
    name: "Permanência aos 3, 6 e 12 meses, com número de casos",
    today: true,
    note: "Já no Painel",
  },
  {
    name: "Contactos dos dias 45 e “fim − 30” feitos a tempo",
    today: false,
    note: "Precisa da data de fim prevista",
  },
  {
    name: "Temporários que passam a permanentes",
    today: false,
    note: "Precisa de registar renovações",
  },
  {
    name: "Segunda colocação depois de uma saída",
    today: false,
    note: "Hoje cada pessoa tem só uma colocação",
  },
  {
    name: "Motivo de saída ouvido dos dois lados",
    today: false,
    note: "Precisa de um campo novo",
  },
  {
    name: "Registos sem problemas",
    today: true,
    note: "Hoje 94,3%, no Painel",
  },
]

export function PlanPage({ pilot }: { pilot: Pilot }) {
  return (
    <div className="rj-page rj-report mx-auto max-w-6xl px-4 py-4 sm:px-8 sm:py-6">
      <SiteHeader />
      <main>
        <Timeline />
        <Timing pilot={pilot} />
        <Calculator pilot={pilot} />

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <section className="min-w-0">
            <SectionTitle kicker="Medir" title="Indicadores a acompanhar" />
            <ul className="mt-4 divide-y divide-foreground/10 border-y border-foreground/10">
              {INDICATORS.map((i) => (
                <li key={i.name} className="flex items-start gap-3 py-3">
                  <span
                    className={cn(
                      "mt-1 size-2.5 flex-none rounded-full",
                      i.today ? "bg-positive" : "bg-warning"
                    )}
                    aria-hidden="true"
                  />
                  <span>
                    {i.name}
                    <span className="block text-sm text-muted-foreground">
                      {i.today ? "Possível hoje" : "Ainda não"} · {i.note}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="min-w-0">
            <SectionTitle kicker="Alargar" title="Noutras entidades" />
            <p className="mt-2 text-muted-foreground">
              A conta usa só datas, contrato, entidade e empresa: uma entidade
              nova entra no painel sem mudar a app. Com menos de 20 casos
              aparece com aviso.
            </p>
            <OtherEntities pilot={pilot} />
          </section>
        </div>

        <section className="mt-14 border-s-4 border-primary ps-5">
          <SectionTitle kicker="Limites" title="O que o piloto não diz" />
          <ul className="mt-3 list-disc space-y-1 ps-5 text-muted-foreground">
            <li>
              Os dias 45 e 75 foram escolhidos a partir das datas de saída, não
              testados. O piloto existe para os testar.
            </li>
            <li>
              Mede o reforço como um todo, não cada parte (contacto ou pedido à
              empresa) em separado.
            </li>
            <li>
              Os dados mostram associações. Só o sorteio permite dizer que foi o
              reforço que fez a diferença.
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <>
      <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
        {kicker}
      </p>
      <h2 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
        {title}
      </h2>
    </>
  )
}

/** Exits of temporary contracts per month in the job, and where the contacts fall. */
function Timing({ pilot }: { pilot: Pilot }) {
  const [hover, setHover] = useState<number | null>(null)
  const chart = useRef<HTMLDivElement>(null)
  const visible = useInView(chart, { once: true, amount: 0.3 })
  const max = Math.max(...pilot.exits.flatMap((b) => [b.lisbon, b.others]))
  const days = pilot.exits.length * 30
  const at = (day: number) => `${(day / days) * 100}%`
  const shown = pilot.exits.find((b) => b.block === hover)
  const lisbonWorst = [...pilot.exits].sort((a, b) => b.lisbon - a.lisbon)[0]

  return (
    <section className="mt-12">
      <SectionTitle kicker="Quando contactar" title="Porque os dias 45 e 75?" />
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <figure>
          <p className="flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-2">
              <Swatch color="var(--rj-focus-bar)" /> Lisboa (E03)
            </span>
            <span className="inline-flex items-center gap-2">
              <Swatch color="var(--rj-rest-bar)" /> Outras sete entidades
            </span>
          </p>
          <div
            ref={chart}
            className="relative mt-8 h-60 border-b border-foreground/60"
          >
            {[
              { day: 45, label: "Dia 45", row: 0 },
              { day: 75, label: "Dia 75", row: 1 },
            ].map((m) => (
              <div
                key={m.day}
                aria-hidden="true"
                className="absolute -top-6 bottom-0 border-s-2 border-dashed border-foreground"
                style={{ insetInlineStart: at(m.day) }}
              >
                <span
                  className="absolute ms-1.5 text-xs font-semibold whitespace-nowrap"
                  style={{ top: m.row ? "0.9rem" : "-0.25rem" }}
                >
                  {m.label}
                </span>
              </div>
            ))}
            <div className="flex h-full items-end">
              {pilot.exits.map((b) => (
                <button
                  key={b.block}
                  type="button"
                  aria-label={`Ver saídas no mês ${b.block}`}
                  onFocus={() => setHover(b.block)}
                  onBlur={() => setHover(null)}
                  onClick={() => setHover(b.block)}
                  onPointerEnter={() => setHover(b.block)}
                  onPointerLeave={() => setHover(null)}
                  className={cn(
                    "flex h-full flex-1 items-end justify-center gap-0.5 px-1 transition-colors",
                    hover === b.block && "bg-foreground/5"
                  )}
                >
                  {[
                    { n: b.lisbon, color: "var(--rj-focus-bar)" },
                    { n: b.others, color: "var(--rj-rest-bar)" },
                  ].map((bar, i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-full max-w-5 origin-bottom rounded-t-[4px] motion-safe:transition-[scale] motion-safe:duration-500 motion-safe:ease-out",
                        !visible && "motion-safe:scale-y-0"
                      )}
                      style={{
                        height: `${(bar.n / max) * 100}%`,
                        background: bar.color,
                      }}
                    />
                  ))}
                </button>
              ))}
            </div>
          </div>
          <div className="flex text-xs text-muted-foreground">
            {pilot.exits.map((b) => (
              <span key={b.block} className="flex-1 text-center">
                {b.block}.º
              </span>
            ))}
          </div>
          <figcaption className="mt-1 text-sm text-muted-foreground">
            Saídas de contratos temporários, por mês no emprego (blocos de 30
            dias).{" "}
            <span aria-live="polite" className="font-semibold text-foreground">
              {shown
                ? `Dias ${(shown.block - 1) * 30} a ${shown.block * 30 - 1}: Lisboa ${shown.lisbon}, outras ${shown.others}.`
                : "Seleciona um mês para ver quantas saídas houve."}
            </span>
          </figcaption>
          <table className="sr-only">
            <caption>Saídas de temporários por mês no emprego</caption>
            <tbody>
              {pilot.exits.map((b) => (
                <tr key={b.block}>
                  <th>{b.block}.º mês</th>
                  <td>Lisboa {b.lisbon}</td>
                  <td>Outras {b.others}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
        <div className="space-y-5">
          <p>
            <Badge kind="fact" n={1} />
            <span className="mt-1 block">
              As primeiras saídas são ao dia <b>{pilot.firstExit.lisbon}</b> em
              Lisboa e ao dia <b>{pilot.firstExit.others}</b> nas outras. O
              contacto dos 45 dias chega antes de todas.
            </span>
          </p>
          <p>
            <Badge kind="fact" n={2} />
            <span className="mt-1 block">
              Em Lisboa, o pior é o <b>{lisbonWorst.block}.º mês</b> (
              {lisbonWorst.lisbon} saídas). O contacto dos 75 dias chega a meio
              dele, tarde demais.
            </span>
          </p>
          <p>
            <Badge kind="action" />
            <span className="mt-1 block">
              Contar o segundo contacto a partir do <b>fim previsto</b> do
              contrato, 30 dias antes, e não de um dia fixo. Os dados ainda não
              têm essa data.
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}

function Timeline() {
  const [selected, setSelected] = useState(0)
  const phase = PHASES[selected]

  return (
    <section id="calendario" className="mt-10 scroll-mt-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        Plano de ação em Lisboa
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Em cinco fases, a equipa testa se falar mais cedo com quem tem contrato
        temporário ajuda a manter o emprego.
      </p>
      <ol className="mt-6 grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-5">
        {PHASES.map((p, i) => (
          <li key={p.title}>
            <button
              type="button"
              aria-pressed={selected === i}
              aria-controls="phase-details"
              onClick={() => setSelected(i)}
              className="grid h-full w-full cursor-pointer content-start gap-1 rounded-lg px-3 py-3 text-start hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground motion-safe:transition-colors"
            >
              <span className="text-xs tabular-nums opacity-80">
                {String(i + 1).padStart(2, "0")} · {p.when}
              </span>
              <span className="font-heading leading-tight font-semibold">
                {p.title}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div id="phase-details" className="rj-cut mt-4 p-5 sm:p-7">
        <div
          key={phase.title}
          className="grid gap-5 motion-safe:animate-[phase-reveal_320ms_cubic-bezier(0.23,1,0.32,1)_both] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:gap-8"
        >
          <div>
            <h3 className="font-heading text-2xl font-semibold">
              {phase.title}
            </h3>
            <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-relaxed">
              {phase.what.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </div>
          <div className="self-start border-s-2 border-primary bg-muted/60 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              Resultado esperado
            </p>
            <p className="mt-1 font-semibold">{phase.output}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Calculator({ pilot }: { pilot: Pilot }) {
  const [entity, setEntity] = useState<EntityId>("E03")
  const [lift, setLift] = useState(20)
  const e = pilot.entities.find((x) => x.id === entity)!
  const today = e.stayed / e.observed
  const target = Math.min(today + lift / 100, 0.99)
  const perGroup = sampleSize(today, target)
  const total = perGroup * 2
  const months = Math.ceil(total / e.perMonth)

  return (
    <section className="mt-14 rounded-2xl border bg-card p-6 text-card-foreground sm:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        Calculadora
      </p>
      <h2 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
        Quantas pessoas precisa o piloto?
      </h2>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <label className="block">
            <span className="text-sm text-muted-foreground">Entidade</span>
            <select
              value={entity}
              onChange={(ev) => setEntity(ev.target.value as EntityId)}
              className="mt-1 block min-h-11 w-full rounded-xl border border-input bg-background px-3 text-foreground"
            >
              {pilot.entities.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.id} {PLACES[x.id].name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="flex justify-between text-sm text-muted-foreground">
              Subida que queremos conseguir detetar
              <b className="text-foreground">+{lift} pontos</b>
            </span>
            <input
              type="range"
              min={10}
              max={30}
              step={5}
              value={lift}
              onChange={(ev) => setLift(Number(ev.target.value))}
              className="mt-2 h-11 w-full accent-[#F97316]"
            />
          </label>
          <p className="text-sm text-muted-foreground">
            Hoje, nesta entidade, {integer(e.stayed)} de {integer(e.observed)}{" "}
            temporários duram 6 meses (
            <b className="text-foreground">{percent(today)}</b>
            ). O piloto quer chegar a{" "}
            <b className="text-foreground">{percent(target)}</b>. Erro de 5% e
            80% de probabilidade de detetar.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4">
          {[
            { label: "Por grupo", value: integer(perGroup) },
            { label: "No total", value: integer(total) },
            {
              label: "Temporários por mês",
              value: e.perMonth.toFixed(0),
            },
            {
              label: "Meses de entradas",
              value: Number.isFinite(months) ? integer(months) : "—",
            },
          ].map((s) => (
            <div key={s.label} className="border-t border-foreground/25 pt-2">
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="font-heading text-5xl font-semibold tabular-nums">
                {s.value}
              </dd>
            </div>
          ))}
          <p className="col-span-2 text-sm text-muted-foreground">
            Mais 6 meses de seguimento depois da última entrada. Ao ritmo de
            2025.
          </p>
        </dl>
      </div>
    </section>
  )
}

function OtherEntities({ pilot }: { pilot: Pilot }) {
  const rows = [...pilot.entities].sort(
    (a, b) => b.temporaryShare - a.temporaryShare
  )
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[26rem] text-sm">
        <thead>
          <tr className="border-b border-foreground/60 text-muted-foreground">
            <th className="py-2 text-start font-medium">Entidade</th>
            <th className="py-2 text-end font-medium">Temporários</th>
            <th className="py-2 text-end font-medium">Por mês</th>
            <th className="py-2 text-end font-medium">Meses de piloto*</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const today = r.stayed / r.observed
            const n = sampleSize(today, Math.min(today + 0.2, 0.99)) * 2
            const months = Math.ceil(n / r.perMonth)
            return (
              <tr key={r.id} className="border-b border-foreground/10">
                <th className="py-2 text-start font-semibold">
                  {PLACES[r.id].name}
                </th>
                <td className="py-2 text-end tabular-nums">
                  {percent(r.temporaryShare)}
                </td>
                <td className="py-2 text-end tabular-nums">
                  {r.perMonth.toFixed(0)}
                </td>
                <td className="py-2 text-end tabular-nums">
                  {Number.isFinite(months) && today < 0.8
                    ? integer(months)
                    : "Pouco a ganhar"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        *Para detetar +20 pontos na permanência dos temporários aos 6 meses.
        Onde já ficam 80% ou mais, há pouco a ganhar.
      </p>
    </div>
  )
}
