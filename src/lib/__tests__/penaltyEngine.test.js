import { describe, it, expect } from 'vitest'
import { computeDailyPenalties, toLocalDateStr } from '../penaltyEngine.js'

// Helpers — build dates relative to a fixed "now": 2026-07-01 14:00 local (past noon)
const NOW = new Date(2026, 6, 1, 14, 0, 0)   // July 1st
const TODAY      = toLocalDateStr(NOW)                                   // 2026-07-01
const YESTERDAY  = toLocalDateStr(new Date(2026, 5, 30))                 // 2026-06-30
const TWO_DAYS   = toLocalDateStr(new Date(2026, 5, 29))                 // 2026-06-29

function ts(dateStr, hour = 10) {
  return new Date(dateStr + 'T00:00:00').getTime() + hour * 3600000
}

function child(overrides = {}) {
  return {
    id: 'c1', name: 'דני', starBalance: 20,
    penaltyCheck: { lastDate: YESTERDAY, streak: 0, todayChecked: false },
    ...overrides,
  }
}

function run({ children, allTx = {}, pendingChores = [], now = NOW, amounts } = {}) {
  return computeDailyPenalties({ children, allTx, pendingChores, now, amounts })
}

describe('computeDailyPenalties', () => {
  it('penalizes a child with no chores yesterday and today (past noon)', () => {
    const { penalties } = run({ children: [child()] })
    // yesterday (streak 1 → first amount) + today (streak 2 → repeat amount)
    expect(penalties).toHaveLength(2)
    expect(penalties[0]).toMatchObject({ childId: 'c1', dayStr: YESTERDAY, amount: 5 })
    expect(penalties[1]).toMatchObject({ childId: 'c1', dayStr: TODAY, amount: 10 })
  })

  it('does NOT penalize when an approved chore tx exists for the day', () => {
    const allTx = { c1: [
      { type: 'chore', amount: 3, timestamp: ts(YESTERDAY) },
      { type: 'chore', amount: 3, timestamp: ts(TODAY) },
    ] }
    const { penalties } = run({ children: [child()], allTx })
    expect(penalties).toHaveLength(0)
  })

  it('does NOT penalize when a pending (unapproved) chore request exists', () => {
    const pendingChores = [
      { childId: 'c1', status: 'pending', timestamp: ts(YESTERDAY) },
      { childId: 'c1', status: 'done',    timestamp: ts(TODAY) },
    ]
    const { penalties } = run({ children: [child()], pendingChores })
    expect(penalties).toHaveLength(0)
  })

  it('DOES penalize when the only pending chore was rejected', () => {
    const pendingChores = [
      { childId: 'c1', status: 'rejected', timestamp: ts(YESTERDAY) },
    ]
    const { penalties } = run({ children: [child()], pendingChores })
    expect(penalties.some(p => p.dayStr === YESTERDAY)).toBe(true)
  })

  it('ignores another child\'s pending chores', () => {
    const pendingChores = [
      { childId: 'OTHER', status: 'pending', timestamp: ts(YESTERDAY) },
    ]
    const { penalties } = run({ children: [child()], pendingChores })
    expect(penalties.some(p => p.dayStr === YESTERDAY)).toBe(true)
  })

  it('is idempotent — skips days that already have a penalty tx', () => {
    const allTx = { c1: [
      { type: 'penalty', amount: 5, timestamp: ts(YESTERDAY) },
      { type: 'penalty', amount: 5, timestamp: ts(TODAY) },
    ] }
    const { penalties } = run({ children: [child()], allTx })
    expect(penalties).toHaveLength(0)
  })

  it('initialises new children without penalizing them', () => {
    const { penalties, checks } = run({ children: [child({ penaltyCheck: undefined })] })
    expect(penalties).toHaveLength(0)
    expect(checks[0].penaltyCheck).toMatchObject({ lastDate: TODAY, streak: 0, todayChecked: true })
  })

  it('skips children with penaltyEnabled === false', () => {
    const { penalties, checks } = run({ children: [child({ penaltyEnabled: false })] })
    expect(penalties).toHaveLength(0)
    expect(checks).toHaveLength(0)
  })

  it('skips entirely when already checked today', () => {
    const c = child({ penaltyCheck: { lastDate: TODAY, streak: 3, todayChecked: true } })
    const { penalties, checks } = run({ children: [c] })
    expect(penalties).toHaveLength(0)
    expect(checks).toHaveLength(0)
  })

  it('does not check today before noon', () => {
    const morning = new Date(2026, 6, 1, 9, 0, 0)
    const { penalties } = run({ children: [child()], now: morning })
    expect(penalties).toHaveLength(1)          // only yesterday
    expect(penalties[0].dayStr).toBe(YESTERDAY)
  })

  it('catches up missed days between lastDate and today', () => {
    const c = child({ penaltyCheck: { lastDate: TWO_DAYS, streak: 0, todayChecked: false } })
    const { penalties } = run({ children: [c] })
    // 06-30 (yesterday) + 07-01 (today past noon) — catch-up from 06-29+1 = 06-30 (deduped with yesterday)
    expect(penalties.map(p => p.dayStr)).toEqual([YESTERDAY, TODAY])
  })

  it('a chore resets the escalation streak', () => {
    const c = child({ penaltyCheck: { lastDate: YESTERDAY, streak: 4, todayChecked: false } })
    const allTx = { c1: [{ type: 'chore', amount: 2, timestamp: ts(YESTERDAY) }] }
    const { penalties, checks } = run({ children: [c], allTx })
    // yesterday had a chore → streak reset → today's penalty is "first" amount again
    expect(penalties).toHaveLength(1)
    expect(penalties[0]).toMatchObject({ dayStr: TODAY, amount: 5 })
    expect(checks[0].penaltyCheck.streak).toBe(1)
  })

  it('respects custom amounts from settings', () => {
    const { penalties } = run({ children: [child()], amounts: { first: 2, repeat: 4 } })
    expect(penalties[0].amount).toBe(2)
    expect(penalties[1].amount).toBe(4)
  })

  it('penalty timestamps land inside the penalized day', () => {
    const { penalties } = run({ children: [child()] })
    const p = penalties[0]
    const dayStart = new Date(p.dayStr + 'T00:00:00').getTime()
    expect(p.timestamp).toBeGreaterThanOrEqual(dayStart)
    expect(p.timestamp).toBeLessThan(dayStart + 86400000)
  })
})
