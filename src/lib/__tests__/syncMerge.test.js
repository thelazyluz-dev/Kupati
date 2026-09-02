import { describe, it, expect } from 'vitest'
import { mergePendingChores, mergeTransactions, mergeChildActivity } from '../syncEngine.js'

describe('mergePendingChores', () => {
  const req = (id, status, timestamp = 1000) => ({ id, status, timestamp })

  it('keeps entries that exist only on one side', () => {
    const merged = mergePendingChores([req('a', 'pending')], [req('b', 'pending', 2000)])
    expect(merged.map(r => r.id).sort()).toEqual(['a', 'b'])
  })

  it('remote approved beats local pending (and vice versa)', () => {
    expect(mergePendingChores([req('a', 'pending')], [req('a', 'approved')])[0].status).toBe('approved')
    expect(mergePendingChores([req('a', 'approved')], [req('a', 'pending')])[0].status).toBe('approved')
  })

  it('rejected is terminal — pending never resurrects it', () => {
    const merged = mergePendingChores([req('a', 'rejected')], [req('a', 'pending')])
    expect(merged[0].status).toBe('rejected')
  })

  it('done beats pending but loses to approved', () => {
    expect(mergePendingChores([req('a', 'done')], [req('a', 'pending')])[0].status).toBe('done')
    expect(mergePendingChores([req('a', 'done')], [req('a', 'approved')])[0].status).toBe('approved')
  })

  it('sorts newest first', () => {
    const merged = mergePendingChores([req('old', 'pending', 1)], [req('new', 'pending', 9)])
    expect(merged[0].id).toBe('new')
  })
})

describe('mergeTransactions', () => {
  const tx = (id, timestamp = 1000) => ({ id, timestamp, type: 'chore', amount: 1 })

  it('unions transactions by id — nothing is ever lost', () => {
    const local  = { c1: [tx('t1', 1), tx('t2', 2)] }
    const remote = { c1: [tx('t2', 2), tx('t3', 3)], c2: [tx('t4', 4)] }
    const merged = mergeTransactions(local, remote)
    expect(merged.c1.map(t => t.id).sort()).toEqual(['t1', 't2', 't3'])
    expect(merged.c2.map(t => t.id)).toEqual(['t4'])
  })

  it('does not duplicate identical ids', () => {
    const merged = mergeTransactions({ c1: [tx('t1')] }, { c1: [tx('t1')] })
    expect(merged.c1).toHaveLength(1)
  })

  it('handles null/empty inputs', () => {
    expect(mergeTransactions(null, null)).toEqual({})
    expect(mergeTransactions({ c1: [tx('t1')] }, null).c1).toHaveLength(1)
  })

  it('sorts each child newest-first after merge', () => {
    const merged = mergeTransactions({ c1: [tx('a', 1)] }, { c1: [tx('b', 99)] })
    expect(merged.c1[0].id).toBe('b')
  })
})

describe('mergeChildActivity', () => {
  const ev = (id, timestamp = 1000) => ({ id, timestamp })

  it('appends only unseen remote entries', () => {
    const merged = mergeChildActivity([ev('a', 2)], [ev('a', 2), ev('b', 3)])
    expect(merged.map(e => e.id).sort()).toEqual(['a', 'b'])
  })

  it('caps at 200 entries, keeping the newest', () => {
    const local  = Array.from({ length: 150 }, (_, i) => ev(`l${i}`, i))
    const remote = Array.from({ length: 150 }, (_, i) => ev(`r${i}`, 1000 + i))
    const merged = mergeChildActivity(local, remote)
    expect(merged).toHaveLength(200)
    expect(merged[0].id).toBe('r149')   // newest first
  })
})
