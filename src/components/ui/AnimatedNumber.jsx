import { useEffect, useRef, useState } from 'react'

/**
 * A number that rolls smoothly from its previous value to the new one (counting
 * up or down with easing) instead of jumping — gives balances a tangible feel.
 *
 * value    — the target number
 * format   — optional (n) => string for display (e.g. formatNumber)
 * duration — ms of the roll (default 650)
 */
export default function AnimatedNumber({ value, format, duration = 650, className, style, celebrate = false, celebrateJump = 5 }) {
  const [display, setDisplay] = useState(value)
  const [tumble, setTumble]   = useState(false)
  const fromRef = useRef(value)
  const rafRef  = useRef(0)
  const tumbleTimer = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const to   = Number(value) || 0
    if (from === to) return   // already showing the target

    // Big jump up → roll a little pig across the number (deferred so we don't
    // setState synchronously inside the effect).
    if (celebrate && to - from >= celebrateJump) {
      clearTimeout(tumbleTimer.current)
      setTimeout(() => setTumble(true), 0)
      tumbleTimer.current = setTimeout(() => setTumble(false), 1000)
    }

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

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); clearTimeout(tumbleTimer.current) }, [])

  // Round to 1 decimal while rolling so it reads as counting, not flickering.
  const rounded = Math.round(display * 10) / 10
  const shown = format ? format(rounded) : String(Math.round(display))
  if (!celebrate) return <span className={className} style={style}>{shown}</span>
  return (
    <span className={className} style={{ position: 'relative', ...style }}>
      {shown}
      {tumble && (
        <span className="pig-tumble absolute text-xl pointer-events-none"
          style={{ right: '-0.2em', top: '-0.9em' }}>🐷</span>
      )}
    </span>
  )
}
