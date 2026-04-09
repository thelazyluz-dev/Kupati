import { formatNumber } from '../lib/utils.js'

const DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

export default function WeeklySummary({ transactions }) {
  // Build last-7-days array (oldest → newest, index 6 = today)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    return d
  })

  const starsByDay = days.map((dayStart) => {
    const start = dayStart.getTime()
    const end = start + 86400000
    return transactions
      .filter(
        (tx) =>
          tx.timestamp >= start &&
          tx.timestamp < end &&
          tx.currency === 'stars' &&
          tx.type !== 'convert_out'
      )
      .reduce((sum, tx) => sum + tx.amount, 0)
  })

  const shekelsByDay = days.map((dayStart) => {
    const start = dayStart.getTime()
    const end = start + 86400000
    return transactions
      .filter(
        (tx) =>
          tx.timestamp >= start &&
          tx.timestamp < end &&
          tx.currency === 'shekels' &&
          (tx.type === 'gift' || tx.type === 'other' || tx.type === 'convert_in')
      )
      .reduce((sum, tx) => sum + tx.amount, 0)
  })

  const totalStars = starsByDay.reduce((a, b) => a + b, 0)
  const totalShekels = shekelsByDay.reduce((a, b) => a + b, 0)
  const maxVal = Math.max(...starsByDay, ...shekelsByDay, 1)

  const hasData = totalStars > 0 || totalShekels > 0

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-3 text-sm">
          {totalStars > 0 && (
            <span className="text-amber-600 font-semibold">⭐ {formatNumber(totalStars)}</span>
          )}
          {totalShekels > 0 && (
            <span className="text-emerald-600 font-semibold">₪ {formatNumber(totalShekels)}</span>
          )}
          {!hasData && <span className="text-gray-400">אין נתונים השבוע</span>}
        </div>
        <h3 className="font-bold text-gray-600 text-sm">📊 שבוע אחרון</h3>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1" style={{ height: 56 }}>
        {days.map((day, i) => {
          const stars = starsByDay[i]
          const shekels = shekelsByDay[i]
          const isToday = i === 6
          const starH = stars > 0 ? Math.max(6, (stars / maxVal) * 48) : 0
          const shekelH = shekels > 0 ? Math.max(6, (shekels / maxVal) * 48) : 0

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col items-center justify-end" style={{ height: 48 }}>
                {shekelH > 0 && (
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${isToday ? 'bg-emerald-500' : 'bg-emerald-200'}`}
                    style={{ height: shekelH }}
                  />
                )}
                {starH > 0 && (
                  <div
                    className={`w-full ${shekelH > 0 ? '' : 'rounded-t'} transition-all duration-500 ${isToday ? 'bg-amber-400' : 'bg-amber-200'}`}
                    style={{ height: starH }}
                  />
                )}
                {starH === 0 && shekelH === 0 && (
                  <div className="w-full rounded-t bg-gray-100" style={{ height: 3 }} />
                )}
              </div>
              <span className={`text-xs ${isToday ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
                {DAY_NAMES[day.getDay()]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-2">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-3 h-3 rounded bg-amber-300 inline-block" />⭐ כוכבים
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-3 h-3 rounded bg-emerald-300 inline-block" />₪ כסף
        </span>
      </div>
    </div>
  )
}
