import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { registerCoinTarget } from '../lib/animations.js'
import { useApp } from '../context/AppContext.jsx'
import { useSwipeBack } from '../hooks/useSwipeBack.js'
import { getTotalValue, getGoals, getGoalProgress, formatNumber, daysUntilBirthday, calculateStreak, getLevel, buildBalanceHistory } from '../lib/utils.js'
import { celebrateGoal } from '../lib/confetti.js'
import { sounds } from '../lib/sounds.js'
import { describeRequest } from '../lib/requests.js'
import GoalProgressBar from './GoalProgressBar.jsx'
import TransactionList from './TransactionList.jsx'
import WeeklySummary from './WeeklySummary.jsx'
import Button from './ui/Button.jsx'
import HintBanner from './ui/HintBanner.jsx'
import { CARD_GRADIENTS, COLOR_OPTIONS, DEFAULT_PRIZES, DEFAULT_CHORES } from '../lib/defaults.js'

// Long-press hook: fires onLong after holdMs, onTap on quick release.
// Cancels entirely if finger moves >8px (i.e. the user is scrolling).
function useLongPress(onTap, onLong, holdMs = 1500) {
  const timer    = useRef(null)
  const fired    = useRef(false)
  const moved    = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  const start = useCallback((e) => {
    fired.current = false
    moved.current = false
    const t = e.touches?.[0]
    if (t) startPos.current = { x: t.clientX, y: t.clientY }
    timer.current = setTimeout(() => {
      if (!moved.current) { fired.current = true; onLong() }
    }, holdMs)
  }, [onLong, holdMs])

  const move = useCallback((e) => {
    const t = e.touches?.[0]
    if (!t) return
    const dx = Math.abs(t.clientX - startPos.current.x)
    const dy = Math.abs(t.clientY - startPos.current.y)
    if (dx > 8 || dy > 8) { moved.current = true; clearTimeout(timer.current) }
  }, [])

  const cancel = useCallback(() => {
    moved.current = true
    clearTimeout(timer.current)
  }, [])

  const end = useCallback(() => {
    clearTimeout(timer.current)
    if (!fired.current && !moved.current) onTap()
  }, [onTap])

  return {
    onMouseDown: start, onMouseUp: end, onMouseLeave: cancel,
    onTouchStart: start, onTouchMove: move, onTouchEnd: end,
  }
}

function IconCloud({ icons }) {
  if (!icons.length) return null
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {icons.map((emoji, i) => {
        const angle = (i * 137.508) % 360
        const r     = 12 + (i % 5) * 9
        const x     = 50 + r * Math.cos(angle * Math.PI / 180)
        const y     = 50 + r * Math.sin(angle * Math.PI / 180)
        const dx    = 5 + (i % 6) * 2.5
        const dy    = 3 + (i % 4) * 1.5
        const dur   = 4 + (i % 5) * 0.9
        const del   = -((i * 1.4) % dur)
        return (
          <span key={i} className="absolute leading-none select-none" style={{
            left: `${Math.max(8, Math.min(90, x))}%`,
            top:  `${Math.max(8, Math.min(90, y))}%`,
            fontSize: 9, opacity: 0.4,
            animationName:           'icon-drift',
            animationDuration:       `${dur}s`,
            animationDelay:          `${del}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDirection:      'alternate',
            '--dx': `${dx}px`, '--dy': `${dy}px`,
          }}>{emoji}</span>
        )
      })}
    </div>
  )
}

function StatTile({ icon, label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <div className="text-lg mb-0.5">{icon}</div>
      <div className={`text-base font-black ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 leading-tight mt-0.5">{label}</div>
    </div>
  )
}

function MonthlySummary({ transactions }) {
  const now = Date.now()
  const monthAgo = now - 30 * 86400000
  const monthTx = transactions.filter((tx) => tx.timestamp >= monthAgo)
  if (monthTx.length === 0) return null

  const starsEarned = monthTx
    .filter((tx) => tx.currency === 'stars' && tx.type === 'chore')
    .reduce((s, tx) => s + tx.amount, 0)
  const prizesRedeemed = monthTx
    .filter((tx) => tx.type === 'prize_redeem')
    .reduce((s, tx) => s + tx.amount, 0)
  const shekelIn = monthTx
    .filter((tx) => tx.currency === 'shekels' && ['gift', 'other', 'convert_in', 'savings_close'].includes(tx.type))
    .reduce((s, tx) => s + tx.amount, 0)
  const shekelOut = monthTx
    .filter((tx) => tx.type === 'expense')
    .reduce((s, tx) => s + tx.amount, 0)
  const tiles = [
    starsEarned > 0  && { icon: '⭐', label: 'כוכבים נצברו',  value: `+${formatNumber(starsEarned)}`,     color: 'text-amber-700',   bg: 'bg-amber-100'   },
    prizesRedeemed > 0 && { icon: '🎁', label: 'פרסים מומשו',   value: `-${formatNumber(prizesRedeemed)}⭐`, color: 'text-purple-700',  bg: 'bg-purple-100'  },
    shekelIn > 0     && { icon: '💵', label: 'כסף נכנס',       value: `+${formatNumber(shekelIn)}₪`,       color: 'text-emerald-700', bg: 'bg-emerald-100' },
    shekelOut > 0    && { icon: '🛍️', label: 'קניות',           value: `-${formatNumber(shekelOut)}₪`,      color: 'text-rose-700',    bg: 'bg-rose-100'    },
  ].filter(Boolean)

  if (tiles.length === 0) return null

  return (
    <div className="rounded-[24px] p-4" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 24px rgba(0,0,0,0.07), inset 0 1px 2px rgba(255,255,255,0.9)' }}>
      <h3 className="font-black text-gray-800 text-sm mb-3">📅 30 הימים האחרונים</h3>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => <StatTile key={t.label} {...t} />)}
      </div>
    </div>
  )
}

const GRAPH_PERIODS = [
  { days: 30,  label: 'חודש'    },
  { days: 180, label: 'חצי שנה' },
  { days: 365, label: 'שנה'     },
]

// Evenly sample maxN points, always including first and last
function samplePoints(pts, maxN) {
  if (pts.length <= maxN) return pts
  return Array.from({ length: maxN }, (_, i) =>
    pts[Math.round(i * (pts.length - 1) / (maxN - 1))]
  )
}

function fmtGraphLabel(date, days) {
  if (days <= 30) return `${date.getDate()}/${date.getMonth() + 1}`
  return new Intl.DateTimeFormat('he', { month: 'short' }).format(date)
}

function BalanceGraph({ transactions, currentBalance }) {
  const [days, setDays] = useState(30)

  const allPoints = buildBalanceHistory(transactions, currentBalance, days)
  const points    = samplePoints(allPoints, 30)
  const maxBal    = Math.max(...points.map(p => p.balance))
  if (maxBal === 0) return null

  const W = 300, H = 72
  const PT = 8, PB = 22, PX_L = 34, PX_R = 4
  const iW = W - PX_L - PX_R, iH = H - PT - PB
  const minBal = Math.min(...points.map(p => p.balance))
  const range  = Math.max(maxBal - minBal, 1)
  const N      = points.length
  const bottom = PT + iH

  const px = i => (PX_L + (i / (N - 1)) * iW).toFixed(1)
  const py = b  => (PT + iH - ((b - minBal) / range) * iH).toFixed(1)

  const pts     = points.map((p, i) => `${px(i)},${py(p.balance)}`)
  const lineStr = pts.join(' ')
  const areaStr = `M${px(0)},${bottom} ${pts.map(pt => `L${pt}`).join(' ')} L${px(N-1)},${bottom} Z`

  const last  = points[N - 1]
  const first = points[0]
  const diff  = last.balance - first.balance
  const isUp  = diff >= 0

  // 3 Y-axis reference levels (deduplicated when range is tiny)
  const gridLevels = range > 2
    ? [maxBal, (maxBal + minBal) / 2, minBal]
    : [maxBal]

  return (
    <div className="rounded-[24px] p-4" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 24px rgba(0,0,0,0.07), inset 0 1px 2px rgba(255,255,255,0.9)' }}>
      {/* Header + period toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-gray-800 text-sm">📈 יתרה</h3>
          {diff !== 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
              {isUp ? '▲' : '▼'} {formatNumber(Math.abs(diff))}₪
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl"
             style={{ background: 'rgba(243,244,246,0.9)', border: '1px solid rgba(229,231,235,0.6)' }}>
          {GRAPH_PERIODS.map(p => (
            <button key={p.days} onClick={() => setDays(p.days)}
              className="text-[11px] font-bold px-2 py-1 rounded-[10px] transition-all duration-200 cursor-pointer"
              style={days === p.days
                ? { background: 'white', color: '#059669', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }
                : { color: '#9ca3af' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <svg key={days} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y-axis gridlines + labels */}
        {gridLevels.map((v, i) => (
          <g key={i}>
            <line x1={PX_L} y1={py(v)} x2={W - PX_R} y2={py(v)}
                  stroke="rgba(148,163,184,0.22)" strokeWidth="1" strokeDasharray="4,3" />
            <text x={PX_L - 3} y={py(v)} textAnchor="end" dominantBaseline="middle"
                  fontSize="8" fill="#94a3b8">
              {Math.round(v)}₪
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaStr} fill="url(#balGrad)" />

        {/* Line */}
        <polyline points={lineStr} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Opening dot + value */}
        <circle cx={px(0)} cy={py(first.balance)} r="3" fill="white" stroke="#10b981" strokeWidth="1.5" />
        <text x={Number(px(0)) + 4} y={Number(py(first.balance)) - 5} textAnchor="start" fontSize="8" fill="#6b7280">
          {Math.round(first.balance)}₪
        </text>

        {/* Today dot + value */}
        <circle cx={px(N-1)} cy={py(last.balance)} r="3.5" fill="#10b981" stroke="white" strokeWidth="1.5" />
        <text x={Number(px(N-1)) - 4} y={Number(py(last.balance)) - 6} textAnchor="end" fontSize="9" fill="#059669" fontWeight="bold">
          {formatNumber(last.balance)}₪
        </text>
      </svg>

      {/* Date labels — first, mid, today */}
      <div className="flex justify-between mt-1" style={{ paddingRight: PX_R, paddingLeft: PX_L }}>
        {[0, Math.floor(N / 2), N - 1].map(i => (
          <span key={i} className="text-[10px] text-gray-400 font-medium">
            {i === N - 1 ? 'היום' : fmtGraphLabel(points[i].date, days)}
          </span>
        ))}
      </div>
    </div>
  )
}

function PendingChoresCard({ requests, onApprove, onApproveMany, onReject }) {
  const [confirmReject, setConfirmReject] = useState(null)
  const [selected, setSelected]           = useState(() => new Set(requests.map((r) => r.id)))

  // Keep selected in sync when requests list changes (approval removes items)
  useEffect(() => {
    const validIds = new Set(requests.map((r) => r.id))
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)))
      // Also add any brand-new items
      requests.forEach((r) => next.add(r.id))
      return next
    })
  }, [requests.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!confirmReject) return
    const t = setTimeout(() => setConfirmReject(null), 3000)
    return () => clearTimeout(t)
  }, [confirmReject])

  const isMulti     = requests.length >= 2
  const allSelected = selected.size === requests.length
  const bulkCount   = selected.size

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(requests.map((r) => r.id)))
  }

  function approveSelected() {
    onApproveMany([...selected])
    setSelected(new Set())
  }


  return (
    <div className="rounded-[22px] p-4 space-y-3 animate-slide-up"
      style={{ background: 'rgba(255,251,235,0.95)', border: '1.5px solid rgba(245,158,11,0.3)', boxShadow: '0 4px 16px rgba(245,158,11,0.12), inset 0 1px 1px rgba(255,255,255,0.8)' }}>

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-base">📝</span>
        <p className="text-sm font-black text-amber-800">ממתינות לאישור</p>
        <span className="mr-auto text-xs font-black bg-amber-500 text-white rounded-full px-2 py-0.5 animate-pop">
          {requests.length}
        </span>
        {isMulti && (
          <button onClick={toggleAll}
            className="text-xs font-bold text-amber-700 px-2.5 py-1 rounded-full bg-amber-100 active:scale-95">
            {allSelected ? 'בטל הכל' : 'בחר הכל'}
          </button>
        )}
      </div>

      {/* Rows */}
      {requests.map((req) => {
        const isSel = isMulti && selected.has(req.id)
        return (
          <div key={req.id}
            onClick={isMulti ? () => toggleSelect(req.id) : undefined}
            className={`rounded-2xl px-3 py-3 space-y-2.5 transition-all ${isMulti ? 'cursor-pointer' : ''} ${isSel ? 'bg-emerald-50 ring-2 ring-emerald-300' : 'bg-white/70'}`}>
            <div className="flex items-center gap-2">
              {/* Checkbox */}
              {isMulti && (
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSel ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'}`}>
                  {isSel && <span className="text-white text-[11px] font-black leading-none">✓</span>}
                </div>
              )}
              {(() => { const d = describeRequest(req); return (
                <>
                  <span className="text-xl flex-shrink-0">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{d.title}</p>
                    {d.amount && <p className="text-xs text-amber-600 font-bold" dir="ltr">{d.amount}</p>}
                    {d.note && <p className="text-[11px] text-gray-400 truncate">💬 {d.note}</p>}
                    {req.source === 'parent' && req.status === 'done' && (
                      <p className="text-[10px] text-indigo-500 font-semibold">📌 משימה שהוקצתה — הילד סיים</p>
                    )}
                  </div>
                </>
              )})()}
            </div>
            {/* Individual approve / reject */}
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onApprove(req.id)}
                className="flex-1 py-2 rounded-xl text-sm font-black text-white active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 3px 10px rgba(16,185,129,0.4)' }}>
                ✅ אשר
              </button>
              {confirmReject === req.id ? (
                <button
                  onClick={() => { onReject(req.id); setConfirmReject(null) }}
                  className="flex-1 py-2 rounded-xl text-sm font-black text-white bg-rose-500 active:scale-95 transition-all animate-pulse">
                  בטוח? ✗
                </button>
              ) : (
                <button
                  onClick={() => setConfirmReject(req.id)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-rose-500 bg-rose-50 border-2 border-rose-200 active:scale-95 transition-all">
                  ❌ דחה
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Bulk approve button — shows when 2+ are selected */}
      {isMulti && bulkCount >= 2 && (
        <button onClick={approveSelected}
          className="w-full py-4 rounded-2xl font-black text-white text-base active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 18px rgba(16,185,129,0.45)' }}>
          ✅ אשר {bulkCount} בקשות
        </button>
      )}
    </div>
  )
}

function AssignChorePanel({ childId, chores, addAssignedChore }) {
  const [open, setOpen] = useState(false)
  const { pendingChores } = useApp()
  const choreList = chores?.length ? chores : DEFAULT_CHORES

  function handleAssign(chore) {
    addAssignedChore(childId, {
      choreId: chore.id,
      choreName: chore.name,
      choreEmoji: chore.emoji,
      amount: chore.defaultStars,
      currency: 'stars',
    })
    sounds.send()
    navigator.vibrate?.([20, 10, 30])
  }

  const assignedIds = new Set(
    (pendingChores || [])
      .filter((pc) => pc.childId === childId && pc.source === 'parent' && (pc.status === 'assigned' || pc.status === 'done'))
      .map((pc) => pc.choreId)
  )

  return (
    <div className="rounded-[22px] overflow-hidden animate-slide-up"
      style={{ background: 'rgba(238,242,255,0.9)', border: '1.5px solid rgba(99,102,241,0.2)', boxShadow: '0 4px 16px rgba(99,102,241,0.1)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📌</span>
          <span className="text-sm font-black text-indigo-800">שלח מטלה לילד</span>
          {assignedIds.size > 0 && (
            <span className="text-xs font-black bg-indigo-500 text-white rounded-full px-2 py-0.5">
              {assignedIds.size}
            </span>
          )}
        </div>
        <span className="text-indigo-400 text-lg leading-none transition-transform duration-200"
              style={{ transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1 border-t border-indigo-100/60">
          {choreList.map((chore) => {
            const isAssigned = assignedIds.has(chore.id)
            return (
              <div key={chore.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl flex-shrink-0">{chore.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-700 truncate">{chore.name}</p>
                    <p className="text-xs text-amber-600 font-bold">+{chore.defaultStars}⭐</p>
                  </div>
                </div>
                {isAssigned ? (
                  <span className="text-xs font-bold text-indigo-500 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full flex-shrink-0">
                    📌 הוקצה
                  </span>
                ) : (
                  <button
                    onClick={() => handleAssign(chore)}
                    className="text-xs font-black text-white px-4 py-1.5 rounded-full active:scale-90 transition-all flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}
                  >
                    שלח 📌
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StarIconCloud({ count }) {
  const n = Math.min(Math.round(count), 50)
  return <IconCloud icons={Array.from({ length: n }, () => '⭐')} />
}

function ShekelIconCloud({ balance }) {
  if (balance <= 0) return <IconCloud icons={[]} />
  const total    = Math.max(5, Math.min(30, Math.round(5 + 25 * Math.sqrt(balance / 1000))))
  const billFrac = Math.min(balance / 500, 1)
  const bills    = Math.round(total * billFrac * 0.6)
  const coins    = total - bills
  return <IconCloud icons={[...Array(bills).fill('💵'), ...Array(coins).fill('🪙')]} />
}

export default function ChildDashboard({ childId }) {
  const { children, chores: allChores, navigate, showModal, settings, getTransactions,
          adjustShekels, adjustStars, deleteGoal, addTransaction, finishSavings,
          addMoney, updateChild,
          pendingBadge, clearPendingBadge,
          pendingFreeSpin, clearPendingFreeSpin,
          pendingChores, addAssignedChore, approvePendingChore, rejectPendingChore } = useApp()
  const transactions = getTransactions(childId)
  const [hint, setHint] = useState(null)
  const [flyingStar, setFlyingStar] = useState(false)

  const backBtnRef   = useRef(null)
  const prevLevelRef = useRef(null)

  const child = children.find((c) => c.id === childId)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [childId])

  useEffect(() => {
    if (!child) navigate('home')
  }, [child, navigate])

  useSwipeBack(useCallback(() => navigate('home'), [navigate]))

  useEffect(() => {
    if (!child?.birthday) return
    const days = daysUntilBirthday(child.birthday)
    if (days === 0) { celebrateGoal(); sounds.birthday() }
  }, [child?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-mature savings when their maturity date has passed
  useEffect(() => {
    if (!child) return
    const now = Date.now()
    const matured = (child.savings || []).filter((s) => s.status === 'active' && s.maturityDate <= now)
    matured.forEach((s) => finishSavings(childId, s.id, 'matured'))
    if (matured.length > 0) setHint(`🎉 ${matured.length > 1 ? 'חסכונות הבשילו' : 'חסכון הבשיל'}!`)
  }, [childId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-pay allowance if it's due for this period
  useEffect(() => {
    if (!child?.allowance?.enabled || !child.allowance.amount) return
    const { amount, period, lastPaid } = child.allowance
    const now = new Date()
    const periodStart = period === 'monthly'
      ? new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      : (() => { const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d.getTime() })()
    if (!lastPaid || lastPaid < periodStart) {
      addMoney(childId, amount)
      addTransaction(childId, {
        type: 'allowance',
        amount,
        currency: 'shekels',
        description: `💰 קצבה ${period === 'monthly' ? 'חודשית' : 'שבועית'} — ${formatNumber(amount)}₪`,
      })
      updateChild(childId, { allowance: { ...child.allowance, lastPaid: Date.now() } })
      setHint(`💰 קצבה ${period === 'monthly' ? 'חודשית' : 'שבועית'} שולמה!`)
    }
  }, [childId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Show penalty hint once per day per child (sessionStorage survives navigation, resets on tab close)
  useEffect(() => {
    if (!child) return
    const todayStr = new Date().toISOString().slice(0, 10)
    const ssKey = `penaltyHint_${childId}_${todayStr}`
    if (sessionStorage.getItem(ssKey)) return
    const todayPenalties = transactions.filter(
      t => t.type === 'penalty' && t.description?.includes('קנס יומי') &&
           new Date(t.timestamp).toISOString().slice(0, 10) === todayStr
    )
    if (todayPenalties.length > 0) {
      sessionStorage.setItem(ssKey, '1')
      const total = todayPenalties.reduce((s, t) => s + t.amount, 0)
      setHint(`⚡ הופחתו ${total} כוכבים על מטלות שלא בוצעו`)
    }
  }, [childId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Long-press on ⭐ button: regular tap = chores only, long = parent mode (free entry)
  const triggerStarFly = useCallback(() => {
    setFlyingStar(true)
    setTimeout(() => setFlyingStar(false), 750)
  }, [])

  const starsLongPress = useLongPress(
    useCallback(() => { triggerStarFly(); showModal('addStars', { childId, allowFreeEntry: false }) }, [childId, showModal, triggerStarFly]),
    useCallback(() => showModal('addStars', { childId, allowFreeEntry: true }),  [childId, showModal]),
  )

  if (!child) return null

  function handleRedeem(goal) {
    adjustShekels(childId, -goal.targetAmount)
    addTransaction(childId, {
      type: 'expense',
      amount: goal.targetAmount,
      currency: 'shekels',
      description: `✅ מומש: ${goal.emoji ?? ''} ${goal.name}`,
    })
    deleteGoal(childId, goal.id)
    celebrateGoal()
    sounds.goal()
  }

  const childIndex = children.indexOf(child)
  const gradient   = (child.colorKey && COLOR_OPTIONS.find((c) => c.key === child.colorKey)?.gradient)
    ?? CARD_GRADIENTS[childIndex % CARD_GRADIENTS.length]

  // -100 Tailwind level: clearly colored, not just a whisper of tint
  const BG_TOPS  = { purple:'#ede9fe', pink:'#fce7f3', amber:'#fef3c7', emerald:'#d1fae5', sky:'#e0f2fe', red:'#fee2e2', lime:'#ecfccb', cyan:'#cffafe', fuchsia:'#fae8ff', yellow:'#fef9c3' }
  // -50 Tailwind level: lighter fade toward bottom
  const BG_FADES = { purple:'#f5f3ff', pink:'#fdf2f8', amber:'#fffbeb', emerald:'#ecfdf5', sky:'#f0f9ff', red:'#fff1f2', lime:'#f7fee7', cyan:'#ecfeff', fuchsia:'#fdf4ff', yellow:'#fefce8' }
  const bgTop  = (child.colorKey && BG_TOPS[child.colorKey])  || '#dbeafe'
  const bgFade = (child.colorKey && BG_FADES[child.colorKey]) || '#eff6ff'
  const bgTint = bgTop  // kept for the bottom history gradient

  const prizes = settings.prizes?.length ? settings.prizes : DEFAULT_PRIZES
  const cheapestStarCost = Math.min(...prizes.map((p) => p.starCost))
  const prizeArcPct = Math.min(1, child.starBalance / cheapestStarCost)
  const ARC_C = 94.25
  const totalValue = getTotalValue(child)
  const goals      = getGoals(child)

  // Sum of current compound value of active savings (principal × 1.10^completedMonths)
  const activeSavingsTotal = (() => {
    const actives = (child.savings || []).filter((s) => s.status === 'active')
    if (!actives.length) return 0
    const now = new Date()
    return actives.reduce((sum, s) => {
      const sd = new Date(s.startDate)
      let m = (now.getFullYear() - sd.getFullYear()) * 12 + (now.getMonth() - sd.getMonth())
      if (now.getDate() < sd.getDate()) m--
      return sum + s.amount * Math.pow(1.10, Math.max(0, m))
    }, 0)
  })()
  const streak     = calculateStreak(transactions)
  const totalStarsEarned = transactions
    .filter((tx) => tx.type === 'chore' && tx.currency === 'stars')
    .reduce((s, tx) => s + tx.amount, 0)

  const outstandingLoans = (child.loans || []).filter((l) => !l.repaid)
  const outstandingTotal = outstandingLoans.reduce((s, l) => s + l.amount, 0)

  const level = getLevel(totalStarsEarned)

  // Detect level-up: compare to previous level on re-renders where totalStarsEarned changed
  useEffect(() => {
    if (prevLevelRef.current !== null && prevLevelRef.current.min < level.min) {
      setHint(`${level.emoji} עלית לרמה "${level.name}"! 🎉`)
      sounds.goal()
      celebrateGoal()
    }
    prevLevelRef.current = level
  }, [totalStarsEarned]) // eslint-disable-line

  const birthdayDays = daysUntilBirthday(child.birthday)
  const showBirthday = birthdayDays !== null

  const firstGoal = goals[0] ?? null

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: `linear-gradient(180deg, ${bgTop} 0%, ${bgFade} 55%, ${bgFade} 100%)` }}>
      {/* Flying star trail */}
      {flyingStar && (
        <div
          className="fixed pointer-events-none z-50 text-3xl animate-star-fly"
          style={{ bottom: '42%', left: '50%', transform: 'translateX(-50%)' }}
        >⭐</div>
      )}
      {/* Header */}
      <header className={`bg-gradient-to-br ${gradient} px-5 pt-8 pb-6 text-white`} style={{ borderRadius: '0 0 36px 36px', boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            <button
              onClick={() => showModal('editChild', child)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-lg transition-colors active:scale-90"
              aria-label="ערוך"
            >
              ✏️
            </button>
            <button
              onClick={async () => {
                try {
                  const colorOpt = COLOR_OPTIONS.find(o => o.key === child.colorKey)
                  const from = colorOpt?.from || '#6366f1'
                  const to   = colorOpt?.to   || '#8b5cf6'

                  const canvas = document.createElement('canvas')
                  canvas.width = 360; canvas.height = 220
                  const ctx = canvas.getContext('2d')

                  // Background
                  const grad = ctx.createLinearGradient(0, 0, 360, 220)
                  grad.addColorStop(0, from); grad.addColorStop(1, to)
                  ctx.fillStyle = grad
                  ctx.beginPath()
                  const rr = 24
                  ctx.moveTo(rr,0); ctx.lineTo(360-rr,0); ctx.quadraticCurveTo(360,0,360,rr)
                  ctx.lineTo(360,220-rr); ctx.quadraticCurveTo(360,220,360-rr,220)
                  ctx.lineTo(rr,220); ctx.quadraticCurveTo(0,220,0,220-rr)
                  ctx.lineTo(0,rr); ctx.quadraticCurveTo(0,0,rr,0)
                  ctx.closePath(); ctx.fill()
                  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill()

                  ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
                  let y = 55
                  if (child.avatarImage) {
                    const img = new Image(); img.src = child.avatarImage
                    await new Promise(r => { img.onload = r; img.onerror = r })
                    ctx.save(); ctx.beginPath(); ctx.arc(180, y, 32, 0, Math.PI * 2); ctx.clip()
                    ctx.drawImage(img, 148, y-32, 64, 64); ctx.restore(); y += 42
                  } else {
                    ctx.font = '48px serif'; ctx.fillText(child.avatar || '🐷', 180, y); y += 38
                  }
                  ctx.font = 'bold 21px system-ui,sans-serif'; ctx.fillText(child.name, 180, y+10); y += 30
                  ctx.font = '16px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.9)'
                  ctx.fillText(`⭐ ${formatNumber(child.starBalance)}   •   ${formatNumber(child.shekelBalance)}₪`, 180, y+10); y += 26
                  if (streak >= 2) {
                    ctx.font = 'bold 14px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.75)'
                    ctx.fillText(`🔥 ${streak} ימים ברצף`, 180, y+8)
                  }
                  ctx.font = '12px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.45)'
                  ctx.fillText('הארנק שלי 🐷', 180, 208)

                  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
                  const file = new File([blob], `${child.name}.png`, { type: 'image/png' })
                  if (navigator.canShare?.({ files: [file] })) {
                    await navigator.share({ files: [file], title: `הארנק של ${child.name}` })
                  } else if (navigator.share) {
                    const text = [`🐷 ${child.name}`, `⭐ ${child.starBalance}`, `💵 ${child.shekelBalance}₪`, streak >= 2 ? `🔥 ${streak} ימים` : null].filter(Boolean).join('\n')
                    await navigator.share({ title: 'הארנק שלי', text })
                  } else {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = `${child.name}.png`; a.click()
                    URL.revokeObjectURL(url)
                  }
                } catch {}
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-lg transition-colors active:scale-90"
              aria-label="שתף"
            >
              📤
            </button>
          </div>

          <div className="text-center">
            {child.avatarImage ? (
              <img
                src={child.avatarImage}
                alt={child.name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white/50 mx-auto mb-1 shadow-lg"
              />
            ) : (
              <div className="text-6xl mb-1">{child.avatar}</div>
            )}
            <h1 className="text-2xl font-bold">{child.name}</h1>
            {showBirthday && (
              <div className="inline-block mt-1 bg-white/25 rounded-full px-3 py-0.5 text-sm font-semibold animate-pop">
                {birthdayDays === 0 ? '🎂 יום הולדת שמח! 🎉' : `🎂 עוד ${birthdayDays} ימים!`}
              </div>
            )}
            {/* Streak + level chips */}
            <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
              {streak >= 2 && (
                <div className="bg-white/25 rounded-full px-3 py-0.5 text-sm font-bold">
                  🔥 {streak} ימים ברצף!
                </div>
              )}
              <div className="bg-white/20 rounded-full px-3 py-0.5 text-sm font-semibold">
                {level.emoji} {level.name}
              </div>
            </div>
          </div>

          <button
            ref={(el) => { backBtnRef.current = el; registerCoinTarget(childId, el) }}
            onClick={() => navigate('home')}
            className="flex items-center gap-1 pl-3 pr-2 py-2 rounded-2xl bg-white/25 hover:bg-white/40 active:scale-95 transition-all text-sm font-bold shadow-sm"
            aria-label="חזרה לבית"
          >
            <span>חזרה</span>
            <span className="text-base leading-none">›</span>
          </button>
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Shekels card */}
          <div className="relative overflow-hidden rounded-[22px] p-4 text-center animate-slide-up" style={{ animationDelay: '60ms', animationFillMode: 'both', background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)', border: '2px solid rgba(255,255,255,0.5)', boxShadow: '0 8px 24px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.6)' }}>
            <ShekelIconCloud balance={child.shekelBalance} />
            <div key={child.shekelBalance} className="relative text-4xl font-bold animate-wiggle" dir="ltr">
              {formatNumber(child.shekelBalance)}₪
            </div>
            <div className="relative text-sm opacity-90 mt-1">
              {activeSavingsTotal > 0 ? '💵 זמין' : '💵 שקלים'}
            </div>
            {(child.shekelBalancePeak || 0) > 0 && (
              <div className="relative text-xs opacity-60 mt-0.5 truncate">
                {child.shekelBalance >= (child.shekelBalancePeak || 0)
                  ? '🌟 שיא חדש!'
                  : `🏆 שיא: ${formatNumber(child.shekelBalancePeak)}₪`}
              </div>
            )}
            {firstGoal && totalValue < firstGoal.targetAmount && (
              <div className="relative text-xs opacity-70 mt-1 bg-white/20 rounded-full px-2 py-0.5 inline-block">
                עוד {formatNumber(firstGoal.targetAmount - totalValue)}₪
              </div>
            )}
            {activeSavingsTotal > 0 && (
              <div className="relative mt-2 pt-1.5 border-t border-white/25 flex items-center justify-center gap-1.5 text-white/85">
                <span className="text-sm">🏦</span>
                <span className="text-xs font-bold">{formatNumber(activeSavingsTotal)}₪</span>
                <span className="text-[10px] opacity-70">בחסכון</span>
              </div>
            )}
          </div>
          {/* Stars card */}
          <div className="relative overflow-hidden rounded-[22px] p-4 text-center animate-slide-up" style={{ animationDelay: '130ms', animationFillMode: 'both', background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)', border: '2px solid rgba(255,255,255,0.5)', boxShadow: '0 8px 24px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.6)' }}>
            <StarIconCloud count={child.starBalance} />
            <div key={child.starBalance} className="relative text-4xl font-bold animate-wiggle" dir="ltr">
              {formatNumber(child.starBalance)}
            </div>
            <div className="relative text-sm opacity-90 mt-1">⭐ כוכבים</div>
            {(child.starBalancePeak || 0) > 0 && (
              <div className="relative text-xs opacity-60 mt-0.5 truncate">
                {child.starBalance >= (child.starBalancePeak || 0)
                  ? '🌟 שיא חדש!'
                  : `🏆 שיא: ${formatNumber(child.starBalancePeak)}⭐`}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 space-y-4">
        {/* Goals */}
        {goals.length > 0 && (
          <div className="space-y-2">
            {goals.map((goal) => (
              <GoalProgressBar
                key={goal.id}
                progress={getGoalProgress(child, settings, goal)}
                goalName={goal.name}
                targetAmount={goal.targetAmount}
                goalEmoji={goal.emoji}
                goalImage={goal.goalImage}
                totalValue={totalValue}
                onRedeem={() => handleRedeem(goal)}
              />
            ))}
          </div>
        )}

        {/* Pending chore requests (child-initiated) + parent-assigned tasks marked done */}
        {(() => {
          const myPending = (pendingChores || []).filter(
            (pc) => pc.childId === childId && (
              pc.status === 'pending' ||
              (pc.source === 'parent' && pc.status === 'done')
            )
          )
          if (myPending.length === 0) return null
          return (
            <PendingChoresCard
              requests={myPending}
              onApprove={(id) => { sounds.approve(); approvePendingChore(id) }}
              onApproveMany={(ids) => { sounds.approve(); ids.forEach(approvePendingChore) }}
              onReject={rejectPendingChore}
            />
          )
        })()}

        {/* Parent assigns chore to child */}
        <AssignChorePanel childId={childId} chores={allChores} addAssignedChore={addAssignedChore} />

        {/* Parent note card */}
        {child.parentNote ? (
          <div className="rounded-[22px] p-4 flex items-start gap-3 animate-slide-up" style={{ background: 'rgba(253,242,248,0.9)', border: '1.5px solid rgba(249,168,212,0.5)', boxShadow: '0 4px 16px rgba(244,63,94,0.1), inset 0 1px 1px rgba(255,255,255,0.8)' }}>
            <span className="text-2xl flex-shrink-0">💌</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-0.5">הודעה מהורה</p>
              <p className="text-sm text-gray-700 leading-snug">{child.parentNote}</p>
            </div>
            <button
              onClick={() => showModal('parentNote', { childId, child })}
              className="text-pink-300 hover:text-pink-500 active:scale-90 transition-all flex-shrink-0 text-base leading-none mt-0.5"
              aria-label="ערוך הודעה"
            >
              ✏️
            </button>
          </div>
        ) : (
          <button
            onClick={() => showModal('parentNote', { childId, child })}
            className="w-full rounded-[22px] py-3 px-4 flex items-center justify-center gap-2 text-pink-500 active:scale-95 transition-all cursor-pointer"
            style={{ background: 'rgba(253,242,248,0.7)', border: '1.5px dashed rgba(249,168,212,0.6)', boxShadow: '0 2px 8px rgba(244,63,94,0.08)' }}
          >
            <span className="text-base">💌</span>
            <span className="text-xs font-semibold">השאר הודעה לילד</span>
          </button>
        )}

        {/* Outstanding loans card */}
        {outstandingTotal > 0 && (
          <div className="rounded-[22px] p-3 flex items-center justify-between gap-3" style={{ background: 'rgba(236,254,255,0.9)', border: '1.5px solid rgba(6,182,212,0.3)', boxShadow: '0 4px 16px rgba(6,182,212,0.15), inset 0 1px 1px rgba(255,255,255,0.8)' }}>
            <div>
              <p className="text-xs font-bold text-cyan-600 mb-0.5">💳 יתרת הלוואות</p>
              <p className="text-2xl font-black text-cyan-700">{formatNumber(outstandingTotal)}₪</p>
            </div>
            <button
              onClick={() => showModal('loan', { childId, child })}
              className="active:scale-95 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)', boxShadow: '0 4px 12px rgba(6,182,212,0.4)' }}
            >
              פרטים
            </button>
          </div>
        )}

        {/* Onboarding tips */}
        {transactions.length === 0 && (
          <div className="rounded-[22px] p-4 space-y-2.5" style={{ background: 'rgba(238,242,255,0.9)', border: '1.5px solid rgba(99,102,241,0.2)', boxShadow: '0 4px 16px rgba(99,102,241,0.1), inset 0 1px 1px rgba(255,255,255,0.8)' }}>
            <p className="text-xs font-bold text-indigo-600 mb-1">💡 איך מתחילים?</p>
            {[
              { icon: '⭐', text: 'לחץ "עשיתי מטלה!" אחרי כל מטלה שהילד השלים' },
              { icon: '💝', text: 'לחץ "קיבלתי כסף" להפקדת כסף מתנה מסבא/סבתא' },
              { icon: '🎁', text: 'כשצוברים כוכבים — אפשר לממש פרסים מהמחירון' },
              { icon: '⚙️', text: 'בהגדרות תוסיף מטלות ופרסים משלך' },
            ].map(({ icon, text }) => (
              <div key={icon} className="flex items-start gap-2">
                <span className="text-sm flex-shrink-0 mt-0.5">{icon}</span>
                <p className="text-xs text-gray-600 leading-snug">{text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            {...starsLongPress}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-[22px] active:scale-90 transition-all text-white font-bold select-none animate-glow-amber"
            style={{
              background: 'linear-gradient(135deg,#f59e0b,#f97316)',
              border: '2.5px solid rgba(255,255,255,0.45)',
              boxShadow: '0 8px 24px rgba(245,158,11,0.45), inset 0 1px 2px rgba(255,255,255,0.4)',
            }}
          >
            <span className="text-2xl">⭐</span>
            <span className="text-sm">עשיתי מטלה!</span>
          </button>

          <button
            onClick={() => {
              if (child.starBalance === 0) setHint('⭐ אין לך כוכבים עדיין — עשה מטלה!')
              else showModal('redeemPrize', { childId, child })
            }}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-[22px] active:scale-90 transition-all text-white font-bold"
            style={{
              background: child.starBalance === 0
                ? 'linear-gradient(135deg,#c4b5fd,#a78bfa)'
                : 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
              opacity: child.starBalance === 0 ? 0.6 : 1,
              border: '2.5px solid rgba(255,255,255,0.45)',
              boxShadow: '0 8px 24px rgba(139,92,246,0.4), inset 0 1px 2px rgba(255,255,255,0.4)',
            }}
          >
            <span className="text-2xl">🎁</span>
            <span className="text-sm">מימוש פרס</span>
          </button>

          <button
            onClick={() => showModal('addMoney', { childId })}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-[22px] active:scale-90 transition-all text-white font-bold"
            style={{
              background: 'linear-gradient(135deg,#10b981,#0d9488)',
              border: '2.5px solid rgba(255,255,255,0.45)',
              boxShadow: '0 8px 24px rgba(16,185,129,0.4), inset 0 1px 2px rgba(255,255,255,0.4)',
            }}
          >
            <span className="text-2xl">💝</span>
            <span className="text-sm">הפקדה</span>
          </button>

          <button
            onClick={() => {
              if (child.shekelBalance === 0) setHint('💵 אין לך שקלים עדיין — בקש מהורה להפקיד!')
              else showModal('expense', { childId })
            }}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-[22px] active:scale-90 transition-all text-white font-bold"
            style={{
              background: child.shekelBalance === 0
                ? 'linear-gradient(135deg,#fda4af,#f9a8d4)'
                : 'linear-gradient(135deg,#f43f5e,#ec4899)',
              opacity: child.shekelBalance === 0 ? 0.6 : 1,
              border: '2.5px solid rgba(255,255,255,0.45)',
              boxShadow: '0 8px 24px rgba(244,63,94,0.4), inset 0 1px 2px rgba(255,255,255,0.4)',
            }}
          >
            <span className="text-2xl">🛍️</span>
            <span className="text-sm">קניתי משהו</span>
          </button>
        </div>

        {/* Learning — full-width prominent */}
        <button
          onClick={() => showModal('learning', { childId })}
          className="w-full py-3.5 rounded-[22px] text-white font-black flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg,#0ea5e9,#2563eb)',
            border: '2.5px solid rgba(255,255,255,0.35)',
            boxShadow: '0 8px 24px rgba(14,165,233,0.4), inset 0 1px 2px rgba(255,255,255,0.35)',
          }}
        >
          <span className="text-xl">📚</span>
          <span>למד וצבור כוכבים!</span>
        </button>

        {/* Secondary actions — horizontal scrollable chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {[
            { key: 'goal',    label: `🎯 ${goals.length > 0 ? `מטרות (${goals.length})` : 'מטרה'}`, color: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', text: '#4338ca', shadow: 'rgba(99,102,241,0.2)', onClick: () => showModal('goal', { childId }) },
            { key: 'savings', label: '🏦 חסכון', color: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.35)', text: '#065f46', shadow: 'rgba(16,185,129,0.2)', onClick: () => showModal('savings', { childId, child }) },
            {
              key: 'convert',
              label: `💱 המר ⭐${child.starBalance > 0 ? ` (${formatNumber(child.starBalance * (child.exchangeRate ?? settings.globalExchangeRate))}₪)` : ''}`,
              color: child.starBalance > 0 ? 'rgba(14,165,233,0.1)' : 'rgba(243,244,246,0.8)',
              border: child.starBalance > 0 ? 'rgba(14,165,233,0.35)' : 'rgba(209,213,219,0.6)',
              text: child.starBalance > 0 ? '#0369a1' : '#9ca3af',
              shadow: child.starBalance > 0 ? 'rgba(14,165,233,0.2)' : 'rgba(0,0,0,0.04)',
              onClick: () => child.starBalance > 0
                ? showModal('convertStars', { childId })
                : setHint('⭐ אין כוכבים להמרה'),
            },
            ...(children.length > 1 ? [{ key: 'transfer', label: '🔄 העברה', color: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.35)', text: '#5b21b6', shadow: 'rgba(139,92,246,0.2)', onClick: () => showModal('transferStars', { childId, child }) }] : []),
            { key: 'loan', label: `💳 הלוואה${outstandingTotal > 0 ? ` (${formatNumber(outstandingTotal)}₪)` : ''}`, color: outstandingTotal > 0 ? 'rgba(6,182,212,0.12)' : 'rgba(243,244,246,0.8)', border: outstandingTotal > 0 ? 'rgba(6,182,212,0.4)' : 'rgba(209,213,219,0.6)', text: outstandingTotal > 0 ? '#0e7490' : '#374151', shadow: outstandingTotal > 0 ? 'rgba(6,182,212,0.2)' : 'rgba(0,0,0,0.04)', onClick: () => showModal('loan', { childId, child }) },
            { key: 'memories', label: `📖 זכרונות${child.memories?.length > 0 ? ` (${child.memories.length})` : ''}`, color: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.3)', text: '#9f1239', shadow: 'rgba(244,63,94,0.15)', onClick: () => showModal('memories', { childId }) },
            { key: 'penalty', label: '⚡ קנס', color: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)', text: '#b91c1c', shadow: 'rgba(239,68,68,0.2)', onClick: () => showModal('penalty', { childId }) },
          ].map(({ key, label, color, border, text, shadow, onClick }) => (
            <button
              key={key}
              onClick={onClick}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-bold flex-shrink-0 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
              style={{ background: color, border: `1.5px solid ${border}`, color: text, boxShadow: `0 3px 10px ${shadow}` }}
            >
              {label}
            </button>
          ))}
        </div>

        <WeeklySummary transactions={transactions} />

        <BalanceGraph transactions={transactions} currentBalance={child.shekelBalance} />

        <MonthlySummary transactions={transactions} />

        <div>
          <h2 className="text-lg font-black text-gray-800 mb-3">📜 היסטוריה</h2>
          <div className="rounded-[24px] p-3" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 24px rgba(0,0,0,0.07), inset 0 1px 2px rgba(255,255,255,0.9)' }}>
            <div className="relative">
              <div className="max-h-[460px] overflow-y-auto">
                <TransactionList transactions={transactions} childId={childId} />
              </div>
              <div
                className="pointer-events-none absolute bottom-0 inset-x-0 h-14 rounded-b-2xl"
                style={{ background: 'linear-gradient(to top, white, transparent)' }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Hint toast for greyed-out buttons */}
      <HintBanner message={hint} onDone={() => setHint(null)} />

      {/* Badge earned toast */}
      {pendingBadge && pendingBadge.childId === childId && (
        <HintBanner
          message={`${pendingBadge.emoji} קיבלת תג חדש: ${pendingBadge.label}`}
          onDone={clearPendingBadge}
        />
      )}

      {/* Free spin earned toast */}
      {pendingFreeSpin && pendingFreeSpin.childId === childId && (
        <HintBanner
          message="🎁 כל הכבוד! 5 מטלות היום — מגיע לך סיבוב חינמי בגלגל המזל!"
          onDone={clearPendingFreeSpin}
        />
      )}
    </div>
  )
}
