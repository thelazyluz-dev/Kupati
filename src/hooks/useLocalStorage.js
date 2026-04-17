import { useState, useCallback, useEffect, useRef } from 'react'
import { get, set } from '../lib/storage.js'

const EVENT = 'kupati-storage'

export function useLocalStorage(key, defaultValue) {
  // Stable ref so useEffect doesn't re-run when defaultValue is a literal []
  const defaultRef = useRef(defaultValue)

  const [state, setStateRaw] = useState(() => {
    const stored = get(key)
    return stored !== null ? stored : defaultRef.current
  })

  useEffect(() => {
    function handler(e) {
      if (e.detail?.key === key) {
        const stored = get(key)
        setStateRaw(stored !== null ? stored : defaultRef.current)
      }
    }
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [key]) // only key — defaultRef is stable

  const setState = useCallback((valueOrUpdater) => {
    // Read latest value from localStorage (always in sync) to use as prev,
    // then write synchronously before dispatching the event.
    // Using queueMicrotask caused a race: the event fired before React's
    // scheduler flushed the functional updater, so the listener read stale
    // localStorage and overwrote the just-deleted/updated state.
    const prev = get(key) ?? defaultRef.current
    const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater
    set(key, next)
    setStateRaw(next)
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }))
  }, [key])

  return [state, setState]
}
