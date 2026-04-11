import { useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { CARD_GRADIENTS, COLOR_OPTIONS } from '../lib/defaults.js'
import { getGoals, getGoalProgress, getTotalValue, formatNumber, daysUntilBirthday } from '../lib/utils.js'

export default function ChildCard({ child, index }) {
  const { navigate, settings, getTransactions } = useApp()

  // This-week earnings for the summary chip
  const weekStart = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    today.setDate(today.getDate() - today.getDay()) // back to Sunday
    return today.getTime()
  }, [])

  const transactions = getTransactions(child.id)
  const weekStars = transactions
    .filter((tx) => tx.timestamp >= weekStart && tx.currency === 'stars' && !['convert_out', 'prize_redeem'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0)
  const weekShekels = transactions
    .filter((tx) => tx.timestamp >= weekStart && tx.currency === 'shekels' && ['gift', 'other', 'convert_in', 'savings_close'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0)
  const gradient = (child.colorKey && COLOR_OPTIONS.find((c) => c.key === child.colorKey)?.gradient)
    ?? CARD_GRADIENTS[index % CARD_GRADIENTS.length]

  const goals      = getGoals(child)
  const firstGoal  = goals[0] ?? null
  const progress   = firstGoal ? Math.min(1, getGoalProgress(child, settings, firstGoal)) : 0
  const totalValue = getTotalValue(child)

  const birthdayDays  = daysUntilBirthday(child.birthday)
  const birthdayToday = birthdayDays === 0
  const showBirthday  = birthdayDays !== null

  const hasActiveSavings = (child.savings || []).some((s) => s.status === 'active')
  const goalReached      = firstGoal != null && totalValue >= firstGoal.targetAmount

  const stateRing = goalReached
    ? 'ring-2 ring-yellow-300 ring-offset-1'
    : birthdayToday
      ? 'ring-2 ring-pink-300 ring-offset-1 animate-pulse-ring'
      : ''

  return (
    <button
      onClick={() => navigate('dashboard', child.id)}
      className={[
        `bg-gradient-to-br ${gradient} rounded-3xl p-4 text-white text-right`,
        'card-shimmer shadow-xl active:scale-95 hover:scale-[1.02] hover:shadow-2xl hover:brightness-110 transition-all duration-200 w-full relative',
        stateRing,
      ].join(' ')}
    >
      {/* Status badges — top-left */}
      {(hasActiveSavings || goalReached || birthdayToday) && (
        <div className="absolute top-3 left-3 flex gap-1">
          {birthdayToday    && <span className="text-base leading-none animate-bounce" title="יום הולדת!">🎂</span>}
          {goalReached      && <span className="text-base leading-none animate-pulse"  title="הגעת למטרה!">🎉</span>}
          {hasActiveSavings && <span className="text-base leading-none"                title="חסכון פעיל">🏦</span>}
        </div>
      )}

      {/* Horizontal layout: avatar | info */}
      <div className="flex items-center gap-4">
        {/* Avatar bubble */}
        <div className="w-16 h-16 rounded-full bg-white/25 ring-2 ring-white/40 flex items-center justify-center flex-shrink-0">
          <span className="text-4xl">{child.avatar}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-xl mb-2 truncate">{child.name}</div>

          {/* Balance chips */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-2.5 py-1">
              <span className="text-sm">⭐</span>
              <span className="font-bold text-sm">{formatNumber(child.starBalance)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-2.5 py-1">
              <span className="text-sm">₪</span>
              <span className="font-bold text-sm">{formatNumber(child.shekelBalance)}</span>
            </div>
            {/* This week's earnings chip */}
            {(weekStars > 0 || weekShekels > 0) && (
              <div className="flex items-center gap-1 bg-white/30 rounded-xl px-2.5 py-1 text-xs font-semibold">
                <span className="opacity-80">השבוע:</span>
                {weekStars > 0 && <span>+{formatNumber(weekStars)}⭐</span>}
                {weekShekels > 0 && <span>+{formatNumber(weekShekels)}₪</span>}
              </div>
            )}
          </div>

          {/* Goal progress bar */}
          {firstGoal && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-xs opacity-85 mb-1">
                <span>{Math.round(progress * 100)}%</span>
                <span className="truncate max-w-[130px]">{firstGoal.emoji || '🎯'} {firstGoal.name}</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-700"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Birthday chip */}
          {showBirthday && (
            <div className="mt-2 inline-block bg-white/25 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              {birthdayToday ? '🎂 יום הולדת!' : `🎂 עוד ${birthdayDays} ימים`}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
