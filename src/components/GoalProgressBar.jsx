import { useState } from 'react'
import { formatNumber } from '../lib/utils.js'

export default function GoalProgressBar({ progress, goalName, targetAmount, goalEmoji, goalImage, totalValue, choresNeeded, onRedeem }) {
  const pct     = Math.min(1, progress) * 100
  const reached = progress >= 1
  const [confirm, setConfirm] = useState(false)

  function handleRedeem() {
    if (!confirm) { setConfirm(true); return }
    onRedeem()
  }

  return (
    <div
      className="rounded-[24px] p-4"
      style={reached ? {
        background: 'linear-gradient(135deg, #fef9c3, #fef3c7)',
        border: '2px solid rgba(251,191,36,0.5)',
        boxShadow: '0 8px 24px rgba(245,158,11,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
      } : {
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        border: '1.5px solid rgba(255,255,255,0.7)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.9)',
      }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <div className="text-sm text-gray-500" dir="ltr">
          <span className="font-bold text-gray-700">{formatNumber(totalValue)}₪</span>
          {' / '}
          <span>{formatNumber(targetAmount)}₪</span>
        </div>
        <div className="flex items-center gap-2">
          {goalImage
            ? <img src={goalImage} alt={goalName} className="w-9 h-9 rounded-xl object-cover flex-shrink-0 shadow-sm" />
            : goalEmoji && <span className="text-xl">{goalEmoji}</span>
          }
          <span className="font-bold text-gray-700 text-sm">{goalName}</span>
        </div>
      </div>

      {/* Progress track */}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 10, background: 'rgba(0,0,0,0.08)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
      >
        <div
          className={[
            'h-full rounded-full transition-all duration-700 relative overflow-hidden',
          ].join(' ')}
          style={{
            width: `${pct}%`,
            background: reached
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            boxShadow: pct > 0 ? (reached
              ? '0 0 10px rgba(245,158,11,0.5)'
              : '0 0 10px rgba(99,102,241,0.5)') : 'none',
          }}
        >
          {!reached && pct > 0 && (
            <span
              className="absolute inset-0 animate-shimmer"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
            />
          )}
        </div>
      </div>

      {/* Percentage label */}
      {pct >= 10 && (
        <div className="flex justify-start mt-1">
          <span className={`text-xs font-bold ${reached ? 'text-amber-600' : 'text-indigo-500'}`}>
            {Math.round(pct)}%
          </span>
        </div>
      )}

      {reached ? (
        <div className="mt-3 space-y-2">
          <p className="text-center text-amber-700 font-bold text-sm animate-bounce">
            🎉 הגעת למטרה! 🎉
          </p>
          {onRedeem && (
            confirm ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRedeem}
                  className="flex-1 py-2 rounded-xl text-white font-bold text-sm active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.4)' }}
                >
                  ✅ כן, ממש!
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm active:scale-95 transition-transform border border-gray-200"
                >
                  ביטול
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRedeem}
                className="w-full py-2.5 rounded-xl text-white font-bold text-sm active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.4)' }}
              >
                🛒 ממש מטרה — קנינו!
              </button>
            )
          )}
        </div>
      ) : choresNeeded != null && (
        <p className="text-center mt-2 text-indigo-500 text-sm font-semibold">
          💪 עוד ~{choresNeeded} מטלות ואתה שם!
        </p>
      )}
    </div>
  )
}
