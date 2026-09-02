import { useEffect } from 'react'

// A pig that dashes across the screen once — celebration for approvals/earnings.
export default function PigRun({ onDone, duration = 1500 }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), duration)
    return () => clearTimeout(t)
  }, [onDone, duration])

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none overflow-hidden">
      <div className="pig-run absolute" style={{ top: '52%' }}>
        <span className="absolute right-full top-2 text-3xl opacity-60">💨</span>
        <span className="pig-bob inline-block text-6xl" style={{ animationDuration: '0.28s' }}>🐷</span>
      </div>
    </div>
  )
}
