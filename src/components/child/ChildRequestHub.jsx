import { useState } from 'react'
import { newRequest, describeRequest, isResolved } from '../../lib/requests.js'
import { formatNumber } from '../../lib/utils.js'
import { AVATAR_EMOJIS, GOAL_EMOJIS, COLOR_OPTIONS } from '../../lib/defaults.js'
import { sounds } from '../../lib/sounds.js'

const CATEGORIES = [
  { key: 'stars',    emoji: '⭐', label: 'לבקש כוכבים',  bg: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { key: 'money',    emoji: '💵', label: 'לבקש כסף',      bg: 'linear-gradient(135deg,#10b981,#059669)' },
  { key: 'purchase', emoji: '🛍️', label: 'לקנות משהו',    bg: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
  { key: 'convert',  emoji: '💱', label: 'להמיר לכסף',    bg: 'linear-gradient(135deg,#0ea5e9,#0284c7)' },
  { key: 'goal',     emoji: '🎯', label: 'מטרה חדשה',     bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { key: 'profile',  emoji: '🎨', label: 'לשנות פרופיל',  bg: 'linear-gradient(135deg,#ec4899,#db2777)' },
  { key: 'free',     emoji: '💬', label: 'בקשה אחרת',     bg: 'linear-gradient(135deg,#64748b,#475569)' },
]

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-600 block mb-1.5">{label}</span>
      {children}
    </label>
  )
}

const inputCls = 'w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg font-bold focus:outline-none focus:border-indigo-400'

export default function ChildRequestHub({ child, settings, myRequests, onSubmit, onClose }) {
  const [cat, setCat]   = useState(null)
  const [busy, setBusy] = useState(false)

  // form fields (shared/reused per category)
  const [amount, setAmount]   = useState('')
  const [note, setNote]       = useState('')
  const [title, setTitle]     = useState('')
  const [goalEmoji, setGoalEmoji] = useState('🎮')
  const [pName, setPName]     = useState(child.name || '')
  const [pAvatar, setPAvatar] = useState(child.avatar || '🦁')
  const [pColor, setPColor]   = useState(child.colorKey || 'purple')

  const rate    = child.exchangeRate ?? settings.globalExchangeRate ?? 2
  const stars   = child.starBalance || 0

  function reset() {
    setAmount(''); setNote(''); setTitle('')
    setGoalEmoji('🎮'); setPName(child.name || ''); setPAvatar(child.avatar || '🦁'); setPColor(child.colorKey || 'purple')
  }

  function back() { setCat(null); reset() }

  async function send(req) {
    setBusy(true)
    const ok = await onSubmit(req)
    setBusy(false)
    if (ok) { sounds.send?.(); back() }
  }

  const base = { childId: child.id, childName: child.name }

  function submitStars() {
    const n = parseFloat(amount)
    if (!(n > 0)) return
    send(newRequest({ ...base, type: 'stars', amount: n, currency: 'stars', note, title: `בקשת ${formatNumber(n)} כוכבים` }))
  }
  function submitMoney() {
    const n = parseFloat(amount)
    if (!(n > 0)) return
    send(newRequest({ ...base, type: 'money', amount: n, currency: 'shekels', note, title: `בקשת ${formatNumber(n)}₪` }))
  }
  function submitPurchase() {
    const n = parseFloat(amount)
    if (!title.trim() || !(n > 0)) return
    send(newRequest({ ...base, type: 'purchase', amount: n, currency: 'shekels', note, title: `לקנות: ${title.trim()}` }))
  }
  function submitConvert() {
    const n = parseFloat(amount)
    if (!(n > 0) || n > stars) return
    send(newRequest({ ...base, type: 'convert', amount: n, currency: 'stars', note, title: `להמיר ${formatNumber(n)}⭐ לכסף` }))
  }
  function submitGoal() {
    const t = parseFloat(amount)
    if (!title.trim() || !(t > 0)) return
    send(newRequest({ ...base, type: 'goal', currency: null, note, title: `מטרה: ${goalEmoji} ${title.trim()}`,
      meta: { name: title.trim(), emoji: goalEmoji, targetAmount: t } }))
  }
  function submitProfile() {
    const changes = {}
    if (pName.trim() && pName.trim() !== child.name) changes.name = pName.trim()
    if (pAvatar !== child.avatar) changes.avatar = pAvatar
    if (pColor !== child.colorKey) changes.colorKey = pColor
    if (Object.keys(changes).length === 0) return
    const parts = [changes.name && `שם→${changes.name}`, changes.avatar && `${changes.avatar}`, changes.colorKey && '🎨'].filter(Boolean)
    send(newRequest({ ...base, type: 'profile', currency: null, title: `שינוי פרופיל (${parts.join(' ')})`, meta: { changes } }))
  }
  function submitFree() {
    if (!title.trim()) return
    send(newRequest({ ...base, type: 'free', currency: null, title: title.trim(), note }))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(160deg,#eef2ff,#faf5ff)' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-5 pt-12 pb-4"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
        {cat && (
          <button onClick={back} className="w-9 h-9 rounded-full flex items-center justify-center text-lg text-gray-500 active:scale-90"
            style={{ background: 'rgba(243,244,246,0.9)' }}>›</button>
        )}
        <h1 className="text-lg font-black text-gray-800 flex-1">
          {cat ? CATEGORIES.find((c) => c.key === cat)?.label : '✋ בקשה להורה'}
        </h1>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold text-gray-500 active:scale-90"
          style={{ background: 'rgba(243,244,246,0.9)' }}>×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {!cat ? (
          <>
            {/* Balance reminder */}
            <div className="rounded-[22px] px-4 py-3 flex justify-around text-center"
              style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(99,102,241,0.15)' }}>
              <div><div className="text-2xl font-black text-amber-500" dir="ltr">{formatNumber(stars)}⭐</div><div className="text-xs text-gray-400">כוכבים</div></div>
              <div className="w-px bg-gray-200" />
              <div><div className="text-2xl font-black text-emerald-600" dir="ltr">{formatNumber(child.shekelBalance || 0)}₪</div><div className="text-xs text-gray-400">שקלים</div></div>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((c) => (
                <button key={c.key} onClick={() => { setCat(c.key); sounds.tap?.() }}
                  className="flex flex-col items-center justify-center gap-2 py-6 rounded-[22px] text-white active:scale-95 transition-all"
                  style={{ background: c.bg, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                  <span className="text-4xl">{c.emoji}</span>
                  <span className="text-sm font-black">{c.label}</span>
                </button>
              ))}
            </div>

            <MyRequests myRequests={myRequests} />
          </>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {cat === 'stars' && (
              <>
                <Field label="כמה כוכבים לבקש?">
                  <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} dir="ltr" placeholder="10" autoFocus />
                </Field>
                <Field label="למה? (אופציונלי)">
                  <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls.replace('text-lg', 'text-base')} placeholder="עזרתי בבית..." />
                </Field>
                <Submit onClick={submitStars} busy={busy} disabled={!(parseFloat(amount) > 0)} label="שלח בקשה להורה" />
              </>
            )}

            {cat === 'money' && (
              <>
                <Field label="כמה כסף לבקש? (₪)">
                  <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} dir="ltr" placeholder="20" autoFocus />
                </Field>
                <Field label="למה? (אופציונלי)">
                  <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls.replace('text-lg', 'text-base')} placeholder="דמי כיס..." />
                </Field>
                <Submit onClick={submitMoney} busy={busy} disabled={!(parseFloat(amount) > 0)} label="שלח בקשה להורה" />
              </>
            )}

            {cat === 'purchase' && (
              <>
                <Field label="מה תרצה לקנות?">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls.replace('text-lg', 'text-base')} placeholder="משחק, ממתק..." autoFocus />
                </Field>
                <Field label="כמה זה עולה? (₪)">
                  <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} dir="ltr" placeholder="15" />
                </Field>
                <Submit onClick={submitPurchase} busy={busy} disabled={!title.trim() || !(parseFloat(amount) > 0)} label="שלח בקשה להורה" />
              </>
            )}

            {cat === 'convert' && (
              <>
                <Field label="כמה כוכבים להמיר לכסף?">
                  <input type="number" min="1" max={stars} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} dir="ltr" placeholder="10" autoFocus />
                </Field>
                {parseFloat(amount) > 0 && parseFloat(amount) <= stars && (
                  <div className="rounded-2xl px-4 py-3 text-center" style={{ background: 'rgba(224,242,254,0.7)', border: '1.5px solid rgba(14,165,233,0.25)' }}>
                    <span className="text-sm text-gray-500">תקבל בערך </span>
                    <span className="text-xl font-black text-emerald-600">{formatNumber(Math.round(parseFloat(amount) * rate * 100) / 100)}₪</span>
                  </div>
                )}
                {parseFloat(amount) > stars && <p className="text-rose-500 text-sm text-center font-semibold">אין לך מספיק כוכבים — יש {formatNumber(stars)}⭐</p>}
                <Submit onClick={submitConvert} busy={busy} disabled={!(parseFloat(amount) > 0) || parseFloat(amount) > stars} label="שלח בקשה להורה" />
              </>
            )}

            {cat === 'goal' && (
              <>
                <Field label="שם המטרה">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls.replace('text-lg', 'text-base')} placeholder="אופניים חדשים" autoFocus />
                </Field>
                <Field label="בחר אייקון">
                  <div className="flex flex-wrap gap-2">
                    {GOAL_EMOJIS.map((e) => (
                      <button key={e} type="button" onClick={() => setGoalEmoji(e)}
                        className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all ${goalEmoji === e ? 'bg-indigo-500 scale-110' : 'bg-gray-100'}`}>{e}</button>
                    ))}
                  </div>
                </Field>
                <Field label="כמה כסף צריך? (₪)">
                  <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} dir="ltr" placeholder="200" />
                </Field>
                <Submit onClick={submitGoal} busy={busy} disabled={!title.trim() || !(parseFloat(amount) > 0)} label="שלח בקשה להורה" />
              </>
            )}

            {cat === 'profile' && (
              <>
                <Field label="שם">
                  <input value={pName} onChange={(e) => setPName(e.target.value)} className={inputCls.replace('text-lg', 'text-base')} />
                </Field>
                <Field label="אווטאר">
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_EMOJIS.map((e) => (
                      <button key={e} type="button" onClick={() => setPAvatar(e)}
                        className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all ${pAvatar === e ? 'bg-pink-500 scale-110' : 'bg-gray-100'}`}>{e}</button>
                    ))}
                  </div>
                </Field>
                <Field label="צבע">
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button key={c.key} type="button" onClick={() => setPColor(c.key)}
                        className={`w-10 h-10 rounded-full transition-all ${pColor === c.key ? 'ring-4 ring-offset-2 ring-gray-300 scale-110' : ''}`}
                        style={{ background: `linear-gradient(135deg,${c.from},${c.to})` }} aria-label={c.label} />
                    ))}
                  </div>
                </Field>
                <Submit onClick={submitProfile} busy={busy} disabled={false} label="שלח בקשה להורה" />
              </>
            )}

            {cat === 'free' && (
              <>
                <Field label="מה תרצה לבקש?">
                  <textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={4}
                    className={inputCls.replace('text-lg', 'text-base') + ' resize-none'} placeholder="אבא/אמא, אני רוצה לבקש..." autoFocus />
                </Field>
                <Submit onClick={submitFree} busy={busy} disabled={!title.trim()} label="שלח בקשה להורה" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Submit({ onClick, busy, disabled, label }) {
  return (
    <button onClick={onClick} disabled={busy || disabled}
      className="w-full py-4 rounded-2xl font-black text-white text-base active:scale-95 transition-all disabled:opacity-40"
      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 18px rgba(99,102,241,0.4)' }}>
      {busy ? '...שולח' : `📨 ${label}`}
    </button>
  )
}

function MyRequests({ myRequests }) {
  const list = (myRequests || []).filter((r) => r.type && r.type !== 'chore' && r.type !== 'prize')
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 12)
  if (list.length === 0) return null
  return (
    <div>
      <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider px-1 mb-2">הבקשות שלי</p>
      <div className="space-y-2">
        {list.map((r) => {
          const d = describeRequest(r)
          const resolved = isResolved(r)
          const approved = r.status === 'approved'
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
              style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(255,255,255,0.7)' }}>
              <span className="text-xl flex-shrink-0">{d.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{d.title}</p>
                {!approved && r.parentNote && <p className="text-[11px] text-rose-400 truncate">💬 {r.parentNote}</p>}
              </div>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                !resolved ? 'bg-amber-100 text-amber-700' : approved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
              }`}>
                {!resolved ? '⏳ ממתין' : approved ? '✓ אושר' : '✗ נדחה'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
