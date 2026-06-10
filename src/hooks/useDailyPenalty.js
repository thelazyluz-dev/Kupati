import { useEffect, useRef } from 'react'
import { get } from '../lib/storage.js'
import { notifyPenalty } from '../lib/notifications.js'

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

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

    // Read directly from localStorage, not React state. attach() writes synced
    // data to localStorage *before* dispatching kupati-storage. React batches
    // the resulting setState calls and may flush them in the same render as
    // syncStatus='ok', but reading get() is always safe and consistent.
    const allTx         = get('all_transactions') ?? {}
    const pendingChores = get('pendingChores')    ?? []
    const freshChildren = get('children')         ?? childrenApi.children

    const now = new Date()
    const todayStr = toLocalDateStr(now)
    const pastNoon = now.getHours() >= 12

    const todayStart   = new Date(todayStr + 'T00:00:00')
    const yesterdayStr = toLocalDateStr(new Date(todayStart.getTime() - 86400000))

    freshChildren.forEach(child => {
      if (child.penaltyEnabled === false) return

      const pc = child.penaltyCheck

      // New child (no penaltyCheck yet) — just initialise, don't penalise for days before joining
      if (!pc) {
        childrenApi.updateChild(child.id, {
          penaltyCheck: { lastDate: todayStr, streak: 0, todayChecked: pastNoon },
        })
        return
      }

      const alreadyCheckedToday = pc.lastDate === todayStr && pc.todayChecked
      if (alreadyCheckedToday) return

      const txList = allTx[child.id] || []

      // Collect days: catch-up from lastDate+1, always include yesterday, today if past noon
      const daysSet = new Set()
      const cursor = new Date(pc.lastDate + 'T00:00:00')
      cursor.setDate(cursor.getDate() + 1)
      while (cursor < todayStart) {
        daysSet.add(toLocalDateStr(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      daysSet.add(yesterdayStr)           // always check yesterday
      if (pastNoon) daysSet.add(todayStr) // check today only after noon

      const days = [...daysSet].sort()

      let streak = pc.streak || 0

      days.forEach(dayStr => {
        const dayStart = new Date(dayStr + 'T00:00:00').getTime()
        const dayEnd   = dayStart + 86400000

        // Count approved chore transactions for this day
        const hadApprovedChore = txList.some(
          t => t.type === 'chore' && t.timestamp >= dayStart && t.timestamp < dayEnd
        )

        // Also count pending/submitted chore requests — child did the work even if not yet approved
        const hadPendingChore = (pendingChores || []).some(
          pc => pc.childId === child.id
            && pc.status !== 'rejected'
            && pc.timestamp >= dayStart
            && pc.timestamp < dayEnd
        )

        const hadChore = hadApprovedChore || hadPendingChore

        // Idempotent: skip if penalty already recorded for this day
        const alreadyPenalized = txList.some(
          t => t.type === 'penalty' && t.timestamp >= dayStart && t.timestamp < dayEnd
        )

        if (hadChore) {
          streak = 0
        } else if (!alreadyPenalized) {
          streak++
          const amount = streak === 1 ? 5 : 10
          childrenApi.adjustStars(child.id, -amount)
          transactionsApi.addTransaction(child.id, {
            type: 'penalty',
            amount,
            currency: 'stars',
            description: `⚡ קנס יומי — לא בוצעה מטלה (${dayStr})`,
            timestamp: Math.min(dayEnd - 1000, now.getTime()),
          })
          notifyPenalty(child.name, amount, dayStr)
        }
      })

      childrenApi.updateChild(child.id, {
        penaltyCheck: {
          lastDate: todayStr,
          streak,
          todayChecked: pastNoon,
        },
      })
    })
  }, [syncStatus]) // eslint-disable-line react-hooks/exhaustive-deps
}
