import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'

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
  idle:    { dot: 'bg-gray-300',                       label: 'כבוי'          },
  syncing: { dot: 'bg-yellow-400 animate-pulse',       label: 'מתחבר...'      },
  ok:      { dot: 'bg-green-400',                      label: 'מסונכרן ✓'     },
  offline: { dot: 'bg-gray-400',                       label: 'ללא חיבור'     },
  error:   { dot: 'bg-red-400',                        label: 'שגיאה'         },
}

export default function SyncSettings() {
  const { settings, updateSettings, requirePin, syncStatus } = useApp()
  const familyCode = settings.familyCode || ''

  const [draft, setDraft]       = useState('')
  const [showCode, setShowCode] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  async function handleShare() {
    const result = await shareCode(familyCode)
    if (result === 'copied') { setShareMsg('הועתק!'); setTimeout(() => setShareMsg(''), 2000) }
  }

  const st = STATUS_MAP[syncStatus] ?? STATUS_MAP.idle

  function handleSet() {
    const trimmed = draft.trim().toLowerCase()
    if (trimmed.length < 4) return
    updateSettings({ familyCode: trimmed })
    setDraft('')
  }

  function handleDisconnect() {
    requirePin(() => updateSettings({ familyCode: '' }))
  }

  return (
    <div className="space-y-3">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">סנכרון בין מכשירים</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
          <span className="text-xs text-gray-500">{st.label}</span>
        </div>
      </div>

      {familyCode ? (
        <>
          {/* Current family code (masked) */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
            <span className="text-sm font-mono text-gray-700 tracking-widest">
              {showCode ? familyCode : '•'.repeat(familyCode.length)}
            </span>
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold"
            >
              {showCode ? 'הסתר' : 'הצג'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            הזן את אותו הקוד בכל המכשירים של ההורים — ובילדים שמשתמשים באפליקציית ילד
          </p>
          <button
            type="button"
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-indigo-600 active:scale-95 transition-all"
            style={{ background: 'rgba(238,242,255,0.9)', border: '1.5px solid rgba(99,102,241,0.2)' }}
          >
            {shareMsg ? <><span>✅</span> {shareMsg}</> : <><span>📤</span> שלח קוד לילד</>}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="w-full text-sm text-red-500 hover:text-red-700 text-right transition-colors"
          >
            נתק סנכרון
          </button>
        </>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSet()}
              placeholder="קוד משפחה (מינ׳ 4 תווים)"
              className="flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none text-right"
              dir="rtl"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              type="button"
              onClick={handleSet}
              disabled={draft.trim().length < 4}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-colors active:scale-95"
            >
              הגדר
            </button>
          </div>
          <p className="text-xs text-gray-400">
            בחר קוד ייחודי למשפחה — לדוגמה <span className="font-mono">cohen2024</span> — והזן אותו בכל המכשירים
          </p>
        </>
      )}
    </div>
  )
}
