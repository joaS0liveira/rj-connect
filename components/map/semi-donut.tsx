"use client"

import { motion, useInView, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { EASE_OUT } from "@/lib/motion-tokens"
import { integer, percent } from "@/lib/fica/format"
import { cn } from "@/lib/utils"

export type Slice = { id: string; label: string; value: number; color: string }

const CX = 120
const CY = 112
const OUTER = 100
const INNER = 64
/** Degrees of empty space between two segments. */
const GAP = 1.6
const INTRO_MS = 1300
/** Share of the intro between the start of two segments, and one segment's length. */
const STAGGER = 0.11
const SEGMENT = 0.45

const clamp = (n: number) => Math.min(1, Math.max(0, n))
const easeOut = (n: number) => 1 - (1 - n) ** 3
function easeOutBack(n: number) {
  const c = 1.4
  return 1 + (c + 1) * (n - 1) ** 3 + c * (n - 1) ** 2
}

function point(deg: number, r: number) {
  // 180° is the left end, 0° the right end; the arc runs over the top.
  const a = (deg * Math.PI) / 180
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const
}

function arc(from: number, to: number, outer = OUTER) {
  const [x1, y1] = point(from, outer)
  const [x2, y2] = point(to, outer)
  const [x3, y3] = point(to, INNER)
  const [x4, y4] = point(from, INNER)
  const large = from - to > 180 ? 1 : 0
  return `M${x1} ${y1}A${outer} ${outer} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${INNER} ${INNER} 0 ${large} 0 ${x4} ${y4}Z`
}

/**
 * Parts of a whole as segments of a half ring, the share written on each one
 * and the total in the middle. Every slice is also listed with its count, so
 * nothing relies on colour alone.
 */
export function SemiDonut({
  slices,
  total,
  totalLabel,
}: {
  slices: Slice[]
  total: number
  totalLabel: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const chart = useRef<SVGSVGElement>(null)
  const visible = useInView(chart, { once: true, amount: 0.45 })
  const reduced = useReducedMotion()
  const active = slices.find((slice) => slice.id === (hover ?? selected))
  // Intro progress, 0 to 1: segments open one after another, then the labels.
  const [t, setT] = useState(0)
  const progress = reduced ? 1 : t
  useEffect(() => {
    if (!visible || reduced) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const next = Math.min(1, (now - start) / INTRO_MS)
      setT(next)
      if (next < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [visible, reduced])
  const done = progress >= 1
  const transition = { duration: reduced || !done ? 0 : 0.4, ease: EASE_OUT }
  const sweeps = slices.map((s) => (total ? (180 * s.value) / total : 0))
  const parts = slices.map((s, i) => {
    const from = 180 - sweeps.slice(0, i).reduce((a, b) => a + b, 0)
    const local = clamp((progress - i * STAGGER) / SEGMENT)
    return { ...s, from, to: from - sweeps[i], sweep: sweeps[i], local }
  })
  const shownTotal = Math.round(total * easeOut(clamp(progress / 0.8)))

  return (
    <div>
      <svg
        ref={chart}
        viewBox="0 0 240 128"
        className="mx-auto block w-full max-w-sm overflow-visible"
        role="img"
        aria-label={`${totalLabel}: ${slices
          .map((s) => `${s.label} ${integer(s.value)}`)
          .join(", ")}`}
      >
        {parts.map((p) => {
          if (p.sweep <= 0 || p.local <= 0) return null
          const gap = Math.min(GAP, p.sweep / 2) / 2
          const grow = easeOut(p.local)
          // A slight overshoot of the outer edge, settling back.
          const outer = INNER + (OUTER - INNER) * easeOutBack(p.local)
          const lifted = active?.id === p.id ? 5 : 0
          return (
            <motion.path
              key={p.id}
              initial={false}
              animate={{
                d: arc(
                  p.from - gap,
                  p.from - gap - (p.sweep - 2 * gap) * grow,
                  outer + lifted
                ),
              }}
              transition={transition}
              fill={p.color}
              onPointerEnter={() => setHover(p.id)}
              onPointerLeave={() => setHover(null)}
              className={cn(
                "transition-opacity motion-reduce:transition-none",
                active && active.id !== p.id && "opacity-45"
              )}
            />
          )
        })}
        {parts.map((p) => {
          if (p.sweep < 12) return null
          const [x, y] = point((p.from + p.to) / 2, (OUTER + INNER) / 2)
          return (
            <motion.text
              key={p.id}
              initial={false}
              animate={{ x, y: y + 4 }}
              transition={transition}
              opacity={clamp((p.local - 0.65) / 0.35)}
              className="pointer-events-none"
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="#ffffff"
              stroke="rgb(0 0 0 / 0.25)"
              strokeWidth={2}
              paintOrder="stroke"
              aria-hidden="true"
            >
              {Math.round((100 * p.value) / total)}%
            </motion.text>
          )
        })}
        <text
          x={CX}
          y={CY - 14}
          textAnchor="middle"
          fontSize={26}
          fontWeight={700}
          className="fill-foreground tabular-nums"
          aria-hidden="true"
        >
          {integer(active?.value ?? shownTotal)}
        </text>
        <text
          x={CX}
          y={CY + 2}
          textAnchor="middle"
          fontSize={10}
          className="fill-muted-foreground"
          aria-hidden="true"
        >
          {active?.label ?? totalLabel}
        </text>
      </svg>
      <ul className="mx-auto mt-3 grid max-w-sm gap-y-1 text-sm">
        {slices.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              aria-pressed={selected === s.id}
              onClick={() => {
                setHover(null)
                setSelected(selected === s.id ? null : s.id)
              }}
              onPointerEnter={() => setHover(s.id)}
              onPointerLeave={() => setHover(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded px-1 text-start focus-visible:outline-2 focus-visible:outline-ring",
                active?.id === s.id && "bg-accent"
              )}
            >
              <span
                aria-hidden="true"
                className="size-2.5 flex-none rounded-full"
                style={{ background: s.color }}
              />
              <span className="flex-1">{s.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {integer(s.value)} · {total ? percent(s.value / total) : "—"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
