import { useLocalStorage } from './useLocalStorage.js'
import { generateId, computeBalanceFromTransactions } from '../lib/utils.js'
import { DEFAULT_SETTINGS } from '../lib/defaults.js'

export function useChildren() {
  const [children, setChildren] = useLocalStorage('children', [])

  function addChild({ name, avatar, exchangeRate, grade }) {
    const child = {
      id: generateId(),
      name,
      avatar: avatar || '🦁',
      starBalance: 0,
      shekelBalance: 0,
      goals: [],
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
      grade: grade || 1,
    }
    setChildren((prev) => [...prev, child])
    return child
  }

  function updateChild(id, updates) {
    setChildren((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  function deleteChild(id) {
    setChildren((prev) => prev.filter((c) => c.id !== id))
  }

  // ── Goals ──────────────────────────────────────────────
  function addGoal(childId, { name, emoji, targetAmount, goalImage }) {
    const goal = { id: generateId(), name, emoji, targetAmount, goalImage: goalImage || null }
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== childId) return c
        // Migrate legacy single-goal
        const existing = Array.isArray(c.goals)
          ? c.goals
          : c.goal ? [{ id: generateId(), ...c.goal }] : []
        return { ...c, goals: [...existing, goal], goal: undefined }
      })
    )
  }

  function updateGoal(childId, goalId, updates) {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== childId) return c
        const goals = Array.isArray(c.goals) ? c.goals : c.goal ? [{ id: generateId(), ...c.goal }] : []
        return { ...c, goals: goals.map((g) => (g.id === goalId ? { ...g, ...updates } : g)), goal: undefined }
      })
    )
  }

  function deleteGoal(childId, goalId) {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== childId) return c
        const goals = Array.isArray(c.goals) ? c.goals : []
        return { ...c, goals: goals.filter((g) => g.id !== goalId) }
      })
    )
  }

  // ── Balances ────────────────────────────────────────────
  function addStars(id, amount) {
    const stars = parseFloat(amount) || 0
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const newBal = c.starBalance + stars
        return { ...c, starBalance: newBal, starBalancePeak: Math.max(c.starBalancePeak || 0, newBal) }
      })
    )
  }

  function addMoney(id, amount) {
    const shekels = parseFloat(amount) || 0
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const newBal = c.shekelBalance + shekels
        return { ...c, shekelBalance: newBal, shekelBalancePeak: Math.max(c.shekelBalancePeak || 0, newBal) }
      })
    )
  }

  function adjustStars(id, delta) {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const newBal = Math.max(0, c.starBalance + delta)
        return { ...c, starBalance: newBal, starBalancePeak: Math.max(c.starBalancePeak || 0, newBal) }
      })
    )
  }

  function adjustShekels(id, delta) {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const newBal = Math.max(0, c.shekelBalance + delta)
        return { ...c, shekelBalance: newBal, shekelBalancePeak: Math.max(c.shekelBalancePeak || 0, newBal) }
      })
    )
  }

  function deductMoney(id, amount) {
    const shekels = parseFloat(amount) || 0
    let success = false
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        if (shekels > c.shekelBalance) { success = false; return c }
        success = true
        return { ...c, shekelBalance: c.shekelBalance - shekels }
      })
    )
    return success
  }

  function convertStars(id, starCount, settings) {
    const stars = parseFloat(starCount) || 0
    let converted = 0
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        if (stars > c.starBalance) return c
        const rate = c.exchangeRate ?? (settings?.globalExchangeRate ?? DEFAULT_SETTINGS.globalExchangeRate)
        converted = Math.round(stars * rate * 100) / 100   // keep shekels to 2 decimals
        return { ...c, starBalance: c.starBalance - stars, shekelBalance: c.shekelBalance + converted }
      })
    )
    return converted
  }

  function resetChild(id) {
    setChildren((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, starBalance: 0, shekelBalance: 0 } : c
      )
    )
  }

  // ── Savings ─────────────────────────────────────────────
  function openSavings(id, { amount }) {
    const saving = { id: generateId(), amount, startDate: Date.now(), status: 'active' }
    setChildren((prev) =>
      prev.map((c) =>
        c.id !== id ? c : {
          ...c,
          shekelBalance: Math.max(0, c.shekelBalance - amount),
          savings: [...(c.savings || []), saving],
        }
      )
    )
    return saving
  }

  // mode: 'matured' | 'early'
  function closeSavings(id, savingId, mode, creditAmount) {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        return {
          ...c,
          shekelBalance: c.shekelBalance + creditAmount,
          savings: (c.savings || []).map((s) =>
            s.id !== savingId ? s : { ...s, status: mode === 'matured' ? 'matured' : 'withdrawn_early' }
          ),
        }
      })
    )
  }

  function awardBadge(id, badge) {
    setChildren((prev) =>
      prev.map((c) =>
        c.id !== id ? c : {
          ...c,
          badges: [...(c.badges || []), { ...badge, awardedAt: Date.now() }],
        }
      )
    )
  }

  function grantFreeSpin(id) {
    setChildren((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, freeSpins: (c.freeSpins || 0) + 1 } : c
      )
    )
  }

  function consumeFreeSpin(id) {
    setChildren((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, freeSpins: Math.max(0, (c.freeSpins || 0) - 1) } : c
      )
    )
  }

  // ── Loans ───────────────────────────────────────────────
  function addLoan(childId, { amount, description }) {
    const loan = { id: generateId(), amount, description, timestamp: Date.now(), repaid: false }
    setChildren((prev) =>
      prev.map((c) =>
        c.id !== childId ? c : {
          ...c,
          shekelBalance: c.shekelBalance + amount,
          shekelBalancePeak: Math.max(c.shekelBalancePeak || 0, c.shekelBalance + amount),
          loans: [...(c.loans || []), loan],
        }
      )
    )
    return loan
  }

  function repayLoan(childId, loanId) {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== childId) return c
        const loan = (c.loans || []).find((l) => l.id === loanId)
        if (!loan || loan.repaid) return c
        return {
          ...c,
          shekelBalance: Math.max(0, c.shekelBalance - loan.amount),
          loans: c.loans.map((l) => l.id === loanId ? { ...l, repaid: true } : l),
        }
      })
    )
  }

  function deleteLoan(childId, loanId) {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== childId) return c
        const loan = (c.loans || []).find((l) => l.id === loanId)
        if (!loan) return c
        return {
          ...c,
          // If not yet repaid, reverse the original credit
          shekelBalance: loan.repaid ? c.shekelBalance : Math.max(0, c.shekelBalance - loan.amount),
          loans: c.loans.filter((l) => l.id !== loanId),
        }
      })
    )
  }

  function undoRepayLoan(childId, loanId) {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== childId) return c
        const loan = (c.loans || []).find((l) => l.id === loanId)
        if (!loan || !loan.repaid) return c
        return {
          ...c,
          shekelBalance: c.shekelBalance + loan.amount,
          loans: c.loans.map((l) => l.id === loanId ? { ...l, repaid: false } : l),
        }
      })
    )
  }

  // ── Memories ────────────────────────────────────────────
  function addMemory(childId, { text, date }) {
    const memory = { id: generateId(), text, date, timestamp: Date.now() }
    setChildren((prev) =>
      prev.map((c) =>
        c.id !== childId ? c : { ...c, memories: [...(c.memories || []), memory] }
      )
    )
  }

  function deleteMemory(childId, memoryId) {
    setChildren((prev) =>
      prev.map((c) =>
        c.id !== childId ? c : { ...c, memories: (c.memories || []).filter((m) => m.id !== memoryId) }
      )
    )
  }

  function transferStars(fromId, toId, stars, price) {
    setChildren(prev => prev.map(c => {
      if (c.id === fromId) return { ...c, starBalance: Math.max(0, c.starBalance - stars), shekelBalance: c.shekelBalance + price }
      if (c.id === toId)   return { ...c, starBalance: c.starBalance + stars, shekelBalance: Math.max(0, c.shekelBalance - price) }
      return c
    }))
  }

  /**
   * Recompute starBalance and shekelBalance from transaction history.
   * Uses the same sign convention as deleteTransaction so the result is consistent.
   * Deduct types (subtract from balance when present): expense, convert_out, prize_redeem,
   * savings_open, penalty, wheel_spin, loan_repay.
   * Everything else adds to balance.
   */
  function recalculateBalance(childId, transactions) {
    const { stars, shekels } = computeBalanceFromTransactions(transactions)
    setChildren((prev) =>
      prev.map((c) =>
        c.id !== childId ? c : { ...c, starBalance: stars, shekelBalance: shekels }
      )
    )
  }

  return {
    children,
    addChild,
    updateChild,
    deleteChild,
    addGoal,
    updateGoal,
    deleteGoal,
    addStars,
    addMoney,
    adjustStars,
    adjustShekels,
    deductMoney,
    convertStars,
    resetChild,
    awardBadge,
    openSavings,
    closeSavings,
    grantFreeSpin,
    consumeFreeSpin,
    addLoan,
    repayLoan,
    deleteLoan,
    undoRepayLoan,
    addMemory,
    deleteMemory,
    transferStars,
    recalculateBalance,
  }
}
