import { useEffect, useRef } from 'react'
import { get, set } from '../lib/storage.js'
import { notifyPenalty } from '../lib/notifications.js'
import { computeDailyPenalties } from '../lib/penaltyEngine.js'
import { claimDailyPenaltyLock } from '../lib/syncEngine.js'

// hasFamilyCode: when true, wait for sync ('ok'/'error'/'offline') before running.
//   Without a familyCode syncStatus is always 'idle', so we must not gate on it.
export function useDailyPenalty(childrenApi, transactionsApi, syncStatus, hasFamilyCode) {
  const appliedRef = useRef(false)

  useEffect(() => {
    // When a family code is set, wait for the initial Firestore pull to finish.
    // 'idle' = not started yet, 'syncing' = pull in progress — both mean
    // all_transactions / pendingChores may be stale.
    if (hasFamilyCode && (syncStatus === 'idle' || syncStatus === 'syncing')) return
    if (appliedRef.current) return
    appliedRef.current = true

    async function run() {
      // Read directly from localStorage, not React state. attach() writes synced
      // data to localStorage *before* dispatching kupati-storage. React batches
      // the resulting setState calls and may flush them in the same render as
      // syncStatus='ok', but reading get() is always safe and consistent.
      const allTx         = get('all_transactions') ?? {}
      const pendingChores = get('pendingChores')    ?? []
      const children      = get('children')         ?? childrenApi.children
      const settings      = get('settings')         ?? {}

      const now = new Date()
      const { penalties, checks } = computeDailyPenalties({
        children, allTx, pendingChores, now,
        amounts: settings.dailyPenalty,
      })

      // penaltyCheck updates are always safe to write (idempotent bookkeeping)
      checks.forEach(({ childId, penaltyCheck }) =>
        childrenApi.updateChild(childId, { penaltyCheck })
      )

      if (penalties.length === 0) return

      // Cross-device guard: when syncing, claim today's lock in Firestore so
      // two parent phones opened the same morning can't both penalize.
      // Offline/no-code → claim resolves true (single-device is safe locally).
      if (hasFamilyCode && syncStatus === 'ok') {
        const won = await claimDailyPenaltyLock(now)
        if (!won) return
      }

      const appliedTxIds = []
      penalties.forEach(({ childId, childName, dayStr, amount, timestamp }) => {
        childrenApi.adjustStars(childId, -amount)
        const tx = transactionsApi.addTransaction(childId, {
          type: 'penalty',
          amount,
          currency: 'stars',
          description: `⚡ קנס יומי — לא בוצעה מטלה (${dayStr})`,
          timestamp,
        })
        if (tx?.id) appliedTxIds.push({ childId, txId: tx.id, childName, amount, dayStr })
        notifyPenalty(childName, amount, dayStr)
      })

      // Remember what this session applied so the UI can offer one-tap undo
      if (appliedTxIds.length > 0) {
        set('lastDailyPenalties', { appliedAt: Date.now(), items: appliedTxIds })
        window.dispatchEvent(new CustomEvent('kupati-storage', { detail: { key: 'lastDailyPenalties' } }))
      }
    }

    run()
  }, [syncStatus]) // eslint-disable-line react-hooks/exhaustive-deps
}
