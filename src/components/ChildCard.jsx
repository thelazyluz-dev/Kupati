import { useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { CARD_GRADIENTS, COLOR_OPTIONS } from '../lib/defaults.js'
import { getGoals, getGoalProgress, getTotalValue, formatNumber, daysUntilBirthday } from '../lib/utils.js'

function BirthdayCountdown({ birthdayMMDD, birthdayDays, birthdayToday }) {
  if (!birthdayMMDD) return null

  const [mm, dd] = birthdayMMDD.split('-')
  const dateLabel = `${dd}/${mm}`
  const weeks    = Math.floor(birthdayDays / 7)
  const remDays  = birthdayDays % 7
  const isUrgent = birthdayDays <= 7
  const isSoon   = birthdayDays <= 30

  if (birthdayToday) {
    return (
      <div className="mt-2.5 rounded-2xl bg-white/35 ring-1 ring-white/50 px-3 py-2 flex items-center justify-center gap-2">
        <span className="text-lg animate-bounce">🎂</span>
        <span className="font-bold text-sm">יום הולדת שמח!</span>
        <span className="text-lg animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</span>
      </div>
    )
  }

  return (
    <div className={`mt-2.5 rounded-2xl px-3 py-2 flex items-center gap-3 ${
      isUrgent ? 'bg-white/35 ring-1 ring-white/50' : isSoon ? 'bg-white/25' : 'bg-white/15'
    }`}>
      <span className={`text-xl flex-shrink-0 ${isUrgent ? 'animate-bounce' : ''}`}>🎂</span>
      <div className="flex items-baseline gap-1 flex-shrink-0">
        {weeks > 0 ? (
          <>
            <span className={`font-black leading-none ${isUrgent ? 'text-2xl' : 'text-xl'}`}>{weeks}</span>
            <span className="text-[10px] opacity-75">שב׳</span>
            {remDays > 0 && (
              <>
                <span className={`font-black leading-none ${isUrgent ? 'text-2xl' : 'text-xl'}`}>{remDays}</span>
                <span className="text-[10px] opacity-75">י׳</span>
              </>
            )}
          </>
        ) : (
          <>
            <span className={`font-black leading-none ${isUrgent ? 'text-3xl' : 'text-2xl'}`}>{birthdayDays}</span>
            <span className="text-[10px] opacity-75">ימים</span>
          </>
        )}
      </div>
      <div className="flex-1 text-right min-w-0">
        <div className="text-xs font-bold opacity-90 leading-tight">יום הולדת</div>
        <div className="text-[11px] opacity-60 leading-tight">{dateLabel}</div>
      </div>
      {isUrgent && (
        <div className="flex gap-0.5 flex-shrink-0">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="w-1 rounded-full"
              style={{
                height: 8 + (i % 3) * 4,
                background: i < (7 - birthdayDays) ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChildCard({ child, index }) {
  const { navigate, settings, getTransactions } = useApp()

  const weekStart = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    today.setDate(today.getDate() - today.getDay())
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
  const hasActiveSavings = (child.savings || []).some((s) => s.status === 'active')
  const goalReached      = firstGoal != null && totalValue >= firstGoal.targetAmount
  const stateRing = goalReached
    ? 'ring-2 ring-yellow-300 ring-offset-1'
    : birthdayToday ? 'ring-2 ring-pink-300 ring-offset-1 animate-pulse-ring' : ''

  return (
    <button
      type="button"
      onClick={() => navigate('dashboard', child.id)}
      className={[
        `bg-gradient-to-br ${gradient} rounded-3xl p-4 text-white text-right`,
        'card-shimmer shadow-xl w-full relative overflow-hidden',
        'active:scale-95 hover:brightness-110 transition-all duration-200',
        stateRing,
      ].join(' ')}
    >
      {/* Avatar watermark */}
      <span
        className="absolute right-3 top-0 select-none pointer-events-none leading-none"
        style={{ fontSize: 82, opacity: 0.06 }}
        aria-hidden="true"
      >{child.avatar}</span>

      {/* Status badges */}
      {(hasActiveSavings || goalReached || birthdayToday) && (
        <div className="absolute top-3 left-3 flex gap-1">
          {birthdayToday    && <span className="text-base leading-none animate-bounce" title="יום הולדת!">🎂</span>}
          {goalReached      && <span className="text-base leading-none animate-pulse"  title="הגעת למטרה!">🎉</span>}
          {hasActiveSavings && <span className="text-base leading-none"                title="חסכון פעיל">🏦</span>}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white/25 ring-2 ring-white/40 flex items-center justify-center flex-shrink-0">
          <span className="text-4xl">{child.avatar}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-xl mb-2 truncate">{child.name}</div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/25 ring-1 ring-white/50 rounded-xl px-2.5 py-1">
              <span className="text-sm">⭐</span>
              <span className="font-bold text-sm">{formatNumber(child.starBalance)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/25 ring-1 ring-white/50 rounded-xl px-2.5 py-1">
              <span className="text-sm">₪</span>
              <span className="font-bold text-sm">{formatNumber(child.shekelBalance)}</span>
            </div>
            {(weekStars > 0 || weekShekels > 0) && (
              <div className="flex items-center gap-1 bg-white/35 ring-1 ring-white/60 rounded-xl px-2.5 py-1 text-xs font-semibold">
                <span className="opacity-75">השבוע:</span>
                {weekStars > 0 && <span>+{formatNumber(weekStars)}⭐</span>}
                {weekShekels > 0 && <span>+{formatNumber(weekShekels)}₪</span>}
              </div>
            )}
          </div>
          {firstGoal && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-xs opacity-85 mb-1">
                <span>{Math.round(progress * 100)}%</span>
                <span className="truncate max-w-[130px]">{firstGoal.emoji || '🎯'} {firstGoal.name}</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all duration-700" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <BirthdayCountdown
        birthdayMMDD={child.birthday}
        birthdayDays={birthdayDays}
        birthdayToday={birthdayToday}
      />
    </button>
  )
}
