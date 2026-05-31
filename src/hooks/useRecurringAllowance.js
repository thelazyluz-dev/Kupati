import { useEffect } from 'react'
import { notifyAllowance } from '../lib/notifications.js'

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function lastDueDate(period, now) {
  if (period === 'monthly') {
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  }
  // weekly: last Sunday (day 0)
  const d = new Date(now)
  d.setDate(d.getDate() - d.getDay())
  return toLocalDateStr(d)
}

export function useRecurringAllowance(childrenApi, transactionsApi) {
  useEffect(() => {
    const now = new Date()
    childrenApi.children.forEach(child => {
      const al     = child.allowance
      const amount = parseFloat(al?.amount)
      if (!al?.enabled || !(amount > 0)) return

      const due = lastDueDate(al.period || 'weekly', now)
      if ((al.lastPaid || '') >= due) return  // already paid this period

      const newBalance = (child.shekelBalance || 0) + amount
      childrenApi.updateChild(child.id, {
        shekelBalance: newBalance,
        peakShekels:   Math.max(child.peakShekels || 0, newBalance),
        allowance:     { ...al, lastPaid: due },
      })
      transactionsApi.addTransaction(child.id, {
        type:        'allowance',
        amount,
        currency:    'shekels',
        description: `💰 קצבה${al.period === 'monthly' ? ' חודשית' : ' שבועית'} — ${amount}₪`,
        timestamp:   Date.now(),
      })
      notifyAllowance(child.name, amount)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
