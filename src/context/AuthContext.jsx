import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase.js'
import { attachUser, detachUser, pushUser, isUserSuppressed } from '../lib/userSync.js'
import { get } from '../lib/storage.js'

const DATA_KEYS = ['children', 'chores', 'all_transactions', 'settings']
const LS_EVENT  = 'kupati-storage'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = still checking, null = not logged in, User = logged in
  const [user, setUser]           = useState(undefined)
  const [syncStatus, setSyncStatus] = useState('idle')
  const debounce = useRef({})
  const uidRef   = useRef(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null)
      uidRef.current = u?.uid ?? null

      if (u) {
        await attachUser(u.uid, setSyncStatus)
      } else {
        detachUser()
        setSyncStatus('idle')
      }
    })
    return () => { unsub(); detachUser() }
  }, [])

  // Push any local change to Firestore (debounced 500ms)
  useEffect(() => {
    function handler(e) {
      const key = e.detail?.key
      const uid = uidRef.current
      if (!key || !uid || !DATA_KEYS.includes(key)) return
      if (isUserSuppressed(key)) return

      clearTimeout(debounce.current[key])
      debounce.current[key] = setTimeout(async () => {
        const value = get(key)
        if (value === null) return
        try {
          await pushUser(uid, key, value)
        } catch (err) {
          console.warn('[auth] push failed:', err)
        }
      }, 500)
    }
    window.addEventListener(LS_EVENT, handler)
    return () => window.removeEventListener(LS_EVENT, handler)
  }, [])

  async function signInWithGoogle() {
    googleProvider.setCustomParameters({ prompt: 'select_account' })
    await signInWithPopup(auth, googleProvider)
  }

  async function signOut() {
    detachUser()
    await fbSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, syncStatus, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
