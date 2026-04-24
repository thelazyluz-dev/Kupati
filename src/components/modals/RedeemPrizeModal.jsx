import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { formatNumber } from '../../lib/utils.js'
import { DEFAULT_PRIZES } from '../../lib/defaults.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { celebrateGoal } from '../../lib/confetti.js'
import { sounds } from '../../lib/sounds.js'

const COMPLIMENTS = ['כל הכבוד!', 'מגיע לך!', 'אתה הכי טוב!', 'יפה מאוד!', 'ממש סבבה!']

export default function RedeemPrizeModal() {
  const { closeModal, modalData, settings, adjustStars, addTransaction } = useApp()
  const { childId, child } = modalData || {}
  const [confirming, setConfirming] = useState(null)
  const [success, setSuccess] = useState(null)

  const prizes = settings.prizes?.length ? settings.prizes : DEFAULT_PRIZES

  // Auto-dismiss after 3 s
  useEffect(() => {
    if (!success) return
    const t = setTimeout(closeModal, 3000)
    return () => clearTimeout(t)
  }, [success]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(prize) {
    if (child.starBalance < prize.starCost) return
    setConfirming(prize)
  }

  function handleConfirm() {
    if (!confirming) return
    adjustStars(childId, -confirming.starCost)
    addTransaction(childId, {
      type: 'prize_redeem',
      amount: confirming.starCost,
      currency: 'stars',
      description: `${confirming.emoji} ${confirming.name}`,
    })
    celebrateGoal()
    sounds.goal()
    setSuccess({
      ...confirming,
      compliment: COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)],
    })
  }

  if (!child) return null

  // Full-screen prize success overlay
  if (success) {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 via-violet-700 to-purple-900 text-white text-center px-8"
        onClick={closeModal}
      >
        <p className="text-base font-semibold opacity-70 mb-3 animate-fade-in">
          {child.name} קיבל/ה פרס!
        </p>
        <div className="text-[8rem] leading-none animate-bounce-in mb-6">
          {success.emoji}
        </div>
        <h2 className="text-3xl font-black mb-3 animate-slide-up">
          {success.name}
        </h2>
        <p
          className="text-xl font-bold opacity-90 animate-slide-up"
          style={{ animationDelay: '80ms' }}
        >
          {success.compliment}
        </p>
        <p
          className="mt-6 text-sm opacity-40 animate-fade-in"
          style={{ animationDelay: '500ms' }}
        >
          -{success.starCost}⭐ נוכו · לחץ לחזרה
        </p>
      </div>
    )
  }

  return (
    <Modal title="🎁 מימוש פרס" onClose={closeModal} headerColor="from-purple-500 to-violet-600">
      <div className="space-y-4">
        {/* Stars balance */}
        <div className="text-center bg-amber-50 rounded-2xl py-3">
          <span className="text-3xl font-black text-amber-600">
            {formatNumber(child.starBalance)}⭐
          </span>
          <p className="text-xs text-amber-500 mt-0.5">יתרת כוכבים</p>
        </div>

        {confirming ? (
          /* Confirmation step */
          <div className="space-y-3">
            <div className="text-center bg-purple-50 rounded-2xl py-4 px-4">
              <div className="text-5xl mb-2">{confirming.emoji}</div>
              <p className="font-bold text-gray-800 text-lg">{confirming.name}</p>
              <p className="text-purple-600 font-semibold mt-1">
                -{confirming.starCost}⭐ · יישאר: {formatNumber(child.starBalance - confirming.starCost)}⭐
              </p>
            </div>
            <p className="text-sm text-gray-500 text-center font-semibold">
              בטוח שתרצה לממש את הפרס?
            </p>
            <div className="flex gap-2">
              <Button variant="primary" fullWidth onClick={handleConfirm}>
                ✅ כן, ממש!
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setConfirming(null)}>
                ביטול
              </Button>
            </div>
          </div>
        ) : (
          /* Prize store grid */
          <div>
            {prizes.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                אין פרסים במחירון — ביקש מההורים להוסיף!
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {prizes.map((prize) => {
                  const canAfford = child.starBalance >= prize.starCost
                  return (
                    <button
                      key={prize.id}
                      type="button"
                      onClick={() => handleSelect(prize)}
                      className={[
                        'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all',
                        canAfford
                          ? 'bg-gradient-to-b from-purple-50 to-white border-purple-200 hover:border-purple-400 hover:shadow-md active:scale-95'
                          : 'bg-gray-50 border-gray-200 opacity-70',
                      ].join(' ')}
                    >
                      <span className="text-4xl">{prize.emoji}</span>
                      <p className="font-bold text-gray-800 text-xs leading-tight">{prize.name}</p>
                      <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${canAfford ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'}`}>
                        {prize.starCost}⭐
                      </div>
                      {/* Progress bar */}
                      <div className="w-full">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${canAfford ? 'bg-purple-500' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min(100, Math.round((child.starBalance / prize.starCost) * 100))}%` }}
                          />
                        </div>
                        <p className={`text-[10px] mt-0.5 font-semibold ${canAfford ? 'text-purple-600' : 'text-gray-400'}`}>
                          {canAfford ? '✅ יש מספיק!' : `${Math.round((child.starBalance / prize.starCost) * 100)}% · חסרים ${formatNumber(prize.starCost - child.starBalance)}⭐`}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
