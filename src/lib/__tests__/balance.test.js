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

  it('treats transfer/sale OUT as a debit (regression: was added back)', () => {
    // Sender: earned 20⭐, gifted 8⭐ away → 12 should remain
    expect(computeBalanceFromTransactions([
      tx('chore', 20),
      tx('stars_transfer_out', 8),
    ]).stars).toBe(12)
    // Sold stars out
    expect(computeBalanceFromTransactions([
      tx('chore', 20),
      tx('stars_sold_out', 5),
    ]).stars).toBe(15)
    // Sent money out
    expect(computeBalanceFromTransactions([
      tx('gift', 50, 'shekels'),
      tx('money_transfer_out', 20, 'shekels'),
    ]).shekels).toBe(30)
  })

  it('treats transfer/sale IN as a credit', () => {
    expect(computeBalanceFromTransactions([tx('stars_transfer_in', 8)]).stars).toBe(8)
    expect(computeBalanceFromTransactions([tx('stars_bought_in', 5)]).stars).toBe(5)
    expect(computeBalanceFromTransactions([tx('money_transfer_in', 20, 'shekels')]).shekels).toBe(20)
  })

  it('ignores malformed amounts', () => {
    const result = computeBalanceFromTransactions([tx('chore', 'abc'), tx('chore', 5)])
    expect(result.stars).toBe(5)
  })
})
