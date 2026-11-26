import { PLACES, type EntityId } from "@/lib/map/places"

/**
 * The regions for a <select>, grouped like the map: Norte with the Minho,
 * Sul with Lisboa, the Alentejo and the Algarve. Groups keep the closed box
 * showing just the name, with no indent marks.
 */
const GROUPS: { label: string | null; ids: EntityId[] }[] = [
  { label: "Norte", ids: ["E01", "E05"] },
  { label: null, ids: ["E02"] },
  { label: "Sul", ids: ["E04", "E03", "E06", "E07"] },
  { label: null, ids: ["E08"] },
]

export function RegionOptions() {
  return GROUPS.map(({ label, ids }) => {
    const options = ids.map((id, i) => (
      <option key={id} value={id}>
        {label && i === 0 ? `${PLACES[id].name} (todo)` : PLACES[id].name}
      </option>
    ))
    return label ? (
      <optgroup key={label} label={label}>
        {options}
      </optgroup>
    ) : (
      options
    )
  })
}
