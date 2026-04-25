import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Button from '../ui/Button.jsx'
import { sounds } from '../../lib/sounds.js'
import { celebrateGoal } from '../../lib/confetti.js'
import { formatNumber } from '../../lib/utils.js'

const SPIN_COST = 12

const SEGMENTS = [
  { shekels: 3,  color: '#0ea5e9', emoji: '💵', label: '3'  },
  { shekels: 5,  color: '#059669', emoji: '💵', label: '5'  },
  { shekels: 5,  color: '#0891b2', emoji: '💵', label: '5'  },
  { shekels: 10, color: '#0e7490', emoji: '💸', label: '10' },
  { shekels: 7,  color: '#06b6d4', emoji: '💵', label: '7'  },
  { shekels: 50, color: '#7c3aed', emoji: '🤑', label: '50' },
  { shekels: 5,  color: '#0d9488', emoji: '💵', label: '5'  },
  { shekels: 20, color: '#15803d', emoji: '💸', label: '20' },
  { shekels: 8,  color: '#047857', emoji: '💵', label: '8'  },
  { shekels: 3,  color: '#0369a1', emoji: '💵', label: '3'  },
]
const N   = SEGMENTS.length   // 10
const DEG = 360 / N           // 36°
const CX  = 170, CY = 170, R = 160

function polarR(deg, r) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}
function polar(deg) { return polarR(deg, R) }

function segPath(i) {
  const s = polar(i * DEG)
  const e = polar((i + 1) * DEG)
  return `M${CX},${CY} L${s.x.toFixed(2)},${s.y.toFixed(2)} A${R},${R},0,0,1,${e.x.toFixed(2)},${e.y.toFixed(2)} Z`
}
function labelPos(i) {
  const a = polarR(i * DEG + DEG / 2, R)
  return { x: CX + (a.x - CX) * 0.62, y: CY + (a.y - CY) * 0.62 }
}

function scheduleWheelSounds(onDone, totalMs = 3600) {
  const ids = []
  let t = 0
  let interval = 65
  while (t < totalMs - 500) {
    const delay = t
    ids.push(setTimeout(() => sounds.wheelTick(), delay))
    t += interval
    interval = Math.min(65 + Math.pow(t / (totalMs - 500), 2.2) * 320, 380)
  }
  ids.push(setTimeout(() => sounds.wheelSuspense(), totalMs - 450))
  ids.push(setTimeout(() => { sounds.wheelReveal(); celebrateGoal(); onDone() }, totalMs))
  return ids
}

export default function SpinWheelModal() {
  const { children, closeModal, modalData, adjustStars, adjustShekels, addTransaction, consumeFreeSpin } = useApp()
  const { childId, childName } = modalData || {}

  const child     = children.find((c) => c.id === childId)
  const balance   = child?.starBalance ?? 0
  const freeSpins = child?.freeSpins || 0
  const isFree    = freeSpins > 0
  const canSpin   = isFree || balance >= SPIN_COST

  const [spinning, setSpinning] = useState(false)
  const [result,   setResult]   = useState(null)
  const wheelRef = useRef(null)
  const tickIds  = useRef([])

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
    const el = wheelRef.current
    if (el) {
      el.style.transition = 'none'
      el.style.transform  = 'rotate(0deg)'
      void el.getBoundingClientRect()
      el.style.transition = 'transform 3.5s cubic-bezier(0.08, 0.4, 0.12, 1)'
      el.style.transform  = `rotate(${finalAngle}deg)`
    }
    tickIds.current = scheduleWheelSounds(() => { setSpinning(false); setResult(SEGMENTS[winner]) })
  }

  function handleClaim() {
    if (!result) return
    adjustShekels(childId, result.shekels)
    addTransaction(childId, { type: 'wheel_win', amount: result.shekels, currency: 'shekels', description: `🎰 גלגל המזל — זכייה` })
    sounds.goal()
    closeModal()
  }

  function handleClose() { tickIds.current.forEach(clearTimeout); closeModal() }

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
            <div className="bg-white/10 rounded-2xl px-4 py-2.5 text-center animate-bounce-in">
              <p className="text-lg font-black leading-tight">🎉 {childName || 'ילד'} זכה ב-{rewardLabel}!</p>
              <p className="text-xs font-bold text-emerald-300 mt-0.5">💵 הכסף נוסף לחשבון!</p>
            </div>
          ) : freeSpins > 0 ? (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl px-3 py-2 flex items-center gap-2 text-white shadow-md animate-pop">
              <span className="text-lg">🎁</span>
              <p className="font-black text-sm flex-1">{freeSpins > 1 ? `${freeSpins} סיבובים חינמיים!` : 'סיבוב מתנה על 5 מטלות!'}</p>
              <span className="text-xs font-black bg-white/25 rounded-full w-6 h-6 flex items-center justify-center">×{freeSpins}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-2 py-1.5 text-center">
                <div className="text-[10px] font-semibold text-amber-500">יתרת כוכבים</div>
                <div className="text-sm font-black text-amber-700">⭐ {formatNumber(balance)}</div>
              </div>
              <div className={`flex-1 rounded-xl px-2 py-1.5 text-center border ${isFree ? 'bg-green-50 border-green-200' : 'bg-violet-100 border-violet-300'}`}>
                <div className={`text-[10px] font-semibold ${isFree ? 'text-green-600' : 'text-violet-600'}`}>עלות סיבוב</div>
                <div className={`text-sm font-black ${isFree ? 'text-green-700' : 'text-violet-700'}`}>{isFree ? '🎁 חינם!' : `⭐ ${SPIN_COST}`}</div>
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
              {SEGMENTS.map((seg, i) => (
                <path key={`f${i}`} d={segPath(i)} fill={seg.color} />
              ))}

              {/* Layer 2 — white dividers */}
              {Array.from({ length: N }, (_, i) => {
                const p = polar(i * DEG)
                return <line key={`d${i}`} x1={CX} y1={CY} x2={p.x.toFixed(2)} y2={p.y.toFixed(2)} stroke="white" strokeWidth={2.5} />
              })}

              {/* Layer 3 — labels: big emoji + amount below */}
              {SEGMENTS.map((seg, i) => {
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
            <Button size="lg" fullWidth onClick={handleClaim}>✅ קח את הפרס — {rewardLabel}</Button>
          ) : (
            <Button size="lg" fullWidth onClick={spin} disabled={spinning || !canSpin} className={spinning ? 'opacity-60 cursor-not-allowed' : ''}>
              {spinning ? '🎰 מסתובב...' : isFree ? '🎁 סובב חינם!' : `🎰 סובב! (${SPIN_COST}⭐)`}
            </Button>
          )}
        </div>

      </div>
    </div>
  )
}
