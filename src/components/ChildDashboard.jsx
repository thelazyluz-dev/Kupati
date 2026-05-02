import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { registerCoinTarget } from '../lib/animations.js'
import { useApp } from '../context/AppContext.jsx'
import { getTotalValue, getGoals, getGoalProgress, formatNumber, daysUntilBirthday, calculateStreak } from '../lib/utils.js'
import { celebrateGoal } from '../lib/confetti.js'
import { sounds } from '../lib/sounds.js'
import GoalProgressBar from './GoalProgressBar.jsx'
import TransactionList from './TransactionList.jsx'
import WeeklySummary from './WeeklySummary.jsx'
import Button from './ui/Button.jsx'
import HintBanner from './ui/HintBanner.jsx'
import { CARD_GRADIENTS, COLOR_OPTIONS, DEFAULT_PRIZES } from '../lib/defaults.js'

// Long-press hook: fires onLong after holdMs, onTap on quick release.
// Cancels entirely if finger moves >8px (i.e. the user is scrolling).
function useLongPress(onTap, onLong, holdMs = 1500) {
  const timer    = useRef(null)
  const fired    = useRef(false)
  const moved    = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  const start = useCallback((e) => {
    fired.current = false
    moved.current = false
    const t = e.touches?.[0]
    if (t) startPos.current = { x: t.clientX, y: t.clientY }
    timer.current = setTimeout(() => {
      if (!moved.current) { fired.current = true; onLong() }
    }, holdMs)
  }, [onLong, holdMs])

  const move = useCallback((e) => {
    const t = e.touches?.[0]
    if (!t) return
    const dx = Math.abs(t.clientX - startPos.current.x)
    const dy = Math.abs(t.clientY - startPos.current.y)
    if (dx > 8 || dy > 8) { moved.current = true; clearTimeout(timer.current) }
  }, [])

  const cancel = useCallback(() => {
    moved.current = true
    clearTimeout(timer.current)
  }, [])

  const end = useCallback(() => {
    clearTimeout(timer.current)
    if (!fired.current && !moved.current) onTap()
  }, [onTap])

  return {
    onMouseDown: start, onMouseUp: end, onMouseLeave: cancel,
    onTouchStart: start, onTouchMove: move, onTouchEnd: end,
  }
}

// Deterministic star/coin scatter — each icon drifts gently wall-to-wall
function IconCloud({ icons }) {
  if (!icons.length) return null
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {icons.map((emoji, i) => {
        const angle = (i * 137.508) % 360
        const r     = 12 + (i % 5) * 9
        const x     = 50 + r * Math.cos(angle * Math.PI / 180)
        const y     = 50 + r * Math.sin(angle * Math.PI / 180)
        // Individual drift amounts so icons don't move in sync
        const dx  = 5 + (i % 6) * 2.5   // 5–17.5 px horizontal
        const dy  = 3 + (i % 4) * 1.5   // 3–7.5 px vertical
        const dur = 4 + (i % 5) * 0.9   // 4–7.6 s per cycle
        const del = -((i * 1.4) % dur)   // start mid-cycle so no pop-in
        return (
          <span
            key={i}
            className="absolute leading-none select-none"
            style={{
              left: `${Math.max(8, Math.min(90, x))}%`,
              top:  `${Math.max(8, Math.min(90, y))}%`,
              fontSize: 9,
              opacity: 0.4,
              animationName:            'icon-drift',
              animationDuration:        `${dur}s`,
              animationDelay:           `${del}s`,
              animationTimingFunction:  'ease-in-out',
              animationIterationCount:  'infinite',
              animationDirection:       'alternate',
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
            }}
          >{emoji}</span>
        )
      })}
    </div>
  )
}

function StatTile({ icon, label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <div className="text-lg mb-0.5">{icon}</div>
      <div className={`text-base font-black ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 leading-tight mt-0.5">{label}</div>
    </div>
  )
}

function MonthlySummary({ transactions }) {
  const now = Date.now()
  const monthAgo = now - 30 * 86400000
  const monthTx = transactions.filter((tx) => tx.timestamp >= monthAgo)
  if (monthTx.length === 0) return null

  const starsEarned = monthTx
    .filter((tx) => tx.currency === 'stars' && tx.type === 'chore')
    .reduce((s, tx) => s + tx.amount, 0)
  const prizesRedeemed = monthTx
    .filter((tx) => tx.type === 'prize_redeem')
    .reduce((s, tx) => s + tx.amount, 0)
  const shekelIn = monthTx
    .filter((tx) => tx.currency === 'shekels' && ['gift', 'other', 'convert_in', 'savings_close'].includes(tx.type))
    .reduce((s, tx) => s + tx.amount, 0)
  const shekelOut = monthTx
    .filter((tx) => tx.type === 'expense')
    .reduce((s, tx) => s + tx.amount, 0)
  const tiles = [
    starsEarned > 0  && { icon: '⭐', label: 'כוכבים נצברו',  value: `+${formatNumber(starsEarned)}`,     color: 'text-amber-700',   bg: 'bg-amber-100'   },
    prizesRedeemed > 0 && { icon: '🎁', label: 'פרסים מומשו',   value: `-${formatNumber(prizesRedeemed)}⭐`, color: 'text-purple-700',  bg: 'bg-purple-100'  },
    shekelIn > 0     && { icon: '💵', label: 'כסף נכנס',       value: `+${formatNumber(shekelIn)}₪`,       color: 'text-emerald-700', bg: 'bg-emerald-100' },
    shekelOut > 0    && { icon: '🛍️', label: 'קניות',           value: `-${formatNumber(shekelOut)}₪`,      color: 'text-rose-700',    bg: 'bg-rose-100'    },
  ].filter(Boolean)

  if (tiles.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4">
      <h3 className="font-black text-gray-800 text-sm mb-3">📅 30 הימים האחרונים</h3>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => <StatTile key={t.label} {...t} />)}
      </div>
    </div>
  )
}

function StarIconCloud({ count }) {
  const n = Math.min(Math.round(count), 50)
  const icons = Array.from({ length: n }, () => '⭐')
  return <IconCloud icons={icons} />
}

function ShekelIconCloud({ balance }) {
  if (balance <= 0) return <IconCloud icons={[]} />
  const totalIcons = Math.max(5, Math.min(30, Math.round(5 + 25 * Math.sqrt(balance / 1000))))
  const billFrac   = Math.min(balance / 500, 1)
  const bills      = Math.round(totalIcons * billFrac * 0.6)
  const coins      = totalIcons - bills
  const icons      = [...Array(bills).fill('💵'), ...Array(coins).fill('🪙')]
  return <IconCloud icons={icons} />
}

export default function ChildDashboard({ childId }) {
  const { children, navigate, showModal, settings, getTransactions,
          adjustShekels, adjustStars, deleteGoal, addTransaction, finishSavings,
          addMoney, updateChild,
          pendingBadge, clearPendingBadge,
          pendingFreeSpin, clearPendingFreeSpin } = useApp()
  const transactions = getTransactions(childId)
  const [hint, setHint] = useState(null)
  const [flyingStar, setFlyingStar] = useState(false)

  const backBtnRef = useRef(null)

  const child = children.find((c) => c.id === childId)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [childId])

  useEffect(() => {
    if (!child) navigate('home')
  }, [child, navigate])

  useEffect(() => {
    if (!child?.birthday) return
    const days = daysUntilBirthday(child.birthday)
    if (days === 0) { celebrateGoal(); sounds.birthday() }
  }, [child?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-mature savings when their maturity date has passed
  useEffect(() => {
    if (!child) return
    const now = Date.now()
    const matured = (child.savings || []).filter((s) => s.status === 'active' && s.maturityDate <= now)
    matured.forEach((s) => finishSavings(childId, s.id, 'matured'))
    if (matured.length > 0) setHint(`🎉 ${matured.length > 1 ? 'חסכונות הבשילו' : 'חסכון הבשיל'}!`)
  }, [childId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-pay allowance if it's due for this period
  useEffect(() => {
    if (!child?.allowance?.enabled || !child.allowance.amount) return
    const { amount, period, lastPaid } = child.allowance
    const now = new Date()
    const periodStart = period === 'monthly'
      ? new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      : (() => { const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d.getTime() })()
    if (!lastPaid || lastPaid < periodStart) {
      addMoney(childId, amount)
      addTransaction(childId, {
        type: 'allowance',
        amount,
        currency: 'shekels',
        description: `💰 קצבה ${period === 'monthly' ? 'חודשית' : 'שבועית'} — ${formatNumber(amount)}₪`,
      })
      updateChild(childId, { allowance: { ...child.allowance, lastPaid: Date.now() } })
      setHint(`💰 קצבה ${period === 'monthly' ? 'חודשית' : 'שבועית'} שולמה!`)
    }
  }, [childId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Show penalty hint once per day per child (sessionStorage survives navigation, resets on tab close)
  useEffect(() => {
    if (!child) return
    const todayStr = new Date().toISOString().slice(0, 10)
    const ssKey = `penaltyHint_${childId}_${todayStr}`
    if (sessionStorage.getItem(ssKey)) return
    const todayPenalties = transactions.filter(
      t => t.type === 'penalty' && t.description?.includes('קנס יומי') &&
           new Date(t.timestamp).toISOString().slice(0, 10) === todayStr
    )
    if (todayPenalties.length > 0) {
      sessionStorage.setItem(ssKey, '1')
      const total = todayPenalties.reduce((s, t) => s + t.amount, 0)
      setHint(`⚡ הופחתו ${total} כוכבים על מטלות שלא בוצעו`)
    }
  }, [childId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Long-press on ⭐ button: regular tap = chores only, long = parent mode (free entry)
  const triggerStarFly = useCallback(() => {
    setFlyingStar(true)
    setTimeout(() => setFlyingStar(false), 750)
  }, [])

  const starsLongPress = useLongPress(
    useCallback(() => { triggerStarFly(); showModal('addStars', { childId, allowFreeEntry: false }) }, [childId, showModal, triggerStarFly]),
    useCallback(() => showModal('addStars', { childId, allowFreeEntry: true }),  [childId, showModal]),
  )

  if (!child) return null

  function handleRedeem(goal) {
    adjustShekels(childId, -goal.targetAmount)
    addTransaction(childId, {
      type: 'expense',
      amount: goal.targetAmount,
      currency: 'shekels',
      description: `✅ מומש: ${goal.emoji ?? ''} ${goal.name}`,
    })
    deleteGoal(childId, goal.id)
    celebrateGoal()
    sounds.goal()
  }

  const childIndex = children.indexOf(child)
  const gradient   = (child.colorKey && COLOR_OPTIONS.find((c) => c.key === child.colorKey)?.gradient)
    ?? CARD_GRADIENTS[childIndex % CARD_GRADIENTS.length]

  const BG_TINTS = { purple:'#f5f3ff', pink:'#fdf2f8', amber:'#fffbeb', emerald:'#ecfdf5', sky:'#f0f9ff', red:'#fff1f2', lime:'#f7fee7', cyan:'#ecfeff', fuchsia:'#fdf4ff', yellow:'#fefce8' }
  const bgTint = (child.colorKey && BG_TINTS[child.colorKey]) || '#f1f5f9'

  const prizes = settings.prizes?.length ? settings.prizes : DEFAULT_PRIZES
  const cheapestStarCost = Math.min(...prizes.map((p) => p.starCost))
  const prizeArcPct = Math.min(1, child.starBalance / cheapestStarCost)
  const ARC_C = 94.25
  const totalValue = getTotalValue(child)
  const goals      = getGoals(child)

  // Sum of current compound value of active savings (principal × 1.10^completedMonths)
  const activeSavingsTotal = (() => {
    const actives = (child.savings || []).filter((s) => s.status === 'active')
    if (!actives.length) return 0
    const now = new Date()
    return actives.reduce((sum, s) => {
      const sd = new Date(s.startDate)
      let m = (now.getFullYear() - sd.getFullYear()) * 12 + (now.getMonth() - sd.getMonth())
      if (now.getDate() < sd.getDate()) m--
      return sum + s.amount * Math.pow(1.10, Math.max(0, m))
    }, 0)
  })()
  const streak     = calculateStreak(transactions)
  const totalStarsEarned = transactions
    .filter((tx) => tx.type === 'chore' && tx.currency === 'stars')
    .reduce((s, tx) => s + tx.amount, 0)

  const outstandingLoans = (child.loans || []).filter((l) => !l.repaid)
  const outstandingTotal = outstandingLoans.reduce((s, l) => s + l.amount, 0)

  const birthdayDays = daysUntilBirthday(child.birthday)
  const showBirthday = birthdayDays !== null

  const firstGoal = goals[0] ?? null

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgTint }}>
      {/* Flying star trail */}
      {flyingStar && (
        <div
          className="fixed pointer-events-none z-50 text-3xl animate-star-fly"
          style={{ bottom: '42%', left: '50%', transform: 'translateX(-50%)' }}
        >⭐</div>
      )}
      {/* Header */}
      <header className={`bg-gradient-to-br ${gradient} px-5 pt-8 pb-6 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            <button
              onClick={() => showModal('editChild', child)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-lg transition-colors active:scale-90"
              aria-label="ערוך"
            >
              ✏️
            </button>
            <button
              onClick={() => {
                const text = [
                  `🐷 ${child.name}`,
                  `⭐ כוכבים: ${formatNumber(child.starBalance)}`,
                  `💵 שקלים: ${formatNumber(child.shekelBalance)}`,
                  streak >= 2 ? `🔥 ${streak} ימים ברצף!` : null,
                ].filter(Boolean).join('\n')
                if (navigator.share) {
                  navigator.share({ title: 'הארנק שלי', text }).catch(() => {})
                } else {
                  navigator.clipboard?.writeText(text).catch(() => {})
                  setHint('📋 הועתק ללוח!')
                }
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-lg transition-colors active:scale-90"
              aria-label="שתף"
            >
              📤
            </button>
          </div>

          <div className="text-center">
            {child.avatarImage ? (
              <img
                src={child.avatarImage}
                alt={child.name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white/50 mx-auto mb-1 shadow-lg"
              />
            ) : (
              <div className="text-6xl mb-1">{child.avatar}</div>
            )}
            <h1 className="text-2xl font-bold">{child.name}</h1>
            {showBirthday && (
              <div className="inline-block mt-1 bg-white/25 rounded-full px-3 py-0.5 text-sm font-semibold animate-pop">
                {birthdayDays === 0 ? '🎂 יום הולדת שמח! 🎉' : `🎂 עוד ${birthdayDays} ימים!`}
              </div>
            )}
            {/* Streak chip only */}
            {streak >= 2 && (
              <div className="flex items-center justify-center mt-1.5">
                <div className="bg-white/25 rounded-full px-3 py-0.5 text-sm font-bold">
                  🔥 {streak} ימים ברצף!
                </div>
              </div>
            )}
          </div>

          <button
            ref={(el) => { backBtnRef.current = el; registerCoinTarget(childId, el) }}
            onClick={() => navigate('home')}
            className="flex items-center gap-1 pl-3 pr-2 py-2 rounded-2xl bg-white/25 hover:bg-white/40 active:scale-95 transition-all text-sm font-bold shadow-sm"
            aria-label="חזרה לבית"
          >
            <span>חזרה</span>
            <span className="text-base leading-none">›</span>
          </button>
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Shekels card */}
          <div className="relative overflow-hidden bg-white/15 backdrop-blur-md rounded-2xl p-4 text-center ring-1 ring-white/30 shadow-lg animate-slide-up" style={{ animationDelay: '60ms', animationFillMode: 'both' }}>
            <ShekelIconCloud balance={child.shekelBalance} />
            <div key={child.shekelBalance} className="relative text-4xl font-bold animate-wiggle" dir="ltr">
              {formatNumber(child.shekelBalance)}₪
            </div>
            <div className="relative text-sm opacity-90 mt-1">
              {activeSavingsTotal > 0 ? '💵 זמין' : '💵 שקלים'}
            </div>
            {(child.shekelBalancePeak || 0) > 0 && (
              <div className="relative text-xs opacity-60 mt-0.5">
                {child.shekelBalance >= (child.shekelBalancePeak || 0)
                  ? '🌟 שיא חדש!'
                  : `🏆 שיא: ${formatNumber(child.shekelBalancePeak)}₪`}
              </div>
            )}
            {firstGoal && totalValue < firstGoal.targetAmount && (
              <div className="relative text-xs opacity-70 mt-1 bg-white/20 rounded-full px-2 py-0.5 inline-block">
                עוד {formatNumber(firstGoal.targetAmount - totalValue)}₪
              </div>
            )}
            {activeSavingsTotal > 0 && (
              <div className="relative mt-2 pt-1.5 border-t border-white/25 flex items-center justify-center gap-1.5 text-white/85">
                <span className="text-sm">🏦</span>
                <span className="text-xs font-bold">{formatNumber(activeSavingsTotal)}₪</span>
                <span className="text-[10px] opacity-70">בחסכון</span>
              </div>
            )}
          </div>
          {/* Stars card */}
          <div className="relative overflow-hidden bg-white/15 backdrop-blur-md rounded-2xl p-4 text-center ring-1 ring-white/30 shadow-lg animate-slide-up" style={{ animationDelay: '130ms', animationFillMode: 'both' }}>
            <StarIconCloud count={child.starBalance} />
            <div key={child.starBalance} className="relative text-4xl font-bold animate-wiggle" dir="ltr">
              {formatNumber(child.starBalance)}
            </div>
            <div className="relative text-sm opacity-90 mt-1">⭐ כוכבים</div>
            {(child.starBalancePeak || 0) > 0 && (
              <div className="relative text-xs opacity-60 mt-0.5">
                {child.starBalance >= (child.starBalancePeak || 0)
                  ? '🌟 שיא חדש!'
                  : `🏆 שיא: ${formatNumber(child.starBalancePeak)}⭐`}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 space-y-4">
        {/* Goals */}
        {goals.length > 0 && (
          <div className="space-y-2">
            {goals.map((goal) => (
              <GoalProgressBar
                key={goal.id}
                progress={getGoalProgress(child, settings, goal)}
                goalName={goal.name}
                targetAmount={goal.targetAmount}
                goalEmoji={goal.emoji}
                goalImage={goal.goalImage}
                totalValue={totalValue}
                onRedeem={() => handleRedeem(goal)}
              />
            ))}
          </div>
        )}

        {/* Parent note card */}
        {child.parentNote ? (
          <div className="bg-pink-50/70 backdrop-blur-sm border border-pink-100 rounded-2xl p-4 flex items-start gap-3 animate-slide-up shadow-sm">
            <span className="text-2xl flex-shrink-0">💌</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-0.5">הודעה מהורה</p>
              <p className="text-sm text-gray-700 leading-snug">{child.parentNote}</p>
            </div>
            <button
              onClick={() => showModal('parentNote', { childId, child })}
              className="text-pink-300 hover:text-pink-500 active:scale-90 transition-all flex-shrink-0 text-base leading-none mt-0.5"
              aria-label="ערוך הודעה"
            >
              ✏️
            </button>
          </div>
        ) : (
          <button
            onClick={() => showModal('parentNote', { childId, child })}
            className="w-full bg-pink-50/60 backdrop-blur-sm border border-dashed border-pink-200 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-pink-400 hover:bg-pink-100/70 active:scale-95 transition-all"
          >
            <span className="text-base">💌</span>
            <span className="text-xs font-semibold">השאר הודעה לילד</span>
          </button>
        )}

        {/* Outstanding loans card */}
        {outstandingTotal > 0 && (
          <div className="bg-cyan-50/70 backdrop-blur-sm border border-cyan-200/60 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm">
            <div>
              <p className="text-xs font-bold text-cyan-600 mb-0.5">💳 יתרת הלוואות</p>
              <p className="text-2xl font-black text-cyan-700">{formatNumber(outstandingTotal)}₪</p>
            </div>
            <button
              onClick={() => showModal('loan', { childId, child })}
              className="bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-all shadow-sm"
            >
              פרטים
            </button>
          </div>
        )}

        {/* Onboarding tips — shown only when child has no transactions yet */}
        {transactions.length === 0 && (
          <div className="bg-indigo-50/70 backdrop-blur-sm border border-indigo-100/60 rounded-2xl p-4 space-y-2.5 shadow-sm">
            <p className="text-xs font-bold text-indigo-600 mb-1">💡 איך מתחילים?</p>
            {[
              { icon: '⭐', text: 'לחץ "עשיתי מטלה!" אחרי כל מטלה שהילד השלים' },
              { icon: '💝', text: 'לחץ "קיבלתי כסף" להפקדת כסף מתנה מסבא/סבתא' },
              { icon: '🎁', text: 'כשצוברים כוכבים — אפשר לממש פרסים מהמחירון' },
              { icon: '⚙️', text: 'בהגדרות תוסיף מטלות ופרסים משלך' },
            ].map(({ icon, text }) => (
              <div key={icon} className="flex items-start gap-2">
                <span className="text-sm flex-shrink-0 mt-0.5">{icon}</span>
                <p className="text-xs text-gray-600 leading-snug">{text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons — first-person labels, long-press on ⭐ for parent mode */}
        <div className="grid grid-cols-2 gap-3">
          <button
            {...starsLongPress}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 active:scale-90 transition-all text-white shadow-md font-bold select-none animate-glow-amber"
          >
            <span className="text-2xl">⭐</span>
            <span className="text-sm">עשיתי מטלה!</span>
          </button>

          <button
            onClick={() => {
              if (child.starBalance === 0) setHint('⭐ אין לך כוכבים עדיין — עשה מטלה!')
              else showModal('redeemPrize', { childId, child })
            }}
            className={`h-20 flex flex-col items-center justify-center gap-1 rounded-2xl active:scale-90 transition-all text-white shadow-md font-bold ${child.starBalance === 0 ? 'opacity-50 bg-gradient-to-br from-purple-300 to-violet-400' : 'bg-gradient-to-br from-purple-500 to-violet-600'}`}
          >
            <span className="text-2xl">🎁</span>
            <span className="text-sm">מימוש פרס</span>
          </button>

          <button
            onClick={() => showModal('addMoney', { childId })}
            className="h-20 flex flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 active:scale-90 transition-all text-white shadow-md font-bold"
          >
            <span className="text-2xl">💝</span>
            <span className="text-sm">הפקדה</span>
          </button>

          <button
            onClick={() => {
              if (child.shekelBalance === 0) setHint('💵 אין לך שקלים עדיין — בקש מהורה להפקיד!')
              else showModal('expense', { childId })
            }}
            className={`h-20 flex flex-col items-center justify-center gap-1 rounded-2xl active:scale-90 transition-all text-white shadow-md font-bold ${child.shekelBalance === 0 ? 'opacity-50 bg-gradient-to-br from-rose-300 to-pink-400' : 'bg-gradient-to-br from-rose-400 to-pink-500'}`}
          >
            <span className="text-2xl">🛍️</span>
            <span className="text-sm">קניתי משהו</span>
          </button>
        </div>

        {/* Learning — full-width prominent */}
        <button
          onClick={() => showModal('learning', { childId })}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
        >
          <span className="text-xl">📚</span>
          <span>למד וצבור כוכבים!</span>
        </button>

        {/* Secondary actions — horizontal scrollable chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => showModal('goal', { childId })}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-bold text-gray-700 flex-shrink-0 active:scale-95 transition-all whitespace-nowrap shadow-sm"
          >
            🎯 {goals.length > 0 ? `מטרות (${goals.length})` : 'מטרה'}
          </button>
          <button
            onClick={() => showModal('savings', { childId, child })}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-bold text-gray-700 flex-shrink-0 active:scale-95 transition-all whitespace-nowrap shadow-sm"
          >
            🏦 חסכון
          </button>
          {children.length > 1 && (
            <button
              onClick={() => showModal('transferStars', { childId, child })}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-sm font-bold text-indigo-700 flex-shrink-0 active:scale-95 transition-all whitespace-nowrap shadow-sm"
            >
              🔄 העברה
            </button>
          )}
          <button
            onClick={() => showModal('loan', { childId, child })}
            className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white border-2 text-sm font-bold flex-shrink-0 active:scale-95 transition-all whitespace-nowrap shadow-sm ${outstandingTotal > 0 ? 'border-cyan-400 text-cyan-700' : 'border-gray-200 text-gray-700'}`}
          >
            💳 הלוואה{outstandingTotal > 0 ? ` (${formatNumber(outstandingTotal)}₪)` : ''}
          </button>
          <button
            onClick={() => showModal('memories', { childId })}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-bold text-gray-700 flex-shrink-0 active:scale-95 transition-all whitespace-nowrap shadow-sm"
          >
            📖 זכרונות{child.memories?.length > 0 ? ` (${child.memories.length})` : ''}
          </button>
        </div>

        <WeeklySummary transactions={transactions} />

        <MonthlySummary transactions={transactions} />

        <div>
          <h2 className="text-lg font-black text-gray-800 mb-3">📜 היסטוריה</h2>
          <div className="relative">
            <div className="max-h-[460px] overflow-y-auto rounded-2xl">
              <TransactionList transactions={transactions} childId={childId} />
            </div>
            <div
              className="pointer-events-none absolute bottom-0 inset-x-0 h-14 rounded-b-2xl"
              style={{ background: `linear-gradient(to top, ${bgTint}, transparent)` }}
            />
          </div>
        </div>
      </main>

      {/* Hint toast for greyed-out buttons */}
      <HintBanner message={hint} onDone={() => setHint(null)} />

      {/* Badge earned toast */}
      {pendingBadge && pendingBadge.childId === childId && (
        <HintBanner
          message={`${pendingBadge.emoji} קיבלת תג חדש: ${pendingBadge.label}`}
          onDone={clearPendingBadge}
        />
      )}

      {/* Free spin earned toast */}
      {pendingFreeSpin && pendingFreeSpin.childId === childId && (
        <HintBanner
          message="🎁 כל הכבוד! 5 מטלות היום — מגיע לך סיבוב חינמי בגלגל המזל!"
          onDone={clearPendingFreeSpin}
        />
      )}
    </div>
  )
}
