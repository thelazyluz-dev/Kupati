import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { generateId, formatRelativeTime } from '../lib/utils.js'
import { sounds } from '../lib/sounds.js'

const BULB_LIST = ['#ff2200','#ffd700','#00cc44','#0088ff','#ff00cc','#ffffff','#ff7700','#aa00ff']
const MAX_H = 180   // px — tallest possible stick
const MIN_H = 48    // px — shortest possible stick

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
  const [guestName, setGuestName]     = useState('')
  const [showGuest, setShowGuest]     = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [phase, setPhase]             = useState('idle')   // idle | revealing | done
  const [winner, setWinner]           = useState(null)
  const [revealed, setRevealed]       = useState({})       // id -> height px
  const [fakeId, setFakeId]           = useState(null)
  const [winnerFlash, setWinnerFlash] = useState(false)

  const activeParts = participants.filter(p => p.active)

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

  async function startDraw() {
    if (activeParts.length < 2 || phase !== 'idle') return

    // Pick winner with fairness weighting
    const wi          = pickWinner(activeParts, history)
    const winnerPart  = activeParts[wi]

    // Assign stick heights — winner gets MAX_H, others get random shorter
    const heights = {}
    activeParts.forEach(p => {
      heights[p.id] = p.id === winnerPart.id
        ? MAX_H
        : Math.round(MIN_H + Math.random() * (MAX_H - MIN_H - 20))
    })

    // Reveal order: non-winners first (shuffled), winner last
    const nonWinners  = activeParts.filter(p => p.id !== winnerPart.id).sort(() => Math.random() - 0.5)
    const revealOrder = [...nonWinners.map(p => p.id), winnerPart.id]

    setRevealed({})
    setFakeId(null)
    setWinner(null)
    setPhase('revealing')

    // Build-up sounds
    sounds.wheelTick()
    await wait(280)
    sounds.wheelTick()
    await wait(240)
    sounds.wheelSuspense()
    await wait(900)

    // Reveal each stick
    for (let i = 0; i < revealOrder.length; i++) {
      const id       = revealOrder[i]
      const isWinner = id === winnerPart.id
      const h        = heights[id]

      // Fake-out: if a non-winner stick is tall (>72% of max), briefly highlight it
      const isFakeCandidate = !isWinner && h > MAX_H * 0.72 && i < revealOrder.length - 2

      setRevealed(prev => ({ ...prev, [id]: h }))
      sounds.lotteryPop()

      if (isFakeCandidate) {
        await wait(380)
        setFakeId(id)
        sounds.lotteryWarn()
        await wait(650)
        setFakeId(null)
        sounds.lotteryBack()
        await wait(300)
      } else {
        await wait(isWinner ? 600 : 420 + Math.random() * 250)
      }
    }

    // Declare winner
    setPhase('done')
    setWinner(winnerPart)
    setWinnerFlash(true)
    sounds.wheelReveal()
    setTimeout(() => sounds.goal(), 450)
    setTimeout(() => setWinnerFlash(false), 800)

    setHistory(prev => [{
      id: generateId(),
      winner: { name: winnerPart.name, avatar: winnerPart.avatar, avatarImage: winnerPart.avatarImage },
      participants: activeParts.map(p => ({ name: p.name, avatar: p.avatar })),
      timestamp: Date.now(),
    }, ...prev].slice(0, 30))
  }

  function reset() {
    setPhase('idle'); setWinner(null); setRevealed({}); setFakeId(null); setWinnerFlash(false)
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
             style={{ background: 'rgba(251,191,36,0.18)', animationName: 'winner-flash', animationDuration: '0.8s', animationFillMode: 'forwards', animationTimingFunction: 'ease-out' }} />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-between px-5 pt-10 pb-1 shrink-0">
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg active:scale-90 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
          ×
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

      {/* ── Participants chips ──────────────────────────────────────────────── */}
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

      {/* ── Sticks arena ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-between px-4 pb-6 min-h-0">

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

        {/* Sticks + avatars */}
        <div className="flex-1 flex items-end justify-center w-full gap-3 pt-4"
             style={{ maxWidth: 420 }}>
          {activeParts.map((p, idx) => {
            const h        = revealed[p.id] ?? 0
            const isWinner = winner?.id === p.id
            const isFake   = fakeId === p.id
            const grad     = STICK_GRADS[idx % STICK_GRADS.length]

            return (
              <div key={p.id} className="flex flex-col items-center" style={{ flex: '1 1 0', minWidth: 0 }}>

                {/* Winner crown */}
                <div style={{ height: 20 }} className="flex items-center justify-center">
                  {isWinner && <span className="text-base leading-none animate-bounce">👑</span>}
                </div>

                {/* Length badge */}
                <div style={{ height: 18 }} className="flex items-center justify-center">
                  {h > 0 && (
                    <span className="text-[10px] font-black"
                          style={{ color: isWinner ? '#fbbf24' : isFake ? 'rgba(255,150,0,0.9)' : 'rgba(255,255,255,0.45)' }}>
                      {h}
                    </span>
                  )}
                </div>

                {/* Stick bar — grows upward */}
                <div className="relative w-full flex justify-center" style={{ height: MAX_H }}>
                  {/* Track */}
                  <div className="absolute bottom-0 rounded-t-full" style={{ width: 16, height: MAX_H, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} />
                  {/* Stick */}
                  <div className="absolute bottom-0"
                       style={{
                         width: 16,
                         height: h,
                         background: h > 0 ? grad : 'transparent',
                         borderRadius: '6px 6px 0 0',
                         boxShadow: h > 0
                           ? isWinner
                             ? '0 0 14px rgba(251,191,36,0.9), 0 0 30px rgba(251,191,36,0.4)'
                             : isFake
                               ? '0 0 12px rgba(255,110,0,0.8)'
                               : '0 -2px 8px rgba(0,0,0,0.4)'
                           : 'none',
                         transition: 'height 0.65s cubic-bezier(0.34,1.56,0.64,1)',
                       }} />
                </div>

                {/* Fist gripping the stick */}
                <div className="text-2xl leading-none select-none my-1">✊</div>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {(isWinner || isFake) && (
                    <div className="absolute -inset-1.5 rounded-full"
                         style={{
                           background: isWinner
                             ? 'linear-gradient(135deg,#ff2200,#ffd700,#00cc44,#0088ff,#ff00cc)'
                             : 'linear-gradient(135deg,#ff7700,#ffcc00)',
                           zIndex: 0,
                         }} />
                  )}
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
                       style={{
                         background: 'rgba(255,255,255,0.08)',
                         border: isWinner ? '2px solid #fbbf24' : isFake ? '2px solid rgba(255,140,0,0.9)' : '2px solid rgba(255,255,255,0.12)',
                         boxShadow: isWinner ? '0 0 18px rgba(251,191,36,0.8)' : isFake ? '0 0 12px rgba(255,110,0,0.7)' : 'none',
                         transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                         zIndex: 1,
                       }}>
                    {p.avatarImage
                      ? <img src={p.avatarImage} className="w-full h-full object-cover" alt={p.name} />
                      : <span style={{ fontSize: 20 }}>{p.avatar}</span>}
                  </div>
                </div>

                {/* Name */}
                <span className="text-[10px] font-bold mt-1 text-center w-full truncate px-1"
                      style={{ color: isWinner ? '#fbbf24' : isFake ? 'rgba(255,150,0,0.9)' : 'rgba(255,255,255,0.55)' }}>
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

        {/* Action button */}
        <div className="shrink-0 w-full max-w-xs">
          {phase === 'idle' && (
            <button onClick={startDraw} disabled={activeParts.length < 2}
              className="w-full py-4 rounded-2xl font-black text-lg text-black active:scale-95 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 4px 20px rgba(251,191,36,0.45)' }}>
              🎯 גלה את המקלות!
            </button>
          )}
          {phase === 'revealing' && (
            <div className="text-center py-3">
              <p className="text-white/60 font-bold text-sm animate-pulse">🎯 מגלה מקלות...</p>
            </div>
          )}
          {phase === 'done' && winner && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-2xl font-black text-center animate-bounce-in"
                 style={{ color: '#fbbf24' }}>
                🏆 {winner.name} זכה!
              </p>
              <button onClick={reset}
                className="w-full py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}>
                🔄 הגרלה נוספת
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
