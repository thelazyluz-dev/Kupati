import { useRef, useState, useCallback } from 'react'

/**
 * SortableList — pointer-events drag-to-reorder wrapper.
 *
 * Props:
 *   items        — array of items to render
 *   onReorder(fromIdx, toIdx) — called when a drag completes
 *   renderItem(item, index, dragHandle) — render function; dragHandle is a <div> with drag props
 *   keyExtractor(item) — returns unique key string
 */
export default function SortableList({ items, onReorder, renderItem, keyExtractor }) {
  const containerRef = useRef(null)
  const dragState = useRef(null)   // { fromIdx, currentIdx, pointerId }
  const [draggingIdx, setDraggingIdx] = useState(null)
  const [dropIdx, setDropIdx] = useState(null)   // index *before* which the drop indicator shows

  const getItemEls = useCallback(() =>
    containerRef.current
      ? Array.from(containerRef.current.querySelectorAll('[data-sortable-item]'))
      : []
  , [])

  function getClosestDropIdx(clientY) {
    const els = getItemEls()
    // For each element find its mid-point; insert before the first el whose mid > clientY
    for (let i = 0; i < els.length; i++) {
      const rect = els[i].getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      if (clientY < mid) return i
    }
    return els.length
  }

  function onPointerDown(e, idx) {
    // Only left-click / single touch
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const container = containerRef.current
    container.setPointerCapture(e.pointerId)
    dragState.current = { fromIdx: idx, currentIdx: idx, pointerId: e.pointerId }
    setDraggingIdx(idx)
    setDropIdx(idx)
  }

  function onPointerMove(e) {
    if (!dragState.current) return
    const closest = getClosestDropIdx(e.clientY)
    dragState.current.currentIdx = closest
    setDropIdx(closest)
  }

  function onPointerUp(e) {
    if (!dragState.current) return
    const { fromIdx, currentIdx } = dragState.current
    dragState.current = null
    setDraggingIdx(null)
    setDropIdx(null)

    // Normalise: when dropping *after* fromIdx the splice means toIdx = currentIdx - 1
    let toIdx = currentIdx
    if (toIdx > fromIdx) toIdx = toIdx - 1
    if (toIdx !== fromIdx) {
      onReorder(fromIdx, toIdx)
    }
  }

  function onPointerCancel() {
    dragState.current = null
    setDraggingIdx(null)
    setDropIdx(null)
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{ touchAction: draggingIdx !== null ? 'none' : 'auto' }}
    >
      {items.map((item, idx) => {
        const key = keyExtractor(item)
        const isDragging = draggingIdx === idx
        // Show drop indicator line *above* this item
        const showTopLine = dropIdx === idx && draggingIdx !== null && draggingIdx !== idx
        // Show drop indicator line *after* last item
        const showBottomLine = idx === items.length - 1 && dropIdx === items.length && draggingIdx !== null && draggingIdx !== idx

        const dragHandle = (
          <div
            onPointerDown={(e) => onPointerDown(e, idx)}
            className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 px-1 py-2 text-gray-300 hover:text-gray-500 select-none"
            title="גרור לשינוי סדר"
          >
            <svg width="14" height="22" viewBox="0 0 14 22" fill="currentColor">
              <circle cx="4" cy="4"  r="2" />
              <circle cx="10" cy="4"  r="2" />
              <circle cx="4" cy="11" r="2" />
              <circle cx="10" cy="11" r="2" />
              <circle cx="4" cy="18" r="2" />
              <circle cx="10" cy="18" r="2" />
            </svg>
          </div>
        )

        return (
          <div key={key} data-sortable-item>
            {showTopLine && (
              <div className="h-0.5 bg-indigo-400 rounded-full mx-2 my-0.5" />
            )}
            <div
              className="transition-opacity duration-100"
              style={{ opacity: isDragging ? 0.4 : 1, transform: isDragging ? 'scale(0.98)' : 'scale(1)' }}
            >
              {renderItem(item, idx, dragHandle)}
            </div>
            {showBottomLine && (
              <div className="h-0.5 bg-indigo-400 rounded-full mx-2 my-0.5" />
            )}
          </div>
        )
      })}
    </div>
  )
}
