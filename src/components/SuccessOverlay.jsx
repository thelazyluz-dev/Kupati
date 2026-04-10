import { useEffect } from 'react'

export default function SuccessOverlay({ name, amount, description, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-amber-400/95 text-white text-center px-6"
      onClick={onDone}
    >
      {/* Animated stars */}
      <div className="text-6xl mb-4 animate-bounce">⭐</div>

      <h2 className="text-3xl font-black mb-1">כל הכבוד!</h2>
      {name && <p className="text-xl font-bold mb-4 opacity-90">{name} 🎉</p>}

      <div className="bg-white/25 rounded-3xl px-8 py-4 mb-6">
        <p className="text-5xl font-black">+{amount}⭐</p>
        {description && (
          <p className="text-lg opacity-90 mt-1">{description}</p>
        )}
      </div>

      <p className="text-sm opacity-70">לחץ להמשך</p>
    </div>
  )
}
