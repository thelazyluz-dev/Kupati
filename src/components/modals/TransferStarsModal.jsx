import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

export default function TransferStarsModal() {
  const { closeModal, modalData, children, doTransferStars, doTransferMoney } = useApp()
  const { childId, child } = modalData || {}

  const siblings = (children || []).filter(c => c.id !== childId)
  const [currency,  setCurrency]  = useState('stars')  // 'stars' | 'shekels'
  const [targetId,  setTargetId]  = useState(() => siblings[0]?.id || '')
  const [amount,    setAmount]    = useState('')
  const [mode,      setMode]      = useState('gift')   // stars only: 'gift' | 'sale'
  const [price,     setPrice]     = useState('')
  const [confirmed, setConfirmed] = useState(false)

  if (!child || siblings.length === 0) return null

  const parsed      = Math.max(0, currency === 'stars' ? Math.floor(parseFloat(amount) || 0) : parseFloat(amount) || 0)
  const parsedPrice = Math.max(0, parseFloat(price) || 0)
  const target      = children.find(c => c.id === targetId)

  const maxBalance  = currency === 'stars' ? child.starBalance : child.shekelBalance
  const validAmount = parsed >= 1 && parsed <= maxBalance
  const validPrice  = currency === 'shekels' || mode === 'gift' || (parsedPrice >= 1 && parsedPrice <= (target?.shekelBalance || 0))
  const canTransfer = validAmount && validPrice

  function reset() { setAmount(''); setPrice(''); setConfirmed(false) }

  function handleCurrency(c) { setCurrency(c); reset() }
  function handleMode(m)     { setMode(m);     setConfirmed(false) }
  function handleTarget(id)  { setTargetId(id); setConfirmed(false) }

  function handleConfirm() {
    if (!canTransfer) return
    if (!confirmed) { setConfirmed(true); return }
    if (currency === 'stars') {
      doTransferStars(childId, targetId, parsed, mode === 'sale' ? parsedPrice : 0)
    } else {
      doTransferMoney(childId, targetId, parsed)
    }
    closeModal()
  }

  const isStars    = currency === 'stars'
  const accentFrom = isStars ? 'from-indigo-400 to-purple-500' : 'from-emerald-400 to-teal-500'

  return (
    <Modal title="🔄 העברה בין אחים" onClose={closeModal} headerColor={accentFrom}>
      <div className="space-y-4">

        {/* Currency tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          {[['stars','⭐ כוכבים'],['shekels','💵 כסף']].map(([c, label]) => (
            <button key={c}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                currency === c
                  ? (c === 'stars' ? 'bg-indigo-500 text-white shadow' : 'bg-emerald-500 text-white shadow')
                  : 'text-gray-500'
              }`}
              onClick={() => handleCurrency(c)}
            >{label}</button>
          ))}
        </div>

        {/* Mode toggle — stars only */}
        {isStars && (
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            {[['gift','🎁 מתנה'],['sale','💰 מכירה']].map(([m, label]) => (
              <button key={m}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  mode === m ? (m === 'gift' ? 'bg-indigo-500 text-white shadow' : 'bg-orange-500 text-white shadow') : 'text-gray-500'
                }`}
                onClick={() => handleMode(m)}
              >{label}</button>
            ))}
          </div>
        )}

        {/* Sibling picker */}
        <div>
          <p className="text-xs text-gray-500 font-semibold mb-1.5">למי?</p>
          <div className="flex gap-2">
            {siblings.map(s => (
              <button key={s.id}
                onClick={() => handleTarget(s.id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                  targetId === s.id
                    ? (isStars ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-emerald-400 bg-emerald-50 text-emerald-700')
                    : 'border-gray-100 bg-gray-50 text-gray-500'
                }`}
              >
                {s.avatarImage
                  ? <img src={s.avatarImage} alt={s.name} className="w-9 h-9 rounded-full mx-auto mb-1 object-cover" />
                  : <span className="text-3xl block leading-none mb-1">{s.avatar}</span>}
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Amount input */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            {isStars ? 'כמה כוכבים?' : 'כמה שקלים?'}{' '}
            <span className="text-gray-400 font-normal">
              (יש לך {formatNumber(maxBalance)}{isStars ? '⭐' : '₪'})
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="1" max={maxBalance} step={isStars ? '1' : '0.5'}
              value={amount}
              onChange={e => { setAmount(e.target.value); setConfirmed(false) }}
              placeholder={`1 – ${maxBalance}`}
              className={`flex-1 rounded-2xl border-2 px-4 py-3 text-lg focus:outline-none ${
                isStars ? 'border-gray-200 focus:border-indigo-400' : 'border-gray-200 focus:border-emerald-400'
              }`}
              dir="ltr"
            />
            <span className="text-2xl">{isStars ? '⭐' : '💵'}</span>
          </div>
          {parsed > maxBalance && (
            <p className="text-xs text-red-500 mt-1">אין מספיק {isStars ? 'כוכבים' : 'שקלים'}</p>
          )}
        </div>

        {/* Price input — stars sale only */}
        {isStars && mode === 'sale' && (
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">
              תמורת כמה שקלים?{' '}
              <span className="text-gray-400 font-normal">(ל{target?.name} יש {formatNumber(target?.shekelBalance || 0)}₪)</span>
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
            {parsedPrice > (target?.shekelBalance || 0) && (
              <p className="text-xs text-red-500 mt-1">ל{target?.name} אין מספיק שקלים</p>
            )}
          </div>
        )}

        {/* Preview */}
        {parsed >= 1 && (
          <div className={`rounded-2xl p-4 text-center space-y-1 ${
            isStars ? (mode === 'gift' ? 'bg-indigo-50' : 'bg-orange-50') : 'bg-emerald-50'
          }`}>
            <p className="text-sm text-gray-500">
              <strong>{child.name}</strong>{' '}
              {isStars ? (mode === 'gift' ? 'מעביר בחינם' : 'מוכר') : 'מעביר'}{' '}
              ל<strong>{target?.name}</strong>
            </p>
            <p className={`text-2xl font-black ${
              isStars ? (mode === 'gift' ? 'text-indigo-700' : 'text-orange-700') : 'text-emerald-700'
            }`}>
              {parsed}{isStars ? '⭐' : '₪'}
              {isStars && mode === 'sale' && parsedPrice >= 1 ? ` ← ${parsedPrice}💵` : ''}
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
            {isStars
              ? (mode === 'gift' ? '🎁 שלח כוכבים' : '💰 מכור כוכבים')
              : '💸 העבר כסף'}
          </Button>
        )}
      </div>
    </Modal>
  )
}
