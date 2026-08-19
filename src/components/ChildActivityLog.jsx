import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { celebrateGoal } from '../lib/confetti.js'
import { sounds } from '../lib/sounds.js'
import { formatNumber } from '../lib/utils.js'
import { describeRequest, isActionable, isResolved } from '../lib/requests.js'

function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000
  if (d < 60)    return 'עכשיו'
  if (d < 3600)  return `לפני ${Math.floor(d / 60)} דק׳`
  if (d < 86400) return `לפני ${Math.floor(d / 3600)} שע׳`
  return new Date(ts).toLocaleDateString('he', { day: 'numeric', month: 'short' })
}

const ACT_META = {
  savings_open:     { icon: '🏦', label: 'פתח חסכון',    color: 'text-sky-600'     },
  savings_close:    { icon: '💰', label: 'פדה חסכון',    color: 'text-emerald-600' },
  savings_early:    { icon: '⚠️', label: 'פדיון מוקדם',  color: 'text-amber-600'   },
  transfer_out:     { icon: '💸', label: 'העביר',         color: 'text-indigo-600'  },
  wheel_spin:       { icon: '🎰', label: 'גלגל המזל',    color: 'text-violet-600'  },
  wheel_win:        { icon: '🎉', label: 'זכה בגלגל',    color: 'text-emerald-600' },
  prize_redeem:     { icon: '🎁', label: 'מימש פרס',     color: 'text-purple-600'  },
  parent_stars_add: { icon: '⭐', label: 'הוסיף כוכבים', color: 'text-amber-500'   },
  parent_money_add: { icon: '💵', label: 'הוסיף כסף',   color: 'text-emerald-600' },
  expense:          { icon: '🛒', label: 'הוצאה',         color: 'text-rose-600'    },
  penalty:          { icon: '⚠️', label: 'קנס',           color: 'text-red-600'     },
  loan:             { icon: '💳', label: 'הלוואה',        color: 'text-orange-600'  },
  loan_repay:       { icon: '💳', label: 'פרעון',         color: 'text-teal-600'    },
  chore_assign:     { icon: '📋', label: 'מטלה חדשה',    color: 'text-blue-600'    },
  convert_stars:    { icon: '💱', label: 'המיר כוכבים',  color: 'text-sky-600'     },
}

const CREDIT_TYPES = new Set(['wheel_win', 'savings_close', 'savings_early', 'parent_stars_add', 'parent_money_add', 'loan', 'convert_stars'])
const DEBIT_TYPES  = new Set(['savings_open', 'wheel_spin', 'prize_redeem', 'expense', 'penalty', 'loan_repay', 'transfer_out'])

// One request awaiting the parent's decision. Handles its own "details" panel
// for approve-with-edit and reject-with-reason.
function ApprovalCard({ pc, childName, isMulti, isSel, onToggleSelect, onApprove, onReject, busy }) {
  const d = describeRequest(pc)
  const [open, setOpen]   = useState(false)
  const [amt, setAmt]     = useState(pc.amount != null ? String(pc.amount) : '')
  const [reason, setReason] = useState('')
  const [rStars, setRStars] = useState('')
  const [rShek, setRShek]   = useState('')

  const hasAmount = pc.amount != null
  const isFree    = pc.type === 'free'
  const isDone    = pc.status === 'done'
  const stateLabel = isDone ? '✅ הושלם — ממתין לאישורך' : `מבקש: ${d.typeLabel}`

  function approveNow() {
    if (isFree) {
      onApprove(pc, { rewardStars: parseFloat(rStars) || 0, rewardShekels: parseFloat(rShek) || 0 })
    } else if (open && hasAmount && amt !== '') {
      onApprove(pc, { amount: parseFloat(amt) })
    } else {
      onApprove(pc, {})
    }
  }

  return (
    <div
      onClick={isMulti ? () => onToggleSelect(pc.id) : undefined}
      className={`rounded-2xl overflow-hidden transition-all ${isMulti ? 'cursor-pointer' : ''} ${isSel ? 'ring-2 ring-emerald-400' : ''}`}
      style={{ background: isSel ? 'rgba(236,253,245,0.98)' : 'rgba(255,255,255,0.95)', border: '1.5px solid rgba(245,158,11,0.25)', boxShadow: '0 2px 10px rgba(245,158,11,0.1)' }}>
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        {isMulti && (
          <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSel ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'}`}>
            {isSel && <span className="text-white text-[11px] font-black leading-none">✓</span>}
          </div>
        )}
        <span className="text-2xl flex-shrink-0">{d.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-800">{childName}</p>
          <p className="text-xs font-semibold text-gray-600 truncate">{d.title}</p>
          {pc.note && <p className="text-[11px] text-gray-400 truncate">💬 {pc.note}</p>}
          <p className="text-[11px] font-bold text-amber-600">{stateLabel}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {d.amount && <p className="text-sm font-black text-amber-600" dir="ltr">{d.amount}</p>}
          <p className="text-[10px] text-gray-400">{timeAgo(pc.timestamp)}</p>
        </div>
      </div>

      {/* Details panel: approve-with-edit / reject-with-reason */}
      {!isMulti && open && (
        <div className="px-4 pb-3 pt-1 space-y-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
          {isFree ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 flex-shrink-0">בונוס (אופ׳):</span>
              <input type="number" min="0" value={rStars} onChange={(e) => setRStars(e.target.value)} placeholder="0"
                className="w-14 text-center text-sm font-bold rounded-lg border-2 border-gray-200 py-1 focus:border-amber-400 focus:outline-none" dir="ltr" />
              <span className="text-xs">⭐</span>
              <input type="number" min="0" value={rShek} onChange={(e) => setRShek(e.target.value)} placeholder="0"
                className="w-14 text-center text-sm font-bold rounded-lg border-2 border-gray-200 py-1 focus:border-emerald-400 focus:outline-none" dir="ltr" />
              <span className="text-xs">₪</span>
            </div>
          ) : hasAmount && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 flex-shrink-0">אשר עם סכום:</span>
              <input type="number" min="0" step="0.1" value={amt} onChange={(e) => setAmt(e.target.value)}
                className="w-20 text-center text-sm font-bold rounded-lg border-2 border-gray-200 py-1 focus:border-emerald-400 focus:outline-none" dir="ltr" />
              <span className="text-xs">{pc.currency === 'shekels' ? '₪' : '⭐'}</span>
            </div>
          )}
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="סיבת דחייה (אופציונלי)"
            className="w-full text-sm rounded-lg border-2 border-gray-200 px-3 py-1.5 focus:border-rose-400 focus:outline-none" />
        </div>
      )}

      <div className="flex border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={approveNow}
          disabled={busy === pc.id}
          className="flex-1 py-2.5 text-sm font-black text-emerald-600 active:bg-emerald-50 transition-colors disabled:opacity-50">
          {busy === pc.id ? '...' : '✅ אשר'}
        </button>
        {!isMulti && (
          <>
            <div className="w-px bg-gray-100" />
            <button
              onClick={() => setOpen((v) => !v)}
              className={`px-4 py-2.5 text-sm font-black transition-colors ${open ? 'text-amber-700 bg-amber-50' : 'text-gray-400'}`}>
              ✏️
            </button>
          </>
        )}
        <div className="w-px bg-gray-100" />
        <button
          onClick={() => onReject(pc, reason)}
          className="flex-1 py-2.5 text-sm font-black text-rose-500 active:bg-rose-50 transition-colors">
          ❌ דחה
        </button>
      </div>
    </div>
  )
}

export default function ChildActivityLog({ onClose }) {
  const {
    childActivity, markChildActivityRead,
    pendingChores, children,
    approveRequest, rejectRequest,
  } = useApp()

  const [busy, setBusy]         = useState(null)
  const [selected, setSelected] = useState(() => new Set())

  function getChildName(childId) {
    return children?.find((c) => c.id === childId)?.name || ''
  }

  // Items awaiting parent action — any request type
  const actionItems = (pendingChores || [])
    .filter(isActionable)
    .sort((a, b) => b.timestamp - a.timestamp)

  useEffect(() => {
    const validIds = new Set(actionItems.map((pc) => pc.id))
    setSelected((prev) => new Set([...prev].filter((id) => validIds.has(id))))
  }, [actionItems.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    markChildActivityRead()
    onClose()
  }

  // Resolved requests (last 7 days) — shown as history cards
  const cutoff = Date.now() - 7 * 86400000
  const resolvedItems = (pendingChores || [])
    .filter((pc) => isResolved(pc) && (pc.decidedAt || pc.timestamp) > cutoff)
    .sort((a, b) => (b.decidedAt || b.timestamp) - (a.decidedAt || a.timestamp))
    .slice(0, 15)

  const historyItems = [
    ...childActivity.map((e) => ({ ...e, _kind: 'activity' })),
    ...resolvedItems.map((pc) => {
      const d = describeRequest(pc)
      return {
        _kind: 'resolved',
        id: pc.id,
        childName: getChildName(pc.childId) || pc.childName,
        timestamp: pc.decidedAt || pc.timestamp,
        status: pc.status,
        emoji: d.emoji,
        title: d.title,
        amount: d.amount,
        parentNote: pc.parentNote,
      }
    }),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50)

  async function handleApprove(pc, opts) {
    setBusy(pc.id)
    try {
      approveRequest(pc.id, opts)
      sounds.approve()
      celebrateGoal()
    } finally { setBusy(null) }
  }

  function handleReject(pc, reason) {
    rejectRequest(pc.id, reason)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 100%)' }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-12 pb-4"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
        <div>
          <h1 className="text-lg font-black text-gray-800">🔔 בקשות ועדכונים</h1>
          {actionItems.length > 0 && (
            <p className="text-xs text-amber-600 font-semibold">{actionItems.length} ממתינות לאישור</p>
          )}
        </div>
        <button onClick={handleClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold text-gray-500 active:scale-90 transition-all"
          style={{ background: 'rgba(243,244,246,0.9)' }}>×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── Awaiting approval ───────────────────────────────────────────── */}
        {actionItems.length > 0 && (() => {
          const isMulti   = actionItems.length >= 2
          const allSel    = isMulti && selected.size === actionItems.length
          const bulkCount = selected.size

          function toggleSelect(id) {
            setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
          }
          function toggleAll() {
            setSelected(allSel ? new Set() : new Set(actionItems.map((pc) => pc.id)))
          }
          async function approveSelected() {
            const ids = [...selected]
            sounds.approve()
            celebrateGoal()
            for (const id of ids) approveRequest(id, {})
            setSelected(new Set())
          }

          return (
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-black text-amber-600 uppercase tracking-wider">
                  ⏳ מחכות לאישור שלך
                </p>
                {isMulti && (
                  <button onClick={toggleAll}
                    className="text-xs font-bold text-amber-700 px-2.5 py-1 rounded-full bg-amber-100 active:scale-95">
                    {allSel ? 'בטל הכל' : 'בחר הכל'}
                  </button>
                )}
              </div>

              {actionItems.map((pc) => (
                <ApprovalCard
                  key={pc.id}
                  pc={pc}
                  childName={getChildName(pc.childId) || pc.childName}
                  isMulti={isMulti}
                  isSel={selected.has(pc.id)}
                  onToggleSelect={toggleSelect}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  busy={busy}
                />
              ))}

              {isMulti && bulkCount >= 2 && (
                <button onClick={approveSelected}
                  className="w-full py-4 rounded-2xl font-black text-white text-base active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 18px rgba(16,185,129,0.45)' }}>
                  ✅ אשר {bulkCount} בקשות
                </button>
              )}
            </section>
          )
        })()}

        {/* ── History ─────────────────────────────────────────────────────── */}
        {historyItems.length === 0 && actionItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-gray-400 font-semibold">אין עדיין בקשות</p>
            <p className="text-gray-300 text-sm mt-1">בקשות של הילדים יופיעו כאן</p>
          </div>
        ) : historyItems.length > 0 && (
          <section className="space-y-2">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider px-1">📋 היסטוריה</p>
            {historyItems.map((item) => {
              if (item._kind === 'activity') {
                const meta     = ACT_META[item.type] || { icon: '📋', label: item.type, color: 'text-gray-600' }
                const isCredit = CREDIT_TYPES.has(item.type)
                const isDebit  = DEBIT_TYPES.has(item.type)
                const amtSign  = isCredit ? '+' : isDebit ? '-' : ''
                const unit     = item.currency === 'stars' ? '⭐' : '₪'
                const isParent = item.source === 'parent'
                return (
                  <div key={item.id}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(255,255,255,0.7)' }}>
                    <span className="text-xl flex-shrink-0">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-800">{item.childName}</p>
                        {isParent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">הורה</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{item.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {item.amount > 0 && (
                        <p className={`text-sm font-black ${meta.color}`} dir="ltr">
                          {amtSign}{formatNumber(item.amount)}{unit}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400">{timeAgo(item.timestamp)}</p>
                    </div>
                  </div>
                )
              }
              // Resolved request
              const approved = item.status === 'approved'
              return (
                <div key={item.id}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: approved ? 'rgba(240,253,244,0.9)' : 'rgba(255,241,242,0.9)', border: `1.5px solid ${approved ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}` }}>
                  <span className="text-xl flex-shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{item.childName}</p>
                    <p className="text-xs text-gray-500 truncate">{item.title}</p>
                    {!approved && item.parentNote && <p className="text-[11px] text-rose-400 truncate">💬 {item.parentNote}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-black px-2 py-0.5 rounded-full ${approved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                      {approved ? '✓ אושר' : '✗ נדחה'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(item.timestamp)}</p>
                  </div>
                </div>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}
