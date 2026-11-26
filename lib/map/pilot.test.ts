import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import type * as T from "../fica/types.ts"
import { buildPilot, sampleSize } from "./pilot.ts"

const load = <Row>(name: string): Row[] =>
  JSON.parse(
    readFileSync(
      new URL(`../../public/data/${name}.json`, import.meta.url),
      "utf8"
    )
  )
const pilot = buildPilot({
  participants: load<T.Participant>("participantes"),
  placements: load<T.Placement>("colocacoes"),
})

test("sample size for 14% to 34% is 71 per group", () => {
  assert.equal(sampleSize(0.14, 0.34), 71)
  assert.ok(sampleSize(0.14, 0.24) > sampleSize(0.14, 0.34))
  assert.equal(sampleSize(0.3, 0.3), Infinity)
})

test("first exits: day 60 in Lisbon, day 90 elsewhere", () => {
  assert.deepEqual(pilot.firstExit, { lisbon: 60, others: 90 })
})

test("Lisbon's worst block is days 60 to 89; overall it is days 90 to 119", () => {
  const worst = (key: "lisbon" | "others" | "all") =>
    [...pilot.exits].sort(
      (a, b) =>
        (key === "all" ? b.lisbon + b.others : b[key]) -
        (key === "all" ? a.lisbon + a.others : a[key])
    )[0].block
  assert.equal(worst("lisbon"), 3)
  assert.equal(worst("all"), 4)
  assert.equal(pilot.exits.find((b) => b.block === 3)?.lisbon, 109)
})

test("Lisbon: 53 of 376 temporaries lasted 180 days, about 28 a month", () => {
  const lisbon = pilot.entities.find((e) => e.id === "E03")!
  assert.deepEqual([lisbon.stayed, lisbon.observed], [53, 376])
  assert.equal(Math.round(lisbon.perMonth), 28)
})
