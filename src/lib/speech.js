// Text-to-speech for young children who can't read fluently yet.
// Uses the browser's built-in SpeechSynthesis (free, offline, Hebrew).
//
// Guarded everywhere: unsupported browsers, missing voices, and errors all
// fail silently — speaking is a nice-to-have, never required.

let _voice = null
let _triedVoice = false

function pickHebrewVoice() {
  if (_triedVoice) return _voice
  _triedVoice = true
  try {
    const voices = window.speechSynthesis?.getVoices?.() || []
    _voice = voices.find((v) => /he|iw/i.test(v.lang)) || null
  } catch { _voice = null }
  return _voice
}

// Voices load async in some browsers — refresh our pick when they arrive.
try {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => { _triedVoice = false; pickHebrewVoice() }
  }
} catch { /* ignore */ }

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Speak `text` in Hebrew, cancelling anything already being said.
 * `enabled` (default true) lets callers respect a mute setting.
 */
export function speak(text, enabled = true) {
  if (!enabled || !text || !speechSupported()) return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(String(text))
    u.lang = 'he-IL'
    u.rate = 0.95   // a touch slower for kids
    u.pitch = 1.05
    const v = pickHebrewVoice()
    if (v) u.voice = v
    synth.speak(u)
  } catch { /* ignore */ }
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
}
