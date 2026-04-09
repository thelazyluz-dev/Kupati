import { useState, useCallback } from 'react'
import { get, set } from '../lib/storage.js'

export function useLocalStorage(key, defaultValue) {
  const [state, setStateRaw] = useState(() => {
    const stored = get(key)
    return stored !== null ? stored : defaultValue
  })

  const setState = useCallback(
    (valueOrUpdater) => {
      setStateRaw((prev) => {
        const next =
          typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater
        set(key, next)
        return next
      })
    },
    [key]
  )

  return [state, setState]
}
