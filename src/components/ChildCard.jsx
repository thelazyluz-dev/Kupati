import { useApp } from '../context/AppContext.jsx'
import { CARD_GRADIENTS } from '../lib/defaults.js'
import { getGoalProgress, formatNumber, daysUntilBirthday } from '../lib/utils.js'

export default function ChildCard({ child, index }) {
  const { navigate, settings } = useApp()
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]
  const progress = child.goal ? Math.min(1, getGoalProgress(child, settings)) : 0

  const birthdayDays = daysUntilBirthday(child.birthday)
  const showBirthday = birthdayDays !== null

  return (
    <button
      onClick={() => navigate('dashboard', child.id)}
      className={`bg-gradient-to-br ${gradient} rounded-3xl p-4 text-white text-right shadow-lg active:scale-95 hover:scale-105 transition-transform w-full`}
    >
      {/* Avatar */}
      <div className="text-5xl mb-2 text-right">{child.avatar}</div>

      {/* Name */}
      <div className="font-bold text-lg leading-tight mb-3">{child.name}</div>

      {/* Balances */}
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-1 justify-end">
          <span className="font-semibold">{formatNumber(child.starBalance)}</span>
          <span>⭐</span>
        </div>
        <div className="flex items-center gap-1 justify-end">
          <span className="font-semibold">{formatNumber(child.shekelBalance)}</span>
          <span>₪</span>
        </div>
      </div>

      {/* Goal progress bar */}
      {child.goal && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs opacity-90 mb-1">
            <span>{child.goal.emoji || '🎯'} {child.goal.name}</span>
            <span>{Math.round(progress * 100)}%</span>
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
        <div className="mt-2 bg-white/25 rounded-full px-2 py-0.5 text-xs font-semibold text-center animate-pop">
          {birthdayDays === 0 ? '🎂 יום הולדת!' : `🎂 עוד ${birthdayDays} ימים`}
        </div>
      )}
    </button>
  )
}
