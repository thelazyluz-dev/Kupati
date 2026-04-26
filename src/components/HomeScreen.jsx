import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { registerCoinTarget } from '../lib/animations.js'
import { sounds } from '../lib/sounds.js'

function getTimeGradient() {
  const h = new Date().getHours()
  if (h < 6)  return 'from-slate-700 to-indigo-800'
  if (h < 11) return 'from-sky-400 to-indigo-500'
  if (h < 17) return 'from-indigo-500 to-purple-600'
  if (h < 21) return 'from-orange-400 to-pink-500'
  return 'from-slate-600 to-purple-900'
}
import ChildCard from './ChildCard.jsx'
import Button from './ui/Button.jsx'
import { formatNumber } from '../lib/utils.js'

// SVG crack paths drawn over the pig at each click level (viewBox 44x44)
const CRACK_PATHS = [
  'M20,3 L15,17 L9,24',
  'M20,3 L15,17 L9,24  M27,4 L33,16 L38,27',
  'M20,3 L15,17 L9,24  M27,4 L33,16 L38,27  M22,22 L6,38',
  'M20,3 L15,17 L9,24  M27,4 L33,16 L38,27  M22,22 L6,38  M22,22 L38,38  M13,3 L7,13',
]

// Pre-computed coin burst positions (24 coins, evenly spread + size variance)
const BURST_COINS = Array.from({ length: 26 }, (_, i) => {
  const angle = (i / 26) * Math.PI * 2
  const dist  = 120 + (i % 5) * 35
  return {
    cx:    `${Math.round(Math.cos(angle) * dist)}px`,
    cy:    `${Math.round(Math.sin(angle) * dist)}px`,
    cr:    `${i % 2 === 0 ? 540 : -540}deg`,
    emoji: i % 4 === 0 ? '💰' : '🪙',
    size:  16 + (i % 4) * 5,
    delay: `${(i % 7) * 45}ms`,
  }
})

function PigCracks({ level }) {
  if (level < 1) return null
  const path = CRACK_PATHS[Math.min(level - 1, 3)]
  const opacity = 0.55 + level * 0.1
  return (
    <svg
      viewBox="0 0 44 44"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 2 }}
    >
      {path.split('  ').map((d, i) => (
        <path key={i} d={d} stroke="white" strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={opacity} />
      ))}
      {level >= 3 && (
        <circle cx="22" cy="22" r="18" stroke="rgba(255,100,100,0.25)" strokeWidth="3" fill="none" />
      )}
    </svg>
  )
}

function CoinBurst() {
  return (
    <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
      {/* White flash */}
      <div
        className="absolute inset-0 bg-white"
        style={{ animation: 'pig-flash 0.7s ease-out forwards' }}
      />
      {/* Coins */}
      {BURST_COINS.map((c, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: '50%', top: '40%',
            fontSize: c.size,
            lineHeight: 1,
            '--cx': c.cx,
            '--cy': c.cy,
            '--cr': c.cr,
            animation: `coin-explode 1.1s cubic-bezier(0.15, 0.8, 0.3, 1) ${c.delay} forwards`,
          }}
        >{c.emoji}</span>
      ))}
    </div>
  )
}

// Particles spread around the dead-space of the header (avoiding center pig & corner buttons)
const PARTICLES = [
  { e: '⭐', l: '7%',  t: '44%', s: 16, d: 0,    dur: 3.5 },
  { e: '🪙', l: '13%', t: '20%', s: 14, d: 1.4,  dur: 4.1 },
  { e: '⭐', l: '19%', t: '72%', s: 12, d: 2.8,  dur: 3.8 },
  { e: '🪙', l: '4%',  t: '76%', s: 13, d: 0.6,  dur: 4.4 },
  { e: '⭐', l: '84%', t: '38%', s: 15, d: 0.3,  dur: 3.6 },
  { e: '🪙', l: '91%', t: '62%', s: 13, d: 2.0,  dur: 4.0 },
  { e: '⭐', l: '78%', t: '76%', s: 11, d: 3.2,  dur: 3.9 },
  { e: '🪙', l: '93%', t: '16%', s: 14, d: 1.8,  dur: 4.2 },
  { e: '⭐', l: '30%', t: '7%',  s: 11, d: 1.6,  dur: 3.3 },
  { e: '🪙', l: '66%', t: '5%',  s: 11, d: 2.5,  dur: 4.6 },
  { e: '⭐', l: '3%',  t: '30%', s: 10, d: 3.8,  dur: 4.8 },
  { e: '🪙', l: '96%', t: '38%', s: 10, d: 0.9,  dur: 3.7 },
]

const ONBOARDING_FEATURES = [
  { e: '⭐', t: 'מטלות וכוכבים' },
  { e: '🎁', t: 'מימוש פרסים' },
  { e: '🏦', t: 'חסכון עם ריבית' },
  { e: '🔄', t: 'סנכרון משפחתי' },
]

export default function HomeScreen() {
  const { children, navigate, showModal, getTransactions, coinInFlight } = useApp()

  const [pigClicks,  setPigClicks]  = useState(0)
  const [pigBursting, setPigBursting] = useState(false)

  function handlePigClick() {
    if (pigBursting) return
    const next = pigClicks + 1
    if (next >= 5) {
      setPigClicks(5)
      setPigBursting(true)
      sounds.pigExplode()
      setTimeout(() => { setPigClicks(0); setPigBursting(false) }, 3200)
    } else {
      setPigClicks(next)
      sounds.pigCrack(next)
    }
  }

  const todayStart = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() })()
  const weekStart  = (() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d.getTime() })()

  // pre-compute today's chore count + this week's star earnings per child
  const todayChores = Object.fromEntries(
    children.map((c) => [
      c.id,
      getTransactions(c.id).filter((t) => t.type === 'chore' && t.timestamp >= todayStart).length,
    ])
  )
  const weekStarsPerChild = Object.fromEntries(
    children.map((c) => [
      c.id,
      getTransactions(c.id)
        .filter((t) => t.type === 'chore' && t.currency === 'stars' && t.timestamp >= weekStart)
        .reduce((s, t) => s + t.amount, 0),
    ])
  )

  // Sort by this week's stars (desc) when there are 2+ children for leaderboard
  const sortedChildren = children.length >= 2
    ? [...children].sort((a, b) => (weekStarsPerChild[b.id] || 0) - (weekStarsPerChild[a.id] || 0))
    : children

  return (
    <div className="min-h-screen flex flex-col">
      {pigBursting && <CoinBurst />}
      {/* Header */}
      <header className={`relative overflow-hidden bg-gradient-to-br ${getTimeGradient()} px-5 pt-3 pb-5 text-white rounded-b-[2rem] shadow-lg`}>
        {/* Floating stars & coins */}
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute pointer-events-none select-none"
            style={{
              left: p.l, top: p.t,
              fontSize: p.s,
              animationName: 'particle-float',
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.d}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              opacity: 0.72,
            }}
          >{p.e}</span>
        ))}
        {/* Top row — action buttons */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate('settings')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 transition-all text-xl"
            aria-label="הגדרות"
          >
            ⚙️
          </button>
          <button
            onClick={() => showModal('addChild')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 transition-all text-2xl font-bold leading-none"
            aria-label="הוסף ילד"
          >
            +
          </button>
        </div>

        {/* Hero — pig + title */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-1.5">
            <div className="absolute w-14 h-14 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '3s' }} />
            <div
              className="relative w-11 h-11 rounded-full bg-white/20 ring-2 ring-white/35 flex items-center justify-center shadow-inner cursor-pointer select-none overflow-hidden active:scale-90 transition-transform"
              onClick={handlePigClick}
              title="לחץ עלי 🐷"
            >
              <span
                className={`text-2xl relative z-10 ${!pigBursting && pigClicks === 0 ? 'animate-float' : ''}`}
                style={pigClicks >= 3 && !pigBursting ? { animation: 'pig-shake 0.35s ease-in-out' } : {}}
              >
                {pigBursting ? '💥' : '🐷'}
              </span>
              <PigCracks level={pigBursting ? 0 : pigClicks} />
            </div>
          </div>
          <h1 className="text-lg font-bold tracking-tight">הארנק שלי</h1>
          <p className="text-xs text-white/65 mt-0.5">כסף חכם לילדים 💡</p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 dot-grid -mt-4">
        {children.length === 0 ? (
          /* ── Onboarding ─────────────────────────────────────────── */
          <div className="flex flex-col items-center gap-5 text-center animate-fade-in pt-4">
            <div className="text-8xl animate-float">🐷</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">ברוכים הבאים!</h2>
              <p className="text-gray-500 leading-relaxed text-sm">
                הארנק החכם לילדים —<br />מטלות, כוכבים, חסכון ופרסים
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {ONBOARDING_FEATURES.map(({ e, t }) => (
                <div key={t} className="bg-white rounded-2xl p-3 flex items-center gap-2.5 shadow-sm text-right">
                  <span className="text-2xl flex-shrink-0">{e}</span>
                  <span className="text-sm font-semibold text-gray-700">{t}</span>
                </div>
              ))}
            </div>

            <Button size="lg" fullWidth onClick={() => showModal('addChild')}>
              🚀 בואו נתחיל — הוסף ילד ראשון
            </Button>
          </div>
        ) : (
          /* ── Children list ──────────────────────────────────────── */
          <>
            <div className="flex items-center gap-2 mb-3 animate-fade-in">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              <span className="text-xs text-gray-400 font-semibold px-1">
                {children.length === 1 ? 'ילד אחד' : `${children.length} ילדים`}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            </div>
            <div className="flex flex-col gap-2">
              {sortedChildren.map((child, i) => (
                <div
                  key={child.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                >
                  {/* Divider between children */}
                  {i > 0 && (
                    <div className="flex items-center gap-3 my-3 px-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                      <span className="text-sm opacity-40">🐷</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                    </div>
                  )}

                  {/* Child card */}
                  <ChildCard child={child} index={i} rank={i + 1} totalChildren={children.length} />

                  {/* Quick action strip — framed tray */}
                  <div className="mt-2 bg-gray-100 rounded-2xl p-1.5 ring-1 ring-gray-200 shadow-inner space-y-1.5">
                    {/* Row 1 — chore button */}
                    <button
                      onClick={() => showModal('addStars', { childId: child.id, allowFreeEntry: false })}
                      className="w-full bg-gradient-to-b from-amber-400 to-amber-500 rounded-xl shadow-sm px-3 py-2.5 flex flex-col items-center gap-0.5 text-white active:scale-95 active:brightness-90 transition-all"
                    >
                      <span className="text-lg leading-none">⭐</span>
                      <span className="text-xs font-bold leading-tight">מטלה מהירה</span>
                    </button>
                    {/* Row 2 — spin wheel */}
                    {(() => {
                      const freeSpins = child.freeSpins || 0
                      // While coin is mid-flight, show the pre-chore count so the dot
                      // doesn't fill before the coin visually arrives
                      const rawCount  = todayChores[child.id] || 0
                      const dispCount = coinInFlight === child.id ? Math.max(0, rawCount - 1) : rawCount
                      const filled    = freeSpins > 0 ? 5 : dispCount % 5
                      return (
                        <button
                          ref={(el) => registerCoinTarget(child.id, el)}
                          onClick={() => showModal('spinWheel', { childId: child.id, childName: child.name })}
                          className={`w-full rounded-xl shadow-sm px-3 py-2.5 flex flex-col items-center gap-0.5 active:scale-95 active:brightness-90 transition-all text-white ${
                            freeSpins > 0
                              ? 'bg-gradient-to-b from-yellow-400 to-orange-500'
                              : 'bg-gradient-to-b from-violet-500 to-purple-600'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg leading-none">🎰</span>
                            {freeSpins > 0 && (
                              <span className="bg-white/30 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                {freeSpins}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold leading-tight">גלגל המזל</span>
                          {/* 🪙 progress toward next free spin */}
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }, (_, j) => (
                              <span
                                key={j}
                                className="text-sm leading-none transition-all"
                                style={{ opacity: j < filled ? 1 : 0.3 }}
                              >
                                🪙
                              </span>
                            ))}
                          </div>
                        </button>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
