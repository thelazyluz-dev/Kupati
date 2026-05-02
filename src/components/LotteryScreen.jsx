import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { generateId, formatRelativeTime } from '../lib/utils.js'
import { sounds } from '../lib/sounds.js'

const CAGE_R  = 138   // cage circle radius (px)
const BALL_D  = 56    // ball diameter (px)
const BALL_R  = BALL_D / 2

function initBall(p, idx, total) {
  const angle = (idx / total) * Math.PI * 2 + Math.random() * 0.3
  const dist  = (0.3 + Math.random() * 0.45) * (CAGE_R - BALL_R - 4)
  const speed = 1.2 + Math.random() * 0.8
  const dir   = Math.random() * Math.PI * 2
  return {
    ...p,
    x: CAGE_R + Math.cos(angle) * dist - BALL_R,
    y: CAGE_R + Math.sin(angle) * dist - BALL_R,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    alive: true,
    opacity: 1,
  }
}

function tickBalls(balls, speed) {
  return balls.map(ball => {
    if (!ball.alive) return ball
    let { x, y, vx, vy } = ball

    x += vx * speed
    y += vy * speed

    const dx = (x + BALL_R) - CAGE_R
    const dy = (y + BALL_R) - CAGE_R
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = CAGE_R - BALL_R - 2

    if (dist > maxDist) {
      const nx = dx / dist
      const ny = dy / dist
      const dot = vx * nx + vy * ny
      vx = vx - 2 * dot * nx + (Math.random() - 0.5) * 0.15
      vy = vy - 2 * dot * ny + (Math.random() - 0.5) * 0.15
      x -= nx * (dist - maxDist)
      y -= ny * (dist - maxDist)
      if (speed > 1.5) sounds.wheelTick()
    }

    return { ...ball, x, y, vx, vy }
  })
}

function Ball({ ball }) {
  return (
    <div
      className="absolute flex items-center justify-center rounded-full shadow-lg transition-opacity duration-500 select-none pointer-events-none overflow-hidden"
      style={{
        width: BALL_D, height: BALL_D,
        left: ball.x, top: ball.y,
        opacity: ball.opacity,
        background: ball.alive
          ? 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 60%, transparent 100%), linear-gradient(135deg, #fbbf24, #f59e0b)'
          : 'transparent',
        boxShadow: ball.alive ? '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.4)' : 'none',
        transform: ball.alive ? 'scale(1)' : 'scale(0)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      {ball.alive && (
        ball.avatarImage
          ? <img src={ball.avatarImage} alt={ball.name} className="w-full h-full object-cover rounded-full" />
          : <span style={{ fontSize: BALL_D * 0.52 }} className="leading-none">{ball.avatar}</span>
      )}
    </div>
  )
}

function HistoryEntry({ entry }) {
  const { winner, participants, timestamp } = entry
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0">
      <div className="w-9 h-9 rounded-full bg-yellow-400/20 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
        {winner.avatarImage
          ? <img src={winner.avatarImage} className="w-full h-full object-cover rounded-full" />
          : <span>{winner.avatar}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{winner.name}</p>
        <p className="text-[10px] text-white/40 truncate">
          {participants.map(p => p.name).join(' · ')}
        </p>
      </div>
      <span className="text-[10px] text-white/30 flex-shrink-0">{formatRelativeTime(timestamp)}</span>
    </div>
  )
}

export default function LotteryScreen({ onClose }) {
  const { children } = useApp()
  const [history, setHistory] = useLocalStorage('lottery_history', [])

  const [participants, setParticipants] = useState(() =>
    children.map(c => ({ id: c.id, name: c.name, avatar: c.avatar || '🎯', avatarImage: c.avatarImage || null, active: true }))
  )
  const [guestName, setGuestName]     = useState('')
  const [showGuest, setShowGuest]     = useState(false)
  const [phase, setPhase]             = useState('idle')
  const [winner, setWinner]           = useState(null)
  const [balls, setBalls]             = useState([])
  const [showHistory, setShowHistory] = useState(false)

  const ballsRef  = useRef([])
  const rafRef    = useRef(null)
  const speedRef  = useRef(1)
  const phaseRef  = useRef('idle')

  const activeParts = participants.filter(p => p.active)

  // ── Init balls ──────────────────────────────────────────────────────────
  const resetBalls = useCallback((parts) => {
    const bs = parts.map((p, i) => initBall(p, i, parts.length))
    ballsRef.current = bs
    setBalls([...bs])
  }, [])

  useEffect(() => {
    if (phaseRef.current === 'idle') resetBalls(activeParts)
  }, [participants]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    resetBalls(activeParts)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animation loop ──────────────────────────────────────────────────────
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

  // ── Draw ────────────────────────────────────────────────────────────────
  function startDraw() {
    if (activeParts.length < 2 || phaseRef.current !== 'idle') return
    setPhase('drawing')
    phaseRef.current = 'drawing'
    speedRef.current = 3.5

    // Rising tick rhythm
    let t = 0
    const ticks = [0, 100, 190, 270, 340, 400, 450, 490, 525, 555, 580, 600, 618, 634, 648]
    ticks.forEach(ms => setTimeout(() => sounds.wheelTick(), ms))

    setTimeout(() => {
      sounds.wheelSuspense()
      speedRef.current = 2
      doEliminate([...activeParts])
    }, 1800)
  }

  function doEliminate(parts) {
    const winnerPart = parts[Math.floor(Math.random() * parts.length)]
    const losers     = parts.filter(p => p.id !== winnerPart.id)
      .sort(() => Math.random() - 0.5)

    let i = 0
    function next() {
      if (i >= losers.length) {
        setTimeout(() => doReveal(winnerPart), 400)
        return
      }
      const dead = losers[i++]
      ballsRef.current = ballsRef.current.map(b =>
        b.id === dead.id ? { ...b, alive: false, opacity: 0 } : b
      )
      setBalls([...ballsRef.current])
      sounds.tap()
      setTimeout(next, 280 + Math.random() * 160)
    }
    next()
  }

  function doReveal(winnerPart) {
    speedRef.current = 0
    phaseRef.current = 'result'
    setWinner(winnerPart)
    setPhase('result')
    sounds.wheelReveal()
    setTimeout(() => sounds.goal(), 400)

    const entry = {
      id:           generateId(),
      winner:       { name: winnerPart.name, avatar: winnerPart.avatar, avatarImage: winnerPart.avatarImage },
      participants: activeParts.map(p => ({ name: p.name, avatar: p.avatar })),
      timestamp:    Date.now(),
    }
    setHistory(prev => [entry, ...prev].slice(0, 30))
  }

  function reset() {
    setPhase('idle')
    phaseRef.current = 'idle'
    speedRef.current = 1
    setWinner(null)
    resetBalls(activeParts)
  }

  function toggleParticipant(id) {
    if (phase !== 'idle') return
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p))
  }

  function addGuest() {
    const name = guestName.trim()
    if (!name) return
    const guest = { id: `guest_${Date.now()}`, name, avatar: '👤', avatarImage: null, active: true, isGuest: true }
    setParticipants(prev => [...prev, guest])
    setGuestName('')
    setShowGuest(false)
  }

  function removeGuest(id) {
    setParticipants(prev => prev.filter(p => p.id !== id))
  }

  const cageSize = CAGE_R * 2

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
         style={{ background: 'linear-gradient(160deg, #0a0a1a 0%, #0d1a0d 50%, #0a0a1a 100%)' }}>

      {/* Stars background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 40 }, (_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
               style={{
                 width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
                 left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                 opacity: Math.random() * 0.5 + 0.1,
                 animation: `pulse-ring ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite`,
               }} />
        ))}
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 pt-10 pb-4 shrink-0">
        <button onClick={onClose}
          className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white font-bold text-lg active:scale-90">
          ×
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black text-yellow-300 tracking-wide" style={{ textShadow: '0 0 20px rgba(251,191,36,0.6)' }}>
            🎱 הגרלה
          </h1>
        </div>
        <button onClick={() => setShowHistory(v => !v)}
          className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white text-base active:scale-90">
          🕐
        </button>
      </div>

      {/* Participants */}
      <div className="px-4 mb-3 shrink-0">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {participants.map(p => (
            <button key={p.id}
              onClick={() => toggleParticipant(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                p.active
                  ? 'bg-yellow-400/90 text-black shadow-md shadow-yellow-400/30'
                  : 'bg-white/10 text-white/40 line-through'
              }`}
            >
              {p.avatarImage
                ? <img src={p.avatarImage} className="w-4 h-4 rounded-full object-cover" />
                : <span className="text-sm">{p.avatar}</span>}
              {p.name}
              {p.isGuest && (
                <span className="ml-0.5 text-[10px] opacity-60"
                  onClick={e => { e.stopPropagation(); removeGuest(p.id) }}>✕</span>
              )}
            </button>
          ))}
          {!showGuest ? (
            <button onClick={() => setShowGuest(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white/60 active:scale-95">
              + אורח
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input autoFocus value={guestName} onChange={e => setGuestName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addGuest()}
                placeholder="שם האורח"
                className="w-24 px-2 py-1 rounded-full text-xs bg-white/15 text-white placeholder-white/30 outline-none border border-white/20 text-right"
              />
              <button onClick={addGuest}
                className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center active:scale-90">
                ✓
              </button>
              <button onClick={() => { setShowGuest(false); setGuestName('') }}
                className="w-6 h-6 rounded-full bg-white/10 text-white/50 text-xs flex items-center justify-center active:scale-90">
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cage */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="relative" style={{ width: cageSize, height: cageSize }}>
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full pointer-events-none"
               style={{ boxShadow: phase === 'drawing'
                 ? '0 0 40px rgba(251,191,36,0.35), 0 0 80px rgba(251,191,36,0.15), inset 0 0 40px rgba(0,0,0,0.6)'
                 : '0 0 20px rgba(251,191,36,0.15), inset 0 0 40px rgba(0,0,0,0.6)',
                 transition: 'box-shadow 0.5s ease',
               }} />
          {/* Cage border */}
          <div className="absolute inset-0 rounded-full"
               style={{
                 border: '3px solid',
                 borderColor: phase === 'drawing' ? 'rgba(251,191,36,0.7)' : 'rgba(251,191,36,0.3)',
                 transition: 'border-color 0.5s ease',
                 background: 'radial-gradient(circle, rgba(0,40,0,0.7) 0%, rgba(0,10,0,0.9) 100%)',
               }} />
          {/* Cage mesh lines */}
          <svg className="absolute inset-0 pointer-events-none" width={cageSize} height={cageSize}>
            <defs>
              <clipPath id="cage-clip">
                <circle cx={CAGE_R} cy={CAGE_R} r={CAGE_R - 3} />
              </clipPath>
            </defs>
            <g clipPath="url(#cage-clip)" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none">
              {Array.from({ length: 7 }, (_, i) => {
                const x = (i + 1) * (cageSize / 8)
                return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={cageSize} />
              })}
              {Array.from({ length: 7 }, (_, i) => {
                const y = (i + 1) * (cageSize / 8)
                return <line key={`h${i}`} x1={0} y1={y} x2={cageSize} y2={y} />
              })}
            </g>
          </svg>

          {/* Balls */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            {balls.map(ball => <Ball key={ball.id} ball={ball} />)}
          </div>

          {/* Winner overlay */}
          {phase === 'result' && winner && (
            <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center z-10 animate-bounce-in"
                 style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.7) 0%, transparent 70%)' }}>
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-yellow-300 shadow-[0_0_30px_rgba(251,191,36,0.8)] animate-pulse-gold">
                {winner.avatarImage
                  ? <img src={winner.avatarImage} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-yellow-400/30 flex items-center justify-center text-5xl">
                      {winner.avatar}
                    </div>}
              </div>
              <p className="text-white font-black text-xl mt-2" style={{ textShadow: '0 0 10px rgba(251,191,36,0.8)' }}>
                {winner.name}
              </p>
              <p className="text-yellow-300/70 text-xs mt-0.5">🏆 זוכה!</p>
            </div>
          )}
        </div>

        {/* Draw / Again button */}
        <div className="flex gap-3">
          {phase === 'idle' && (
            <button
              onClick={startDraw}
              disabled={activeParts.length < 2}
              className="px-10 py-3.5 rounded-2xl font-black text-lg text-black active:scale-95 transition-all disabled:opacity-30"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                boxShadow: '0 4px 20px rgba(251,191,36,0.4), 0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              🎱 הגרל!
            </button>
          )}
          {phase === 'drawing' && (
            <div className="px-10 py-3.5 rounded-2xl font-black text-lg text-black/70 animate-pulse"
                 style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
              מגריל...
            </div>
          )}
          {phase === 'result' && (
            <button onClick={reset}
              className="px-10 py-3.5 rounded-2xl font-black text-base text-white active:scale-95 transition-all"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
              🔄 הגרלה נוספת
            </button>
          )}
        </div>
      </div>

      {/* History */}
      {showHistory && (
        <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl p-5"
             style={{ background: 'rgba(10,10,26,0.96)', backdropFilter: 'blur(20px)', border: '1px solid rgba(251,191,36,0.2)', maxHeight: '60vh', overflowY: 'auto' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-yellow-300 text-sm">🕐 היסטוריה</h3>
            <button onClick={() => setShowHistory(false)} className="text-white/40 text-lg w-7 h-7 flex items-center justify-center">×</button>
          </div>
          {history.length === 0
            ? <p className="text-white/30 text-sm text-center py-4">עדיין לא הייתה הגרלה</p>
            : history.map(e => <HistoryEntry key={e.id} entry={e} />)
          }
        </div>
      )}
    </div>
  )
}
