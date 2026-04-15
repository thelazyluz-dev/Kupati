import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { sounds } from '../../lib/sounds.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

export default function PenaltyModal() {
  const { closeModal, modalData, children, adjustStars, addTransaction } = useApp()
  const childId = modalData?.childId
  const child = children.find((c) => c.id === childId)

  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  if (!child) return null

  const amount = 1
  const insufficient = child.starBalance < amount

  function handleConfirm() {
    adjustStars(childId, -amount)
    addTransaction(childId, {
      type: 'penalty',
      amount,
      currency: 'stars',
      description: `⚡ קנס${reason ? `: ${reason}` : ''}`,
    })
    sounds.error?.()
    closeModal()
  }

  return (
    <Modal title="⚡ קנס" onClose={closeModal} headerColor="from-red-500 to-rose-600">
      <div className="space-y-4">
        {/* Current balance */}
        <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm text-gray-500 mb-0.5">יתרת כוכבים</p>
          <span className="text-2xl font-bold text-gray-800" dir="ltr">
            {child.starBalance}⭐
          </span>
        </div>

        {insufficient ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-4 text-center space-y-1">
            <p className="text-lg">😅</p>
            <p className="text-sm font-semibold text-red-600">אין כוכבים לנכות!</p>
            <p className="text-xs text-gray-500">ל{child.name} אין כוכבים כרגע</p>
          </div>
        ) : !confirmed ? (
          <>
            {/* Penalty preview */}
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-4 text-center">
              <p className="text-4xl font-black text-red-500 mb-1" dir="ltr">-{amount}⭐</p>
              <p className="text-sm text-gray-600">
                יתרה תעבור מ-{child.starBalance}⭐ ל-{child.starBalance - amount}⭐
              </p>
            </div>

            {/* Reason input */}
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                סיבה (אופציונלי)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="לא שיתף פעולה, התנהגות..."
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-red-400 focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && setConfirmed(true)}
              />
            </div>

            {/* Confirm step */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center">
              <p className="text-sm font-semibold text-amber-800">
                האם אתה בטוח שרוצים לקנוס את {child.name}?
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="danger" fullWidth onClick={() => setConfirmed(true)}>
                ⚡ כן, קנס
              </Button>
              <Button variant="secondary" fullWidth onClick={closeModal}>
                ביטול
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Final confirmation */}
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl px-4 py-5 text-center space-y-2">
              <p className="text-3xl">⚠️</p>
              <p className="text-base font-bold text-red-700">
                בטוח לגמרי?
              </p>
              <p className="text-sm text-gray-600">
                {child.name} יאבד {amount}⭐
                {reason && <span> — {reason}</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="danger" fullWidth onClick={handleConfirm}>
                ✅ כן, מאשר
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setConfirmed(false)}>
                ↩️ חזרה
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
