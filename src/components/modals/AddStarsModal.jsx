import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { celebrateStars } from '../../lib/confetti.js'
import { sounds } from '../../lib/sounds.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import SuccessOverlay from '../SuccessOverlay.jsx'

export default function AddStarsModal() {
  const { closeModal, modalData, addStars, children, chores, settings, addTransaction } = useApp()
  const childId = modalData?.childId
  const allowFreeEntry = modalData?.allowFreeEntry ?? false
  const child = children.find((c) => c.id === childId)

  const [tab, setTab] = useState('chore') // 'chore' | 'custom'
  const [selectedChore, setSelectedChore] = useState(null)
  const [customStars, setCustomStars] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [success, setSuccess] = useState(null) // { amount, description } | null

  if (!child) return null

  function handleSubmit(e) {
    e.preventDefault()
    let amount, description, type

    if (tab === 'chore' && selectedChore) {
      amount = selectedChore.defaultStars
      description = selectedChore.name
      type = 'chore'
    } else if (tab === 'custom') {
      amount = parseFloat(customStars)
      description = customDesc || 'כוכבים'
      type = 'other'
    } else {
      return
    }

    if (!amount || amount <= 0) return

    addStars(childId, amount)
    addTransaction(childId, { type, amount, currency: 'stars', description, note })

    sounds.star()
    if (amount >= settings.confettiThreshold) celebrateStars()

    setSuccess({ amount, description })
  }

  const title = allowFreeEntry ? '⭐ הוסף כוכבים — מצב הורה ✏️' : '⭐ עשיתי מטלה!'

  if (success) {
    return (
      <SuccessOverlay
        name={child.name}
        amount={success.amount}
        description={success.description}
        onDone={closeModal}
      />
    )
  }

  return (
    <Modal title={title} onClose={closeModal} headerColor="from-amber-400 to-orange-500">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tabs — free-entry only visible in parent mode */}
        {allowFreeEntry && (
          <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setTab('chore')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === 'chore' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'
              }`}
            >
              📋 בחר מטלה
            </button>
            <button
              type="button"
              onClick={() => setTab('custom')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === 'custom' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'
              }`}
            >
              ✏️ כניסה חופשית
            </button>
          </div>
        )}

        {tab === 'chore' ? (
          <div key="chore" className="space-y-2 animate-tab-in">
            <p className="text-sm text-gray-500">בחר מטלה:</p>
            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto no-scrollbar">
              {chores.map((chore) => (
                <button
                  key={chore.id}
                  type="button"
                  onClick={() => setSelectedChore(chore)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-right transition-all active:scale-95 ${
                    selectedChore?.id === chore.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{chore.emoji || '⭐'}</span>
                  <span className="flex-1 font-medium text-gray-800">{chore.name}</span>
                  <div className="flex items-center gap-1 text-amber-500 font-bold flex-shrink-0">
                    <span>{chore.defaultStars}</span>
                    <span>⭐</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div key="custom" className="space-y-3 animate-tab-in">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                כמות כוכבים
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={customStars}
                onChange={(e) => setCustomStars(e.target.value)}
                placeholder="3"
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg font-bold focus:border-indigo-400 focus:outline-none text-center"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                תיאור
              </label>
              <input
                type="text"
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="עזרתי עם..."
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Note — collapsible to save space */}
        {showNote ? (
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="הערה..."
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            📝 הוסף הערה
          </button>
        )}

        {/* Preview */}
        {((tab === 'chore' && selectedChore) || (tab === 'custom' && customStars)) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center">
            <span className="text-xl font-bold text-amber-600">
              +{tab === 'chore' ? selectedChore.defaultStars : customStars} ⭐
            </span>
            {tab === 'custom' && customDesc && (
              <span className="text-gray-600 mr-2">— {customDesc}</span>
            )}
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          disabled={tab === 'chore' ? !selectedChore : !customStars}
        >
          ✅ אשר ועדכן
        </Button>
      </form>
    </Modal>
  )
}
