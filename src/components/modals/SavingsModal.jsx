import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

function calcCompletedMonths(startTimestamp) {
  const s = new Date(startTimestamp), n = new Date()
  let m = (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth())
  if (n.getDate() < s.getDate()) m--
  return Math.max(0, m)
}

// Compound interest: principal × 1.10^months
function cv(principal, months) {
  return principal * Math.pow(1.10, months)
}

function SavingCard({ saving, onWithdraw }) {
  const now = Date.now()
  const cm  = calcCompletedMonths(saving.startDate)

  // Next exit point
  const nextExit = new Date(saving.startDate)
  nextExit.setMonth(nextExit.getMonth() + cm + 1)
  const daysUntilNext = Math.ceil((nextExit.getTime() - now) / 86400000)

  // Progress within current month (toward next exit)
  const prevExit = new Date(saving.startDate)
  prevExit.setMonth(prevExit.getMonth() + cm)
  const monthProgress = Math.min(1, (now - prevExit.getTime()) / (nextExit.getTime() - prevExit.getTime()))

  const currentPayout = cv(saving.amount, cm)
  const nextPayout    = cv(saving.amount, cm + 1)

  const [preview, setPreview] = useState(Math.max(1, cm + 1))
  const previewPayout = cv(saving.amount, preview)

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-blue-500 font-semibold">🏦 חסכון פעיל</span>
        <span className="font-black text-gray-800">
          {formatNumber(saving.amount)}₪ <span className="text-xs font-normal text-gray-500">קרן</span>
        </span>
      </div>

      {/* Progress bar — next exit point */}
      <div className="bg-white rounded-xl p-3 space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-gray-400">חודש {cm}{cm > 0 ? ' ✅' : ''}</span>
          <span className="text-indigo-600">עוד {daysUntilNext} ימים → חודש {cm + 1}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-indigo-400 to-teal-500 transition-all duration-300"
            style={{ width: `${monthProgress * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-bold">
          <span className={cm > 0 ? 'text-teal-600' : 'text-gray-400'}>
            {cm > 0 ? `עכשיו: ${formatNumber(currentPayout)}₪` : 'עוד לא חודש'}
          </span>
          <span className="text-indigo-600">חד׳ {cm + 1}: {formatNumber(nextPayout)}₪</span>
        </div>
      </div>

      {/* Interactive slider */}
      <div className="bg-white rounded-xl p-3 space-y-2">
        <p className="text-[10px] text-gray-400 text-center font-semibold uppercase tracking-wide">
          גרור לראות כמה תקבל בכל חודש
        </p>
        <input
          type="range"
          min="1"
          max="24"
          step="1"
          value={preview}
          onChange={(e) => setPreview(Number(e.target.value))}
          className="w-full accent-teal-500 cursor-pointer"
        />
        <div className="text-center">
          <p className="text-2xl font-black text-teal-700">{formatNumber(previewPayout)}₪</p>
          <p className="text-xs text-gray-400 mt-0.5">
            חודש {preview} · +{formatNumber(previewPayout - saving.amount)}₪ ריבית ·{' '}
            {preview <= cm
              ? '✅ כבר עבר'
              : `עוד ~${preview - cm} חודש${preview - cm > 1 ? 'ים' : ''}`}
          </p>
        </div>
      </div>

      {/* Withdraw button */}
      {cm >= 1 ? (
        <button
          type="button"
          onClick={() => onWithdraw(saving)}
          className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 active:scale-95 text-white font-bold text-sm transition-all shadow-sm"
        >
          💰 פדה עכשיו — {formatNumber(currentPayout)}₪
        </button>
      ) : (
        <div className="w-full py-2 rounded-xl bg-gray-100 text-center text-xs text-gray-400 font-semibold">
          🔒 נעול — עוד {daysUntilNext} ימים לנקודת יציאה ראשונה
        </div>
      )}
    </div>
  )
}

export default function SavingsModal() {
  const { closeModal, modalData, startSavings, finishSavings, requirePin } = useApp()
  const { childId, child } = modalData || {}

  const [amount,      setAmount]      = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [earlyTarget, setEarlyTarget] = useState(null)

  if (!child) return null

  const activeSavings = (child.savings || []).filter((s) => s.status === 'active')
  const parsedAmount  = parseFloat(amount) || 0
  const canOpen       = parsedAmount >= 1 && parsedAmount <= child.shekelBalance

  function handleOpen() {
    if (!canOpen) return
    if (!confirmOpen) { setConfirmOpen(true); return }
    startSavings(childId, { amount: parsedAmount })
    closeModal()
  }

  function confirmEarly() {
    requirePin(() => {
      finishSavings(childId, earlyTarget.id, 'early')
      setEarlyTarget(null)
      closeModal()
    })
  }

  return (
    <Modal title="🏦 חסכון" onClose={closeModal} headerColor="from-blue-400 to-teal-500">
      <div className="space-y-5">

        {/* Early withdrawal confirmation */}
        {earlyTarget && (() => {
          const cm = calcCompletedMonths(earlyTarget.startDate)
          const ep = cv(earlyTarget.amount, cm)
          const ei = ep - earlyTarget.amount
          return (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
              <p className="font-bold text-orange-700 text-center">💰 אישור פדיון</p>
              {cm > 0 ? (
                <p className="text-sm text-gray-700 text-center">
                  תקבל <strong className="text-teal-700 text-lg">{formatNumber(ep)}₪</strong><br />
                  <span className="text-xs text-gray-500">
                    קרן {formatNumber(earlyTarget.amount)}₪ + {cm} חודש{cm > 1 ? 'ים' : ''} ריבית (+{formatNumber(ei)}₪)
                  </span>
                </p>
              ) : (
                <p className="text-sm text-gray-600 text-center">
                  תקבל {formatNumber(earlyTarget.amount)}₪ (קרן בלבד — פחות מחודש)
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="warning" fullWidth onClick={confirmEarly}>פדה</Button>
                <Button variant="secondary" fullWidth onClick={() => setEarlyTarget(null)}>ביטול</Button>
              </div>
            </div>
          )
        })()}

        {/* Active savings */}
        {activeSavings.length > 0 && !earlyTarget && (
          <div className="space-y-3">
            <h3 className="font-bold text-gray-700 text-sm">חסכונות פעילים</h3>
            {activeSavings.map((s) => (
              <SavingCard key={s.id} saving={s} onWithdraw={setEarlyTarget} />
            ))}
          </div>
        )}

        {/* Open new savings */}
        {!earlyTarget && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 text-sm border-t border-gray-100 pt-4">
              {activeSavings.length > 0 ? 'פתח חסכון נוסף' : 'פתח חסכון חדש'}
            </h3>

            <div className="bg-emerald-50 rounded-2xl py-2 text-center">
              <span className="text-2xl font-black text-emerald-700">{formatNumber(child.shekelBalance)}₪</span>
              <p className="text-xs text-emerald-600">זמין לחסכון</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">כמה לחסוך?</label>
              <input
                type="number"
                min="1"
                max={child.shekelBalance}
                step="1"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setConfirmOpen(false) }}
                placeholder={`עד ${formatNumber(child.shekelBalance)}₪`}
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-indigo-400 focus:outline-none"
                dir="ltr"
              />
              {parsedAmount > child.shekelBalance && (
                <p className="text-xs text-red-500 mt-1">אין מספיק שקלים</p>
              )}
            </div>

            {/* Monthly exit point preview chips */}
            {parsedAmount >= 1 && parsedAmount <= child.shekelBalance && (
              <div>
                <p className="text-xs text-gray-400 text-center mb-2">נקודות יציאה חודשיות (10% ריבית לחודש)</p>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {[1, 2, 3, 4, 5, 6].map((m) => (
                    <div key={m} className="flex-shrink-0 bg-gradient-to-b from-blue-50 to-teal-50 border border-blue-100 rounded-xl p-2 text-center min-w-[56px]">
                      <p className="text-[10px] text-gray-400 font-semibold">חד׳ {m}</p>
                      <p className="text-sm font-black text-teal-700">{formatNumber(cv(parsedAmount, m))}₪</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {confirmOpen ? (
              <div className="space-y-2">
                <p className="text-sm text-indigo-700 font-semibold text-center bg-indigo-50 rounded-xl py-2 px-3">
                  הכסף ינעל ויצבור 10% ריבית לחודש.<br />
                  ניתן לפדות בכל נקודת יציאה חודשית.
                </p>
                <div className="flex gap-2">
                  <Button variant="primary" fullWidth onClick={handleOpen}>✅ נעל ובחסוך</Button>
                  <Button variant="secondary" fullWidth onClick={() => setConfirmOpen(false)}>ביטול</Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" fullWidth size="lg" onClick={handleOpen} disabled={!canOpen}>
                🔒 נעל ובחסוך
              </Button>
            )}
          </div>
        )}

      </div>
    </Modal>
  )
}
