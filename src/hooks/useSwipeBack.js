import { useEffect, useRef } from 'react'

export function useSwipeBack(onBack, { edgeWidth = 44, minSwipe = 72 } = {}) {
  const sx = useRef(null)
  const sy = useRef(null)

  useEffect(() => {
    function onStart(e) {
      const t = e.touches[0]
      sx.current = t.clientX
      sy.current = t.clientY
    }
    function onEnd(e) {
      if (sx.current === null) return
      const t = e.changedTouches[0]
      const dx = t.clientX - sx.current
      const dy = Math.abs(t.clientY - sy.current)
      if (sx.current <= edgeWidth && dx >= minSwipe && dy < 80) onBack()
      sx.current = null
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend',   onEnd)
    }
  }, [onBack, edgeWidth, minSwipe])
}
