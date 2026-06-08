import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { celebrateChore } from '../../lib/confetti.js'
import { sounds } from '../../lib/sounds.js'
import { fireCoin } from '../../lib/animations.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import SuccessOverlay from '../SuccessOverlay.jsx'

export default function AddStarsModal() {
  const { closeModal, modalData, addStars, adjustStars, children, chores, settings, addTransaction, deleteTransaction, startCoinFlight } = useApp()
  const childId = modalData?.childId
  const allowFreeEntry = modalData?.allowFreeEntry ?? false
  const child = children.find((c) => c.id === childId)

  const [tab, setTab] = useState('chore') // 'chore' | 'custom'
  const [selectedChores, setSelectedChores] = useState(new Set())
  const [customStars, setCustomStars] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [success, setSuccess] = useState(null)

  if (!child) return null

  function toggleChore(chore) {
    setSelectedChores((prev) => {
      const next = new Set(prev)
      if (next.has(chore.id)) next.delete(chore.id)
      else next.add(chore.id)
      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (tab === 'chore') {
      if (selectedChores.size === 0) return
      const choresToSubmit = chores.filter((c) => selectedChores.has(c.id))
      const totalStars = choresToSubmit.reduce((s, c) => s + c.defaultStars, 0)

      addStars(childId, totalStars)
      const txIds = choresToSubmit.map((chore) => {
        const tx = addTransaction(childId, { type: 'chore', amount: chore.defaultStars, currency: 'stars', description: chore.name, note })
        return tx.id
      })

      sounds.star()
      celebrateChore()

      const desc = choresToSubmit.length === 1 ? choresToSubmit[0].name : `${choresToSubmit.length} מטלות`
      const emoji = choresToSubmit.length === 1 ? choresToSubmit[0].emoji : null
      setSuccess({ amount: totalStars, description: desc, choreEmoji: emoji, txIds, isChore: true })
    } else {
      const amount = parseFloat(customStars)
      const description = customDesc || 'כוכבים'
      if (!amount || amount <= 0) return

      addStars(childId, amount)
      const tx = addTransaction(childId, { type: 'other', amount, currency: 'stars', description, note })
      sounds.star()
      celebrateChore()
      setSuccess({ amount, description, choreEmoji: null, txIds: [tx.id], isChore: false })
    }
  }

  const title = allowFreeEntry ? '⭐ הוסף כוכבים — מצב הורה ✏️' : '⭐ עשיתי מטלה!'

  if (success) {
    return (
      <SuccessOverlay
        name={child.name}
        amount={success.amount}
        description={success.description}
        choreEmoji={success.choreEmoji}
        onBeforeDone={(coinRect) => {
          if (success.isChore) {
            const srcX = coinRect ? coinRect.left + coinRect.width  / 2 : window.innerWidth  / 2
            const srcY = coinRect ? coinRect.top  + coinRect.height / 2 : window.innerHeight / 2
            startCoinFlight(childId, 2100)
            fireCoin(childId, srcX, srcY, {
              onFly:  () => sounds.coinFly(),
              onLand: () => sounds.coinLand(),
            })
          }
        }}
        onDone={closeModal}
        onUndo={() => {
          adjustStars(childId, -success.amount)
          success.txIds.forEach((id) => deleteTransaction(childId, id))
          closeModal()
        }}
      />
    )
  }

  const selectedList = chores.filter((c) => selectedChores.has(c.id))
  const totalStars = selectedList.reduce((s, c) => s + c.defaultStars, 0)

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
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">בחר מטלות:</p>
              {selectedChores.size > 0 && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {selectedChores.size} נבחרו · +{totalStars}⭐
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto no-scrollbar">
              {chores.map((chore) => {
                const isSelected = selectedChores.has(chore.id)
                return (
                  <button
                    key={chore.id}
                    type="button"
                    onClick={() => toggleChore(chore)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-right transition-all active:scale-95 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{chore.emoji || '⭐'}</span>
                    <span className="flex-1 font-medium text-gray-800">{chore.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-amber-500 font-bold">{chore.defaultStars}⭐</span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && <span className="text-white text-[11px] font-black leading-none">✓</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
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
        {((tab === 'chore' && selectedChores.size > 0) || (tab === 'custom' && customStars)) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center">
            <span className="text-xl font-bold text-amber-600">
              +{tab === 'chore' ? totalStars : customStars} ⭐
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
          disabled={tab === 'chore' ? selectedChores.size === 0 : !customStars}
        >
          {tab === 'chore' && selectedChores.size > 1
            ? `✅ אשר ${selectedChores.size} מטלות (+${totalStars}⭐)`
            : '✅ אשר ועדכן'}
        </Button>
      </form>
    </Modal>
  )
}
