import { useState, useEffect, useRef } from 'react'
import { get, remove } from '../lib/storage.js'
import { fetchFamilyData, subscribeFamilyData, pushFamilyData, appendChildActivity } from '../lib/childSync.js'
import { generateId, formatNumber, getGoals, getGoalProgress, getLevel, buildBalanceHistory } from '../lib/utils.js'
import { CARD_GRADIENTS, COLOR_OPTIONS, DEFAULT_CHORES, DEFAULT_WHEEL_PRIZES, DEFAULT_PRIZES, GOAL_EMOJIS } from '../lib/defaults.js'
import { sounds } from '../lib/sounds.js'
import { celebrateGoal } from '../lib/confetti.js'
import { getPermission, requestPermission, notifyChoreApproved, notifyChoreRejected, notifyChoreSubmitted } from '../lib/notifications.js'

const GRAPH_PERIODS = [
  { days: 30,  label: 'חודש'    },
  { days: 180, label: 'חצי שנה' },
  { days: 365, label: 'שנה'     },
]

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

  const gridLevels = range > 2
    ? [maxBal, (maxBal + minBal) / 2, minBal]
    : [maxBal]

  return (
    <div className="rounded-[22px] p-4"
      style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
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
          <linearGradient id="balGradChild" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {gridLevels.map((v, i) => (
          <g key={i}>
            <line x1={PX_L} y1={py(v)} x2={W - PX_R} y2={py(v)}
                  stroke="rgba(148,163,184,0.22)" strokeWidth="1" strokeDasharray="4,3" />
            <text x={PX_L - 3} y={py(v)} textAnchor="end" dominantBaseline="middle"
                  fontSize="8" fill="#94a3b8">{Math.round(v)}₪</text>
          </g>
        ))}
        <path d={areaStr} fill="url(#balGradChild)" />
        <polyline points={lineStr} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={px(0)} cy={py(first.balance)} r="3" fill="white" stroke="#10b981" strokeWidth="1.5" />
        <text x={Number(px(0)) + 4} y={Number(py(first.balance)) - 5} textAnchor="start" fontSize="8" fill="#6b7280">
          {Math.round(first.balance)}₪
        </text>
        <circle cx={px(N-1)} cy={py(last.balance)} r="3.5" fill="#10b981" stroke="white" strokeWidth="1.5" />
        <text x={Number(px(N-1)) - 4} y={Number(py(last.balance)) - 6} textAnchor="end" fontSize="9" fill="#059669" fontWeight="bold">
          {formatNumber(last.balance)}₪
        </text>
      </svg>
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

const TX_ICONS = {
  chore: '⭐', gift: '🎁', other: '💰', expense: '🛍️', allowance: '💰',
  prize_redeem: '🎁', convert_in: '💱', convert_out: '💱',
  savings_open: '🏦', savings_close: '💰', loan: '💳', loan_repay: '💳',
  penalty: '⚡', money_transfer_in: '💸', money_transfer_out: '💸',
}

const DEBIT_TYPES = new Set(['expense', 'savings_open', 'money_transfer_out', 'loan_repay', 'prize_redeem', 'convert_out', 'penalty'])

function TxRow({ tx }) {
  const icon = TX_ICONS[tx.type] || '📋'
  const isDebit = DEBIT_TYPES.has(tx.type)
  const isStars = tx.currency === 'stars'
  const sign = isDebit ? '-' : '+'
  const color = isDebit ? 'text-rose-600' : 'text-emerald-600'
  const unit = isStars ? '⭐' : '₪'
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700 truncate">{tx.description || tx.type}</p>
        <p className="text-[11px] text-gray-400">{new Date(tx.timestamp).toLocaleDateString('he')}</p>
      </div>
      <span className={`text-sm font-black flex-shrink-0 ${color}`} dir="ltr">
        {sign}{formatNumber(tx.amount)}{unit}
      </span>
    </div>
  )
}

function HintBanner({ text }) {
  return (
    <div className="fixed top-4 inset-x-4 z-[60] rounded-2xl px-4 py-3 text-center font-bold text-white text-sm animate-bounce-in"
      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
      {text}
    </div>
  )
}

// ─── Savings Modal ────────────────────────────────────────────────────────────

function calcCompletedMonths(startTs) {
  const s = new Date(startTs), n = new Date()
  let m = (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth())
  if (n.getDate() < s.getDate()) m--
  return Math.max(0, m)
}
function cv(principal, months) { return principal * Math.pow(1.10, months) }

function ChildSavingsModal({ child, familyCode, childId, onClose, onUpdate, showHint }) {
  const [amount, setAmount] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [withdrawTarget, setWithdrawTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const activeSavings = (child.savings || []).filter((s) => s.status === 'active')
  const parsed = parseFloat(amount) || 0
  const canOpen = parsed >= 1 && parsed <= child.shekelBalance

  async function handleOpen() {
    if (!canOpen) return
    if (!confirmOpen) { setConfirmOpen(true); return }
    setBusy(true)
    try {
      const saving = { id: generateId(), amount: parsed, startDate: Date.now(), status: 'active' }
      const freshChildren = await fetchFamilyData(familyCode, 'children') || []
      const newChildren = freshChildren.map((c) =>
        c.id !== childId ? c : { ...c, shekelBalance: Math.max(0, c.shekelBalance - parsed), savings: [...(c.savings || []), saving] }
      )
      const freshTxs = await fetchFamilyData(familyCode, 'all_transactions') || {}
      const newTx = { id: generateId(), type: 'savings_open', amount: parsed, currency: 'shekels', description: '🏦 חסכון נפתח — 10% ריבית לחודש', timestamp: Date.now() }
      const newTxs = { ...freshTxs, [childId]: [newTx, ...(freshTxs[childId] || [])] }
      await pushFamilyData(familyCode, 'children', newChildren)
      await pushFamilyData(familyCode, 'all_transactions', newTxs)
      await appendChildActivity(familyCode, { id: generateId(), childId, childName: child.name, type: 'savings_open', description: `${child.name} פתח חסכון של ${formatNumber(parsed)}₪`, amount: parsed, currency: 'shekels', timestamp: Date.now() })
      onUpdate(newChildren, newTx)
      sounds.approve()
      showHint(`🏦 חסכון של ${formatNumber(parsed)}₪ נפתח!`)
      onClose()
    } catch { showHint('שגיאה — נסה שוב') }
    setBusy(false)
  }

  async function handleWithdraw(saving) {
    if (!withdrawTarget) { setWithdrawTarget(saving); return }
    setBusy(true)
    try {
      const cm = calcCompletedMonths(saving.startDate)
      const payout = cv(saving.amount, cm)
      const interest = payout - saving.amount
      const mode = cm >= 1 ? 'matured' : 'early'
      const freshChildren = await fetchFamilyData(familyCode, 'children') || []
      const newChildren = freshChildren.map((c) =>
        c.id !== childId ? c : {
          ...c,
          shekelBalance: c.shekelBalance + payout,
          savings: (c.savings || []).map((s) => s.id !== saving.id ? s : { ...s, status: mode === 'matured' ? 'matured' : 'withdrawn_early' }),
        }
      )
      const freshTxs = await fetchFamilyData(familyCode, 'all_transactions') || {}
      const txType = cm >= 1 ? 'savings_close' : 'savings_early'
      const txDesc = cm >= 1
        ? `💰 חסכון הבשיל! (${cm} חודש${cm > 1 ? 'ים' : ''}, ריבית: +${Math.round(interest)}₪)`
        : '⚠️ פדיון מוקדם — פחות מחודש, ללא ריבית'
      const newTx = { id: generateId(), type: txType, amount: Math.round(payout), currency: 'shekels', description: txDesc, timestamp: Date.now() }
      const newTxs = { ...freshTxs, [childId]: [newTx, ...(freshTxs[childId] || [])] }
      await pushFamilyData(familyCode, 'children', newChildren)
      await pushFamilyData(familyCode, 'all_transactions', newTxs)
      await appendChildActivity(familyCode, { id: generateId(), childId, childName: child.name, type: txType, description: txDesc, amount: Math.round(payout), currency: 'shekels', timestamp: Date.now() })
      onUpdate(newChildren, newTx)
      sounds.goal()
      showHint(`💰 קיבלת ${formatNumber(Math.round(payout))}₪!`)
      onClose()
    } catch { showHint('שגיאה — נסה שוב') }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: 'linear-gradient(160deg,#e0f2fe,#bae6fd)' }}>
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <h1 className="text-xl font-black text-blue-900">🏦 חסכון</h1>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/50 flex items-center justify-center text-xl font-bold text-blue-700 active:scale-90">×</button>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-4">
        {/* Interest intro */}
        <div className="rounded-2xl px-4 py-3 text-center"
          style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(14,165,233,0.25)' }}>
          <p className="text-xs font-semibold text-blue-600">🏦 10% ריבית לכל חודש</p>
          <p className="text-sm font-black text-blue-900 mt-1">חוסכים ← מרוויחים ריבית ← מכסה יותר כסף</p>
        </div>

        {/* Active savings */}
        {activeSavings.map((s) => {
          const cm = calcCompletedMonths(s.startDate)
          const payout = cv(s.amount, cm)
          const nextPayout = cv(s.amount, cm + 1)
          const now = Date.now()
          const nextExit = new Date(s.startDate); nextExit.setMonth(nextExit.getMonth() + cm + 1)
          const prevExit = new Date(s.startDate); prevExit.setMonth(prevExit.getMonth() + cm)
          const progress = Math.min(1, (now - prevExit.getTime()) / (nextExit.getTime() - prevExit.getTime()))
          const daysLeft = Math.ceil((nextExit.getTime() - now) / 86400000)
          return (
            <div key={s.id} className="rounded-2xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(14,165,233,0.2)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-500">🏦 חסכון פעיל</span>
                <span className="font-black text-gray-800">{formatNumber(s.amount)}₪ <span className="text-xs text-gray-400 font-normal">קרן</span></span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-400">חודש {cm}{cm > 0 ? ' ✅' : ''}</span>
                  <span className="text-blue-600">עוד {daysLeft} ימים → חודש {cm + 1}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-blue-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-teal-500 transition-all" style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className={cm > 0 ? 'text-teal-600' : 'text-gray-400'}>{cm > 0 ? `${formatNumber(Math.round(payout))}₪ עכשיו` : 'עוד לא חודש'}</span>
                  <span className="text-blue-600">חד׳ {cm + 1}: {formatNumber(Math.round(nextPayout))}₪</span>
                </div>
              </div>
              {withdrawTarget?.id === s.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-center text-orange-700 bg-orange-50 rounded-xl py-2">
                    {cm > 0 ? `תקבל ${formatNumber(Math.round(payout))}₪` : `תקבל ${formatNumber(s.amount)}₪ (ללא ריבית)`}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => handleWithdraw(s)} disabled={busy}
                      className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white font-bold text-sm active:scale-95">
                      {busy ? '...' : '✅ פדה'}
                    </button>
                    <button onClick={() => setWithdrawTarget(null)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm active:scale-95">ביטול</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setWithdrawTarget(s)}
                  className="w-full py-2.5 rounded-xl bg-teal-500 text-white font-bold text-sm active:scale-95 transition-all">
                  {cm >= 1 ? `💰 פדה — ${formatNumber(Math.round(payout))}₪` : `💰 פדה ללא ריבית — ${formatNumber(s.amount)}₪`}
                </button>
              )}
            </div>
          )
        })}

        {/* Open new savings */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.9)' }}>
          <h3 className="font-bold text-blue-900 text-sm">{activeSavings.length > 0 ? 'פתח חסכון נוסף' : 'פתח חסכון חדש'}</h3>
          <div className="rounded-xl py-2 text-center" style={{ background: 'rgba(209,250,229,0.6)' }}>
            <span className="text-2xl font-black text-emerald-700">{formatNumber(child.shekelBalance)}₪</span>
            <p className="text-xs text-emerald-600">זמין לחסכון</p>
          </div>
          <input type="number" min="1" max={child.shekelBalance} step="1" value={amount}
            onChange={(e) => { setAmount(e.target.value); setConfirmOpen(false) }}
            placeholder={`עד ${formatNumber(child.shekelBalance)}₪`}
            className="w-full rounded-2xl border-2 border-blue-200 px-4 py-3 text-lg focus:border-blue-400 focus:outline-none text-center"
            dir="ltr" />
          {parsed >= 1 && parsed <= child.shekelBalance && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[1, 2, 3, 4, 6].map((m) => (
                <div key={m} className="flex-shrink-0 rounded-xl p-2 text-center min-w-[52px]"
                  style={{ background: 'linear-gradient(to bottom,#eff6ff,#e0f2fe)', border: '1px solid #bae6fd' }}>
                  <p className="text-[10px] text-gray-400 font-semibold">חד׳ {m}</p>
                  <p className="text-sm font-black text-teal-700">{formatNumber(Math.round(cv(parsed, m)))}₪</p>
                </div>
              ))}
            </div>
          )}
          {confirmOpen ? (
            <div className="space-y-2">
              <p className="text-sm text-blue-700 font-semibold text-center bg-blue-50 rounded-xl py-2 px-3">
                הכסף ינעל ויצבור 10% ריבית לחודש. ניתן לפדות בכל חודש.
              </p>
              <div className="flex gap-2">
                <button onClick={handleOpen} disabled={busy}
                  className="flex-1 py-3 rounded-2xl font-black text-white text-sm active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#0891b2)' }}>
                  {busy ? '...' : '🔒 נעל ובחסוך'}
                </button>
                <button onClick={() => setConfirmOpen(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-gray-100 text-sm active:scale-95">ביטול</button>
              </div>
            </div>
          ) : (
            <button onClick={handleOpen} disabled={!canOpen || busy}
              className="w-full py-3 rounded-2xl font-black text-white text-sm active:scale-95 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#0891b2)' }}>
              🔒 נעל ובחסוך
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────

function ChildTransferModal({ child, siblings, familyCode, childId, onClose, onUpdate, showHint }) {
  const [currency, setCurrency]   = useState('stars')
  const [targetId, setTargetId]   = useState(() => siblings[0]?.id || '')
  const [amount, setAmount]       = useState('')
  const [mode, setMode]           = useState('gift') // stars only: 'gift' | 'sale'
  const [price, setPrice]         = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy]           = useState(false)

  const isStars    = currency === 'stars'
  const target     = siblings.find((s) => s.id === targetId)
  const parsed     = Math.max(0, isStars ? Math.floor(parseFloat(amount) || 0) : parseFloat(amount) || 0)
  const parsedPrice = Math.max(0, parseFloat(price) || 0)
  const maxBal     = isStars ? child.starBalance : child.shekelBalance
  const validAmount = parsed >= 1 && parsed <= maxBal
  const validPrice  = !isStars || mode === 'gift' || (parsedPrice >= 1 && parsedPrice <= (target?.shekelBalance || 0))
  const canTransfer = validAmount && validPrice

  function reset() { setAmount(''); setPrice(''); setConfirmed(false) }

  async function handleConfirm() {
    if (!canTransfer) return
    if (!confirmed) { setConfirmed(true); return }
    setBusy(true)
    try {
      const freshChildren = await fetchFamilyData(familyCode, 'children') || []
      let newChildren
      let tx1, tx2
      if (isStars) {
        const isSale = mode === 'sale'
        newChildren = freshChildren.map((c) => {
          if (c.id === childId) return { ...c, starBalance: Math.max(0, c.starBalance - parsed), ...(isSale ? { shekelBalance: c.shekelBalance + parsedPrice } : {}) }
          if (c.id === targetId) return { ...c, starBalance: c.starBalance + parsed, ...(isSale ? { shekelBalance: Math.max(0, c.shekelBalance - parsedPrice) } : {}) }
          return c
        })
        if (isSale) {
          tx1 = { id: generateId(), type: 'stars_sold_out',  amount: parsed, currency: 'stars',  description: `🤝 מכרת ${parsed}⭐ ל${target.name} ← +${parsedPrice}₪`, timestamp: Date.now() }
          tx2 = { id: generateId(), type: 'stars_bought_in', amount: parsed, currency: 'stars',  description: `🤝 קנית ${parsed}⭐ מ${child.name} ← -${parsedPrice}₪`, timestamp: Date.now() }
        } else {
          tx1 = { id: generateId(), type: 'stars_transfer_out', amount: parsed, currency: 'stars', description: `🎁 שלחת ${parsed}⭐ ל${target.name}`, timestamp: Date.now() }
          tx2 = { id: generateId(), type: 'stars_transfer_in',  amount: parsed, currency: 'stars', description: `🎁 קיבלת ${parsed}⭐ מ${child.name}`, timestamp: Date.now() }
        }
      } else {
        newChildren = freshChildren.map((c) => {
          if (c.id === childId) return { ...c, shekelBalance: Math.max(0, c.shekelBalance - parsed) }
          if (c.id === targetId) return { ...c, shekelBalance: c.shekelBalance + parsed }
          return c
        })
        tx1 = { id: generateId(), type: 'money_transfer_out', amount: parsed, currency: 'shekels', description: `💸 שלחת ${formatNumber(parsed)}₪ ל${target.name}`, timestamp: Date.now() }
        tx2 = { id: generateId(), type: 'money_transfer_in',  amount: parsed, currency: 'shekels', description: `💸 קיבלת ${formatNumber(parsed)}₪ מ${child.name}`, timestamp: Date.now() }
      }
      const freshTxs = await fetchFamilyData(familyCode, 'all_transactions') || {}
      const newTxs = { ...freshTxs, [childId]: [tx1, ...(freshTxs[childId] || [])], [targetId]: [tx2, ...(freshTxs[targetId] || [])] }
      await pushFamilyData(familyCode, 'children', newChildren)
      await pushFamilyData(familyCode, 'all_transactions', newTxs)
      await appendChildActivity(familyCode, { id: generateId(), childId, childName: child.name, type: 'transfer_out', description: tx1.description, amount: parsed, currency, timestamp: Date.now() })
      onUpdate(newChildren, tx1)
      sounds.approve()
      showHint(`${isStars ? '⭐' : '💸'} הועבר ל${target.name}!`)
      onClose()
    } catch { showHint('שגיאה — נסה שוב') }
    setBusy(false)
  }

  if (siblings.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6"
        style={{ background: 'linear-gradient(160deg,#eef2ff,#f5f3ff)' }}>
        <div className="text-5xl">👥</div>
        <p className="text-gray-700 font-bold text-center">אין אחים להעברה</p>
        <button onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>חזרה</button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: 'linear-gradient(160deg,#eef2ff,#f5f3ff)' }}>
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <h1 className="text-xl font-black text-indigo-900">💸 העברה לאח</h1>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/60 flex items-center justify-center text-xl font-bold text-indigo-700 active:scale-90">×</button>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-4">
        {/* Currency tabs */}
        <div className="flex gap-2 bg-white/60 p-1 rounded-2xl">
          {[['stars', '⭐ כוכבים'], ['shekels', '💵 שקלים']].map(([c, label]) => (
            <button key={c} onClick={() => { setCurrency(c); reset() }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${currency === c ? (c === 'stars' ? 'bg-indigo-500 text-white shadow' : 'bg-emerald-500 text-white shadow') : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Mode toggle — stars only */}
        {isStars && (
          <div className="flex gap-2 bg-white/60 p-1 rounded-2xl">
            {[['gift', '🎁 מתנה'], ['sale', '💰 מכירה']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setConfirmed(false) }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === m ? (m === 'gift' ? 'bg-indigo-500 text-white shadow' : 'bg-orange-500 text-white shadow') : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Sibling picker */}
        <div className="flex gap-2">
          {siblings.map((s) => (
            <button key={s.id} onClick={() => { setTargetId(s.id); setConfirmed(false) }}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${targetId === s.id ? (isStars ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-emerald-400 bg-emerald-50 text-emerald-700') : 'border-gray-100 bg-white/60 text-gray-500'}`}>
              {s.avatarImage
                ? <img src={s.avatarImage} alt={s.name} className="w-10 h-10 rounded-full mx-auto mb-1 object-cover" />
                : <span className="text-3xl block leading-none mb-1">{s.avatar || '🦁'}</span>}
              {s.name}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.85)' }}>
          <label className="text-sm font-semibold text-gray-600">
            {isStars ? 'כמה כוכבים?' : 'כמה שקלים?'}{' '}
            <span className="text-gray-400">(יש לך {formatNumber(maxBal)}{isStars ? '⭐' : '₪'})</span>
          </label>
          <input type="number" min="1" max={maxBal} step={isStars ? '1' : '0.5'} value={amount}
            onChange={(e) => { setAmount(e.target.value); setConfirmed(false) }}
            placeholder={`1 – ${formatNumber(maxBal)}`}
            className={`w-full rounded-2xl border-2 px-4 py-3 text-lg focus:outline-none ${isStars ? 'border-gray-200 focus:border-indigo-400' : 'border-gray-200 focus:border-emerald-400'}`}
            dir="ltr" />
          {parsed > maxBal && <p className="text-xs text-red-500">אין מספיק {isStars ? 'כוכבים' : 'שקלים'}</p>}
        </div>

        {/* Price input for sale */}
        {isStars && mode === 'sale' && (
          <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.85)' }}>
            <label className="text-sm font-semibold text-gray-600">
              תמורת כמה שקלים?{' '}
              <span className="text-gray-400">(ל{target?.name} יש {formatNumber(target?.shekelBalance || 0)}₪)</span>
            </label>
            <input type="number" min="1" step="1" value={price}
              onChange={(e) => { setPrice(e.target.value); setConfirmed(false) }}
              placeholder="מחיר"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-orange-400 focus:outline-none"
              dir="ltr" />
            {parsedPrice > (target?.shekelBalance || 0) && <p className="text-xs text-red-500">ל{target?.name} אין מספיק שקלים</p>}
          </div>
        )}

        {/* Preview */}
        {parsed >= 1 && (
          <div className={`rounded-2xl p-4 text-center ${isStars ? (mode === 'gift' ? 'bg-indigo-50' : 'bg-orange-50') : 'bg-emerald-50'}`}>
            <p className="text-sm text-gray-500 mb-1">
              <strong>{child.name}</strong>{' '}{isStars ? (mode === 'gift' ? 'שולח בחינם' : 'מוכר') : 'מעביר'}{' '}ל<strong>{target?.name}</strong>
            </p>
            <p className={`text-3xl font-black ${isStars ? (mode === 'gift' ? 'text-indigo-700' : 'text-orange-700') : 'text-emerald-700'}`}>
              {parsed}{isStars ? '⭐' : '₪'}
              {isStars && mode === 'sale' && parsedPrice >= 1 ? ` ← ${parsedPrice}₪` : ''}
            </p>
          </div>
        )}

        {confirmed ? (
          <div className="space-y-2">
            <p className="text-sm text-center font-bold text-gray-700 bg-white/80 rounded-2xl py-2">בטוח לאשר?</p>
            <div className="flex gap-2">
              <button onClick={handleConfirm} disabled={busy}
                className="flex-1 py-3 rounded-2xl font-black text-white text-sm active:scale-95"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {busy ? '...' : '✅ אשר'}
              </button>
              <button onClick={() => setConfirmed(false)}
                className="flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-white/60 text-sm active:scale-95">ביטול</button>
            </div>
          </div>
        ) : (
          <button onClick={handleConfirm} disabled={!canTransfer || busy}
            className="w-full py-4 rounded-2xl font-black text-white text-base active:scale-95 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            {isStars ? (mode === 'gift' ? '🎁 שלח כוכבים' : '💰 מכור כוכבים') : '💸 העבר כסף'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Wheel Modal ──────────────────────────────────────────────────────────────

const CX = 170, CY = 170, R = 160
const PHASE1_MS = 3500, PHASE2_MS = 500, PAUSE_MS = 800
const WHEEL_COLORS = ['#0ea5e9','#059669','#0891b2','#0e7490','#06b6d4','#7c3aed','#0d9488','#15803d','#047857','#0369a1','#8b5cf6','#d97706']

function polarR(deg, r) { const rad = ((deg - 90) * Math.PI) / 180; return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) } }
function polar(deg) { return polarR(deg, R) }

function ChildWheelModal({ child, settings, familyCode, childId, onClose, onUpdate, showHint }) {
  const prizes  = (settings?.wheelPrizes?.length >= 2 ? settings.wheelPrizes : DEFAULT_WHEEL_PRIZES)
  const SPIN_COST = settings?.wheelSpinCost ?? 70
  const segments  = prizes.map((p, i) => ({ ...p, color: WHEEL_COLORS[i % WHEEL_COLORS.length], label: String(p.shekels) }))
  const N   = segments.length
  const DEG = 360 / N

  const freeSpins = child?.freeSpins || 0
  const isFree    = freeSpins > 0
  const canSpin   = isFree || (child?.starBalance || 0) >= SPIN_COST

  const [spinning, setSpinning] = useState(false)
  const [result,   setResult]   = useState(null)
  const [busy,     setBusy]     = useState(false)
  const wheelRef     = useRef(null)
  const highlightRef = useRef(null)
  const tickIds      = useRef([])
  const rafRef       = useRef(null)

  function segPath(i) {
    const s = polar(i * DEG); const e = polar((i + 1) * DEG)
    return `M${CX},${CY} L${s.x.toFixed(2)},${s.y.toFixed(2)} A${R},${R},0,0,1,${e.x.toFixed(2)},${e.y.toFixed(2)} Z`
  }
  function labelPos(i) { const a = polarR(i * DEG + DEG / 2, R); return { x: CX + (a.x - CX) * 0.62, y: CY + (a.y - CY) * 0.62 } }

  function startHighlight() {
    const hl = highlightRef.current; if (hl) hl.setAttribute('fill', 'rgba(255,255,255,0.28)')
    function frame() {
      const el = wheelRef.current; if (!el || !highlightRef.current) return
      try { const m = new DOMMatrix(window.getComputedStyle(el).transform); const deg = ((Math.atan2(m.m12, m.m11) * 180 / Math.PI) + 360) % 360; const idx = Math.floor(((360 - deg) % 360) / DEG) % N; highlightRef.current.setAttribute('d', segPath(idx)) } catch {}
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
  }
  function stopHighlight(winnerIdx) {
    cancelAnimationFrame(rafRef.current); rafRef.current = null
    const hl = highlightRef.current; if (hl) { hl.setAttribute('d', segPath(winnerIdx)); hl.setAttribute('fill', 'rgba(255,255,255,0.32)') }
  }

  async function spin() {
    if (spinning || result || !canSpin || busy) return
    setSpinning(true)
    setBusy(true)
    try {
      const freshChildren = await fetchFamilyData(familyCode, 'children') || []
      let newChildren
      if (isFree) {
        newChildren = freshChildren.map((c) => c.id !== childId ? c : { ...c, freeSpins: Math.max(0, (c.freeSpins || 0) - 1) })
        await pushFamilyData(familyCode, 'children', newChildren)
        onUpdate(newChildren, null)
      } else {
        const freshTxs = await fetchFamilyData(familyCode, 'all_transactions') || {}
        const newTx = { id: generateId(), type: 'wheel_spin', amount: SPIN_COST, currency: 'stars', description: '🎰 גלגל המזל — עלות סיבוב', timestamp: Date.now() }
        newChildren = freshChildren.map((c) => c.id !== childId ? c : { ...c, starBalance: Math.max(0, c.starBalance - SPIN_COST) })
        const newTxs = { ...freshTxs, [childId]: [newTx, ...(freshTxs[childId] || [])] }
        await pushFamilyData(familyCode, 'children', newChildren)
        await pushFamilyData(familyCode, 'all_transactions', newTxs)
        onUpdate(newChildren, newTx)
      }
    } catch { showHint('שגיאה — נסה שוב'); setSpinning(false); setBusy(false); return }
    setBusy(false)

    const winner    = Math.floor(Math.random() * N)
    const segCenter = winner * DEG + DEG / 2
    const finalAngle = 360 * 6 + (360 - segCenter)
    const overshoot  = 18 + Math.random() * 14
    const el = wheelRef.current
    if (el) {
      el.style.transition = 'none'; el.style.transform = 'rotate(0deg)'; void el.getBoundingClientRect()
      el.style.transition = `transform ${PHASE1_MS}ms cubic-bezier(0.08,0.4,0.12,1)`; el.style.transform = `rotate(${finalAngle + overshoot}deg)`
      setTimeout(() => { el.style.transition = `transform ${PHASE2_MS}ms cubic-bezier(0.25,0.46,0.45,0.94)`; el.style.transform = `rotate(${finalAngle}deg)` }, PHASE1_MS)
    }
    startHighlight()
    sounds.wheelTick?.() // optional - might not exist
    tickIds.current = [
      setTimeout(() => { sounds.lotteryPop?.(); try { navigator.vibrate?.([70, 20, 90]) } catch {} }, PHASE1_MS + 80),
      setTimeout(() => sounds.wheelSuspense?.(), PHASE1_MS + 300),
      setTimeout(() => {
        sounds.wheelReveal?.()
        celebrateGoal()
        stopHighlight(winner)
        setSpinning(false)
        setResult(segments[winner])
      }, PHASE1_MS + PHASE2_MS + PAUSE_MS),
    ]
  }

  async function handleClaim() {
    if (!result || busy) return
    setBusy(true)
    try {
      const freshChildren = await fetchFamilyData(familyCode, 'children') || []
      const freshTxs = await fetchFamilyData(familyCode, 'all_transactions') || {}
      const newTx = { id: generateId(), type: 'wheel_win', amount: result.shekels, currency: 'shekels', description: '🎰 גלגל המזל — זכייה', timestamp: Date.now() }
      const newChildren = freshChildren.map((c) => c.id !== childId ? c : { ...c, shekelBalance: c.shekelBalance + result.shekels })
      const newTxs = { ...freshTxs, [childId]: [newTx, ...(freshTxs[childId] || [])] }
      await pushFamilyData(familyCode, 'children', newChildren)
      await pushFamilyData(familyCode, 'all_transactions', newTxs)
      await appendChildActivity(familyCode, { id: generateId(), childId, childName: child.name, type: 'wheel_win', description: `${child.name} זכה ב-${result.shekels}₪ בגלגל`, amount: result.shekels, currency: 'shekels', timestamp: Date.now() })
      onUpdate(newChildren, newTx)
      sounds.goal?.()
      showHint(`🎉 זכית ב-${result.shekels}₪!`)
      onClose()
    } catch { showHint('שגיאה — נסה שוב') }
    setBusy(false)
  }

  function handleClose() {
    tickIds.current.forEach(clearTimeout)
    cancelAnimationFrame(rafRef.current)
    if (result && !busy) handleClaim()  // auto-claim if prize pending
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-violet-900 to-purple-950 text-white overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-10 pb-2 flex-shrink-0">
        <div className="w-10" />
        <h1 className="text-base font-black tracking-wide">🎰 גלגל המזל</h1>
        <button onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-2xl font-bold active:scale-90 leading-none">×</button>
      </div>

      <div className="flex-1 flex flex-col items-center gap-3 px-4 pb-4 min-h-0">
        {/* Info bar */}
        <div className="w-full max-w-sm flex-shrink-0">
          {result ? (
            <div className="rounded-2xl px-4 py-2.5 text-center animate-bounce-in"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
              <p className="text-lg font-black">🎉 זכית ב-{result.shekels}₪!</p>
              <p className="text-xs font-bold text-emerald-300 mt-0.5">💵 הכסף נוסף לחשבון!</p>
            </div>
          ) : isFree ? (
            <div className="rounded-2xl px-3 py-2 flex items-center gap-2 animate-pop"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)' }}>
              <span className="text-lg">🎁</span>
              <p className="font-black text-sm flex-1">{freeSpins > 1 ? `${freeSpins} סיבובים חינמיים!` : 'סיבוב מתנה!'}</p>
              <span className="text-xs font-black bg-white/25 rounded-full w-6 h-6 flex items-center justify-center">×{freeSpins}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl px-2 py-1.5 text-center" style={{ background: 'rgba(254,243,199,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
                <div className="text-[10px] font-semibold text-amber-300">יתרת כוכבים</div>
                <div className="text-sm font-black text-amber-200">⭐ {formatNumber(child.starBalance)}</div>
              </div>
              <div className="flex-1 rounded-xl px-2 py-1.5 text-center" style={{ background: 'rgba(221,214,254,0.15)', border: '1px solid rgba(167,139,250,0.35)' }}>
                <div className="text-[10px] font-semibold text-violet-300">עלות סיבוב</div>
                <div className="text-sm font-black text-violet-200">⭐ {SPIN_COST}</div>
              </div>
            </div>
          )}
        </div>

        {/* Wheel */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="relative flex-shrink-0" style={{ width: 340, height: 354 }}>
            <div className="absolute top-0 left-1/2 z-10" style={{ transform: 'translateX(-50%) translateY(-2px)', width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '26px solid white', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.5))' }} />
            <svg ref={wheelRef} width={340} height={340} style={{ display: 'block', willChange: 'transform', marginTop: 14 }}>
              {segments.map((seg, i) => <path key={`f${i}`} d={segPath(i)} fill={seg.color} />)}
              <path ref={highlightRef} d="" fill="rgba(255,255,255,0)" />
              {Array.from({ length: N }, (_, i) => { const p = polar(i * DEG); return <line key={`d${i}`} x1={CX} y1={CY} x2={p.x.toFixed(2)} y2={p.y.toFixed(2)} stroke="white" strokeWidth={2.5} /> })}
              {segments.map((seg, i) => { const lp = labelPos(i); return (
                <g key={`l${i}`} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  <text x={lp.x} y={lp.y - 9} textAnchor="middle" dominantBaseline="central" fontSize={20}>{seg.emoji}</text>
                  <text x={lp.x} y={lp.y + 12} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold" fill="white">{seg.label}₪</text>
                </g>
              )})}
              <circle cx={CX} cy={CY} r={22} fill="white" stroke="#ddd6fe" strokeWidth={3} />
              <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize={20}>🎰</text>
            </svg>
          </div>
        </div>

        {/* Action */}
        <div className="w-full max-w-sm flex-shrink-0">
          {!canSpin && !result && (
            <p className="text-center text-xs text-rose-300 font-semibold bg-rose-900/40 rounded-xl py-1.5 px-3 mb-2">
              אין מספיק כוכבים (יש {child.starBalance}⭐, צריך {SPIN_COST}⭐)
            </p>
          )}
          {result ? (
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl animate-ping"
                style={{ background: 'rgba(16,185,129,0.35)', animationDuration: '1s' }} />
              <button onClick={handleClaim} disabled={busy}
                className="relative overflow-hidden w-full py-5 rounded-2xl font-black text-2xl text-white active:scale-95 transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#34d399,#059669,#047857)', boxShadow: '0 0 0 4px rgba(52,211,153,0.4), 0 12px 40px rgba(16,185,129,0.7)' }}>
                <span className="prize-shimmer" />
                <span className="relative">{busy ? '...' : `💰 קח את הפרס — ${result.shekels}₪!`}</span>
              </button>
            </div>
          ) : (
            <button onClick={spin} disabled={spinning || !canSpin || busy}
              className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-60"
              style={{ background: spinning ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: spinning ? 'none' : '0 6px 22px rgba(124,58,237,0.5)' }}>
              {spinning ? '🎰 מסתובב...' : isFree ? '🎁 סובב חינם!' : `🎰 סובב! (${SPIN_COST}⭐)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Prizes Modal (child requests a prize → parent approves) ─────────────────

function ChildPrizesModal({ child, familyCode, childId, settings, pendingChores, onClose, showHint }) {
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)

  const prizes = settings?.prizes?.length ? settings.prizes : DEFAULT_PRIZES
  const myPendingPrizes = (pendingChores || []).filter(
    (pc) => pc.childId === childId && pc.type === 'prize' && pc.status === 'pending'
  )

  async function handleRequest(prize) {
    if (child.starBalance < prize.starCost) return
    if (!confirming) { setConfirming(prize); return }
    setBusy(true)
    try {
      const current = await fetchFamilyData(familyCode, 'pendingChores') || []
      const newReq = {
        id: generateId(),
        childId,
        choreId: prize.id,
        choreName: prize.name,
        choreEmoji: prize.emoji,
        amount: prize.starCost,
        currency: 'stars',
        source: 'child',
        type: 'prize',
        prizeId: prize.id,
        timestamp: Date.now(),
        status: 'pending',
      }
      await pushFamilyData(familyCode, 'pendingChores', [...current, newReq])
      await appendChildActivity(familyCode, {
        id: generateId(), childId, childName: child.name, type: 'prize_redeem',
        description: `${child.name} מבקש לממש פרס: ${prize.emoji} ${prize.name}`,
        amount: prize.starCost, currency: 'stars', timestamp: Date.now(),
      })
      showHint(`🎁 בקשה נשלחה להורה לאישור!`)
      setConfirming(null)
      onClose()
    } catch { showHint('שגיאה — נסה שוב') }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: 'linear-gradient(160deg,#faf5ff,#ede9fe)' }}>
      <div className="flex items-center justify-between px-5 pt-10 pb-4 flex-shrink-0">
        <h1 className="text-xl font-black text-purple-900">🎁 מימוש פרס</h1>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/60 flex items-center justify-center text-xl font-bold text-purple-700 active:scale-90">×</button>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-4">
        {/* Star balance */}
        <div className="rounded-2xl py-3 text-center" style={{ background: 'rgba(255,255,255,0.85)' }}>
          <span className="text-3xl font-black text-amber-600">{formatNumber(child.starBalance)}⭐</span>
          <p className="text-xs text-amber-500 mt-0.5">יתרת כוכבים</p>
        </div>

        {/* Pending prize requests */}
        {myPendingPrizes.length > 0 && (
          <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,251,235,0.95)', border: '1.5px solid rgba(245,158,11,0.25)' }}>
            <p className="text-xs font-black text-amber-600">⏳ ממתינות לאישור</p>
            {myPendingPrizes.map((req) => (
              <div key={req.id} className="flex items-center gap-2 bg-white/70 rounded-xl px-3 py-2">
                <span className="text-xl">{req.choreEmoji}</span>
                <span className="text-sm font-semibold text-gray-700 flex-1">{req.choreName}</span>
                <span className="text-xs text-amber-600 font-bold">{req.amount}⭐</span>
              </div>
            ))}
          </div>
        )}

        {/* Confirm step */}
        {confirming ? (
          <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <div className="text-6xl">{confirming.emoji}</div>
            <p className="font-black text-gray-800 text-lg">{confirming.name}</p>
            <p className="text-purple-600 font-bold">-{confirming.starCost}⭐ · ממתין לאישור הורה</p>
            <p className="text-sm text-gray-500">ההורה יראה את הבקשה ויאשר</p>
            <div className="flex gap-2">
              <button onClick={() => handleRequest(confirming)} disabled={busy}
                className="flex-1 py-3 rounded-2xl font-black text-white active:scale-95"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                {busy ? '...' : '✅ שלח בקשה'}
              </button>
              <button onClick={() => setConfirming(null)}
                className="flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-gray-100 active:scale-95">ביטול</button>
            </div>
          </div>
        ) : (
          /* Prize grid */
          <div className="grid grid-cols-2 gap-3">
            {prizes.map((prize) => {
              const canAfford = child.starBalance >= prize.starCost
              const alreadyPending = myPendingPrizes.some((r) => r.prizeId === prize.id)
              return (
                <button key={prize.id} onClick={() => !alreadyPending && handleRequest(prize)}
                  disabled={alreadyPending}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all active:scale-95 ${
                    alreadyPending ? 'bg-amber-50 border-amber-200 opacity-70' :
                    canAfford ? 'bg-white border-purple-200 hover:border-purple-400' : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}>
                  <span className="text-4xl">{prize.emoji}</span>
                  <p className="font-bold text-gray-800 text-xs leading-tight">{prize.name}</p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${canAfford ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'}`}>
                    {prize.starCost}⭐
                  </span>
                  <div className="w-full">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${canAfford ? 'bg-purple-500' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(100, (child.starBalance / prize.starCost) * 100)}%` }} />
                    </div>
                    <p className={`text-[10px] mt-0.5 font-semibold ${canAfford ? 'text-purple-600' : 'text-gray-400'}`}>
                      {alreadyPending ? '⏳ ממתין לאישור' : canAfford ? '✅ יש מספיק!' : `חסרים ${prize.starCost - child.starBalance}⭐`}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Goals Modal (child sets own savings goal) ────────────────────────────────

function ChildGoalsModal({ child, familyCode, childId, onClose, onUpdate, showHint }) {
  const [editing, setEditing] = useState(null)  // 'new' | goalId
  const [emoji, setEmoji] = useState('🎯')
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)

  const goals = Array.isArray(child.goals) ? child.goals
    : child.goal ? [child.goal] : []
  const parsedTarget = parseFloat(target) || 0

  function startNew() { setEditing('new'); setEmoji('🎯'); setName(''); setTarget('') }
  function startEdit(g) { setEditing(g.id); setEmoji(g.emoji || '🎯'); setName(g.name); setTarget(String(g.targetAmount)) }
  function cancelEdit() { setEditing(null) }

  async function handleSave() {
    if (!name.trim() || parsedTarget <= 0) return
    setBusy(true)
    try {
      const freshChildren = await fetchFamilyData(familyCode, 'children') || []
      const myChild = freshChildren.find((c) => c.id === childId)
      if (!myChild) return
      const existingGoals = Array.isArray(myChild.goals) ? myChild.goals : myChild.goal ? [myChild.goal] : []
      let newGoals
      if (editing === 'new') {
        newGoals = [...existingGoals, { id: generateId(), emoji, name: name.trim(), targetAmount: parsedTarget, goalImage: null }]
      } else {
        newGoals = existingGoals.map((g) => g.id === editing ? { ...g, emoji, name: name.trim(), targetAmount: parsedTarget } : g)
      }
      const newChildren = freshChildren.map((c) => c.id !== childId ? c : { ...c, goals: newGoals })
      await pushFamilyData(familyCode, 'children', newChildren)
      onUpdate(newChildren, null)
      showHint(editing === 'new' ? '🎯 מטרה נוספה!' : '🎯 מטרה עודכנה!')
      setEditing(null)
    } catch { showHint('שגיאה — נסה שוב') }
    setBusy(false)
  }

  async function handleDelete(goalId) {
    setBusy(goalId)
    try {
      const freshChildren = await fetchFamilyData(familyCode, 'children') || []
      const myChild = freshChildren.find((c) => c.id === childId)
      if (!myChild) return
      const existingGoals = Array.isArray(myChild.goals) ? myChild.goals : []
      const newGoals = existingGoals.filter((g) => g.id !== goalId)
      const newChildren = freshChildren.map((c) => c.id !== childId ? c : { ...c, goals: newGoals })
      await pushFamilyData(familyCode, 'children', newChildren)
      onUpdate(newChildren, null)
      showHint('🗑️ מטרה נמחקה')
    } catch { showHint('שגיאה — נסה שוב') }
    setBusy(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: 'linear-gradient(160deg,#eef2ff,#f5f3ff)' }}>
      <div className="flex items-center justify-between px-5 pt-10 pb-4 flex-shrink-0">
        <h1 className="text-xl font-black text-indigo-900">🎯 המטרות שלי</h1>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/60 flex items-center justify-center text-xl font-bold text-indigo-700 active:scale-90">×</button>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-3">
        {/* Existing goals */}
        {goals.length === 0 && editing !== 'new' && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-gray-500 font-semibold">אין מטרות עדיין</p>
            <p className="text-gray-400 text-sm mt-1">הוסף את המטרה הראשונה שלך!</p>
          </div>
        )}

        {goals.map((goal) => {
          const pct = Math.min(1, child.shekelBalance / goal.targetAmount)
          if (editing === goal.id) {
            return (
              <GoalEditForm key={goal.id} emoji={emoji} name={name} target={target} parsedTarget={parsedTarget}
                setEmoji={setEmoji} setName={setName} setTarget={setTarget}
                onSave={handleSave} onCancel={cancelEdit} busy={busy} />
            )
          }
          return (
            <div key={goal.id} className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(99,102,241,0.2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{goal.goalImage
                  ? <img src={goal.goalImage} alt="" className="w-8 h-8 rounded-xl object-cover" />
                  : goal.emoji || '🎯'}</span>
                <span className="font-black text-gray-800 flex-1">{goal.name}</span>
                <span className="text-sm font-bold text-gray-500">{formatNumber(goal.targetAmount)}₪</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct * 100}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {pct >= 1 ? '🎉 הגעת למטרה!' : `${Math.round(pct * 100)}% — עוד ${formatNumber(Math.max(0, goal.targetAmount - child.shekelBalance))}₪`}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(goal)} className="text-xs text-gray-400 px-2 py-1 rounded-lg bg-gray-50 active:scale-90">✏️</button>
                  <button onClick={() => handleDelete(goal.id)} disabled={busy === goal.id}
                    className="text-xs text-rose-400 px-2 py-1 rounded-lg bg-rose-50 active:scale-90 disabled:opacity-50">
                    {busy === goal.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Add new goal form */}
        {editing === 'new' ? (
          <GoalEditForm emoji={emoji} name={name} target={target} parsedTarget={parsedTarget}
            setEmoji={setEmoji} setName={setName} setTarget={setTarget}
            onSave={handleSave} onCancel={cancelEdit} busy={busy} />
        ) : (
          <button onClick={startNew}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-500 font-black text-sm active:scale-95 transition-all"
            style={{ background: 'rgba(238,242,255,0.6)' }}>
            ➕ הוסף מטרה חדשה
          </button>
        )}
      </div>
    </div>
  )
}

function GoalEditForm({ emoji, name, target, parsedTarget, setEmoji, setName, setTarget, onSave, onCancel, busy }) {
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.95)', border: '2px solid rgba(99,102,241,0.3)' }}>
      {/* Emoji picker */}
      <div>
        <p className="text-xs font-bold text-gray-500 mb-2">אמוג׳י</p>
        <div className="flex flex-wrap gap-2">
          {GOAL_EMOJIS.slice(0, 12).map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)}
              className={`text-2xl p-1.5 rounded-xl transition-all active:scale-90 ${emoji === e ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'bg-gray-50'}`}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="מה אתה חוסך? (אייפד, אופניים...)"
        className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-base focus:border-indigo-400 focus:outline-none"
        dir="rtl" />
      <input type="number" min="1" step="1" value={target} onChange={(e) => setTarget(e.target.value)}
        placeholder="יעד בשקלים (₪)"
        className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-xl font-bold focus:border-indigo-400 focus:outline-none text-center"
        dir="ltr" />
      <div className="flex gap-2">
        <button onClick={onSave} disabled={!name.trim() || parsedTarget <= 0 || busy}
          className="flex-1 py-3 rounded-2xl font-black text-white text-sm active:scale-95 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          {busy ? '...' : '💾 שמור'}
        </button>
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-gray-100 text-sm active:scale-95">ביטול</button>
      </div>
    </div>
  )
}

// ─── Free Spin Celebration Overlay ───────────────────────────────────────────

function FreeSpinCelebrationOverlay({ count, onSpin, onDismiss }) {
  useEffect(() => {
    celebrateGoal()
    sounds.approve?.()
    try { navigator.vibrate?.([40, 20, 80, 20, 120, 30, 120]) } catch {}
  }, [])

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-[32px] p-8 text-center animate-bounce-in"
        style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)', boxShadow: '0 0 60px rgba(251,191,36,0.7), 0 24px 60px rgba(0,0,0,0.5)' }}>
        <div className="text-8xl mb-3" style={{ animation: 'bounce 0.8s ease-in-out infinite alternate' }}>🎰</div>
        <h2 className="text-3xl font-black text-white mb-1 drop-shadow">סיבוב חינם!</h2>
        <p className="text-lg font-bold text-white/90 mb-1">השלמת 5 מטלות 🎉</p>
        <p className="text-sm text-white/80 mb-6">
          {count > 1 ? `יש לך ${count} סיבובים חינמיים` : 'קיבלת סיבוב אחד בגלגל המזל'}
        </p>
        <div className="relative mb-3 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 animate-ping"
            style={{ background: 'rgba(255,255,255,0.35)', animationDuration: '1s' }} />
          <button onClick={onSpin}
            className="relative w-full py-5 rounded-2xl font-black text-2xl text-amber-800 active:scale-95 transition-transform"
            style={{ background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
            🎰 סובב עכשיו!
          </button>
        </div>
        <button onClick={onDismiss}
          className="w-full py-3 rounded-2xl font-semibold text-white/80 text-sm active:scale-95 transition-all"
          style={{ background: 'rgba(0,0,0,0.15)' }}>
          אחר כך
        </button>
      </div>
    </div>
  )
}

function IconCloud({ icons }) {
  if (!icons.length) return null
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]">
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
            animationName: 'icon-drift',
            animationDuration: `${dur}s`,
            animationDelay: `${del}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            '--dx': `${dx}px`, '--dy': `${dy}px`,
          }}>{emoji}</span>
        )
      })}
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

export default function ChildModeApp() {
  const childMode = get('childMode')
  const { familyCode, childId } = childMode || {}

  const [children, setChildren]       = useState([])
  const [chores, setChores]           = useState([])
  const [transactions, setTransactions] = useState([])
  const [settings, setSettings]       = useState({})
  const [pendingChores, setPendingChores] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [submitting, setSubmitting]   = useState(null)
  const [hint, setHint]               = useState(null)
  const [notifPerm, setNotifPerm]     = useState(getPermission())
  const [showSavings,  setShowSavings]  = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showWheel,    setShowWheel]    = useState(false)
  const [showPrizes,   setShowPrizes]   = useState(false)
  const [showGoals,    setShowGoals]    = useState(false)
  const [showFreeSpinCelebration, setShowFreeSpinCelebration] = useState(false)
  const [selectedChores, setSelectedChores] = useState(new Set())
  const [submittingBulk, setSubmittingBulk] = useState(false)

  const prevPendingRef = useRef(null)

  function showHint(msg) {
    setHint(msg)
    setTimeout(() => setHint(null), 3500)
  }

  // Initial load
  useEffect(() => {
    if (!familyCode) { setError('חסר קוד משפחה'); setLoading(false); return }
    async function init() {
      try {
        const [c, ch, tx, s, pc] = await Promise.all([
          fetchFamilyData(familyCode, 'children'),
          fetchFamilyData(familyCode, 'chores'),
          fetchFamilyData(familyCode, 'all_transactions'),
          fetchFamilyData(familyCode, 'settings'),
          fetchFamilyData(familyCode, 'pendingChores'),
        ])
        if (c) setChildren(c)
        if (ch) setChores(ch)
        if (tx) setTransactions((tx[childId] || []).sort((a, b) => b.timestamp - a.timestamp))
        if (s) setSettings(s)
        const pcData = pc || []
        setPendingChores(pcData)
        prevPendingRef.current = pcData
      } catch {
        setError('שגיאת חיבור — בדקו את החיבור לאינטרנט')
      }
      setLoading(false)
    }
    init()
  }, [familyCode, childId])

  // Real-time subscriptions
  useEffect(() => {
    if (!familyCode) return
    const unsubs = [
      subscribeFamilyData(familyCode, 'children', setChildren),
      subscribeFamilyData(familyCode, 'all_transactions', (tx) =>
        setTransactions((tx[childId] || []).sort((a, b) => b.timestamp - a.timestamp))
      ),
      subscribeFamilyData(familyCode, 'pendingChores', setPendingChores),
    ]
    return () => unsubs.forEach((u) => u())
  }, [familyCode, childId])

  // Detect approval / rejection changes and notify
  useEffect(() => {
    const prev = prevPendingRef.current
    if (prev === null) { prevPendingRef.current = pendingChores; return }

    const myChores = pendingChores.filter((pc) => pc.childId === childId)
    myChores.forEach((pc) => {
      const prevPc = prev.find((p) => p.id === pc.id)
      if (!prevPc) {
        // Brand-new item — alert child if it's a parent-assigned task
        if (pc.source === 'parent' && pc.status === 'assigned') {
          showHint(`📋 מטלה חדשה: "${pc.choreName}"`)
          sounds.send?.()
          navigator.vibrate?.([30, 10, 30, 10, 60])
        }
        return
      }
      const wasAwaitingApproval = prevPc.status === 'pending' || prevPc.status === 'done'
      if (!wasAwaitingApproval) return
      if (pc.status === 'approved') {
        showHint(`✅ "${pc.choreName}" אושר! +${pc.amount}⭐`)
        sounds.approve()
        navigator.vibrate?.([40, 20, 80])
        notifyChoreApproved(pc.choreName, pc.amount)
      } else if (pc.status === 'rejected') {
        showHint(`❌ "${pc.choreName}" לא אושרה`)
        sounds.error()
        navigator.vibrate?.([80])
        notifyChoreRejected(pc.choreName)
      }
    })
    prevPendingRef.current = pendingChores
  }, [pendingChores, childId])

  // Alert child when they earn a free spin — full-screen celebration overlay
  const prevFreeSpinsRef = useRef(null)
  useEffect(() => {
    const c = children.find((x) => x.id === childId)
    const current = c?.freeSpins || 0
    if (prevFreeSpinsRef.current === null) { prevFreeSpinsRef.current = current; return }
    if (current > prevFreeSpinsRef.current) {
      setShowFreeSpinCelebration(true)
    }
    prevFreeSpinsRef.current = current
  }, [children, childId])

  function handleChildUpdate(newChildren, newTx) {
    setChildren(newChildren)
    if (newTx) setTransactions((prev) => [newTx, ...prev])
  }

  async function markAssignedDone(pc) {
    sounds.send()
    navigator.vibrate?.([20, 10, 30])
    try {
      const current = await fetchFamilyData(familyCode, 'pendingChores') || []
      const updated = current.map((item) => item.id === pc.id ? { ...item, status: 'done' } : item)
      await pushFamilyData(familyCode, 'pendingChores', updated)
      setPendingChores(updated)
      showHint('✅ סומן כהושלם — ממתין לאישור הורה')
    } catch {
      showHint('שגיאה בשליחה — נסה שוב')
    }
  }

  async function requestChore(chore) {
    setSubmitting(chore.id)
    sounds.send()
    navigator.vibrate?.([20, 10, 30])
    try {
      const current = await fetchFamilyData(familyCode, 'pendingChores') || []
      const newReq = {
        id: generateId(),
        childId,
        choreId: chore.id,
        choreName: chore.name,
        choreEmoji: chore.emoji,
        amount: chore.defaultStars,
        currency: 'stars',
        timestamp: Date.now(),
        status: 'pending',
      }
      await pushFamilyData(familyCode, 'pendingChores', [...current, newReq])
      setPendingChores([...current, newReq])
      showHint('📝 הבקשה נשלחה להורה לאישור!')
    } catch {
      showHint('שגיאה בשליחת הבקשה — נסה שוב')
      setSubmitting(null)
      return
    }
    try { notifyChoreSubmitted(child?.name, 1, chore.name) } catch {}
    setSubmitting(null)
  }

  async function requestChores(choresToSubmit) {
    if (!choresToSubmit.length) return
    setSubmittingBulk(true)
    sounds.send()
    navigator.vibrate?.([20, 10, 30])
    try {
      const current = await fetchFamilyData(familyCode, 'pendingChores') || []
      const now = Date.now()
      const newReqs = choresToSubmit.map((chore) => ({
        id: generateId(),
        childId,
        choreId: chore.id,
        choreName: chore.name,
        choreEmoji: chore.emoji,
        amount: chore.defaultStars,
        currency: 'stars',
        timestamp: now,
        status: 'pending',
      }))
      await pushFamilyData(familyCode, 'pendingChores', [...current, ...newReqs])
      setPendingChores([...current, ...newReqs])
      showHint(choresToSubmit.length > 1
        ? `📝 ${choresToSubmit.length} בקשות נשלחו להורה!`
        : '📝 הבקשה נשלחה להורה לאישור!')
      setSelectedChores(new Set())
    } catch {
      showHint('שגיאה בשליחת הבקשה — נסה שוב')
      setSubmittingBulk(false)
      return
    }
    try { notifyChoreSubmitted(child?.name, choresToSubmit.length, choresToSubmit[0]?.name) } catch {}
    setSubmittingBulk(false)
  }

  async function handleRequestNotifPerm() {
    const result = await requestPermission()
    setNotifPerm(result)
  }

  function exitChildMode() {
    if (window.confirm('לצאת ממצב ילד?')) {
      remove('childMode')
      window.location.reload()
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg,#f0f4ff,#f0fdf4)' }}>
        <div className="text-center">
          <div className="text-5xl animate-bounce mb-4">🪙</div>
          <p className="text-gray-500 font-semibold">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  if (error || !childMode) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-6"
        style={{ background: 'linear-gradient(160deg,#f0f4ff,#f0fdf4)' }}>
        <div className="text-5xl">😕</div>
        <p className="text-gray-600 font-semibold text-center">{error || 'שגיאה בטעינה'}</p>
        <button onClick={exitChildMode} className="px-6 py-3 rounded-2xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          יציאה ממצב ילד
        </button>
      </div>
    )
  }

  const child = children.find((c) => c.id === childId)
  if (!child) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-6"
        style={{ background: 'linear-gradient(160deg,#f0f4ff,#f0fdf4)' }}>
        <div className="text-5xl">😕</div>
        <p className="text-gray-600 font-semibold text-center">הילד לא נמצא — ייתכן שהוסר מהמשפחה</p>
        <button onClick={exitChildMode} className="px-6 py-3 rounded-2xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          יציאה
        </button>
      </div>
    )
  }

  const childIdx = children.findIndex((c) => c.id === childId)
  const gradient = (child.colorKey && COLOR_OPTIONS.find((c) => c.key === child.colorKey)?.gradient)
    ?? CARD_GRADIENTS[childIdx % CARD_GRADIENTS.length]

  const goals     = getGoals(child)
  const firstGoal = goals[0] ?? null
  const choreList = chores?.length ? chores : DEFAULT_CHORES
  const myPending = pendingChores.filter((pc) => pc.childId === childId)
  const myAssigned = myPending.filter((pc) => pc.source === 'parent' && pc.status === 'assigned')
  const recentTx  = transactions.slice(0, 8)
  const todayStart = Date.now() - 86400000

  const totalStarsEarned = transactions
    .filter((tx) => tx.type === 'chore' && tx.currency === 'stars')
    .reduce((s, tx) => s + tx.amount, 0)
  const level = getLevel(totalStarsEarned)

  const siblings = children.filter((c) => c.id !== childId)
  const activeSavings = (child.savings || []).filter((s) => s.status === 'active')
  const commonProps = { child, familyCode, childId, onClose: () => {}, onUpdate: handleChildUpdate, showHint }

  return (
    <div className="min-h-screen flex flex-col pb-20"
      style={{ background: 'linear-gradient(180deg,#eef2ff 0%,#f5f3ff 100%)' }}>

      {showSavings  && <ChildSavingsModal  {...commonProps} onClose={() => setShowSavings(false)} />}
      {showTransfer && <ChildTransferModal {...commonProps} siblings={siblings} onClose={() => setShowTransfer(false)} />}
      {showWheel    && <ChildWheelModal    {...commonProps} settings={settings} onClose={() => setShowWheel(false)} />}
      {showPrizes   && <ChildPrizesModal   {...commonProps} settings={settings} pendingChores={pendingChores} onClose={() => setShowPrizes(false)} />}
      {showGoals    && <ChildGoalsModal    {...commonProps} onClose={() => setShowGoals(false)} />}

      {showFreeSpinCelebration && (
        <FreeSpinCelebrationOverlay
          count={child.freeSpins || 1}
          onSpin={() => { setShowFreeSpinCelebration(false); setShowWheel(true) }}
          onDismiss={() => setShowFreeSpinCelebration(false)}
        />
      )}

      {hint && <HintBanner text={hint} />}

      {/* Header */}
      <header className={`bg-gradient-to-br ${gradient} px-5 pt-10 pb-6 text-white`}
        style={{ borderRadius: '0 0 36px 36px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div className="flex flex-col items-center gap-2 mb-5">
          {child.avatarImage
            ? <img src={child.avatarImage} alt={child.name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white/50 shadow-lg" />
            : <div className="text-6xl">{child.avatar || '🦁'}</div>
          }
          <h1 className="text-2xl font-black">{child.name}</h1>
          <div className="bg-white/20 rounded-full px-3 py-0.5 text-sm font-semibold">
            {level.emoji} {level.name}
          </div>
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-2 gap-3">
          {(() => {
            const activeSavingsTotal = activeSavings.reduce((s, sv) => s + sv.amount, 0)
            return (
              <div className="relative overflow-hidden rounded-[22px] p-4 text-center"
                style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)', border: '2px solid rgba(255,255,255,0.5)' }}>
                <ShekelIconCloud balance={child.shekelBalance} />
                <div className="relative text-4xl font-black" dir="ltr">{formatNumber(child.shekelBalance)}₪</div>
                <div className="relative text-sm opacity-90 mt-1">{activeSavingsTotal > 0 ? '💵 זמין' : '💵 שקלים'}</div>
                {activeSavingsTotal > 0 && (
                  <div className="relative mt-2 pt-1.5 border-t border-white/25 flex items-center justify-center gap-1.5 text-white/85">
                    <span className="text-sm">🏦</span>
                    <span className="text-xs font-bold">{formatNumber(activeSavingsTotal)}₪</span>
                    <span className="text-[10px] opacity-70">בחסכון</span>
                  </div>
                )}
              </div>
            )
          })()}
          <div className="relative overflow-hidden rounded-[22px] p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)', border: '2px solid rgba(255,255,255,0.5)' }}>
            <StarIconCloud count={child.starBalance} />
            <div className="relative text-4xl font-black" dir="ltr">{formatNumber(child.starBalance)}</div>
            <div className="relative text-sm opacity-90 mt-1">⭐ כוכבים</div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 space-y-4">
        {/* Notification permission prompt */}
        {notifPerm === 'default' && (
          <button onClick={handleRequestNotifPerm}
            className="w-full flex items-center gap-3 rounded-[22px] px-4 py-3 active:scale-95 transition-all"
            style={{ background: 'rgba(255,251,235,0.95)', border: '1.5px solid rgba(245,158,11,0.3)' }}>
            <span className="text-xl flex-shrink-0">🔔</span>
            <div className="text-right flex-1">
              <p className="text-sm font-bold text-amber-800">אפשר התראות</p>
              <p className="text-xs text-amber-600">כדי לדעת מיד כשמטלה אושרה</p>
            </div>
            <span className="text-amber-500 text-sm font-bold flex-shrink-0">אפשר ›</span>
          </button>
        )}
        {notifPerm === 'denied' && (
          <div className="w-full flex items-center gap-3 rounded-[22px] px-4 py-3"
            style={{ background: 'rgba(243,244,246,0.9)', border: '1.5px solid rgba(209,213,219,0.6)' }}>
            <span className="text-xl flex-shrink-0">🔕</span>
            <div className="text-right flex-1">
              <p className="text-sm font-semibold text-gray-600">התראות חסומות</p>
              <p className="text-xs text-gray-400">כדי להפעיל — פתח הגדרות הדפדפן ואפשר התראות לאתר</p>
            </div>
          </div>
        )}

        {/* Free spin persistent banner */}
        {(child.freeSpins || 0) > 0 && (
          <button onClick={() => setShowWheel(true)}
            className="relative w-full rounded-[22px] overflow-hidden active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706,#b45309)', boxShadow: '0 6px 28px rgba(245,158,11,0.55), 0 0 0 2px rgba(251,191,36,0.4)' }}>
            {/* shimmer sweep */}
            <span className="prize-shimmer" />
            <div className="relative flex items-center gap-4 px-5 py-4">
              <div className="text-5xl flex-shrink-0" style={{ animation: 'bounce 0.9s ease-in-out infinite alternate' }}>🎰</div>
              <div className="flex-1 text-right">
                <p className="text-white font-black text-lg leading-tight">
                  {(child.freeSpins || 0) > 1 ? `${child.freeSpins} סיבובים חינמיים!` : 'יש לך סיבוב חינם!'}
                </p>
                <p className="text-amber-100 text-sm font-semibold">לחץ לסובב עכשיו ←</p>
              </div>
              <div className="flex-shrink-0 bg-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg">
                <span className="text-amber-600 font-black text-lg leading-none">{child.freeSpins}</span>
              </div>
            </div>
          </button>
        )}

        {/* Quick actions */}
        {(() => {
          const freeSpins = child.freeSpins || 0
          const actions = [
            { icon: '🏦', label: 'חסכון',  onClick: () => setShowSavings(true),  bg: 'linear-gradient(135deg,#38bdf8,#14b8a6)' },
            { icon: '🎯', label: 'מטרה',   onClick: () => setShowGoals(true),    bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
            { icon: '💸', label: 'העברה',  onClick: () => setShowTransfer(true), bg: 'linear-gradient(135deg,#818cf8,#a855f7)', disabled: siblings.length === 0 },
            { icon: '🎁', label: 'פרסים',  onClick: () => setShowPrizes(true),   bg: 'linear-gradient(135deg,#a855f7,#7c3aed)' },
            { icon: '🎰', label: 'גלגל',   onClick: () => setShowWheel(true),    bg: 'linear-gradient(135deg,#7c3aed,#6d28d9)', freeSpin: freeSpins > 0 },
          ]
          return (
            <div className="grid grid-cols-3 gap-2">
              {actions.map(({ icon, label, onClick, bg, disabled, freeSpin }) => (
                <div key={label} className="relative">
                  {freeSpin && (
                    <span className="free-spin-badge absolute -top-1.5 -left-1.5 z-10 bg-amber-400 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                      style={{ boxShadow: '0 0 8px rgba(251,191,36,0.7)' }}>
                      🎟️
                    </span>
                  )}
                  <button onClick={onClick} disabled={disabled}
                    className={`relative w-full flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[22px] active:scale-95 transition-all text-white ${disabled ? 'opacity-40' : ''}`}
                    style={{ background: bg, boxShadow: freeSpin ? '0 4px 20px rgba(251,191,36,0.5)' : '0 4px 14px rgba(0,0,0,0.15)' }}>
                    <span className="text-2xl">{icon}</span>
                    <span className="text-xs font-black">{label}</span>
                  </button>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Active savings summary */}
        {activeSavings.length > 0 && (
          <div className="rounded-[22px] p-4 space-y-2"
            style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(14,165,233,0.25)', boxShadow: '0 4px 16px rgba(14,165,233,0.08)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sky-800 text-sm">🏦 חסכונות פעילים</h3>
              <button onClick={() => setShowSavings(true)} className="text-xs font-bold text-sky-500">ניהול ›</button>
            </div>
            {activeSavings.map((s) => {
              const cm = calcCompletedMonths(s.startDate)
              const payout = cv(s.amount, cm)
              return (
                <div key={s.id} className="flex items-center justify-between bg-sky-50 rounded-2xl px-3 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-sky-700">קרן: {formatNumber(s.amount)}₪</p>
                    <p className="text-[11px] text-gray-500">{cm > 0 ? `חודש ${cm} — ${formatNumber(Math.round(payout))}₪` : 'פחות מחודש'}</p>
                  </div>
                  <span className="text-xs font-black text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                    +{Math.round((Math.pow(1.10, cm) - 1) * 100)}%
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Goals progress */}
        {goals.length > 0 ? (
          <div className="rounded-[22px] p-4 space-y-2"
            style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-black text-gray-800 text-sm">🎯 המטרות שלי</h3>
              <button onClick={() => setShowGoals(true)} className="text-xs font-bold text-indigo-400">ערוך ›</button>
            </div>
            {goals.map((goal) => {
              const pct = Math.min(1, getGoalProgress(child, settings, goal))
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-700">{goal.emoji || '🎯'} {goal.name}</span>
                    <span className="text-xs text-gray-400">{Math.round(pct * 100)}%</span>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: 'rgba(0,0,0,0.07)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct * 100}%`, background: pct >= 1 ? 'linear-gradient(90deg,#f59e0b,#f97316)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                  </div>
                  {pct >= 1 && <p className="text-xs text-amber-600 font-bold mt-0.5 text-center">🎉 הגעת!</p>}
                </div>
              )
            })}
          </div>
        ) : (
          <button onClick={() => setShowGoals(true)}
            className="w-full rounded-[22px] px-4 py-3 flex items-center gap-3 active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.7)', border: '2px dashed rgba(99,102,241,0.25)' }}>
            <span className="text-2xl">🎯</span>
            <div className="text-right">
              <p className="text-sm font-black text-indigo-600">הוסף מטרת חיסכון</p>
              <p className="text-xs text-gray-400">מה תרצה לחסוך?</p>
            </div>
          </button>
        )}

        {/* Parent-assigned tasks */}
        {myAssigned.length > 0 && (
          <div className="rounded-[22px] p-4 space-y-2 animate-slide-up"
            style={{ background: 'rgba(238,242,255,0.95)', border: '1.5px solid rgba(99,102,241,0.25)', boxShadow: '0 4px 16px rgba(99,102,241,0.12)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">📌</span>
              <h3 className="text-sm font-black text-indigo-700">משימות מההורה</h3>
              <span className="mr-auto text-xs font-black bg-indigo-500 text-white rounded-full px-2 py-0.5 animate-pop">
                {myAssigned.length}
              </span>
            </div>
            {myAssigned.map((pc) => (
              <div key={pc.id} className="bg-white/70 rounded-2xl px-3 py-3 flex items-center gap-3">
                <span className="text-xl flex-shrink-0">{pc.choreEmoji || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{pc.choreName}</p>
                  <p className="text-xs text-amber-600 font-bold">+{pc.amount}⭐ אחרי אישור</p>
                </div>
                <button
                  onClick={() => markAssignedDone(pc)}
                  className="text-xs font-black text-white px-3 py-2 rounded-xl flex-shrink-0 active:scale-90 transition-all"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 2px 8px rgba(16,185,129,0.4)' }}
                >
                  סיימתי! ✓
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pending requests status */}
        {myPending.filter((pc) => pc.timestamp > todayStart).length > 0 && (
          <div className="rounded-[22px] p-4 space-y-2"
            style={{ background: 'rgba(238,242,255,0.9)', border: '1.5px solid rgba(99,102,241,0.25)', boxShadow: '0 4px 16px rgba(99,102,241,0.1)' }}>
            <h3 className="text-sm font-black text-indigo-700">📋 הבקשות שלי היום</h3>
            {myPending.filter((pc) => pc.timestamp > todayStart).map((pc) => (
              <div key={pc.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                  <span>{pc.choreEmoji || '✅'}</span>
                  <span>{pc.choreName}</span>
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  pc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  pc.status === 'rejected' ? 'bg-rose-100 text-rose-600' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {pc.status === 'approved' ? '✓ אושר' : pc.status === 'rejected' ? '✗ נדחה' : '⏳ ממתין'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Chore request section — multi-select */}
        {(() => {
          const selectedList = choreList.filter((c) => selectedChores.has(c.id))
          const totalStars = selectedList.reduce((s, c) => s + c.defaultStars, 0)
          return (
            <div className="rounded-[22px] p-4"
              style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-gray-800 text-sm">⭐ עשיתי מטלה!</h3>
                {selectedChores.size > 0 && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {selectedChores.size} נבחרו · +{totalStars}⭐
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {choreList.map((chore) => {
                  const pendingForChore = myPending.find(
                    (pc) => pc.choreId === chore.id && pc.status === 'pending' && pc.timestamp > todayStart
                  )
                  const isSelected = selectedChores.has(chore.id)

                  if (pendingForChore) {
                    return (
                      <div key={chore.id} className="flex items-center justify-between py-2.5 px-3 rounded-2xl opacity-50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl flex-shrink-0">{chore.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-700 truncate">{chore.name}</p>
                            <p className="text-xs text-amber-600 font-bold">+{chore.defaultStars}⭐</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex-shrink-0">
                          ⏳ ממתין
                        </span>
                      </div>
                    )
                  }

                  return (
                    <button key={chore.id}
                      onClick={() => setSelectedChores((prev) => {
                        const next = new Set(prev)
                        if (next.has(chore.id)) next.delete(chore.id)
                        else next.add(chore.id)
                        return next
                      })}
                      disabled={submittingBulk}
                      className={`w-full flex items-center justify-between py-2.5 px-3 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                        isSelected ? 'bg-emerald-50 border-emerald-400' : 'bg-gray-50/60 border-transparent'
                      }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl flex-shrink-0">{chore.emoji}</span>
                        <div className="min-w-0 text-right">
                          <p className="text-sm font-semibold text-gray-700 truncate">{chore.name}</p>
                          <p className="text-xs text-amber-600 font-bold">+{chore.defaultStars}⭐</p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && <span className="text-white text-[11px] font-black leading-none">✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>

              {selectedChores.size > 0 && (
                <button
                  onClick={() => requestChores(selectedList)}
                  disabled={submittingBulk}
                  className="mt-3 w-full py-4 rounded-2xl font-black text-white text-base active:scale-95 transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
                  {submittingBulk ? '...' : selectedChores.size === 1
                    ? `📝 שלח בקשה — +${totalStars}⭐`
                    : `📝 שלח ${selectedChores.size} מטלות — +${totalStars}⭐`}
                </button>
              )}
            </div>
          )
        })()}

        {/* Balance graph */}
        <BalanceGraph transactions={transactions} currentBalance={child.shekelBalance} />

        {/* Recent transactions */}
        <div className="rounded-[22px] p-4"
          style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
          <h3 className="font-black text-gray-800 text-sm mb-2">📋 פעולות אחרונות</h3>
          {recentTx.length > 0
            ? recentTx.map((tx) => <TxRow key={tx.id} tx={tx} />)
            : (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">🌱</div>
                <p className="text-gray-400 text-sm">עדיין אין פעולות</p>
                <p className="text-gray-400 text-xs mt-1">בקש מטלה ראשונה!</p>
              </div>
            )
          }
        </div>

        {/* Notification re-enable row (visible only when granted or denied — not 'default' which already has top banner) */}
        {notifPerm === 'granted' && (
          <div className="flex items-center justify-center gap-1.5 text-emerald-500">
            <span className="text-sm">🔔</span>
            <span className="text-xs font-semibold">התראות מופעלות</span>
          </div>
        )}
        {notifPerm === 'denied' && (
          <button onClick={handleRequestNotifPerm}
            className="w-full py-2.5 rounded-2xl text-xs font-semibold text-gray-400 border border-dashed border-gray-200 active:scale-95 transition-all">
            🔕 התראות חסומות — לחץ לנסות שוב
          </button>
        )}

        {/* Exit button — far from action buttons at bottom */}
        <button onClick={exitChildMode}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-400 border border-gray-200 active:scale-95 transition-all"
          style={{ background: 'rgba(249,250,251,0.8)' }}>
          יציאה ממצב ילד
        </button>

        <div className="h-2" />
      </main>
    </div>
  )
}
