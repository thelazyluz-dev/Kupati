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
          /* Prize list */
          <div className="space-y-2">
            {prizes.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                אין פרסים במחירון — ביקש מההורים להוסיף!
              </p>
            ) : (
              prizes.map((prize) => {
                const canAfford = child.starBalance >= prize.starCost
                return (
                  <button
                    key={prize.id}
                    type="button"
                    onClick={() => handleSelect(prize)}
                    disabled={!canAfford}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-right transition-all',
                      canAfford
                        ? 'bg-purple-50 hover:bg-purple-100 active:scale-98 border border-purple-200'
                        : 'bg-gray-50 border border-gray-200 opacity-50',
                    ].join(' ')}
                  >
                    <span className="text-3xl flex-shrink-0">{prize.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm">{prize.name}</p>
                      {!canAfford && (
                        <p className="text-xs text-gray-400">
                          חסרים {formatNumber(prize.starCost - child.starBalance)}⭐
                        </p>
                      )}
                    </div>
                    <div className={`font-bold text-sm flex-shrink-0 ${canAfford ? 'text-purple-600' : 'text-gray-400'}`}>
                      {prize.starCost}⭐
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
