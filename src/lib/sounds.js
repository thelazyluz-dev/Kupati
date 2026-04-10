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
}
