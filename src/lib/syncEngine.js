/**
 * syncEngine — thin Firestore mirror over localStorage.
 *
 * Structure:
 *   families/{familyCode}/data/{key}  →  { payload, updatedAt, updatedBy }
 *
 * - `updatedBy` is a per-device UUID so we can ignore our own writes in onSnapshot.
 * - `suppressKeys` prevents an infinite loop:
 *     pull from Firestore → write LS → kupati-storage event → would push back → suppress it.
 * - `kupati_local_ts` tracks when each key was last written locally (ms epoch).
 *   Used in attach() to avoid pulling Firestore data that is older than local state.
 */

import { db } from './firebase.js'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, runTransaction } from 'firebase/firestore'
import { get, set } from './storage.js'

const LS_EVENT   = 'kupati-storage'
const DEVICE_KEY = 'kupati_device_id'
const LOCAL_TS_KEY = 'kupati_local_ts'
const DATA_KEYS  = ['children', 'chores', 'all_transactions', 'settings', 'pendingChores', 'childActivity']

// Keys that use append-only merge — always safe to pull from Firestore.
// Pulling these can never lose local data because applyRemoteData merges them.
const MERGE_KEYS = new Set(['all_transactions', 'pendingChores', 'childActivity'])

// ── device ID ──────────────────────────────────────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

// ── local timestamp tracking ───────────────────────────────────────────────
export function getLocalTs(key) {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_TS_KEY) || '{}')[key] || 0
  } catch { return 0 }
}

export function setLocalTs(key, ts) {
  try {
    const obj = JSON.parse(localStorage.getItem(LOCAL_TS_KEY) || '{}')
    obj[key] = ts
    localStorage.setItem(LOCAL_TS_KEY, JSON.stringify(obj))
  } catch {}
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
  const { pin: _p, pinHash: _ph, pinSalt: _ps, familyCode: _fc, ...safe } = s ?? {}
  return safe
}

/**
 * Merge remote pendingChores into local ones.
 * Remote wins for higher-priority statuses (approved/rejected > pending).
 * (Exported for unit tests.)
 */
export function mergePendingChores(local, remote) {
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
export function mergeChildActivity(local, remote) {
  const seen = new Set((local || []).map((e) => e.id))
  const fresh = (remote || []).filter((e) => !seen.has(e.id))
  return [...fresh, ...(local || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 100)
}

/**
 * Merge remote transactions into local ones (append-only by tx id).
 * Both parents can add transactions concurrently — we never lose either.
 */
export function mergeTransactions(local, remote) {
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
function applyRemoteData(key, payload, remoteTs) {
  suppressKeys.add(key)
  try {
    if (key === 'settings') {
      const local  = get('settings') ?? {}
      const merged = { ...payload, pin: local.pin, pinHash: local.pinHash, pinSalt: local.pinSalt, familyCode: local.familyCode }
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
    // Record when remote data was last applied, so we can compare in future attach() calls
    if (remoteTs) setLocalTs(key, remoteTs)
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
      // Remote data was last written by another source (another device or child_mode).
      // Compare Firestore updatedAt with our last local write time to decide direction.
      const remoteTs = childrenSnap.data()?.updatedAt?.toMillis() || 0
      const localTs  = getLocalTs('children')

      if (remoteTs > localTs) {
        // Firestore is newer — pull all keys from remote
        for (const key of DATA_KEYS) {
          try {
            const snap = await getDoc(dataDocRef(key))
            if (snap.exists()) {
              const ts = snap.data()?.updatedAt?.toMillis() || 0
              applyRemoteData(key, snap.data().payload, ts)
            }
          } catch (pullErr) {
            console.warn(`[sync] Initial pull failed for ${key}:`, pullErr.message)
          }
        }
      } else {
        // Local is newer for overwrite keys — push those to protect local balance/settings.
        // But ALWAYS pull merge-only keys so remote-only entries (child wheel wins,
        // pending chores submitted while offline) are never lost.
        for (const key of DATA_KEYS) {
          try {
            if (MERGE_KEYS.has(key)) {
              const snap = await getDoc(dataDocRef(key))
              if (snap.exists()) {
                const ts = snap.data()?.updatedAt?.toMillis() || 0
                applyRemoteData(key, snap.data().payload, ts)
              }
            } else {
              const val = get(key)
              if (val !== null) await push(key, val)
            }
          } catch (err) {
            console.warn(`[sync] Initial sync failed for ${key}:`, err.message)
          }
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
        const remoteTs = data.updatedAt?.toMillis() || 0
        // For overwrite-keys (children, chores, settings) only apply if remote
        // is strictly newer than last local write — prevents a stale snapshot
        // from wiping stars/balances the parent just added.
        if (!MERGE_KEYS.has(key) && remoteTs <= getLocalTs(key)) return
        applyRemoteData(key, data.payload, remoteTs)
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

/**
 * Pull and merge all append-only keys from Firestore.
 * Safe to call at any time (e.g. when app returns to foreground) because
 * these keys are merge-only — local data is never lost.
 */
export async function pullMergeKeys() {
  if (!db || !familyCode) return
  for (const key of MERGE_KEYS) {
    try {
      const snap = await getDoc(dataDocRef(key))
      if (snap.exists()) {
        const ts = snap.data()?.updatedAt?.toMillis() || 0
        applyRemoteData(key, snap.data().payload, ts)
      }
    } catch (err) {
      console.warn(`[sync] pullMergeKeys failed for ${key}:`, err.message)
    }
  }
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

/**
 * Claim today's daily-penalty lock. Returns true if THIS device should apply
 * penalties, false if another device already did (or is doing) today's check.
 *
 * Uses a Firestore transaction on families/{code}/locks/dailyPenalty-{date} so
 * two parent phones opened the same morning race safely — exactly one wins.
 * Fail-open: with no sync (or a network error) we return true, because local
 * per-day idempotency in the penalty engine still protects a single device.
 */
export async function claimDailyPenaltyLock(now = new Date()) {
  if (!db || !familyCode) return true
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const lockRef = doc(db, 'families', familyCode, 'locks', `dailyPenalty-${dateStr}`)
  try {
    return await runTransaction(db, async (txn) => {
      const snap = await txn.get(lockRef)
      if (snap.exists()) return false
      txn.set(lockRef, { deviceId: getDeviceId(), claimedAt: serverTimestamp() })
      return true
    })
  } catch (err) {
    console.warn('[sync] penalty lock claim failed (fail-open):', err.message)
    return true
  }
}
