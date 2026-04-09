import { formatNumber } from '../lib/utils.js'

export default function GoalProgressBar({ progress, goalName, targetAmount, goalEmoji, totalValue }) {
  const pct = Math.min(1, progress) * 100
  const reached = progress >= 1

  return (
    <div
      className={[
        'rounded-2xl p-4',
        reached
          ? 'bg-gradient-to-br from-amber-50 to-yellow-100 border-2 border-amber-300 animate-pulse-gold'
          : 'bg-white border border-gray-100',
      ].join(' ')}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="text-sm text-gray-500" dir="ltr">
          <span className="font-bold text-gray-700">{formatNumber(totalValue)}₪</span>
          {' / '}
          <span>{formatNumber(targetAmount)}₪</span>
        </div>
        <div className="flex items-center gap-1">
          {goalEmoji && <span className="text-xl">{goalEmoji}</span>}
          <span className="font-bold text-gray-700 text-sm">{goalName}</span>
        </div>
      </div>

      {/* Progress track */}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={[
            'h-4 rounded-full transition-all duration-700',
            reached
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
              : 'bg-gradient-to-r from-indigo-400 to-purple-500',
          ].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>

      {reached && (
        <p className="text-center mt-2 text-amber-700 font-bold text-sm animate-bounce">
          🎉 הגעת למטרה! 🎉
        </p>
      )}
    </div>
  )
}
