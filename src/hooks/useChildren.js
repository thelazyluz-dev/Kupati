import { useLocalStorage } from './useLocalStorage.js'
import { generateId } from '../lib/utils.js'
import { DEFAULT_SETTINGS } from '../lib/defaults.js'

export function useChildren() {
  const [children, setChildren] = useLocalStorage('children', [])

  function addChild({ name, avatar, exchangeRate }) {
    const child = {
      id: generateId(),
      name,
      avatar: avatar || '🦁',
      starBalance: 0,
      shekelBalance: 0,
      goals: [],
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
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
  function addGoal(childId, { name, emoji, targetAmount }) {
    const goal = { id: generateId(), name, emoji, targetAmount }
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
        converted = stars * rate
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
  function openSavings(id, { amount, termMonths }) {
    const startDate = Date.now()
    const md = new Date(startDate)
    md.setMonth(md.getMonth() + termMonths)
    const saving = { id: generateId(), amount, termMonths, startDate, maturityDate: md.getTime(), status: 'active' }
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
  }
}
