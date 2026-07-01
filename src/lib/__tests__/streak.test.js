import { describe, it, expect } from 'vitest'
import { calculateStreak } from '../utils.js'

function dayTs(daysAgo, hour = 10) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime() - daysAgo * 86400000 + hour * 3600000
}

const chore = (daysAgo) => ({ type: 'chore', amount: 1, timestamp: dayTs(daysAgo) })

describe('calculateStreak', () => {
  it('returns 0 with no chores', () => {
    expect(calculateStreak([])).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    expect(calculateStreak([chore(0), chore(1), chore(2)])).toBe(3)
  })

  it('keeps the streak alive if today has no chore yet (ends yesterday)', () => {
    expect(calculateStreak([chore(1), chore(2)])).toBe(2)
  })

  it('breaks on a missed day', () => {
    expect(calculateStreak([chore(0), chore(2), chore(3)])).toBe(1)
  })

  it('ignores non-chore transactions', () => {
    expect(calculateStreak([{ type: 'gift', amount: 5, timestamp: dayTs(0) }])).toBe(0)
  })
})
