import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { formatNumber } from '../../lib/utils.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

export default function LoanModal() {
  const { closeModal, modalData, children, loanMoney, repayLoan, requirePin } = useApp()
  const { childId } = modalData || {}

  // Use live child from context so list updates immediately after repayment
  const child = children.find((c) => c.id === childId)

  const [amount,      setAmount]      = useState('')
  const [description, setDescription] = useState('')
  const [confirmId,   setConfirmId]   = useState(null)
  const [repaidName,  setRepaidName]  = useState(null) // success flash

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

  function handleRepay(loan) {
    if (confirmId !== loan.id) { setConfirmId(loan.id); return }
    requirePin(() => {
      repayLoan(childId, loan.id)
      setConfirmId(null)
      setRepaidName(loan.description || 'הלוואה')
      // Clear success flash after 2.5s
      setTimeout(() => setRepaidName(null), 2500)
    })
  }

  return (
    <Modal title="💳 הלוואה" onClose={closeModal} headerColor="from-cyan-500 to-teal-600">
      <div className="space-y-5">

        {/* Repayment success flash */}
        {repaidName && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3 animate-bounce-in"
            style={{
              background: 'linear-gradient(135deg,rgba(209,250,229,0.9),rgba(167,243,208,0.9))',
              border: '1.5px solid rgba(16,185,129,0.35)',
              boxShadow: '0 4px 16px rgba(16,185,129,0.2)',
            }}
          >
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-black text-emerald-800 text-sm">ההלוואה נפרעה!</p>
              <p className="text-xs text-emerald-600 font-semibold">{repaidName}</p>
            </div>
          </div>
        )}

        {/* Active loans */}
        {activeLoans.length > 0 ? (
          <div className="space-y-2">
            <h3 className="font-bold text-gray-700 text-sm">הלוואות פתוחות</h3>
            {activeLoans.map((loan) => (
              <div
                key={loan.id}
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{
                  background: 'rgba(236,254,255,0.9)',
                  border: '1.5px solid rgba(6,182,212,0.3)',
                  boxShadow: '0 4px 12px rgba(6,182,212,0.1), inset 0 1px 1px rgba(255,255,255,0.8)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{loan.description || 'הלוואה'}</p>
                  <p className="text-xl font-black text-cyan-700">{formatNumber(loan.amount)}₪</p>
                </div>
                {confirmId === loan.id ? (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRepay(loan)}
                      className="active:scale-95 text-white rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                      style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 3px 10px rgba(16,185,129,0.4)' }}
                    >
                      ✅ אשר פרעון
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="active:scale-95 text-gray-600 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                      style={{ background: 'rgba(243,244,246,0.9)', border: '1px solid rgba(209,213,219,0.6)' }}
                    >
                      ביטול
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRepay(loan)}
                    className="flex-shrink-0 active:scale-95 text-white rounded-xl px-4 py-2 text-sm font-bold transition-all cursor-pointer"
                    style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)', boxShadow: '0 3px 10px rgba(6,182,212,0.4)' }}
                  >
                    פרע
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : !repaidName && (
          <div className="text-center py-4 text-gray-400">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold text-sm">אין הלוואות פתוחות</p>
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
