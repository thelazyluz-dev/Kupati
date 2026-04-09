import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { sounds } from '../../lib/sounds.js'
import { formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

export default function ExpenseModal() {
  const { closeModal, modalData, children, deductMoney, addTransaction } = useApp()
  const childId = modalData?.childId
  const child = children.find((c) => c.id === childId)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')

  if (!child) return null

  const shekels = parseFloat(amount) || 0
  const insufficient = shekels > child.shekelBalance

  function handleSubmit(e) {
    e.preventDefault()
    if (!shekels || shekels <= 0 || insufficient) return

    const desc = description || 'הוצאה'
    const success = deductMoney(childId, shekels)
    if (!success) return

    addTransaction(childId, { type: 'expense', amount: shekels, currency: 'shekels', description: desc, note })
    sounds.spend()
    closeModal()
  }

  return (
    <Modal title="🛍️ הוצאה" onClose={closeModal}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current balance */}
        <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm text-gray-500 mb-0.5">יתרה זמינה</p>
          <span className="text-2xl font-bold text-gray-800" dir="ltr">
            {formatNumber(child.shekelBalance)}₪
          </span>
        </div>

        {/* Amount */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            סכום הוצאה (₪)
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={child.shekelBalance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="20"
            className={`w-full rounded-2xl border-2 px-4 py-3 text-xl font-bold focus:outline-none text-center ${
              insufficient
                ? 'border-red-400 bg-red-50 focus:border-red-500'
                : 'border-gray-200 focus:border-indigo-400'
            }`}
            dir="ltr"
            required
          />
          {insufficient && (
            <p className="text-red-500 text-sm mt-1.5 font-semibold text-center flex items-center justify-center gap-1">
              <span>⚠️</span> אין מספיק כסף! (יש {formatNumber(child.shekelBalance)}₪)
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            על מה הוצאת?
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="גלידה, ספר, משחק..."
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-indigo-400 focus:outline-none"
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            הערה (אופציונלי)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="..."
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-indigo-400 focus:outline-none"
          />
        </div>

        {shekels > 0 && !insufficient && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
            <span className="text-2xl font-bold text-red-500">-{formatNumber(shekels)}₪</span>
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          variant="danger"
          disabled={!shekels || insufficient}
        >
          ✅ אשר הוצאה
        </Button>
      </form>
    </Modal>
  )
}
