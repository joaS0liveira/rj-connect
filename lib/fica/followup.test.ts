import assert from "node:assert/strict"
import { test } from "node:test"
import {
  contactDates,
  DEMO_END,
  DEMO_START,
  suggestAction,
} from "../followup.ts"

test("schedules the first contact, anticipates renewal and records the 180-day milestone", () => {
  assert.deepEqual(contactDates(DEMO_START, DEMO_END), {
    first: "2026-11-25",
    second: "2026-12-20",
    outcome: "2027-04-09",
  })
})

test("a refused renewal changes the action and brings the review forward", () => {
  const adjustment = suggestAction("transport", "pending", DEMO_END)
  const transition = suggestAction("transport", "declined", DEMO_END)
  assert.equal(adjustment.owner, "Empresa")
  assert.equal(transition.owner, "Entidade de acompanhamento")
  assert.ok(transition.review < adjustment.review)
  assert.equal(
    suggestAction("transport", "declined", "2026-11-26").review,
    "2026-11-26"
  )
})

test("keeps short contracts in view before the usual first contact", () => {
  const dates = contactDates(DEMO_START, "2026-10-17")
  assert.equal(dates.first, DEMO_START)
  assert.equal(dates.second, DEMO_START)
})
