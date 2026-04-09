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
      goal: null,
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

  function addStars(id, amount) {
    const stars = parseFloat(amount) || 0
    setChildren((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, starBalance: c.starBalance + stars } : c
      )
    )
  }

  function addMoney(id, amount) {
    const shekels = parseFloat(amount) || 0
    setChildren((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, shekelBalance: c.shekelBalance + shekels } : c
      )
    )
  }

  // Returns false if insufficient funds, otherwise deducts and returns true
  function deductMoney(id, amount) {
    const shekels = parseFloat(amount) || 0
    let success = false
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        if (shekels > c.shekelBalance) {
          success = false
          return c
        }
        success = true
        return { ...c, shekelBalance: c.shekelBalance - shekels }
      })
    )
    return success
  }

  // Converts N stars to shekels at the effective rate
  // Returns the shekel amount converted, or 0 if not enough stars
  function convertStars(id, starCount, settings) {
    const stars = parseFloat(starCount) || 0
    let converted = 0
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        if (stars > c.starBalance) return c
        const rate = c.exchangeRate ?? (settings?.globalExchangeRate ?? DEFAULT_SETTINGS.globalExchangeRate)
        converted = stars * rate
        return {
          ...c,
          starBalance: c.starBalance - stars,
          shekelBalance: c.shekelBalance + converted,
        }
      })
    )
    return converted
  }

  return {
    children,
    addChild,
    updateChild,
    deleteChild,
    addStars,
    addMoney,
    deductMoney,
    convertStars,
  }
}
