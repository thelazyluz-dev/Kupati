import { useEffect, useRef, useState } from 'react'

export default function Modal({ title, onClose, children, size = 'md', headerColor = '' }) {
  const [closing, setClosing] = useState(false)
  const dragStart  = useRef(null)
  const panelRef   = useRef(null)

  function handleClose() {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 220)
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} />

      {/* Panel */}
      <div
        ref={panelRef}
        className={[
          `relative w-full ${sizeClass} bg-white rounded-t-[32px] sm:rounded-[28px] max-h-[92vh] flex flex-col`,
          closing ? 'animate-slide-down' : 'animate-bounce-in',
        ].join(' ')}
        style={{
          border: '2px solid rgba(255,255,255,0.8)',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.18), 0 8px 32px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div
          className="flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        {headerColor ? (
          <div className={`flex items-center justify-between px-5 py-4 bg-gradient-to-r ${headerColor} rounded-t-[30px] sm:rounded-t-[26px]`}>
            <h2 className="text-xl font-bold text-white drop-shadow-sm">{title}</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/35 active:scale-90 text-white transition-all text-lg"
              aria-label="סגור"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <button
              onClick={handleClose}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 transition-all text-lg active:scale-90"
              style={{
                background: 'rgba(243,244,246,0.9)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.8)',
              }}
              aria-label="סגור"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
