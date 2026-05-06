import { useEffect } from 'react'

export default function HintBanner({ message, onDone }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [message, onDone])

  if (!message) return null

  return (
    <div className="fixed bottom-24 inset-x-4 z-40 flex justify-center pointer-events-none">
      <div
        className="text-white rounded-2xl px-5 py-3 animate-slide-up text-sm font-semibold max-w-xs text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(30,27,75,0.92), rgba(76,29,149,0.92))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(139,92,246,0.35)',
          boxShadow: '0 8px 32px rgba(76,29,149,0.4), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.12)',
        }}
      >
        {message}
      </div>
    </div>
  )
}
