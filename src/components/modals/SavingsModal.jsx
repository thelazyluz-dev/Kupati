import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

const MONTH_OPTIONS = [1, 2, 3, 6, 12]

function SavingCard({ saving, childId, onEarlyWithdraw }) {
  const now = Date.now()
  const totalMs = saving.maturityDate - saving.startDate
  const elapsed = now - saving.startDate
  const progress = Math.min(1, elapsed / totalMs)
  const daysLeft = Math.max(0, Math.ceil((saving.maturityDate - now) / 86400000))
  const interest = saving.amount * 0.10 * saving.termMonths
  const total = saving.amount + interest

  const maturityDate = new Date(saving.maturityDate)
  const dateStr = maturityDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-blue-500 font-semibold">חסכון פעיל</span>
        <span className="text-sm font-bold text-blue-700">{saving.termMonths} חודש{saving.termMonths > 1 ? 'ים' : ''}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-white rounded-xl py-2">
          <p className="text-lg font-black text-gray-800" dir="ltr">{formatNumber(saving.amount)}₪</p>
          <p className="text-xs text-gray-500">קרן</p>
        </div>
        <div className="bg-white rounded-xl py-2">
          <p className="text-lg font-black text-teal-600" dir="ltr">+{formatNumber(interest)}₪</p>
          <p className="text-xs text-gray-500">ריבית צפויה</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>{daysLeft > 0 ? `עוד ${daysLeft} ימים` : 'הגיע למועד פירעון!'}</span>
          <span>פירעון: {dateStr}</span>
        </div>
        <div className="w-full bg-white rounded-full h-3 overflow-hidden border border-blue-200">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-teal-400 transition-all duration-700"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl py-2 text-center">
        <p className="text-xl font-black text-teal-700" dir="ltr">{formatNumber(total)}₪</p>
        <p className="text-xs text-gray-500">סכום סופי בפירעון</p>
      </div>

      <button
        type="button"
        onClick={() => onEarlyWithdraw(saving)}
        className="w-full text-xs text-orange-500 hover:text-orange-700 font-semibold py-1 transition-colors"
      >
        ⚠️ פדיון מוקדם (ריבית תאבד)
      </button>
    </div>
  )
}

export default function SavingsModal() {
  const { closeModal, modalData, settings, startSavings, finishSavings, requirePin } = useApp()
  const { childId, child } = modalData || {}

  const [amount, setAmount] = useState('')
  const [termMonths, setTermMonths] = useState(3)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [earlyTarget, setEarlyTarget] = useState(null)

  if (!child) return null

  const activeSavings = (child.savings || []).filter((s) => s.status === 'active')
  const parsedAmount = parseFloat(amount) || 0
  const interest = parsedAmount * 0.10 * termMonths
  const total = parsedAmount + interest
  const canOpen = parsedAmount >= 1 && parsedAmount <= child.shekelBalance

  function handleOpen() {
    if (!canOpen) return
    if (!confirmOpen) { setConfirmOpen(true); return }
    startSavings(childId, { amount: parsedAmount, termMonths })
    closeModal()
  }

  function handleEarlyWithdraw(saving) {
    setEarlyTarget(saving)
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
        {earlyTarget && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
            <p className="font-bold text-orange-700 text-center">
              ⚠️ פדיון מוקדם
            </p>
            <p className="text-sm text-gray-600 text-center">
              תקבל בחזרה רק {formatNumber(earlyTarget.amount)}₪ (הקרן).<br />
              ריבית של {formatNumber(earlyTarget.amount * 0.10 * earlyTarget.termMonths)}₪ תאבד.
            </p>
            <div className="flex gap-2">
              <Button variant="warning" fullWidth onClick={confirmEarly}>פדה</Button>
              <Button variant="secondary" fullWidth onClick={() => setEarlyTarget(null)}>ביטול</Button>
            </div>
          </div>
        )}

        {/* Active savings */}
        {activeSavings.length > 0 && !earlyTarget && (
          <div className="space-y-3">
            <h3 className="font-bold text-gray-700 text-sm">חסכונות פעילים</h3>
            {activeSavings.map((s) => (
              <SavingCard key={s.id} saving={s} childId={childId} onEarlyWithdraw={handleEarlyWithdraw} />
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
              <span className="text-2xl font-black text-emerald-700" dir="ltr">{formatNumber(child.shekelBalance)}₪</span>
              <p className="text-xs text-emerald-600">זמין לחסכון</p>
            </div>

            {/* Amount input */}
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

            {/* Term selector */}
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">לכמה זמן?</label>
              <div className="flex gap-2">
                {MONTH_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setTermMonths(m); setConfirmOpen(false) }}
                    className={[
                      'flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95',
                      termMonths === m
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    ].join(' ')}
                  >
                    {m === 12 ? 'שנה' : `${m}חד׳`}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {parsedAmount >= 1 && parsedAmount <= child.shekelBalance && (
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl p-4 text-center border border-blue-100">
                <p className="text-xs text-gray-500 mb-1">בסיום תקבל</p>
                <p className="text-3xl font-black text-teal-700" dir="ltr">{formatNumber(total)}₪</p>
                <p className="text-xs text-gray-500 mt-1">
                  קרן {formatNumber(parsedAmount)}₪ + ריבית {formatNumber(interest)}₪
                  {' '}(10% × {termMonths} חודש{termMonths > 1 ? 'ים' : ''})
                </p>
              </div>
            )}

            {confirmOpen ? (
              <div className="space-y-2">
                <p className="text-sm text-indigo-700 font-semibold text-center bg-indigo-50 rounded-xl py-2">
                  הכסף ינעל ל-{termMonths} חודש{termMonths > 1 ? 'ים' : ''}.<br />
                  פדיון מוקדם יאפשר רק קרן בחזרה.
                </p>
                <div className="flex gap-2">
                  <Button variant="primary" fullWidth onClick={handleOpen}>✅ פתח חסכון</Button>
                  <Button variant="secondary" fullWidth onClick={() => setConfirmOpen(false)}>ביטול</Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" fullWidth size="lg" onClick={handleOpen} disabled={!canOpen}>
                🏦 פתח חסכון
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
