import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { GOAL_EMOJIS } from '../../lib/defaults.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import EmojiPicker from '../ui/EmojiPicker.jsx'

export default function GoalModal() {
  const { closeModal, modalData, children, updateChild } = useApp()
  const childId = modalData?.childId
  const child = children.find((c) => c.id === childId)

  const existing = child?.goal
  const [emoji, setEmoji] = useState(existing?.emoji || '🎯')
  const [name, setName] = useState(existing?.name || '')
  const [targetAmount, setTargetAmount] = useState(
    existing?.targetAmount ? String(existing.targetAmount) : ''
  )
  const [confirmRemove, setConfirmRemove] = useState(false)

  if (!child) return null

  function handleSubmit(e) {
    e.preventDefault()
    const target = parseFloat(targetAmount)
    if (!name.trim() || !target || target <= 0) return
    updateChild(childId, { goal: { name: name.trim(), targetAmount: target, emoji } })
    closeModal()
  }

  function handleRemove() {
    if (!confirmRemove) {
      setConfirmRemove(true)
      return
    }
    updateChild(childId, { goal: null })
    closeModal()
  }

  const target = parseFloat(targetAmount) || 0

  return (
    <Modal title={existing ? '✏️ ערוך מטרה' : '🎯 קבע מטרה'} onClose={closeModal}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Emoji picker */}
        <EmojiPicker
          label="בחר אימוג׳י למטרה"
          options={GOAL_EMOJIS}
          value={emoji}
          onChange={setEmoji}
        />

        {/* Name */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            שם המטרה
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="אייפד, אופניים..."
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-indigo-400 focus:outline-none"
            required
            autoFocus
          />
        </div>

        {/* Target amount */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            יעד (₪)
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="500"
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-xl font-bold focus:border-indigo-400 focus:outline-none text-center"
            dir="ltr"
            required
          />
        </div>

        {/* Preview */}
        {name && target > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 text-center">
            <span className="text-2xl">{emoji}</span>
            <p className="font-bold text-indigo-700 text-lg">{name}</p>
            <p className="text-sm text-gray-500">יעד: {target}₪</p>
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          disabled={!name.trim() || !target}
        >
          {existing ? '💾 עדכן מטרה' : '🎯 קבע מטרה'}
        </Button>

        {/* Remove goal */}
        {existing && (
          <div className="pt-2 border-t border-gray-100">
            {confirmRemove ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600 font-semibold text-center">
                  למחוק את המטרה?
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" fullWidth onClick={handleRemove} type="button">
                    מחק
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setConfirmRemove(false)}
                    type="button"
                  >
                    ביטול
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                fullWidth
                onClick={handleRemove}
                type="button"
                className="text-red-500 border-red-200 hover:bg-red-50"
              >
                🗑️ הסר מטרה
              </Button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
