import { useMemo, useState, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { CARD_GRADIENTS, COLOR_OPTIONS } from '../lib/defaults.js'
import { getGoals, getGoalProgress, getTotalValue, formatNumber, daysUntilBirthday } from '../lib/utils.js'

function useLongPress(onTap, onLong, holdMs = 700) {
  const timer    = useRef(null)
  const fired    = useRef(false)
  const moved    = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const start = useCallback((e) => {
    fired.current = false; moved.current = false
    const t = e.touches?.[0]
    startPos.current = t ? { x: t.clientX, y: t.clientY } : { x: e.clientX, y: e.clientY }
    timer.current = setTimeout(() => { if (!moved.current) { fired.current = true; onLong() } }, holdMs)
  }, [onLong, holdMs])
  const move = useCallback((e) => {
    const t = e.touches?.[0]
    const x = t ? t.clientX : e.clientX
    const y = t ? t.clientY : e.clientY
    if (Math.abs(x - startPos.current.x) > 10 || Math.abs(y - startPos.current.y) > 10) {
      moved.current = true; clearTimeout(timer.current)
    }
  }, [])
  const end = useCallback(() => { clearTimeout(timer.current); if (!fired.current && !moved.current) onTap() }, [onTap])
  // onMouseMove replaces onMouseLeave — tracks real movement without firing on child-element transitions
  return { onMouseDown: start, onMouseUp: end, onMouseMove: move, onTouchStart: start, onTouchMove: move, onTouchEnd: end }
}

export default function ChildCard({ child, index }) {
  const { navigate, settings, getTransactions } = useApp()
  const [flipped, setFlipped] = useState(false)

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

  // Back-face stats
  const totalStarsEarned  = transactions.filter((tx) => tx.type === 'chore').reduce((s, tx) => s + tx.amount, 0)
  const prizesRedeemed    = transactions.filter((tx) => tx.type === 'prize_redeem').length
  const totalTransactions = transactions.length

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
  const stateRing = goalReached
    ? 'ring-2 ring-yellow-300 ring-offset-1'
    : birthdayToday ? 'ring-2 ring-pink-300 ring-offset-1 animate-pulse-ring' : ''

  const press = useLongPress(
    useCallback(() => { if (flipped) setFlipped(false); else navigate('dashboard', child.id) }, [flipped, navigate, child.id]),
    useCallback(() => setFlipped((f) => !f), [])
  )

  return (
    <div {...press} style={{ perspective: '900px' }} className="select-none cursor-pointer w-full">
      <div
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
          position: 'relative',
        }}
      >
        {/* ── Front face ── */}
        <div
          style={{ backfaceVisibility: 'hidden' }}
          className={[
            `bg-gradient-to-br ${gradient} rounded-3xl p-4 text-white text-right`,
            'card-shimmer shadow-xl w-full relative overflow-hidden',
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
              {showBirthday && (
                <div className="mt-2 inline-block bg-white/25 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {birthdayToday ? '🎂 יום הולדת!' : `🎂 עוד ${birthdayDays} ימים`}
                </div>
              )}
            </div>
          </div>
          {/* Flip hint */}
          <p className="absolute bottom-1.5 left-3 text-[9px] opacity-30 font-medium">לחץ לחץ ארוך לסטטיסטיקות</p>
        </div>

        {/* ── Back face ── */}
        <div
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0, pointerEvents: flipped ? 'auto' : 'none' }}
          className={`bg-gradient-to-bl ${gradient} rounded-3xl p-4 text-white flex flex-col items-center justify-center gap-3`}
        >
          <p className="text-sm font-bold opacity-85">📊 סטטיסטיקות כלליות</p>
          <div className="grid grid-cols-3 gap-2 w-full">
            <div className="bg-white/20 rounded-2xl p-2.5 text-center">
              <div className="text-xl font-black">{formatNumber(totalStarsEarned)}</div>
              <div className="text-[10px] opacity-75 mt-0.5">⭐ נצברו</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-2.5 text-center">
              <div className="text-xl font-black">{prizesRedeemed}</div>
              <div className="text-[10px] opacity-75 mt-0.5">🎁 פרסים</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-2.5 text-center">
              <div className="text-xl font-black">{totalTransactions}</div>
              <div className="text-[10px] opacity-75 mt-0.5">📋 פעולות</div>
            </div>
          </div>
          <p className="text-[10px] opacity-50">לחץ לחזרה</p>
        </div>
      </div>
    </div>
  )
}
