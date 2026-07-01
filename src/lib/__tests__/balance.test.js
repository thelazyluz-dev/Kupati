import { describe, it, expect } from 'vitest'
import { computeBalanceFromTransactions } from '../utils.js'

const tx = (type, amount, currency = 'stars') => ({ type, amount, currency, timestamp: 1 })

describe('computeBalanceFromTransactions', () => {
  it('returns zeros for empty history', () => {
    expect(computeBalanceFromTransactions([])).toEqual({ stars: 0, shekels: 0 })
  })

  it('adds credit types and subtracts deduct types', () => {
    const result = computeBalanceFromTransactions([
      tx('chore', 10),
      tx('penalty', 3),
      tx('gift', 50, 'shekels'),
      tx('expense', 20, 'shekels'),
    ])
    expect(result).toEqual({ stars: 7, shekels: 30 })
  })

  it('handles conversion pairs across currencies', () => {
    const result = computeBalanceFromTransactions([
      tx('chore', 10),
      tx('convert_out', 4),              // -4 stars
      tx('convert_in', 8, 'shekels'),    // +8 shekels
    ])
    expect(result).toEqual({ stars: 6, shekels: 8 })
  })

  it('never returns negative balances', () => {
    const result = computeBalanceFromTransactions([tx('penalty', 99)])
    expect(result.stars).toBe(0)
  })

  it('ignores malformed amounts', () => {
    const result = computeBalanceFromTransactions([tx('chore', 'abc'), tx('chore', 5)])
    expect(result.stars).toBe(5)
  })
})
