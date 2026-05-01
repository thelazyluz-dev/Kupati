import { useLocalStorage } from './useLocalStorage.js'
import { generateId } from '../lib/utils.js'

// Centralized hook — call once in AppContext, expose via useApp()
export function useTransactions() {
  const [allTx, setAllTx] = useLocalStorage('all_transactions', {})

  function getTransactions(childId) {
    return allTx[childId] || []
  }

  function addTransaction(childId, { type, amount, currency, description, note = '', timestamp }) {
    const tx = {
      id: generateId(),
      type,        // 'chore' | 'gift' | 'other' | 'expense' | 'convert_out' | 'convert_in'
      amount,
      currency,    // 'stars' | 'shekels'
      description,
      note,
      timestamp: timestamp ?? Date.now(),
    }
    setAllTx((prev) => ({
      ...prev,
      [childId]: [tx, ...(prev[childId] || [])],
    }))
    return tx
  }

  function updateTransaction(childId, txId, updates) {
    setAllTx((prev) => ({
      ...prev,
      [childId]: (prev[childId] || []).map((tx) =>
        tx.id === txId ? { ...tx, ...updates } : tx
      ),
    }))
  }

  function deleteTransaction(childId, txId) {
    setAllTx((prev) => ({
      ...prev,
      [childId]: (prev[childId] || []).filter((tx) => tx.id !== txId),
    }))
  }

  function clearTransactions(childId) {
    setAllTx((prev) => {
      const next = { ...prev }
      delete next[childId]
      return next
    })
  }

  return { getTransactions, addTransaction, updateTransaction, deleteTransaction, clearTransactions }
}
