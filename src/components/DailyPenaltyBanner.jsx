import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { get, remove } from '../lib/storage.js'
import { formatNumber } from '../lib/utils.js'

const KEY = 'lastDailyPenalties'
const MAX_AGE_MS = 48 * 3600000   // stop offering undo after 2 days

/**
 * Shown on the parent home screen right after automatic daily penalties were
 * applied — so a wrong penalty (e.g. the chore was done on another device and
 * hadn't synced yet) is one tap to undo instead of a dig through history.
 */
export default function DailyPenaltyBanner() {
  const { deleteTransaction } = useApp()
  const [record, setRecord] = useState(() => get(KEY))

  useEffect(() => {
    function onSync(e) {
      if (e.detail?.key === KEY) setRecord(get(KEY))
    }
    window.addEventListener('kupati-storage', onSync)
    return () => window.removeEventListener('kupati-storage', onSync)
  }, [])

  if (!record?.items?.length) return null
  if (Date.now() - (record.appliedAt || 0) > MAX_AGE_MS) return null

  function clear() {
    remove(KEY)
    setRecord(null)
  }

  function undoAll() {
    // deleteTransaction (AppContext version) reverses the balance effect,
    // so removing each penalty tx also gives the stars back.
    record.items.forEach(({ childId, txId }) => deleteTransaction(childId, txId))
    clear()
  }

  const total = record.items.reduce((s, i) => s + (i.amount || 0), 0)
  const names = [...new Set(record.items.map((i) => i.childName))].join(', ')

  return (
    <div className="rounded-2xl px-4 py-3 mb-3 animate-pop"
      style={{ background: 'rgba(254,242,242,0.95)', border: '1.5px solid rgba(252,165,165,0.6)', boxShadow: '0 4px 14px rgba(244,63,94,0.12)' }}>
      <div className="flex items-start gap-2.5">
        <span className="text-xl flex-shrink-0">⚡</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-rose-700">
            הוטל קנס יומי — {formatNumber(total)}⭐
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {names} · על מטלות שלא בוצעו
          </p>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={undoAll}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)' }}>
              ↩️ בטל את הקנס
            </button>
            <button type="button" onClick={clear}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-500 bg-white/80 border border-gray-200 active:scale-95 transition-all">
              הקנס מוצדק ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
