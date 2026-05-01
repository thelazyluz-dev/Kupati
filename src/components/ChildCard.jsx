import { useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { CARD_GRADIENTS, COLOR_OPTIONS } from '../lib/defaults.js'
import { getGoals, getGoalProgress, getTotalValue, formatNumber, daysUntilBirthday, calculateStreak } from '../lib/utils.js'

const MEDALS = ['🥇', '🥈', '🥉']

function BirthdayCountdown({ birthdayMMDD, birthdayDays, birthdayToday }) {
  if (!birthdayMMDD) return null

  const [mm, dd] = birthdayMMDD.split('-')
  const dateLabel = `${dd}/${mm}`
  const isUrgent  = birthdayDays <= 7
  const isSoon    = birthdayDays <= 30

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
        <span className={`font-black leading-none ${isUrgent ? 'text-3xl' : 'text-2xl'}`}>{birthdayDays}</span>
        <span className="text-[10px] opacity-75">ימים</span>
      </div>
      <div className="flex-1 text-right min-w-0">
        <div className="text-xs font-bold opacity-90 leading-tight">ליום הולדת</div>
        <div className="text-[11px] opacity-60 leading-tight">{dateLabel}</div>
      </div>
    </div>
  )
}

export default function ChildCard({ child, index, rank, totalChildren }) {
  const { navigate, settings, getTransactions } = useApp()

  const weekStart = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    today.setDate(today.getDate() - today.getDay())
    return today.getTime()
  }, [])

  const transactions = getTransactions(child.id)
  const weekStars = transactions
    .filter((tx) => tx.timestamp >= weekStart && tx.currency === 'stars' && tx.type === 'chore')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const weekShekels = transactions
    .filter((tx) => tx.timestamp >= weekStart && tx.currency === 'shekels' && ['gift', 'other', 'convert_in', 'savings_close'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0)

  const streak = useMemo(() => calculateStreak(transactions), [transactions])

  const missedYesterday = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const yStart = todayStart.getTime() - 86400000
    const yEnd   = todayStart.getTime()
    return !transactions.some(t => t.type === 'chore' && t.timestamp >= yStart && t.timestamp < yEnd)
  }, [transactions])

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
  const showMedal        = totalChildren >= 2 && rank <= 3
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
      {/* Avatar watermark — left side, vertically centred */}
      {child.avatarImage ? (
        <img
          src={child.avatarImage}
          alt=""
          aria-hidden="true"
          className="absolute left-2 top-1/2 select-none pointer-events-none rounded-full object-cover"
          style={{ width: 96, height: 96, opacity: 0.13, transform: 'translateY(-50%)' }}
        />
      ) : (
        <span
          className="absolute left-1 top-1/2 select-none pointer-events-none leading-none"
          style={{ fontSize: 96, opacity: 0.08, transform: 'translateY(-50%)' }}
          aria-hidden="true"
        >{child.avatar}</span>
      )}

      {/* Status badges — top-left corner */}
      {(hasActiveSavings || goalReached || birthdayToday || showMedal || missedYesterday) && (
        <div className="absolute top-3 left-3 flex gap-1">
          {showMedal        && <span className="text-xl leading-none animate-pop" title={`מקום ${rank}`}>{MEDALS[rank - 1]}</span>}
          {birthdayToday    && <span className="text-base leading-none animate-bounce" title="יום הולדת!">🎂</span>}
          {goalReached      && <span className="text-base leading-none animate-pulse"  title="הגעת למטרה!">🎉</span>}
          {hasActiveSavings && <span className="text-base leading-none"                title="חסכון פעיל">🏦</span>}
          {missedYesterday  && (
            <span
              className="text-base leading-none"
              title="לא בוצעה מטלה אתמול — הופחתו כוכבים"
            >🚩</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white/25 ring-2 ring-white/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {child.avatarImage
            ? <img src={child.avatarImage} alt={child.name} className="w-full h-full object-cover" />
            : <span className="text-4xl">{child.avatar}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-xl mb-2 truncate">{child.name}</div>

          {/* Two main balance chips */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="flex items-center justify-center gap-1.5 bg-white/25 ring-1 ring-white/50 rounded-xl px-2 py-1.5">
              <span className="text-base leading-none">💵</span>
              <span className="font-black text-base leading-none">{formatNumber(child.shekelBalance)}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 bg-white/25 ring-1 ring-white/50 rounded-xl px-2 py-1.5">
              <span className="text-base leading-none">⭐</span>
              <span className="font-black text-base leading-none">{formatNumber(child.starBalance)}</span>
            </div>
          </div>

          {/* Secondary row: streak + weekly */}
          {(streak >= 2 || weekStars > 0 || weekShekels > 0) && (
            <div className="flex gap-1.5 flex-wrap">
              {streak >= 2 && (
                <div className="flex items-center gap-1 bg-white/35 ring-1 ring-white/60 rounded-xl px-2 py-0.5 text-xs font-black">
                  🔥 {streak} ימים
                </div>
              )}
              {(weekStars > 0 || weekShekels > 0) && (
                <div className="flex items-center gap-1 bg-white/25 ring-1 ring-white/40 rounded-xl px-2 py-0.5 text-xs font-semibold">
                  <span className="opacity-70">השבוע:</span>
                  {weekStars > 0 && <span>+{formatNumber(weekStars)}⭐</span>}
                  {weekShekels > 0 && <span>+{formatNumber(weekShekels)}💵</span>}
                </div>
              )}
            </div>
          )}

          {firstGoal && (
            <div className="mt-2">
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
