import { useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { CARD_GRADIENTS, COLOR_OPTIONS } from '../lib/defaults.js'
import { getGoals, getGoalProgress, getTotalValue, formatNumber, daysUntilBirthday, calculateStreak, getLevel } from '../lib/utils.js'

const MEDALS = ['🥇', '🥈', '🥉']

// Per-gradient colored shadow tints for claymorphism depth
const GRADIENT_SHADOWS = [
  'rgba(99,102,241,0.35)',   // indigo
  'rgba(236,72,153,0.35)',   // pink
  'rgba(16,185,129,0.35)',   // emerald
  'rgba(245,158,11,0.35)',   // amber
  'rgba(59,130,246,0.35)',   // blue
  'rgba(239,68,68,0.35)',    // red
  'rgba(139,92,246,0.35)',   // violet
  'rgba(20,184,166,0.35)',   // teal
]

export default function ChildCard({ child, index, rank, totalChildren }) {
  const { navigate, settings, getTransactions, pendingChores } = useApp()

  const transactions = getTransactions(child.id)
  const streak = useMemo(() => calculateStreak(transactions), [transactions])
  const totalStarsEarned = useMemo(() =>
    transactions.filter(tx => tx.type === 'chore' && tx.currency === 'stars').reduce((s, tx) => s + tx.amount, 0),
    [transactions]
  )
  const level = getLevel(totalStarsEarned)

  const missedYesterday = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const yStart = todayStart.getTime() - 86400000
    const yEnd   = todayStart.getTime()
    return !transactions.some(t => t.type === 'chore' && t.timestamp >= yStart && t.timestamp < yEnd)
  }, [transactions])

  const gradient = (child.colorKey && COLOR_OPTIONS.find((c) => c.key === child.colorKey)?.gradient)
    ?? CARD_GRADIENTS[index % CARD_GRADIENTS.length]
  const shadowTint   = GRADIENT_SHADOWS[index % GRADIENT_SHADOWS.length]
  const goals        = getGoals(child)
  const firstGoal    = goals[0] ?? null
  const progress     = firstGoal ? Math.min(1, getGoalProgress(child, settings, firstGoal)) : 0
  const totalValue   = getTotalValue(child)
  const birthdayDays  = daysUntilBirthday(child.birthday)
  const birthdayToday = birthdayDays === 0
  const hasActiveSavings = (child.savings || []).some((s) => s.status === 'active')
  const goalReached      = firstGoal != null && totalValue >= firstGoal.targetAmount
  const showMedal        = totalChildren >= 2 && rank <= 3
  const showBirthdayChip = child.birthday && !birthdayToday && birthdayDays <= 60
  const pendingCount     = (pendingChores || []).filter((pc) => pc.childId === child.id && pc.status === 'pending').length

  return (
    <button
      type="button"
      onClick={() => navigate('dashboard', child.id)}
      className={`bg-gradient-to-br ${gradient} w-full text-white text-right relative overflow-hidden active:scale-[0.97] transition-all duration-200`}
      style={{
        borderRadius: 28,
        padding: '18px 18px 16px',
        border: '3px solid rgba(255,255,255,0.55)',
        boxShadow: `
          inset 0 1px 2px rgba(255,255,255,0.45),
          inset 0 -3px 8px rgba(0,0,0,0.12),
          0 12px 32px ${shadowTint},
          0 4px 12px rgba(0,0,0,0.12)
        `,
      }}
    >
      {/* Avatar watermark */}
      {child.avatarImage ? (
        <img src={child.avatarImage} alt="" aria-hidden="true"
          className="absolute left-2 top-1/2 select-none pointer-events-none rounded-full object-cover"
          style={{ width: 110, height: 110, opacity: 0.1, transform: 'translateY(-50%)' }} />
      ) : (
        <span className="absolute left-0 top-1/2 select-none pointer-events-none leading-none"
          style={{ fontSize: 110, opacity: 0.07, transform: 'translateY(-50%)' }}
          aria-hidden="true">{child.avatar}</span>
      )}

      {/* Status badges */}
      {(hasActiveSavings || goalReached || birthdayToday || showMedal || missedYesterday) && (
        <div className="absolute top-3 left-3 flex gap-1">
          {showMedal        && <span className="text-xl leading-none animate-pop"    title={`מקום ${rank}`}>{MEDALS[rank - 1]}</span>}
          {birthdayToday    && <span className="text-base leading-none animate-bounce" title="יום הולדת!">🎂</span>}
          {goalReached      && <span className="text-base leading-none animate-pulse"  title="הגעת למטרה!">🎉</span>}
          {hasActiveSavings && <span className="text-base leading-none"                title="חסכון פעיל">🏦</span>}
          {missedYesterday  && <span className="text-base leading-none"                title="לא בוצעה מטלה אתמול">🚩</span>}
          {pendingCount > 0 && (
            <span className="relative">
              <span className="text-base leading-none" title="בקשות מטלה ממתינות">📝</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                {pendingCount}
              </span>
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Clay avatar circle */}
        <div className="flex-shrink-0"
          style={{
            width: 76, height: 76,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.75)',
            boxShadow: 'inset 0 3px 10px rgba(0,0,0,0.18), 0 6px 16px rgba(0,0,0,0.2)',
            background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
          {child.avatarImage
            ? <img src={child.avatarImage} alt={child.name} className="w-full h-full object-cover" />
            : <span style={{ fontSize: 38 }}>{child.avatar}</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="font-black text-xl mb-2.5 truncate"
               style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)', letterSpacing: '-0.01em' }}>
            {child.name}
          </div>

          {/* Balance chips — glass style */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[
              { icon: '💵', val: formatNumber(child.shekelBalance) },
              { icon: '⭐', val: formatNumber(child.starBalance) },
            ].map(({ icon, val }) => (
              <div key={icon}
                className="flex items-center justify-center gap-1.5"
                style={{
                  background: 'rgba(255,255,255,0.28)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1.5px solid rgba(255,255,255,0.65)',
                  borderRadius: 14,
                  padding: '7px 10px',
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.1)',
                }}>
                <span className="text-base leading-none">{icon}</span>
                <span className="font-black text-base leading-none">{val}</span>
              </div>
            ))}
          </div>

          {/* Streak + birthday + level chips */}
          <div className="flex gap-1.5 flex-wrap">
            {streak >= 2 && (
              <div className="flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-black"
                   style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.6)' }}>
                🔥 {streak} ימים
              </div>
            )}
            {showBirthdayChip && (
              <div className={`flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-semibold ${birthdayDays <= 7 ? 'animate-pulse' : ''}`}
                   style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.45)' }}>
                🎂 {birthdayDays} ימים
              </div>
            )}
            <div className="flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-bold"
                 style={{ background: 'rgba(255,255,255,0.28)', border: '1px solid rgba(255,255,255,0.5)' }}>
              {level.emoji} {level.name}
            </div>
          </div>

          {/* Goal progress */}
          {firstGoal && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-xs opacity-90 mb-1.5">
                <span className="font-bold">{Math.round(progress * 100)}%</span>
                <span className="truncate max-w-[130px] font-semibold">{firstGoal.emoji || '🎯'} {firstGoal.name}</span>
              </div>
              <div className="w-full rounded-full overflow-hidden"
                   style={{ height: 8, background: 'rgba(0,0,0,0.18)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                     style={{
                       width: `${progress * 100}%`,
                       background: 'linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
                       boxShadow: '0 0 8px rgba(255,255,255,0.6)',
                     }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Birthday today strip */}
      {birthdayToday && (
        <div className="mt-3 rounded-2xl px-3 py-2 flex items-center justify-center gap-2"
             style={{ background: 'rgba(255,255,255,0.35)', border: '1.5px solid rgba(255,255,255,0.6)' }}>
          <span className="text-lg animate-bounce">🎂</span>
          <span className="font-bold text-sm">יום הולדת שמח!</span>
          <span className="text-lg animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</span>
        </div>
      )}
    </button>
  )
}
