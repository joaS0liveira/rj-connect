"use client"

import {
  ArrowCounterClockwise,
  Buildings,
  CalendarPlus,
  Check,
  Copy,
  MapPin,
  Printer,
  Ticket,
} from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import { date, integer } from "@/lib/fica/format"
import { BARRIERS, cellOf, type Region } from "@/lib/map/analysis"
import { PLACES, type EntityId } from "@/lib/map/places"
import {
  addDays,
  calendar,
  CASES,
  CHECKS,
  companiesFor,
  SECTORS,
  ZONE_OF,
  zoneOnMap,
  type CaseId,
  type Sector,
} from "@/lib/map/return"
import { cn } from "@/lib/utils"

type Answers = {
  caseId?: CaseId
  option?: number
  /** Every sector the person has worked in, and any other in their words. */
  sectors?: Sector[]
  otherSector?: string
  sectorsDone?: boolean
  /** A partner company's id, or OTHER with the name typed in. */
  company?: string
  otherCompany?: string
  start?: string
}

const OTHER = "other"

const STATIONS = [
  "O que aconteceu?",
  "O que fazes primeiro?",
  "Em que já trabalhou?",
  "Que empresa?",
  "Quando começa?",
] as const

const chip =
  "min-h-11 rounded-xl border bg-card px-4 py-2 text-start font-semibold transition-colors hover:border-primary aria-pressed:border-primary aria-pressed:bg-accent"

function today() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** What this region's own data says about the problem chosen. */
function evidence(region: Region, caseId: CaseId) {
  const cell = cellOf(region, 6, "all")
  const { barrier } = CASES[caseId]
  if (!barrier) {
    const temporary = cellOf(region, 6, "temporario")
    return `Nesta região, ${integer(temporary.placed - temporary.stayed)} contratos temporários acabaram antes dos 6 meses.`
  }
  const n =
    cell.barriers[BARRIERS.indexOf(barrier as (typeof BARRIERS)[number])]
  return `Nesta região, ${integer(n)} das ${integer(cell.placed)} pessoas colocadas tinham esta barreira registada.`
}

export function ReturnTrip({
  id,
  region,
  onRoute,
  companyMap,
}: {
  id: EntityId
  region: Region
  onRoute: (to: EntityId | null) => void
  /** Shown in the company step on small screens, where the page map is far below. */
  companyMap?: React.ReactNode
}) {
  const [answers, setAnswers] = useState<Answers>({ start: today() })
  const [hoveredCompany, setHoveredCompany] = useState<string | null>(null)
  const [issued, setIssued] = useState(false)
  const [notice, setNotice] = useState("")

  const step =
    answers.caseId === undefined
      ? 0
      : answers.option === undefined
        ? 1
        : !answers.sectorsDone
          ? 2
          : !answers.company ||
              (answers.company === OTHER && !answers.otherCompany?.trim())
            ? 3
            : 4
  const sectors = answers.sectors ?? []
  const otherSector = answers.otherSector?.trim() ?? ""
  const sectorLabel = [...sectors.map((x) => SECTORS[x]), otherSector]
    .filter(Boolean)
    .join(", ")
  // Partners of every sector chosen, the ones in the region's zone first.
  const companies = sectors
    .flatMap((x) => companiesFor(x, id))
    .sort(
      (a, b) => Number(b.zone === ZONE_OF[id]) - Number(a.zone === ZONE_OF[id])
    )
  const company = companies.find((c) => c.id === answers.company)
  const otherCompany =
    answers.company === OTHER ? (answers.otherCompany?.trim() ?? "") : ""
  const destination = company
    ? `${company.name} (${company.zone})`
    : otherCompany
  const previewed =
    companies.find((c) => c.id === hoveredCompany) ?? company ?? null
  const target = previewed ? zoneOnMap(previewed.zone, id) : null

  useEffect(() => {
    onRoute(target)
  }, [target, onRoute])
  useEffect(() => () => onRoute(null), [onRoute])

  /** Changing an answer clears the ones that depend on it. */
  function answer(change: Answers, from: number) {
    const keep: Answers = { start: answers.start }
    const order = ["caseId", "option", "sectorsDone", "company"] as const
    order.slice(0, from).forEach((k) => {
      ;(keep as Record<string, unknown>)[k] = answers[k]
    })
    // The sectors chosen stay ticked when the step is reopened.
    if (from >= 2) {
      keep.sectors = answers.sectors
      keep.otherSector = answers.otherSector
    }
    setAnswers({ ...keep, ...change })
    setIssued(false)
    setNotice("")
  }

  function restart() {
    setAnswers({ start: answers.start })
    setIssued(false)
    setNotice("")
  }

  const summary = [
    answers.caseId && CASES[answers.caseId].label,
    answers.caseId &&
      answers.option !== undefined &&
      CASES[answers.caseId].options[answers.option].title,
    answers.sectorsDone && sectorLabel,
    destination,
    answers.start && `Começa a ${date(answers.start)}`,
  ]

  return (
    <div>
      <h3 className="text-2xl font-bold tracking-tight text-balance">
        Ajuda uma pessoa a voltar ao trabalho, sem mais um curso.
      </h3>
      <p className="mt-1 text-muted-foreground">
        Responde a cada paragem. No fim sai um bilhete com o plano e as datas
        dos contactos, pronto para o calendário.
      </p>

      <ol className="mt-6 print:hidden">
        {STATIONS.map((title, i) => {
          const done = i < step || (i === 4 && issued)
          const current = i === step && !issued
          const last = i === STATIONS.length - 1
          return (
            <li key={title} className="relative ps-12 pb-6">
              {!last && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute start-[0.9rem] top-8 bottom-0 w-1 rounded-full transition-colors duration-500 motion-reduce:transition-none",
                    i < step ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute start-0 top-0 grid size-8 place-items-center rounded-full border-4 text-sm font-bold transition-colors",
                  done && "border-primary bg-primary text-primary-foreground",
                  current && "border-primary bg-card text-primary",
                  !done &&
                    !current &&
                    "border-muted bg-card text-muted-foreground"
                )}
              >
                {done ? <Check weight="bold" size={14} /> : i + 1}
                {current && (
                  <span className="absolute inset-[-6px] animate-ping rounded-full border-2 border-primary/40 motion-reduce:hidden" />
                )}
              </span>
              <h4
                className={cn(
                  "flex min-h-8 flex-wrap items-center gap-x-3 font-semibold",
                  !done && !current && "text-muted-foreground"
                )}
              >
                {title}
                {done && summary[i] && (
                  <span className="font-normal text-muted-foreground">
                    {summary[i]}
                  </span>
                )}
              </h4>

              {current && i === 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Object.keys(CASES) as CaseId[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={false}
                      onClick={() => answer({ caseId: c }, 0)}
                      className={chip}
                    >
                      {CASES[c].label}
                    </button>
                  ))}
                </div>
              )}

              {current && i === 1 && answers.caseId && (
                <>
                  <p className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm">
                    {evidence(region, answers.caseId)}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {CASES[answers.caseId].options.map((o, n) => (
                      <button
                        key={o.title}
                        type="button"
                        aria-pressed={false}
                        onClick={() => answer({ option: n }, 1)}
                        className={chip}
                      >
                        {o.title}
                        <span className="mt-1 block text-sm font-normal text-muted-foreground">
                          {o.step}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {current && i === 2 && (
                <>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Usar o que a pessoa já sabe fazer, em vez de um curso novo.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Escolhe todas as que se aplicam.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(SECTORS) as Sector[]).map((x) => {
                      const on = sectors.includes(x)
                      return (
                        <button
                          key={x}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            setAnswers((prev) => {
                              const list = prev.sectors ?? []
                              return {
                                ...prev,
                                sectors: list.includes(x)
                                  ? list.filter((y) => y !== x)
                                  : [...list, x],
                              }
                            })
                          }
                          className={cn(
                            chip,
                            "inline-flex items-center gap-1.5 py-1.5"
                          )}
                        >
                          {on && <Check weight="bold" aria-hidden="true" />}
                          {SECTORS[x]}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      aria-pressed={answers.otherSector !== undefined}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          otherSector:
                            prev.otherSector === undefined ? "" : undefined,
                        }))
                      }
                      className={cn(
                        chip,
                        "inline-flex items-center gap-1.5 py-1.5"
                      )}
                    >
                      {answers.otherSector !== undefined && (
                        <Check weight="bold" aria-hidden="true" />
                      )}
                      Outro
                    </button>
                  </div>
                  {answers.otherSector !== undefined && (
                    <label className="mt-3 block max-w-sm text-sm text-muted-foreground">
                      Qual?
                      <input
                        type="text"
                        autoFocus
                        maxLength={60}
                        value={answers.otherSector}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            otherSector: e.target.value,
                          }))
                        }
                        placeholder="Por exemplo: limpeza, construção"
                        className="mt-1 block min-h-11 w-full rounded-xl border bg-card px-3 text-base text-foreground"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    disabled={!sectorLabel}
                    onClick={() => answer({ sectorsDone: true }, 2)}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                  >
                    Continuar
                  </button>
                </>
              )}

              {current && i === 3 && (
                <>
                  {companyMap && (
                    <div className="mt-3 rounded-xl border bg-background p-2 lg:hidden">
                      {companyMap}
                    </div>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {companies.length
                      ? "Empresas parceiras destes setores. O mapa mostra onde fica cada uma."
                      : "Não há empresas parceiras nestes setores. Indica a empresa."}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {companies.map((c) => {
                      const near = c.zone === ZONE_OF[id]
                      const received = region.received[c.id] ?? 0
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={false}
                          onClick={() => answer({ company: c.id }, 3)}
                          onPointerEnter={(e) => {
                            if (e.pointerType === "mouse")
                              setHoveredCompany(c.id)
                          }}
                          onPointerLeave={() => setHoveredCompany(null)}
                          onFocus={() => setHoveredCompany(c.id)}
                          onBlur={() => setHoveredCompany(null)}
                          className={chip}
                        >
                          <span className="flex items-center gap-2">
                            <MapPin
                              weight="fill"
                              className="text-primary"
                              aria-hidden="true"
                            />
                            {c.name}
                          </span>
                          <span className="mt-1 block text-sm font-normal">
                            {near ? (
                              <span className="font-semibold text-primary">
                                Na mesma zona ({c.zone})
                              </span>
                            ) : (
                              <span className="font-semibold text-warning">
                                Fica em {c.zone}: confirma a deslocação
                              </span>
                            )}
                          </span>
                          <span className="block text-sm font-normal text-muted-foreground">
                            {received
                              ? `Já recebeu ${integer(received)} ${received === 1 ? "pessoa" : "pessoas"} desta região.`
                              : "Ainda não recebeu ninguém desta região."}
                          </span>
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      aria-pressed={answers.company === OTHER}
                      onClick={() => setAnswers({ ...answers, company: OTHER })}
                      className={chip}
                    >
                      Outra empresa
                      <span className="mt-1 block text-sm font-normal text-muted-foreground">
                        Uma empresa que não está na lista de parceiras.
                      </span>
                    </button>
                  </div>
                  {answers.company === OTHER && (
                    <label className="mt-3 block max-w-sm text-sm text-muted-foreground">
                      Nome da empresa
                      <input
                        type="text"
                        autoFocus
                        maxLength={80}
                        value={answers.otherCompany ?? ""}
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            otherCompany: e.target.value,
                          })
                        }
                        className="mt-1 block min-h-11 w-full rounded-xl border bg-card px-3 text-base text-foreground"
                      />
                    </label>
                  )}
                </>
              )}

              {current && i === 4 && (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="text-sm text-muted-foreground">
                    Primeiro dia de trabalho
                    <input
                      type="date"
                      value={answers.start ?? ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, start: e.target.value })
                      }
                      className="mt-1 block min-h-12 rounded-xl border bg-card px-3 text-base text-foreground"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!answers.start}
                    onClick={() => setIssued(true)}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                  >
                    <Ticket aria-hidden="true" /> Emitir bilhete
                  </button>
                </div>
              )}

              {done && !issued && (
                <button
                  type="button"
                  onClick={() => answer({}, i)}
                  className="mt-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Mudar
                </button>
              )}
            </li>
          )
        })}
      </ol>

      {issued &&
        answers.caseId &&
        answers.option !== undefined &&
        destination &&
        answers.start && (
          <Pass
            region={PLACES[id].name}
            caseId={answers.caseId}
            option={answers.option}
            sector={company ? SECTORS[company.sector] : sectorLabel}
            company={destination}
            start={answers.start}
            notice={notice}
            onNotice={setNotice}
            onRestart={restart}
          />
        )}
    </div>
  )
}

/** What the company is asked to do with its copy of the ticket. */
const FOR_COMPANY = [
  "Recebe uma cópia e confirma a data do primeiro dia.",
  "Marca na agenda os contactos dos dias 45 e 75, com a pessoa e com a chefia.",
  "Avisa a entidade logo que surja um problema, sem esperar pelo contacto.",
  "Antes do fim do contrato, diz se há renovação ou contrato permanente.",
]

function Pass({
  region,
  caseId,
  option,
  sector,
  company,
  start,
  notice,
  onNotice,
  onRestart,
}: {
  region: string
  caseId: CaseId
  option: number
  sector: string
  company: string
  start: string
  notice: string
  onNotice: (text: string) => void
  onRestart: () => void
}) {
  const c = CASES[caseId]
  const first = c.options[option]
  const stops = [
    { when: "Hoje", what: first.step },
    { when: "Esta semana", what: `Perguntar se há vaga em ${company}.` },
    {
      when: "Antes de assinar",
      what: `Perguntar se há contrato permanente. ${c.avoid}`,
    },
    { when: date(start), what: "Primeiro dia de trabalho." },
    ...CHECKS.map((check) => ({
      when: `${date(addDays(start, check.day))} · dia ${check.day}`,
      what: `${check.title}: ${check.detail}`,
    })),
  ]
  const text = [
    `Bilhete de regresso · ${region}`,
    `${c.label} → ${sector}, ${company}`,
    ...stops.map((s) => `${s.when}: ${s.what}`),
    "",
    "O que a empresa faz com este bilhete:",
    ...FOR_COMPANY.map((item, i) => `${i + 1}. ${item}`),
  ].join("\n")

  function save() {
    const ics = calendar({
      start,
      company,
      step: first.step,
      id: crypto.randomUUID(),
    })
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `regresso-${start}.ics`
    link.click()
    URL.revokeObjectURL(url)
    onNotice("Ficheiro de calendário criado, com os 3 contactos.")
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      onNotice("Bilhete copiado.")
    } catch {
      onNotice("Não foi possível copiar. Usa Imprimir.")
    }
  }

  return (
    <div className="animate-in duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none">
      <article
        aria-label="Bilhete de regresso"
        className="overflow-hidden rounded-2xl border bg-card"
      >
        <header className="relative overflow-hidden bg-gradient-to-br from-[#075b60] via-[#0b7d80] to-[#18b8b5] p-5 text-white sm:p-6">
          <span
            aria-hidden="true"
            className="absolute -end-10 -top-16 size-48 rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="absolute end-16 -bottom-20 size-40 rounded-full bg-white/10"
          />
          <p className="relative flex items-center gap-2 text-xs font-bold tracking-[0.18em] uppercase">
            <Ticket weight="fill" aria-hidden="true" /> Bilhete de regresso ·{" "}
            {region}
          </p>
          <div className="relative mt-4 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <div>
              <p className="text-xs font-semibold text-white/80 uppercase">
                De
              </p>
              <p className="text-2xl font-bold">{c.label}</p>
            </div>
            <span
              aria-hidden="true"
              className="hidden size-11 place-items-center rounded-full bg-white text-xl font-bold text-[#075b60] sm:grid"
            >
              →
            </span>
            <div>
              <p className="text-xs font-semibold text-white/80 uppercase">
                Para
              </p>
              <p className="text-2xl font-bold">{sector}</p>
              <p className="text-sm font-medium text-white/90">{company}</p>
            </div>
          </div>
          <p className="relative mt-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            Primeiro dia: {date(start)}
          </p>
        </header>
        <div
          aria-hidden="true"
          className="relative h-0 border-t-2 border-dashed border-border before:absolute before:-start-3 before:-top-3 before:size-6 before:rounded-full before:bg-background after:absolute after:-end-3 after:-top-3 after:size-6 after:rounded-full after:bg-background"
        />
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section aria-label="Plano">
            <h4 className="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
              Plano
            </h4>
            <ol className="mt-3">
              {stops.map((s, i) => {
                const contact = i > 3
                return (
                  <li
                    key={s.when}
                    className="relative grid grid-cols-[1.25rem_1fr] gap-x-3 pb-4 last:pb-0"
                  >
                    {i < stops.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute start-[0.55rem] top-5 bottom-0 w-0.5 bg-border"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative mt-1 size-3.5 rounded-full border-2",
                        contact
                          ? "border-[#18b8b5] bg-[#18b8b5]"
                          : i === 3
                            ? "border-[#075b60] bg-[#075b60]"
                            : "border-muted-foreground bg-card"
                      )}
                    />
                    <span>
                      <span
                        className={cn(
                          "block text-sm font-semibold tabular-nums",
                          contact ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {s.when}
                      </span>
                      <span className="block">{s.what}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
          <section
            aria-label="O que a empresa faz com este bilhete"
            className="rounded-2xl bg-accent p-4"
          >
            <h4 className="flex items-center gap-2 font-bold">
              <Buildings
                weight="fill"
                className="text-primary"
                aria-hidden="true"
              />
              O que a empresa faz com este bilhete
            </h4>
            <ol className="mt-3 space-y-2.5 text-sm">
              {FOR_COMPANY.map((item, i) => (
                <li key={item} className="grid grid-cols-[1.5rem_1fr] gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </article>
      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={save}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90"
        >
          <CalendarPlus aria-hidden="true" /> Guardar no calendário
        </button>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border bg-card px-5 font-semibold hover:bg-accent"
        >
          <Copy aria-hidden="true" /> Copiar
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border bg-card px-5 font-semibold hover:bg-accent"
        >
          <Printer aria-hidden="true" /> Imprimir
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border bg-card px-5 font-semibold hover:bg-accent"
        >
          <ArrowCounterClockwise aria-hidden="true" /> Novo bilhete
        </button>
      </div>
      <p role="status" className="mt-2 text-sm text-muted-foreground">
        {notice}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        As ideias são propostas da equipa. As empresas e as contagens vêm dos
        dados. O bilhete não guarda nomes nem dados da pessoa.
      </p>
    </div>
  )
}
