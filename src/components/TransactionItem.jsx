import { useApp } from '../context/AppContext.jsx'
import { formatRelativeTime, formatNumber } from '../lib/utils.js'

const TYPE_ICON = {
  chore: '📋',
  gift: '🎁',
  other: '💰',
  expense: '🛍️',
  convert_out: '🔄',
  convert_in: '✨',
}

const TYPE_LABEL = {
  chore: 'מטלה',
  gift: 'מתנה',
  other: 'הכנסה',
  expense: 'הוצאה',
  convert_out: 'המרה',
  convert_in: 'המרה',
}

export default function TransactionItem({ transaction, childId }) {
  const { showModal } = useApp()
  const { type, amount, currency, description, note, timestamp } = transaction
  const isExpense = type === 'expense' || type === 'convert_out'
  const currencySymbol = currency === 'stars' ? '⭐' : '₪'
  const sign = isExpense ? '-' : '+'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Icon */}
      <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl text-xl flex-shrink-0">
        {TYPE_ICON[type] || '💸'}
      </div>

      {/* Description + time */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm leading-tight truncate">
          {description || TYPE_LABEL[type]}
        </p>
        {note && (
          <p className="text-xs text-gray-400 truncate">{note}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {formatRelativeTime(timestamp)}
        </p>
      </div>

      {/* Amount */}
      <div
        className={`font-bold text-base flex-shrink-0 ${isExpense ? 'text-red-500' : 'text-emerald-600'}`}
        dir="ltr"
      >
        {sign}{formatNumber(amount)}{currencySymbol}
      </div>

      {/* Edit button */}
      {childId && (
        <button
          type="button"
          onClick={() => showModal('editTransaction', { childId, transaction })}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 text-sm active:scale-90"
          aria-label="ערוך עסקה"
        >
          ✏️
        </button>
      )}
    </div>
  )
}
