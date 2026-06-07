/**
 * syncEngine — thin Firestore mirror over localStorage.
 *
 * Structure:
 *   families/{familyCode}/data/{key}  →  { payload, updatedAt, updatedBy }
 *
 * - `updatedBy` is a per-device UUID so we can ignore our own writes in onSnapshot.
 * - `suppressKeys` prevents an infinite loop:
 *     pull from Firestore → write LS → kupati-storage event → would push back → suppress it.
 */

import { db } from './firebase.js'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { get, set } from './storage.js'

const LS_EVENT  = 'kupati-storage'
const DEVICE_KEY = 'kupati_device_id'
const DATA_KEYS  = ['children', 'chores', 'all_transactions', 'settings', 'pendingChores', 'childActivity']

// ── device ID ──────────────────────────────────────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

// ── module state ───────────────────────────────────────────────────────────
let familyCode    = null
let unsubscribers = []
let onStatus      = null
const suppressKeys = new Set()

export function isSuppressed(key) { return suppressKeys.has(key) }

// ── helpers ────────────────────────────────────────────────────────────────
function dataDocRef(key) {
  return doc(db, 'families', familyCode, 'data', key)
}

/** Strip device-local fields before pushing settings to Firestore. */
function sanitizeSettings(s) {
  const { pin: _p, familyCode: _fc, ...safe } = s ?? {}
  return safe
}

/**
 * Merge remote pendingChores into local ones.
 * Remote wins for higher-priority statuses (approved/rejected > pending).
 */
function mergePendingChores(local, remote) {
  // approved/rejected = terminal (2) > done (1.5) > pending (1) > assigned (0.5)
  const priority = { approved: 2, rejected: 2, done: 1.5, pending: 1, assigned: 0.5 }
  const map = new Map()
  for (const item of [...(local || []), ...(remote || [])]) {
    const existing = map.get(item.id)
    if (!existing || (priority[item.status] || 0) > (priority[existing.status] || 0)) {
      map.set(item.id, item)
    }
  }
  return [...map.values()].sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Merge child activity log — append-only by entry id, newest-first, capped at 100.
 */
function mergeChildActivity(local, remote) {
  const seen = new Set((local || []).map((e) => e.id))
  const fresh = (remote || []).filter((e) => !seen.has(e.id))
  return [...fresh, ...(local || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 100)
}

/**
 * Merge remote transactions into local ones (append-only by tx id).
 * Both parents can add transactions concurrently — we never lose either.
 */
function mergeTransactions(local, remote) {
  const merged = { ...(local ?? {}) }
  for (const [childId, remoteTxs] of Object.entries(remote ?? {})) {
    const localTxs = merged[childId] ?? []
    const localIds = new Set(localTxs.map((tx) => tx.id))
    const newTxs   = remoteTxs.filter((tx) => !localIds.has(tx.id))
    if (newTxs.length > 0) {
      merged[childId] = [...localTxs, ...newTxs]
        .sort((a, b) => b.timestamp - a.timestamp)
    }
  }
  return merged
}

/** Write remote payload into localStorage and fire the React sync event. */
function applyRemoteData(key, payload) {
  suppressKeys.add(key)
  try {
    if (key === 'settings') {
      const local  = get('settings') ?? {}
      const merged = { ...payload, pin: local.pin, familyCode: local.familyCode }
      set('settings', merged)
    } else if (key === 'all_transactions') {
      const local  = get('all_transactions') ?? {}
      set('all_transactions', mergeTransactions(local, payload))
    } else if (key === 'pendingChores') {
      const local  = get('pendingChores') ?? []
      set('pendingChores', mergePendingChores(local, payload))
    } else if (key === 'childActivity') {
      const local  = get('childActivity') ?? []
      set('childActivity', mergeChildActivity(local, payload))
    } else {
      set(key, payload)
    }
    window.dispatchEvent(new CustomEvent(LS_EVENT, { detail: { key } }))
  } finally {
    // Allow outbound pushes again after React processes this update
    setTimeout(() => suppressKeys.delete(key), 600)
  }
}

// ── public API ─────────────────────────────────────────────────────────────

export async function attach(code, statusCb) {
  if (!db) return
  detach()
  familyCode = code.toLowerCase()
  onStatus   = statusCb ?? null

  onStatus?.('syncing')
  const deviceId = getDeviceId()

  try {
    const childrenSnap = await getDoc(dataDocRef('children'))

    if (childrenSnap.exists() && childrenSnap.data()?.updatedBy !== deviceId) {
      // Remote data exists from another device — pull everything
      for (const key of DATA_KEYS) {
        try {
          const snap = await getDoc(dataDocRef(key))
          if (snap.exists()) applyRemoteData(key, snap.data().payload)
        } catch (pullErr) {
          console.warn(`[sync] Initial pull failed for ${key}:`, pullErr.message)
        }
      }
    } else if (!childrenSnap.exists()) {
      // No remote data at all — push current local state
      for (const key of DATA_KEYS) {
        try {
          const val = get(key)
          if (val !== null) await push(key, val)
        } catch (pushErr) {
          console.warn(`[sync] Initial push failed for ${key}:`, pushErr.message)
        }
      }
    }
    // If childrenSnap exists and updatedBy === deviceId → same device, no need to pull
  } catch (err) {
    console.warn('[sync] Initial sync failed:', err)
    onStatus?.('error')
    return   // don't set up listeners if initial connection failed
  }

  // Real-time listeners for all keys
  for (const key of DATA_KEYS) {
    const unsub = onSnapshot(
      dataDocRef(key),
      (snap) => {
        if (!snap.exists()) return
        const data = snap.data()
        if (data.updatedBy === deviceId) return  // our own write, ignore
        applyRemoteData(key, data.payload)
      },
      (err) => {
        console.warn('[sync] onSnapshot error:', err)
        onStatus?.('error')
      }
    )
    unsubscribers.push(unsub)
  }

  onStatus?.('ok')
}

export function detach() {
  unsubscribers.forEach((u) => u())
  unsubscribers = []
  familyCode    = null
  onStatus      = null
}

export async function push(key, value) {
  if (!db || !familyCode) return
  const payload = key === 'settings' ? sanitizeSettings(value) : value
  await setDoc(dataDocRef(key), {
    payload,
    updatedAt: serverTimestamp(),
    updatedBy: getDeviceId(),
  })
}
