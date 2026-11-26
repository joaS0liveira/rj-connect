import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { cleanContacts } from "./clean.ts"
import { parseDate } from "./dates.ts"
import * as format from "./format.ts"
import type * as T from "./types.ts"

const load = <Row>(name: string): Row[] =>
  JSON.parse(
    readFileSync(
      new URL(`../../public/data/${name}.json`, import.meta.url),
      "utf8"
    )
  )

const rawContacts = load<T.RawContact>("acompanhamentos")
const cleaned = cleanContacts(rawContacts)
const count = (status: T.DateStatus) =>
  cleaned.contacts.filter((c) => c.dateStatus === status).length

test("contacts: repeats, median and spike", () => {
  assert.equal(rawContacts.length, 25_969)
  assert.equal(cleaned.contacts.length, 25_430)
  assert.equal(cleaned.removed.length, 539)
  assert.equal(cleaned.medianPerDay, 20)
  assert.equal(cleaned.spikeDays.size, 9)
})

test("contacts: date status", () => {
  assert.equal(count("unreliable"), 12_030)
  assert.equal(count("certain"), 10_679)
  assert.equal(count("converted"), 2_721)
  assert.equal(cleaned.converted, 5_209)
  assert.ok(
    cleaned.contacts.every(
      (c) => (c.date === null) === (c.dateStatus === "unreliable")
    )
  )
})

test("contacts: ignored results and to confirm", () => {
  assert.equal(cleaned.ignoredResults, 9_333)
  assert.equal(cleaned.contacts.filter((c) => c.toConfirm).length, 5_091)
  assert.ok(
    cleaned.contacts.every((c) => !c.result || c.raw.estado === "realizado")
  )
})

test("dates: day first, and impossible dates are rejected", () => {
  assert.equal(parseDate("05/03/2025"), "2025-03-05")
  assert.equal(parseDate("2025-03-05"), "2025-03-05")
  assert.equal(parseDate("03/25/2025"), null)
  assert.equal(parseDate("2025-02-30"), null)
  assert.equal(parseDate(""), null)
})

test("numbers are written the Portuguese way", () => {
  const plain = (text: string) => text.replace(/\s/g, " ")
  assert.equal(plain(format.percent(0.227)), "22,7%")
  assert.equal(plain(format.integer(1223)), "1 223")
  assert.equal(format.date("2025-12-31"), "31/12/2025")
})
