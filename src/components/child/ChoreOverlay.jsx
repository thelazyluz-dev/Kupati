import { useState } from 'react'
import { speak } from '../../lib/speech.js'
import { sounds } from '../../lib/sounds.js'

// Big, read-aloud chore picker for young kids: tap the chores you did, then
// one giant "שלחתי!" button. Submitting goes through the parent-approval flow.
export default function ChoreOverlay({ chores, pendingChores, childId, speakOn, onSubmit, onClose }) {
  const [selected, setSelected] = useState(() => new Set())

  // Chores already awaiting approval today — shown as done, not re-submittable.
  const dayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() })()
  const pendingChoreIds = new Set(
    (pendingChores || [])
      .filter((pc) => pc.childId === childId && pc.status !== 'rejected' && pc.timestamp >= dayStart && pc.choreId)
      .map((pc) => pc.choreId)
  )

  function toggle(chore) {
    if (pendingChoreIds.has(chore.id)) return
    speak(chore.name, speakOn)
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(chore.id) ? n.delete(chore.id) : n.add(chore.id)
      return n
    })
  }

  const chosen = chores.filter((c) => selected.has(c.id))

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(160deg,#fffbeb,#fef3c7)' }}>
      <div className="flex-shrink-0 flex items-center gap-2 px-5 pt-12 pb-4"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
        <h1 className="text-xl font-black text-gray-800 flex-1">⭐ מה עשית?</h1>
        <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500 active:scale-90"
          style={{ background: 'rgba(243,244,246,0.9)' }}>×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {chores.map((chore) => {
            const done = pendingChoreIds.has(chore.id)
            const sel = selected.has(chore.id)
            return (
              <button key={chore.id} onClick={() => toggle(chore)} disabled={done}
                className={`relative flex flex-col items-center justify-center gap-1.5 py-6 rounded-3xl active:scale-95 transition-all ${done ? 'opacity-60' : ''}`}
                style={{
                  background: sel ? 'linear-gradient(135deg,#34d399,#059669)' : 'rgba(255,255,255,0.95)',
                  border: `2.5px solid ${sel ? '#059669' : done ? 'rgba(52,211,153,0.5)' : 'rgba(245,158,11,0.25)'}`,
                  boxShadow: sel ? '0 6px 20px rgba(16,185,129,0.4)' : '0 3px 12px rgba(0,0,0,0.06)',
                  color: sel ? '#fff' : '#374151',
                }}>
                <span className="text-5xl">{chore.emoji || '✅'}</span>
                <span className="text-sm font-black text-center leading-tight px-1">{chore.name}</span>
                <span className={`text-xs font-black ${sel ? 'text-white/90' : 'text-amber-600'}`}>+{chore.defaultStars ?? 1}⭐</span>
                {done && <span className="absolute top-2 left-2 text-lg">✅</span>}
                {sel && <span className="absolute top-2 left-2 text-white text-lg">✓</span>}
              </button>
            )
          })}
        </div>
        {chores.length === 0 && (
          <p className="text-center text-gray-400 font-semibold mt-10">אין מטלות עדיין — בקש מהורה להוסיף</p>
        )}
      </div>

      {chosen.length > 0 && (
        <div className="flex-shrink-0 p-4" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}>
          <button
            onClick={() => { sounds.send?.(); onSubmit(chosen) }}
            className="w-full py-5 rounded-3xl font-black text-white text-xl active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 6px 24px rgba(16,185,129,0.5)' }}>
            📨 שלחתי! ({chosen.length})
          </button>
        </div>
      )}
    </div>
  )
}
