import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { isValidPlacement } from "../fica/clean.ts"
import { retentionAt, toObservedJobs } from "../fica/retention.ts"
import type * as T from "../fica/types.ts"
import {
  BARRIERS,
  buildAnalysis,
  cellOf,
  clearlyDifferent,
  combine,
  CONTRACTS,
  nowOf,
  PERIODS,
  TRAININGS,
} from "./analysis.ts"
import { ENTITY_IDS, PLACES } from "./places.ts"

const load = <Row>(name: string): Row[] =>
  JSON.parse(
    readFileSync(
      new URL(`../../public/data/${name}.json`, import.meta.url),
      "utf8"
    )
  )
const source = {
  participants: load<T.Participant>("participantes"),
  placements: load<T.Placement>("colocacoes"),
  training: load<T.TrainingAction>("acoes_formacao"),
  contacts: load<T.RawContact>("acompanhamentos"),
}
const analysis = buildAnalysis(source)
const jobs = toObservedJobs(source.participants, source.placements)
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const combos = ENTITY_IDS.flatMap((id) =>
  PERIODS.flatMap((p) =>
    (["all", ...CONTRACTS] as const).map((contract) => ({ id, p, contract }))
  )
)

test("permanence matches the engine that was already tested", () => {
  for (const { id, p, contract } of combos) {
    const own = jobs.filter(
      (j) =>
        j.entityId === id && (contract === "all" || j.contract === contract)
    )
    const expected = retentionAt(own, p.days)
    const cell = cellOf(analysis[id], p.months, contract)
    assert.equal(cell.placed, expected.eligible)
    assert.equal(cell.stayed, expected.stayed)
  }
})

test("known figures: Lisbon at six months", () => {
  const { E03 } = analysis
  assert.deepEqual(
    [cellOf(E03, 6, "all").stayed, cellOf(E03, 6, "all").placed],
    [111, 436]
  )
  assert.deepEqual(
    [cellOf(E03, 6, "temporario").stayed, cellOf(E03, 6, "temporario").placed],
    [53, 376]
  )
  assert.deepEqual(
    [cellOf(E03, 6, "permanente").stayed, cellOf(E03, 6, "permanente").placed],
    [58, 60]
  )
})

test("every person has one barrier, so the barriers add up to the total", () => {
  const values = new Set(source.participants.map((p) => p.barreiras_emprego))
  assert.deepEqual([...values].sort(), [...BARRIERS].sort())
  for (const { id, p, contract } of combos) {
    const cell = cellOf(analysis[id], p.months, contract)
    assert.equal(sum(cell.barriers), cell.placed)
  }
})

test("training counts people, and the two sides add up to the total", () => {
  const values = new Set(source.training.map((a) => a.tipo_formacao))
  assert.deepEqual([...values].sort(), [...TRAININGS].sort())
  for (const { id, p, contract } of combos) {
    const cell = cellOf(analysis[id], p.months, contract)
    for (const t of cell.training) {
      assert.ok(t.people <= cell.placed)
      assert.ok(t.done.total <= t.people)
      assert.equal(t.done.total + t.notDone.total, cell.placed)
      assert.equal(t.done.stayed + t.notDone.stayed, cell.stayed)
    }
  }
})

test("follow-up now: each person is in exactly one state", () => {
  for (const id of ENTITY_IDS)
    for (const contract of ["all", ...CONTRACTS] as const) {
      const now = nowOf(analysis[id], contract)
      assert.equal(now.done + now.toConfirm + now.pending, now.total)
      assert.equal(sum(now.bands.map((b) => b.open)), now.total - now.done)
      assert.ok(now.referred <= now.done)
    }
  assert.equal(nowOf(analysis.E03, "all").total, 43)
})

test("follow-up past: contacts are people of the same group", () => {
  for (const { id, p, contract } of combos) {
    const cell = cellOf(analysis[id], p.months, contract)
    assert.ok(cell.past.done <= cell.placed)
    assert.ok(cell.past.referred <= cell.past.done)
  }
  assert.equal(cellOf(analysis.E03, 3, "all").past.done, 56)
})

test("nobody leaves before day 45, so everyone placed reached the window", () => {
  assert.ok(jobs.every((j) => !j.ended || j.days >= 60))
})

test("regions do not overlap and add up to the whole programme", () => {
  const regions = ENTITY_IDS.map((id) => analysis[id])
  assert.equal(sum(regions.map((r) => r.people)), source.participants.length)
  assert.equal(
    sum(regions.map((r) => r.validPlacements)),
    source.placements.filter(isValidPlacement).length
  )
  for (const id of ENTITY_IDS) {
    const { firstYear, cohort } = analysis[id]
    assert.equal(Math.round((100 * firstYear) / cohort), PLACES[id].placed)
  }
})

test("a difference is only clear when chance is very unlikely", () => {
  const share = (stayed: number, total: number) => ({ stayed, total })
  assert.equal(clearlyDifferent(share(15, 30), share(12, 30)), false)
  assert.equal(clearlyDifferent(share(53, 376), share(58, 60)), true)
  assert.equal(clearlyDifferent(share(30, 30), share(30, 30)), false)
})

test("no temporary contract reaches twelve months, as the panel says", () => {
  for (const id of ENTITY_IDS)
    assert.equal(cellOf(analysis[id], 12, "temporario").stayed, 0)
})

test("placements per company add up to the region's total", () => {
  for (const id of ENTITY_IDS)
    assert.equal(
      sum(Object.values(analysis[id].received)),
      analysis[id].validPlacements
    )
})

test("all regions together give the programme totals", () => {
  const all = combine(ENTITY_IDS.map((id) => analysis[id]))
  const six = cellOf(all, 6, "all")
  assert.deepEqual([six.stayed, six.placed], [1101, 1704])
  assert.equal(all.people, 4500)
  assert.equal(nowOf(all, "all").total, 132)
})

test("reference figures for the North, at six months", () => {
  const north = analysis.E01
  const all = cellOf(north, 6, "all")
  const share = (c: { stayed: number; placed: number }) =>
    ((100 * c.stayed) / c.placed).toFixed(1)
  assert.deepEqual(
    [all.stayed, all.placed - all.stayed, all.placed],
    [131, 32, 163]
  )
  assert.equal(share(cellOf(north, 6, "permanente")), "99.0")
  assert.equal(share(cellOf(north, 6, "temporario")), "47.5")
  assert.deepEqual(
    [north.people, north.firstYear, north.active],
    [550, 75, 192]
  )
})
