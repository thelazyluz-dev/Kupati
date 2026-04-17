import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { celebrateGoal, celebrateSmall, celebrateMoney } from '../../lib/confetti.js'
import { sounds } from '../../lib/sounds.js'
import { getGoalProgress, getGoals, formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

export default function AddMoneyModal() {
  const { closeModal, modalData, children, settings, addMoney, addTransaction } = useApp()
  const childId = modalData?.childId
  const child = children.find((c) => c.id === childId)

  const [type, setType] = useState('gift')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')

  if (!child) return null

  const shekels = parseFloat(amount) || 0

  function handleSubmit(e) {
    e.preventDefault()
    if (!shekels || shekels <= 0) return

    const desc = description || (type === 'gift' ? 'מתנה' : 'הכנסה')

    const prevProgress = getGoals(child).length > 0 ? getGoalProgress(child, settings) : 0

    addMoney(childId, shekels)
    addTransaction(childId, { type, amount: shekels, currency: 'shekels', description: desc, note })

    if (getGoals(child).length > 0) {
      const updatedChild = { ...child, shekelBalance: child.shekelBalance + shekels }
      const newProgress = getGoalProgress(updatedChild, settings)
      if (prevProgress < 1 && newProgress >= 1) { celebrateGoal(); sounds.goal() }
      else { celebrateMoney(); sounds.coin() }
    } else {
      celebrateMoney()
      sounds.coin()
    }

    closeModal()
  }

  return (
    <Modal title="💝 הפקדה" onClose={closeModal} headerColor="from-emerald-400 to-teal-500">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type selector */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('gift')}
            className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold border-2 transition-all ${
              type === 'gift'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            🎁 מתנה
          </button>
          <button
            type="button"
            onClick={() => setType('other')}
            className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold border-2 transition-all ${
              type === 'other'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            💰 אחר
          </button>
        </div>

        {/* Amount */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            סכום (₪)
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50"
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-xl font-bold focus:border-indigo-400 focus:outline-none text-center"
            dir="ltr"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            תיאור
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'gift' ? 'מתנה מסבתא' : 'תיאור'}
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

        {shekels > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-center">
            <span className="text-2xl font-bold text-emerald-600">+{formatNumber(shekels)}₪</span>
          </div>
        )}

        <Button type="submit" fullWidth size="lg" variant="success" disabled={!shekels}>
          ✅ הוסף לחיסכון
        </Button>
      </form>
    </Modal>
  )
}
