import { useEffect } from 'react'

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function useDailyPenalty(childrenApi, transactionsApi) {
  useEffect(() => {
    const now = new Date()
    const todayStr = toLocalDateStr(now)
    const pastNoon = now.getHours() >= 12

    const todayStart   = new Date(todayStr + 'T00:00:00')
    const yesterdayStr = toLocalDateStr(new Date(todayStart.getTime() - 86400000))

    childrenApi.children.forEach(child => {
      const pc = child.penaltyCheck || { lastDate: yesterdayStr, streak: 0 }

      const alreadyCheckedToday = pc.lastDate === todayStr && pc.todayChecked
      if (alreadyCheckedToday) return

      const txList = transactionsApi.getTransactions(child.id)

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

        const hadChore = txList.some(
          t => t.type === 'chore' && t.timestamp >= dayStart && t.timestamp < dayEnd
        )
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
