import { readFileSync } from "node:fs"
import path from "node:path"

/** Reads a data table at build time. Only ever imported by server pages. */
export function loadTable<Row>(name: string): Row[] {
  return JSON.parse(
    readFileSync(
      path.join(process.cwd(), "public", "data", `${name}.json`),
      "utf8"
    )
  )
}
