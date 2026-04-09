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
    // Keep updater pure: write localStorage here, dispatch event after
    setStateRaw((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater
      set(key, next)
      return next
    })
    // Dispatch after React finishes processing the state update
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }))
    })
  }, [key])

  return [state, setState]
}
