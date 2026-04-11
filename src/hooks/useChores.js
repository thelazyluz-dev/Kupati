import { useLocalStorage } from './useLocalStorage.js'
import { DEFAULT_CHORES } from '../lib/defaults.js'
import { generateId } from '../lib/utils.js'

export function useChores() {
  const [chores, setChores] = useLocalStorage('chores', DEFAULT_CHORES)

  function addChore({ name, defaultStars }) {
    const chore = { id: generateId(), name, defaultStars: parseFloat(defaultStars) || 1 }
    setChores((prev) => [...prev, chore])
    return chore
  }

  function updateChore(id, updates) {
    setChores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  function deleteChore(id) {
    setChores((prev) => prev.filter((c) => c.id !== id))
  }

  function reorderChores(fromIdx, toIdx) {
    setChores((prev) => {
      const next = [...prev]
      const [item] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, item)
      return next
    })
  }

  return { chores, addChore, updateChore, deleteChore, reorderChores }
}
