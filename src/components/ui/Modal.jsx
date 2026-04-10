import { useEffect, useRef, useState } from 'react'

export default function Modal({ title, onClose, children, size = 'md' }) {
  const [closing, setClosing] = useState(false)
  const dragStart  = useRef(null)
  const panelRef   = useRef(null)

  // Intercept every close attempt → play exit animation first
  function handleClose() {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 220)
  }

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Swipe-down gesture on the handle bar
  function onHandleTouchStart(e) {
    dragStart.current = e.touches[0].clientY
  }
  function onHandleTouchMove(e) {
    if (dragStart.current === null) return
    const dy = e.touches[0].clientY - dragStart.current
    if (dy > 0 && panelRef.current) {
      panelRef.current.style.transform = `translateY(${Math.min(dy, 160)}px)`
      panelRef.current.style.transition = 'none'
    }
  }
  function onHandleTouchEnd(e) {
    if (dragStart.current === null) return
    const dy = e.changedTouches[0].clientY - dragStart.current
    dragStart.current = null
    if (panelRef.current) {
      panelRef.current.style.transform = ''
      panelRef.current.style.transition = ''
    }
    if (dy > 80) handleClose()
  }

  const sizeClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }[size] || 'max-w-md'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/50 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} />

      {/* Panel */}
      <div
        ref={panelRef}
        className={[
          `relative w-full ${sizeClass} bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col`,
          closing ? 'animate-slide-down' : 'animate-bounce-in',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) — swipe down to close */}
        <div
          className="flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:scale-90 text-gray-500 transition-all text-lg"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
