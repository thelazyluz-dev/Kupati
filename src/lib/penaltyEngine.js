// Pure daily-penalty computation — no storage, no React, no side effects.
// The hook (useDailyPenalty) gathers inputs, calls this, then applies the results.
// Keeping it pure makes the trickiest logic in the app unit-testable.

export function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/**
 * Compute which daily penalties should be applied right now.
 *
 * @param {Object}   input
 * @param {Array}    input.children      — children array (with penaltyCheck / penaltyEnabled)
 * @param {Object}   input.allTx         — { [childId]: Transaction[] }
 * @param {Array}    input.pendingChores — pending chore requests (all children)
 * @param {Date}     input.now           — current time (injectable for tests)
 * @param {Object}   input.amounts       — { first, repeat } star amounts
 *
 * @returns {{ penalties: Array, checks: Array }}
 *   penalties — [{ childId, childName, dayStr, amount, timestamp }] to apply
 *   checks    — [{ childId, penaltyCheck }] updates to write (every child gets one)
 */
export function computeDailyPenalties({ children, allTx, pendingChores, now, amounts }) {
  const first  = amounts?.first  ?? 5
  const repeat = amounts?.repeat ?? 10

  const todayStr = toLocalDateStr(now)
  const pastNoon = now.getHours() >= 12

  const todayStart   = new Date(todayStr + 'T00:00:00')
  const yesterdayStr = toLocalDateStr(new Date(todayStart.getTime() - 86400000))

  const penalties = []
  const checks    = []

  for (const child of children) {
    if (child.penaltyEnabled === false) continue

    const pc = child.penaltyCheck

    // New child (no penaltyCheck yet) — initialise only, never penalise
    // for days before the child joined the system.
    if (!pc) {
      checks.push({
        childId: child.id,
        penaltyCheck: { lastDate: todayStr, streak: 0, todayChecked: pastNoon },
      })
      continue
    }

    if (pc.lastDate === todayStr && pc.todayChecked) continue

    const txList = allTx[child.id] || []

    // Days to evaluate: catch-up from lastDate+1, always yesterday, today after noon
    const daysSet = new Set()
    const cursor = new Date(pc.lastDate + 'T00:00:00')
    cursor.setDate(cursor.getDate() + 1)
    while (cursor < todayStart) {
      daysSet.add(toLocalDateStr(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    daysSet.add(yesterdayStr)
    if (pastNoon) daysSet.add(todayStr)

    let streak = pc.streak || 0

    for (const dayStr of [...daysSet].sort()) {
      const dayStart = new Date(dayStr + 'T00:00:00').getTime()
      const dayEnd   = dayStart + 86400000

      const hadApprovedChore = txList.some(
        t => t.type === 'chore' && t.timestamp >= dayStart && t.timestamp < dayEnd
      )
      // Submitted-but-unapproved chores count — the child did the work
      const hadPendingChore = (pendingChores || []).some(
        req => req.childId === child.id
          && req.status !== 'rejected'
          && req.timestamp >= dayStart
          && req.timestamp < dayEnd
      )
      const alreadyPenalized = txList.some(
        t => t.type === 'penalty' && t.timestamp >= dayStart && t.timestamp < dayEnd
      )

      if (hadApprovedChore || hadPendingChore) {
        streak = 0
      } else if (!alreadyPenalized) {
        streak++
        penalties.push({
          childId: child.id,
          childName: child.name,
          dayStr,
          amount: streak === 1 ? first : repeat,
          timestamp: Math.min(dayEnd - 1000, now.getTime()),
        })
      }
    }

    checks.push({
      childId: child.id,
      penaltyCheck: { lastDate: todayStr, streak, todayChecked: pastNoon },
    })
  }

  return { penalties, checks }
}
