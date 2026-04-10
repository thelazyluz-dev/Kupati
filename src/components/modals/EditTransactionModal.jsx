import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

const TYPE_LABEL = {
  chore: 'מטלה ⭐',
  gift: 'מתנה 💝',
  other: 'הפקדה 💰',
  expense: 'הוצאה 🛍️',
  convert_out: 'המרה (כוכבים) 🔄',
  convert_in: 'המרה (שקלים) ✨',
  prize_redeem: 'פרס 🎁',
  savings_open: 'פתיחת חסכון 🏦',
  savings_close: 'חסכון הבשיל 💰',
  savings_early: 'פדיון מוקדם ⚠️',
}

// Compute balance delta when reversing or adjusting a transaction
function balanceDelta(tx, amountDiff) {
  // amountDiff = newAmount - oldAmount (0 for delete, diff for edit)
  const currency = tx.currency // 'stars' | 'shekels'
  const isDeduct = tx.type === 'expense' || tx.type === 'convert_out'
  // For income types: balance goes up by amount → delta = amountDiff
  // For deduct types: balance goes down by amount → delta = -amountDiff
  return { currency, delta: isDeduct ? -amountDiff : amountDiff }
}

export default function EditTransactionModal() {
  const { closeModal, modalData, updateTransaction, deleteTransaction, adjustStars, adjustShekels } = useApp()
  const { childId, transaction: tx } = modalData || {}

  const isConvert = tx?.type === 'convert_out' || tx?.type === 'convert_in'
  const [description, setDescription] = useState(tx?.description || '')
  const [note, setNote] = useState(tx?.note || '')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!tx) return null

  function applyBalanceDelta(currency, delta) {
    if (delta === 0) return
    if (currency === 'stars') adjustStars(childId, delta)
    else adjustShekels(childId, delta)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const newAmount = isConvert ? tx.amount : Math.max(0, parseFloat(amount) || tx.amount)
    const amountDiff = newAmount - tx.amount
    if (amountDiff !== 0) {
      const { currency, delta } = balanceDelta(tx, amountDiff)
      applyBalanceDelta(currency, delta)
    }
    updateTransaction(childId, tx.id, {
      description: description.trim() || tx.description,
      note: note.trim(),
      amount: newAmount,
    })
    closeModal()
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    // Reverse the full transaction effect
    const { currency, delta } = balanceDelta(tx, -tx.amount)
    applyBalanceDelta(currency, delta)
    deleteTransaction(childId, tx.id)
    closeModal()
  }

  const currencySymbol = tx.currency === 'stars' ? '⭐' : '₪'

  return (
    <Modal title="✏️ ערוך עסקה" onClose={closeModal}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type badge */}
        <div className="text-center">
          <span className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-600">
            {TYPE_LABEL[tx.type] || tx.type}
          </span>
        </div>

        {/* Amount — read-only for convert pairs */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            סכום {isConvert && <span className="text-gray-400 font-normal">(לא ניתן לשינוי)</span>}
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isConvert}
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-xl font-bold focus:border-indigo-400 focus:outline-none text-center disabled:bg-gray-50 disabled:text-gray-400"
            dir="ltr"
          />
          <p className="text-center text-xs text-gray-400 mt-1">{currencySymbol}</p>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">תיאור</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-indigo-400 focus:outline-none"
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">הערה</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="..."
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-indigo-400 focus:outline-none"
          />
        </div>

        {!isConvert && parseFloat(amount) !== tx.amount && parseFloat(amount) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-center text-sm">
            <span className="text-amber-700">
              יתרה תתעדכן ב-{formatNumber(Math.abs(parseFloat(amount) - tx.amount))}{currencySymbol}
              {parseFloat(amount) > tx.amount ? ' ↑' : ' ↓'}
            </span>
          </div>
        )}

        <Button type="submit" fullWidth size="lg">
          💾 שמור שינויים
        </Button>

        {/* Delete */}
        <div className="pt-2 border-t border-gray-100">
          {confirmDelete ? (
            <div className="space-y-2">
              <p className="text-sm text-red-600 font-semibold text-center">
                למחוק עסקה זו? היתרה תתוקן אוטומטית.
              </p>
              <div className="flex gap-2">
                <Button variant="danger" fullWidth onClick={handleDelete} type="button">מחק</Button>
                <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(false)} type="button">ביטול</Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              fullWidth
              onClick={handleDelete}
              type="button"
              className="text-red-500 border-red-200 hover:bg-red-50"
            >
              🗑️ מחק עסקה
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
