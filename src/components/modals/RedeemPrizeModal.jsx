import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { formatNumber } from '../../lib/utils.js'
import { DEFAULT_PRIZES } from '../../lib/defaults.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { celebrateGoal } from '../../lib/confetti.js'
import { sounds } from '../../lib/sounds.js'

export default function RedeemPrizeModal() {
  const { closeModal, modalData, settings, adjustStars, addTransaction } = useApp()
  const { childId, child } = modalData || {}
  const [confirming, setConfirming] = useState(null) // prize being confirmed

  const prizes = settings.prizes?.length ? settings.prizes : DEFAULT_PRIZES

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
    closeModal()
  }

  if (!child) return null

  return (
    <Modal title="🎁 מימוש פרס" onClose={closeModal}>
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
                          : 'bg-gray-50 border-gray-200 grayscale opacity-50',
                      ].join(' ')}
                    >
                      <span className="text-4xl">{prize.emoji}</span>
                      <p className="font-bold text-gray-800 text-xs leading-tight">{prize.name}</p>
                      <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${canAfford ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'}`}>
                        {prize.starCost}⭐
                      </div>
                      {!canAfford && (
                        <p className="text-xs text-gray-400 leading-tight">
                          חסרים {formatNumber(prize.starCost - child.starBalance)}⭐
                        </p>
                      )}
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
