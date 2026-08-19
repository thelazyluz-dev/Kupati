import { useLocalStorage } from './useLocalStorage.js'
import { generateId } from '../lib/utils.js'

export function usePendingChores() {
  const [pendingChores, setPendingChores] = useLocalStorage('pendingChores', [])

  // Legacy chore/assigned-chore creator (kept for parent-assigned chores).
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

  // Generic request creator — takes a fully-formed request (see lib/requests.newRequest).
  function addRequest(req) {
    setPendingChores((prev) => [req, ...prev])
    return req
  }

  // Merge `extra` (e.g. { decidedAt, parentNote }) alongside the status change.
  function setPendingChoreStatus(id, status, extra = {}) {
    setPendingChores((prev) => prev.map((pc) => (pc.id === id ? { ...pc, status, ...extra } : pc)))
  }

  return { pendingChores, addPendingChore, addRequest, setPendingChoreStatus }
}
