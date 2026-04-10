import { useApp } from '../context/AppContext.jsx'
import { CARD_GRADIENTS, COLOR_OPTIONS } from '../lib/defaults.js'
import { getGoals, getGoalProgress, getTotalValue, formatNumber, daysUntilBirthday } from '../lib/utils.js'

export default function ChildCard({ child, index }) {
  const { navigate, settings } = useApp()
  const gradient = (child.colorKey && COLOR_OPTIONS.find((c) => c.key === child.colorKey)?.gradient)
    ?? CARD_GRADIENTS[index % CARD_GRADIENTS.length]

  const goals    = getGoals(child)
  const firstGoal = goals[0] ?? null
  const progress  = firstGoal ? Math.min(1, getGoalProgress(child, settings, firstGoal)) : 0
  const totalValue = getTotalValue(child, settings)

  const birthdayDays = daysUntilBirthday(child.birthday)
  const showBirthday = birthdayDays !== null

  return (
    <button
      onClick={() => navigate('dashboard', child.id)}
      className={`bg-gradient-to-br ${gradient} rounded-3xl p-4 text-white text-right shadow-xl active:scale-95 hover:scale-105 hover:shadow-2xl hover:brightness-110 transition-all duration-200 w-full`}
    >
      {/* Avatar with subtle glow ring */}
      <div className="text-5xl mb-2 text-right drop-shadow-md">{child.avatar}</div>

      {/* Name */}
      <div className="font-bold text-lg leading-tight mb-3">{child.name}</div>

      {/* Balances as pill chips */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-end gap-1.5 bg-white/20 rounded-xl px-2.5 py-1">
          <span className="font-bold text-sm">{formatNumber(child.starBalance)}</span>
          <span className="text-sm">⭐</span>
        </div>
        <div className="flex items-center justify-end gap-1.5 bg-white/20 rounded-xl px-2.5 py-1">
          <span className="font-bold text-sm">{formatNumber(child.shekelBalance)}</span>
          <span className="text-sm">₪</span>
        </div>
      </div>

      {/* First goal progress bar */}
      {firstGoal && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs opacity-90 mb-1">
            <span>{Math.round(progress * 100)}%</span>
            <span>{firstGoal.emoji || '🎯'} {firstGoal.name}</span>
          </div>
          <div className="w-full bg-white/30 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-700"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-xs opacity-75 mt-1 text-left" dir="ltr">
            {formatNumber(totalValue)} / {formatNumber(firstGoal.targetAmount)}₪
          </p>
        </div>
      )}

      {/* Birthday chip */}
      {showBirthday && (
        <div className="mt-2 bg-white/25 rounded-full px-2 py-0.5 text-xs font-semibold text-center">
          {birthdayDays === 0 ? '🎂 יום הולדת!' : `🎂 עוד ${birthdayDays} ימים`}
        </div>
      )}
    </button>
  )
}
