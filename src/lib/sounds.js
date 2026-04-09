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

export const sounds = {
  // Two rising notes — earning a star
  star: () => {
    beep({ freq: 880, duration: 0.1 })
    beep({ freq: 1100, duration: 0.12, delay: 0.09 })
  },
  // Warm triangle tone — coin drop
  coin: () => beep({ freq: 660, type: 'triangle', duration: 0.22 }),
  // Low buzz — spending
  spend: () => beep({ freq: 280, type: 'sawtooth', duration: 0.18, gain: 0.2 }),
  // Two-tone swish — converting stars to shekels
  convert: () => {
    beep({ freq: 550, duration: 0.1 })
    beep({ freq: 770, duration: 0.15, delay: 0.1 })
  },
  // Victory fanfare — goal reached!
  goal: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      beep({ freq: f, duration: 0.22, delay: i * 0.13 })
    )
  },
  // Subtle tap — UI feedback
  tap: () => beep({ freq: 440, duration: 0.05, gain: 0.12 }),
  // Error buzz
  error: () => beep({ freq: 200, type: 'sawtooth', duration: 0.2, gain: 0.2 }),
  // Birthday jingle
  birthday: () => {
    [523, 523, 587, 523, 698, 659].forEach((f, i) =>
      beep({ freq: f, duration: 0.18, delay: i * 0.16 })
    )
  },
}
