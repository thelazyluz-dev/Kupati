import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { useTransactions } from '../../hooks/useTransactions.js'
import { celebrateGoal, celebrateSmall } from '../../lib/confetti.js'
import { sounds } from '../../lib/sounds.js'
import { getGoalProgress, formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

export default function ConvertStarsModal() {
  const { closeModal, modalData, children, settings, convertStars } = useApp()
  const childId = modalData?.childId
  const child = children.find((c) => c.id === childId)
  const { addTransaction } = useTransactions(childId)
  const [starsInput, setStarsInput] = useState('')

  if (!child) return null

  const rate = child.exchangeRate ?? settings.globalExchangeRate
  const stars = parseFloat(starsInput) || 0
  const shekelPreview = stars * rate
  const canConvert = stars > 0 && stars <= child.starBalance

  function handleSubmit(e) {
    e.preventDefault()
    if (!canConvert) return

    const prevProgress = child.goal ? getGoalProgress(child, settings) : 0

    const converted = convertStars(childId, stars, settings)

    addTransaction({
      type: 'convert_out',
      amount: stars,
      currency: 'stars',
      description: `המרת ${formatNumber(stars)}⭐ ל-₪`,
    })
    addTransaction({
      type: 'convert_in',
      amount: converted,
      currency: 'shekels',
      description: `המרת ⭐ (${formatNumber(stars)} × ${rate})`,
    })

    // Fire confetti if goal just reached
    const updatedChild = {
      ...child,
      starBalance: child.starBalance - stars,
      shekelBalance: child.shekelBalance + converted,
    }
    if (child.goal) {
      const newProgress = getGoalProgress(updatedChild, settings)
      if (prevProgress < 1 && newProgress >= 1) {
        celebrateGoal(); sounds.goal()
      } else {
        celebrateSmall(); sounds.convert()
      }
    } else {
      celebrateSmall(); sounds.convert()
    }

    closeModal()
  }

  return (
    <Modal title="🔄 המר כוכבים לשקלים" onClose={closeModal}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current balance */}
        <div className="bg-indigo-50 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm text-gray-500 mb-1">יתרה נוכחית</p>
          <div className="flex justify-center gap-6">
            <div>
              <span className="text-2xl font-bold text-indigo-600">
                {formatNumber(child.starBalance)}
              </span>
              <span className="text-gray-600"> ⭐</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-emerald-600">
                {formatNumber(child.shekelBalance)}
              </span>
              <span className="text-gray-600"> ₪</span>
            </div>
          </div>
        </div>

        {/* Exchange rate info */}
        <div className="text-center text-sm text-gray-500">
          שער המרה: <span className="font-bold text-indigo-600">1⭐ = {rate}₪</span>
          {child.exchangeRate && (
            <span className="text-xs text-gray-400 mr-1">(אישי)</span>
          )}
        </div>

        {/* Stars input */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            כמה כוכבים להמיר?
          </label>
          <input
            type="number"
            min="0.5"
            max={child.starBalance}
            step="0.5"
            value={starsInput}
            onChange={(e) => setStarsInput(e.target.value)}
            placeholder={`0 עד ${child.starBalance}`}
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-xl font-bold focus:border-indigo-400 focus:outline-none text-center"
            dir="ltr"
            required
          />
          {stars > child.starBalance && (
            <p className="text-red-500 text-sm mt-1 text-center">
              אין מספיק כוכבים (יש {formatNumber(child.starBalance)}⭐)
            </p>
          )}
        </div>

        {/* Quick picks */}
        <div className="flex gap-2 flex-wrap justify-center">
          {[1, 2, 5, 10].filter((n) => n <= child.starBalance).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStarsInput(String(n))}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold transition-colors"
            >
              {n}⭐
            </button>
          ))}
          {child.starBalance > 0 && (
            <button
              type="button"
              onClick={() => setStarsInput(String(child.starBalance))}
              className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl text-sm font-semibold transition-colors"
            >
              הכל ({formatNumber(child.starBalance)}⭐)
            </button>
          )}
        </div>

        {/* Preview */}
        {canConvert && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-center">
            <p className="text-sm text-gray-500 mb-1">תקבל</p>
            <span className="text-2xl font-bold text-emerald-600">
              +{formatNumber(shekelPreview)}₪
            </span>
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          variant="success"
          disabled={!canConvert}
        >
          🔄 המר עכשיו
        </Button>
      </form>
    </Modal>
  )
}
