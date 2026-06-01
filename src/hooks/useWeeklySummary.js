import { useEffect } from 'react'
import { notifyWeeklySummary } from '../lib/notifications.js'

function toWeekKey(now) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // back to Sunday
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function useWeeklySummary(childrenApi, transactionsApi) {
  useEffect(() => {
    const now = new Date()
    if (now.getDay() !== 5) return // Friday only

    const weekKey = toWeekKey(now)
    const ssKey = `weeklySummary_${weekKey}`
    if (sessionStorage.getItem(ssKey)) return

    const weekStartMs = new Date(weekKey).getTime()
    const nowMs = now.getTime()

    childrenApi.children.forEach(child => {
      const txs = transactionsApi.getTransactions(child.id)
      const week = txs.filter(tx => tx.timestamp >= weekStartMs && tx.timestamp <= nowMs)

      const chores   = week.filter(tx => tx.type === 'chore').length
      const stars    = week.filter(tx => tx.type === 'chore' && tx.currency === 'stars').reduce((s, tx) => s + tx.amount, 0)
      const shekels  = week.filter(tx => ['allowance','gift','wheel_win'].includes(tx.type) && tx.currency === 'shekels').reduce((s, tx) => s + tx.amount, 0)

      if (!chores && !stars && !shekels) return

      const parts = []
      if (chores  > 0) parts.push(`${chores} מטלות`)
      if (stars   > 0) parts.push(`+${stars}⭐`)
      if (shekels > 0) parts.push(`+${shekels}₪`)

      notifyWeeklySummary(child.name, parts.join(' | '))
    })

    sessionStorage.setItem(ssKey, '1')
  }, []) // eslint-disable-line
}
