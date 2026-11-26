// Quality and stability of placements, by entity, company and contract.
// Only counts leave the server. Checked in stability.test.ts.

import { cleanContacts, isValidPlacement } from "../fica/clean.ts"
import { daysBetween, parseDate, REFERENCE_DATE } from "../fica/dates.ts"
import type * as T from "../fica/types.ts"
import { PERIODS, type Months } from "./analysis.ts"

export type PeriodCount = {
  /** Observed long enough: the only ones a rate may use. */
  eligible: number
  /** Still in the job at the end of the period. */
  stayed: number
  /** Not observed long enough yet: never counted as an exit. */
  tracking: number
}

export type StabilityCell = {
  entity: string
  company: string
  contract: T.ContractType
  /** Every record, valid or not. */
  records: number
  /** Records that cannot be used, such as an end before the start. */
  invalid: number
  /** Records with a reference that does not exist, kept in the rates. */
  unknownRef: number
  /** Records with either problem, each counted once. */
  flagged: number
  periods: Record<Months, PeriodCount>
}

export type Severity = "high" | "medium" | "low" | "ok"

export type Check = {
  id: string
  label: string
  table: string
  cases: number
  base: number
  severity: Severity
  action: string
}

export type Stability = {
  cells: StabilityCell[]
  checks: Check[]
  companies: { id: string; name: string; known: boolean }[]
  entities: { id: string; name: string }[]
}

export type StabilitySource = {
  participants: T.Participant[]
  placements: (T.Placement & { estado_colocacao?: string })[]
  companies: T.Company[]
  entities: { id: string; nome: string }[]
  contacts: T.RawContact[]
  history: { id_colocacao: string; tipo_evento: string }[]
}

export function buildStability(source: StabilitySource): Stability {
  const entityOf = new Map(
    source.participants.map((p) => [p.id, p.entidade_social_id])
  )
  const entryOf = new Map(
    source.participants.map((p) => [p.id, p.data_entrada])
  )
  const knownCompany = new Set(source.companies.map((c) => c.id))
  const knownEntity = new Set(source.entities.map((e) => e.id))

  const cells = new Map<string, StabilityCell>()
  for (const p of source.placements) {
    const entity = entityOf.get(p.id_participante) ?? "?"
    const key = [entity, p.id_empresa, p.tipo_contrato].join("|")
    const cell =
      cells.get(key) ??
      ({
        entity,
        company: p.id_empresa,
        contract: p.tipo_contrato,
        records: 0,
        invalid: 0,
        unknownRef: 0,
        flagged: 0,
        periods: { 3: empty(), 6: empty(), 12: empty() },
      } satisfies StabilityCell)
    cells.set(key, cell)
    cell.records++
    if (!knownCompany.has(p.id_empresa)) cell.unknownRef++
    if (!knownCompany.has(p.id_empresa) || !isValidPlacement(p)) cell.flagged++
    if (!isValidPlacement(p)) {
      cell.invalid++
      continue
    }
    const observed = daysBetween(p.data_colocacao, REFERENCE_DATE)
    const days = daysBetween(p.data_colocacao, p.data_fim || REFERENCE_DATE)
    for (const { months, days: horizon } of PERIODS) {
      const count = cell.periods[months]
      if (observed < horizon) count.tracking++
      else {
        count.eligible++
        if (!p.data_fim || days >= horizon) count.stayed++
      }
    }
  }

  const placements = source.placements
  const total = placements.length
  const starts = new Map<string, number>()
  for (const h of source.history)
    if (h.tipo_evento === "inicio")
      starts.set(h.id_colocacao, (starts.get(h.id_colocacao) ?? 0) + 1)
  const withHistory = new Set(source.history.map((h) => h.id_colocacao))
  const sameRecord = new Set<string>()
  let duplicates = 0
  for (const p of placements) {
    const key = [p.id_participante, p.id_empresa, p.data_colocacao].join("|")
    if (sameRecord.has(key)) duplicates++
    sameRecord.add(key)
  }
  const count = (keep: (p: (typeof placements)[number]) => boolean) =>
    placements.filter(keep).length
  const badDate = (value: string | null) =>
    value !== null && value !== "" && parseDate(value) !== value
  const contacts = cleanContacts(source.contacts)

  const found: Check[] = [
    {
      id: "end-before-start",
      label: "Data de fim anterior à data de início",
      table: "Colocações",
      cases: count((p) => !isValidPlacement(p)),
      base: total,
      severity: "high",
      action: "Fora das taxas, sinalizado para revisão. Não foi corrigido.",
    },
    {
      id: "unknown-company",
      label: "Empresa que não existe na lista de parceiras",
      table: "Colocações",
      cases: count((p) => !knownCompany.has(p.id_empresa)),
      base: total,
      severity: "medium",
      action: "Mantido nas taxas; à parte na análise por empresa.",
    },
    {
      id: "repeated-start",
      label: "Evento de início repetido no histórico",
      table: "Histórico de emprego",
      cases: [...starts.values()].filter((n) => n > 1).length,
      base: total,
      severity: "medium",
      action: "O histórico não é usado para medir a permanência.",
    },
    {
      id: "no-history",
      label: "Colocação sem nenhum evento no histórico",
      table: "Histórico de emprego",
      cases: count((p) => !withHistory.has(p.id)),
      base: total,
      severity: "low",
      action: "Sinalizado. As taxas usam as datas da colocação.",
    },
    {
      id: "exit-without-reason",
      label: "Saída sem motivo registado",
      table: "Colocações",
      cases: count((p) => !!p.data_fim && !p.motivo_saida),
      base: total,
      severity: "low",
      action: "Mantido. Conta como saída, sem motivo.",
    },
    {
      id: "state-mismatch",
      label: "Estado da colocação diferente das datas",
      table: "Colocações",
      cases: count(
        (p) =>
          p.estado_colocacao !== undefined &&
          (p.estado_colocacao === "ativa") !== !p.data_fim
      ),
      base: total,
      severity: "ok",
      action: "Nenhum caso.",
    },
    {
      id: "invalid-date",
      label: "Datas inválidas ou fora do formato",
      table: "Colocações",
      cases: count((p) => badDate(p.data_colocacao) || badDate(p.data_fim)),
      base: total,
      severity: "ok",
      action: "Nenhum caso.",
    },
    {
      id: "after-reference",
      label: "Datas depois do fim dos dados (31/12/2025)",
      table: "Colocações",
      cases: count(
        (p) =>
          p.data_colocacao > REFERENCE_DATE ||
          (!!p.data_fim && p.data_fim > REFERENCE_DATE)
      ),
      base: total,
      severity: "ok",
      action: "Nenhum caso.",
    },
    {
      id: "before-entry",
      label: "Colocação antes da entrada no programa",
      table: "Colocações",
      cases: count((p) => {
        const entry = entryOf.get(p.id_participante)
        return !!entry && p.data_colocacao < entry
      }),
      base: total,
      severity: "ok",
      action: "Nenhum caso.",
    },
    {
      id: "duplicate",
      label: "Colocações repetidas (mesma pessoa, empresa e data)",
      table: "Colocações",
      cases: duplicates,
      base: total,
      severity: "ok",
      action: "Nenhum caso.",
    },
    {
      id: "missing-field",
      label: "Campos obrigatórios em falta",
      table: "Colocações",
      cases: count(
        (p) =>
          !p.id_participante ||
          !p.id_empresa ||
          !p.data_colocacao ||
          !p.tipo_contrato
      ),
      base: total,
      severity: "ok",
      action: "Nenhum caso.",
    },
    {
      id: "unknown-person",
      label: "Pessoa ou entidade que não existe",
      table: "Colocações",
      cases: count((p) => {
        const entity = entityOf.get(p.id_participante)
        return !entity || !knownEntity.has(entity)
      }),
      base: total,
      severity: "ok",
      action: "Nenhum caso.",
    },
    {
      id: "contact-duplicates",
      label: "Contactos repetidos",
      table: "Acompanhamentos",
      cases: contacts.removed.length,
      base: source.contacts.length,
      severity: "medium",
      action: "Contados uma vez.",
    },
    {
      id: "contact-spike",
      label: "Contactos concentrados entre 22 e 30/12/2025",
      table: "Acompanhamentos",
      cases: contacts.contacts.filter((c) => c.dateStatus === "unreliable")
        .length,
      base: contacts.contacts.length,
      severity: "high",
      action: "As datas destes contactos não são usadas.",
    },
    {
      id: "contact-format",
      label: "Datas em dois formatos (dd/mm/aaaa)",
      table: "Acompanhamentos",
      cases: contacts.converted,
      base: contacts.contacts.length,
      severity: "low",
      action: "Convertidas para aaaa-mm-dd.",
    },
  ]
  const checks: Check[] = found.map((c): Check =>
    c.severity !== "ok" && c.cases === 0
      ? { ...c, severity: "ok" as const }
      : c.severity === "ok" && c.cases > 0
        ? {
            ...c,
            severity: "medium" as const,
            action: "Sinalizado para revisão.",
          }
        : c
  )

  return {
    cells: [...cells.values()],
    checks,
    companies: [
      ...source.companies.map((c) => ({
        id: c.id,
        name: c.nome_ficticio,
        known: true,
      })),
      ...[...new Set(placements.map((p) => p.id_empresa))]
        .filter((id) => !knownCompany.has(id))
        .map((id) => ({ id, name: `${id} (não reconhecida)`, known: false })),
    ],
    entities: source.entities.map((e) => ({ id: e.id, name: e.nome })),
  }
}

function empty(): PeriodCount {
  return { eligible: 0, stayed: 0, tracking: 0 }
}

// ---- Reading the counts on the client ------------------------------------

export type StabilityFilter = {
  entity: string
  company: string
  contract: "all" | T.ContractType
}

export const ANY = "all"

export function select(
  cells: StabilityCell[],
  f: Partial<StabilityFilter>
): StabilityCell[] {
  return cells.filter(
    (c) =>
      (!f.entity || f.entity === ANY || c.entity === f.entity) &&
      (!f.company || f.company === ANY || c.company === f.company) &&
      (!f.contract || f.contract === ANY || c.contract === f.contract)
  )
}

export type Totals = {
  records: number
  invalid: number
  unknownRef: number
  flagged: number
  periods: Record<Months, PeriodCount>
}

export function totals(cells: StabilityCell[]): Totals {
  const out: Totals = {
    records: 0,
    invalid: 0,
    unknownRef: 0,
    flagged: 0,
    periods: { 3: empty(), 6: empty(), 12: empty() },
  }
  for (const c of cells) {
    out.records += c.records
    out.invalid += c.invalid
    out.unknownRef += c.unknownRef
    out.flagged += c.flagged
    for (const { months } of PERIODS) {
      out.periods[months].eligible += c.periods[months].eligible
      out.periods[months].stayed += c.periods[months].stayed
      out.periods[months].tracking += c.periods[months].tracking
    }
  }
  return out
}

/**
 * What a company's rate would be if each of its placements stayed as often as
 * the others of the same entity and contract. Above or below this is only
 * called clear when chance is very unlikely (p < 0.001).
 */
export function expectedFor(
  cells: StabilityCell[],
  company: string,
  months: Months
) {
  const rateOf = new Map<string, { eligible: number; stayed: number }>()
  for (const c of cells) {
    const key = `${c.entity}|${c.contract}`
    const r = rateOf.get(key) ?? { eligible: 0, stayed: 0 }
    r.eligible += c.periods[months].eligible
    r.stayed += c.periods[months].stayed
    rateOf.set(key, r)
  }
  let n = 0
  let observed = 0
  let expected = 0
  let variance = 0
  for (const c of cells) {
    if (c.company !== company) continue
    const { eligible, stayed } = c.periods[months]
    const r = rateOf.get(`${c.entity}|${c.contract}`)!
    const p = r.eligible ? r.stayed / r.eligible : 0
    n += eligible
    observed += stayed
    expected += eligible * p
    variance += eligible * p * (1 - p)
  }
  const z = variance ? (observed - expected) / Math.sqrt(variance) : 0
  return {
    eligible: n,
    rate: n ? observed / n : 0,
    expectedRate: n ? expected / n : 0,
    verdict: Math.abs(z) > 3.29 ? (z > 0 ? "above" : "below") : "within",
  } as const
}
