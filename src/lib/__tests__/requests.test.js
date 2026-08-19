import { describe, it, expect } from 'vitest'
import { newRequest, describeRequest, amountText, prunePendingChores, isActionable, isResolved, REQUEST_TYPES } from '../requests.js'

describe('newRequest', () => {
  it('builds a pending child request with type defaults', () => {
    const r = newRequest({ type: 'stars', childId: 'c1', childName: 'דני', amount: 10 }, 1000)
    expect(r).toMatchObject({
      childId: 'c1', childName: 'דני', type: 'stars', status: 'pending',
      source: 'child', timestamp: 1000, amount: 10, currency: 'stars',
    })
    expect(r.emoji).toBe(REQUEST_TYPES.stars.emoji)
    expect(r.title).toBe(REQUEST_TYPES.stars.label)
    expect(r.id).toBeTruthy()
  })

  it('falls back to free type for unknown type currency', () => {
    const r = newRequest({ type: 'weird', childId: 'c1' }, 1)
    expect(r.currency).toBeNull()
  })

  it('keeps explicit title, note and meta', () => {
    const r = newRequest({ type: 'free', childId: 'c1', title: 'רוצה סוכריה', note: 'בבקשה', meta: { x: 1 } }, 1)
    expect(r.title).toBe('רוצה סוכריה')
    expect(r.note).toBe('בבקשה')
    expect(r.meta).toEqual({ x: 1 })
  })
})

describe('amountText', () => {
  it('credit types show +unit', () => {
    expect(amountText({ type: 'stars', amount: 10, currency: 'stars' })).toBe('+10⭐')
    expect(amountText({ type: 'money', amount: 5, currency: 'shekels' })).toBe('+5₪')
  })
  it('debit types show -unit', () => {
    expect(amountText({ type: 'prize', amount: 8, currency: 'stars' })).toBe('-8⭐')
    expect(amountText({ type: 'purchase', amount: 12, currency: 'shekels' })).toBe('-12₪')
  })
  it('convert shows star→shekel arrow', () => {
    expect(amountText({ type: 'convert', amount: 20, currency: 'stars' })).toBe('20⭐ → ₪')
  })
  it('transfer shows target name when present', () => {
    expect(amountText({ type: 'transfer', amount: 5, currency: 'stars', meta: { toName: 'נועה' } })).toBe('5⭐ → נועה')
  })
  it('returns empty when no amount', () => {
    expect(amountText({ type: 'free' })).toBe('')
    expect(amountText({ type: 'goal', amount: null })).toBe('')
  })
})

describe('describeRequest', () => {
  it('surfaces emoji, type label, title and notify title', () => {
    const d = describeRequest({ type: 'prize', title: 'גלידה', emoji: '🍦', amount: 8, currency: 'stars' })
    expect(d).toMatchObject({ emoji: '🍦', typeLabel: 'פרס', title: 'גלידה', amount: '-8⭐' })
    expect(d.notifyTitle).toBe(REQUEST_TYPES.prize.notify)
  })
})

describe('isActionable / isResolved', () => {
  it('pending is actionable, approved/rejected are resolved', () => {
    expect(isActionable({ status: 'pending' })).toBe(true)
    expect(isActionable({ source: 'parent', status: 'done' })).toBe(true)
    expect(isActionable({ source: 'parent', status: 'assigned' })).toBe(false)
    expect(isResolved({ status: 'approved' })).toBe(true)
    expect(isResolved({ status: 'rejected' })).toBe(true)
    expect(isResolved({ status: 'pending' })).toBe(false)
  })
})

describe('prunePendingChores', () => {
  const now = 1_000_000_000_000
  const day = 86400000

  it('never drops active items', () => {
    const list = [
      { id: 'a', status: 'pending', timestamp: now - 100 * day },
      { id: 'b', status: 'assigned', timestamp: now - 100 * day },
      { id: 'c', status: 'done', timestamp: now - 100 * day },
    ]
    expect(prunePendingChores(list, { now }).map((r) => r.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('drops resolved items older than maxAge', () => {
    const list = [
      { id: 'fresh', status: 'approved', decidedAt: now - 2 * day },
      { id: 'old',   status: 'rejected', decidedAt: now - 30 * day },
    ]
    const kept = prunePendingChores(list, { now }).map((r) => r.id)
    expect(kept).toContain('fresh')
    expect(kept).not.toContain('old')
  })

  it('caps the number of resolved items, keeping newest', () => {
    const list = Array.from({ length: 60 }, (_, i) => ({ id: `r${i}`, status: 'approved', decidedAt: now - i * 1000 }))
    const kept = prunePendingChores(list, { now, maxResolved: 40 })
    expect(kept).toHaveLength(40)
    expect(kept[0].id).toBe('r0') // newest first
  })

  it('handles non-array input', () => {
    expect(prunePendingChores(null)).toEqual([])
  })
})
