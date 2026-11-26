// The numbers behind the action plan. Checked in pilot.test.ts.

import { isValidPlacement } from "../fica/clean.ts"
import { daysBetween, REFERENCE_DATE } from "../fica/dates.ts"
import type * as T from "../fica/types.ts"
import { ENTITY_IDS, type EntityId } from "./places.ts"

/** People per group to see p1 become p2 (two-sided, 5% error, 80% power). */
export function sampleSize(p1: number, p2: number) {
  if (p1 === p2) return Infinity
  const za = 1.959964
  const zb = 0.841621
  const mean = (p1 + p2) / 2
  const n =
    (za * Math.sqrt(2 * mean * (1 - mean)) +
      zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) **
      2 /
    (p2 - p1) ** 2
  return Math.ceil(n)
}

export type Pilot = {
  /** Temporary contracts that ended, per 30-day block of time in the job. */
  exits: { block: number; lisbon: number; others: number }[]
  firstExit: { lisbon: number; others: number }
  /** Per entity: temporary placements and how many lasted 180 days. */
  entities: {
    id: EntityId
    /** Temporary placements per month in 2025. */
    perMonth: number
    temporaryShare: number
    stayed: number
    observed: number
  }[]
}

export function buildPilot(source: {
  participants: T.Participant[]
  placements: T.Placement[]
}): Pilot {
  const entityOf = new Map(
    source.participants.map((p) => [p.id, p.entidade_social_id])
  )
  const jobs = source.placements.filter(isValidPlacement).map((p) => ({
    entity: entityOf.get(p.id_participante) as EntityId,
    temporary: p.tipo_contrato === "temporario",
    start: p.data_colocacao,
    days: p.data_fim ? daysBetween(p.data_colocacao, p.data_fim) : null,
    observed: daysBetween(p.data_colocacao, REFERENCE_DATE),
  }))
  const ended = jobs.filter((j) => j.temporary && j.days !== null)
  const blocks = new Map<number, { lisbon: number; others: number }>()
  for (const j of ended) {
    const block = Math.floor(j.days! / 30) + 1
    const b = blocks.get(block) ?? { lisbon: 0, others: 0 }
    if (j.entity === "E03") b.lisbon++
    else b.others++
    blocks.set(block, b)
  }
  const last = Math.max(...blocks.keys())
  const first = (keep: (e: EntityId) => boolean) =>
    Math.min(...ended.filter((j) => keep(j.entity)).map((j) => j.days!))

  return {
    exits: Array.from({ length: last }, (_, i) => ({
      block: i + 1,
      ...(blocks.get(i + 1) ?? { lisbon: 0, others: 0 }),
    })),
    firstExit: {
      lisbon: first((e) => e === "E03"),
      others: first((e) => e !== "E03"),
    },
    entities: ENTITY_IDS.map((id) => {
      const own = jobs.filter((j) => j.entity === id)
      const temporary = own.filter((j) => j.temporary)
      const observed = temporary.filter((j) => j.observed >= 180)
      return {
        id,
        perMonth:
          temporary.filter((j) => j.start.startsWith("2025-")).length / 12,
        temporaryShare: temporary.length / own.length,
        stayed: observed.filter((j) => j.days === null || j.days >= 180).length,
        observed: observed.length,
      }
    }),
  }
}
