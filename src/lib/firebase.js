import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Firebase API keys for web are public by design — security is via Firestore Rules.
// Env vars override the hard-coded values (useful for future project changes).
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyDv8bbR1KHqkXLOZNHKeis_Mr75Oxx4DmQ',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'kupati-family-66874.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'kupati-family-66874',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'kupati-family-66874.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1070013315998',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:1070013315998:web:f57fd237152088dd2d748f',
}

let _db   = null
let _auth = null

try {
  const app = initializeApp(firebaseConfig)
  _db   = getFirestore(app)
  _auth = getAuth(app)
} catch (e) {
  console.warn('[firebase] Init failed:', e.message)
}

export const db             = _db
export const auth           = _auth
export const googleProvider = new GoogleAuthProvider()
