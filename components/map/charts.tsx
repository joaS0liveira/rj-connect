export function NoData({ reason }: { reason?: string }) {
  return (
    <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
      <strong className="text-foreground">Sem dados disponíveis.</strong>{" "}
      {reason}
    </p>
  )
}

export function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-2.5 flex-none rounded-full align-middle"
      style={{ background: color }}
    />
  )
}

export const STAYED = "var(--chart-1)"
export const LEFT = "var(--chart-2)"

/** Parts of a whole. The numbers are always written next to it. */
export function StackBar({
  parts,
}: {
  parts: { value: number; color: string }[]
}) {
  return (
    <div aria-hidden="true" className="flex h-3 gap-0.5">
      {parts
        .filter((p) => p.value > 0)
        .map((p, i) => (
          <span
            key={i}
            className="min-w-1 rounded-sm transition-[flex-grow] duration-300 motion-reduce:transition-none"
            style={{ flexGrow: p.value, flexBasis: 0, background: p.color }}
          />
        ))}
    </div>
  )
}
