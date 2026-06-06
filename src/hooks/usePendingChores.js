import { useLocalStorage } from './useLocalStorage.js'
import { generateId } from '../lib/utils.js'

export function usePendingChores() {
  const [pendingChores, setPendingChores] = useLocalStorage('pendingChores', [])

  function addPendingChore({ childId, choreId, choreName, choreEmoji, amount, currency, source = 'child' }) {
    const req = {
      id: generateId(),
      childId, choreId, choreName, choreEmoji,
      amount, currency, source,
      timestamp: Date.now(),
      status: source === 'parent' ? 'assigned' : 'pending',
    }
    setPendingChores((prev) => [req, ...prev])
    return req
  }

  function setPendingChoreStatus(id, status) {
    setPendingChores((prev) => prev.map((pc) => (pc.id === id ? { ...pc, status } : pc)))
  }

  return { pendingChores, addPendingChore, setPendingChoreStatus }
}
