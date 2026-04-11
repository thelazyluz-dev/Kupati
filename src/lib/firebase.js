import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Firebase config comes from env vars (VITE_FIREBASE_*).
// If they are not set, db will be null and the sync engine silently does nothing.
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY

let _db = null

if (apiKey) {
  try {
    const app = initializeApp({
      apiKey,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    })
    _db = getFirestore(app)
  } catch (e) {
    console.warn('[firebase] Init failed:', e.message)
  }
}

export const db = _db
