import { useState, useCallback, useEffect } from 'react'
import { get, set } from '../lib/storage.js'

const EVENT = 'kupati-storage'

export function useLocalStorage(key, defaultValue) {
  const [state, setStateRaw] = useState(() => {
    const stored = get(key)
    return stored !== null ? stored : defaultValue
  })

  // Sync when another component instance writes to the same key
  useEffect(() => {
    function handler(e) {
      if (e.detail?.key === key) {
        const stored = get(key)
        setStateRaw(stored !== null ? stored : defaultValue)
      }
    }
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [key, defaultValue])

  const setState = useCallback((valueOrUpdater) => {
    setStateRaw((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater
      set(key, next)
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }))
      return next
    })
  }, [key])

  return [state, setState]
}
