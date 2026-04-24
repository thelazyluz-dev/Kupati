import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Button from '../ui/Button.jsx'
import { sounds } from '../../lib/sounds.js'
import { celebrateGoal } from '../../lib/confetti.js'
import { formatNumber } from '../../lib/utils.js'

const SPIN_COST = 12   // stars to pay per spin

const SEGMENTS = [
  { stars: 3,    color: '#fb923c', label: '3⭐' },
  { shekels: 1,  color: '#4ade80', label: '1₪'  },
  { stars: 5,    color: '#fbbf24', label: '5⭐' },
  { shekels: 2,  color: '#34d399', label: '2₪'  },
  { stars: 10,   color: '#60a5fa', label: '10⭐' },
  { shekels: 5,  color: '#2dd4bf', label: '5₪'  },
  { stars: 8,    color: '#a78bfa', label: '8⭐' },
  { shekels: 10, color: '#22d3ee', label: '10₪' },
  { stars: 20,   color: '#f472b6', label: '20⭐' },
  { shekels: 20, color: '#86efac', label: '20₪' },
]
const N   = SEGMENTS.length   // 10
const DEG = 360 / N           // 36°
const CX  = 170, CY = 170, R = 160

function polar(deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) }
}
function segPath(i) {
  const s = polar(i * DEG)
  const e = polar((i + 1) * DEG)
  return `M${CX},${CY} L${s.x.toFixed(2)},${s.y.toFixed(2)} A${R},${R},0,0,1,${e.x.toFixed(2)},${e.y.toFixed(2)} Z`
}
function labelPos(i) {
  const a = polar(i * DEG + DEG / 2)
  return { x: CX + (a.x - CX) * 0.65, y: CY + (a.y - CY) * 0.65 }
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

  ids.push(setTimeout(() => {
    sounds.wheelReveal()
    celebrateGoal()
    onDone()
  }, totalMs))

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

  const [spinning,  setSpinning]  = useState(false)
  const [result,    setResult]    = useState(null)
  const [usedFree,  setUsedFree]  = useState(false)
  const wheelRef = useRef(null)
  const tickIds  = useRef([])

  function spin() {
    if (spinning || result || !canSpin) return
    setSpinning(true)

    if (isFree) {
      consumeFreeSpin(childId)
      setUsedFree(true)
    } else {
      adjustStars(childId, -SPIN_COST)
      addTransaction(childId, {
        type: 'wheel_spin',
        amount: SPIN_COST,
        currency: 'stars',
        description: `🎰 גלגל המזל — עלות סיבוב`,
      })
    }

    const winner    = Math.floor(Math.random() * N)
    const segCenter = winner * DEG + DEG / 2
    const finalAngle = 360 * 6 + (360 - segCenter)

    const el = wheelRef.current
    if (el) {
      el.style.transition = 'none'
      el.style.transform  = 'rotate(0deg)'
      void el.getBoundingClientRect()
      el.style.transition = 'transform 3.5s cubic-bezier(0.08, 0.4, 0.12, 1)'
      el.style.transform  = `rotate(${finalAngle}deg)`
    }

    tickIds.current = scheduleWheelSounds(() => {
      setSpinning(false)
      setResult(SEGMENTS[winner])
    })
  }

  function handleClaim() {
    if (!result) return
    if (result.shekels != null) {
      adjustShekels(childId, result.shekels)
      addTransaction(childId, {
        type: 'wheel_win',
        amount: result.shekels,
        currency: 'shekels',
        description: `🎰 גלגל המזל — זכייה`,
      })
    } else {
      adjustStars(childId, result.stars)
      addTransaction(childId, {
        type: 'wheel_win',
        amount: result.stars,
        currency: 'stars',
        description: `🎰 גלגל המזל — זכייה`,
      })
    }
    sounds.goal()
    closeModal()
  }

  function handleClose() {
    tickIds.current.forEach(clearTimeout)
    closeModal()
  }

  const rewardLabel = result ? (result.shekels != null ? `${result.shekels}₪` : `${result.stars}⭐`) : null
  const net = result && result.shekels == null
    ? (usedFree ? result.stars : result.stars - SPIN_COST)
    : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-violet-900 to-purple-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3 flex-shrink-0">
        <div className="w-10" />
        <h1 className="text-lg font-black tracking-wide">🎰 גלגל המזל</h1>
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-2xl font-bold active:scale-90 transition-all leading-none"
          aria-label="סגור"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 pb-8 gap-4">

        {/* Free spin banner */}
        {freeSpins > 0 && !result && (
          <div className="w-full max-w-sm bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-white shadow-md animate-pop">
            <span className="text-xl">🎁</span>
            <div className="flex-1">
              <p className="font-black text-sm leading-tight">סיבוב מתנה!</p>
              <p className="text-[11px] opacity-90 leading-tight">
                {freeSpins > 1 ? `${freeSpins} סיבובים חינמיים מחכים לך` : 'הרווחת סיבוב חינמי על 5 מטלות היום'}
              </p>
            </div>
            <span className="text-xl font-black bg-white/25 rounded-full w-8 h-8 flex items-center justify-center text-sm">×{freeSpins}</span>
          </div>
        )}

        {/* Balance + cost info */}
        <div className="flex gap-2 w-full max-w-sm">
          <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center">
            <div className="text-[10px] font-semibold text-amber-500 mb-0.5">יתרת כוכבים</div>
            <div className="text-base font-black text-amber-700">⭐ {formatNumber(balance)}</div>
          </div>
          <div className={`flex-1 rounded-xl px-3 py-2 text-center border ${isFree ? 'bg-green-50 border-green-200' : 'bg-violet-100 border-violet-300'}`}>
            <div className={`text-[10px] font-semibold mb-0.5 ${isFree ? 'text-green-600' : 'text-violet-600'}`}>עלות סיבוב</div>
            <div className={`text-base font-black ${isFree ? 'text-green-700' : 'text-violet-700'}`}>
              {isFree ? '🎁 חינם!' : `⭐ ${SPIN_COST}`}
            </div>
          </div>
        </div>

        {/* Wheel + pointer */}
        <div className="relative flex-shrink-0" style={{ width: 340, height: 354 }}>
          {/* Pointer */}
          <div
            className="absolute top-0 left-1/2 z-10"
            style={{
              transform: 'translateX(-50%) translateY(-2px)',
              width: 0, height: 0,
              borderLeft:  '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop:   '26px solid white',
              filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.5))',
            }}
          />

          <svg
            ref={wheelRef}
            width={340}
            height={340}
            style={{ display: 'block', willChange: 'transform', marginTop: 14 }}
          >
            {SEGMENTS.map((seg, i) => {
              const lp = labelPos(i)
              return (
                <g key={i}>
                  <path d={segPath(i)} fill={seg.color} stroke="white" strokeWidth={2} />
                  <text
                    x={lp.x} y={lp.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={13} fontWeight="bold" fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {seg.label}
                  </text>
                </g>
              )
            })}
            {/* Hub */}
            <circle cx={CX} cy={CY} r={22} fill="white" stroke="#ddd6fe" strokeWidth={3} />
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize={20}>🎰</text>
          </svg>
        </div>

        {/* Result or spin area */}
        {result ? (
          <div className="text-center animate-bounce-in w-full max-w-sm space-y-2">
            <div className="text-5xl">🎉</div>
            <p className="text-xl font-black">
              {childName || 'ילד'} זכה ב-{rewardLabel}!
            </p>
            {result.shekels != null ? (
              <p className="text-sm font-bold text-emerald-300">💵 הכסף נוסף לחשבון!</p>
            ) : usedFree ? (
              <p className="text-sm font-bold text-emerald-300">🎁 סיבוב חינמי — רווח נקי: +{result.stars}⭐</p>
            ) : (
              <p className={`text-sm font-bold ${net > 0 ? 'text-emerald-300' : net === 0 ? 'text-gray-300' : 'text-rose-300'}`}>
                {net > 0 ? `רווח נקי: +${net}⭐` : net === 0 ? 'יצאת בדיוק בשוויון' : `הפסד נקי: ${net}⭐`}
              </p>
            )}
            <Button size="lg" fullWidth onClick={handleClaim} className="mt-1">
              ✅ קח את הפרס — {rewardLabel}
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-2">
            {!canSpin && (
              <p className="text-center text-sm text-rose-300 font-semibold bg-rose-900/40 rounded-xl py-2 px-3">
                אין מספיק כוכבים (יש {balance}⭐, צריך {SPIN_COST}⭐)
              </p>
            )}
            <Button
              size="lg"
              fullWidth
              onClick={spin}
              disabled={spinning || !canSpin}
              className={spinning ? 'opacity-60 cursor-not-allowed' : ''}
            >
              {spinning ? '🎰 מסתובב...' : isFree ? '🎁 סובב חינם!' : `🎰 סובב! (${SPIN_COST}⭐)`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
