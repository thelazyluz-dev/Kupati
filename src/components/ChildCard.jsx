import { useApp } from '../context/AppContext.jsx'
import { CARD_GRADIENTS, COLOR_OPTIONS } from '../lib/defaults.js'
import { getGoals, getGoalProgress, getTotalValue, formatNumber, daysUntilBirthday } from '../lib/utils.js'

export default function ChildCard({ child, index, featured = false }) {
  const { navigate, settings } = useApp()
  const gradient = (child.colorKey && COLOR_OPTIONS.find((c) => c.key === child.colorKey)?.gradient)
    ?? CARD_GRADIENTS[index % CARD_GRADIENTS.length]

  const goals      = getGoals(child)
  const firstGoal  = goals[0] ?? null
  const progress   = firstGoal ? Math.min(1, getGoalProgress(child, settings, firstGoal)) : 0
  const totalValue = getTotalValue(child)

  const birthdayDays  = daysUntilBirthday(child.birthday)
  const birthdayToday = birthdayDays === 0
  const showBirthday  = birthdayDays !== null

  const hasActiveSavings = (child.savings || []).some((s) => s.status === 'active')
  const goalReached      = firstGoal != null && totalValue >= firstGoal.targetAmount

  // Dynamic ring for special states
  const stateRing = goalReached
    ? 'ring-2 ring-yellow-300 ring-offset-1 ring-offset-transparent'
    : birthdayToday
      ? 'ring-2 ring-pink-300 ring-offset-1 animate-pulse-ring'
      : ''

  const baseClass = [
    `bg-gradient-to-br ${gradient} rounded-3xl text-white text-right`,
    'card-shimmer shadow-xl active:scale-95 hover:shadow-2xl hover:brightness-110 transition-all duration-200 w-full relative',
    stateRing,
  ].join(' ')

  /* ── Status badges (top-left corner) ── */
  const Badges = () => (
    (hasActiveSavings || goalReached || birthdayToday) ? (
      <div className="absolute top-2.5 left-2.5 flex gap-1">
        {birthdayToday  && <span className="text-sm leading-none animate-bounce" title="יום הולדת!">🎂</span>}
        {goalReached    && <span className="text-sm leading-none animate-pulse"  title="הגעת למטרה!">🎉</span>}
        {hasActiveSavings && <span className="text-sm leading-none"              title="חסכון פעיל">🏦</span>}
      </div>
    ) : null
  )

  /* ── Avatar bubble ── */
  const AvatarBubble = ({ size = 'md' }) => {
    const dim   = size === 'lg' ? 'w-20 h-20' : 'w-14 h-14'
    const emoji = size === 'lg' ? 'text-5xl'  : 'text-4xl'
    return (
      <div className={`${dim} rounded-full bg-white/25 ring-2 ring-white/40 flex items-center justify-center flex-shrink-0`}>
        <span className={emoji}>{child.avatar}</span>
      </div>
    )
  }

  /* ── Balance chips ── */
  const BalanceChips = () => (
    <div className="flex gap-2 flex-wrap justify-end">
      <div className="flex items-center gap-1 bg-white/20 rounded-xl px-2.5 py-1">
        <span className="font-bold text-sm">{formatNumber(child.starBalance)}</span>
        <span className="text-sm">⭐</span>
      </div>
      <div className="flex items-center gap-1 bg-white/20 rounded-xl px-2.5 py-1">
        <span className="font-bold text-sm">{formatNumber(child.shekelBalance)}</span>
        <span className="text-sm">₪</span>
      </div>
    </div>
  )

  /* ── Goal progress mini-bar ── */
  const GoalBar = () => firstGoal ? (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs opacity-90 mb-1">
        <span>{Math.round(progress * 100)}%</span>
        <span className="truncate max-w-[120px]">{firstGoal.emoji || '🎯'} {firstGoal.name}</span>
      </div>
      <div className="w-full bg-white/30 rounded-full h-2">
        <div
          className="bg-white rounded-full h-2 transition-all duration-700"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  ) : null

  /* ── Birthday chip ── */
  const BirthdayChip = () => showBirthday ? (
    <div className="mt-2 bg-white/25 rounded-full px-2 py-0.5 text-xs font-semibold text-center">
      {birthdayToday ? '🎂 יום הולדת!' : `🎂 עוד ${birthdayDays} ימים`}
    </div>
  ) : null

  /* ══ FEATURED card — full-width horizontal ══ */
  if (featured) {
    return (
      <button
        onClick={() => navigate('dashboard', child.id)}
        className={`${baseClass} hover:scale-[1.02] p-5`}
      >
        <Badges />
        <div className="flex items-center gap-5">
          <AvatarBubble size="lg" />
          <div className="flex-1 min-w-0 text-right">
            <div className="font-bold text-2xl mb-2 truncate">{child.name}</div>
            <BalanceChips />
            <GoalBar />
            <BirthdayChip />
          </div>
        </div>
      </button>
    )
  }

  /* ══ REGULAR card — grid cell ══ */
  return (
    <button
      onClick={() => navigate('dashboard', child.id)}
      className={`${baseClass} hover:scale-105 p-4`}
    >
      <Badges />
      <div className="flex justify-end mb-2">
        <AvatarBubble size="md" />
      </div>
      <div className="font-bold text-lg leading-tight mb-3">{child.name}</div>
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
      <GoalBar />
      <BirthdayChip />
    </button>
  )
}
