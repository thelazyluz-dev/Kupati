import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { sounds } from '../../lib/sounds.js'
import { generateId, formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

const PENALTY_EMOJIS = ['⚡','🦷','👂','😤','📱','🧹','📚','🛏️','🍽️','🙅','😠','🚫']

export default function PenaltyModal() {
  const { closeModal, modalData, children, adjustStars, addTransaction, settings, updateSettings } = useApp()
  const childId = modalData?.childId
  const child   = children.find((c) => c.id === childId)

  const reasons = settings.penaltyReasons ?? []

  const [selectedId,  setSelectedId]  = useState(null)
  const [customText,  setCustomText]  = useState('')
  const [customEmoji, setCustomEmoji] = useState('⚡')
  const [showCustom,  setShowCustom]  = useState(reasons.length === 0)
  const [saveNew,     setSaveNew]     = useState(true)
  const [amountStr,   setAmountStr]   = useState('')
  const [addingNew,   setAddingNew]   = useState(false)
  const [newText,     setNewText]     = useState('')
  const [newEmoji,    setNewEmoji]    = useState('⚡')
  const [newDefault,  setNewDefault]  = useState('3')

  if (!child) return null

  const selected   = reasons.find((r) => r.id === selectedId)
  const finalText  = selected ? selected.text  : customText.trim()
  const finalEmoji = selected ? selected.emoji : customEmoji
  const stars      = parseFloat(amountStr) || 0
  const canPenalize = stars > 0 && stars <= child.starBalance && finalText

  function pickReason(r) {
    setSelectedId(r.id)
    setShowCustom(false)
    setCustomText('')
    if (!amountStr) setAmountStr(String(r.defaultAmount))
  }

  function pickCustom() {
    setSelectedId(null)
    setShowCustom(true)
  }

  function deleteReason(id) {
    updateSettings({ penaltyReasons: reasons.filter((r) => r.id !== id) })
    if (selectedId === id) { setSelectedId(null); setShowCustom(true) }
  }

  function saveNewReason() {
    if (!newText.trim()) return
    const r = { id: generateId(), emoji: newEmoji, text: newText.trim(), defaultAmount: parseFloat(newDefault) || 3 }
    updateSettings({ penaltyReasons: [...reasons, r] })
    setAddingNew(false)
    setNewText(''); setNewEmoji('⚡'); setNewDefault('3')
    setSelectedId(r.id)
    setShowCustom(false)
    setAmountStr(String(r.defaultAmount))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!canPenalize) return

    if (showCustom && saveNew && customText.trim()) {
      const r = { id: generateId(), emoji: customEmoji, text: customText.trim(), defaultAmount: stars }
      updateSettings({ penaltyReasons: [...reasons, r] })
    }

    adjustStars(childId, -stars)
    addTransaction(childId, {
      type: 'penalty',
      amount: stars,
      currency: 'stars',
      description: `⚡ קנס: ${finalEmoji} ${finalText}`,
    })
    sounds.error?.()
    closeModal()
  }

  return (
    <Modal title="⚡ הטל קנס" onClose={closeModal} headerColor="from-red-500 to-rose-600">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Balance */}
        <div className="flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ background: 'rgba(254,242,242,0.8)', border: '1.5px solid rgba(252,165,165,0.4)' }}>
          <div>
            <p className="text-xs text-gray-400 font-semibold">ילד</p>
            <p className="text-base font-black text-gray-800">{child.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 font-semibold">יתרה</p>
            <p className="text-xl font-black text-amber-600">{formatNumber(child.starBalance)}⭐</p>
          </div>
        </div>

        {/* Saved reasons */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-600">סיבת הקנס</p>
            <button type="button"
              onClick={() => setAddingNew((v) => !v)}
              className="text-xs font-bold text-rose-500 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 active:scale-95 transition-all">
              {addingNew ? 'ביטול' : '+ הוסף סיבה'}
            </button>
          </div>

          {/* Add new reason inline */}
          {addingNew && (
            <div className="rounded-2xl p-3 mb-2 space-y-2"
              style={{ background: 'rgba(254,242,242,0.7)', border: '1.5px dashed rgba(252,165,165,0.6)' }}>
              <div className="flex gap-2 items-center">
                <select value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)}
                  className="w-12 text-center text-xl bg-white border-2 border-gray-200 rounded-xl py-1.5 cursor-pointer outline-none flex-shrink-0">
                  {PENALTY_EMOJIS.map((em) => <option key={em} value={em}>{em}</option>)}
                </select>
                <input value={newText} onChange={(e) => setNewText(e.target.value)}
                  placeholder="שם הסיבה (למשל: לא ניקה אוזניים)"
                  className="flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), saveNewReason())}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 flex-shrink-0">ברירת מחדל:</span>
                <input type="number" min="1" step="1" value={newDefault}
                  onChange={(e) => setNewDefault(e.target.value)}
                  className="w-16 rounded-xl border-2 border-gray-200 px-2 py-1.5 text-sm font-bold text-center focus:border-rose-400 focus:outline-none"
                  dir="ltr" />
                <span className="text-xs text-gray-500">⭐</span>
                <button type="button" onClick={saveNewReason}
                  disabled={!newText.trim()}
                  className="mr-auto px-4 py-1.5 rounded-xl text-xs font-black text-white active:scale-95 transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)' }}>
                  שמור
                </button>
              </div>
            </div>
          )}

          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => {
              const isSel = selectedId === r.id
              return (
                <div key={r.id} className="relative group">
                  <button type="button" onClick={() => pickReason(r)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                      isSel
                        ? 'text-white shadow-md'
                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                    }`}
                    style={isSel ? { background: 'linear-gradient(135deg,#f43f5e,#e11d48)', boxShadow: '0 3px 12px rgba(244,63,94,0.4)' } : {}}>
                    <span>{r.emoji}</span>
                    <span>{r.text}</span>
                    <span className={`text-xs font-black ${isSel ? 'opacity-80' : 'opacity-50'}`}>{r.defaultAmount}⭐</span>
                  </button>
                  {/* Delete X */}
                  <button type="button" onClick={() => deleteReason(r.id)}
                    className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 hidden group-hover:flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black leading-none shadow-md active:scale-90 transition-all"
                    style={{ width: 18, height: 18 }}
                    aria-label="מחק סיבה">
                    ×
                  </button>
                </div>
              )
            })}

            {/* Custom reason chip */}
            <button type="button" onClick={pickCustom}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                showCustom
                  ? 'text-white shadow-md'
                  : 'text-gray-500 bg-gray-100 hover:bg-gray-200 border border-dashed border-gray-300'
              }`}
              style={showCustom ? { background: 'linear-gradient(135deg,#6b7280,#374151)', boxShadow: '0 3px 12px rgba(0,0,0,0.2)' } : {}}>
              ✏️ <span>אחר...</span>
            </button>
          </div>

          {/* Custom text input */}
          {showCustom && (
            <div className="mt-2 space-y-2 animate-slide-up">
              <div className="flex gap-2">
                <select value={customEmoji} onChange={(e) => setCustomEmoji(e.target.value)}
                  className="w-12 text-center text-xl bg-white border-2 border-gray-200 rounded-xl py-2 cursor-pointer outline-none flex-shrink-0">
                  {PENALTY_EMOJIS.map((em) => <option key={em} value={em}>{em}</option>)}
                </select>
                <input value={customText} onChange={(e) => setCustomText(e.target.value)}
                  placeholder="כתוב סיבה..."
                  className="flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded" />
                <span className="text-xs text-gray-500">שמור לרשימת הסיבות לפעם הבאה</span>
              </label>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2">כמות כוכבים לנכות</p>
          <div className="flex gap-2 flex-wrap mb-2">
            {[1, 2, 3, 5, 10].map((n) => (
              <button key={n} type="button" onClick={() => setAmountStr(String(n))}
                className={`px-3 py-2 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                  stars === n
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                style={stars === n ? { background: 'linear-gradient(135deg,#f43f5e,#e11d48)' } : {}}>
                -{n}⭐
              </button>
            ))}
          </div>
          <input type="number" min="1" max={child.starBalance} step="1"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="כמות מותאמת אישית"
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-xl font-black focus:border-rose-400 focus:outline-none text-center"
            dir="ltr"
          />
          {stars > child.starBalance && (
            <p className="text-red-500 text-xs mt-1 text-center font-semibold">
              אין מספיק כוכבים — יש {formatNumber(child.starBalance)}⭐
            </p>
          )}
        </div>

        {/* Preview */}
        {canPenalize && (
          <div className="rounded-2xl px-4 py-3 text-center animate-pop"
            style={{ background: 'rgba(254,226,226,0.9)', border: '1.5px solid rgba(252,165,165,0.5)', boxShadow: '0 4px 12px rgba(244,63,94,0.12)' }}>
            <p className="text-xs text-rose-400 font-semibold mb-1">תוצאה</p>
            <p className="text-2xl font-black text-rose-600" dir="ltr">
              -{formatNumber(stars)}⭐
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{finalEmoji} {finalText}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatNumber(child.starBalance)}⭐ ← {formatNumber(Math.max(0, child.starBalance - stars))}⭐
            </p>
          </div>
        )}

        <Button type="submit" fullWidth size="lg" variant="danger" disabled={!canPenalize}>
          ⚡ הטל קנס
        </Button>
      </form>
    </Modal>
  )
}
