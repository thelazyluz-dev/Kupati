import { useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useTransactions } from '../hooks/useTransactions.js'
import { getTotalValue, getGoalProgress, formatNumber, daysUntilBirthday } from '../lib/utils.js'
import { celebrateGoal } from '../lib/confetti.js'
import { sounds } from '../lib/sounds.js'
import GoalProgressBar from './GoalProgressBar.jsx'
import TransactionList from './TransactionList.jsx'
import Button from './ui/Button.jsx'
import { CARD_GRADIENTS } from '../lib/defaults.js'

export default function ChildDashboard({ childId }) {
  const { children, navigate, showModal, settings } = useApp()
  const { transactions } = useTransactions(childId)

  const child = children.find((c) => c.id === childId)

  useEffect(() => {
    if (!child) navigate('home')
  }, [child, navigate])

  // Birthday celebration on open
  useEffect(() => {
    if (!child?.birthday) return
    const days = daysUntilBirthday(child.birthday)
    if (days === 0) {
      celebrateGoal()
      sounds.birthday()
    }
  }, [child?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!child) return null

  const childIndex = children.indexOf(child)
  const gradient = CARD_GRADIENTS[childIndex % CARD_GRADIENTS.length]
  const totalValue = getTotalValue(child, settings)
  const goalProgress = child.goal ? getGoalProgress(child, settings) : 0

  const birthdayDays = daysUntilBirthday(child.birthday)
  const showBirthday = birthdayDays !== null && birthdayDays <= 30

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
            {/* Birthday chip */}
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

        {/* Balance cards — wiggle on change via key */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div
              key={child.starBalance}
              className="text-4xl font-bold animate-wiggle"
              dir="ltr"
            >
              {formatNumber(child.starBalance)}
            </div>
            <div className="text-sm opacity-90 mt-1">⭐ כוכבים</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div
              key={child.shekelBalance}
              className="text-4xl font-bold animate-wiggle"
              dir="ltr"
            >
              {formatNumber(child.shekelBalance)}₪
            </div>
            <div className="text-sm opacity-90 mt-1">💵 שקלים</div>
          </div>
        </div>

        <div className="text-center mt-3 text-sm opacity-80">
          סה״כ שווי: <span className="font-bold" dir="ltr">{formatNumber(totalValue)}₪</span>
          {' '}(כולל כוכבים)
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 space-y-4">
        {child.goal && (
          <GoalProgressBar
            progress={goalProgress}
            goalName={child.goal.name}
            targetAmount={child.goal.targetAmount}
            goalEmoji={child.goal.emoji}
            totalValue={totalValue}
          />
        )}

        {/* Action buttons — big, emoji-first, color-coded */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => showModal('addStars', { childId })}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-90 transition-all text-white shadow-sm font-bold"
          >
            <span className="text-2xl">⭐</span>
            <span className="text-sm">הוסף כוכבים</span>
          </button>

          <button
            onClick={() => showModal('convertStars', { childId })}
            disabled={child.starBalance === 0}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-2xl bg-sky-400 hover:bg-sky-500 active:scale-90 transition-all text-white shadow-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-2xl">🔄</span>
            <span className="text-sm">המר כוכבים</span>
          </button>

          <button
            onClick={() => showModal('addMoney', { childId })}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-400 hover:bg-emerald-500 active:scale-90 transition-all text-white shadow-sm font-bold"
          >
            <span className="text-2xl">💝</span>
            <span className="text-sm">הוסף כסף</span>
          </button>

          <button
            onClick={() => showModal('expense', { childId })}
            disabled={child.shekelBalance === 0}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-2xl bg-rose-400 hover:bg-rose-500 active:scale-90 transition-all text-white shadow-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-2xl">🛍️</span>
            <span className="text-sm">הוצאה</span>
          </button>
        </div>

        <Button
          variant="ghost"
          fullWidth
          onClick={() => showModal('goal', { childId })}
          className="active:scale-95"
        >
          {child.goal ? '🎯 ערוך מטרה' : '🎯 קבע מטרה'}
        </Button>

        {/* Transaction history */}
        <div>
          <h2 className="text-lg font-bold text-gray-700 mb-3">📜 היסטוריה</h2>
          <TransactionList transactions={transactions} />
        </div>
      </main>
    </div>
  )
}
