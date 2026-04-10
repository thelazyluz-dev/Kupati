import { useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { getTotalValue, getGoals, getGoalProgress, formatNumber, daysUntilBirthday, starsNeededForGoal } from '../lib/utils.js'
import { celebrateGoal } from '../lib/confetti.js'
import { sounds } from '../lib/sounds.js'
import GoalProgressBar from './GoalProgressBar.jsx'
import TransactionList from './TransactionList.jsx'
import WeeklySummary from './WeeklySummary.jsx'
import Button from './ui/Button.jsx'
import { CARD_GRADIENTS } from '../lib/defaults.js'

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

export default function ChildDashboard({ childId }) {
  const { children, navigate, showModal, settings, getTransactions, chores,
          adjustShekels, adjustStars, deleteGoal, addTransaction } = useApp()
  const transactions = getTransactions(childId)

  const child = children.find((c) => c.id === childId)

  useEffect(() => {
    if (!child) navigate('home')
  }, [child, navigate])

  useEffect(() => {
    if (!child?.birthday) return
    const days = daysUntilBirthday(child.birthday)
    if (days === 0) { celebrateGoal(); sounds.birthday() }
  }, [child?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Long-press on ⭐ button: regular tap = chores only, long = parent mode (free entry)
  const starsLongPress = useLongPress(
    useCallback(() => showModal('addStars', { childId, allowFreeEntry: false }), [childId, showModal]),
    useCallback(() => showModal('addStars', { childId, allowFreeEntry: true }),  [childId, showModal]),
  )

  if (!child) return null

  function handleRedeem(goal) {
    const rate = child.exchangeRate ?? settings.globalExchangeRate
    // Deduct shekels first, then stars for the remainder
    const shekelDeduct = Math.min(child.shekelBalance, goal.targetAmount)
    const remainder    = goal.targetAmount - shekelDeduct
    const starDeduct   = remainder > 0 ? remainder / rate : 0

    if (shekelDeduct > 0) adjustShekels(childId, -shekelDeduct)
    if (starDeduct   > 0) adjustStars(childId, -starDeduct)

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
  const gradient   = CARD_GRADIENTS[childIndex % CARD_GRADIENTS.length]
  const totalValue = getTotalValue(child, settings)
  const goals      = getGoals(child)
  const rate       = child.exchangeRate ?? settings.globalExchangeRate
  const starsValue = child.starBalance * rate

  const birthdayDays = daysUntilBirthday(child.birthday)
  const showBirthday = birthdayDays !== null

  // For stars chip: how far from first goal
  const firstGoal = goals[0] ?? null
  const remaining = firstGoal ? Math.max(0, firstGoal.targetAmount - totalValue) : 0

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Header */}
      <header className={`bg-gradient-to-br ${gradient} px-5 pt-8 pb-6 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => showModal('editChild', child)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-lg transition-colors active:scale-90"
            aria-label="ערוך"
          >
            ✏️
          </button>

          <div className="text-center">
            <div className="text-6xl mb-1">{child.avatar}</div>
            <h1 className="text-2xl font-bold">{child.name}</h1>
            {showBirthday && (
              <div className="inline-block mt-1 bg-white/25 rounded-full px-3 py-0.5 text-sm font-semibold animate-pop">
                {birthdayDays === 0 ? '🎂 יום הולדת שמח! 🎉' : `🎂 עוד ${birthdayDays} ימים!`}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('home')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-lg transition-colors active:scale-90"
            aria-label="חזור"
          >
            →
          </button>
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Shekels card */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div key={child.shekelBalance} className="text-4xl font-bold animate-wiggle" dir="ltr">
              {formatNumber(child.shekelBalance)}₪
            </div>
            <div className="text-sm opacity-90 mt-1">💵 שקלים</div>
            {firstGoal && remaining > 0 && child.shekelBalance > 0 && (
              <div className="text-xs opacity-75 mt-1">
                עוד {formatNumber(Math.max(0, firstGoal.targetAmount - totalValue))}₪ למטרה
              </div>
            )}
          </div>
          {/* Stars card */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div key={child.starBalance} className="text-4xl font-bold animate-wiggle" dir="ltr">
              {formatNumber(child.starBalance)}
            </div>
            <div className="text-sm opacity-90 mt-1">⭐ כוכבים</div>
            {/* Stars → money translation */}
            {child.starBalance > 0 && (
              <div className="text-xs opacity-75 mt-1">
                {firstGoal && remaining > 0
                  ? `= ${formatNumber(starsValue)}₪ · עוד ${formatNumber(remaining)}₪`
                  : `= 💵 ${formatNumber(starsValue)}₪`}
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
            {goals.map((goal) => {
              const needed = starsNeededForGoal(child, settings, goal, chores)
              return (
                <GoalProgressBar
                  key={goal.id}
                  progress={getGoalProgress(child, settings, goal)}
                  goalName={goal.name}
                  targetAmount={goal.targetAmount}
                  goalEmoji={goal.emoji}
                  totalValue={totalValue}
                  choresNeeded={needed}
                  onRedeem={() => handleRedeem(goal)}
                />
              )
            })}
          </div>
        )}

        {/* Action buttons — first-person labels, long-press on ⭐ for parent mode */}
        <div className="grid grid-cols-2 gap-3">
          <button
            {...starsLongPress}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-90 transition-all text-white shadow-sm font-bold select-none"
          >
            <span className="text-2xl">⭐</span>
            <span className="text-sm">עשיתי מטלה!</span>
          </button>

          <button
            onClick={() => showModal('convertStars', { childId })}
            disabled={child.starBalance === 0}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-2xl bg-sky-400 hover:bg-sky-500 active:scale-90 transition-all text-white shadow-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-2xl">🔄</span>
            <span className="text-sm">המר לכסף</span>
          </button>

          <button
            onClick={() => showModal('addMoney', { childId })}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-400 hover:bg-emerald-500 active:scale-90 transition-all text-white shadow-sm font-bold"
          >
            <span className="text-2xl">💝</span>
            <span className="text-sm">קיבלתי כסף</span>
          </button>

          <button
            onClick={() => showModal('expense', { childId })}
            disabled={child.shekelBalance === 0}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-2xl bg-rose-400 hover:bg-rose-500 active:scale-90 transition-all text-white shadow-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-2xl">🛍️</span>
            <span className="text-sm">קניתי משהו</span>
          </button>
        </div>

        <Button
          variant="ghost"
          fullWidth
          onClick={() => showModal('goal', { childId })}
          className="active:scale-95"
        >
          {goals.length > 0 ? `🎯 מטרות (${goals.length})` : '🎯 קבע מטרה'}
        </Button>

        <WeeklySummary transactions={transactions} />

        <div>
          <h2 className="text-lg font-bold text-gray-700 mb-3">📜 היסטוריה</h2>
          <TransactionList transactions={transactions} childId={childId} />
        </div>
      </main>
    </div>
  )
}
