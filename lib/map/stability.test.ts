import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { retentionAt, toObservedJobs } from "../fica/retention.ts"
import type * as T from "../fica/types.ts"
import { PERIODS } from "./analysis.ts"
import {
  buildStability,
  expectedFor,
  select,
  totals,
  type StabilitySource,
} from "./stability.ts"

const load = <Row>(name: string): Row[] =>
  JSON.parse(
    readFileSync(
      new URL(`../../public/data/${name}.json`, import.meta.url),
      "utf8"
    )
  )
const source: StabilitySource = {
  participants: load<T.Participant>("participantes"),
  placements: load<T.Placement>("colocacoes"),
  companies: load<T.Company>("empresas_parceiras"),
  entities: load<{ id: string; nome: string }>("entidades_sociais"),
  contacts: load<T.RawContact>("acompanhamentos"),
  history: load<{ id_colocacao: string; tipo_evento: string }>(
    "historico_emprego"
  ),
}
const stability = buildStability(source)
const jobs = toObservedJobs(source.participants, source.placements)
const check = (id: string) => stability.checks.find((c) => c.id === id)!

test("every record is counted once: eligible, tracking or invalid", () => {
  const all = totals(stability.cells)
  assert.equal(all.records, source.placements.length)
  for (const { months } of PERIODS) {
    const p = all.periods[months]
    assert.equal(p.eligible + p.tracking + all.invalid, all.records)
  }
})

test("rates use only eligible placements, like the tested engine", () => {
  for (const { months, days } of PERIODS)
    for (const contract of ["permanente", "temporario"] as const)
      for (const entity of ["E03", "E07"]) {
        const own = jobs.filter(
          (j) => j.entityId === entity && j.contract === contract
        )
        const expected = retentionAt(own, days)
        const got = totals(select(stability.cells, { entity, contract }))
          .periods[months]
        assert.equal(got.eligible, expected.eligible)
        assert.equal(got.stayed, expected.stayed)
      }
  const six = totals(stability.cells).periods[6]
  assert.deepEqual([six.stayed, six.eligible], [1101, 1704])
})

test("recent placements are tracked, never counted as exits", () => {
  const twelve = totals(stability.cells).periods[12]
  const recent = jobs.filter((j) => j.observed < 365)
  assert.equal(twelve.tracking, recent.length)
  assert.ok(recent.some((j) => !j.ended))
})

test("the data problems found", () => {
  assert.equal(check("end-before-start").cases, 46)
  assert.equal(check("unknown-company").cases, 100)
  assert.equal(check("exit-without-reason").cases, 170)
  assert.equal(check("repeated-start").cases, 1109)
  assert.equal(check("contact-duplicates").cases, 539)
  assert.equal(check("contact-spike").cases, 12030)
  for (const id of [
    "duplicate",
    "missing-field",
    "invalid-date",
    "before-entry",
    "state-mismatch",
  ])
    assert.equal(check(id).cases, 0, id)
  assert.ok(
    stability.checks.every((c) => (c.cases === 0) === (c.severity === "ok"))
  )
})

test("the unknown company is listed apart, invalid records are not deleted", () => {
  const p99 = stability.companies.find((c) => c.id === "P99")
  assert.equal(p99?.known, false)
  assert.equal(totals(stability.cells).invalid, 46)
  assert.equal(totals(stability.cells).unknownRef, 100)
  // Six records have both problems, so they are counted once.
  assert.equal(totals(stability.cells).flagged, 140)
})

test("a company is compared with what its entities and contracts predict", () => {
  for (const c of stability.companies) {
    const e = expectedFor(stability.cells, c.id, 6)
    assert.ok(e.expectedRate >= 0 && e.expectedRate <= 1)
    assert.equal(e.verdict, "within", c.id)
  }
  const lisbonOnly = select(stability.cells, { entity: "E03" })
  const e = expectedFor(lisbonOnly, "P01", 6)
  assert.ok(e.eligible > 0)
})
