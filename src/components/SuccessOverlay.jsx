import { useEffect, useState } from 'react'

// Decorative stars scattered in the background
const BG_STARS = [
  { x: '8%',  y: '12%', size: '2rem',   delay: '0s',    drift: '3.2s' },
  { x: '85%', y: '8%',  size: '2.5rem', delay: '0.1s',  drift: '2.8s' },
  { x: '4%',  y: '68%', size: '1.5rem', delay: '0.2s',  drift: '3.6s' },
  { x: '88%', y: '62%', size: '2rem',   delay: '0.15s', drift: '3s'   },
  { x: '48%', y: '4%',  size: '1.8rem', delay: '0.05s', drift: '2.5s' },
  { x: '18%', y: '82%', size: '2rem',   delay: '0.25s', drift: '3.4s' },
  { x: '72%', y: '78%', size: '1.5rem', delay: '0.18s', drift: '2.7s' },
  { x: '60%', y: '20%', size: '1.2rem', delay: '0.3s',  drift: '3.8s' },
  { x: '30%', y: '55%', size: '1rem',   delay: '0.22s', drift: '4s'   },
]

export default function SuccessOverlay({ name, amount, description, onDone }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const dismiss = () => { setFading(true); setTimeout(onDone, 280) }
    const t = setTimeout(dismiss, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  function handleClick() {
    if (fading) return
    setFading(true)
    setTimeout(onDone, 280)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-white text-center px-6 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(145deg, #f59e0b 0%, #fb923c 45%, #f43f5e 100%)' }}
      onClick={handleClick}
    >
      {/* Floating background stars */}
      {BG_STARS.map((s, i) => (
        <span
          key={i}
          className="absolute pointer-events-none select-none"
          style={{
            left: s.x, top: s.y, fontSize: s.size,
            opacity: 0.35,
            animation: `float ${s.drift} ease-in-out infinite`,
            animationDelay: s.delay,
          }}
        >
          ⭐
        </span>
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Hero star */}
        <div className="text-8xl mb-3 animate-star-burst drop-shadow-lg">⭐</div>

        {/* Headline */}
        <h2 className="text-4xl font-black mb-1 animate-pop drop-shadow">כל הכבוד!</h2>
        {name && (
          <p className="text-2xl font-bold opacity-90 animate-slide-up mb-4" style={{ animationDelay: '0.08s', animationFillMode: 'both' }}>
            {name} 🎉
          </p>
        )}

        {/* Amount card */}
        <div
          className="bg-white/25 backdrop-blur-sm rounded-3xl px-10 py-5 mb-5 shadow-lg animate-slide-up"
          style={{ animationDelay: '0.14s', animationFillMode: 'both' }}
        >
          <p className="text-6xl font-black tracking-tight">+{amount}⭐</p>
          {description && (
            <p className="text-lg opacity-90 mt-2 font-semibold">{description}</p>
          )}
        </div>

        {/* Hint */}
        <p
          className="text-sm opacity-60 animate-fade-in"
          style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
        >
          לחץ להמשך
        </p>
      </div>
    </div>
  )
}
