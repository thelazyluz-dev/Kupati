import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { generateId, formatRelativeTime } from '../lib/utils.js'
import { sounds } from '../lib/sounds.js'

const BULB_LIST = ['#ff2200','#ffd700','#00cc44','#0088ff','#ff00cc','#ffffff','#ff7700','#aa00ff']
const MAX_H = 180
const MIN_H = 48

const STICK_GRADS = [
  'linear-gradient(180deg,#ffe066 0%,#b8860b 40%,#d4a853 70%,#7a5200 100%)',
  'linear-gradient(180deg,#86efac 0%,#16a34a 40%,#4ade80 70%,#14532d 100%)',
  'linear-gradient(180deg,#93c5fd 0%,#2563eb 40%,#60a5fa 70%,#1e3a8a 100%)',
  'linear-gradient(180deg,#fca5a5 0%,#dc2626 40%,#f87171 70%,#7f1d1d 100%)',
  'linear-gradient(180deg,#d8b4fe 0%,#9333ea 40%,#c084fc 70%,#4c1d95 100%)',
  'linear-gradient(180deg,#f9a8d4 0%,#db2777 40%,#f472b6 70%,#831843 100%)',
]

const wait = ms => new Promise(r => setTimeout(r, ms))

function pickWinner(parts, history) {
  const lookback  = Math.min(history.length, parts.length * 3)
  const recent    = history.slice(0, lookback)
  const winCounts = Object.fromEntries(parts.map(p => [p.id, 0]))
  recent.forEach(h => {
    const match = parts.find(p => p.name === h.winner.name)
    if (match) winCounts[match.id] = (winCounts[match.id] || 0) + 1
  })
  const maxWins = Math.max(0, ...Object.values(winCounts))
  const weights  = parts.map(p => maxWins + 1 - (winCounts[p.id] || 0))
  const total    = weights.reduce((a, b) => a + b, 0)
  let rnd = Math.random() * total, wi = parts.length - 1
  for (let i = 0; i < weights.length; i++) { rnd -= weights[i]; if (rnd <= 0) { wi = i; break } }
  return wi
}

function BulbStrip({ count = 18, size = 9, gap = 5, duration = 1.6 }) {
  return (
    <div className="flex items-center justify-center pointer-events-none" style={{ gap }}>
      {Array.from({ length: count }, (_, i) => {
        const color = BULB_LIST[i % BULB_LIST.length]
        return (
          <div key={i} className="rounded-full flex-shrink-0"
               style={{
                 width: size, height: size, background: color,
                 boxShadow: `0 0 ${size * 0.7}px ${color}, 0 0 ${size * 1.4}px ${color}`,
                 animationName: 'bulb-chase', animationDuration: `${duration}s`,
                 animationDelay: `${-(i / count) * duration}s`,
                 animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
               }} />
        )
      })}
    </div>
  )
}

function HistoryEntry({ entry }) {
  const { winner, participants, timestamp } = entry
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0">
      <div className="w-10 h-10 rounded-full bg-yellow-500/20 ring-2 ring-yellow-500/40 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
        {winner.avatarImage
          ? <img src={winner.avatarImage} className="w-full h-full object-cover rounded-full" alt="" />
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

export default function LotteryScreen({ onClose }) {
  const { children } = useApp()
  const [history, setHistory] = useLocalStorage('lottery_history', [])

  const [participants, setParticipants] = useState(() =>
    children.map(c => ({
      id: c.id, name: c.name,
      avatar: c.avatar || '🎯',
      avatarImage: c.avatarImage || null,
      colorKey: c.colorKey || null,
      active: true,
    }))
  )
  const [guestName, setGuestName]   = useState('')
  const [showGuest, setShowGuest]   = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // ── Game state ──────────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState('idle')   // 'idle' | 'selecting' | 'done'
  const [heights, setHeights]       = useState({})       // id → height px (hidden until revealed)
  const [claimed, setClaimed]       = useState({})       // id → true  (avatar tapped)
  const [revealed, setRevealed]     = useState({})       // id → true  (stick tapped, length shown)
  const [revealingId, setRevealingId] = useState(null)   // id currently in reveal animation
  const [winner, setWinner]         = useState(null)
  const [winnerFlash, setWinnerFlash] = useState(false)

  const activeParts    = participants.filter(p => p.active)
  const revealedCount  = activeParts.filter(p => revealed[p.id]).length
  const claimedCount   = activeParts.filter(p => claimed[p.id]).length

  // ── Detect when all sticks are revealed → crown winner ─────────────────────
  useEffect(() => {
    if (phase !== 'selecting' || activeParts.length === 0) return
    if (!activeParts.every(p => revealed[p.id])) return

    const maxH = Math.max(...activeParts.map(p => heights[p.id]))
    const winnerPart = activeParts.find(p => heights[p.id] === maxH)

    setTimeout(() => {
      setWinner(winnerPart)
      setPhase('done')
      setWinnerFlash(true)
      sounds.wheelReveal()
      setTimeout(() => sounds.goal(), 450)
      setTimeout(() => setWinnerFlash(false), 900)

      setHistory(prev => [{
        id: generateId(),
        winner: { name: winnerPart.name, avatar: winnerPart.avatar, avatarImage: winnerPart.avatarImage },
        participants: activeParts.map(p => ({ name: p.name, avatar: p.avatar })),
        timestamp: Date.now(),
      }, ...prev].slice(0, 30))
    }, 700)
  }, [revealed]) // eslint-disable-line

  // ── Actions ─────────────────────────────────────────────────────────────────
  function toggleParticipant(id) {
    if (phase !== 'idle') return
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p))
  }

  function addGuest() {
    const name = guestName.trim()
    if (!name) return
    setParticipants(prev => [...prev, {
      id: `guest_${Date.now()}`, name, avatar: '👤',
      avatarImage: null, colorKey: null, active: true, isGuest: true,
    }])
    setGuestName(''); setShowGuest(false)
  }

  function startDraw() {
    if (activeParts.length < 2 || phase !== 'idle') return

    const wi         = pickWinner(activeParts, history)
    const winnerPart = activeParts[wi]

    const newHeights = {}
    activeParts.forEach(p => {
      newHeights[p.id] = p.id === winnerPart.id
        ? MAX_H
        : Math.round(MIN_H + Math.random() * (MAX_H - MIN_H - 20))
    })

    setHeights(newHeights)
    setClaimed({})
    setRevealed({})
    setWinner(null)
    setWinnerFlash(false)
    setRevealingId(null)
    setPhase('selecting')
    sounds.wheelTick()
    setTimeout(() => sounds.wheelTick(), 280)
  }

  function claimStick(id) {
    if (phase !== 'selecting' || claimed[id] || revealingId !== null) return
    setClaimed(prev => ({ ...prev, [id]: true }))
    sounds.lotteryPop()
  }

  async function revealStick(id) {
    if (phase !== 'selecting') return
    if (!claimed[id] || revealed[id] || revealingId !== null) return

    setRevealingId(id)
    sounds.wheelTick()
    await wait(300)
    sounds.wheelSuspense()
    await wait(950)

    setRevealed(prev => ({ ...prev, [id]: true }))
    sounds.lotteryPop()
    await wait(450)
    setRevealingId(null)
  }

  function reset() {
    setPhase('idle'); setWinner(null)
    setRevealed({}); setClaimed({}); setHeights({})
    setWinnerFlash(false); setRevealingId(null)
  }

  // ── Instruction text ────────────────────────────────────────────────────────
  let instruction = ''
  if (phase === 'selecting') {
    const remaining = activeParts.length - revealedCount
    if (revealedCount === 0 && claimedCount === 0)
      instruction = '👆 כל אחד לוחץ על התמונה שלו קודם'
    else if (claimedCount < activeParts.length)
      instruction = '👆 לחץ על התמונה שלך ▶ אז על המקל'
    else if (remaining === 1)
      instruction = '⚡ אחרון! לחץ על המקל שלך...'
    else
      instruction = '✊ לחץ על המקל שלך לחשיפה!'
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
         style={{ background: 'linear-gradient(160deg, #040001 0%, #180004 45%, #020008 100%)' }}>

      {/* Texture */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.015) 0px,transparent 1px,transparent 10px,rgba(255,255,255,0.015) 11px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.008) 0px,transparent 1px,transparent 10px,rgba(255,255,255,0.008) 11px)' }} />

      {/* Neon borders */}
      <div className="absolute top-0 inset-x-0 h-0.5 pointer-events-none"
           style={{ background: 'linear-gradient(90deg,transparent,rgba(251,191,36,0.8),rgba(255,50,50,0.6),rgba(251,191,36,0.8),transparent)' }} />
      <div className="absolute bottom-0 inset-x-0 h-0.5 pointer-events-none"
           style={{ background: 'linear-gradient(90deg,transparent,rgba(251,191,36,0.8),rgba(255,50,50,0.6),rgba(251,191,36,0.8),transparent)' }} />

      {/* Winner flash */}
      {winnerFlash && (
        <div className="absolute inset-0 z-[55] pointer-events-none"
             style={{ background: 'rgba(251,191,36,0.18)', animationName: 'winner-flash', animationDuration: '0.9s', animationFillMode: 'forwards', animationTimingFunction: 'ease-out' }} />
      )}

      {/* ── Header ── */}
      <div className="relative flex items-center justify-between px-5 pt-10 pb-1 shrink-0">
        <button onClick={phase === 'idle' ? onClose : reset}
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {phase === 'idle' ? '×' : '↩'}
        </button>
        <div className="text-center">
          <div className="inline-block px-4 py-1 rounded-xl mb-0.5"
               style={{ border: '2px solid rgba(251,191,36,0.6)', animationName: 'neon-sign-glow', animationDuration: '2.5s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }}>
            <h1 className="text-2xl font-black tracking-widest"
                style={{ color: '#fbbf24', animationName: 'neon-flicker', animationDuration: '6s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}>
              🎯 מקלות
            </h1>
          </div>
          <p className="text-[10px] tracking-[0.35em] font-bold"
             style={{ color: 'rgba(255,100,100,0.7)' }}>LUCKY STRAW · DRAW</p>
        </div>
        <button onClick={() => setShowHistory(v => !v)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-base active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          🕐
        </button>
      </div>

      {/* Bulb strip */}
      <div className="shrink-0 py-2">
        <BulbStrip count={18} size={9} gap={5} duration={1.6} />
      </div>

      {/* ── Participant chips (idle only) ── */}
      {phase === 'idle' && (
        <div className="px-4 mb-2 shrink-0">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {participants.map(p => (
              <button key={p.id} onClick={() => toggleParticipant(p.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
                style={p.active ? {
                  background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#000',
                  boxShadow: '0 2px 10px rgba(251,191,36,0.45)',
                } : {
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)',
                  textDecoration: 'line-through', border: '1px solid rgba(255,255,255,0.1)',
                }}>
                {p.avatarImage
                  ? <img src={p.avatarImage} className="w-4 h-4 rounded-full object-cover flex-shrink-0" alt="" />
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
                  onKeyDown={e => e.key === 'Enter' && addGuest()} placeholder="שם האורח"
                  className="w-24 px-2 py-1 rounded-full text-xs outline-none text-right"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(251,191,36,0.4)', caretColor: '#fbbf24' }} />
                <button onClick={addGuest} className="w-6 h-6 rounded-full font-black text-xs flex items-center justify-center active:scale-90" style={{ background: '#fbbf24', color: '#000' }}>✓</button>
                <button onClick={() => { setShowGuest(false); setGuestName('') }} className="w-6 h-6 rounded-full text-xs flex items-center justify-center active:scale-90" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>✕</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Instruction banner (selecting only) ── */}
      {phase === 'selecting' && (
        <div className="text-center px-4 mb-1 shrink-0">
          <p className="text-xs font-bold" style={{ color: 'rgba(251,191,36,0.85)' }}>
            {instruction}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {revealedCount} / {activeParts.length} נחשפו
          </p>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col items-center justify-between px-3 pb-4 min-h-0">

        {/* History overlay */}
        {showHistory && (
          <div className="absolute inset-x-4 top-32 bottom-32 z-20 rounded-2xl overflow-y-auto p-4"
               style={{ background: 'rgba(0,0,0,0.93)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-yellow-400 text-sm">📜 היסטוריה</h3>
              <button onClick={() => setShowHistory(false)} className="text-white/50 text-xl leading-none active:scale-90">×</button>
            </div>
            {history.length === 0
              ? <p className="text-white/30 text-sm text-center py-8">עוד לא הייתה הגרלה</p>
              : history.map(e => <HistoryEntry key={e.id} entry={e} />)}
          </div>
        )}

        {/* ── Sticks + avatars ── */}
        <div className="flex-1 flex items-end justify-center w-full gap-2 pt-2"
             style={{ maxWidth: 440 }}>
          {activeParts.map((p, idx) => {
            const isWinner      = winner?.id === p.id
            const isClaimed     = !!claimed[p.id]
            const isRevealed    = !!revealed[p.id]
            const isRevealingNow = revealingId === p.id
            const grad          = STICK_GRADS[idx % STICK_GRADS.length]
            const stickH        = isRevealed ? heights[p.id] : 0

            // Whether this stick can be tapped to reveal
            const canReveal = phase === 'selecting' && isClaimed && !isRevealed && !isRevealingNow && revealingId === null

            return (
              <div key={p.id} className="flex flex-col items-center" style={{ flex: '1 1 0', minWidth: 0 }}>

                {/* Crown space */}
                <div style={{ height: 22 }} className="flex items-center justify-center">
                  {isWinner && <span className="text-lg leading-none animate-bounce">👑</span>}
                </div>

                {/* Length badge */}
                <div style={{ height: 16 }} className="flex items-center justify-center">
                  {isRevealed && (
                    <span className="text-[10px] font-black"
                          style={{ color: isWinner ? '#fbbf24' : 'rgba(255,255,255,0.4)' }}>
                      {heights[p.id]}
                    </span>
                  )}
                </div>

                {/* Stick bar — tappable when claimed */}
                <div className="relative w-full flex justify-center"
                     style={{ height: MAX_H, cursor: canReveal ? 'pointer' : 'default' }}
                     onClick={() => revealStick(p.id)}>

                  {/* Track / glow when ready */}
                  <div className="absolute bottom-0"
                       style={{
                         width: 14, height: MAX_H, borderRadius: 6,
                         background: isRevealingNow
                           ? 'rgba(251,191,36,0.25)'
                           : canReveal
                             ? 'rgba(251,191,36,0.12)'
                             : 'rgba(255,255,255,0.04)',
                         boxShadow: isRevealingNow
                           ? '0 0 22px rgba(251,191,36,0.7)'
                           : canReveal
                             ? '0 0 10px rgba(251,191,36,0.35)'
                             : 'none',
                         animationName: isRevealingNow ? 'fake-shake' : 'none',
                         animationDuration: '0.18s',
                         animationIterationCount: 'infinite',
                         transition: 'background 0.3s, box-shadow 0.3s',
                       }} />

                  {/* Actual stick — appears after reveal */}
                  <div className="absolute bottom-0"
                       style={{
                         width: 14,
                         height: stickH,
                         background: stickH > 0 ? grad : 'transparent',
                         borderRadius: '5px 5px 0 0',
                         boxShadow: stickH > 0
                           ? isWinner
                             ? '0 0 14px rgba(251,191,36,0.9), 0 0 28px rgba(251,191,36,0.4)'
                             : '0 -2px 8px rgba(0,0,0,0.5)'
                           : 'none',
                         transition: 'height 0.65s cubic-bezier(0.34,1.56,0.64,1)',
                       }} />
                </div>

                {/* Fist / hand emoji — doubles as tap target for reveal */}
                <div className="text-xl leading-none select-none my-1 text-center"
                     style={{
                       cursor: canReveal ? 'pointer' : 'default',
                       animationName: canReveal ? 'bounce-arrows' : 'none',
                       animationDuration: '0.75s',
                       animationTimingFunction: 'ease-in-out',
                       animationIterationCount: 'infinite',
                     }}
                     onClick={() => revealStick(p.id)}>
                  {isRevealingNow ? '⚡' : canReveal ? '🖐️' : '✊'}
                </div>

                {/* Avatar — TAP 1: claim your stick */}
                <div className="relative flex-shrink-0"
                     onClick={() => claimStick(p.id)}
                     style={{ cursor: phase === 'selecting' && !isClaimed && revealingId === null ? 'pointer' : 'default' }}>

                  {/* Rainbow ring for winner */}
                  {isWinner && (
                    <div className="absolute -inset-1.5 rounded-full"
                         style={{ background: 'linear-gradient(135deg,#ff2200,#ffd700,#00cc44,#0088ff,#ff00cc)', zIndex: 0 }} />
                  )}

                  <div className="relative w-11 h-11 rounded-full overflow-hidden flex items-center justify-center"
                       style={{
                         background: 'rgba(255,255,255,0.08)',
                         border: isWinner
                           ? '2px solid #fbbf24'
                           : isClaimed
                             ? '2px solid rgba(251,191,36,0.7)'
                             : phase === 'selecting'
                               ? '2px solid rgba(255,255,255,0.55)'
                               : '2px solid rgba(255,255,255,0.15)',
                         boxShadow: isWinner
                           ? '0 0 20px rgba(251,191,36,0.8)'
                           : isClaimed
                             ? '0 0 10px rgba(251,191,36,0.45)'
                             : 'none',
                         transition: 'border-color 0.3s, box-shadow 0.3s',
                         zIndex: 1,
                         animationName: phase === 'selecting' && !isClaimed && revealingId === null
                           ? 'border-glow-fade' : 'none',
                         animationDuration: '1.4s',
                         animationIterationCount: 'infinite',
                       }}>
                    {p.avatarImage
                      ? <img src={p.avatarImage} className="w-full h-full object-cover" alt={p.name} />
                      : <span style={{ fontSize: 22 }}>{p.avatar}</span>}
                  </div>
                </div>

                {/* Name */}
                <span className="text-[10px] font-bold mt-1 text-center w-full truncate px-1"
                      style={{ color: isWinner ? '#fbbf24' : isClaimed ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)' }}>
                  {p.name}
                </span>

              </div>
            )
          })}
        </div>

        {/* Bottom bulb strip */}
        <div className="shrink-0 py-2 w-full">
          <BulbStrip count={14} size={7} gap={4} duration={1.4} />
        </div>

        {/* ── Action button ── */}
        <div className="shrink-0 w-full max-w-xs">
          {phase === 'idle' && (
            <button onClick={startDraw} disabled={activeParts.length < 2}
              className="w-full py-4 rounded-2xl font-black text-lg text-black active:scale-95 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 4px 20px rgba(251,191,36,0.45)' }}>
              🎯 התחל הגרלה!
            </button>
          )}
          {phase === 'done' && winner && (
            <div className="text-center">
              <p className="font-black text-2xl mb-2" style={{ color: '#fbbf24', textShadow: '0 0 20px rgba(251,191,36,0.6)' }}>
                🏆 {winner.name}!
              </p>
              <button onClick={reset}
                className="w-full py-3 rounded-2xl font-black text-sm active:scale-95 transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.18)' }}>
                🔄 הגרלה חדשה
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
