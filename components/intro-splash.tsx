"use client"

import Image from "next/image"
import { useEffect } from "react"

/** Remembered in the browser, so the intro plays on the first visit only. */
export const INTRO_KEY = "rj-intro-seen"
const SHOW_MS = 2200
const FADE_MS = 450

/**
 * The opening screen: the logo draws in, its radar rings pulse and
 * ".connect" slides out beside it, then it all fades away. Hidden by default;
 * an early script in the layout shows it only when it has never been seen.
 */
export function IntroSplash() {
  useEffect(() => {
    const root = document.documentElement
    if (!root.classList.contains("rj-intro")) return
    try {
      localStorage.setItem(INTRO_KEY, "1")
    } catch {
      // Private mode: the intro may show again next time, which is harmless.
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const show = reduce ? 600 : SHOW_MS
    const out = setTimeout(() => root.classList.add("rj-intro-out"), show)
    const done = setTimeout(
      () => root.classList.remove("rj-intro", "rj-intro-out"),
      show + FADE_MS
    )
    return () => {
      clearTimeout(out)
      clearTimeout(done)
    }
  }, [])

  return (
    <div className="rj-splash" aria-hidden="true">
      <div className="rj-splash-mark">
        <span className="rj-splash-ring" />
        <span className="rj-splash-ring rj-splash-ring-2" />
        <Image
          src="/logo-mark.png"
          alt=""
          width={120}
          height={120}
          priority
          className="rj-splash-logo dark:hidden"
        />
        <Image
          src="/logo-mark-dark.png"
          alt=""
          width={120}
          height={120}
          priority
          className="rj-splash-logo hidden dark:block"
        />
      </div>
      <p className="rj-splash-word">
        <span className="text-highlight">.</span>connect
      </p>
      <span className="rj-splash-bar" />
    </div>
  )
}
