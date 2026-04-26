import { useState, useRef } from 'react'
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

// ── Pig Easter Egg — constants ────────────────────────────────────────────────

const CRACK_PATHS = [
  'M20,3 L15,17 L9,24',
  'M20,3 L15,17 L9,24  M27,4 L33,16 L38,27',
  'M20,3 L15,17 L9,24  M27,4 L33,16 L38,27  M22,22 L6,38',
  'M20,3 L15,17 L9,24  M27,4 L33,16 L38,27  M22,22 L6,38  M22,22 L38,38  M13,3 L7,13',
]

const PIG_SPEECHES = [
  'הי... מה קורה? 🤔',
  'תפסיק! 😤',
  'אני מזהיר אותך... 😠',
  'זה הסוף שלי 😱',
]

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

const BURST_COINS_MEGA = Array.from({ length: 52 }, (_, i) => {
  const angle = (i / 52) * Math.PI * 2
  const dist  = 100 + (i % 7) * 32
  return {
    cx:    `${Math.round(Math.cos(angle) * dist)}px`,
    cy:    `${Math.round(Math.sin(angle) * dist)}px`,
    cr:    `${i % 2 === 0 ? 720 : -720}deg`,
    emoji: i % 3 === 0 ? '💰' : i % 3 === 1 ? '🪙' : '💎',
    size:  14 + (i % 5) * 6,
    delay: `${(i % 9) * 35}ms`,
  }
})

const RISING_STARS = Array.from({ length: 20 }, (_, i) => ({
  sx:    `${Math.round((i / 19) * 260 - 130)}px`,
  delay: `${(i % 6) * 55}ms`,
  size:  13 + (i % 4) * 6,
  emoji: i % 4 === 0 ? '✨' : '⭐',
}))

const PIG_RAIN_DROPS_MEGA = Array.from({ length: 48 }, (_, i) => ({
  left:  `${Math.round((i / 48) * 98 + 1)}%`,
  delay: `${(i % 11) * 55}ms`,
  size:  18 + (i % 5) * 10,
  pr:    `${(i % 2 === 0 ? 1 : -1) * (20 + (i % 6) * 30)}deg`,
  dur:   `${0.6 + (i % 4) * 0.2}s`,
}))

const PIG_RAIN_DROPS = Array.from({ length: 24 }, (_, i) => ({
  left:  `${Math.round((i / 24) * 96 + 2)}%`,
  delay: `${(i % 9) * 105}ms`,
  size:  20 + (i % 4) * 9,
  pr:    `${(i % 2 === 0 ? 1 : -1) * (25 + (i % 5) * 28)}deg`,
  dur:   `${0.8 + (i % 3) * 0.25}s`,
}))

// ── Pig Easter Egg — components ───────────────────────────────────────────────

function PigCracks({ level }) {
  if (level < 1) return null
  const path    = CRACK_PATHS[Math.min(level - 1, 3)]
  const opacity = 0.55 + level * 0.1
  return (
    <svg viewBox="0 0 44 44" className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2 }}>
      {path.split('  ').map((d, i) => (
        <path key={i} d={d} stroke="white" strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={opacity} />
      ))}
      {level >= 3 && <circle cx="22" cy="22" r="18" stroke="rgba(255,100,100,0.25)" strokeWidth="3" fill="none" />}
    </svg>
  )
}

function BurstLayer({ coins, stars, mega }) {
  if (!coins && !stars) return null
  const burstCoins = mega ? BURST_COINS_MEGA : BURST_COINS
  return (
    <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
      {coins && <div className="absolute inset-0 bg-white" style={{ animation: 'pig-flash 0.7s ease-out forwards' }} />}
      {coins && burstCoins.map((c, i) => (
        <span key={`c${i}`} className="absolute" style={{
          left: '50%', top: '40%', fontSize: c.size, lineHeight: 1,
          '--cx': c.cx, '--cy': c.cy, '--cr': c.cr,
          animation: `coin-explode 1.1s cubic-bezier(0.15,0.8,0.3,1) ${c.delay} forwards`,
        }}>{c.emoji}</span>
      ))}
      {stars && RISING_STARS.map((s, i) => (
        <span key={`s${i}`} className="absolute" style={{
          left: '50%', bottom: '38%', fontSize: s.size, lineHeight: 1,
          '--sx': s.sx,
          animation: `star-rise 0.95s ease-out ${s.delay} forwards`,
        }}>{s.emoji}</span>
      ))}
    </div>
  )
}

function PartyOverlay({ active }) {
  if (!active) return null
  return (
    <div className="fixed inset-0 z-[190] pointer-events-none"
         style={{ animation: 'party-cycle 0.38s linear infinite' }} />
  )
}

function PigRainLayer({ active, mega }) {
  if (!active) return null
  const drops = mega ? PIG_RAIN_DROPS_MEGA : PIG_RAIN_DROPS
  return (
    <div className="fixed inset-0 z-[195] pointer-events-none overflow-hidden">
      {drops.map((p, i) => (
        <span key={i} className="absolute top-0 leading-none select-none" style={{
          left: p.left, fontSize: p.size,
          '--pr': p.pr,
          animation: `pig-fall ${p.dur} ease-in ${p.delay} forwards`,
        }}>🐷</span>
      ))}
    </div>
  )
}

function CountdownDisplay({ value }) {
  if (value === null) return null
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center pointer-events-none">
      <span
        key={value}
        className="font-black drop-shadow-2xl select-none"
        style={{
          fontSize: typeof value === 'number' ? 130 : 80,
          animation: 'countdown-pop 0.7s ease-out forwards',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >{value}</span>
    </div>
  )
}

function AchievementBanner({ count, visible, isMega }) {
  if (!visible) return null
  return (
    <div className="fixed bottom-6 inset-x-4 z-[220] pointer-events-none flex justify-center"
         style={{ animation: 'achievement-slide 4s ease forwards' }}>
      <div className={`rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 max-w-sm w-full ${
        isMega ? 'bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500'
               : 'bg-gradient-to-r from-yellow-400 to-orange-500'
      }`}>
        <span className="text-3xl">{isMega ? '👑' : '🏆'}</span>
        <div className="flex-1">
          <p className="font-black text-white text-sm leading-tight">
            {isMega ? '💥 פיצוץ מגה! 💥' : 'פיצוץ חזיר!'}
          </p>
          <p className="text-white/85 text-xs font-semibold leading-tight mt-0.5">
            {isMega
              ? `פיצוץ מספר ${count} — מגה מוד 🔥`
              : count === 1 ? 'פיצצת בפעם הראשונה 🎉' : `הרסת חזיר ${count} פעמים 😈`}
          </p>
        </div>
        <span className="text-xl font-black text-white bg-white/20 rounded-full w-9 h-9 flex items-center justify-center">×{count}</span>
      </div>
    </div>
  )
}

function MegaFlash({ visible }) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center pointer-events-none">
      <div className="text-center" style={{ animation: 'mega-flash 1s ease-out forwards' }}>
        <div className="text-8xl leading-none">💥</div>
        <div className="text-4xl font-black tracking-widest mt-2"
             style={{ color: '#FFD700', textShadow: '0 0 40px rgba(255,180,0,0.9), 0 4px 20px rgba(0,0,0,0.5)' }}>
          MEGA
        </div>
      </div>
    </div>
  )
}

function FakeErrorScreen({ visible }) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 z-[245] bg-red-600 flex items-center justify-center pointer-events-none"
         style={{ animation: 'error-screen-in 0.85s ease forwards' }}>
      <div className="text-center px-8">
        <div className="text-6xl mb-3">⚠️</div>
        <h2 className="text-white font-black text-2xl mb-1">שגיאה קריטית!</h2>
        <p className="text-white/80 text-sm font-mono mb-1 tracking-wider">ERR_PIG_EXPLODED</p>
        <p className="text-white/70 text-sm mb-4">הארנק קרס. מאתחל מחדש...</p>
        <div className="h-2 bg-white/25 rounded-full overflow-hidden w-52 mx-auto">
          <div className="h-full bg-white rounded-full"
               style={{ animation: 'error-bar 0.82s linear forwards' }} />
        </div>
      </div>
    </div>
  )
}

// ── Header particles ──────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { children, navigate, showModal, getTransactions, coinInFlight } = useApp()

  // Pig Easter Egg state
  const [pigClicks,     setPigClicks]     = useState(0)
  const [showCoins,     setShowCoins]     = useState(false)
  const [showStars,     setShowStars]     = useState(false)
  const [partyMode,     setPartyMode]     = useState(false)
  const [showPigRain,   setShowPigRain]   = useState(false)
  const [countdown,     setCountdown]     = useState(null)
  const [showAchiev,    setShowAchiev]    = useState(false)
  const [explCount,     setExplCount]     = useState(
    () => parseInt(localStorage.getItem('pig_explosions') || '0')
  )
  const [pigSpeech,     setPigSpeech]     = useState(null)
  const [screenShake,   setScreenShake]   = useState(false)
  const [isMega,        setIsMega]        = useState(false)
  const [showMegaFlash, setShowMegaFlash] = useState(false)
  const [pigPrank,      setPigPrank]      = useState(false)
  const [showError,     setShowError]     = useState(false)
  const [showOrbit,     setShowOrbit]     = useState(false)
  const speechTimer = useRef(null)

  const isBursting = showCoins || showStars || partyMode || showPigRain || countdown !== null || showAchiev || showMegaFlash || showError

  function handlePigClick() {
    if (isBursting) return
    const next = pigClicks + 1

    if (next < 5) {
      // Crack — show speech bubble
      clearTimeout(speechTimer.current)
      setPigSpeech(PIG_SPEECHES[next - 1])
      speechTimer.current = setTimeout(() => setPigSpeech(null), 1800)
      setPigClicks(next)
      sounds.pigCrack(next)
      return
    }

    // EXPLOSION
    const newCount = explCount + 1
    const mega     = newCount % 5 === 0
    setExplCount(newCount)
    setIsMega(mega)
    try { localStorage.setItem('pig_explosions', String(newCount)) } catch {}

    clearTimeout(speechTimer.current)
    setPigSpeech(null)
    setPigClicks(5)
    setShowCoins(true)
    setShowStars(true)
    setPartyMode(true)
    setPigPrank(true)                                                    // t=0 — כרטיסיות מתהפכות מיד
    sounds.pigExplode()
    if (mega) { setShowMegaFlash(true); setTimeout(() => setShowMegaFlash(false), 950) }

    // Screen shake
    setScreenShake(true)
    setTimeout(() => setScreenShake(false), 650)

    // t=0.7s  — achievement banner
    setTimeout(() => setShowAchiev(true), 700)
    // t=1.1s  — pig rain; coins/stars end
    setTimeout(() => setShowPigRain(true), 1100)
    setTimeout(() => { setShowCoins(false); setShowStars(false) }, 1200)
    // t=1.9s  — שגיאה מזויפת מופיעה
    setTimeout(() => setShowError(true), 1900)
    // t=2.2s  — party fades
    setTimeout(() => setPartyMode(false), 2200)
    // t=2.75s — שגיאה נעלמת
    setTimeout(() => setShowError(false), 2750)
    // t=2.9s  — pig rain ends; countdown 3
    setTimeout(() => setShowPigRain(false), 2900)
    setTimeout(() => { setCountdown(3); sounds.pigCrack(1) }, 2900)
    // t=3.65s — countdown 2
    setTimeout(() => { setCountdown(2); sounds.pigCrack(1) }, 3650)
    // t=4.4s  — countdown 1
    setTimeout(() => { setCountdown(1); sounds.pigCrack(1) }, 4400)
    // t=5.15s — 🐷 חוזר; כרטיסיות מתיישרות; כוכבי orbit מתחילים
    setTimeout(() => { setCountdown('🐷'); sounds.coin(); setPigPrank(false); setShowOrbit(true) }, 5150)
    // t=6.3s  — full reset
    setTimeout(() => {
      setCountdown(null)
      setShowAchiev(false)
      setIsMega(false)
      setShowOrbit(false)
      setPigClicks(0)
    }, 6300)
  }

  // Heat-sensitive values based on crack level
  const heatLevel    = isBursting ? 0 : pigClicks
  const ringColor    = ['rgba(255,255,255,0.35)','rgba(96,165,250,0.9)','rgba(74,222,128,0.9)','rgba(251,146,60,0.95)','rgba(239,68,68,1)'][heatLevel]
  const ringGlow     = ['none','0 0 8px rgba(96,165,250,0.5)','0 0 10px rgba(74,222,128,0.6)','0 0 14px rgba(251,146,60,0.7)','0 0 18px rgba(239,68,68,0.85)'][heatLevel]
  const pigRingStyle = { boxShadow: `0 0 0 2px ${ringColor}, ${ringGlow}`, transition: 'box-shadow 0.3s ease' }
  const pigScale     = [1, 1.07, 1.14, 1.22, 1.30][heatLevel]
  const pingDuration = ['3s', '2.5s', '2s', '1.2s', '0.5s'][heatLevel]
  const headerDark   = [0, 0, 0.06, 0.14, 0.26][heatLevel]
  const redPulseOn   = heatLevel >= 3
  const redPulseSpeed = heatLevel >= 4 ? '0.4s' : '0.9s'

  const todayStart = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() })()
  const weekStart  = (() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d.getTime() })()

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

  const sortedChildren = children.length >= 2
    ? [...children].sort((a, b) => (weekStarsPerChild[b.id] || 0) - (weekStarsPerChild[a.id] || 0))
    : children

  return (
    <div className="min-h-screen flex flex-col"
         style={screenShake ? { animation: 'screen-shake 0.6s ease-out forwards' } : {}}>
      {/* Explosion overlays */}
      <BurstLayer coins={showCoins} stars={showStars} mega={isMega} />
      <PartyOverlay active={partyMode} />
      <PigRainLayer active={showPigRain} mega={isMega} />
      <CountdownDisplay value={countdown} />
      <AchievementBanner count={explCount} visible={showAchiev} isMega={isMega} />
      <MegaFlash visible={showMegaFlash} />
      <FakeErrorScreen visible={showError} />

      {/* Header */}
      <header
        className={`relative overflow-hidden bg-gradient-to-br ${getTimeGradient()} px-5 pt-3 pb-5 text-white rounded-b-[2rem] shadow-lg`}
        style={pigClicks >= 3 && !isBursting ? { animation: `header-tremble ${pigClicks >= 4 ? '0.07s' : '0.15s'} ease-in-out infinite` } : {}}
      >
        {/* Feature 9 — progressive darkness overlay */}
        <div className="absolute inset-0 rounded-b-[2rem] pointer-events-none"
             style={{ background: `rgba(0,0,0,${headerDark})`, transition: 'background 0.5s ease' }} />
        {/* Feature 6 — red pulse overlay */}
        {redPulseOn && !isBursting && (
          <div className="absolute inset-0 rounded-b-[2rem] pointer-events-none"
               style={{ background: 'rgba(239,68,68,0.18)', animation: `red-pulse ${redPulseSpeed} ease-in-out infinite` }} />
        )}
        {PARTICLES.map((p, i) => (
          <span key={i} className="absolute pointer-events-none select-none" style={{
            left: p.l, top: p.t, fontSize: p.s,
            animationName: 'particle-float', animationDuration: `${p.dur}s`,
            animationDelay: `${p.d}s`, animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite', opacity: 0.72,
          }}>{p.e}</span>
        ))}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate('settings')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 transition-all text-xl"
            aria-label="הגדרות">⚙️</button>
          <button onClick={() => showModal('addChild')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 transition-all text-2xl font-bold leading-none"
            aria-label="הוסף ילד">+</button>
        </div>

        {/* Hero — interactive pig */}
        <div className="text-center">
          {/* Feature 2 — pig inflates; feature 7 — heartbeat speeds up */}
          <div className="relative inline-flex items-center justify-center mb-1.5"
               style={{ transform: `scale(${pigScale})`, transition: 'transform 0.25s ease-out' }}>
            <div className="absolute w-14 h-14 rounded-full bg-white/10 animate-ping" style={{ animationDuration: pingDuration }} />

            {/* Feature 4 — orbit stars when pig returns */}
            {showOrbit && [0, 1, 2].map(i => (
              <span key={i} className="absolute pointer-events-none text-base leading-none"
                    style={{
                      top: '50%', left: '50%', marginTop: '-0.5em', marginLeft: '-0.5em',
                      animation: `orbit 0.9s linear ${-(i / 3).toFixed(2)}s infinite`,
                    }}>⭐</span>
            ))}

            {/* Feature 8 — steam clouds when pig is angry */}
            {pigClicks >= 3 && !isBursting && (
              <div className="absolute inset-x-0 -top-7 flex justify-around pointer-events-none">
                {[0, 1, 2].map(i => (
                  <span key={i} className="text-sm" style={{
                    display: 'inline-block',
                    animation: `steam-rise 1.1s ease-out ${i * 0.36}s infinite`,
                  }}>💨</span>
                ))}
              </div>
            )}

            {/* Speech bubble */}
            {pigSpeech && !isBursting && (
              <div className="absolute -top-10 left-0 right-0 flex justify-center z-20 pointer-events-none"
                   style={{ animation: 'speech-pop 1.8s ease forwards' }}>
                <div className="relative">
                  <div className="bg-white rounded-xl px-2.5 py-1 shadow-lg text-xs font-bold text-gray-700 whitespace-nowrap">
                    {pigSpeech}
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
                </div>
              </div>
            )}

            <div
              className="relative w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shadow-inner cursor-pointer select-none overflow-hidden active:scale-90 transition-transform"
              style={pigRingStyle}
              onClick={handlePigClick}
              title="לחץ עלי 🐷"
            >
              <span
                className={`text-2xl relative z-10 ${!isBursting && pigClicks === 0 ? 'animate-float' : ''}`}
                style={pigClicks >= 3 && !isBursting ? { animation: 'pig-shake 0.35s ease-in-out' } : {}}
              >
                {isBursting && countdown === null ? '💥' : isBursting && countdown !== null ? '' : '🐷'}
              </span>
              <PigCracks level={isBursting ? 0 : pigClicks} />
            </div>
          </div>
          <h1 className="text-lg font-bold tracking-tight">הארנק שלי</h1>
          <p className="text-xs text-white/65 mt-0.5">כסף חכם לילדים 💡</p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 dot-grid -mt-4"
            style={pigPrank
              ? { animation: 'prank-in 0.55s cubic-bezier(0.68,-0.55,0.27,1.55) forwards' }
              : { transform: 'rotate(0deg) scale(1)', transition: 'transform 0.7s ease-out' }
            }>
        {children.length === 0 ? (
          <div className="flex flex-col items-center gap-5 text-center animate-fade-in pt-4">
            <div className="text-8xl animate-float">🐷</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">ברוכים הבאים!</h2>
              <p className="text-gray-500 leading-relaxed text-sm">
                הארנק החכם לילדים —<br />מטלות, כוכבים, חסכון ופרסים
              </p>
            </div>
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
                <div key={child.id} className="animate-slide-up"
                     style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
                  {i > 0 && (
                    <div className="flex items-center gap-3 my-3 px-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                      <span className="text-sm opacity-40">🐷</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                    </div>
                  )}
                  <ChildCard child={child} index={i} rank={i + 1} totalChildren={children.length} />
                  <div className="mt-2 bg-gray-100 rounded-2xl p-1.5 ring-1 ring-gray-200 shadow-inner space-y-1.5">
                    <button
                      onClick={() => showModal('addStars', { childId: child.id, allowFreeEntry: false })}
                      className="w-full bg-gradient-to-b from-amber-400 to-amber-500 rounded-xl shadow-sm px-3 py-2.5 flex flex-col items-center gap-0.5 text-white active:scale-95 active:brightness-90 transition-all"
                    >
                      <span className="text-lg leading-none">⭐</span>
                      <span className="text-xs font-bold leading-tight">מטלה מהירה</span>
                    </button>
                    {(() => {
                      const freeSpins = child.freeSpins || 0
                      const rawCount  = todayChores[child.id] || 0
                      const dispCount = coinInFlight === child.id ? Math.max(0, rawCount - 1) : rawCount
                      const filled    = freeSpins > 0 ? 5 : dispCount % 5
                      return (
                        <button
                          ref={(el) => registerCoinTarget(child.id, el)}
                          onClick={() => showModal('spinWheel', { childId: child.id, childName: child.name })}
                          className={`w-full rounded-xl shadow-sm px-3 py-2.5 flex flex-col items-center gap-0.5 active:scale-95 active:brightness-90 transition-all text-white ${
                            freeSpins > 0 ? 'bg-gradient-to-b from-yellow-400 to-orange-500' : 'bg-gradient-to-b from-violet-500 to-purple-600'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg leading-none">🎰</span>
                            {freeSpins > 0 && (
                              <span className="bg-white/30 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">{freeSpins}</span>
                            )}
                          </div>
                          <span className="text-xs font-bold leading-tight">גלגל המזל</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }, (_, j) => (
                              <span key={j} className="text-sm leading-none transition-all" style={{ opacity: j < filled ? 1 : 0.3 }}>🪙</span>
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
