import { useState, useRef, useEffect } from 'react'
import { fetchFamilyData } from '../../lib/childSync.js'
import { get, set, remove } from '../../lib/storage.js'
import CodeGate from '../child/CodeGate.jsx'

function OtpInput({ value, onChange, onComplete }) {
  const refs = useRef([])
  const chars = Array.from({ length: 6 }, (_, i) => value[i] || '')

  function handleChange(i, raw) {
    const char = raw.toLowerCase().replace(/[^a-z0-9]/, '').slice(-1)
    const next = [...chars.slice(0, i), char, ...chars.slice(i + 1)].join('')
    onChange(next)
    if (char && i < 5) refs.current[i + 1]?.focus()
    if (char && i === 5 && next.length === 6) onComplete(next)
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace') {
      if (!chars[i] && i > 0) {
        refs.current[i - 1]?.focus()
        const next = [...chars.slice(0, i - 1), '', ...chars.slice(i)].join('')
        onChange(next)
      } else {
        const next = [...chars.slice(0, i), '', ...chars.slice(i + 1)].join('')
        onChange(next)
      }
      e.preventDefault()
    } else if (e.key === 'ArrowLeft') {
      refs.current[Math.min(i + 1, 5)]?.focus()
    } else if (e.key === 'ArrowRight') {
      refs.current[Math.max(i - 1, 0)]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6)
    onChange(pasted)
    refs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) onComplete(pasted)
  }

  function handleFocus(i) {
    // Select content on focus for easy overwrite
    refs.current[i]?.select()
  }

  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="text"
          value={c}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          onFocus={() => handleFocus(i)}
          maxLength={2}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          autoFocus={i === 0 ? undefined : undefined}
          spellCheck={false}
          inputMode="text"
          className="w-11 h-14 text-center text-2xl font-black rounded-2xl border-2 transition-all focus:outline-none"
          style={{
            fontFamily: 'monospace',
            borderColor: c ? '#6366f1' : '#e5e7eb',
            background: c ? 'rgba(238,242,255,0.8)' : 'rgba(249,250,251,0.9)',
            color: c ? '#4338ca' : '#9ca3af',
            boxShadow: c ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

export default function ChildLogin({ onBack }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [children, setChildren] = useState(null)
  const [codeChild, setCodeChild] = useState(null)

  // Clear error when code changes
  useEffect(() => { setError('') }, [code])

  async function handleConnect(codeOverride) {
    const trimCode = (codeOverride ?? code).trim().toLowerCase()
    if (trimCode.length < 4) { setError('קוד לא תקין'); return }
    setLoading(true)
    setError('')
    try {
      const childrenData = await fetchFamilyData(trimCode, 'children')
      if (!childrenData || childrenData.length === 0) {
        setError('לא נמצאה משפחה עם הקוד הזה')
      } else {
        set('deviceFamilyCode', trimCode)   // remember for next time on this device
        setCode(trimCode)                    // so enterAs uses the right family code
        setChildren(childrenData)
      }
    } catch {
      setError('שגיאת חיבור — בדקו את החיבור ונסו שוב')
    }
    setLoading(false)
  }

  function enterAs(child) {
    set('childMode', {
      familyCode: code.trim().toLowerCase(),
      childId: child.id,
      childName: child.name,
    })
    window.location.reload()
  }

  function selectChild(child) {
    // Gate behind the personal code when the parent set one for this child.
    if (child.accessCode) setCodeChild(child)
    else enterAs(child)
  }

  // Remember the family code per device: after the first successful connect the
  // tablet jumps straight to the "who are you?" picker — no code re-entry.
  // Deferred so it doesn't setState synchronously during the effect.
  useEffect(() => {
    const saved = get('deviceFamilyCode')
    if (!saved) return
    const t = setTimeout(() => handleConnect(saved), 0)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
              style={{
                background: 'rgba(238,242,255,0.9)',
                border: '2px solid rgba(99,102,241,0.15)',
                boxShadow: '0 2px 8px rgba(99,102,241,0.1)',
              }}
            >
              {child.avatarImage
                ? <img src={child.avatarImage} alt={child.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                : <span className="text-3xl flex-shrink-0">{child.avatar || '🦁'}</span>
              }
              <span className="text-lg font-black text-gray-800">{child.name}</span>
              <span className="mr-auto text-indigo-400 text-xl leading-none">›</span>
            </button>
          ))}
        </div>

        <button onClick={() => { remove('deviceFamilyCode'); setCode(''); setChildren(null) }} className="text-sm text-gray-400 font-medium">← משפחה אחרת</button>

        {codeChild && (
          <CodeGate child={codeChild} onSuccess={() => enterAs(codeChild)} onCancel={() => setCodeChild(null)} />
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-6 px-7 py-10" style={panelStyle}>
      <div className="text-center">
        <div className="text-5xl mb-1">🔑</div>
        <h2 className="text-2xl font-black text-gray-800 mb-1">כניסה כילד</h2>
        <p className="text-sm text-gray-500">בקשו מהורה את קוד המשפחה</p>
      </div>

      <div className="w-full space-y-3">
        <OtpInput value={code} onChange={setCode} onComplete={handleConnect} />
        <p className="text-[11px] text-gray-400 text-center">אותיות גדולות או קטנות — לא משנה</p>
      </div>

      {error && (
        <p className="text-sm font-semibold text-red-500 text-center animate-pop">{error}</p>
      )}

      <button
        onClick={() => handleConnect()}
        disabled={loading || code.length < 4}
        className="w-full py-4 rounded-2xl font-black text-white text-base active:scale-95 transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          boxShadow: code.length === 6 ? '0 6px 22px rgba(99,102,241,0.4)' : 'none',
        }}
      >
        {loading
          ? <span className="inline-block animate-spin">⏳</span>
          : 'כניסה →'
        }
      </button>

      <button onClick={onBack} className="text-sm text-gray-400 font-medium">← חזרה</button>
    </div>
  )
}
