import { useState } from 'react'
import { fetchFamilyData } from '../../lib/childSync.js'
import { set } from '../../lib/storage.js'

export default function ChildLogin({ onBack }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [children, setChildren] = useState(null)

  async function handleConnect() {
    const trimCode = code.trim().toUpperCase()
    if (trimCode.length < 4) { setError('קוד לא תקין'); return }
    setLoading(true)
    setError('')
    try {
      const childrenData = await fetchFamilyData(trimCode, 'children')
      if (!childrenData || childrenData.length === 0) {
        setError('לא נמצאה משפחה עם הקוד הזה')
      } else {
        setChildren(childrenData)
      }
    } catch {
      setError('שגיאת חיבור — בדקו את הקוד ונסו שוב')
    }
    setLoading(false)
  }

  function selectChild(child) {
    set('childMode', { familyCode: code.trim().toUpperCase(), childId: child.id, childName: child.name })
    window.location.reload()
  }

  const panelStyle = {
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 32,
    border: '2px solid rgba(255,255,255,0.9)',
    boxShadow: '0 20px 60px rgba(99,102,241,0.14),0 4px 16px rgba(0,0,0,0.06)',
  }

  if (children) {
    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-5 px-7 py-10" style={panelStyle}>
        <div className="text-center">
          <div className="text-4xl mb-1">👋</div>
          <h2 className="text-xl font-black text-gray-800 mb-1">מי את/ה?</h2>
          <p className="text-sm text-gray-500">בחרו את השם שלכם</p>
        </div>

        <div className="w-full flex flex-col gap-2">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => selectChild(child)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl active:scale-95 transition-all"
              style={{ background: 'rgba(238,242,255,0.9)', border: '2px solid rgba(99,102,241,0.15)', boxShadow: '0 2px 8px rgba(99,102,241,0.1)' }}
            >
              {child.avatarImage
                ? <img src={child.avatarImage} alt={child.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                : <span className="text-3xl flex-shrink-0">{child.avatar || '🦁'}</span>
              }
              <span className="text-lg font-black text-gray-800">{child.name}</span>
              <span className="mr-auto text-indigo-400 text-lg">›</span>
            </button>
          ))}
        </div>

        <button onClick={() => setChildren(null)} className="text-sm text-gray-400 font-medium">← חזרה</button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5 px-7 py-10" style={panelStyle}>
      <div className="text-center">
        <div className="text-4xl mb-1">🔑</div>
        <h2 className="text-xl font-black text-gray-800 mb-1">כניסה כילד</h2>
        <p className="text-sm text-gray-500">בקשו מהורה את קוד המשפחה</p>
      </div>

      <div className="w-full">
        <label className="text-xs font-bold text-gray-500 block mb-2 text-center tracking-wider uppercase">קוד משפחה</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          maxLength={8}
          placeholder="XXXXXX"
          dir="ltr"
          autoCapitalize="characters"
          className="w-full text-center text-3xl font-black tracking-[0.3em] rounded-2xl border-2 border-indigo-200 py-4 focus:border-indigo-500 focus:outline-none"
          style={{ fontFamily: 'monospace' }}
        />
      </div>

      {error && <p className="text-sm font-semibold text-red-500 text-center">{error}</p>}

      <button
        onClick={handleConnect}
        disabled={loading || code.length < 4}
        className="w-full py-4 rounded-2xl font-black text-white text-base active:scale-95 transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          boxShadow: '0 6px 22px rgba(99,102,241,0.4)',
        }}
      >
        {loading ? <span className="animate-spin inline-block">⏳</span> : 'כניסה →'}
      </button>

      <button onClick={onBack} className="text-sm text-gray-400 font-medium">← חזרה</button>
    </div>
  )
}
