import { cleanContacts, isValidPlacement } from "../fica/clean.ts"
import { daysBetween, parseDate, REFERENCE_DATE } from "../fica/dates.ts"
import type * as T from "../fica/types.ts"
import { ENTITY_IDS, type EntityId } from "./places.ts"
import { COMPANIES, type Sector } from "./return.ts"

// Counts per region, period and contract. Everything is a plain count of
// people, so two contracts can be added up and no rate is ever averaged.

export const PERIODS = [
  { months: 3, days: 90 },
  { months: 6, days: 180 },
  { months: 12, days: 365 },
] as const
export type Months = (typeof PERIODS)[number]["months"]

export const CONTRACTS = ["permanente", "temporario"] as const
export type ContractFilter = "all" | T.ContractType

export const BARRIERS = [
  "experiencia",
  "documentacao",
  "horarios",
  "distancia",
  "nenhuma",
] as const

export const TRAININGS = [
  "formacao_tecnica",
  "acolhimento",
  "formacao_complementar",
  "estagio",
] as const

/** The contact window, in days since the start of the contract. */
export const WINDOW = { from: 45, to: 75 }

/** Days in the job, for the people to contact now. The last is the most urgent. */
export const BANDS = [
  { from: 65, to: 75 },
  { from: 55, to: 64 },
  { from: 45, to: 54 },
] as const

/** Below this a comparison is not shown. */
export const MIN_GROUP = 20

export type Share = { total: number; stayed: number }

export type Cell = {
  placed: number
  stayed: number
  /** One per barrier, in the order of BARRIERS. Each person has exactly one. */
  barriers: number[]
  /** One per training, in the order of TRAININGS. People may have several. */
  training: {
    people: number
    /** Finished one of this type before being placed. */
    done: Share
    notDone: Share
  }[]
  /** Contacts made between day 45 and 75, by this same group. */
  past: { done: number; referred: number }
}

export type Now = {
  total: number
  /** Contacted in the window, on a date that can be trusted. */
  done: number
  /** Their only contact falls on the suspicious days of December 2025. */
  toConfirm: number
  pending: number
  referred: number
  /** Without a confirmed contact, per band. */
  bands: { open: number; temporary: number }[]
}

export type Region = {
  people: number
  /** People who entered at least 545 days ago, and those placed in a year. */
  cohort: number
  firstYear: number
  validPlacements: number
  /** People in groups, as counts. No codes and no names. */
  groups: {
    /** Employed for 45 to 75 days on the last day of the data. */
    atRisk: GroupRow[]
    /** Observed for 180 days, and left before. */
    left: GroupRow[]
  }
  /** Valid placements of this region, per partner company. */
  received: Record<string, number>
  active: number
  cells: Record<Months, Record<T.ContractType, Cell>>
  now: Record<T.ContractType, Now>
}

/** A number of people who share a barrier, a contract, a sector and a start. */
export type GroupRow = {
  barrier: string
  contract: T.ContractType
  sector: Sector | null
  start: string
  n: number
}

export type Analysis = Record<EntityId, Region>

export type Source = {
  participants: T.Participant[]
  placements: T.Placement[]
  training: T.TrainingAction[]
  contacts: T.RawContact[]
}

const addShare = (a: Share, b: Share): Share => ({
  total: a.total + b.total,
  stayed: a.stayed + b.stayed,
})

export function addCells(a: Cell, b: Cell): Cell {
  return {
    placed: a.placed + b.placed,
    stayed: a.stayed + b.stayed,
    barriers: a.barriers.map((n, i) => n + b.barriers[i]),
    training: a.training.map((t, i) => ({
      people: t.people + b.training[i].people,
      done: addShare(t.done, b.training[i].done),
      notDone: addShare(t.notDone, b.training[i].notDone),
    })),
    past: {
      done: a.past.done + b.past.done,
      referred: a.past.referred + b.past.referred,
    },
  }
}

function addNow(a: Now, b: Now): Now {
  return {
    total: a.total + b.total,
    done: a.done + b.done,
    toConfirm: a.toConfirm + b.toConfirm,
    pending: a.pending + b.pending,
    referred: a.referred + b.referred,
    bands: a.bands.map((x, i) => ({
      open: x.open + b.bands[i].open,
      temporary: x.temporary + b.bands[i].temporary,
    })),
  }
}

export function cellOf(
  region: Region,
  months: Months,
  contract: ContractFilter
): Cell {
  const cells = region.cells[months]
  return contract === "all"
    ? addCells(cells.permanente, cells.temporario)
    : cells[contract]
}

export function nowOf(region: Region, contract: ContractFilter): Now {
  return contract === "all"
    ? addNow(region.now.permanente, region.now.temporario)
    : region.now[contract]
}

/**
 * Whether two shares differ beyond chance. Strict (p < 0.001) because the
 * panel compares many groups at once.
 */
export function clearlyDifferent(a: Share, b: Share) {
  const pooled = (a.stayed + b.stayed) / (a.total + b.total)
  const error = Math.sqrt(pooled * (1 - pooled) * (1 / a.total + 1 / b.total))
  if (!error) return false
  return Math.abs(a.stayed / a.total - b.stayed / b.total) / error > 3.29
}

export function buildAnalysis(source: Source): Analysis {
  const entityOf = new Map(
    source.participants.map((p) => [p.id, p.entidade_social_id])
  )
  const barrierOf = new Map(
    source.participants.map((p) => [p.id, p.barreiras_emprego])
  )
  const valid = source.placements.filter(isValidPlacement)
  const placementOf = new Map(valid.map((p) => [p.id_participante, p]))

  const anyTraining = new Map<string, Set<string>>()
  const doneBefore = new Map<string, Set<string>>()
  const note = (map: Map<string, Set<string>>, a: T.TrainingAction) => {
    const set = map.get(a.id_participante) ?? new Set()
    map.set(a.id_participante, set.add(a.tipo_formacao))
  }
  for (const a of source.training) {
    note(anyTraining, a)
    const job = placementOf.get(a.id_participante)
    const end = parseDate(a.data_fim)
    if (job && a.conclusao && end && end <= job.data_colocacao)
      note(doneBefore, a)
  }

  // Contacts that took place inside the window of each person's contract.
  const inWindow = new Map<string, { reliable: boolean; referred: boolean }[]>()
  for (const c of cleanContacts(source.contacts).contacts) {
    const job = placementOf.get(c.raw.id_participante)
    const date = parseDate(c.raw.data)
    if (!job || !date || c.raw.estado !== "realizado") continue
    const day = daysBetween(job.data_colocacao, date)
    if (day < WINDOW.from || day > WINDOW.to) continue
    const list = inWindow.get(job.id_participante) ?? []
    list.push({
      reliable: c.dateStatus !== "unreliable",
      referred: !!c.raw.encaminhamento,
    })
    inWindow.set(job.id_participante, list)
  }
  const contactOf = (person: string) => {
    const all = inWindow.get(person) ?? []
    const reliable = all.filter((c) => c.reliable)
    return {
      done: reliable.length > 0,
      toConfirm: reliable.length === 0 && all.length > 0,
      referred: reliable.some((c) => c.referred),
    }
  }

  const jobs = valid.map((p) => ({
    company: p.id_empresa,
    start: p.data_colocacao,
    person: p.id_participante,
    entity: entityOf.get(p.id_participante),
    contract: p.tipo_contrato,
    ended: p.data_fim !== null && p.data_fim !== "",
    days: daysBetween(p.data_colocacao, p.data_fim || REFERENCE_DATE),
    observed: daysBetween(p.data_colocacao, REFERENCE_DATE),
  }))
  type Job = (typeof jobs)[number]

  function cell(rows: Job[], horizon: number): Cell {
    const group = rows.filter((j) => j.observed >= horizon)
    const stayed = (j: Job) => !j.ended || j.days >= horizon
    const share = (list: Job[]): Share => ({
      total: list.length,
      stayed: list.filter(stayed).length,
    })
    const contacts = group.map((j) => contactOf(j.person))
    return {
      placed: group.length,
      stayed: group.filter(stayed).length,
      barriers: BARRIERS.map(
        (b) => group.filter((j) => barrierOf.get(j.person) === b).length
      ),
      training: TRAININGS.map((t) => ({
        people: group.filter((j) => anyTraining.get(j.person)?.has(t)).length,
        done: share(group.filter((j) => doneBefore.get(j.person)?.has(t))),
        notDone: share(group.filter((j) => !doneBefore.get(j.person)?.has(t))),
      })),
      past: {
        done: contacts.filter((c) => c.done).length,
        referred: contacts.filter((c) => c.referred).length,
      },
    }
  }

  function now(rows: Job[]): Now {
    const group = rows.filter(
      (j) => !j.ended && j.observed >= WINDOW.from && j.observed <= WINDOW.to
    )
    const people = group.map((j) => ({ ...j, ...contactOf(j.person) }))
    const open = people.filter((p) => !p.done)
    return {
      total: people.length,
      done: people.filter((p) => p.done).length,
      toConfirm: people.filter((p) => p.toConfirm).length,
      pending: people.filter((p) => !p.done && !p.toConfirm).length,
      referred: people.filter((p) => p.referred).length,
      bands: BANDS.map(({ from, to }) => {
        const band = open.filter((p) => p.observed >= from && p.observed <= to)
        return {
          open: band.length,
          temporary: band.filter((p) => p.contract === "temporario").length,
        }
      }),
    }
  }

  const sectorOf = new Map(COMPANIES.map((c) => [c.id, c.sector]))
  function rowsOf(rows: Job[]): GroupRow[] {
    const counts = new Map<string, GroupRow>()
    for (const j of rows) {
      const row: GroupRow = {
        barrier: barrierOf.get(j.person) ?? "nenhuma",
        contract: j.contract,
        sector: sectorOf.get(j.company) ?? null,
        start: j.start,
        n: 0,
      }
      const key = [row.barrier, row.contract, row.sector, row.start].join("|")
      const found = counts.get(key) ?? row
      found.n++
      counts.set(key, found)
    }
    return [...counts.values()]
  }

  const perContract = <Value>(rows: Job[], f: (rows: Job[]) => Value) => ({
    permanente: f(rows.filter((j) => j.contract === "permanente")),
    temporario: f(rows.filter((j) => j.contract === "temporario")),
  })

  return Object.fromEntries(
    ENTITY_IDS.map((id): [EntityId, Region] => {
      const people = source.participants.filter(
        (p) => p.entidade_social_id === id
      )
      const own = jobs.filter((j) => j.entity === id)
      const cohort = people.filter(
        (p) => daysBetween(p.data_entrada, REFERENCE_DATE) >= 545
      )
      return [
        id,
        {
          people: people.length,
          cohort: cohort.length,
          firstYear: cohort.filter((p) => {
            const job = placementOf.get(p.id)
            return job && daysBetween(p.data_entrada, job.data_colocacao) <= 365
          }).length,
          validPlacements: own.length,
          groups: {
            atRisk: rowsOf(
              own.filter(
                (j) =>
                  !j.ended &&
                  j.observed >= WINDOW.from &&
                  j.observed <= WINDOW.to
              )
            ),
            left: rowsOf(
              own.filter((j) => j.observed >= 180 && j.ended && j.days < 180)
            ),
          },
          received: Object.fromEntries(
            [...new Set(own.map((j) => j.company))].map((c) => [
              c,
              own.filter((j) => j.company === c).length,
            ])
          ),
          active: own.filter((j) => !j.ended).length,
          cells: {
            3: perContract(own, (r) => cell(r, 90)),
            6: perContract(own, (r) => cell(r, 180)),
            12: perContract(own, (r) => cell(r, 365)),
          },
          now: perContract(own, now),
        },
      ]
    })
  ) as Analysis
}

/** Several regions as one, for "Todas as regiões". Counts are summed. */
export function combine(regions: Region[]): Region {
  const sumOf = (pick: (r: Region) => number) =>
    regions.reduce((n, r) => n + pick(r), 0)
  const received: Record<string, number> = {}
  for (const r of regions)
    for (const [company, n] of Object.entries(r.received))
      received[company] = (received[company] ?? 0) + n
  const cells = (months: Months) => ({
    permanente: regions.map((r) => r.cells[months].permanente).reduce(addCells),
    temporario: regions.map((r) => r.cells[months].temporario).reduce(addCells),
  })
  return {
    people: sumOf((r) => r.people),
    cohort: sumOf((r) => r.cohort),
    firstYear: sumOf((r) => r.firstYear),
    validPlacements: sumOf((r) => r.validPlacements),
    active: sumOf((r) => r.active),
    received,
    groups: {
      atRisk: regions.flatMap((r) => r.groups.atRisk),
      left: regions.flatMap((r) => r.groups.left),
    },
    cells: { 3: cells(3), 6: cells(6), 12: cells(12) },
    now: {
      permanente: regions.map((r) => r.now.permanente).reduce(addNow),
      temporario: regions.map((r) => r.now.temporario).reduce(addNow),
    },
  }
}
