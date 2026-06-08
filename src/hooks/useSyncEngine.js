import { useEffect, useRef, useState } from 'react'
import { get } from '../lib/storage.js'
import { attach, detach, push, isSuppressed, setLocalTs, pullMergeKeys } from '../lib/syncEngine.js'

const LS_EVENT = 'kupati-storage'

export function useSyncEngine(familyCode) {
  const [status, setStatus] = useState('idle')  // idle | syncing | ok | offline | error
  const debounce = useRef({})

  // Attach / detach when familyCode changes
  useEffect(() => {
    if (!familyCode) {
      detach()
      setStatus('idle')
      return
    }
    attach(familyCode, setStatus)
    return () => detach()
  }, [familyCode])

  // Listen to every localStorage write and push to Firestore (debounced 300ms)
  useEffect(() => {
    function handler(e) {
      const key = e.detail?.key
      if (!key || !familyCode) return
      if (isSuppressed(key)) return  // this write came FROM Firestore — don't echo back

      // Record local write time immediately so attach() knows local data is fresh
      setLocalTs(key, Date.now())

      clearTimeout(debounce.current[key])
      debounce.current[key] = setTimeout(async () => {
        const value = get(key)
        if (value === null) return
        try {
          await push(key, value)
        } catch (err) {
          console.warn('[sync] push failed:', err)
          setStatus('error')
        }
      }, 300)
    }
    window.addEventListener(LS_EVENT, handler)
    return () => window.removeEventListener(LS_EVENT, handler)
  }, [familyCode])

  // Pull merge-only keys when app returns to foreground — onSnapshot may have
  // missed updates while the browser tab / PWA was in the background.
  useEffect(() => {
    function onVisible() {
      if (familyCode && document.visibilityState === 'visible') pullMergeKeys()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [familyCode])

  // Network status
  useEffect(() => {
    function online()  { if (familyCode) { setStatus('ok'); pullMergeKeys() } }
    function offline() { if (familyCode) setStatus('offline') }
    window.addEventListener('online',  online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online',  online)
      window.removeEventListener('offline', offline)
    }
  }, [familyCode])

  return { status }
}
