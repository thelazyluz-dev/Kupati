import { useEffect, useRef, useState } from 'react'

/**
 * A number that rolls smoothly from its previous value to the new one (counting
 * up or down with easing) instead of jumping — gives balances a tangible feel.
 *
 * value    — the target number
 * format   — optional (n) => string for display (e.g. formatNumber)
 * duration — ms of the roll (default 650)
 */
export default function AnimatedNumber({ value, format, duration = 650, className, style }) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef  = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const to   = Number(value) || 0
    if (from === to) return   // already showing the target

    const start = performance.now()
    cancelAnimationFrame(rafRef.current)
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)   // easeOutCubic
      const cur = from + (to - from) * eased
      setDisplay(cur)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(to)
        fromRef.current = to
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Round to 1 decimal while rolling so it reads as counting, not flickering.
  const rounded = Math.round(display * 10) / 10
  const shown = format ? format(rounded) : String(Math.round(display))
  return <span className={className} style={style}>{shown}</span>
}
