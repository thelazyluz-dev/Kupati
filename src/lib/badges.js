// Badge definitions and checker
export const BADGE_DEFS = [
  { id: 'chores_10',  emoji: '🔟', label: '10 מטלות!',    desc: 'השלמת 10 מטלות בסך הכל' },
  { id: 'chores_50',  emoji: '💪', label: '50 מטלות!',    desc: 'השלמת 50 מטלות בסך הכל' },
  { id: 'stars_50',   emoji: '⭐', label: '50 כוכבים!',   desc: 'צברת 50 כוכבים ממטלות' },
  { id: 'stars_100',  emoji: '💫', label: '100 כוכבים!',  desc: 'צברת 100 כוכבים ממטלות' },
  { id: 'goal_1',     emoji: '🏆', label: 'מטרה ראשונה!', desc: 'מימשת את המטרה הראשונה שלך!' },
  { id: 'week_fire',  emoji: '🔥', label: 'שבוע אש!',     desc: '5 מטלות בשבוע אחד' },
]

// Check which NEW badges the child earned (not already in child.badges[]).
// `transactions` should include the latest transaction (projected state).
// Returns array of newly earned badge defs.
export function checkBadges(child, transactions) {
  const earned = new Set((child.badges || []).map((b) => b.id))
  const newBadges = []

  const chores = transactions.filter((tx) => tx.type === 'chore')
  const totalStarsEarned = chores.reduce((s, tx) => s + tx.amount, 0)

  if (!earned.has('chores_10') && chores.length >= 10)
    newBadges.push(BADGE_DEFS.find((b) => b.id === 'chores_10'))
  if (!earned.has('chores_50') && chores.length >= 50)
    newBadges.push(BADGE_DEFS.find((b) => b.id === 'chores_50'))
  if (!earned.has('stars_50') && totalStarsEarned >= 50)
    newBadges.push(BADGE_DEFS.find((b) => b.id === 'stars_50'))
  if (!earned.has('stars_100') && totalStarsEarned >= 100)
    newBadges.push(BADGE_DEFS.find((b) => b.id === 'stars_100'))

  // week_fire: 5 chores in the current Sun–Sat week
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const weekStart = new Date(d)
  weekStart.setDate(d.getDate() - d.getDay())
  const weekEnd = weekStart.getTime() + 7 * 86400000
  const weekChores = chores.filter(
    (tx) => tx.timestamp >= weekStart.getTime() && tx.timestamp < weekEnd
  )
  if (!earned.has('week_fire') && weekChores.length >= 5)
    newBadges.push(BADGE_DEFS.find((b) => b.id === 'week_fire'))

  return newBadges.filter(Boolean)
}
