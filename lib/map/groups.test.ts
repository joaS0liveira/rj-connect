import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import type * as T from "../fica/types.ts"
import { BARRIERS, buildAnalysis, cellOf, nowOf } from "./analysis.ts"
import {
  agenda,
  CASE_OF,
  groupRows,
  inWaves,
  listWithDates,
  parseList,
  teamCalendar,
  TEMPLATE,
  weekOf,
} from "./groups.ts"
import { ENTITY_IDS } from "./places.ts"
import { CASES } from "./return.ts"

const load = <Row>(name: string): Row[] =>
  JSON.parse(
    readFileSync(
      new URL(`../../public/data/${name}.json`, import.meta.url),
      "utf8"
    )
  )
const analysis = buildAnalysis({
  participants: load<T.Participant>("participantes"),
  placements: load<T.Placement>("colocacoes"),
  training: load<T.TrainingAction>("acoes_formacao"),
  contacts: load<T.RawContact>("acompanhamentos"),
})
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

test("the groups hold exactly the people the panel counts", () => {
  for (const id of ENTITY_IDS) {
    const { atRisk, left } = analysis[id].groups
    assert.equal(sum(atRisk.map((r) => r.n)), nowOf(analysis[id], "all").total)
    const six = cellOf(analysis[id], 6, "all")
    assert.equal(sum(left.map((r) => r.n)), six.placed - six.stayed)
  }
})

test("every barrier has a case, and grouping keeps everyone", () => {
  for (const b of BARRIERS) assert.ok(CASES[CASE_OF[b]], b)
  const rows = analysis.E03.groups.left
  const groups = groupRows(rows)
  assert.equal(sum(groups.map((g) => g.people)), sum(rows.map((r) => r.n)))
  for (const g of groups) {
    assert.ok(g.temporary <= g.people)
    assert.ok(sum(g.sectors.map((s) => s.n)) <= g.people)
  }
})

test("weeks start on Monday", () => {
  assert.equal(weekOf("2026-11-25"), "2026-11-23")
  assert.equal(weekOf("2026-11-23"), "2026-11-23")
  assert.equal(weekOf("2026-11-29"), "2026-11-23")
})

test("the agenda counts every contact once, late ones in the first week", () => {
  const rows = analysis.E03.groups.atRisk
  const weeks = agenda(rows, "2025-12-31")
  const people = sum(rows.map((r) => r.n))
  for (let i = 0; i < 3; i++)
    assert.equal(sum(weeks.map((w) => w.counts[i])), people)
  assert.equal(weeks[0].week, weekOf("2025-12-31"))
  assert.equal(weeks[0].late, true)
})

test("contacts after the end of a job are dropped", () => {
  const weeks = agenda(
    [
      {
        barrier: "distancia",
        contract: "temporario",
        sector: null,
        start: "2026-01-05",
        end: "2026-03-01",
        n: 1,
      },
    ],
    "2026-01-01"
  )
  assert.deepEqual(
    weeks.map((w) => w.counts),
    [[1, 0, 0]]
  )
})

test("a list is read, checked and kept to its own region", () => {
  const text =
    '﻿"codigo";"regiao";"barreira";"contrato";"setor";"data_inicio"\n' +
    "A1;Lisboa;Distância;Temporário;Hotelaria;2026-01-12\n" +
    "A2;lisboa;;permanente;comércio;19/01/2026\n" +
    "A3;Norte;horarios;temp;saude;2026-01-20\n" +
    "A4;Lisboa;voar;temp;saude;2026-01-20\n" +
    "A5;Lisboa;horarios;temp;saude;31/02/2026\n"
  const parsed = parseList(text, ["Lisboa", "E03"])
  assert.equal(parsed.rows.length, 2)
  assert.equal(parsed.otherRegion, 1)
  assert.equal(parsed.errors.length, 2)
  assert.deepEqual(
    parsed.rows.map((r) => [r.code, r.barrier, r.contract, r.sector, r.start]),
    [
      ["A1", "distancia", "temporario", "hotelaria", "2026-01-12"],
      ["A2", "nenhuma", "permanente", "comercio", "2026-01-19"],
    ]
  )
})

test("the template is a valid list", () => {
  const parsed = parseList(TEMPLATE, ["Lisboa"])
  assert.equal(parsed.errors.length, 0)
  assert.equal(parsed.rows.length, 3)
  assert.deepEqual(parsed.missing, [])
})

test("the program's own model, without barrier or sector, still works", () => {
  const parsed = parseList(
    '"id";"regiao";"tipo_contrato";"data_colocacao";"data_fim"\n' +
      "C1;Lisboa;temporario;2026-01-05;2026-03-01\n",
    ["Lisboa"]
  )
  assert.deepEqual(parsed.missing, ["barrier", "sector"])
  assert.equal(parsed.rows[0].barrier, "nenhuma")
  assert.equal(parsed.rows[0].end, "2026-03-01")
})

test("outputs: the team calendar and the list with dates", () => {
  const parsed = parseList(TEMPLATE, ["Lisboa"])
  const weeks = agenda(parsed.rows, "2026-01-01")
  const ics = teamCalendar(weeks, "Lisboa", "x")
  // Two contracts end before day 180, so those contacts are dropped.
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 7)
  assert.match(ics, /Códigos: A001/)
  for (const line of ics.split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75, line)
  const csv = listWithDates(groupRows(parsed.rows), {})
  assert.match(csv, /A001;Ficava longe;.*;2026-12-17;2027-01-16;\r?$/m)
  assert.match(
    csv,
    /A002;O horário não dava;.*;2026-12-24;2027-01-23;2027-05-08/
  )
})

test("restarts are spread in weekly waves, keeping everyone", () => {
  const rows = analysis.E03.groups.left
  const waves = inWaves(rows, "2026-12-07", 20)
  assert.equal(sum(waves.map((r) => r.n)), sum(rows.map((r) => r.n)))
  const perWeek = new Map<string, number>()
  for (const r of waves) perWeek.set(r.start, (perWeek.get(r.start) ?? 0) + r.n)
  assert.ok([...perWeek.values()].every((n) => n <= 20))
  assert.equal(perWeek.size, Math.ceil(sum(rows.map((r) => r.n)) / 20))
  assert.equal(
    sum(groupRows(waves).map((g) => g.people)),
    sum(groupRows(rows).map((g) => g.people))
  )
})
