import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { sounds } from '../../lib/sounds.js'
import { celebrateGoal } from '../../lib/confetti.js'

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

// Polar → SVG xy (angle from 12-o'clock, clockwise)
function polar(deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) }
}

// SVG pie-slice path for segment i
function segPath(i) {
  const s = polar(i * DEG)
  const e = polar((i + 1) * DEG)
  return `M${CX},${CY} L${s.x.toFixed(2)},${s.y.toFixed(2)} A${R},${R},0,0,1,${e.x.toFixed(2)},${e.y.toFixed(2)} Z`
}

// Label position (65% radius, at segment midpoint)
function labelPos(i) {
  const mid = polar(i * DEG + DEG / 2)
  return { x: CX + (mid.x - CX) * 0.65, y: CY + (mid.y - CY) * 0.65 }
}

export default function SpinWheelModal() {
  const { closeModal, modalData, addStars, addTransaction } = useApp()
  const { childId, childName } = modalData || {}
  const [spinning, setSpinning] = useState(false)
  const [result, setResult]     = useState(null)
  const wheelRef = useRef(null)

  function spin() {
    if (spinning || result) return
    setSpinning(true)

    const winner     = Math.floor(Math.random() * N)
    const segCenter  = winner * DEG + DEG / 2   // winner's center angle in wheel coords
    const finalAngle = 360 * 6 + (360 - segCenter)  // rotate so winner lands at top

    const el = wheelRef.current
    if (el) {
      el.style.transition = 'none'
      el.style.transform  = 'rotate(0deg)'
      void el.getBoundingClientRect()  // force reflow before enabling transition
      el.style.transition = 'transform 3.5s cubic-bezier(0.1, 0.4, 0.15, 1)'
      el.style.transform  = `rotate(${finalAngle}deg)`
    }

    setTimeout(() => {
      setSpinning(false)
      setResult(SEGMENTS[winner])
      sounds.star?.()
      celebrateGoal()
    }, 3600)
  }

  function handleClaim() {
    if (!result) return
    addStars(childId, result.stars)
    addTransaction(childId, {
      type: 'chore',
      amount: result.stars,
      currency: 'stars',
      description: `🎰 הפתעה! זכה ב-${result.stars}⭐`,
    })
    sounds.goal?.()
    closeModal()
  }

  return (
    <Modal title="🎰 גלגל ההפתעות" onClose={closeModal} headerColor="from-violet-500 to-purple-600">
      <div className="flex flex-col items-center gap-5 pb-1">

        {/* Wheel + fixed pointer */}
        <div className="relative" style={{ width: 220, height: 230 }}>
          {/* Pointer arrow */}
          <div
            className="absolute top-0 left-1/2 z-10"
            style={{
              transform: 'translateX(-50%) translateY(-2px)',
              width: 0, height: 0,
              borderLeft:  '9px solid transparent',
              borderRight: '9px solid transparent',
              borderTop:   '20px solid #7c3aed',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
            }}
          />

          {/* Wheel SVG — rotated via ref */}
          <svg
            ref={wheelRef}
            width={220}
            height={220}
            style={{ display: 'block', willChange: 'transform', marginTop: 10 }}
          >
            {SEGMENTS.map((seg, i) => {
              const lp = labelPos(i)
              return (
                <g key={i}>
                  <path
                    d={segPath(i)}
                    fill={seg.color}
                    stroke="white"
                    strokeWidth={2}
                  />
                  <text
                    x={lp.x}
                    y={lp.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={13}
                    fontWeight="bold"
                    fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {seg.label}
                  </text>
                </g>
              )
            })}
            {/* Center hub */}
            <circle cx={CX} cy={CY} r={18} fill="white" stroke="#e2e8f0" strokeWidth={2} />
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize={18}>🎰</text>
          </svg>
        </div>

        {/* Result or spin button */}
        {result ? (
          <div className="text-center animate-bounce-in w-full">
            <div className="text-5xl mb-2">🎉</div>
            <p className="text-xl font-black text-gray-800">
              {childName || 'ילד'} זכה ב-{result.stars}⭐!
            </p>
            <p className="text-sm text-gray-400 mt-0.5 mb-4">לחץ כדי להוסיף את הכוכבים</p>
            <Button size="lg" fullWidth onClick={handleClaim}>
              ✅ הוסף {result.stars}⭐
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            fullWidth
            onClick={spin}
            disabled={spinning}
            className={spinning ? 'opacity-60 cursor-not-allowed' : ''}
          >
            {spinning ? '🎰 מסתובב...' : '🎰 סובב את הגלגל!'}
          </Button>
        )}
      </div>
    </Modal>
  )
}
