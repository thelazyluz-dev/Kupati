import { useState, useEffect, useRef } from 'react'
import { get, remove } from '../lib/storage.js'
import { fetchFamilyData, subscribeFamilyData, pushFamilyData } from '../lib/childSync.js'
import { generateId, formatNumber, getGoals, getGoalProgress, getLevel } from '../lib/utils.js'
import { CARD_GRADIENTS, COLOR_OPTIONS, DEFAULT_CHORES } from '../lib/defaults.js'
import { sounds } from '../lib/sounds.js'
import { getPermission, requestPermission, notifyChoreApproved, notifyChoreRejected } from '../lib/notifications.js'

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
    <div className="fixed top-4 inset-x-4 z-50 rounded-2xl px-4 py-3 text-center font-bold text-white text-sm animate-bounce-in"
      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
      {text}
    </div>
  )
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
      if (!prevPc || prevPc.status !== 'pending') return
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
    }
    setSubmitting(null)
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
  const recentTx  = transactions.slice(0, 8)
  const todayStart = Date.now() - 86400000

  const totalStarsEarned = transactions
    .filter((tx) => tx.type === 'chore' && tx.currency === 'stars')
    .reduce((s, tx) => s + tx.amount, 0)
  const level = getLevel(totalStarsEarned)

  return (
    <div className="min-h-screen flex flex-col pb-20"
      style={{ background: 'linear-gradient(180deg,#eef2ff 0%,#f5f3ff 100%)' }}>
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
          <div className="rounded-[22px] p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)', border: '2px solid rgba(255,255,255,0.5)' }}>
            <div className="text-4xl font-black" dir="ltr">{formatNumber(child.shekelBalance)}₪</div>
            <div className="text-sm opacity-90 mt-1">💵 שקלים</div>
          </div>
          <div className="rounded-[22px] p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)', border: '2px solid rgba(255,255,255,0.5)' }}>
            <div className="text-4xl font-black" dir="ltr">{formatNumber(child.starBalance)}</div>
            <div className="text-sm opacity-90 mt-1">⭐ כוכבים</div>
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

        {/* Goal progress */}
        {firstGoal && (
          <div className="rounded-[22px] p-4"
            style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">{firstGoal.emoji || '🎯'} {firstGoal.name}</span>
              <span className="text-xs font-bold text-gray-500">
                {formatNumber(child.shekelBalance)}₪ / {formatNumber(firstGoal.targetAmount)}₪
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 10, background: 'rgba(0,0,0,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, Math.round(getGoalProgress(child, settings, firstGoal) * 100))}%`,
                  background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              {Math.round(getGoalProgress(child, settings, firstGoal) * 100)}% מהמטרה
            </p>
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

        {/* Chore request section */}
        <div className="rounded-[22px] p-4"
          style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
          <h3 className="font-black text-gray-800 text-sm mb-3">🏃 בקש אישור מטלה</h3>
          <div className="space-y-1">
            {choreList.map((chore) => {
              const pendingForChore = myPending.find(
                (pc) => pc.choreId === chore.id && pc.status === 'pending' && pc.timestamp > todayStart
              )
              return (
                <div key={chore.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl flex-shrink-0">{chore.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{chore.name}</p>
                      <p className="text-xs text-amber-600 font-bold">+{chore.defaultStars}⭐</p>
                    </div>
                  </div>
                  {pendingForChore ? (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex-shrink-0">
                      ⏳ ממתין
                    </span>
                  ) : (
                    <button
                      onClick={() => requestChore(chore)}
                      disabled={submitting === chore.id}
                      className="text-xs font-bold text-white px-4 py-1.5 rounded-full active:scale-90 transition-all disabled:opacity-50 flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg,#f59e0b,#f97316)',
                        boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                      }}
                    >
                      {submitting === chore.id ? '...' : 'בקש ✓'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

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
