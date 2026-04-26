import { get } from './storage.js'

let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

function isSoundEnabled() {
  try {
    const settings = get('settings')
    if (settings && settings.soundEnabled === false) return false
  } catch {
    // ignore
  }
  return true
}

function beep({ freq = 440, type = 'sine', duration = 0.15, gain = 0.3, delay = 0 }) {
  if (!isSoundEnabled()) return
  try {
    const ac = getCtx()
    const osc = ac.createOscillator()
    const gainNode = ac.createGain()
    osc.connect(gainNode)
    gainNode.connect(ac.destination)
    osc.type = type
    const start = ac.currentTime + delay
    osc.frequency.setValueAtTime(freq, start)
    gainNode.gain.setValueAtTime(gain, start)
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration)
    osc.start(start)
    osc.stop(start + duration)
  } catch {
    // AudioContext blocked or unavailable — silently skip
  }
}

// Pair physical vibration with audio where supported
function haptic(pattern = [40]) {
  try { navigator.vibrate?.(pattern) } catch {}
}

export const sounds = {
  // Three rising notes — earning a star (satisfying & clear)
  star: () => {
    haptic([30, 15, 40])
    beep({ freq: 660, duration: 0.14 })
    beep({ freq: 880, duration: 0.14, delay: 0.11 })
    beep({ freq: 1100, duration: 0.20, delay: 0.23, gain: 0.28 })
  },

  // Warm two-note coin drop
  coin: () => {
    haptic([35])
    beep({ freq: 523, type: 'triangle', duration: 0.14, gain: 0.3 })
    beep({ freq: 659, type: 'triangle', duration: 0.26, delay: 0.11, gain: 0.25 })
  },

  // Low buzz — spending
  spend: () => {
    haptic([25])
    beep({ freq: 280, type: 'sawtooth', duration: 0.18, gain: 0.2 })
  },

  // Two-tone swish — converting
  convert: () => {
    haptic([20, 10, 20])
    beep({ freq: 550, duration: 0.12 })
    beep({ freq: 770, duration: 0.18, delay: 0.11 })
  },

  // Victory fanfare — goal reached (5 ascending notes)
  goal: () => {
    haptic([40, 20, 40, 20, 80])
    ;[523, 659, 784, 1047, 1319].forEach((f, i) =>
      beep({ freq: f, duration: 0.24, delay: i * 0.12, gain: 0.28 })
    )
  },

  // Subtle tap — UI feedback
  tap: () => beep({ freq: 440, duration: 0.05, gain: 0.12 }),

  // Error buzz
  error: () => {
    haptic([80])
    beep({ freq: 200, type: 'sawtooth', duration: 0.2, gain: 0.2 })
  },

  // Birthday jingle
  birthday: () => {
    haptic([30, 20, 30, 20, 80])
    ;[523, 523, 587, 523, 698, 659].forEach((f, i) =>
      beep({ freq: f, duration: 0.18, delay: i * 0.16 })
    )
  },

  // Playful coin jingle during flight — ascending arpeggio, repeating softly
  coinFly: () => {
    const notes = [784, 1047, 1319, 1047, 784, 1047, 1319, 1568, 1047, 784]
    notes.forEach((freq, i) =>
      beep({ freq, type: 'sine', duration: 0.11, gain: 0.13, delay: i * 0.13 })
    )
  },

  // Metallic clink when coin slots in
  coinLand: () => {
    haptic([15, 8, 25])
    beep({ freq: 2400, type: 'triangle', duration: 0.06, gain: 0.38 })
    beep({ freq: 1700, type: 'triangle', duration: 0.14, delay: 0.05, gain: 0.22 })
  },

  // Wheel click tick — short percussive snap
  wheelTick: () => beep({ freq: 380, type: 'square', duration: 0.03, gain: 0.22 }),

  // Rising suspense swoop (last ~0.5s before reveal)
  wheelSuspense: () => {
    if (!isSoundEnabled()) return
    try {
      const ac = getCtx()
      const osc = ac.createOscillator()
      const g   = ac.createGain()
      osc.connect(g); g.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(180, ac.currentTime)
      osc.frequency.exponentialRampToValueAtTime(780, ac.currentTime + 0.55)
      g.gain.setValueAtTime(0.0, ac.currentTime)
      g.gain.linearRampToValueAtTime(0.22, ac.currentTime + 0.25)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6)
      osc.start(ac.currentTime)
      osc.stop(ac.currentTime + 0.65)
    } catch {}
  },

  // Grand reveal fanfare (7 ascending notes with reverb-like tail)
  wheelReveal: () => {
    haptic([30, 15, 30, 15, 80, 20, 120])
    const notes = [392, 494, 587, 659, 784, 988, 1175]
    notes.forEach((f, i) =>
      beep({ freq: f, duration: 0.28 + i * 0.04, delay: i * 0.09, gain: 0.3 - i * 0.02 })
    )
  },

  // Error screen — alarm siren (alternating high/low beeps)
  errorAlarm: () => {
    haptic([80, 40, 80, 40, 80])
    for (let i = 0; i < 5; i++) {
      beep({ freq: 960, type: 'sawtooth', duration: 0.11, gain: 0.28, delay: i * 0.26 })
      beep({ freq: 640, type: 'sawtooth', duration: 0.11, gain: 0.22, delay: i * 0.26 + 0.13 })
    }
  },

  // Breaking news jingle — 5-note sting
  newsJingle: () => {
    haptic([20, 10, 20])
    ;[784, 784, 784, 659, 784].forEach((f, i) =>
      beep({ freq: f, duration: 0.13, delay: i * 0.12, gain: 0.28 })
    )
  },

  // Phone ring — two-ring cycle repeating twice
  phoneRing: () => {
    haptic([300, 200, 300, 200, 300])
    const ring = (offset) => {
      beep({ freq: 1320, type: 'sine', duration: 0.38, gain: 0.32, delay: offset })
      beep({ freq: 1320, type: 'sine', duration: 0.38, gain: 0.32, delay: offset + 0.45 })
    }
    ring(0); ring(1.3); ring(2.6)
  },

  // Game over — descending square-wave scale
  gameOverSound: () => {
    haptic([60, 30, 60, 30, 200])
    ;[392, 370, 349, 311, 294, 262, 220].forEach((f, i) =>
      beep({ freq: f, type: 'square', duration: 0.22, delay: i * 0.11, gain: 0.22 })
    )
  },

  // Loading — repeating soft ping
  loadingPing: () => {
    for (let i = 0; i < 5; i++)
      beep({ freq: 880, type: 'sine', duration: 0.07, gain: 0.12, delay: i * 0.52 })
  },

  // Yad2 — cash-register ding
  yad2Sound: () => {
    haptic([15, 10, 25])
    beep({ freq: 1760, type: 'triangle', duration: 0.07, gain: 0.32 })
    beep({ freq: 2093, type: 'triangle', duration: 0.09, delay: 0.08, gain: 0.26 })
    beep({ freq: 1568, type: 'triangle', duration: 0.14, delay: 0.16, gain: 0.20 })
    beep({ freq: 2093, type: 'triangle', duration: 0.09, delay: 0.30, gain: 0.15 })
  },

  // Crunch per crack level (gets lower + louder each hit)
  pigCrack: (level) => {
    const freq = 280 - level * 28
    const gain = 0.22 + level * 0.06
    haptic([18 + level * 18])
    beep({ freq, type: 'sawtooth', duration: 0.07, gain })
    beep({ freq: freq * 0.55, type: 'triangle', duration: 0.16, gain: gain * 0.65, delay: 0.04 })
  },

  // Big boom + coin shower + victory chord
  pigExplode: () => {
    haptic([60, 30, 100, 40, 200, 50, 300])
    beep({ freq: 90,  type: 'sawtooth', duration: 0.4,  gain: 0.55 })
    beep({ freq: 55,  type: 'sawtooth', duration: 0.55, gain: 0.45, delay: 0.06 })
    for (let i = 0; i < 14; i++) {
      beep({ freq: 500 + Math.random() * 900, type: 'triangle', duration: 0.07, gain: 0.09, delay: 0.08 + i * 0.065 })
    }
    ;[523, 659, 784, 1047].forEach((f, i) =>
      beep({ freq: f, duration: 0.32, delay: 0.7 + i * 0.09, gain: 0.22 })
    )
  },
}
