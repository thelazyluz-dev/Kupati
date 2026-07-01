const PREFIX = 'kupati_'

export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      window.dispatchEvent(new CustomEvent('storage-quota-exceeded'))
    }
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key)
}

export function exportAll() {
  const result = {}
  for (let i = 0; i < localStorage.length; i++) {
    const rawKey = localStorage.key(i)
    if (rawKey && rawKey.startsWith(PREFIX)) {
      const key = rawKey.slice(PREFIX.length)
      try {
        result[key] = JSON.parse(localStorage.getItem(rawKey))
      } catch {
        result[key] = localStorage.getItem(rawKey)
      }
    }
  }
  return result
}

/**
 * Restore a backup produced by exportAll(). Overwrites existing keys.
 * Returns the list of keys written. Throws on non-object input.
 */
export function importAll(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('קובץ גיבוי לא תקין')
  }
  const written = []
  for (const [key, value] of Object.entries(data)) {
    set(key, value)
    written.push(key)
  }
  return written
}

export function clearAll() {
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const rawKey = localStorage.key(i)
    if (rawKey && rawKey.startsWith(PREFIX)) {
      keysToRemove.push(rawKey)
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}
