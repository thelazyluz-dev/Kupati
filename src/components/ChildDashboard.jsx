import { useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useTransactions } from '../hooks/useTransactions.js'
import { getTotalValue, getGoalProgress, formatNumber } from '../lib/utils.js'
import GoalProgressBar from './GoalProgressBar.jsx'
import TransactionList from './TransactionList.jsx'
import Button from './ui/Button.jsx'
import { CARD_GRADIENTS } from '../lib/defaults.js'

export default function ChildDashboard({ childId }) {
  const { children, navigate, showModal, settings } = useApp()
  const { transactions } = useTransactions(childId)

  const child = children.find((c) => c.id === childId)

  // Guard: if child was deleted, go home
  useEffect(() => {
    if (!child) navigate('home')
  }, [child, navigate])

  if (!child) return null

  const childIndex = children.indexOf(child)
  const gradient = CARD_GRADIENTS[childIndex % CARD_GRADIENTS.length]
  const totalValue = getTotalValue(child, settings)
  const goalProgress = child.goal ? getGoalProgress(child, settings) : 0

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Header */}
      <header className={`bg-gradient-to-br ${gradient} px-5 pt-8 pb-6 text-white`}>
        <div className="flex items-center justify-between mb-4">
          {/* Edit button */}
          <button
            onClick={() => showModal('editChild', child)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-lg transition-colors"
            aria-label="ערוך"
          >
            ✏️
          </button>

          {/* Child info */}
          <div className="text-center">
            <div className="text-5xl mb-1">{child.avatar}</div>
            <h1 className="text-xl font-bold">{child.name}</h1>
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate('home')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-lg transition-colors"
            aria-label="חזור"
          >
            →
          </button>
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold" dir="ltr">{formatNumber(child.starBalance)}</div>
            <div className="text-sm opacity-90 mt-1">⭐ כוכבים</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold" dir="ltr">{formatNumber(child.shekelBalance)}₪</div>
            <div className="text-sm opacity-90 mt-1">💵 שקלים</div>
          </div>
        </div>

        {/* Total value */}
        <div className="text-center mt-3 text-sm opacity-80">
          סה״כ שווי: <span className="font-bold" dir="ltr">{formatNumber(totalValue)}₪</span>
          {' '}(כולל כוכבים)
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 space-y-4">
        {/* Goal progress */}
        {child.goal && (
          <GoalProgressBar
            progress={goalProgress}
            goalName={child.goal.name}
            targetAmount={child.goal.targetAmount}
            goalEmoji={child.goal.emoji}
            totalValue={totalValue}
          />
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="warning"
            fullWidth
            onClick={() => showModal('addStars', { childId })}
          >
            ⭐ הוסף כוכבים
          </Button>
          <Button
            variant="secondary"
            fullWidth
            disabled={child.starBalance === 0}
            onClick={() => showModal('convertStars', { childId })}
          >
            🔄 המר כוכבים
          </Button>
          <Button
            variant="success"
            fullWidth
            onClick={() => showModal('addMoney', { childId })}
          >
            💝 הוסף כסף
          </Button>
          <Button
            variant="danger"
            fullWidth
            disabled={child.shekelBalance === 0}
            onClick={() => showModal('expense', { childId })}
          >
            🛍️ הוצאה
          </Button>
        </div>

        {/* Goal button */}
        <Button
          variant="ghost"
          fullWidth
          onClick={() => showModal('goal', { childId })}
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
