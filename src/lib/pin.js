// PIN storage — salted SHA-256 instead of plain text.
//
// Threat model: a curious kid opening DevTools and reading localStorage.
// (A 4-digit PIN can always be brute-forced offline; the goal here is that
// the code is never *readable*, not cryptographic invulnerability.)
//
// settings fields:
//   pinHash — hex sha256(salt + pin)
//   pinSalt — random hex, generated per PIN
//   pin     — legacy plain-text field; verified + auto-upgraded, then cleared

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Build the settings patch that stores a new PIN (hashed). */
export async function makePinSettings(pin) {
  const pinSalt = randomSalt()
  const pinHash = await sha256Hex(pinSalt + pin)
  return { pin: '', pinHash, pinSalt }
}

/** True if any PIN (hashed or legacy plain) is configured. */
export function hasPin(settings) {
  return !!(settings?.pinHash || settings?.pin)
}

/**
 * Verify an entered PIN against settings.
 * Returns { ok, upgrade } — `upgrade` is a settings patch to persist when a
 * legacy plain-text PIN verified successfully and should be converted to a hash.
 */
export async function verifyPin(pin, settings) {
  if (settings?.pinHash) {
    const hash = await sha256Hex((settings.pinSalt || '') + pin)
    return { ok: hash === settings.pinHash, upgrade: null }
  }
  if (settings?.pin) {
    const ok = pin === settings.pin
    return { ok, upgrade: ok ? await makePinSettings(pin) : null }
  }
  return { ok: false, upgrade: null }
}

/** Settings patch that removes the PIN entirely. */
export const CLEAR_PIN_SETTINGS = { pin: '', pinHash: '', pinSalt: '' }
