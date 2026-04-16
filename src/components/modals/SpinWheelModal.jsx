import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { sounds } from '../../lib/sounds.js'
import { celebrateGoal } from '../../lib/confetti.js'
import { formatNumber } from '../../lib/utils.js'

const SPIN_COST = 10   // stars to pay per spin

const SEGMENTS = [
  { stars: 3,  color: '#fb923c', label: '3⭐' },
  { stars: 5,  color: '#fbbf24', label: '5⭐' },
  { stars: 10, color: '#34d399', label: '10⭐' },
  { stars: 8,  color: '#60a5fa', label: '8⭐' },
  { stars: 20, color: '#a78bfa', label: '20⭐' },
  { stars: 15, color: '#f472b6', label: '15⭐' },
]
const N   = SEGMENTS.length   // 6
const DEG = 360 / N           // 60°
const CX  = 110, CY = 110, R = 100

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

// Schedule decelerating tick sounds that mirror the wheel's ease-out curve.
// Returns an array of timeout IDs so they can be cancelled.
function scheduleWheelSounds(onDone, totalMs = 3600) {
  const ids = []
  let t = 0
  let interval = 65   // ms between ticks at the start (fast)

  // Phase 1: tick sounds while spinning (stop 500ms before end for suspense gap)
  while (t < totalMs - 500) {
    const delay = t
    ids.push(setTimeout(() => sounds.wheelTick(), delay))
    t += interval
    // Gradually lengthen intervals (ease out)
    interval = Math.min(65 + Math.pow(t / (totalMs - 500), 2.2) * 320, 380)
  }

  // Phase 2: suspense swoop at ~t-450ms
  ids.push(setTimeout(() => sounds.wheelSuspense(), totalMs - 450))

  // Phase 3: reveal fanfare exactly when result is shown
  ids.push(setTimeout(() => {
    sounds.wheelReveal()
    celebrateGoal()
    onDone()
  }, totalMs))

  return ids
}

export default function SpinWheelModal() {
  const { children, closeModal, modalData, adjustStars, addTransaction } = useApp()
  const { childId, childName } = modalData || {}

  const child    = children.find((c) => c.id === childId)
  const balance  = child?.starBalance ?? 0
  const canSpin  = balance >= SPIN_COST

  const [spinning, setSpinning]   = useState(false)
  const [result,   setResult]     = useState(null)   // winning segment
  const [paid,     setPaid]       = useState(false)  // true after deducting cost
  const wheelRef = useRef(null)
  const tickIds  = useRef([])

  function spin() {
    if (spinning || result || !canSpin) return
    setSpinning(true)

    // Deduct cost immediately
    adjustStars(childId, -SPIN_COST)
    addTransaction(childId, {
      type: 'convert_out',
      amount: SPIN_COST,
      currency: 'stars',
      description: `🎰 גלגל המזל — שולמו ${SPIN_COST}⭐`,
    })
    setPaid(true)

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

    tickIds.current = scheduleWheelSounds(() => {
      setSpinning(false)
      setResult(SEGMENTS[winner])
    })
  }

  function handleClaim() {
    if (!result) return
    adjustStars(childId, result.stars)
    addTransaction(childId, {
      type: 'chore',
      amount: result.stars,
      currency: 'stars',
      description: `🎰 גלגל המזל — זכה ב-${result.stars}⭐`,
    })
    sounds.goal()
    closeModal()
  }

  // Clean up pending timeouts if modal is closed mid-spin
  function handleClose() {
    tickIds.current.forEach(clearTimeout)
    closeModal()
  }

  const net = result ? result.stars - SPIN_COST : null

  return (
    <Modal title="🎰 גלגל המזל" onClose={handleClose} headerColor="from-violet-500 to-purple-700">
      <div className="flex flex-col items-center gap-4 pb-1">

        {/* Balance + cost info */}
        <div className="flex items-center gap-3 w-full justify-center">
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
            <span className="text-base">⭐</span>
            <span className="text-sm font-bold text-amber-700">{formatNumber(balance)}</span>
          </div>
          <span className="text-gray-300 text-lg">→</span>
          <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-xl px-3 py-1.5">
            <span className="text-xs font-semibold text-violet-600">עלות סיבוב:</span>
            <span className="text-sm font-bold text-violet-700">{SPIN_COST}⭐</span>
          </div>
        </div>

        {/* Wheel + pointer */}
        <div className="relative" style={{ width: 220, height: 232 }}>
          {/* Pointer */}
          <div
            className="absolute top-0 left-1/2 z-10"
            style={{
              transform: 'translateX(-50%) translateY(-2px)',
              width: 0, height: 0,
              borderLeft:  '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop:   '22px solid #6d28d9',
              filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
            }}
          />

          <svg
            ref={wheelRef}
            width={220}
            height={220}
            style={{ display: 'block', willChange: 'transform', marginTop: 12 }}
          >
            {SEGMENTS.map((seg, i) => {
              const lp = labelPos(i)
              return (
                <g key={i}>
                  <path d={segPath(i)} fill={seg.color} stroke="white" strokeWidth={2.5} />
                  <text
                    x={lp.x} y={lp.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={14} fontWeight="bold" fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {seg.label}
                  </text>
                </g>
              )
            })}
            {/* Hub */}
            <circle cx={CX} cy={CY} r={20} fill="white" stroke="#ddd6fe" strokeWidth={2.5} />
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize={18}>🎰</text>
          </svg>
        </div>

        {/* Result or spin area */}
        {result ? (
          <div className="text-center animate-bounce-in w-full space-y-2">
            <div className="text-5xl">🎉</div>
            <p className="text-xl font-black text-gray-800">
              {childName || 'ילד'} זכה ב-{result.stars}⭐!
            </p>
            <p className={`text-sm font-bold ${net > 0 ? 'text-emerald-600' : net === 0 ? 'text-gray-500' : 'text-rose-500'}`}>
              {net > 0 ? `רווח נקי: +${net}⭐` : net === 0 ? 'יצאת בדיוק בשוויון' : `הפסד נקי: ${net}⭐`}
            </p>
            <Button size="lg" fullWidth onClick={handleClaim} className="mt-1">
              ✅ קח את הפרס — {result.stars}⭐
            </Button>
          </div>
        ) : (
          <div className="w-full space-y-2">
            {!canSpin && (
              <p className="text-center text-sm text-rose-500 font-semibold bg-rose-50 rounded-xl py-2">
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
              {spinning ? '🎰 מסתובב...' : `🎰 סובב! (${SPIN_COST}⭐)`}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
