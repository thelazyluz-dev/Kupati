import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Button from '../ui/Button.jsx'
import { sounds } from '../../lib/sounds.js'
import { celebrateGoal } from '../../lib/confetti.js'
import { formatNumber } from '../../lib/utils.js'
import { DEFAULT_WHEEL_PRIZES } from '../../lib/defaults.js'

const CX = 170, CY = 170, R = 160

// Phase 1: fast spin to overshoot position
// Phase 2: ease back to winner
// PAUSE: dramatic silence while result is hidden
const PHASE1_MS = 3500
const PHASE2_MS = 500
const PAUSE_MS  = 800

const WHEEL_COLORS = [
  '#0ea5e9','#059669','#0891b2','#0e7490','#06b6d4',
  '#7c3aed','#0d9488','#15803d','#047857','#0369a1',
  '#8b5cf6','#d97706',
]

function polarR(deg, r) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}
function polar(deg) { return polarR(deg, R) }

function scheduleWheelSounds(onDone) {
  const ids = []
  let t = 0
  let interval = 65

  // Ticks with progressive haptic intensity as wheel slows
  while (t < PHASE1_MS - 400) {
    const delay = t
    const vi = interval > 200 ? [28] : [12]
    ids.push(setTimeout(() => {
      sounds.wheelTick()
      try { navigator.vibrate?.(vi) } catch {}
    }, delay))
    t += interval
    interval = Math.min(65 + Math.pow(t / (PHASE1_MS - 400), 2.2) * 320, 380)
  }

  // Impact thud at the overshoot moment (wheel hits max and starts bouncing back)
  ids.push(setTimeout(() => {
    sounds.lotteryPop()
    try { navigator.vibrate?.([70, 20, 90]) } catch {}
  }, PHASE1_MS + 80))

  // Rising suspense swoop during the bounce-back
  ids.push(setTimeout(() => sounds.wheelSuspense(), PHASE1_MS + 300))

  // Grand reveal after dramatic silence
  ids.push(setTimeout(() => {
    sounds.wheelReveal()
    celebrateGoal()
    onDone()
  }, PHASE1_MS + PHASE2_MS + PAUSE_MS))

  return ids
}

export default function SpinWheelModal() {
  const { children, closeModal, modalData, adjustStars, adjustShekels, addTransaction, consumeFreeSpin, settings } = useApp()
  const { childId, childName } = modalData || {}

  const SPIN_COST = settings.wheelSpinCost ?? 70
  const prizes   = (settings.wheelPrizes?.length >= 2 ? settings.wheelPrizes : DEFAULT_WHEEL_PRIZES)
  const segments = prizes.map((p, i) => ({ ...p, color: WHEEL_COLORS[i % WHEEL_COLORS.length], label: String(p.shekels) }))
  const N   = segments.length
  const DEG = 360 / N

  function segPath(i) {
    const s = polar(i * DEG); const e = polar((i + 1) * DEG)
    return `M${CX},${CY} L${s.x.toFixed(2)},${s.y.toFixed(2)} A${R},${R},0,0,1,${e.x.toFixed(2)},${e.y.toFixed(2)} Z`
  }
  function labelPos(i) {
    const a = polarR(i * DEG + DEG / 2, R)
    return { x: CX + (a.x - CX) * 0.62, y: CY + (a.y - CY) * 0.62 }
  }

  const child     = children.find((c) => c.id === childId)
  const balance   = child?.starBalance ?? 0
  const freeSpins = child?.freeSpins || 0
  const isFree    = freeSpins > 0
  const canSpin   = isFree || balance >= SPIN_COST

  const [spinning, setSpinning] = useState(false)
  const [result,   setResult]   = useState(null)
  const wheelRef     = useRef(null)
  const highlightRef = useRef(null)
  const tickIds      = useRef([])
  const rafRef       = useRef(null)

  // Start rAF loop that reads current wheel rotation and highlights the segment under the pointer.
  // Uses direct DOM mutation to avoid React re-renders at 60fps.
  function startHighlight() {
    const hl = highlightRef.current
    if (hl) hl.setAttribute('fill', 'rgba(255,255,255,0.28)')
    function frame() {
      const el = wheelRef.current
      if (!el || !highlightRef.current) return
      try {
        const m = new DOMMatrix(window.getComputedStyle(el).transform)
        const deg = ((Math.atan2(m.m12, m.m11) * 180 / Math.PI) + 360) % 360
        const idx = Math.floor(((360 - deg) % 360) / DEG) % N
        highlightRef.current.setAttribute('d', segPath(idx))
      } catch {}
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
  }

  // Stop rAF and leave highlight locked on the winning segment.
  function stopHighlight(winnerIdx) {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    const hl = highlightRef.current
    if (hl) {
      hl.setAttribute('d', segPath(winnerIdx))
      hl.setAttribute('fill', 'rgba(255,255,255,0.32)')
    }
  }

  function spin() {
    if (spinning || result || !canSpin) return
    setSpinning(true)
    if (isFree) {
      consumeFreeSpin(childId)
    } else {
      adjustStars(childId, -SPIN_COST)
      addTransaction(childId, { type: 'wheel_spin', amount: SPIN_COST, currency: 'stars', description: `🎰 גלגל המזל — עלות סיבוב` })
    }

    const winner     = Math.floor(Math.random() * N)
    const segCenter  = winner * DEG + DEG / 2
    const finalAngle = 360 * 6 + (360 - segCenter)
    // Near-miss: overshoot 18–32° into the next segment, then ease back
    const overshoot  = 18 + Math.random() * 14

    const el = wheelRef.current
    if (el) {
      el.style.transition = 'none'
      el.style.transform  = 'rotate(0deg)'
      void el.getBoundingClientRect()
      // Phase 1: fast spin to overshoot position
      el.style.transition = `transform ${PHASE1_MS}ms cubic-bezier(0.08, 0.4, 0.12, 1)`
      el.style.transform  = `rotate(${finalAngle + overshoot}deg)`
      // Phase 2: ease back to the actual winner
      setTimeout(() => {
        el.style.transition = `transform ${PHASE2_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
        el.style.transform  = `rotate(${finalAngle}deg)`
      }, PHASE1_MS)
    }

    startHighlight()

    tickIds.current = scheduleWheelSounds(() => {
      stopHighlight(winner)
      setSpinning(false)
      setResult(segments[winner])
      celebrateGoal()
    })
  }

  function handleClaim() {
    if (!result) return
    adjustShekels(childId, result.shekels)
    addTransaction(childId, { type: 'wheel_win', amount: result.shekels, currency: 'shekels', description: `🎰 גלגל המזל — זכייה` })
    sounds.goal()
    closeModal()
  }

  function handleClose() {
    tickIds.current.forEach(clearTimeout)
    cancelAnimationFrame(rafRef.current)
    if (result) handleClaim()   // auto-claim if prize pending
    else closeModal()
  }

  const rewardLabel = result ? `${result.shekels}₪` : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-violet-900 to-purple-950 text-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        <div className="w-10" />
        <h1 className="text-base font-black tracking-wide">🎰 גלגל המזל</h1>
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-2xl font-bold active:scale-90 transition-all leading-none"
          aria-label="סגור"
        >×</button>
      </div>

      {/* Body — 3-zone fixed layout */}
      <div className="flex-1 flex flex-col items-center gap-3 px-4 pb-4 min-h-0">

        {/* Zone 1: top info */}
        <div className="w-full max-w-sm flex-shrink-0">
          {result ? (
            <div className="rounded-2xl px-4 py-2.5 text-center animate-bounce-in"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.2)' }}>
              <p className="text-lg font-black leading-tight">🎉 {childName || 'ילד'} זכה ב-{rewardLabel}!</p>
              <p className="text-xs font-bold text-emerald-300 mt-0.5">💵 הכסף נוסף לחשבון!</p>
            </div>
          ) : freeSpins > 0 ? (
            <div className="rounded-2xl px-3 py-2 flex items-center gap-2 text-white animate-pop"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', boxShadow: '0 6px 20px rgba(251,191,36,0.5), inset 0 1px 1px rgba(255,255,255,0.3)' }}>
              <span className="text-lg">🎁</span>
              <p className="font-black text-sm flex-1">{freeSpins > 1 ? `${freeSpins} סיבובים חינמיים!` : 'סיבוב מתנה על 5 מטלות!'}</p>
              <span className="text-xs font-black bg-white/25 rounded-full w-6 h-6 flex items-center justify-center">×{freeSpins}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl px-2 py-1.5 text-center"
                style={{ background: 'rgba(254,243,199,0.15)', border: '1px solid rgba(251,191,36,0.3)', boxShadow: '0 2px 8px rgba(251,191,36,0.2), inset 0 1px 1px rgba(255,255,255,0.1)' }}>
                <div className="text-[10px] font-semibold text-amber-300">יתרת כוכבים</div>
                <div className="text-sm font-black text-amber-200">⭐ {formatNumber(balance)}</div>
              </div>
              <div className="flex-1 rounded-xl px-2 py-1.5 text-center"
                style={{ background: isFree ? 'rgba(209,250,229,0.15)' : 'rgba(221,214,254,0.15)', border: `1px solid ${isFree ? 'rgba(52,211,153,0.3)' : 'rgba(167,139,250,0.35)'}`, boxShadow: `0 2px 8px ${isFree ? 'rgba(52,211,153,0.2)' : 'rgba(139,92,246,0.2)'}` }}>
                <div className={`text-[10px] font-semibold ${isFree ? 'text-emerald-300' : 'text-violet-300'}`}>עלות סיבוב</div>
                <div className={`text-sm font-black ${isFree ? 'text-emerald-200' : 'text-violet-200'}`}>{isFree ? '🎁 חינם!' : `⭐ ${SPIN_COST}`}</div>
              </div>
            </div>
          )}
        </div>

        {/* Zone 2: wheel */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="relative flex-shrink-0" style={{ width: 340, height: 354 }}>
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 z-10" style={{
              transform: 'translateX(-50%) translateY(-2px)',
              width: 0, height: 0,
              borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
              borderTop: '26px solid white',
              filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.5))',
            }} />

            <svg ref={wheelRef} width={340} height={340} style={{ display: 'block', willChange: 'transform', marginTop: 14 }}>

              {/* Layer 1 — segment fills */}
              {segments.map((seg, i) => (
                <path key={`f${i}`} d={segPath(i)} fill={seg.color} />
              ))}

              {/* Layer 2 — active segment highlight (driven by rAF, no React re-renders) */}
              <path ref={highlightRef} d="" fill="rgba(255,255,255,0)" />

              {/* Layer 3 — white dividers */}
              {Array.from({ length: N }, (_, i) => {
                const p = polar(i * DEG)
                return <line key={`d${i}`} x1={CX} y1={CY} x2={p.x.toFixed(2)} y2={p.y.toFixed(2)} stroke="white" strokeWidth={2.5} />
              })}

              {/* Layer 4 — labels: big emoji + amount below */}
              {segments.map((seg, i) => {
                const lp = labelPos(i)
                return (
                  <g key={`l${i}`} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    <text x={lp.x} y={lp.y - 9} textAnchor="middle" dominantBaseline="central" fontSize={20}>
                      {seg.emoji}
                    </text>
                    <text x={lp.x} y={lp.y + 12} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold" fill="white">
                      {seg.label}₪
                    </text>
                  </g>
                )
              })}

              {/* Hub */}
              <circle cx={CX} cy={CY} r={22} fill="white" stroke="#ddd6fe" strokeWidth={3} />
              <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize={20}>🎰</text>
            </svg>
          </div>
        </div>

        {/* Zone 3: action button */}
        <div className="w-full max-w-sm flex-shrink-0">
          {!canSpin && !result && (
            <p className="text-center text-xs text-rose-300 font-semibold bg-rose-900/40 rounded-xl py-1.5 px-3 mb-2">
              אין מספיק כוכבים (יש {balance}⭐, צריך {SPIN_COST}⭐)
            </p>
          )}
          {result ? (
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl animate-ping"
                style={{ background: 'rgba(16,185,129,0.35)', animationDuration: '1s' }} />
              <button onClick={handleClaim}
                className="relative overflow-hidden w-full py-5 rounded-2xl font-black text-2xl text-white active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg,#34d399,#059669,#047857)', boxShadow: '0 0 0 4px rgba(52,211,153,0.4), 0 12px 40px rgba(16,185,129,0.7)' }}>
                <span className="prize-shimmer" />
                <span className="relative">💰 קח את הפרס — {rewardLabel}!</span>
              </button>
            </div>
          ) : isFree && !spinning ? (
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl animate-ping"
                style={{ background: 'rgba(251,191,36,0.38)', animationDuration: '1.1s' }} />
              <button onClick={spin}
                className="relative overflow-hidden w-full py-5 rounded-2xl font-black text-2xl text-amber-900 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)', boxShadow: '0 0 0 3px rgba(251,191,36,0.5), 0 12px 32px rgba(245,158,11,0.6)' }}>
                <span className="prize-shimmer" />
                <span className="relative">🎁 סובב חינם!</span>
              </button>
            </div>
          ) : (
            <Button size="lg" fullWidth onClick={spin} disabled={spinning || !canSpin} className={spinning ? 'opacity-60 cursor-not-allowed' : ''}>
              {spinning ? '🎰 מסתובב...' : `🎰 סובב! (${SPIN_COST}⭐)`}
            </Button>
          )}
        </div>

      </div>
    </div>
  )
}
