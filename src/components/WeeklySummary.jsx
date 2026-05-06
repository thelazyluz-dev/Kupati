import { useState } from 'react'
import { formatNumber } from '../lib/utils.js'

const DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const BAR_H = 88

export default function WeeklySummary({ transactions }) {
  const [mode, setMode] = useState('stars')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sundayOffset = today.getDay()
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

  const STARS_EXCLUDE = new Set(['convert_out', 'penalty', 'prize_redeem', 'savings_open'])
  const starsByDay = days.map((d) => {
    const start = d.getTime(), end = start + 86400000
    return transactions
      .filter((tx) => tx.timestamp >= start && tx.timestamp < end && tx.currency === 'stars')
      .reduce((s, tx) => {
        if (STARS_EXCLUDE.has(tx.type)) return s
        if (tx.type === 'wheel_spin') return s - tx.amount
        return s + tx.amount
      }, 0)
  })
  const shekelsByDay = days.map((d) => sumTx(d, (tx) => tx.currency === 'shekels' && (tx.type === 'gift' || tx.type === 'other' || tx.type === 'convert_in')))

  const totalStars   = starsByDay.reduce((a, b) => a + b, 0)
  const totalShekels = shekelsByDay.reduce((a, b) => a + b, 0)
  const todayIndex   = sundayOffset

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

  const data   = mode === 'stars' ? starsByDay : shekelsByDay
  const maxVal = mode === 'stars'
    ? Math.max(...starsByDay, 1)
    : Math.max(...shekelsByDay, 0.01)

  const todayGradStars   = 'linear-gradient(to top,#f97316,#fbbf24)'
  const normalGradStars  = 'linear-gradient(to top,#f59e0b,#fcd34d)'
  const todayGradShekels = 'linear-gradient(to top,#059669,#34d399)'
  const normalGradShekels= 'linear-gradient(to top,#10b981,#6ee7b7)'
  const todayGrad   = mode === 'stars' ? todayGradStars   : todayGradShekels
  const normalGrad  = mode === 'stars' ? normalGradStars  : normalGradShekels
  const futureColor = mode === 'stars' ? '#fef3c7' : '#d1fae5'
  const glowColor   = mode === 'stars' ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'
  const labelColor  = mode === 'stars' ? 'text-amber-500' : 'text-emerald-600'

  return (
    <div
      className="rounded-[24px] p-4"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        border: '1.5px solid rgba(255,255,255,0.8)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.07), inset 0 1px 2px rgba(255,255,255,0.9)',
      }}
    >
      {/* Header + toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-gray-800 text-sm">📊 השבוע הנוכחי</h3>
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-xl"
          style={{ background: 'rgba(243,244,246,0.9)', border: '1px solid rgba(229,231,235,0.6)' }}
        >
          <button
            onClick={() => setMode('stars')}
            className="text-xs font-bold px-2.5 py-1 rounded-[10px] transition-all duration-200 cursor-pointer"
            style={mode === 'stars' ? {
              background: 'white',
              color: '#d97706',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            } : { color: '#9ca3af' }}
          >⭐ כוכבים</button>
          <button
            onClick={() => setMode('shekels')}
            className="text-xs font-bold px-2.5 py-1 rounded-[10px] transition-all duration-200 cursor-pointer"
            style={mode === 'shekels' ? {
              background: 'white',
              color: '#059669',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            } : { color: '#9ca3af' }}
          >₪ כסף</button>
        </div>
      </div>

      {/* Bar chart */}
      <div key={mode} className="flex items-end gap-1.5 animate-fade-in" style={{ height: BAR_H }}>
        {days.map((day, i) => {
          const val      = data[i]
          const isToday  = i === todayIndex
          const isFuture = i > todayIndex
          const barH     = val > 0 ? Math.max(10, (val / maxVal) * (BAR_H - 22)) : 0

          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: BAR_H }}>
              <span className={`text-[10px] font-bold mb-0.5 leading-none ${val > 0 ? labelColor : 'text-transparent'}`}>
                {val > 0 ? formatNumber(val) : '0'}
              </span>
              <div
                style={{
                  height: barH || 3,
                  background: barH === 0
                    ? 'rgba(241,245,249,0.8)'
                    : isFuture
                      ? futureColor
                      : isToday
                        ? todayGrad
                        : normalGrad,
                  boxShadow: barH > 0 && !isFuture ? `0 4px 12px ${glowColor}` : 'none',
                  transition: 'height 0.45s cubic-bezier(0.4,0,0.2,1)',
                  borderRadius: '8px 8px 4px 4px',
                }}
                className="w-full"
              />
            </div>
          )
        })}
      </div>

      {/* Summary chip */}
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
