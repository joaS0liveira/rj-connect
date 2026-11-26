import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import type * as T from "../fica/types.ts"
import { ENTITY_IDS } from "./places.ts"
import {
  addDays,
  calendar,
  CASES,
  companiesFor,
  COMPANIES,
  SECTORS,
  ZONE_OF,
  zoneOnMap,
  type Sector,
} from "./return.ts"

const load = <Row>(name: string): Row[] =>
  JSON.parse(
    readFileSync(
      new URL(`../../public/data/${name}.json`, import.meta.url),
      "utf8"
    )
  )

test("the companies match the data", () => {
  const rows = load<T.Company>("empresas_parceiras")
  assert.deepEqual(
    COMPANIES.map((c) => [c.id, c.name, c.zone, c.sector]),
    rows.map((r) => [r.id, r.nome_ficticio, r.regiao, r.setor])
  )
  assert.deepEqual(
    Object.keys(SECTORS).sort(),
    [...new Set(rows.map((r) => r.setor))].sort()
  )
})

test("the zones of the entities match the data", () => {
  const rows = load<{ id: string; regiao: string }>("entidades_sociais")
  assert.deepEqual(
    rows.map((r) => [r.id, r.regiao]),
    ENTITY_IDS.map((id) => [id, ZONE_OF[id]])
  )
})

test("the barriers named by the cases exist in the data", () => {
  const values = new Set(
    load<T.Participant>("participantes").map((p) => p.barreiras_emprego)
  )
  for (const c of Object.values(CASES))
    if (c.barrier) assert.ok(values.has(c.barrier), c.barrier)
})

test("companies close to the region come first", () => {
  const [first] = companiesFor("comercio" as Sector, "E03")
  assert.equal(first.zone, "Lisboa")
  assert.equal(zoneOnMap("Lisboa", "E03"), "E03")
  assert.equal(zoneOnMap("Norte", "E05"), "E05")
  assert.equal(zoneOnMap("Ilhas", "E03"), "E08")
})

test("the calendar has the three checks on the right days", () => {
  const ics = calendar({
    start: "2026-01-30",
    company: "Empresa Parceira 05",
    step: "Pedir uma entrada certa, com o comboio; e o autocarro.",
    id: "abc",
  })
  assert.equal(addDays("2026-01-30", 45), "2026-03-16")
  assert.match(ics, /DTSTART;VALUE=DATE:20260316/)
  assert.match(ics, /DTSTART;VALUE=DATE:20260415/)
  assert.match(ics, /DTSTART;VALUE=DATE:20260729/)
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 3)
  assert.ok(ics.includes("certa\\, com o comboio\\; e"))
  for (const line of ics.split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75, line)
})
