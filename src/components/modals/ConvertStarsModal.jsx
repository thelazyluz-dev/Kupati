import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { celebrateGoal, celebrateSmall } from '../../lib/confetti.js'
import { sounds } from '../../lib/sounds.js'
import { getGoalProgress, getGoals, formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

export default function ConvertStarsModal() {
  const { closeModal, modalData, children, settings, convertStars, addTransaction, logActivity } = useApp()
  const childId = modalData?.childId
  const child = children.find((c) => c.id === childId)
  const [starsInput, setStarsInput] = useState('')

  if (!child) return null

  const rate = child.exchangeRate ?? settings.globalExchangeRate
  const stars = parseFloat(starsInput) || 0
  const shekelPreview = Math.round(stars * rate * 100) / 100
  const canConvert = stars > 0 && stars <= child.starBalance

  // Smart quick-picks: spread across the balance, no duplicates
  const quickPickCandidates = [5, 10, 25, 50, 100, 200, 500]
  const quickPicks = [...new Set(quickPickCandidates.filter((n) => n < child.starBalance))]

  function handleSubmit(e) {
    e.preventDefault()
    if (!canConvert) return

    const prevProgress = getGoals(child).length > 0 ? getGoalProgress(child, settings) : 0

    const converted = convertStars(childId, stars, settings)
    const desc = `💱 המרת ${formatNumber(stars)}⭐ ← ${formatNumber(converted)}₪`

    addTransaction(childId, {
      type: 'convert_out',
      amount: stars,
      currency: 'stars',
      description: desc,
      _skipLog: true,
    })
    addTransaction(childId, {
      type: 'convert_in',
      amount: converted,
      currency: 'shekels',
      description: desc,
      _skipLog: true,
    })

    // Single activity-feed entry for the conversion
    logActivity(childId, child.name, 'convert_stars', desc, converted, 'shekels')

    // Confetti: goal reached → big, otherwise small
    const updatedChild = {
      ...child,
      starBalance: child.starBalance - stars,
      shekelBalance: child.shekelBalance + converted,
    }
    if (getGoals(child).length > 0) {
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
    <Modal title="💱 המר כוכבים לשקלים" onClose={closeModal}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current balance */}
        <div className="rounded-2xl px-4 py-3 text-center"
          style={{ background: 'linear-gradient(135deg,rgba(224,242,254,0.8),rgba(209,250,229,0.8))', border: '1.5px solid rgba(14,165,233,0.2)' }}>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">יתרה נוכחית</p>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-black text-amber-600">{formatNumber(child.starBalance)}<span className="text-lg mr-0.5">⭐</span></div>
              <div className="text-xs text-gray-400 mt-0.5">כוכבים</div>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-600">{formatNumber(child.shekelBalance)}<span className="text-lg mr-0.5">₪</span></div>
              <div className="text-xs text-gray-400 mt-0.5">שקלים</div>
            </div>
          </div>
        </div>

        {/* Exchange rate banner */}
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="text-sm text-gray-400">שער המרה:</span>
          <span className="font-black text-sky-600 text-base">1⭐ = {rate}₪</span>
          {child.exchangeRate && (
            <span className="text-[11px] font-semibold text-sky-400 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5">אישי</span>
          )}
        </div>

        {/* Stars input */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1.5">
            כמה כוכבים להמיר?
          </label>
          <input
            type="number"
            min="1"
            max={child.starBalance}
            step="1"
            value={starsInput}
            onChange={(e) => setStarsInput(e.target.value)}
            placeholder={`1 עד ${child.starBalance}`}
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-2xl font-black focus:border-sky-400 focus:outline-none text-center"
            dir="ltr"
            autoFocus
            required
          />
          {stars > child.starBalance && (
            <p className="text-red-500 text-sm mt-1.5 text-center font-semibold">
              אין מספיק כוכבים — יש לך {formatNumber(child.starBalance)}⭐
            </p>
          )}
        </div>

        {/* Quick picks */}
        {child.starBalance > 0 && (
          <div>
            <p className="text-xs text-gray-400 font-semibold mb-1.5">בחירה מהירה</p>
            <div className="flex gap-2 flex-wrap">
              {quickPicks.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStarsInput(String(n))}
                  className={`px-3 py-2 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                    stars === n
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {n}⭐<span className="text-xs opacity-70 mr-1">= {formatNumber(n * rate)}₪</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStarsInput(String(child.starBalance))}
                className={`px-3 py-2 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                  stars === child.starBalance
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                }`}
              >
                הכל ({formatNumber(child.starBalance)}⭐)
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {canConvert && (
          <div className="rounded-2xl px-4 py-4 text-center animate-pop"
            style={{ background: 'linear-gradient(135deg,rgba(209,250,229,0.9),rgba(167,243,208,0.7))', border: '1.5px solid rgba(16,185,129,0.3)', boxShadow: '0 4px 16px rgba(16,185,129,0.15)' }}>
            <p className="text-xs font-semibold text-emerald-600 mb-1">תקבל</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-gray-400 text-sm font-bold">{formatNumber(stars)}⭐</span>
              <span className="text-emerald-500 text-xl">→</span>
              <span className="text-3xl font-black text-emerald-700">+{formatNumber(shekelPreview)}₪</span>
            </div>
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          variant="success"
          disabled={!canConvert}
        >
          💱 המר עכשיו
        </Button>
      </form>
    </Modal>
  )
}
