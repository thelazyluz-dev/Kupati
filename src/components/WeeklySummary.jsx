import { formatNumber } from '../lib/utils.js'

// Israeli week: Sunday (0) → Saturday (6)
const DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const DAY_FULL  = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export default function WeeklySummary({ transactions }) {
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

  const starsByDay   = days.map((d) => sumTx(d, (tx) => tx.currency === 'stars'   && tx.type !== 'convert_out'))
  const shekelsByDay = days.map((d) => sumTx(d, (tx) => tx.currency === 'shekels' && (tx.type === 'gift' || tx.type === 'other' || tx.type === 'convert_in')))

  const totalStars   = starsByDay.reduce((a, b) => a + b, 0)
  const totalShekels = shekelsByDay.reduce((a, b) => a + b, 0)

  // Last week totals (for trend chip)
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(weekStart.getDate() - 7)
  const lastWeekStars = transactions
    .filter((tx) => tx.timestamp >= lastWeekStart.getTime() && tx.timestamp < weekStart.getTime()
                 && tx.currency === 'stars' && tx.type !== 'convert_out')
    .reduce((s, tx) => s + tx.amount, 0)
  const hadLastWeek = transactions.some(
    (tx) => tx.timestamp >= lastWeekStart.getTime() && tx.timestamp < weekStart.getTime()
  )
  const maxStars     = Math.max(...starsByDay, 1)
  const maxShekels   = Math.max(...shekelsByDay, 0.01)
  const todayIndex   = sundayOffset // index 0-6 within the week

  const BAR_H = 64 // px — chart area height

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-700 text-sm">📊 השבוע הנוכחי</h3>
        <div className="flex gap-3 text-sm">
          {totalStars > 0 && (
            <span className="font-bold text-amber-500">⭐ {formatNumber(totalStars)}</span>
          )}
          {totalShekels > 0 && (
            <span className="font-bold text-emerald-600">₪ {formatNumber(totalShekels)}</span>
          )}
          {totalStars === 0 && totalShekels === 0 && (
            <span className="text-gray-400 text-xs">עדיין לא הרווחת השבוע</span>
          )}
        </div>
      </div>

      {/* Stars chart */}
      <p className="text-xs text-gray-400 mb-1 text-right">⭐ כוכבים</p>
      <div className="flex items-end gap-1 mb-1" style={{ height: BAR_H }}>
        {days.map((day, i) => {
          const val    = starsByDay[i]
          const isToday   = i === todayIndex
          const isFuture  = i > todayIndex
          const barH   = val > 0 ? Math.max(8, (val / maxStars) * (BAR_H - 16)) : 0

          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: BAR_H }}>
              {/* Value label */}
              <span className={`text-xs font-bold mb-0.5 ${val > 0 ? 'text-amber-600' : 'text-transparent'}`}>
                {val > 0 ? formatNumber(val) : '0'}
              </span>
              {/* Bar */}
              <div
                style={{ height: barH || 3 }}
                className={[
                  'w-full rounded-t-lg transition-all duration-500',
                  barH === 0   ? 'bg-gray-100'  :
                  isFuture     ? 'bg-amber-100'  :
                  isToday      ? 'bg-amber-400'  : 'bg-amber-300',
                ].join(' ')}
              />
            </div>
          )
        })}
      </div>

      {/* Shekels chart */}
      {totalShekels > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-1 text-right mt-3">₪ כסף שנכנס</p>
          <div className="flex items-end gap-1 mb-1" style={{ height: 40 }}>
            {days.map((day, i) => {
              const val    = shekelsByDay[i]
              const isToday   = i === todayIndex
              const isFuture  = i > todayIndex
              const barH   = val > 0 ? Math.max(6, (val / maxShekels) * 32) : 0

              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: 40 }}>
                  {val > 0 && (
                    <span className="text-xs font-bold mb-0.5 text-emerald-600">{formatNumber(val)}</span>
                  )}
                  <div
                    style={{ height: barH || 3 }}
                    className={[
                      'w-full rounded-t-lg transition-all duration-500',
                      barH === 0   ? 'bg-gray-100'    :
                      isFuture     ? 'bg-emerald-100'  :
                      isToday      ? 'bg-emerald-500'  : 'bg-emerald-300',
                    ].join(' ')}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Trend chip */}
      {(totalStars > 0 || hadLastWeek) && (
        <p className={`text-center text-xs font-semibold mt-3 rounded-xl py-1.5 px-3 ${
          !hadLastWeek
            ? 'bg-indigo-50 text-indigo-600'
            : totalStars > lastWeekStars
              ? 'bg-emerald-50 text-emerald-700'
              : totalStars === lastWeekStars
                ? 'bg-gray-50 text-gray-500'
                : 'bg-amber-50 text-amber-700'
        }`}>
          {!hadLastWeek
            ? '🌟 שבוע ראשון — המשך כך!'
            : totalStars > lastWeekStars
              ? `⬆️ יותר מהשבוע שעבר (+${formatNumber(totalStars - lastWeekStars)}⭐)!`
              : totalStars === lastWeekStars
                ? `= אותו הדבר כמו השבוע שעבר`
                : `⬇️ קצת פחות מהשבוע שעבר (${formatNumber(lastWeekStars)}⭐ אז)`}
        </p>
      )}

      {/* Day labels */}
      <div className="flex gap-1 mt-1">
        {days.map((day, i) => {
          const isToday  = i === todayIndex
          const isFuture = i > todayIndex
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <span className={[
                'text-xs font-semibold',
                isToday  ? 'text-indigo-600' :
                isFuture ? 'text-gray-300'   : 'text-gray-500',
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
