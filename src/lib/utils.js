export function getTotalValue(child, settings) {
  const rate = child.exchangeRate ?? settings.globalExchangeRate
  return child.shekelBalance + child.starBalance * rate
}

export function getGoalProgress(child, settings) {
  if (!child.goal || child.goal.targetAmount <= 0) return 0
  const total = getTotalValue(child, settings)
  return total / child.goal.targetAmount
}

export function formatRelativeTime(timestamp) {
  const diff = timestamp - Date.now()
  const rtf = new Intl.RelativeTimeFormat('he', { numeric: 'auto' })
  const seconds = Math.round(diff / 1000)
  const minutes = Math.round(diff / 60000)
  const hours = Math.round(diff / 3600000)
  const days = Math.round(diff / 86400000)

  if (Math.abs(days) >= 1) return rtf.format(days, 'day')
  if (Math.abs(hours) >= 1) return rtf.format(hours, 'hour')
  if (Math.abs(minutes) >= 1) return rtf.format(minutes, 'minute')
  return 'עכשיו'
}

export function formatDate(timestamp) {
  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function formatNumber(n) {
  return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 }).format(n)
}

export function generateId() {
  return crypto.randomUUID()
}
