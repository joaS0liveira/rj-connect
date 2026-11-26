import { cn } from "@/lib/utils"
import type { ContractFilter, Months } from "@/lib/map/analysis"

export type FilterState = { months: Months; contract: ContractFilter }

const MONTHS: { value: Months; label: string }[] = [
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 12, label: "12 meses" },
]
const CONTRACT: { value: ContractFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "permanente", label: "Permanentes" },
  { value: "temporario", label: "Temporários" },
]

export function Segmented<Value extends string | number>({
  label,
  options,
  value,
  onChange,
  compact = false,
}: {
  label: string
  options: { value: Value; label: string }[]
  value: Value
  onChange: (value: Value) => void
  compact?: boolean
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-full border border-foreground/20 p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full font-semibold text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-foreground aria-pressed:text-background",
            compact
              ? "min-h-9 px-2.5 text-xs sm:px-3"
              : "min-h-10 px-3 text-sm sm:px-4"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Filters({
  value,
  onChange,
  compact = false,
}: {
  value: FilterState
  onChange: (change: Partial<FilterState>) => void
  compact?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Segmented
        label="Período de permanência"
        options={MONTHS}
        value={value.months}
        onChange={(months) => onChange({ months })}
        compact={compact}
      />
      <Segmented
        label="Tipo de contrato"
        options={CONTRACT}
        value={value.contract}
        onChange={(contract) => onChange({ contract })}
        compact={compact}
      />
    </div>
  )
}
