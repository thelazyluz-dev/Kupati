import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { generateId, formatRelativeTime } from '../lib/utils.js'
import { sounds } from '../lib/sounds.js'
import { COLOR_OPTIONS } from '../lib/defaults.js'

// ── Constants ──────────────────────────────────────────────────────────────
const CAGE_R = 138
const BALL_D = 58
const BALL_R = BALL_D / 2

const BALL_COLORS = {
  purple:  { bg: 'linear-gradient(145deg,#d8b4fe,#7c3aed)', glow: 'rgba(139,92,246,.7)'  },
  pink:    { bg: 'linear-gradient(145deg,#f9a8d4,#db2777)', glow: 'rgba(236,72,153,.7)'  },
  amber:   { bg: 'linear-gradient(145deg,#fde68a,#d97706)', glow: 'rgba(245,158,11,.7)'  },
  emerald: { bg: 'linear-gradient(145deg,#6ee7b7,#059669)', glow: 'rgba(16,185,129,.7)'  },
  sky:     { bg: 'linear-gradient(145deg,#7dd3fc,#2563eb)', glow: 'rgba(59,130,246,.7)'  },
  red:     { bg: 'linear-gradient(145deg,#fca5a5,#dc2626)', glow: 'rgba(220,38,38,.7)'   },
  lime:    { bg: 'linear-gradient(145deg,#d9f99d,#16a34a)', glow: 'rgba(22,163,74,.7)'   },
  cyan:    { bg: 'linear-gradient(145deg,#a5f3fc,#0284c7)', glow: 'rgba(2,132,199,.7)'   },
  fuchsia: { bg: 'linear-gradient(145deg,#f0abfc,#9333ea)', glow: 'rgba(147,51,234,.7)'  },
  yellow:  { bg: 'linear-gradient(145deg,#fef08a,#ca8a04)', glow: 'rgba(202,138,4,.7)'   },
}
const FALLBACK_COLORS = [
  { bg: 'linear-gradient(145deg,#fca5a5,#dc2626)', glow: 'rgba(220,38,38,.7)'  },
  { bg: 'linear-gradient(145deg,#7dd3fc,#2563eb)', glow: 'rgba(59,130,246,.7)' },
  { bg: 'linear-gradient(145deg,#6ee7b7,#059669)', glow: 'rgba(16,185,129,.7)' },
  { bg: 'linear-gradient(145deg,#fde68a,#d97706)', glow: 'rgba(245,158,11,.7)' },
  { bg: 'linear-gradient(145deg,#d8b4fe,#7c3aed)', glow: 'rgba(139,92,246,.7)' },
]
const SUITS = ['♠','♥','♦','♣']

function getBallColor(p, idx) {
  if (p.colorKey && BALL_COLORS[p.colorKey]) return BALL_COLORS[p.colorKey]
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

// ── Physics ────────────────────────────────────────────────────────────────
function initBall(p, idx, total) {
  const angle = (idx / total) * Math.PI * 2 + Math.random() * 0.4
  const dist  = (0.3 + Math.random() * 0.45) * (CAGE_R - BALL_R - 4)
  const speed = 1.0 + Math.random() * 0.7
  const dir   = Math.random() * Math.PI * 2
  const color = getBallColor(p, idx)
  return {
    ...p, color,
    x: CAGE_R + Math.cos(angle) * dist - BALL_R,
    y: CAGE_R + Math.sin(angle) * dist - BALL_R,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    alive: true, popping: false, opacity: 1, scale: 1,
  }
}

function tickBalls(balls, speed) {
  return balls.map(ball => {
    if (!ball.alive || ball.popping) return ball
    let { x, y, vx, vy } = ball
    x += vx * speed
    y += vy * speed
    const dx = (x + BALL_R) - CAGE_R
    const dy = (y + BALL_R) - CAGE_R
    const dist = Math.sqrt(dx * dx + dy * dy)
    const max  = CAGE_R - BALL_R - 2
    if (dist > max) {
      const nx = dx / dist, ny = dy / dist
      const dot = vx * nx + vy * ny
      vx = vx - 2 * dot * nx + (Math.random() - 0.5) * 0.12
      vy = vy - 2 * dot * ny + (Math.random() - 0.5) * 0.12
      x -= nx * (dist - max); y -= ny * (dist - max)
    }
    return { ...ball, x, y, vx, vy }
  })
}

// ── Ball component ─────────────────────────────────────────────────────────
function Ball({ ball }) {
  const showName = ball.isGuest || !ball.avatarImage
  return (
    <div
      className="absolute flex flex-col items-center justify-center rounded-full select-none pointer-events-none overflow-hidden"
      style={{
        width: BALL_D, height: BALL_D,
        left: ball.x, top: ball.y,
        opacity: ball.opacity,
        transform: `scale(${ball.scale})`,
        transition: ball.popping
          ? 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease'
          : 'opacity 0.2s ease',
        background: ball.color.bg,
        boxShadow: `0 3px 10px rgba(0,0,0,0.5), 0 0 12px ${ball.color.glow}, inset 0 1px 3px rgba(255,255,255,0.35)`,
        willChange: 'transform, opacity',
      }}
    >
      {/* Shine dot */}
      <div className="absolute rounded-full bg-white/40 pointer-events-none"
           style={{ width: BALL_D * 0.28, height: BALL_D * 0.28, top: '14%', left: '16%' }} />
      {/* Avatar or name */}
      {ball.avatarImage ? (
        <img src={ball.avatarImage} alt={ball.name}
          className="w-full h-full object-cover rounded-full" />
      ) : showName && !ball.isGuest ? (
        <span style={{ fontSize: BALL_D * 0.46 }} className="leading-none relative z-10">{ball.avatar}</span>
      ) : (
        <div className="flex flex-col items-center relative z-10">
          <span style={{ fontSize: BALL_D * 0.32 }} className="leading-none">{ball.avatar}</span>
          <span className="text-white font-black leading-none mt-0.5 drop-shadow"
                style={{ fontSize: Math.min(10, BALL_D * 0.17) }}>
            {ball.name.length > 5 ? ball.name.slice(0, 5) : ball.name}
          </span>
        </div>
      )}
    </div>
  )
}

// ── History entry ──────────────────────────────────────────────────────────
function HistoryEntry({ entry }) {
  const { winner, participants, timestamp } = entry
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0">
      <div className="w-10 h-10 rounded-full bg-yellow-500/20 ring-2 ring-yellow-500/40 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
        {winner.avatarImage
          ? <img src={winner.avatarImage} className="w-full h-full object-cover rounded-full" />
          : <span>{winner.avatar}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-yellow-300">{winner.name}</p>
        <p className="text-[10px] text-white/35 truncate mt-0.5">
          {participants.map(p => p.name).join(' · ')}
        </p>
      </div>
      <span className="text-[10px] text-white/25 flex-shrink-0">{formatRelativeTime(timestamp)}</span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function LotteryScreen({ onClose }) {
  const { children } = useApp()
  const [history, setHistory] = useLocalStorage('lottery_history', [])

  const [participants, setParticipants] = useState(() =>
    children.map((c, i) => ({
      id: c.id, name: c.name,
      avatar: c.avatar || '🎯',
      avatarImage: c.avatarImage || null,
      colorKey: c.colorKey || null,
      active: true,
    }))
  )
  const [guestName, setGuestName]     = useState('')
  const [showGuest, setShowGuest]     = useState(false)
  const [phase, setPhase]             = useState('idle')
  const [winner, setWinner]           = useState(null)
  const [balls, setBalls]             = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [spotlight, setSpotlight]     = useState(false)

  const ballsRef = useRef([])
  const rafRef   = useRef(null)
  const speedRef = useRef(1)
  const phaseRef = useRef('idle')

  const activeParts = participants.filter(p => p.active)

  // ── Init ─────────────────────────────────────────────────────────────────
  const resetBalls = useCallback((parts) => {
    const bs = parts.map((p, i) => initBall(p, i, parts.length))
    ballsRef.current = bs
    setBalls([...bs])
  }, [])

  useEffect(() => { resetBalls(activeParts) }, []) // eslint-disable-line
  useEffect(() => {
    if (phaseRef.current === 'idle') resetBalls(activeParts)
  }, [participants]) // eslint-disable-line

  // ── Animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    function tick() {
      if (phaseRef.current !== 'result') {
        const updated = tickBalls(ballsRef.current, speedRef.current)
        ballsRef.current = updated
        setBalls([...updated])
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // ── Draw sequence ─────────────────────────────────────────────────────────
  function startDraw() {
    if (activeParts.length < 2 || phaseRef.current !== 'idle') return
    setPhase('drawing'); phaseRef.current = 'drawing'
    speedRef.current = 4
    setSpotlight(false)

    // Escalating ticks
    const times = [0,80,155,225,290,350,405,455,500,540,575,605,630,652,672]
    times.forEach(ms => setTimeout(() => sounds.wheelTick(), ms))

    setTimeout(() => {
      sounds.wheelSuspense()
      speedRef.current = 2.5
      doEliminate([...activeParts])
    }, 1900)
  }

  function doEliminate(parts) {
    const winnerPart  = parts[Math.floor(Math.random() * parts.length)]
    const losers      = parts.filter(p => p.id !== winnerPart.id).sort(() => Math.random() - 0.5)
    let i = 0

    function next() {
      if (i >= losers.length) {
        // Slow down to a crawl before reveal
        speedRef.current = 0.6
        setTimeout(() => doReveal(winnerPart), 600)
        return
      }
      const dead = losers[i++]

      // Phase 1: scale up (pop)
      ballsRef.current = ballsRef.current.map(b =>
        b.id === dead.id ? { ...b, popping: true, scale: 1.5 } : b
      )
      setBalls([...ballsRef.current])

      // Phase 2: vanish
      setTimeout(() => {
        ballsRef.current = ballsRef.current.map(b =>
          b.id === dead.id ? { ...b, scale: 0, opacity: 0 } : b
        )
        setBalls([...ballsRef.current])
        sounds.tap()
      }, 180)

      const delay = i < 3 ? 500 : i < 6 ? 380 : 280
      setTimeout(next, delay + Math.random() * 120)
    }
    next()
  }

  function doReveal(winnerPart) {
    speedRef.current = 0
    phaseRef.current = 'result'
    setWinner(winnerPart)
    setPhase('result')
    setSpotlight(true)
    sounds.wheelReveal()
    setTimeout(() => sounds.goal(), 450)

    setHistory(prev => [{
      id: generateId(),
      winner: { name: winnerPart.name, avatar: winnerPart.avatar, avatarImage: winnerPart.avatarImage },
      participants: activeParts.map(p => ({ name: p.name, avatar: p.avatar })),
      timestamp: Date.now(),
    }, ...prev].slice(0, 30))
  }

  function reset() {
    setPhase('idle'); phaseRef.current = 'idle'
    speedRef.current = 1
    setWinner(null); setSpotlight(false)
    resetBalls(activeParts)
  }

  function toggleParticipant(id) {
    if (phase !== 'idle') return
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p))
  }

  function addGuest() {
    const name = guestName.trim()
    if (!name) return
    const idx = participants.filter(p => p.isGuest).length
    setParticipants(prev => [...prev, {
      id: `guest_${Date.now()}`, name, avatar: '👤',
      avatarImage: null, colorKey: null, active: true, isGuest: true,
    }])
    setGuestName(''); setShowGuest(false)
  }

  const cageSize = CAGE_R * 2

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
         style={{ background: 'linear-gradient(160deg, #0c0008 0%, #1a0008 40%, #080010 100%)' }}>

      {/* Casino felt texture overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
           style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff1 0px, transparent 1px, transparent 8px, #fff1 9px)' }} />

      {/* Floating card suits */}
      {SUITS.map((s, i) => (
        <div key={i} className="absolute pointer-events-none font-black select-none"
             style={{
               color: s === '♥' || s === '♦' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)',
               fontSize: 80 + (i % 3) * 40,
               left: `${[5, 70, 15, 78][i]}%`,
               top:  `${[10, 8, 65, 58][i]}%`,
               animation: `float ${4 + i * 0.7}s ease-in-out ${i * 0.9}s infinite`,
               transform: `rotate(${[-15, 10, 20, -8][i]}deg)`,
             }}>{s}</div>
      ))}

      {/* Neon border strips */}
      <div className="absolute top-0 inset-x-0 h-0.5 pointer-events-none"
           style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.6), transparent)' }} />
      <div className="absolute bottom-0 inset-x-0 h-0.5 pointer-events-none"
           style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.6), transparent)' }} />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 pt-10 pb-3 shrink-0">
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
          ×
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-widest"
              style={{ color: '#fbbf24', textShadow: '0 0 20px rgba(251,191,36,0.7), 0 0 40px rgba(251,191,36,0.3)' }}>
            🎱 JACKPOT
          </h1>
          <p className="text-[10px] tracking-[0.3em] text-white/30 font-bold mt-0.5">FAMILY LOTTERY</p>
        </div>
        <button onClick={() => setShowHistory(v => !v)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-base active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          🕐
        </button>
      </div>

      {/* Participants */}
      <div className="px-4 mb-2 shrink-0">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {participants.map(p => (
            <button key={p.id} onClick={() => toggleParticipant(p.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
              style={p.active ? {
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#000',
                boxShadow: '0 2px 10px rgba(251,191,36,0.4)',
              } : {
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.3)',
                textDecoration: 'line-through',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {p.avatarImage
                ? <img src={p.avatarImage} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                : <span className="text-sm flex-shrink-0">{p.avatar}</span>}
              <span>{p.name}</span>
              {p.isGuest && p.active && (
                <span className="opacity-50 text-[10px]"
                  onClick={e => { e.stopPropagation(); setParticipants(prev => prev.filter(x => x.id !== p.id)) }}>✕</span>
              )}
            </button>
          ))}

          {!showGuest ? (
            <button onClick={() => setShowGuest(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.12)' }}>
              + אורח
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input autoFocus value={guestName} onChange={e => setGuestName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addGuest()}
                placeholder="שם האורח"
                className="w-24 px-2 py-1 rounded-full text-xs outline-none text-right"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(251,191,36,0.4)', caretColor: '#fbbf24' }}
              />
              <button onClick={addGuest}
                className="w-6 h-6 rounded-full font-black text-xs flex items-center justify-center active:scale-90"
                style={{ background: '#fbbf24', color: '#000' }}>✓</button>
              <button onClick={() => { setShowGuest(false); setGuestName('') }}
                className="w-6 h-6 rounded-full text-xs flex items-center justify-center active:scale-90"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>✕</button>
            </div>
          )}
        </div>
      </div>

      {/* Cage */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="relative" style={{ width: cageSize, height: cageSize }}>

          {/* Spotlight beam from top (only in result) */}
          {spotlight && (
            <div className="absolute inset-0 rounded-full pointer-events-none animate-fade-in"
                 style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 10%, rgba(251,191,36,0.18) 0%, transparent 70%)' }} />
          )}

          {/* Outer ambient glow */}
          <div className="absolute pointer-events-none rounded-full transition-all duration-700"
               style={{
                 inset: -12,
                 boxShadow: phase === 'drawing'
                   ? '0 0 60px rgba(251,191,36,0.45), 0 0 120px rgba(251,191,36,0.2)'
                   : phase === 'result'
                   ? '0 0 80px rgba(251,191,36,0.6), 0 0 160px rgba(251,191,36,0.25)'
                   : '0 0 30px rgba(251,191,36,0.12)',
               }} />

          {/* Cage body */}
          <div className="absolute inset-0 rounded-full overflow-hidden"
               style={{
                 background: 'radial-gradient(circle at 50% 30%, rgba(60,20,0,0.5) 0%, rgba(10,0,0,0.92) 100%)',
                 border: '3px solid',
                 borderColor: phase === 'result' ? 'rgba(251,191,36,0.9)' : phase === 'drawing' ? 'rgba(251,191,36,0.65)' : 'rgba(251,191,36,0.35)',
                 transition: 'border-color 0.5s ease',
                 boxShadow: 'inset 0 0 40px rgba(0,0,0,0.7), inset 0 2px 8px rgba(255,255,255,0.06)',
               }}>
            {/* Glass dome highlight */}
            <div className="absolute inset-0 pointer-events-none rounded-full"
                 style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 8%, rgba(255,255,255,0.09) 0%, transparent 60%)' }} />
          </div>

          {/* Gold cage bars (3 arches) */}
          <svg className="absolute inset-0 pointer-events-none" width={cageSize} height={cageSize}>
            <defs>
              <clipPath id="lc"><circle cx={CAGE_R} cy={CAGE_R} r={CAGE_R - 4} /></clipPath>
            </defs>
            <g clipPath="url(#lc)" stroke="rgba(251,191,36,0.15)" strokeWidth="1.5" fill="none">
              {[-30, 0, 30].map(angle => {
                const rad = (angle * Math.PI) / 180
                const x1  = CAGE_R + Math.cos(rad - Math.PI / 2) * (CAGE_R - 4)
                const y1  = CAGE_R + Math.sin(rad - Math.PI / 2) * (CAGE_R - 4)
                const x2  = CAGE_R + Math.cos(rad + Math.PI / 2) * (CAGE_R - 4)
                const y2  = CAGE_R + Math.sin(rad + Math.PI / 2) * (CAGE_R - 4)
                return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} />
              })}
              <circle cx={CAGE_R} cy={CAGE_R} r={CAGE_R * 0.55} />
            </g>
          </svg>

          {/* Balls */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            {balls.map(ball => <Ball key={ball.id} ball={ball} />)}
          </div>

          {/* Winner overlay */}
          {phase === 'result' && winner && (
            <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center z-10 animate-bounce-in">
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-yellow-300 shadow-[0_0_40px_rgba(251,191,36,0.9)] animate-pulse-gold">
                {winner.avatarImage
                  ? <img src={winner.avatarImage} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"
                         style={{ background: getBallColor(winner, 0).bg }}>
                      <span style={{ fontSize: 52 }}>{winner.avatar}</span>
                    </div>}
              </div>
              <p className="font-black text-2xl mt-2"
                 style={{ color: '#fbbf24', textShadow: '0 0 15px rgba(251,191,36,0.9)' }}>
                {winner.name}
              </p>
              <p className="text-yellow-300/60 text-sm font-bold tracking-widest mt-0.5">🏆 WINNER</p>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="flex gap-3 items-center">
          {phase === 'idle' && (
            <button onClick={startDraw} disabled={activeParts.length < 2}
              className="px-12 py-4 rounded-2xl font-black text-xl text-black active:scale-95 transition-all disabled:opacity-30"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)',
                backgroundSize: '200% 100%',
                boxShadow: '0 4px 24px rgba(251,191,36,0.5), 0 1px 3px rgba(0,0,0,0.4)',
                letterSpacing: '0.05em',
              }}
            >
              🎱 הגרל!
            </button>
          )}
          {phase === 'drawing' && (
            <div className="px-12 py-4 rounded-2xl font-black text-xl text-black animate-pulse"
                 style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
              מגריל...
            </div>
          )}
          {phase === 'result' && (
            <button onClick={reset}
              className="px-10 py-3.5 rounded-2xl font-black text-base active:scale-95 transition-all"
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
              🔄 הגרלה נוספת
            </button>
          )}
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl p-5"
             style={{
               background: 'rgba(15,0,8,0.97)',
               backdropFilter: 'blur(20px)',
               border: '1px solid rgba(251,191,36,0.25)',
               borderBottom: 'none',
               maxHeight: '60vh', overflowY: 'auto',
             }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-yellow-300 text-sm tracking-wider">🕐 היסטוריה</h3>
            <button onClick={() => setShowHistory(false)}
              className="text-white/30 text-lg w-7 h-7 flex items-center justify-center">×</button>
          </div>
          {history.length === 0
            ? <p className="text-white/25 text-sm text-center py-6">עדיין לא הייתה הגרלה</p>
            : history.map(e => <HistoryEntry key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  )
}
