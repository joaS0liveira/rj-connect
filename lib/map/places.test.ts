import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { isValidPlacement } from "../fica/clean.ts"
import { daysBetween, REFERENCE_DATE } from "../fica/dates.ts"
import { toObservedJobs } from "../fica/retention.ts"
import type * as T from "../fica/types.ts"
import { ALL, ENTITY_IDS as ids, PLACES } from "./places.ts"
import { SHAPES } from "./shapes.ts"

const load = <Row>(name: string): Row[] =>
  JSON.parse(
    readFileSync(
      new URL(`../../public/data/${name}.json`, import.meta.url),
      "utf8"
    )
  )
const participants = load<T.Participant>("participantes")
const placements = load<T.Placement>("colocacoes")
const jobs = toObservedJobs(participants, placements).filter(
  (j) => j.observed >= 180
)
const jobOf = new Map(
  placements.filter(isValidPlacement).map((p) => [p.id_participante, p])
)
const hundred = (part: number, total: number) =>
  Math.round((100 * part) / total)

test("how many jobs last 180 days", () => {
  for (const id of ids) {
    const own = jobs.filter((j) => j.entityId === id)
    const stayed = own.filter((j) => !j.ended || j.days >= 180)
    assert.equal(PLACES[id].stay, hundred(stayed.length, own.length), id)
  }
})

test("how many people get a job in the first year", () => {
  for (const id of ids) {
    const own = participants.filter(
      (p) =>
        p.entidade_social_id === id &&
        daysBetween(p.data_entrada, REFERENCE_DATE) >= 545
    )
    const placed = own.filter((p) => {
      const job = jobOf.get(p.id)
      return job && daysBetween(p.data_entrada, job.data_colocacao) <= 365
    })
    assert.equal(PLACES[id].placed, hundred(placed.length, own.length), id)
  }
})

test("the headlines hold", () => {
  const temporary = jobs.filter((j) => j.entityId === "E06")
  const share =
    temporary.filter((j) => j.contract === "temporario").length /
    temporary.length
  assert.ok(share > 0.45 && share < 0.55)
  const placed = ids.map((id) => PLACES[id].placed)
  const stay = ids.map((id) => PLACES[id].stay)
  assert.equal(PLACES.E04.placed, Math.min(...placed))
  assert.equal(PLACES.E03.stay, Math.min(...stay))
  assert.equal(PLACES.E07.stay, Math.max(...stay))
})

test("all regions together", () => {
  const stayed = jobs.filter((j) => !j.ended || j.days >= 180)
  assert.equal(ALL.stay, hundred(stayed.length, jobs.length))
  const own = participants.filter(
    (p) => daysBetween(p.data_entrada, REFERENCE_DATE) >= 545
  )
  const placed = own.filter((p) => {
    const job = jobOf.get(p.id)
    return job && daysBetween(p.data_entrada, job.data_colocacao) <= 365
  })
  assert.equal(ALL.placed, hundred(placed.length, own.length))

  const exits = jobs.filter((j) => j.ended && j.days < 180)
  const lisbon = exits.filter((j) => j.entityId === "E03")
  assert.ok(lisbon.length > exits.length / 2)
})

test("every region but the islands has a shape", () => {
  assert.deepEqual([...SHAPES.map((s) => s.id), "E08"], ids)
})
