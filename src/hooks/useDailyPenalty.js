import { useEffect } from 'react'

export function useDailyPenalty(childrenApi, transactionsApi) {
  useEffect(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const pastNoon = now.getHours() >= 12

    childrenApi.children.forEach(child => {
      const pc = child.penaltyCheck || { lastDate: todayStr, streak: 0 }

      // Skip if we already ran the full check today
      // (pastNoon flag lets us re-check when app opens after noon for today's penalty)
      const alreadyCheckedToday = pc.lastDate === todayStr && pc.todayChecked
      if (alreadyCheckedToday) return

      const txList = transactionsApi.getTransactions(child.id)

      // Collect days: lastDate+1 → yesterday always, + today if past noon
      const days = []
      const cursor = new Date(pc.lastDate + 'T00:00:00')
      cursor.setDate(cursor.getDate() + 1)
      const todayStart = new Date(todayStr + 'T00:00:00')

      while (cursor < todayStart) {
        days.push(cursor.toISOString().slice(0, 10))
        cursor.setDate(cursor.getDate() + 1)
      }
      if (pastNoon) days.push(todayStr)

      if (days.length === 0) return

      let streak = pc.streak || 0

      days.forEach(dayStr => {
        const dayStart = new Date(dayStr + 'T00:00:00').getTime()
        const dayEnd   = dayStart + 86400000
        const hadChore = txList.some(
          t => t.type === 'chore' && t.timestamp >= dayStart && t.timestamp < dayEnd
        )

        if (hadChore) {
          streak = 0
        } else {
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
