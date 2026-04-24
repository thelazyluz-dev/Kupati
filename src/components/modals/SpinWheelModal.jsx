import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Button from '../ui/Button.jsx'
import { sounds } from '../../lib/sounds.js'
import { celebrateGoal } from '../../lib/confetti.js'
import { formatNumber } from '../../lib/utils.js'

const SPIN_COST = 12   // stars to pay per spin

// Warm colors → stars (★), cool/green colors → shekels (₪)
const SEGMENTS = [
  { stars:   3,  color: '#f97316', label1: '3',  label2: '★' },
  { shekels: 1,  color: '#10b981', label1: '1',  label2: '₪' },
  { stars:   5,  color: '#eab308', label1: '5',  label2: '★' },
  { shekels: 2,  color: '#06b6d4', label1: '2',  label2: '₪' },
  { stars:   10, color: '#8b5cf6', label1: '10', label2: '★' },
  { shekels: 5,  color: '#34d399', label1: '5',  label2: '₪' },
  { stars:   8,  color: '#ec4899', label1: '8',  label2: '★' },
  { shekels: 10, color: '#14b8a6', label1: '10', label2: '₪' },
  { stars:   20, color: '#f59e0b', label1: '20', label2: '★' },
  { shekels: 20, color: '#22c55e', label1: '20', label2: '₪' },
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
  const [usedFree, setUsedFree] = useState(false)
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
    if (result.shekels != null) {
      adjustShekels(childId, result.shekels)
      addTransaction(childId, { type: 'wheel_win', amount: result.shekels, currency: 'shekels', description: `🎰 גלגל המזל — זכייה` })
    } else {
      adjustStars(childId, result.stars)
      addTransaction(childId, { type: 'wheel_win', amount: result.stars, currency: 'stars', description: `🎰 גלגל המזל — זכייה` })
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
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-violet-900 to-purple-950 text-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        <div className="w-10" />
        <h1 className="text-base font-black tracking-wide">🎰 גלגל המזל</h1>
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-2xl font-bold active:scale-90 transition-all leading-none"
          aria-label="סגור"
        >
          ×
        </button>
      </div>

      {/* Body — 3-zone layout that always fits on screen without scrolling */}
      <div className="flex-1 flex flex-col items-center gap-3 px-4 pb-4 min-h-0">

        {/* Zone 1: top info — balance/freespin OR result badge */}
        <div className="w-full max-w-sm flex-shrink-0">
          {result ? (
            <div className="bg-white/10 rounded-2xl px-4 py-2.5 text-center animate-bounce-in">
              <p className="text-lg font-black leading-tight">🎉 {childName || 'ילד'} זכה ב-{rewardLabel}!</p>
              {result.shekels != null ? (
                <p className="text-xs font-bold text-emerald-300 mt-0.5">💵 הכסף נוסף לחשבון!</p>
              ) : net != null && (
                <p className={`text-xs font-bold mt-0.5 ${net > 0 ? 'text-emerald-300' : net === 0 ? 'text-gray-300' : 'text-rose-300'}`}>
                  {usedFree ? `🎁 רווח נקי: +${result.stars}⭐` : net > 0 ? `רווח נקי: +${net}⭐` : net === 0 ? 'יצאת בשוויון' : `הפסד נקי: ${net}⭐`}
                </p>
              )}
            </div>
          ) : freeSpins > 0 ? (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl px-3 py-2 flex items-center gap-2 text-white shadow-md animate-pop">
              <span className="text-lg">🎁</span>
              <p className="font-black text-sm flex-1">
                {freeSpins > 1 ? `${freeSpins} סיבובים חינמיים!` : 'סיבוב מתנה על 5 מטלות!'}
              </p>
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
                <div className={`text-sm font-black ${isFree ? 'text-green-700' : 'text-violet-700'}`}>
                  {isFree ? '🎁 חינם!' : `⭐ ${SPIN_COST}`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Zone 2: wheel — fixed size, takes flex space */}
        <div className="flex-1 flex items-center justify-center min-h-0">
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
                    {/* Number */}
                    <text
                      x={lp.x} y={lp.y - 7}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={15} fontWeight="bold" fill="white"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >{seg.label1}</text>
                    {/* Type indicator: ★ for stars, ₪ for shekels */}
                    <text
                      x={lp.x} y={lp.y + 9}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={13} fontWeight="bold" fill="white"
                      style={{ pointerEvents: 'none', userSelect: 'none', opacity: 0.9 }}
                    >{seg.label2}</text>
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
            <Button size="lg" fullWidth onClick={handleClaim}>
              ✅ קח את הפרס — {rewardLabel}
            </Button>
          ) : (
            <Button
              size="lg"
              fullWidth
              onClick={spin}
              disabled={spinning || !canSpin}
              className={spinning ? 'opacity-60 cursor-not-allowed' : ''}
            >
              {spinning ? '🎰 מסתובב...' : isFree ? '🎁 סובב חינם!' : `🎰 סובב! (${SPIN_COST}⭐)`}
            </Button>
          )}
        </div>

      </div>
    </div>
  )
}
