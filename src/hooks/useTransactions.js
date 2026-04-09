import { useLocalStorage } from './useLocalStorage.js'
import { generateId } from '../lib/utils.js'

export function useTransactions(childId) {
  const [transactions, setTransactions] = useLocalStorage(
    `transactions_${childId}`,
    []
  )

  function addTransaction({ type, amount, currency, description, note = '' }) {
    const tx = {
      id: generateId(),
      type,        // 'chore' | 'gift' | 'other' | 'expense' | 'convert_out' | 'convert_in'
      amount,
      currency,    // 'stars' | 'shekels'
      description,
      note,
      timestamp: Date.now(),
    }
    setTransactions((prev) => [tx, ...prev])
    return tx
  }

  function clearTransactions() {
    setTransactions([])
  }

  return { transactions, addTransaction, clearTransactions }
}
