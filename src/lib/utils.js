const DATE_DAY_NAMES  = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const DATE_MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

// "היום" / "אתמול" / "ג׳ 7 אפריל"
export function formatDateLabel(timestamp) {
  const now   = new Date()
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const date      = new Date(timestamp)
  const d         = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (d.getTime() === today.getTime())     return 'היום'
  if (d.getTime() === yesterday.getTime()) return 'אתמול'
  return `${DATE_DAY_NAMES[date.getDay()]} ${date.getDate()} ${DATE_MONTH_NAMES[date.getMonth()]}`
}

// Stars are no longer convertible to money — goals are funded by shekels only
export function getTotalValue(child) {
  return child.shekelBalance
}

// Returns goals array, handling legacy single-goal format
export function getGoals(child) {
  if (Array.isArray(child.goals)) return child.goals
  if (child.goal) return [child.goal]
  return []
}

export function getGoalProgress(child, settings, goal) {
  const g = goal ?? getGoals(child)[0]
  if (!g || g.targetAmount <= 0) return 0
  const total = getTotalValue(child, settings)
  return total / g.targetAmount
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

// How many chores (on average) until the child reaches a goal
// Returns null if already reached or no goal
export function starsNeededForGoal(child, settings, goal, chores) {
  if (!goal) return null
  const rate = child.exchangeRate ?? settings.globalExchangeRate
  const total = getTotalValue(child, settings)
  const shekelGap = goal.targetAmount - total
  if (shekelGap <= 0) return null          // already reached
  const starsGap = shekelGap / rate        // stars still needed
  const avgStars = chores?.length
    ? chores.reduce((s, c) => s + (c.defaultStars || 0), 0) / chores.length
    : 2                                    // fallback avg
  return Math.ceil(starsGap / avgStars)   // number of average chores
}

// Consecutive days the child has done at least one chore, ending today (or yesterday)
export function calculateStreak(transactions) {
  function hasChoreOn(dayMs) {
    return transactions.some(
      (tx) => tx.type === 'chore' && tx.timestamp >= dayMs && tx.timestamp < dayMs + 86400000
    )
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let check = today.getTime()
  // If today has no chores yet, allow streak from yesterday to still be alive
  if (!hasChoreOn(check)) check -= 86400000
  let streak = 0
  while (hasChoreOn(check)) {
    streak++
    check -= 86400000
    if (streak > 365) break
  }
  return streak
}

// Returns days until next birthday, 0 if today, null if no birthday set
export function daysUntilBirthday(birthdayMMDD) {
  if (!birthdayMMDD) return null
  const [month, day] = birthdayMMDD.split('-').map(Number)
  if (!month || !day) return null
  const now = new Date()
  const next = new Date(now.getFullYear(), month - 1, day)
  // If date already passed this year, use next year
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next.setFullYear(now.getFullYear() + 1)
  }
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((next - todayMidnight) / 86400000)
}
