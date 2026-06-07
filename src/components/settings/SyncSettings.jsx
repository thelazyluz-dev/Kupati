import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'

function generateFamilyCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

async function shareCode(code) {
  const text = `קוד המשפחה שלנו בקופתי: ${code}\nפתח את האפליקציה ולחץ "כניסה כילד"`
  if (navigator.share) {
    try { await navigator.share({ text }) } catch {}
    return 'shared'
  }
  try { await navigator.clipboard.writeText(code); return 'copied' } catch {}
  return null
}

const STATUS_MAP = {
  idle:    { dot: 'bg-gray-300',                 label: 'לא מחובר'   },
  syncing: { dot: 'bg-yellow-400 animate-pulse', label: 'מתחבר...'   },
  ok:      { dot: 'bg-green-400',                label: 'מסונכרן ✓'  },
  offline: { dot: 'bg-gray-400',                 label: 'ללא חיבור'  },
  error:   { dot: 'bg-red-400',                  label: 'שגיאה'      },
}

export default function SyncSettings() {
  const { settings, updateSettings, requirePin, syncStatus } = useApp()
  const familyCode = settings.familyCode || ''

  const [showCode,    setShowCode]    = useState(false)
  const [shareMsg,    setShareMsg]    = useState('')
  const [showManual,  setShowManual]  = useState(false)
  const [draft,       setDraft]       = useState('')

  const st = STATUS_MAP[syncStatus] ?? STATUS_MAP.idle

  async function handleShare() {
    const result = await shareCode(familyCode)
    if (result === 'copied') { setShareMsg('הועתק ✓'); setTimeout(() => setShareMsg(''), 2500) }
  }

  function handleGenerate() {
    const code = generateFamilyCode()
    updateSettings({ familyCode: code })
    setShowCode(true)
  }

  function handleManualSet() {
    const trimmed = draft.trim().toLowerCase()
    if (trimmed.length < 4) return
    updateSettings({ familyCode: trimmed })
    setDraft('')
    setShowManual(false)
  }

  function handleDisconnect() {
    requirePin(() => {
      updateSettings({ familyCode: '' })
      setShowCode(false)
    })
  }

  // ── Has a family code ──────────────────────────────────────────────────────
  if (familyCode) {
    return (
      <div className="space-y-3">

        {/* Status + code row */}
        <div className="rounded-2xl overflow-hidden"
             style={{ background: 'rgba(238,242,255,0.7)', border: '1.5px solid rgba(99,102,241,0.18)' }}>

          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-100/60">
            <span className="text-xs font-semibold text-gray-500">סנכרון מכשירים</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${st.dot}`} />
              <span className="text-xs text-gray-500">{st.label}</span>
            </div>
          </div>

          {/* Code display */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-1.5">קוד משפחה</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xl font-black tracking-[0.22em] text-indigo-700 font-mono select-all" dir="ltr">
                {showCode ? familyCode : '• • • • • •'}
              </span>
              <button
                type="button"
                onClick={() => setShowCode(v => !v)}
                className="text-xs text-indigo-400 hover:text-indigo-600 font-bold px-2 py-1 rounded-lg transition-colors"
                style={{ background: 'rgba(99,102,241,0.08)' }}
              >
                {showCode ? 'הסתר' : 'הצג'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
              שתף את הקוד עם הילדים ועם מכשירי הורים נוספים — כולם יראו את אותם הנתונים בזמן אמת
            </p>
          </div>
        </div>

        {/* Primary action — share */}
        <button
          type="button"
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black text-white active:scale-95 transition-all"
          style={{
            background: shareMsg
              ? 'linear-gradient(135deg,#10b981,#059669)'
              : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}
        >
          <span className="text-base">{shareMsg ? '✅' : '📤'}</span>
          <span>{shareMsg || 'שלח קוד לילד / להורה נוסף'}</span>
        </button>

        {/* How it works — collapsed info */}
        <div className="rounded-xl px-3 py-2.5 space-y-1.5"
             style={{ background: 'rgba(243,244,246,0.8)', border: '1px solid rgba(229,231,235,0.7)' }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">איך זה עובד?</p>
          {[
            { e: '👶', t: 'ילד פותח קופתי ← לוחץ "כניסה כילד" ← מקליד את הקוד' },
            { e: '👨‍👩‍👧', t: 'הורה נוסף מגדיר את אותו הקוד בהגדרות ← מסונכרן מיד' },
            { e: '🔒', t: 'הקוד הוא הסיסמה — אל תשתפו עם מי שלא מהמשפחה' },
          ].map(({ e, t }) => (
            <div key={e} className="flex items-start gap-2">
              <span className="text-sm flex-shrink-0 mt-px">{e}</span>
              <span className="text-[11px] text-gray-500 leading-snug">{t}</span>
            </div>
          ))}
        </div>

        {/* Disconnect */}
        <button
          type="button"
          onClick={handleDisconnect}
          className="w-full text-xs text-gray-400 hover:text-red-400 text-center py-1 transition-colors"
        >
          נתק סנכרון
        </button>
      </div>
    )
  }

  // ── No family code yet ─────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* Explanation card */}
      <div className="rounded-2xl px-4 py-3.5 text-center"
           style={{ background: 'rgba(238,242,255,0.7)', border: '1.5px solid rgba(99,102,241,0.18)' }}>
        <div className="text-3xl mb-2">📱</div>
        <p className="text-sm font-black text-gray-800 mb-1">סנכרון משפחתי</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          צרו קוד משפחה כדי לתת לילדים גישה לאפליקציה בטלפון שלהם — ולסנכרן בין מכשירי הורים
        </p>
      </div>

      {/* Main CTA */}
      <button
        type="button"
        onClick={handleGenerate}
        className="w-full py-4 rounded-2xl font-black text-white text-base active:scale-95 transition-all flex items-center justify-center gap-2.5"
        style={{
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
        }}
      >
        <span className="text-xl">🎲</span>
        <span>צור קוד משפחה</span>
      </button>

      {/* Benefits */}
      <div className="space-y-1.5">
        {[
          { e: '👀', t: 'הילד רואה רק את הנתונים שלו' },
          { e: '✅', t: 'יכול לבקש אישור מטלות מהורה' },
          { e: '🔄', t: 'הורים מרובים מסונכרנים בזמן אמת' },
        ].map(({ e, t }) => (
          <div key={e} className="flex items-center gap-2.5 rounded-xl px-3 py-2"
               style={{ background: 'rgba(243,244,246,0.8)' }}>
            <span className="text-base flex-shrink-0">{e}</span>
            <span className="text-xs font-semibold text-gray-600">{t}</span>
          </div>
        ))}
      </div>

      {/* Manual entry — secondary */}
      {!showManual ? (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="w-full text-xs text-gray-400 hover:text-indigo-500 text-center py-1 transition-colors"
        >
          יש לי קוד קיים ›
        </button>
      ) : (
        <div className="space-y-2 animate-slide-up">
          <p className="text-xs font-semibold text-gray-500 text-center">הזן קוד קיים (מינ׳ 4 תווים)</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSet()}
              placeholder="קוד משפחה"
              className="flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none text-right"
              dir="rtl"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleManualSet}
              disabled={draft.trim().length < 4}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-colors active:scale-95"
            >
              הגדר
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setShowManual(false); setDraft('') }}
            className="w-full text-xs text-gray-400 text-center"
          >
            ביטול
          </button>
        </div>
      )}
    </div>
  )
}
