import { useState } from 'react'
import { formatNumber } from '../lib/utils.js'

// Israeli week: Sunday (0) → Saturday (6)
const DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const BAR_H = 88 // px — chart area height

export default function WeeklySummary({ transactions }) {
  const [mode, setMode] = useState('stars')

  // Current week: Sunday through Saturday
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sundayOffset = today.getDay() // 0=Sun … 6=Sat
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - sundayOffset)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  function sumTx(dayStart, filter) {
    const start = dayStart.getTime()
    const end   = start + 86400000
    return transactions
      .filter((tx) => tx.timestamp >= start && tx.timestamp < end && filter(tx))
      .reduce((s, tx) => s + tx.amount, 0)
  }

  // Stars per day: positive types add, wheel_spin subtracts (net wheel result)
  const STARS_EXCLUDE = new Set(['convert_out', 'penalty', 'prize_redeem', 'savings_open'])
  const starsByDay = days.map((d) => {
    const start = d.getTime(), end = start + 86400000
    return transactions
      .filter((tx) => tx.timestamp >= start && tx.timestamp < end && tx.currency === 'stars')
      .reduce((s, tx) => {
        if (STARS_EXCLUDE.has(tx.type)) return s
        if (tx.type === 'wheel_spin') return s - tx.amount   // cost counted as negative
        return s + tx.amount
      }, 0)
  })
  const shekelsByDay = days.map((d) => sumTx(d, (tx) => tx.currency === 'shekels' && (tx.type === 'gift' || tx.type === 'other' || tx.type === 'convert_in')))

  const totalStars   = starsByDay.reduce((a, b) => a + b, 0)
  const totalShekels = shekelsByDay.reduce((a, b) => a + b, 0)
  const todayIndex     = sundayOffset

  // Last week totals (for trend chip)
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(weekStart.getDate() - 7)
  const lwStart = lastWeekStart.getTime()
  const lwEnd   = weekStart.getTime()
  const lastWeekStars = transactions
    .filter((tx) => tx.timestamp >= lwStart && tx.timestamp < lwEnd && tx.currency === 'stars')
    .reduce((s, tx) => {
      if (STARS_EXCLUDE.has(tx.type)) return s
      if (tx.type === 'wheel_spin') return s - tx.amount
      return s + tx.amount
    }, 0)
  const lastWeekShekels = transactions
    .filter((tx) => tx.timestamp >= lwStart && tx.timestamp < lwEnd && tx.currency === 'shekels' && (tx.type === 'gift' || tx.type === 'other' || tx.type === 'convert_in'))
    .reduce((s, tx) => s + tx.amount, 0)
  const hadLastWeek = transactions.some((tx) => tx.timestamp >= lwStart && tx.timestamp < lwEnd)

  // Active dataset based on toggle
  const data   = mode === 'stars' ? starsByDay : shekelsByDay
  const maxVal = mode === 'stars'
    ? Math.max(...starsByDay, 1)
    : Math.max(...shekelsByDay, 0.01)
  // Colors per mode
  const todayGrad   = mode === 'stars' ? 'linear-gradient(to top,#f97316,#fbbf24)' : 'linear-gradient(to top,#059669,#34d399)'
  const normalGrad  = mode === 'stars' ? 'linear-gradient(to top,#f59e0b,#fcd34d)' : 'linear-gradient(to top,#10b981,#6ee7b7)'
  const futureColor = mode === 'stars' ? '#fef3c7' : '#d1fae5'
  const glowColor   = mode === 'stars' ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.35)'
  const labelColor  = mode === 'stars' ? 'text-amber-500' : 'text-emerald-600'

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      {/* Header + toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-700 text-sm">📊 השבוע הנוכחי</h3>
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-0.5">
          <button
            onClick={() => setMode('stars')}
            className={`text-xs font-bold px-2.5 py-1 rounded-[10px] transition-all duration-200 ${
              mode === 'stars' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >⭐ כוכבים</button>
          <button
            onClick={() => setMode('shekels')}
            className={`text-xs font-bold px-2.5 py-1 rounded-[10px] transition-all duration-200 ${
              mode === 'shekels' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >₪ כסף</button>
        </div>
      </div>

      {/* Main chart — key=mode triggers fade-in on switch */}
      <div key={mode} className="flex items-end gap-1.5 animate-fade-in" style={{ height: BAR_H }}>
        {days.map((day, i) => {
          const val      = data[i]
          const isToday  = i === todayIndex
          const isFuture = i > todayIndex
          const barH     = val > 0 ? Math.max(10, (val / maxVal) * (BAR_H - 22)) : 0

          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: BAR_H }}>
              {/* Value label — always rendered so layout doesn't shift */}
              <span className={`text-[10px] font-bold mb-0.5 leading-none ${val > 0 ? labelColor : 'text-transparent'}`}>
                {val > 0 ? formatNumber(val) : '0'}
              </span>
              {/* Bar */}
              <div
                style={{
                  height: barH || 3,
                  background: barH === 0
                    ? '#f1f5f9'
                    : isFuture
                      ? futureColor
                      : isToday
                        ? todayGrad
                        : normalGrad,
                  boxShadow: barH > 0 && !isFuture ? `0 2px 8px ${glowColor}` : 'none',
                  transition: 'height 0.45s cubic-bezier(0.4,0,0.2,1)',
                }}
                className="w-full rounded-t-lg"
              />
            </div>
          )
        })}
      </div>

      {/* Summary chip — switches with mode */}
      {mode === 'stars' ? (
        <p className={`text-center text-xs font-semibold mt-3 rounded-xl py-1.5 px-3 ${
          !hadLastWeek
            ? 'bg-indigo-50 text-indigo-600'
            : totalStars > lastWeekStars
              ? 'bg-emerald-50 text-emerald-700'
              : totalStars === lastWeekStars
                ? 'bg-gray-50 text-gray-500'
                : 'bg-amber-50 text-amber-700'
        }`}>
          {totalStars === 0
            ? '⭐ אפס כוכבים השבוע עדיין'
            : !hadLastWeek
              ? `🌟 ${formatNumber(totalStars)}⭐ השבוע — המשך כך!`
              : totalStars > lastWeekStars
                ? `⬆️ ${formatNumber(totalStars)}⭐ השבוע — יותר מהשבוע שעבר!`
                : totalStars === lastWeekStars
                  ? `${formatNumber(totalStars)}⭐ השבוע — אותו הדבר כמו השבוע שעבר`
                  : `${formatNumber(totalStars)}⭐ השבוע — קצת פחות מהשבוע שעבר (${formatNumber(lastWeekStars)}⭐ אז)`}
        </p>
      ) : (
        <p className={`text-center text-xs font-semibold mt-3 rounded-xl py-1.5 px-3 ${
          totalShekels === 0
            ? 'bg-gray-50 text-gray-400'
            : totalShekels > lastWeekShekels
              ? 'bg-emerald-50 text-emerald-700'
              : totalShekels === lastWeekShekels
                ? 'bg-gray-50 text-gray-500'
                : 'bg-amber-50 text-amber-700'
        }`}>
          {totalShekels === 0
            ? '₪ אפס כסף נכנס השבוע'
            : !hadLastWeek
              ? `💵 ${formatNumber(totalShekels)}₪ נכנסו השבוע`
              : totalShekels > lastWeekShekels
                ? `⬆️ ${formatNumber(totalShekels)}₪ השבוע — יותר מהשבוע שעבר!`
                : totalShekels === lastWeekShekels
                  ? `${formatNumber(totalShekels)}₪ השבוע — אותו הדבר כמו השבוע שעבר`
                  : `${formatNumber(totalShekels)}₪ השבוע — קצת פחות מהשבוע שעבר (${formatNumber(lastWeekShekels)}₪ אז)`}
        </p>
      )}

      {/* Day labels */}
      <div className="flex gap-1.5 mt-2">
        {days.map((day, i) => {
          const isToday  = i === todayIndex
          const isFuture = i > todayIndex
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <span className={[
                'text-xs',
                isToday  ? 'font-black text-indigo-600' :
                isFuture ? 'font-normal text-gray-300'  : 'font-semibold text-gray-400',
              ].join(' ')}>
                {DAY_NAMES[day.getDay()]}
              </span>
              {isToday && <div className="w-1 h-1 rounded-full bg-indigo-500" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
