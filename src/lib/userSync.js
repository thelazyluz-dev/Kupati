/**
 * userSync — mirrors localStorage to Firestore under users/{uid}/data/{key}.
 * One document per data key, private to the authenticated user.
 * On first login: if Firestore is empty, migrates existing localStorage data up.
 */

import { db } from './firebase.js'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { get, set } from './storage.js'

const LS_EVENT   = 'kupati-storage'
const DEVICE_KEY = 'kupati_device_id'
const DATA_KEYS  = ['children', 'chores', 'all_transactions', 'settings']

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id) }
  return id
}

let _uid          = null
let unsubscribers = []
const suppressKeys = new Set()

export function isUserSuppressed(key) { return suppressKeys.has(key) }

function dataDocRef(uid, key) {
  return doc(db, 'users', uid, 'data', key)
}

function sanitizeSettings(s) {
  const { pin: _p, familyCode: _fc, ...safe } = s ?? {}
  return safe
}

function mergeTransactions(local, remote) {
  const merged = { ...(local ?? {}) }
  for (const [childId, remoteTxs] of Object.entries(remote ?? {})) {
    const localTxs = merged[childId] ?? []
    const localIds = new Set(localTxs.map((tx) => tx.id))
    const newTxs   = remoteTxs.filter((tx) => !localIds.has(tx.id))
    if (newTxs.length > 0) {
      merged[childId] = [...localTxs, ...newTxs].sort((a, b) => b.timestamp - a.timestamp)
    }
  }
  return merged
}

function applyRemoteData(key, payload) {
  suppressKeys.add(key)
  try {
    if (key === 'settings') {
      const local  = get('settings') ?? {}
      const merged = { ...payload, pin: local.pin, familyCode: local.familyCode }
      set('settings', merged)
    } else if (key === 'all_transactions') {
      const local = get('all_transactions') ?? {}
      set('all_transactions', mergeTransactions(local, payload))
    } else {
      set(key, payload)
    }
    window.dispatchEvent(new CustomEvent(LS_EVENT, { detail: { key } }))
  } finally {
    setTimeout(() => suppressKeys.delete(key), 600)
  }
}

export async function pushUser(uid, key, value) {
  if (!db || !uid) return
  const payload = key === 'settings' ? sanitizeSettings(value) : value
  await setDoc(dataDocRef(uid, key), {
    payload,
    updatedAt: serverTimestamp(),
    updatedBy: getDeviceId(),
  })
}

export async function attachUser(uid, onStatus) {
  if (!db) return
  detachUser()
  _uid = uid
  onStatus?.('syncing')
  const deviceId = getDeviceId()

  try {
    const childrenSnap = await getDoc(dataDocRef(uid, 'children'))

    if (childrenSnap.exists()) {
      // Cloud data exists — pull it all in
      for (const key of DATA_KEYS) {
        const snap = await getDoc(dataDocRef(uid, key))
        if (snap.exists()) applyRemoteData(key, snap.data().payload)
      }
    } else {
      // No cloud data yet — migrate existing localStorage data up
      for (const key of DATA_KEYS) {
        const val = get(key)
        if (val !== null) await pushUser(uid, key, val)
      }
    }
  } catch (err) {
    console.warn('[userSync] Initial sync failed:', err)
    onStatus?.('error')
    return
  }

  // Real-time listeners (multi-device sync)
  for (const key of DATA_KEYS) {
    const unsub = onSnapshot(
      dataDocRef(uid, key),
      (snap) => {
        if (!snap.exists()) return
        const data = snap.data()
        if (data.updatedBy === deviceId) return
        applyRemoteData(key, data.payload)
      },
      (err) => { console.warn('[userSync] onSnapshot error:', err); onStatus?.('error') }
    )
    unsubscribers.push(unsub)
  }

  onStatus?.('ok')
}

export function detachUser() {
  unsubscribers.forEach((u) => u())
  unsubscribers = []
  _uid = null
}

export function getCurrentUid() { return _uid }
