// Planning for many people at once: one plan per group, one agenda for the team.

import { parseDate } from "../fica/dates.ts"
import type { ContractType } from "../fica/types.ts"
import type { GroupRow } from "./analysis.ts"
import {
  addDays,
  CASES,
  CHECKS,
  SECTORS,
  type CaseId,
  type Sector,
} from "./return.ts"

/** A group row, with the team's own code when it comes from a list. */
export type Row = Omit<GroupRow, "contract"> & {
  contract: ContractType | null
  code?: string
  /** When the job ended, for lists that have it. */
  end?: string | null
}

export const CASE_OF: Record<string, CaseId> = {
  experiencia: "experience",
  documentacao: "papers",
  horarios: "schedule",
  distancia: "distance",
  nenhuma: "unknown",
}

export type Group = {
  caseId: CaseId
  rows: Row[]
  people: number
  temporary: number
  /** Sectors where these people worked, the most frequent first. */
  sectors: { sector: Sector; n: number }[]
}

const sum = (rows: Row[], keep: (r: Row) => boolean = () => true) =>
  rows.filter(keep).reduce((total, r) => total + r.n, 0)

export function groupRows(rows: Row[]): Group[] {
  const byCase = new Map<CaseId, Row[]>()
  for (const r of rows) {
    const id = CASE_OF[r.barrier] ?? "unknown"
    byCase.set(id, [...(byCase.get(id) ?? []), r])
  }
  return [...byCase]
    .map(([caseId, list]) => {
      const sectors = new Map<Sector, number>()
      for (const r of list)
        if (r.sector) sectors.set(r.sector, (sectors.get(r.sector) ?? 0) + r.n)
      return {
        caseId,
        rows: list,
        people: sum(list),
        temporary: sum(list, (r) => r.contract === "temporario"),
        sectors: [...sectors]
          .map(([sector, n]) => ({ sector, n }))
          .sort((a, b) => b.n - a.n),
      }
    })
    .sort((a, b) => b.people - a.people)
}

/**
 * Spreads restarts over weeks, so the team is not flooded: at most perWeek
 * people start each week, the largest group first.
 */
export function inWaves(rows: Row[], first: string, perWeek: number): Row[] {
  const order = groupRows(rows).flatMap((g) => g.rows)
  const out: Row[] = []
  let week = 0
  let room = perWeek
  for (const r of order) {
    let left = r.n
    while (left > 0) {
      const n = Math.min(left, room)
      out.push({ ...r, start: addDays(first, week * 7), n })
      left -= n
      room -= n
      if (room === 0) {
        week++
        room = perWeek
      }
    }
  }
  return out
}

/** Monday of the week of a date. */
export function weekOf(iso: string) {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return addDays(iso, -((day + 6) % 7))
}

export type Week = {
  week: string
  /** One count per check in CHECKS. */
  counts: number[]
  late: boolean
  codes: string[][]
}

/**
 * The contacts of every person, counted per week. Contacts that should
 * already have happened go into the first week, marked as late. Contacts
 * after the end of a job are dropped.
 */
export function agenda(rows: Row[], from: string): Week[] {
  const weeks = new Map<string, Week>()
  const first = weekOf(from)
  for (const r of rows)
    CHECKS.forEach((check, i) => {
      const day = addDays(r.start, check.day)
      if (r.end && r.end < day) return
      const late = day < from
      const key = late ? first : weekOf(day)
      const week = weeks.get(key) ?? {
        week: key,
        counts: CHECKS.map(() => 0),
        late: false,
        codes: CHECKS.map(() => []),
      }
      week.counts[i] += r.n
      week.late ||= late
      if (r.code) week.codes[i].push(r.code)
      weeks.set(key, week)
    })
  return [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week))
}

// ---- Lists the team uploads -------------------------------------------

const plain = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

const COLUMNS: Record<string, string[]> = {
  code: ["codigo", "id", "id_participante", "participante"],
  region: ["regiao", "entidade", "entidade_social_id"],
  barrier: ["barreira", "barreiras_emprego", "barreiras"],
  contract: ["contrato", "tipo_contrato"],
  sector: ["setor", "sector"],
  start: ["data_inicio", "data_colocacao", "inicio"],
  end: ["data_fim", "fim"],
}

const BARRIER_WORDS: Record<string, string> = {
  experiencia: "experiencia",
  "falta de experiencia": "experiencia",
  documentacao: "documentacao",
  documentos: "documentacao",
  horarios: "horarios",
  horario: "horarios",
  distancia: "distancia",
  transporte: "distancia",
  nenhuma: "nenhuma",
  "nao identificado": "nenhuma",
  "nao identificados": "nenhuma",
  "": "nenhuma",
}

export const TEMPLATE =
  "codigo;barreira;contrato;setor;data_inicio;data_fim\n" +
  "A001;distancia;temporario;hotelaria;2026-11-02;2027-02-01\n" +
  "A002;horarios;permanente;comercio;2026-11-09;\n" +
  "A003;documentacao;temporario;saude;2026-10-19;2027-01-18\n"

function split(line: string, separator: string) {
  const cells: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"' && quoted && line[i + 1] === '"') {
      cell += '"'
      i++
    } else if (ch === '"') quoted = !quoted
    else if (ch === separator && !quoted) {
      cells.push(cell)
      cell = ""
    } else cell += ch
  }
  cells.push(cell)
  return cells.map((c) => c.trim())
}

export type Parsed = {
  rows: Row[]
  /** "Linha 4: data em falta" and the like. */
  errors: string[]
  /** Rows of other regions, left out. */
  otherRegion: number
  /** Columns the list did not have, so they count as unknown. */
  missing: string[]
}

export const MAX_ROWS = 5000

/** Reads a CSV list in the browser. Nothing is sent anywhere. */
export function parseList(text: string, regionNames: string[]): Parsed {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim())
  const result: Parsed = { rows: [], errors: [], otherRegion: 0, missing: [] }
  if (lines.length < 2) {
    result.errors.push("A lista está vazia.")
    return result
  }
  const separator = lines[0].includes(";") ? ";" : ","
  const header = split(lines[0], separator).map(plain)
  const at = Object.fromEntries(
    Object.entries(COLUMNS).map(([key, names]) => [
      key,
      header.findIndex((h) => names.includes(h)),
    ])
  )
  if (at.start < 0) {
    result.errors.push("Falta a coluna data_inicio (ou data_colocacao).")
    return result
  }
  result.missing = ["barrier", "contract", "sector"].filter((k) => at[k] < 0)
  const own = new Set(regionNames.map(plain))

  for (const [index, line] of lines.slice(1, MAX_ROWS + 1).entries()) {
    const cells = split(line, separator)
    const get = (key: string) => (at[key] >= 0 ? (cells[at[key]] ?? "") : "")
    const number = index + 2
    if (at.region >= 0 && get("region") && !own.has(plain(get("region")))) {
      result.otherRegion++
      continue
    }
    const start = parseDate(get("start"))
    if (!start) {
      result.errors.push(`Linha ${number}: data de início inválida.`)
      continue
    }
    const barrier = BARRIER_WORDS[plain(get("barrier"))]
    if (!barrier) {
      result.errors.push(`Linha ${number}: barreira desconhecida.`)
      continue
    }
    const contractWord = plain(get("contract"))
    const contract = contractWord.startsWith("temp")
      ? "temporario"
      : contractWord.startsWith("perm")
        ? "permanente"
        : null
    const sectorWord = plain(get("sector"))
    const sector =
      (Object.keys(SECTORS) as Sector[]).find(
        (s) => s === sectorWord || plain(SECTORS[s]) === sectorWord
      ) ?? null
    result.rows.push({
      code: get("code") || `Linha ${number}`,
      barrier,
      contract,
      sector,
      start,
      end: parseDate(get("end")),
      n: 1,
    })
  }
  if (lines.length - 1 > MAX_ROWS)
    result.errors.push(`Só foram lidas as primeiras ${MAX_ROWS} linhas.`)
  return result
}

// ---- Outputs -------------------------------------------------------------

const escape = (text: string) => text.replace(/([\\,;])/g, "\\$1")
const fold = (line: string) => line.match(/.{1,60}/gu)?.join("\r\n ") ?? line

/** One event per week and check, with the number of contacts. */
export function teamCalendar(weeks: Week[], region: string, id: string) {
  const compact = (iso: string) => iso.replaceAll("-", "")
  const events = weeks.flatMap((w) =>
    CHECKS.flatMap((check, i) => {
      if (!w.counts[i]) return []
      const codes = w.codes[i].length
        ? ` Códigos: ${w.codes[i].join(", ")}.`
        : ""
      return [
        "BEGIN:VEVENT",
        `UID:${id}-${w.week}-${check.day}@rj.connect`,
        `DTSTAMP:${compact(w.week)}T000000Z`,
        `DTSTART;VALUE=DATE:${compact(w.week)}`,
        `DTEND;VALUE=DATE:${compact(addDays(w.week, 5))}`,
        `SUMMARY:${escape(`RJ.connect · ${region}: ${w.counts[i]} contactos do dia ${check.day}${w.late ? " (inclui em atraso)" : ""}`)}`,
        `DESCRIPTION:${escape(`${check.title}: ${check.detail}${codes}`)}`,
        "END:VEVENT",
      ]
    })
  )
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RJ.connect//Plano de grupo//PT",
    ...events,
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n")
}

/** The list back, with each person's group, first step and contact dates. */
export function listWithDates(
  groups: Group[],
  choices: Record<string, number>
) {
  const lines = [
    "codigo;grupo;primeiro_passo;" +
      CHECKS.map((c) => `dia_${c.day}`).join(";"),
  ]
  for (const g of groups)
    for (const r of g.rows) {
      const step = CASES[g.caseId].options[choices[g.caseId] ?? 0].step
      const dates = CHECKS.map((c) => {
        const day = addDays(r.start, c.day)
        return r.end && r.end < day ? "" : day
      })
      lines.push(
        [r.code ?? "", CASES[g.caseId].label, step, ...dates]
          .map((v) => (/[;"\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v))
          .join(";")
      )
    }
  return "﻿" + lines.join("\r\n")
}
