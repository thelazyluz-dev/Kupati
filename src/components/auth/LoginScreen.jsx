import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

const COINS = ['🪙','💰','⭐','🎯','💎','🏆']

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSignIn() {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (e) {
      console.error('[login] error:', e.code, e.message)
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        // User dismissed — no message needed
      } else if (e.code === 'auth/popup-blocked') {
        setError('הדפדפן חסם את החלון. אפשר חלונות קופצים ונסה שוב.')
      } else if (e.code === 'auth/unauthorized-domain') {
        setError('הדומיין לא מורשה ב-Firebase. הוסף אותו תחת Authentication → Authorized domains.')
      } else if (e.code === 'auth/operation-not-allowed') {
        setError('כניסה עם Google לא מופעלת בפרויקט Firebase.')
      } else {
        setError(`שגיאה: ${e.code || e.message}`)
      }
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #f0f4ff 0%, #fff7ed 55%, #f0fdf4 100%)' }}
    >
      {/* Decorative floating emojis */}
      {COINS.map((c, i) => (
        <div
          key={i}
          className="absolute pointer-events-none select-none"
          style={{
            fontSize: 28 + (i % 3) * 14,
            left:  `${[8, 80, 20, 72, 12, 85][i]}%`,
            top:   `${[12, 8, 75, 72, 45, 40][i]}%`,
            opacity: 0.18,
            animation: `float ${4 + i * 0.8}s ease-in-out ${i * 0.6}s infinite`,
            transform: `rotate(${[-15, 10, 20, -8, 5, -20][i]}deg)`,
          }}
        >{c}</div>
      ))}

      {/* Card */}
      <div
        className="relative w-full max-w-sm mx-5 flex flex-col items-center gap-6 px-7 py-10"
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 32,
          border: '2px solid rgba(255,255,255,0.9)',
          boxShadow: '0 20px 60px rgba(99,102,241,0.14), 0 4px 16px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,1)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-24 h-24 rounded-[28px] flex items-center justify-center text-5xl mb-1"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              boxShadow: '0 8px 28px rgba(245,158,11,0.45), inset 0 1px 2px rgba(255,255,255,0.4)',
              border: '2.5px solid rgba(255,255,255,0.6)',
            }}
          >🪙</div>
          <h1
            className="text-4xl font-black tracking-tight"
            style={{ color: '#1e1b4b' }}
          >קופתי</h1>
          <p className="text-sm font-semibold text-gray-500">ניהול כסף חכם לילדים</p>
        </div>

        {/* Features */}
        <div className="w-full space-y-2">
          {[
            { icon: '🧠', text: 'חינוך פיננסי מגיל קטן' },
            { icon: '✅', text: 'מוטיבציה לביצוע מטלות הבית' },
            { icon: '👨‍👩‍👧‍👦', text: 'סינכרון בין כל המשפחה' },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
              style={{
                background: 'rgba(243,244,246,0.8)',
                border: '1.5px solid rgba(229,231,235,0.7)',
              }}
            >
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-semibold text-gray-700">{text}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm font-semibold text-red-500 text-center animate-pop">{error}</p>
        )}

        {/* Google Sign-In button */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all active:scale-95 disabled:opacity-60"
          style={{
            background: loading
              ? 'rgba(243,244,246,0.9)'
              : 'linear-gradient(135deg, #4285f4, #1a73e8)',
            color: 'white',
            boxShadow: loading
              ? 'none'
              : '0 6px 22px rgba(66,133,244,0.45), inset 0 1px 1px rgba(255,255,255,0.25)',
            border: '2px solid rgba(255,255,255,0.3)',
          }}
        >
          {loading ? (
            <>
              <span className="animate-spin text-xl">⏳</span>
              <span className="text-gray-500">מתחבר...</span>
            </>
          ) : (
            <>
              <GoogleIcon />
              התחבר עם Google
            </>
          )}
        </button>

        <p
          className="text-[11px] text-center font-medium"
          style={{ color: 'rgba(107,114,128,0.7)' }}
        >
          הנתונים שלך מאובטחים ומסונכרנים עם חשבון Google שלך
        </p>
      </div>

      {/* Footer */}
      <p className="absolute bottom-4 text-[10px] text-gray-400 tracking-widest select-none">
        made by illouzman
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.2H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.8z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.2H42V20H24v8h11.3c-.8 2.2-2.3 4.2-4.2 5.6l6.2 5.2C41 35.8 44 30.3 44 24c0-1.3-.1-2.6-.4-3.8z"/>
    </svg>
  )
}
