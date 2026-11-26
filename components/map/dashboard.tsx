"use client"

import {
  CaretDown,
  Clock,
  Eye,
  User,
  UserMinus,
  WarningCircle,
} from "@phosphor-icons/react"
import { useState } from "react"
import { NoData } from "@/components/map/charts"
import { RollingNumber } from "@/components/ui/rolling-number"
import { SemiDonut } from "@/components/map/semi-donut"
import { type FilterState } from "@/components/map/filters"
import { integer, percent } from "@/lib/fica/format"
import {
  BANDS,
  BARRIERS,
  cellOf,
  clearlyDifferent,
  CONTRACTS,
  MIN_GROUP,
  nowOf,
  TRAININGS,
  type ContractFilter,
  type Region,
} from "@/lib/map/analysis"
import { type EntityId } from "@/lib/map/places"
import { cn } from "@/lib/utils"

export type Choice = EntityId | "all"
export type Tab = "results" | "integration" | "followup"

const TABS: { id: Tab; label: string }[] = [
  { id: "results", label: "Resultados" },
  { id: "integration", label: "Integração" },
  { id: "followup", label: "Acompanhamento" },
]

const CONTRACT_OF: Record<ContractFilter, string> = {
  all: "todos os contratos",
  permanente: "contratos permanentes",
  temporario: "contratos temporários",
}

const BARRIER_NAMES: Record<(typeof BARRIERS)[number], string> = {
  experiencia: "Falta de experiência",
  documentacao: "Documentação",
  horarios: "Horários",
  distancia: "Distância",
  nenhuma: "Não identificados",
}

/** Validated categorical hues, one set per theme. Unknown is always grey. */
const SLICE_COLORS = [
  "var(--slice-1)",
  "var(--slice-2)",
  "var(--slice-3)",
  "var(--slice-4)",
]

const TRAINING_NAMES: Record<(typeof TRAININGS)[number], string> = {
  formacao_tecnica: "Formação técnica",
  acolhimento: "Acolhimento",
  formacao_complementar: "Formação complementar",
  estagio: "Estágios",
}

export function Dashboard({
  choice,
  region,
  filters,
  tab,
  onTab,
  onRoute,
}: {
  choice: Choice
  region: Region
  filters: FilterState
  tab: Tab
  onTab: (tab: Tab) => void
  onRoute: (to: EntityId | null) => void
}) {
  return (
    <div className="@container mt-5 border-t pt-3">
      <Tabs value={tab} onChange={onTab} />

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="pt-4"
      >
        {tab === "followup" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhamento a 31/12/2025, independentemente do período de
            permanência.
          </p>
        )}
        <div className="mt-5">
          {tab === "results" && <Results region={region} filters={filters} />}
          {tab === "integration" && (
            <Integration region={region} filters={filters} />
          )}
          {tab === "followup" && (
            <FollowUp
              key={choice}
              choice={choice}
              region={region}
              contract={filters.contract}
              onRoute={onRoute}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function Tabs({
  value,
  onChange,
}: {
  value: Tab
  onChange: (tab: Tab) => void
}) {
  function move(e: React.KeyboardEvent) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    // Arrows follow reading order; the page is left to right.
    const i = TABS.findIndex((t) => t.id === value)
    const next = TABS[(i + step + TABS.length) % TABS.length]
    onChange(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }
  return (
    <div
      role="tablist"
      aria-label="Vista"
      onKeyDown={move}
      className="mt-3 flex gap-6 border-b"
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          id={`tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          className="-mb-px min-h-11 border-b-2 border-transparent text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground aria-selected:border-primary aria-selected:text-foreground"
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ---- Resultados ------------------------------------------------------------

function Results({
  region,
  filters,
}: {
  region: Region
  filters: FilterState
}) {
  const cell = cellOf(region, filters.months, filters.contract)
  const left = cell.placed - cell.stayed
  const waiting =
    filters.contract === "all" ? region.validPlacements - cell.placed : null
  const contracts = CONTRACTS.map((c) => ({
    id: c,
    ...cellOf(region, filters.months, c),
  }))

  return (
    <div>
      <div className="grid gap-8 @min-[40rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="main-rate">
          {cell.placed === 0 ? (
            <NoData reason="Nenhuma colocação com tempo de observação suficiente." />
          ) : (
            <>
              <p
                id="main-rate"
                className="text-6xl font-semibold tracking-tight text-primary tabular-nums"
              >
                <RollingNumber value={percent(cell.stayed / cell.placed)} />
              </p>
              <p className="mt-1 text-sm font-medium">
                Permanecem ao fim de {filters.months} meses
                {filters.contract !== "all" && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {CONTRACT_OF[filters.contract]}
                  </span>
                )}
              </p>
              <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t pt-4 text-sm">
                <Figure
                  icon={<User weight="fill" className="text-primary" />}
                  value={cell.stayed}
                  label="permanecem"
                />
                <Figure
                  icon={<UserMinus weight="fill" className="text-chart-2" />}
                  value={left}
                  label="saíram"
                />
                <Figure value={cell.placed} label="colocações avaliadas" />
              </dl>
              {cell.placed < MIN_GROUP && (
                <p className="mt-2 text-xs text-warning">
                  Poucos casos: ler com cuidado.
                </p>
              )}
              {waiting ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Outras {integer(waiting)} colocações ainda não têm{" "}
                  {filters.months} meses de observação.
                </p>
              ) : null}
            </>
          )}
        </section>

        <section aria-labelledby="by-contract">
          <h3 id="by-contract" className="text-sm font-semibold">
            Por tipo de contrato
          </h3>
          <p className="text-xs text-muted-foreground">
            Mostra sempre os dois tipos, aos {filters.months} meses, seja qual
            for o filtro de contrato.
          </p>
          <ul className="mt-4 space-y-4">
            {contracts.map((c) => {
              const rate = c.placed ? c.stayed / c.placed : null
              const chosen = filters.contract === c.id
              return (
                <li key={c.id}>
                  <p className="flex items-baseline justify-between gap-3 text-sm">
                    <span className={cn(chosen && "font-semibold")}>
                      {c.id === "permanente" ? "Permanentes" : "Temporários"}
                      <span className="ms-2 text-xs text-muted-foreground">
                        {integer(c.stayed)} de {integer(c.placed)}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">
                      {rate === null ? "Sem dados" : percent(rate)}
                    </span>
                  </p>
                  <span
                    aria-hidden="true"
                    className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${(rate ?? 0) * 100}%` }}
                    />
                  </span>
                </li>
              )
            })}
          </ul>
          <p
            aria-hidden="true"
            className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums"
          >
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </p>
          <ContractSentence contracts={contracts} />
        </section>
      </div>

      <dl className="mt-8 divide-y border-y">
        <Context
          value={region.people}
          label="pessoas no programa"
          period="Jan. 2024 a dez. 2025"
        />
        <Context
          value={region.firstYear}
          label="colocadas no 1.º ano"
          period={`De ${integer(region.cohort)} que entraram até 4/7/2024`}
        />
        <Context
          value={region.active}
          label="empregadas a 31/12/2025"
          period={`De ${integer(region.validPlacements)} colocações válidas`}
        />
      </dl>
    </div>
  )
}

function Figure({
  icon,
  value,
  label,
}: {
  icon?: React.ReactNode
  value: number
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      {icon && (
        <span aria-hidden="true" className="text-lg">
          {icon}
        </span>
      )}
      <dt className="sr-only">{label}</dt>
      <dd>
        <b className="text-base tabular-nums">{integer(value)}</b>{" "}
        <span className="text-muted-foreground">{label}</span>
      </dd>
    </div>
  )
}

function Context({
  value,
  label,
  period,
}: {
  value: number
  label: string
  period: string
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
      <dt className="text-sm">
        <b className="text-lg tabular-nums">{integer(value)}</b> {label}
      </dt>
      <dd className="text-xs text-muted-foreground">{period}</dd>
    </div>
  )
}

function ContractSentence({
  contracts,
}: {
  contracts: { id: string; placed: number; stayed: number }[]
}) {
  const [perm, temp] = contracts
  if (perm.placed < MIN_GROUP || temp.placed < MIN_GROUP)
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Poucos casos para comparar os dois tipos.
      </p>
    )
  const a = { total: perm.placed, stayed: perm.stayed }
  const b = { total: temp.placed, stayed: temp.stayed }
  // From the rounded rates on screen, so the sum reads right.
  const tenths = (c: { stayed: number; placed: number }) =>
    Math.round((1000 * c.stayed) / c.placed)
  const gap = ((tenths(perm) - tenths(temp)) / 10).toLocaleString("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      {clearlyDifferent(a, b)
        ? `${gap} pontos de diferença entre permanentes e temporários, mais do que o acaso explicaria.`
        : "A diferença entre os dois tipos pode ser acaso."}
    </p>
  )
}

// ---- Integração --------------------------------------------------------------

function Integration({
  region,
  filters,
}: {
  region: Region
  filters: FilterState
}) {
  const cell = cellOf(region, filters.months, filters.contract)
  const [open, setOpen] = useState<string | null>(null)
  if (cell.placed === 0) return <NoData />

  const barriers = BARRIERS.map((id, i) => ({ id, n: cell.barriers[i] })).sort(
    (a, b) =>
      Number(a.id === "nenhuma") - Number(b.id === "nenhuma") || b.n - a.n
  )

  return (
    <div className="@container">
      <div className="grid gap-8 @min-[44rem]:grid-cols-2">
        <section aria-labelledby="barriers">
          <h3 id="barriers" className="text-sm font-semibold">
            Barreiras à integração
          </h3>
          <div className="mt-3">
            <SemiDonut
              total={cell.placed}
              totalLabel="pessoas colocadas"
              slices={barriers.map((b, i) => ({
                id: b.id,
                label: BARRIER_NAMES[b.id],
                value: b.n,
                color:
                  b.id === "nenhuma"
                    ? "var(--chart-3)"
                    : SLICE_COLORS[i % SLICE_COLORS.length],
              }))}
            />
          </div>
        </section>

        <section aria-labelledby="training">
          <h3 id="training" className="text-sm font-semibold">
            Tipo de formação
          </h3>
          <table className="mt-3 w-full text-sm [&_tr>*:nth-child(2)]:ps-3 [&_tr>*:nth-child(3)]:ps-5">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-1.5 text-start font-medium">Tipo</th>
                <th className="py-1.5 text-end font-medium">Pessoas</th>
                <th className="py-1.5 text-end font-medium">%</th>
              </tr>
            </thead>
            {TRAININGS.map((id, i) => {
              const t = cell.training[i]
              const expanded = open === id
              const enough =
                t.done.total >= MIN_GROUP && t.notDone.total >= MIN_GROUP
              return (
                <tbody key={id} className="border-b">
                  <tr>
                    <th className="py-0 text-start font-normal">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`training-${id}`}
                        onClick={() => setOpen(expanded ? null : id)}
                        className="flex min-h-10 w-full items-center gap-1.5 text-start hover:text-primary"
                      >
                        <CaretDown
                          aria-hidden="true"
                          className={cn(
                            "flex-none transition-transform motion-reduce:transition-none",
                            !expanded && "-rotate-90"
                          )}
                        />
                        {TRAINING_NAMES[id]}
                      </button>
                    </th>
                    <td className="text-end tabular-nums">
                      {integer(t.people)}
                    </td>
                    <td className="text-end tabular-nums">
                      {percent(t.people / cell.placed)}
                    </td>
                  </tr>
                  {expanded && (
                    <tr id={`training-${id}`}>
                      <td
                        colSpan={3}
                        className="pt-1 pb-4 text-xs leading-relaxed text-muted-foreground"
                      >
                        {enough ? (
                          <>
                            Com esta formação concluída antes de ser colocado:{" "}
                            <b className="text-foreground">
                              {percent(t.done.stayed / t.done.total)}
                            </b>{" "}
                            ficam ({integer(t.done.stayed)} de{" "}
                            {integer(t.done.total)}). Sem ela:{" "}
                            <b className="text-foreground">
                              {percent(t.notDone.stayed / t.notDone.total)}
                            </b>{" "}
                            ({integer(t.notDone.stayed)} de{" "}
                            {integer(t.notDone.total)}).{" "}
                            {clearlyDifferent(t.done, t.notDone)
                              ? "A diferença não parece acaso."
                              : "A diferença pode ser acaso."}
                          </>
                        ) : (
                          <>
                            Sem dados suficientes para comparar: um dos grupos
                            tem menos de {MIN_GROUP} pessoas (
                            {integer(t.done.total)} com a formação concluída
                            antes, {integer(t.notDone.total)} sem ela).
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              )
            })}
          </table>
        </section>

        <p className="text-xs text-muted-foreground @min-[44rem]:col-span-2">
          Base: {integer(cell.placed)} pessoas colocadas, com {filters.months}{" "}
          meses de observação e {CONTRACT_OF[filters.contract]}. Cada pessoa tem
          uma barreira registada; pode ter várias formações, por isso essas
          percentagens não somam 100%. São associações, não provam causa.
        </p>
      </div>
    </div>
  )
}

// ---- Acompanhamento ------------------------------------------------------------

const PRIORITY = [
  { label: "Agir já", icon: WarningCircle, urgent: true },
  { label: "A seguir", icon: Clock, urgent: false },
  { label: "A começar", icon: Eye, urgent: false },
]

function FollowUp({
  region,
  contract,
}: {
  choice: Choice
  region: Region
  contract: ContractFilter
  onRoute: (to: EntityId | null) => void
}) {
  const now = nowOf(region, contract)
  const past = cellOf(region, 3, contract)

  return (
    <div>
      {now.total === 0 ? (
        <NoData reason="Ninguém entre os 45 e os 75 dias de contrato a 31/12/2025." />
      ) : (
        <>
          <h3 className="text-sm font-semibold">
            Prioridades: {integer(now.total - now.done)} pessoas sem contacto
            confirmado
          </h3>
          <ol key={contract} className="mt-2 divide-y border-y">
            {BANDS.map((band, i) => {
              const { label, icon: Icon, urgent } = PRIORITY[i]
              const { open, temporary } = now.bands[i]
              const alert = urgent && open > 0
              return (
                <li
                  key={band.from}
                  style={
                    { "--rise-delay": `${i * 110}ms` } as React.CSSProperties
                  }
                  className="rj-rise grid grid-cols-[auto_1fr_auto] items-center gap-x-3 rounded-lg px-1 py-3 transition-[translate,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-card/60 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <Icon
                    size={22}
                    weight={alert ? "fill" : "regular"}
                    className={cn(
                      alert ? "rj-bob text-chart-2" : "text-muted-foreground"
                    )}
                    aria-hidden="true"
                  />
                  <span>
                    <span
                      className={cn("font-semibold", alert && "text-warning")}
                    >
                      {label}
                    </span>
                    <span className="ms-2 text-sm text-muted-foreground">
                      {band.from} a {band.to} dias
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {integer(temporary)} com contrato temporário
                    </span>
                  </span>
                  <b className="text-2xl tabular-nums">
                    <RollingNumber value={integer(open)} />
                  </b>
                </li>
              )
            })}
          </ol>

          <dl
            style={{ "--rise-delay": "360ms" } as React.CSSProperties}
            className="rj-rise mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm"
          >
            <Status label="Realizados" value={now.done} total={now.total} />
            <Status
              label="Por confirmar"
              value={now.toConfirm}
              total={now.total}
            />
            <Status label="Pendentes" value={now.pending} total={now.total} />
          </dl>
          <p className="mt-1 text-xs text-muted-foreground">
            De {integer(now.total)} pessoas com 45 a 75 dias de contrato. Por
            confirmar: o único contacto tem data entre 22 e 30/12/2025, dias em
            que as datas não são fiáveis. Os contactos não registam
            dificuldades.
          </p>
        </>
      )}

      <section
        style={{ "--rise-delay": "460ms" } as React.CSSProperties}
        className="rj-rise mt-5 border-t pt-4 text-sm"
      >
        <h3 className="font-semibold">Histórico</h3>
        <p className="mt-1">
          Das {integer(past.placed)} colocações com pelo menos 3 meses,{" "}
          <b>{integer(past.past.done)}</b> (
          {past.placed ? percent(past.past.done / past.placed) : "—"}) tiveram
          um contacto registado entre o dia 45 e o dia 75.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pode haver contactos a menos: quase metade dos registos tem data de 22
          a 30/12/2025.
        </p>
      </section>
    </div>
  )
}

function Status({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  return (
    <div>
      <dt className="inline">{label}</dt>{" "}
      <dd className="inline font-semibold tabular-nums">
        {integer(value)}{" "}
        <span className="font-normal text-muted-foreground">
          ({total ? percent(value / total) : "—"})
        </span>
      </dd>
    </div>
  )
}
