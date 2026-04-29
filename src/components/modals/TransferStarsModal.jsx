import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

export default function TransferStarsModal() {
  const { closeModal, modalData, children, doTransferStars } = useApp()
  const { childId, child } = modalData || {}

  const siblings = (children || []).filter(c => c.id !== childId)
  const [targetId,  setTargetId]  = useState(() => siblings[0]?.id || '')
  const [stars,     setStars]     = useState('')
  const [mode,      setMode]      = useState('gift')
  const [price,     setPrice]     = useState('')
  const [confirmed, setConfirmed] = useState(false)

  if (!child || siblings.length === 0) return null

  const parsedStars = Math.max(0, Math.floor(parseFloat(stars) || 0))
  const parsedPrice = Math.max(0, parseFloat(price) || 0)
  const target      = children.find(c => c.id === targetId)

  const validStars = parsedStars >= 1 && parsedStars <= child.starBalance
  const validPrice = mode === 'gift' || (parsedPrice >= 1 && parsedPrice <= (target?.shekelBalance || 0))
  const canTransfer = validStars && validPrice

  function handleConfirm() {
    if (!canTransfer) return
    if (!confirmed) { setConfirmed(true); return }
    doTransferStars(childId, targetId, parsedStars, mode === 'sale' ? parsedPrice : 0)
    closeModal()
  }

  return (
    <Modal title="🔄 העברת כוכבים" onClose={closeModal} headerColor="from-indigo-400 to-purple-500">
      <div className="space-y-4">

        {/* Mode toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          {[['gift','🎁 מתנה'],['sale','💰 מכירה']].map(([m, label]) => (
            <button key={m}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === m ? (m === 'gift' ? 'bg-indigo-500 text-white shadow' : 'bg-orange-500 text-white shadow') : 'text-gray-500'}`}
              onClick={() => { setMode(m); setConfirmed(false) }}
            >{label}</button>
          ))}
        </div>

        {/* Sibling picker */}
        <div>
          <p className="text-xs text-gray-500 font-semibold mb-1.5">למי?</p>
          <div className="flex gap-2">
            {siblings.map(s => (
              <button key={s.id}
                onClick={() => { setTargetId(s.id); setConfirmed(false) }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${targetId === s.id ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-gray-50 text-gray-500'}`}
              >
                {s.avatarImage
                  ? <img src={s.avatarImage} alt={s.name} className="w-9 h-9 rounded-full mx-auto mb-1 object-cover" />
                  : <span className="text-3xl block leading-none mb-1">{s.avatar}</span>}
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stars input */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            כמה כוכבים? <span className="text-gray-400 font-normal">(יש לך {formatNumber(child.starBalance)}⭐)</span>
          </label>
          <div className="flex items-center gap-2">
            <input type="number" min="1" max={child.starBalance} step="1"
              value={stars}
              onChange={e => { setStars(e.target.value); setConfirmed(false) }}
              placeholder={`1 – ${child.starBalance}`}
              className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-indigo-400 focus:outline-none"
              dir="ltr"
            />
            <span className="text-2xl">⭐</span>
          </div>
          {parsedStars > child.starBalance && <p className="text-xs text-red-500 mt-1">אין מספיק כוכבים</p>}
        </div>

        {/* Price input (sale only) */}
        {mode === 'sale' && (
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">
              תמורת כמה שקלים? <span className="text-gray-400 font-normal">(ל{target?.name} יש {formatNumber(target?.shekelBalance || 0)}₪)</span>
            </label>
            <div className="flex items-center gap-2">
              <input type="number" min="1" step="1"
                value={price}
                onChange={e => { setPrice(e.target.value); setConfirmed(false) }}
                placeholder="מחיר"
                className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-orange-400 focus:outline-none"
                dir="ltr"
              />
              <span className="text-2xl">💵</span>
            </div>
            {parsedPrice > (target?.shekelBalance || 0) && <p className="text-xs text-red-500 mt-1">ל{target?.name} אין מספיק שקלים</p>}
          </div>
        )}

        {/* Preview */}
        {parsedStars >= 1 && (
          <div className={`rounded-2xl p-4 text-center space-y-1 ${mode === 'gift' ? 'bg-indigo-50' : 'bg-orange-50'}`}>
            <p className="text-sm text-gray-500">
              <strong>{child.name}</strong> {mode === 'gift' ? 'מעביר בחינם' : 'מוכר'} ל<strong>{target?.name}</strong>
            </p>
            <p className={`text-2xl font-black ${mode === 'gift' ? 'text-indigo-700' : 'text-orange-700'}`}>
              {parsedStars}⭐{mode === 'sale' && parsedPrice >= 1 ? ` ← ${parsedPrice}💵` : ''}
            </p>
          </div>
        )}

        {confirmed ? (
          <div className="space-y-2">
            <p className="text-sm text-center font-bold text-gray-700 bg-gray-50 rounded-xl py-2">בטוח לאשר?</p>
            <div className="flex gap-2">
              <Button variant="primary" fullWidth onClick={handleConfirm}>✅ אשר</Button>
              <Button variant="secondary" fullWidth onClick={() => setConfirmed(false)}>ביטול</Button>
            </div>
          </div>
        ) : (
          <Button variant="primary" fullWidth size="lg" onClick={handleConfirm} disabled={!canTransfer}>
            {mode === 'gift' ? '🎁 שלח כוכבים' : '💰 מכור כוכבים'}
          </Button>
        )}
      </div>
    </Modal>
  )
}
