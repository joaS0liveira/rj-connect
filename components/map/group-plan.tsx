"use client"

import {
  CheckCircle,
  CalendarPlus,
  Copy,
  DownloadSimple,
  FileArrowUp,
  Printer,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react"
import { useEffect, useMemo, useState } from "react"
import { NoData } from "@/components/map/charts"
import { RollingNumber } from "@/components/ui/rolling-number"
import { ContractRings } from "@/components/map/contract-rings"
import { REFERENCE_DATE } from "@/lib/fica/dates"
import { date, integer } from "@/lib/fica/format"
import type { Region } from "@/lib/map/analysis"
import {
  agenda,
  groupRows,
  inWaves,
  listWithDates,
  parseList,
  teamCalendar,
  TEMPLATE,
  type Parsed,
  type Row,
} from "@/lib/map/groups"
import { PLACES, type EntityId } from "@/lib/map/places"
import {
  addDays,
  CASES,
  CHECKS,
  companiesFor,
  SECTORS,
  ZONE_OF,
} from "@/lib/map/return"
import { cn } from "@/lib/utils"

type Source = "atRisk" | "left" | "list"
const button =
  "inline-flex min-h-12 items-center gap-2 rounded-xl border bg-card px-5 font-semibold hover:bg-accent"

function today() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function GroupPlan({
  id,
  region,
  onRoute,
}: {
  id: EntityId
  region: Region
  onRoute: (to: EntityId | null) => void
}) {
  const name = PLACES[id].name
  const [source, setSource] = useState<Source>("atRisk")
  const [restart, setRestart] = useState(() => addDays(today(), 14))
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [fileName, setFileName] = useState("")
  const [choices, setChoices] = useState<Record<string, number>>({})
  const [capacity, setCapacity] = useState(15)
  const [perWeek, setPerWeek] = useState(5)
  const [showAll, setShowAll] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => onRoute(null), [onRoute])

  const count = (rows: Row[]) => rows.reduce((n, r) => n + r.n, 0)
  const rows: Row[] = useMemo(() => {
    if (source === "atRisk") return region.groups.atRisk
    if (source === "left") return inWaves(region.groups.left, restart, perWeek)
    return parsed?.rows ?? []
  }, [source, region, restart, perWeek, parsed])
  const from = source === "atRisk" ? REFERENCE_DATE : today()
  const groups = useMemo(() => groupRows(rows), [rows])
  const weeks = useMemo(() => agenda(rows, from), [rows, from])
  const people = count(rows)
  const over = weeks.filter((w) => sumOf(w.counts) > capacity).length
  const shown = showAll ? weeks : weeks.slice(0, 10)

  async function read(file: File) {
    setFileName(file.name)
    const text = await file.text()
    setParsed(parseList(text, [name, id, ZONE_OF[id]]))
    setChoices({})
  }

  function planText() {
    return [
      `Plano de grupo · ${name} · ${integer(people)} pessoas em ${groups.length} grupos`,
      ...groups.map((g) => {
        const c = CASES[g.caseId]
        const top = g.sectors[0]
        return [
          `${c.label} (${g.people})`,
          `  Primeiro passo: ${c.options[choices[g.caseId] ?? 0].step}`,
          top
            ? `  Empresas de ${SECTORS[top.sector]}: ${companiesFor(
                top.sector,
                id
              )
                .map((x) => `${x.name} (${x.zone})`)
                .join(", ")}`
            : "",
          `  Para não repetir: ${c.avoid}`,
        ]
          .filter(Boolean)
          .join("\n")
      }),
    ].join("\n\n")
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(planText())
      setNotice("Plano copiado.")
    } catch {
      setNotice("Não foi possível copiar. Usa Imprimir.")
    }
  }

  const sources: { id: Source; title: string; detail: string }[] = [
    {
      id: "atRisk",
      title: "Em risco agora",
      detail: `${integer(count(region.groups.atRisk))} pessoas entre os 45 e os 75 dias de contrato a 31/12/2025`,
    },
    {
      id: "left",
      title: "Saíram antes dos 6 meses",
      detail: `${integer(count(region.groups.left))} pessoas para voltar a colocar`,
    },
    {
      id: "list",
      title: "Carregar uma lista",
      detail: "Um ficheiro CSV da equipa, lido só neste computador",
    },
  ]

  return (
    <div>
      <h3 className="text-2xl font-bold tracking-tight text-balance">
        Um plano para muitas pessoas, sem as tratar uma a uma.
      </h3>
      <p className="mt-1 text-muted-foreground">
        A app junta as pessoas pela situação, propõe uma ação por grupo e
        organiza os contactos da equipa por semana.
      </p>

      <div
        role="radiogroup"
        aria-label="Quem entra no plano"
        className="mt-5 grid gap-2 sm:grid-cols-3 print:hidden"
      >
        {sources.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={source === s.id}
            onClick={() => {
              setSource(s.id)
              setChoices({})
              setNotice("")
            }}
            className="rounded-xl border bg-card p-4 text-start transition-[translate,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md aria-checked:border-primary aria-checked:bg-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="block font-semibold">{s.title}</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {s.detail}
            </span>
          </button>
        ))}
      </div>

      {source === "left" && (
        <div className="mt-4 flex flex-wrap gap-4 print:hidden">
          <label className="block text-sm text-muted-foreground">
            Primeiros recomeços a
            <input
              type="date"
              value={restart}
              onChange={(e) => e.target.value && setRestart(e.target.value)}
              className="mt-1 block min-h-12 rounded-xl border bg-card px-3 text-base text-foreground"
            />
          </label>
          <label className="block text-sm text-muted-foreground">
            Recomeços por semana
            <input
              type="number"
              min={1}
              max={500}
              value={perWeek}
              onChange={(e) =>
                setPerWeek(Math.max(1, Number(e.target.value) || 1))
              }
              className="mt-1 block min-h-12 w-28 rounded-xl border bg-card px-3 text-base text-foreground"
            />
          </label>
          <p className="basis-full text-sm text-muted-foreground">
            Recomeçam em vagas semanais, o maior grupo primeiro, para os
            contactos não caírem todos na mesma semana.
          </p>
        </div>
      )}

      {source === "list" && (
        <div className="mt-4 rounded-2xl border border-dashed p-4 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <label className={cn(button, "cursor-pointer")}>
              <FileArrowUp aria-hidden="true" />
              {fileName ? "Trocar lista" : "Escolher ficheiro CSV"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void read(file)
                  e.target.value = ""
                }}
              />
            </label>
            <button
              type="button"
              onClick={() =>
                download(
                  "modelo-lista.csv",
                  "﻿" + TEMPLATE,
                  "text/csv;charset=utf-8"
                )
              }
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Descarregar o modelo
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Colunas: codigo, barreira, contrato, setor, data_inicio e, opcional,
            data_fim (prevista) e regiao. A lista não sai deste computador.
          </p>
          {parsed && (
            <div role="status" className="mt-3 space-y-1 text-sm">
              <p>
                <b>{fileName}</b>: {integer(parsed.rows.length)} pessoas lidas
                {parsed.otherRegion > 0 &&
                  `, ${integer(parsed.otherRegion)} de outras regiões ficaram de fora`}
                .
              </p>
              {parsed.missing.length > 0 && (
                <p className="text-warning">
                  Sem coluna de{" "}
                  {parsed.missing
                    .map((m) =>
                      m === "barrier"
                        ? "barreira"
                        : m === "contract"
                          ? "contrato"
                          : "setor"
                    )
                    .join(" e ")}
                  : essas pessoas ficam em &quot;Ainda não se sabe&quot;.
                </p>
              )}
              {parsed.errors.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-warning">
                    {parsed.errors.length === 1
                      ? "1 linha com problemas"
                      : `${integer(parsed.errors.length)} linhas com problemas`}
                  </summary>
                  <ul className="mt-1 list-disc ps-5 text-muted-foreground">
                    {parsed.errors.slice(0, 20).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {people === 0 ? (
        <div className="mt-5">
          <NoData
            reason={
              source === "list"
                ? "Carrega uma lista para ver os grupos."
                : "Ninguém neste grupo, nesta região."
            }
          />
        </div>
      ) : (
        <>
          <div
            key={`banner-${source}`}
            className="rj-rise relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#075b60] via-[#0b7d80] to-[#18b8b5] p-5 text-white"
          >
            <span
              aria-hidden="true"
              className="absolute -end-8 -top-12 size-36 rounded-full bg-white/10"
            />
            <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="rj-bob grid size-14 flex-none place-items-center rounded-2xl bg-white/15">
                <UsersThree size={32} weight="fill" aria-hidden="true" />
              </span>
              <p className="text-lg">
                <b className="text-3xl tabular-nums">
                  <RollingNumber value={integer(people)} />
                </b>{" "}
                pessoas ficam em{" "}
                <b className="text-3xl tabular-nums">
                  <RollingNumber value={integer(groups.length)} />
                </b>{" "}
                grupos
                <span className="block text-sm text-white/85">
                  {groups.length} planos em vez de {integer(people)}: uma ação
                  para cada grupo.
                </span>
              </p>
            </div>
          </div>

          <ul
            key={`groups-${source}`}
            className="mt-4 grid gap-3 xl:grid-cols-2"
          >
            {groups.map((g, n) => {
              const c = CASES[g.caseId]
              const top = g.sectors[0]
              const choice = choices[g.caseId] ?? 0
              return (
                <li
                  key={g.caseId}
                  style={
                    {
                      "--rise-delay": `${120 + n * 110}ms`,
                    } as React.CSSProperties
                  }
                  className="rj-rise relative overflow-hidden rounded-2xl border bg-card p-4 transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#075b60] to-[#18b8b5]"
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="text-lg font-bold">{c.label}</h4>
                    <span className="tabular-nums">
                      <b className="text-2xl">
                        <RollingNumber value={integer(g.people)} />
                      </b>{" "}
                      <span className="text-sm text-muted-foreground">
                        pessoas
                      </span>
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <span
                      className="rj-grow block h-full rounded-full bg-primary"
                      style={
                        {
                          width: `${people ? (100 * g.people) / people : 0}%`,
                          "--grow-delay": `${300 + n * 110}ms`,
                        } as React.CSSProperties
                      }
                    />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {integer(g.temporary)} com contrato temporário
                  </p>
                  <fieldset className="mt-3">
                    <legend className="text-sm font-semibold">
                      Primeiro passo para todo o grupo
                    </legend>
                    <div className="mt-2 grid gap-2">
                      {c.options.map((o, i) => {
                        const on = i === choice
                        return (
                          <label
                            key={o.title}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                              on
                                ? "border-foreground bg-foreground text-background"
                                : "border-foreground/15 hover:border-foreground/40"
                            )}
                          >
                            <input
                              type="radio"
                              name={`step-${g.caseId}`}
                              value={i}
                              checked={on}
                              onChange={() =>
                                setChoices({ ...choices, [g.caseId]: i })
                              }
                              className="sr-only"
                            />
                            <span
                              aria-hidden="true"
                              className={cn(
                                "mt-0.5 grid size-5 flex-none place-items-center rounded-full border-2",
                                on
                                  ? "border-background"
                                  : "border-foreground/30"
                              )}
                            >
                              {on && (
                                <span className="size-2 rounded-full bg-background" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-semibold">
                                {o.title}
                              </span>
                              <span
                                className={cn(
                                  "block text-sm",
                                  on
                                    ? "text-background/75"
                                    : "text-muted-foreground"
                                )}
                              >
                                {o.step}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                  {g.sectors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold">
                        Onde já trabalharam
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        {g.sectors.slice(0, 4).map((s) => (
                          <span
                            key={s.sector}
                            className="rounded-full bg-muted px-2.5 py-0.5 text-sm"
                          >
                            {SECTORS[s.sector]} · {integer(s.n)}
                          </span>
                        ))}
                      </p>
                      {top && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Empresas de {SECTORS[top.sector].toLowerCase()}:{" "}
                          {companiesFor(top.sector, id)
                            .map(
                              (x) =>
                                `${x.name} (${x.zone === ZONE_OF[id] ? "mesma zona" : x.zone})`
                            )
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="mt-3 border-t pt-2 text-sm">
                    <b>Para não repetir:</b> {c.avoid}
                  </p>
                </li>
              )
            })}
          </ul>

          {source === "list" && <ContractRings rows={rows} today={today()} />}

          <section className="mt-6 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold">Agenda da equipa</h4>
                <p className="text-sm text-muted-foreground">
                  Contactos por semana, a partir de {date(from)}
                  {source === "atRisk" && " (último dia dos dados)"}.
                </p>
              </div>
              <label className="text-sm text-muted-foreground print:hidden">
                Contactos por semana que a equipa consegue fazer
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={capacity}
                  onChange={(e) =>
                    setCapacity(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="mt-1 block min-h-11 w-28 rounded-lg border bg-background px-2 text-base text-foreground"
                />
              </label>
            </div>
            <p className="mt-4 rounded-xl bg-accent px-4 py-3 text-sm">
              Ao todo,{" "}
              <b>
                {integer(weeks.reduce((n, w) => n + sumOf(w.counts), 0))}{" "}
                contactos
              </b>{" "}
              em{" "}
              <b>
                {integer(weeks.length)}{" "}
                {weeks.length === 1 ? "semana" : "semanas"}
              </b>
              .{" "}
              {over === 0 ? (
                <>
                  <b>Tudo cabe.</b> Nenhuma semana passa os {integer(capacity)}{" "}
                  contactos que a equipa consegue fazer.
                </>
              ) : (
                <>
                  <b className="text-warning">
                    {over === 1
                      ? "1 semana tem"
                      : `${integer(over)} semanas têm`}{" "}
                    mais contactos do que a equipa consegue fazer
                  </b>{" "}
                  ({integer(capacity)} por semana). Distribui parte desses
                  contactos pelas semanas mais leves.
                </>
              )}
            </p>
            <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {shown.map((w, n) => {
                const total = sumOf(w.counts)
                const heavy = total > capacity
                return (
                  <li
                    key={w.week}
                    style={
                      { "--rise-delay": `${n * 50}ms` } as React.CSSProperties
                    }
                    title={CHECKS.map(
                      (c, i) => `${w.counts[i]} ${c.title.toLowerCase()}`
                    ).join(", ")}
                    className={cn(
                      "rj-rise rounded-xl border-2 p-3",
                      heavy
                        ? "border-warning bg-warning/10"
                        : "border-transparent bg-muted"
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        heavy ? "text-warning" : "text-muted-foreground"
                      )}
                    >
                      {w.late
                        ? "Em atraso"
                        : `Semana de ${date(w.week).slice(0, 5)}`}
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums">
                      {integer(total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {total === 1 ? "contacto" : "contactos"}
                    </p>
                    <p
                      className={cn(
                        "mt-2 flex items-center gap-1 text-xs font-semibold",
                        heavy ? "text-warning" : "text-primary"
                      )}
                    >
                      {heavy ? (
                        <>
                          <WarningCircle weight="fill" aria-hidden="true" />
                          {integer(total - capacity)} a mais
                        </>
                      ) : (
                        <>
                          <CheckCircle weight="fill" aria-hidden="true" />
                          Cabe
                        </>
                      )}
                    </p>
                  </li>
                )
              })}
            </ol>
            {weeks.length > shown.length && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mt-3 font-semibold text-primary underline-offset-4 hover:underline print:hidden"
              >
                Ver as {weeks.length} semanas
              </button>
            )}
          </section>

          <div className="mt-4 flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={() => {
                download(
                  `agenda-${name.toLowerCase()}.ics`,
                  teamCalendar(weeks, name, crypto.randomUUID()),
                  "text/calendar"
                )
                setNotice(
                  "Calendário da equipa criado, uma entrada por semana."
                )
              }}
              className={cn(
                button,
                "border-transparent bg-primary text-primary-foreground hover:bg-primary hover:opacity-90"
              )}
            >
              <CalendarPlus aria-hidden="true" /> Calendário da equipa
            </button>
            {source === "list" && (
              <button
                type="button"
                onClick={() =>
                  download(
                    "lista-com-datas.csv",
                    listWithDates(groups, choices),
                    "text/csv;charset=utf-8"
                  )
                }
                className={button}
              >
                <DownloadSimple aria-hidden="true" /> Lista com datas
              </button>
            )}
            <button type="button" onClick={copy} className={button}>
              <Copy aria-hidden="true" /> Copiar plano
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={button}
            >
              <Printer aria-hidden="true" /> Imprimir
            </button>
          </div>
          <p role="status" className="mt-2 text-sm text-muted-foreground">
            {notice}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {source === "list"
              ? "A lista é lida no browser e não é enviada para lado nenhum. Os códigos só aparecem nos ficheiros que descarregas."
              : "Com os dados do programa só se usam totais, sem códigos de pessoas. As ações são propostas da equipa."}
          </p>
        </>
      )}
    </div>
  )
}

function sumOf(values: number[]) {
  return values.reduce((a, b) => a + b, 0)
}
