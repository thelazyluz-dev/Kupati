import { db } from './firebase.js'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, runTransaction } from 'firebase/firestore'

function dataRef(familyCode, key) {
  return doc(db, 'families', familyCode, 'data', key)
}

export async function fetchFamilyData(familyCode, key) {
  if (!db) throw new Error('Firebase לא מחובר')
  const snap = await getDoc(dataRef(familyCode, key))
  return snap.exists() ? snap.data().payload : null
}

export function subscribeFamilyData(familyCode, key, cb, onError) {
  if (!db) return () => {}
  return onSnapshot(
    dataRef(familyCode, key),
    (snap) => { if (snap.exists()) cb(snap.data().payload) },
    (err) => { if (onError) onError(err) }
  )
}

export async function pushFamilyData(familyCode, key, value) {
  if (!db) return
  await setDoc(dataRef(familyCode, key), {
    payload: value,
    updatedAt: serverTimestamp(),
    updatedBy: 'child_mode',
  })
}

/**
 * Atomically append entries to a family array doc (e.g. pendingChores),
 * so a child's write can't clobber a concurrent parent approval.
 * Returns the merged array. Falls back to read-modify-write if transactions
 * aren't available.
 */
export async function appendToFamilyArray(familyCode, key, entries) {
  if (!db) return entries
  const ref = dataRef(familyCode, key)
  try {
    return await runTransaction(db, async (txn) => {
      const snap = await txn.get(ref)
      const current = snap.exists() ? (snap.data().payload || []) : []
      const next = [...current, ...entries]
      txn.set(ref, { payload: next, updatedAt: serverTimestamp(), updatedBy: 'child_mode' })
      return next
    })
  } catch {
    const snap = await getDoc(ref)
    const current = snap.exists() ? (snap.data().payload || []) : []
    const next = [...current, ...entries]
    await setDoc(ref, { payload: next, updatedAt: serverTimestamp(), updatedBy: 'child_mode' })
    return next
  }
}

export async function appendChildActivity(familyCode, entry) {
  if (!db) return false
  // Best-effort: the child-activity feed is a non-critical, parent-facing log.
  // Its extra read-modify-write must NEVER fail the caller's real operation
  // (a balance change that has already committed) — otherwise the child sees
  // "שגיאה — נסה שוב" after the money already moved, and a retry double-charges.
  try {
    const ref = dataRef(familyCode, 'childActivity')
    const snap = await getDoc(ref)
    const current = snap.exists() ? (snap.data().payload || []) : []
    const next = [entry, ...current].slice(0, 100)
    await setDoc(ref, { payload: next, updatedAt: serverTimestamp(), updatedBy: 'child_mode' })
    return true
  } catch {
    return false
  }
}
