"use client"

import {
  CheckCircle,
  CaretDown,
  Info,
  WarningCircle,
  WarningDiamond,
  X,
} from "@phosphor-icons/react"
import { useMemo, useState } from "react"
import { NoData, StackBar, Swatch } from "@/components/map/charts"
import { Segmented } from "@/components/map/filters"
import { PageTitle, SiteFooter } from "@/components/site-header"
import { integer, percent } from "@/lib/fica/format"
import {
  clearlyDifferent,
  MIN_GROUP,
  PERIODS,
  type Months,
} from "@/lib/map/analysis"
import { PLACES, type EntityId } from "@/lib/map/places"
import {
  ANY,
  expectedFor,
  select,
  totals,
  type Severity,
  type Stability,
  type StabilityFilter,
} from "@/lib/map/stability"
import { cn } from "@/lib/utils"

const INVALID = "var(--muted-foreground)"
const SEVERITY: Record<
  Severity,
  { label: string; icon: typeof Info; className: string }
> = {
  high: {
    label: "Alta",
    icon: WarningDiamond,
    className: "text-destructive",
  },
  medium: { label: "Média", icon: WarningCircle, className: "text-warning" },
  low: { label: "Baixa", icon: Info, className: "text-muted-foreground" },
  ok: { label: "Sem casos", icon: CheckCircle, className: "text-positive" },
}

const entityName = (id: string) =>
  PLACES[id as EntityId]?.name ?? `Entidade ${id}`

export function Dashboard({ stability }: { stability: Stability }) {
  const [filter, setFilter] = useState<StabilityFilter>({
    entity: ANY,
    company: ANY,
    contract: ANY,
  })
  const [months, setMonths] = useState<Months>(6)
  const [ranking, setRanking] = useState<"entity" | "company">("entity")
  const change = (patch: Partial<StabilityFilter>) =>
    setFilter((f) => ({ ...f, ...patch }))
  const filtered = filter.entity !== ANY || filter.company !== ANY

  const all = useMemo(
    () => totals(select(stability.cells, filter)),
    [stability, filter]
  )
  const period = all.periods[months]
  const valid = all.records - all.invalid
  const companyName = (id: string) =>
    stability.companies.find((c) => c.id === id)?.name ?? id

  return (
    <div className="rj-page rj-report mx-auto max-w-7xl px-4 py-4 sm:px-8 sm:py-6">
      <main>
        <PageTitle
          title="Quem continua no emprego?"
          lead="Compara regiões, empresas e contratos. Cada percentagem conta apenas as colocações que já puderam ser observadas durante o prazo escolhido."
        />

        <div className="z-10 -mx-1 mt-4 flex flex-wrap items-end gap-3 bg-background px-1 py-2 md:sticky md:top-0">
          <Picker
            label="Região"
            value={filter.entity}
            onChange={(entity) => change({ entity })}
            options={stability.entities.map((e) => ({
              value: e.id,
              label: entityName(e.id),
            }))}
          />
          <Picker
            label="Empresa"
            value={filter.company}
            onChange={(company) => change({ company })}
            options={stability.companies
              .filter((c) => c.known)
              .map((c) => ({
                value: c.id,
                label: c.name,
              }))}
          />
          <Segmented
            label="Tipo de contrato"
            options={[
              { value: ANY, label: "Todos" },
              { value: "permanente", label: "Permanentes" },
              { value: "temporario", label: "Temporários" },
            ]}
            value={filter.contract}
            onChange={(contract) =>
              change({ contract: contract as StabilityFilter["contract"] })
            }
          />
          <Segmented
            label="Período de observação"
            options={PERIODS.map((p) => ({
              value: p.months,
              label: `${p.months} meses`,
            }))}
            value={months}
            onChange={setMonths}
          />
          {filtered && (
            <button
              type="button"
              onClick={() => change({ entity: ANY, company: ANY })}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold text-primary hover:bg-accent"
            >
              <X aria-hidden="true" /> Limpar
            </button>
          )}
        </div>
        <p role="status" className="sr-only">
          {[
            filter.entity !== ANY && entityName(filter.entity),
            filter.company !== ANY && companyName(filter.company),
            `${months} meses`,
          ]
            .filter(Boolean)
            .join(", ")}
        </p>

        {all.records === 0 ? (
          <div className="mt-6">
            <NoData reason="Nenhuma colocação com estes filtros." />
          </div>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Colocações registadas" value={integer(all.records)} />
              <Kpi
                label={`Elegíveis aos ${months} meses`}
                value={integer(period.eligible)}
                note={
                  valid
                    ? `${percent(period.eligible / valid)} das válidas`
                    : undefined
                }
              />
              <Kpi
                label={`Permanência aos ${months} meses`}
                value={
                  period.eligible
                    ? percent(period.stayed / period.eligible)
                    : "—"
                }
                note={
                  period.eligible
                    ? `${integer(period.stayed)} de ${integer(period.eligible)} elegíveis`
                    : "Sem dados suficientes"
                }
                active
              />
              <Kpi
                label="Prazo ainda por atingir"
                value={valid ? percent(period.tracking / valid) : "—"}
                note={`${integer(period.tracking)} com menos de ${months} meses de observação`}
              />
            </dl>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Status
                months={months}
                stayed={period.stayed}
                left={period.eligible - period.stayed}
                tracking={period.tracking}
                invalid={all.invalid}
              />
              <Contracts
                stability={stability}
                filter={filter}
                months={months}
              />
            </div>

            <section className="mt-4 rounded-2xl border bg-card p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-bold">
                  Comparar permanência
                </h2>
                <Segmented
                  label="Comparar por"
                  options={[
                    { value: "entity", label: "Regiões" },
                    { value: "company", label: "Empresas" },
                  ]}
                  value={ranking}
                  onChange={setRanking}
                />
              </div>
              {ranking === "entity" ? (
                <Ranking
                  key="entities"
                  hint="Clica numa região para filtrar."
                  months={months}
                  rows={stability.entities.map((e) => {
                    const t = totals(
                      select(stability.cells, { ...filter, entity: e.id })
                    ).periods[months]
                    return {
                      id: e.id,
                      label: entityName(e.id),
                      eligible: t.eligible,
                      stayed: t.stayed,
                    }
                  })}
                  selected={filter.entity}
                  onSelect={(entity) =>
                    change({ entity: entity === filter.entity ? ANY : entity })
                  }
                />
              ) : (
                <Ranking
                  key="companies"
                  hint="A marca mostra o esperado pelas regiões e contratos com que trabalha."
                  months={months}
                  rows={stability.companies
                    .filter((c) => c.known)
                    .map((c) => {
                      const base = select(stability.cells, {
                        ...filter,
                        company: ANY,
                      })
                      const e = expectedFor(base, c.id, months)
                      return {
                        id: c.id,
                        label: c.name,
                        eligible: e.eligible,
                        stayed: Math.round(e.rate * e.eligible),
                        expected: e.expectedRate,
                        verdict: e.verdict,
                      }
                    })}
                  selected={filter.company}
                  onSelect={(company) =>
                    change({
                      company: company === filter.company ? ANY : company,
                    })
                  }
                />
              )}
            </section>
          </>
        )}

        <details className="group mt-4 rounded-2xl border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <span>
              Qualidade dos dados{" "}
              <span className="ms-2 font-normal text-muted-foreground">
                · {integer(all.flagged)} registos assinalados nos filtros atuais
              </span>
            </span>
            <CaretDown
              className="shrink-0 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <Quality stability={stability} />
        </details>
      </main>
      <SiteFooter />
    </div>
  )
}

function Picker({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="text-sm text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block min-h-11 rounded-xl border bg-card px-3 text-base text-foreground"
      >
        <option value={ANY}>Todas</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Kpi({
  label,
  value,
  note,
  active,
}: {
  label: string
  value: string
  note?: string
  active?: boolean
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4", active && "rj-cut")}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn("mt-1 font-heading text-3xl font-semibold tabular-nums")}
      >
        {value}
      </dd>
      {note && <dd className="text-xs text-muted-foreground">{note}</dd>}
    </div>
  )
}

function Status({
  months,
  stayed,
  left,
  tracking,
  invalid,
}: {
  months: Months
  stayed: number
  left: number
  tracking: number
  invalid: number
}) {
  const parts = [
    { label: "Ficaram", value: stayed, color: "var(--rj-stay)" },
    { label: "Saíram antes", value: left, color: "var(--rj-leave)" },
    {
      label: "Prazo ainda por atingir",
      value: tracking,
      color: "var(--rj-wait)",
    },
    { label: "Excluídas", value: invalid, color: INVALID },
  ]
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="font-heading text-lg font-bold">
        Situação aos {months} meses
      </h2>
      <div className="mt-4">
        <StackBar parts={parts} />
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {parts.map((p) => (
          <li key={p.label} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5">
              <Swatch color={p.color} />
            </span>
            <span>
              {p.label}
              <b className="block tabular-nums">{integer(p.value)}</b>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

type RankRow = {
  id: string
  label: string
  eligible: number
  stayed: number
  expected?: number
  verdict?: "above" | "below" | "within"
  unknown?: boolean
}

function Ranking({
  hint,
  months,
  rows,
  selected,
  onSelect,
}: {
  hint: string
  months: Months
  rows: RankRow[]
  selected: string
  onSelect: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const available = rows.filter(
    (row) => row.eligible > 0 || row.id === selected
  )
  const outsideComparison = (row: RankRow) =>
    row.eligible < MIN_GROUP || row.unknown
  const details = available.filter(outsideComparison)
  const sorted = available
    .filter((row) => !outsideComparison(row))
    .sort((a, b) => b.stayed / b.eligible - a.stayed / a.eligible)
  const hidden = rows.length - available.length
  const anyClear = sorted.some((r) => r.verdict && r.verdict !== "within")
  const limit = 8
  const all = sorted.reduce(
    (t, r) => ({
      stayed: t.stayed + r.stayed,
      eligible: t.eligible + r.eligible,
    }),
    { stayed: 0, eligible: 0 }
  )
  const average = all.eligible ? all.stayed / all.eligible : 0
  const visible = expanded ? sorted : sorted.slice(0, limit)
  const selectedRow = sorted.find((row) => row.id === selected)
  const shown =
    !expanded && selectedRow && !visible.includes(selectedRow)
      ? [...visible.slice(0, limit - 1), selectedRow]
      : visible
  return (
    <div>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {available.length
            ? `A comparação requer grupos identificados com pelo menos ${MIN_GROUP} colocações elegíveis.`
            : "Sem colocações elegíveis com estes filtros."}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Em cada 100 pessoas colocadas, quantas ainda estavam no emprego aos{" "}
            {months} meses. {hint}
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-[var(--rj-stay)]" />
              Acima da média
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-[var(--rj-leave)]" />
              Abaixo da média
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 border-s-2 border-dashed border-foreground" />
              Média: {percent(average)}
            </span>
            {sorted.some((r) => r.expected !== undefined) && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-1 rounded-full bg-foreground/60" />
                Esperado
              </span>
            )}
          </p>
          <ol className="mt-3 space-y-1">
            {shown.map((r) => {
              const rate = r.stayed / r.eligible
              const up = rate >= average
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-pressed={selected === r.id}
                    aria-label={`${r.label}: ${percent(rate)} ficaram, ${integer(r.stayed)} de ${integer(r.eligible)}, ${up ? "acima" : "abaixo"} da média`}
                    onClick={() => onSelect(r.id)}
                    className="grid w-full grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_4.5rem] items-center gap-x-3 rounded-lg px-2 py-2 text-start hover:bg-muted/60 aria-pressed:bg-accent sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_5.5rem]"
                  >
                    <span className="min-w-0 truncate text-sm font-medium">
                      {r.label}
                      {r.verdict && r.verdict !== "within" && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {r.verdict === "above"
                            ? "Acima do esperado"
                            : "Abaixo do esperado"}
                        </span>
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className="relative block h-5 rounded-md bg-muted"
                    >
                      <span
                        className="absolute inset-y-0 start-0 rounded-md motion-safe:transition-[width] motion-safe:duration-500"
                        style={{
                          width: `${rate * 100}%`,
                          background: up ? "var(--rj-stay)" : "var(--rj-leave)",
                        }}
                      />
                      {r.expected !== undefined && r.eligible > 0 && (
                        <span
                          className="absolute -inset-y-1 w-1 -translate-x-1/2 rounded-full bg-foreground/60 rtl:translate-x-1/2"
                          style={{ insetInlineStart: `${r.expected * 100}%` }}
                        />
                      )}
                      <span
                        className="absolute -inset-y-1.5 border-s-2 border-dashed border-foreground"
                        style={{ insetInlineStart: `${average * 100}%` }}
                      />
                    </span>
                    <span className="text-end tabular-nums">
                      <strong className="block text-base leading-tight">
                        {percent(rate)}
                      </strong>
                      <span className="block text-[11px] text-muted-foreground">
                        {integer(r.stayed)} de {integer(r.eligible)}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </>
      )}
      {sorted.length > limit && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-accent"
        >
          {expanded ? "Ver menos" : `Ver lista completa (${sorted.length})`}
          <CaretDown
            className={cn(expanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      )}
      {details.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            Ver contagens fora da comparação ({details.length})
          </summary>
          <ul className="mt-2 divide-y">
            {details.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  aria-pressed={selected === row.id}
                  onClick={() => onSelect(row.id)}
                  className="flex w-full flex-wrap justify-between gap-x-3 rounded-lg px-2 py-2 text-start text-sm hover:bg-accent aria-pressed:bg-accent"
                >
                  <span>{row.label}</span>
                  <span className="text-muted-foreground">
                    {integer(row.stayed)} de {integer(row.eligible)} ficaram
                    {row.unknown ? " · referência por validar" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {hidden > 0 && available.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {hidden} sem colocações elegíveis com estes filtros.
        </p>
      )}
      {expanded &&
        sorted.some((r) => r.expected !== undefined) &&
        !anyClear && (
          <p className="mt-3 text-sm font-medium">
            Nenhuma empresa se afasta claramente do esperado: as diferenças vêm
            sobretudo das regiões e dos contratos.
          </p>
        )}
    </div>
  )
}

function Contracts({
  stability,
  filter,
  months,
}: {
  stability: Stability
  filter: StabilityFilter
  months: Months
}) {
  const rows = (["permanente", "temporario"] as const).map((contract) => ({
    contract,
    totals: totals(select(stability.cells, { ...filter, contract })),
  }))
  const [a, b] = rows.map((r) => ({
    total: r.totals.periods[months].eligible,
    stayed: r.totals.periods[months].stayed,
  }))
  const enough = a.total >= MIN_GROUP && b.total >= MIN_GROUP
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="font-heading text-lg font-bold">
        Permanentes e temporários
      </h2>
      <ul className="mt-3 space-y-2">
        {rows.map(({ contract, totals }) => {
          const period = totals.periods[months]
          const rate = period.eligible ? period.stayed / period.eligible : null
          return (
            <li key={contract}>
              <div className="flex justify-between gap-2 text-sm">
                <span>
                  {contract === "permanente" ? "Permanentes" : "Temporários"}
                </span>
                <strong className="tabular-nums">
                  {rate === null ? "Sem dados" : percent(rate)}
                </strong>
              </div>
              <div
                aria-hidden="true"
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full motion-safe:animate-[chart-bar-in_550ms_ease-out_both] motion-safe:transition-[width] motion-safe:duration-500 ltr:origin-left rtl:origin-right"
                  style={{
                    width: `${(rate ?? 0) * 100}%`,
                    background:
                      contract === "permanente"
                        ? "var(--rj-stay)"
                        : "var(--rj-leave)",
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <details className="group mt-3">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 py-1 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
          Ver os três períodos{" "}
          <CaretDown className="group-open:rotate-180" aria-hidden="true" />
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Entre parênteses, as colocações elegíveis.
        </p>
        <dl className="mt-2 divide-y sm:hidden">
          {rows.map((r) => (
            <div key={r.contract} className="py-2">
              <dt className="text-sm font-semibold">
                {r.contract === "permanente" ? "Permanentes" : "Temporários"}
              </dt>
              <dd className="mt-1 grid grid-cols-3 gap-2 text-sm">
                {PERIODS.map((p) => {
                  const x = r.totals.periods[p.months]
                  return (
                    <span
                      key={p.months}
                      className={cn(
                        "tabular-nums",
                        p.months === months && "font-bold"
                      )}
                    >
                      <span className="block text-xs font-normal text-muted-foreground">
                        {p.months} meses
                      </span>
                      {x.eligible ? percent(x.stayed / x.eligible) : "—"}
                      <span className="block text-xs font-normal text-muted-foreground">
                        ({integer(x.eligible)})
                      </span>
                    </span>
                  )
                })}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-2 hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start text-muted-foreground">
                <th className="py-2 text-start font-medium">Contrato</th>
                {PERIODS.map((p) => (
                  <th key={p.months} className="py-2 text-end font-medium">
                    {p.months} meses
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.contract} className="border-b last:border-0">
                  <th className="py-2 text-start font-semibold">
                    {r.contract === "permanente"
                      ? "Permanentes"
                      : "Temporários"}
                  </th>
                  {PERIODS.map((p) => {
                    const x = r.totals.periods[p.months]
                    return (
                      <td
                        key={p.months}
                        className={cn(
                          "py-2 text-end tabular-nums",
                          p.months === months && "font-bold"
                        )}
                      >
                        {x.eligible
                          ? percent(x.stayed / x.eligible)
                          : "Sem dados"}{" "}
                        <span className="font-normal text-muted-foreground">
                          ({integer(x.eligible)})
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm font-medium">
          {filter.contract !== ANY
            ? "Escolhe Todos no tipo de contrato para comparar os dois."
            : !enough
              ? "Poucos casos para comparar os dois contratos."
              : clearlyDifferent(a, b)
                ? `Aos ${months} meses, os temporários ficam claramente menos.`
                : "A diferença entre os dois pode ser acaso."}
        </p>
        {months === 12 && (
          <p className="mt-1 text-sm text-muted-foreground">
            Nestes dados nenhum contrato temporário chega aos 12 meses: têm fim
            marcado.
          </p>
        )}
      </details>
    </section>
  )
}

function Quality({ stability }: { stability: Stability }) {
  const flagged = stability.checks.filter((c) => c.severity !== "ok")
  const clean = stability.checks.filter((c) => c.severity === "ok")
  return (
    <section
      className="border-t p-4 sm:p-5"
      aria-label="Verificações de qualidade"
    >
      <p className="text-sm text-muted-foreground">
        Os registos com problemas ficam sinalizados para revisão. Nenhum foi
        apagado ou corrigido sem justificação. Vale para todos os dados, sem
        filtros.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2 text-start font-medium">Gravidade</th>
              <th className="py-2 text-start font-medium">Problema</th>
              <th className="py-2 text-end font-medium">Casos</th>
              <th className="py-2 ps-4 text-start font-medium">O que se fez</th>
            </tr>
          </thead>
          <tbody>
            {flagged.map((c) => {
              const s = SEVERITY[c.severity]
              return (
                <tr key={c.id} className="border-b align-top last:border-0">
                  <td className="py-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 font-semibold",
                        s.className
                      )}
                    >
                      <s.icon weight="fill" aria-hidden="true" />
                      {s.label}
                    </span>
                  </td>
                  <td className="py-2">
                    {c.label}
                    <span className="block text-xs text-muted-foreground">
                      {c.table}
                    </span>
                  </td>
                  <td className="py-2 text-end tabular-nums">
                    <b>{integer(c.cases)}</b>
                    <span className="block text-xs text-muted-foreground">
                      {percent(c.cases / c.base)}
                    </span>
                  </td>
                  <td className="py-2 ps-4">{c.action}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <h3 className="mt-4 flex items-center gap-2 font-semibold text-positive">
        <CheckCircle weight="fill" aria-hidden="true" /> Verificado, sem casos
      </h3>
      <ul className="mt-1 grid gap-x-6 text-sm text-muted-foreground sm:grid-cols-2">
        {clean.map((c) => (
          <li key={c.id}>{c.label}</li>
        ))}
      </ul>
    </section>
  )
}
