import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { celebrateGoal } from '../lib/confetti.js'
import { sounds } from '../lib/sounds.js'
import { formatNumber } from '../lib/utils.js'

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
}

const CREDIT_TYPES = new Set(['wheel_win', 'savings_close', 'savings_early', 'parent_stars_add', 'parent_money_add', 'loan'])
const DEBIT_TYPES  = new Set(['savings_open', 'wheel_spin', 'prize_redeem', 'expense', 'penalty', 'loan_repay', 'transfer_out'])

export default function ChildActivityLog({ onClose }) {
  const {
    childActivity, markChildActivityRead,
    pendingChores, children,
    approvePendingChore, rejectPendingChore,
    approvePendingPrize, rejectPendingPrize,
  } = useApp()

  const [busy, setBusy] = useState(null)

  function handleClose() {
    markChildActivityRead()
    onClose()
  }

  function getChildName(childId) {
    return children?.find((c) => c.id === childId)?.name || ''
  }

  // Items awaiting parent action
  const actionItems = (pendingChores || [])
    .filter((pc) => pc.status === 'pending' || (pc.source === 'parent' && pc.status === 'done'))
    .sort((a, b) => b.timestamp - a.timestamp)

  // Resolved pending chores (last 7 days) — show as history cards
  const cutoff = Date.now() - 7 * 86400000
  const resolvedItems = (pendingChores || [])
    .filter((pc) => (pc.status === 'approved' || pc.status === 'rejected') && pc.timestamp > cutoff)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 15)

  // Merge childActivity + resolved chores → sorted history
  const historyItems = [
    ...childActivity.map((e) => ({ ...e, _kind: 'activity' })),
    ...resolvedItems.map((pc) => ({
      _kind: 'resolved',
      id: pc.id,
      childId: pc.childId,
      childName: getChildName(pc.childId),
      timestamp: pc.timestamp,
      status: pc.status,
      choreName: pc.choreName,
      choreEmoji: pc.choreEmoji,
      amount: pc.amount,
      currency: pc.currency,
      type: pc.type === 'prize' ? 'prize_redeem' : 'chore',
    })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50)

  async function handleApprove(pc) {
    setBusy(pc.id)
    try {
      if (pc.type === 'prize') approvePendingPrize(pc.id)
      else approvePendingChore(pc.id)
      sounds.approve()
      celebrateGoal()
    } finally { setBusy(null) }
  }

  function handleReject(pc) {
    if (pc.type === 'prize') rejectPendingPrize(pc.id)
    else rejectPendingChore(pc.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 100%)' }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-12 pb-4"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
        <div>
          <h1 className="text-lg font-black text-gray-800">🔔 עדכוני ילדים</h1>
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
        {actionItems.length > 0 && (
          <section className="space-y-2">
            <p className="text-[11px] font-black text-amber-600 uppercase tracking-wider px-1">
              ⏳ מחכות לאישור שלך
            </p>
            {actionItems.map((pc) => {
              const isDone   = pc.status === 'done'
              const isPrize  = pc.type === 'prize'
              const label    = isDone ? '✅ הושלם — ממתין לאישורך' : isPrize ? '🎁 מבקש לממש פרס' : '📝 ביקש אישור מטלה'
              const labelColor = isDone ? 'text-emerald-600' : isPrize ? 'text-purple-600' : 'text-amber-600'
              return (
                <div key={pc.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.95)', border: '1.5px solid rgba(245,158,11,0.25)', boxShadow: '0 2px 10px rgba(245,158,11,0.1)' }}>
                  <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                    <span className="text-2xl flex-shrink-0">{pc.choreEmoji || (isPrize ? '🎁' : '✅')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-800">{getChildName(pc.childId)}</p>
                      <p className="text-xs font-semibold text-gray-600 truncate">{pc.choreName}</p>
                      <p className={`text-[11px] font-bold ${labelColor}`}>{label}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-amber-600">{pc.amount}⭐</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(pc.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex border-t border-gray-100">
                    <button
                      onClick={() => handleApprove(pc)}
                      disabled={busy === pc.id}
                      className="flex-1 py-2.5 text-sm font-black text-emerald-600 active:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      {busy === pc.id ? '...' : isPrize ? '✅ אשר מימוש' : '✅ אשר'}
                    </button>
                    <div className="w-px bg-gray-100" />
                    <button
                      onClick={() => handleReject(pc)}
                      className="flex-1 py-2.5 text-sm font-black text-rose-500 active:bg-rose-50 transition-colors"
                    >
                      ❌ דחה
                    </button>
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {/* ── History ─────────────────────────────────────────────────────── */}
        {historyItems.length === 0 && actionItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-gray-400 font-semibold">אין עדיין פעולות</p>
            <p className="text-gray-300 text-sm mt-1">פעולות של הילדים וההורים יופיעו כאן</p>
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
              // Resolved chore / prize request
              const approved = item.status === 'approved'
              const isPrize  = item.type === 'prize_redeem'
              return (
                <div key={item.id}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: approved ? 'rgba(240,253,244,0.9)' : 'rgba(255,241,242,0.9)', border: `1.5px solid ${approved ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}` }}>
                  <span className="text-xl flex-shrink-0">{item.choreEmoji || (isPrize ? '🎁' : '✅')}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{item.childName}</p>
                    <p className="text-xs text-gray-500 truncate">{item.choreName}</p>
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
