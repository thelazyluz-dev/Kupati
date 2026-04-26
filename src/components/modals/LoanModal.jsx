import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

export default function LoanModal() {
  const { closeModal, modalData, loanMoney, repayLoan, requirePin } = useApp()
  const { childId, child } = modalData || {}

  const [amount,      setAmount]      = useState('')
  const [description, setDescription] = useState('')
  const [confirmId,   setConfirmId]   = useState(null)

  if (!child) return null

  const activeLoans  = (child.loans || []).filter((l) => !l.repaid)
  const parsedAmount = parseFloat(amount) || 0

  function handleGive(e) {
    e.preventDefault()
    if (parsedAmount <= 0) return
    requirePin(() => {
      loanMoney(childId, { amount: parsedAmount, description: description.trim() })
      setAmount('')
      setDescription('')
      closeModal()
    })
  }

  function handleRepay(loanId) {
    if (confirmId !== loanId) { setConfirmId(loanId); return }
    requirePin(() => {
      repayLoan(childId, loanId)
      setConfirmId(null)
    })
  }

  return (
    <Modal title="💳 הלוואה" onClose={closeModal} headerColor="from-cyan-500 to-teal-600">
      <div className="space-y-5">

        {/* Active loans */}
        {activeLoans.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-bold text-gray-700 text-sm">הלוואות פתוחות</h3>
            {activeLoans.map((loan) => (
              <div key={loan.id} className="bg-cyan-50 border border-cyan-200 rounded-2xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{loan.description || 'הלוואה'}</p>
                  <p className="text-xl font-black text-cyan-700">{formatNumber(loan.amount)}₪</p>
                </div>
                {confirmId === loan.id ? (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRepay(loan.id)}
                      className="bg-teal-500 hover:bg-teal-600 active:scale-95 text-white rounded-xl px-3 py-2 text-xs font-bold transition-all"
                    >
                      ✅ אשר
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="bg-gray-200 hover:bg-gray-300 active:scale-95 text-gray-600 rounded-xl px-3 py-2 text-xs font-bold transition-all"
                    >
                      ביטול
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRepay(loan.id)}
                    className="flex-shrink-0 bg-teal-500 hover:bg-teal-600 active:scale-95 text-white rounded-xl px-4 py-2 text-sm font-bold transition-all shadow-sm"
                  >
                    פרע
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* New loan form */}
        <form onSubmit={handleGive} className="space-y-3">
          <h3 className={`font-bold text-gray-700 text-sm ${activeLoans.length > 0 ? 'border-t border-gray-100 pt-4' : ''}`}>
            {activeLoans.length > 0 ? 'הוסף הלוואה נוספת' : 'הוסף הלוואה'}
          </h3>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">סכום (₪)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-cyan-400 focus:outline-none"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">תיאור (אופציונלי)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='למשל: "לקנות ספר"'
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-base focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <Button type="submit" variant="primary" fullWidth size="lg" disabled={parsedAmount <= 0}>
            💳 הלוואה{parsedAmount > 0 ? `: ${formatNumber(parsedAmount)}₪` : ''}
          </Button>
        </form>

      </div>
    </Modal>
  )
}
