import { useEffect, useState } from 'react'

// Stars that shoot upward from the bottom
const SHOOTERS = Array.from({ length: 14 }, (_, i) => ({
  left:  `${6 + i * 6.5}%`,
  delay: `${(i * 0.12).toFixed(2)}s`,
  dur:   `${0.7 + (i % 4) * 0.2}s`,
  size:  `${1.1 + (i % 3) * 0.4}rem`,
}))

// Decorative ambient stars in background
const BG_STARS = [
  { x: '8%',  y: '12%', size: '2rem',   delay: '0s',    drift: '3.2s' },
  { x: '85%', y: '8%',  size: '2.5rem', delay: '0.1s',  drift: '2.8s' },
  { x: '4%',  y: '68%', size: '1.5rem', delay: '0.2s',  drift: '3.6s' },
  { x: '88%', y: '62%', size: '2rem',   delay: '0.15s', drift: '3s'   },
  { x: '48%', y: '4%',  size: '1.8rem', delay: '0.05s', drift: '2.5s' },
  { x: '18%', y: '82%', size: '2rem',   delay: '0.25s', drift: '3.4s' },
  { x: '72%', y: '78%', size: '1.5rem', delay: '0.18s', drift: '2.7s' },
]

// onUndo is optional — if provided, shows an undo button for 4s
export default function SuccessOverlay({ name, amount, description, choreEmoji, onDone, onUndo }) {
  const [fading,    setFading]    = useState(false)
  const [undoGone,  setUndoGone]  = useState(false)
  const DISPLAY_MS = 4000
  const UNDO_MS    = 4000

  useEffect(() => {
    const dismiss = () => { setFading(true); setTimeout(onDone, 280) }
    const auto    = setTimeout(dismiss, DISPLAY_MS)
    const hideUndo = onUndo ? setTimeout(() => setUndoGone(true), UNDO_MS) : null
    return () => { clearTimeout(auto); clearTimeout(hideUndo) }
  }, [onDone, onUndo])

  function handleDismiss() {
    if (fading) return
    setFading(true)
    setTimeout(onDone, 280)
  }

  function handleUndo(e) {
    e.stopPropagation()
    if (fading) return
    onUndo?.()
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-white text-center px-6 transition-opacity duration-300 overflow-hidden ${fading ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(145deg, #f59e0b 0%, #fb923c 45%, #f43f5e 100%)' }}
      onClick={handleDismiss}
    >
      {/* Shooting stars from bottom */}
      {SHOOTERS.map((s, i) => (
        <span
          key={i}
          className="absolute pointer-events-none select-none"
          style={{
            left: s.left,
            bottom: '-10%',
            fontSize: s.size,
            animation: `shoot-up ${s.dur} ease-out both`,
            animationDelay: s.delay,
          }}
        >⭐</span>
      ))}

      {/* Ambient background stars */}
      {BG_STARS.map((s, i) => (
        <span
          key={`bg-${i}`}
          className="absolute pointer-events-none select-none"
          style={{
            left: s.x, top: s.y, fontSize: s.size,
            opacity: 0.28,
            animation: `float ${s.drift} ease-in-out infinite`,
            animationDelay: s.delay,
          }}
        >⭐</span>
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        {/* Chore emoji + star */}
        <div className="flex items-center justify-center gap-3 mb-1">
          {choreEmoji && (
            <span className="text-6xl animate-pop drop-shadow-lg" style={{ animationDelay: '0.05s' }}>
              {choreEmoji}
            </span>
          )}
          <span className="text-8xl animate-star-burst drop-shadow-lg">⭐</span>
          {choreEmoji && (
            <span className="text-6xl animate-pop drop-shadow-lg" style={{ animationDelay: '0.1s', transform: 'scaleX(-1)' }}>
              {choreEmoji}
            </span>
          )}
        </div>

        {/* Headline */}
        <h2 className="text-4xl font-black animate-pop drop-shadow">כל הכבוד!</h2>
        {name && (
          <p className="text-2xl font-bold opacity-90 animate-slide-up" style={{ animationDelay: '0.08s', animationFillMode: 'both' }}>
            {name} 🎉
          </p>
        )}

        {/* Amount card */}
        <div
          className="bg-white/25 backdrop-blur-sm rounded-3xl px-10 py-5 shadow-lg animate-slide-up"
          style={{ animationDelay: '0.14s', animationFillMode: 'both' }}
        >
          <p className="text-6xl font-black tracking-tight animate-pop" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            +{amount}⭐
          </p>
          {description && (
            <p className="text-lg opacity-90 mt-2 font-semibold">{description}</p>
          )}
        </div>

        {/* Hint */}
        <p
          className="text-sm opacity-50 animate-fade-in mt-1"
          style={{ animationDelay: '0.7s', animationFillMode: 'both' }}
        >
          לחץ להמשך
        </p>
      </div>

      {/* Undo — isolated at bottom-start corner, small, far from main tap zone */}
      {onUndo && !undoGone && (
        <button
          onClick={handleUndo}
          className="absolute bottom-8 start-6 bg-black/20 hover:bg-black/30 active:scale-95 transition-all rounded-xl px-3 py-1.5 text-xs font-medium border border-white/15 opacity-70 animate-fade-in"
          style={{ animationDelay: '0.8s', animationFillMode: 'both' }}
        >
          ↩️ בטל בטעות
        </button>
      )}
    </div>
  )
}
