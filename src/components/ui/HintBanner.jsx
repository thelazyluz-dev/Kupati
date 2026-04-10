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
      <div className="bg-gray-800/90 backdrop-blur-sm text-white rounded-2xl px-5 py-3 shadow-xl animate-slide-up text-sm font-semibold max-w-xs text-center">
        {message}
      </div>
    </div>
  )
}
