import { useApp } from '../context/AppContext.jsx'
import { formatRelativeTime, formatNumber } from '../lib/utils.js'

const TYPE_STYLE = {
  chore:          { icon: '📋', label: 'מטלה',         bg: 'bg-amber-50',   border: 'border-r-4 border-amber-400',   amount: 'text-amber-600'   },
  gift:           { icon: '🎁', label: 'מתנה',         bg: 'bg-emerald-50', border: 'border-r-4 border-emerald-400', amount: 'text-emerald-600'  },
  other:          { icon: '💝', label: 'קיבלתי',       bg: 'bg-emerald-50', border: 'border-r-4 border-emerald-400', amount: 'text-emerald-600'  },
  expense:        { icon: '🛍️', label: 'קנייה',        bg: 'bg-rose-50',    border: 'border-r-4 border-rose-400',    amount: 'text-rose-600'     },
  convert_out:    { icon: '🔄', label: 'המרה',         bg: 'bg-sky-50',     border: 'border-r-4 border-sky-400',     amount: 'text-sky-600'     },
  convert_in:     { icon: '✨', label: 'המרה',         bg: 'bg-sky-50',     border: 'border-r-4 border-sky-400',     amount: 'text-sky-600'     },
  prize_redeem:   { icon: '🎁', label: 'פרס',          bg: 'bg-purple-50',  border: 'border-r-4 border-purple-400',  amount: 'text-purple-600'   },
  savings_open:   { icon: '🏦', label: 'חסכון נפתח',   bg: 'bg-blue-50',    border: 'border-r-4 border-blue-400',    amount: 'text-blue-600'     },
  savings_close:  { icon: '💰', label: 'חסכון הבשיל',  bg: 'bg-teal-50',    border: 'border-r-4 border-teal-400',    amount: 'text-teal-600'     },
  savings_early:  { icon: '⚠️', label: 'פדיון מוקדם',  bg: 'bg-orange-50',  border: 'border-r-4 border-orange-400',  amount: 'text-orange-600'   },
}

const FALLBACK = { icon: '💸', label: 'עסקה', bg: 'bg-gray-50', border: 'border-r-4 border-gray-300', amount: 'text-gray-600' }

export default function TransactionItem({ transaction, childId }) {
  const { showModal } = useApp()
  const { type, amount, currency, description, note, timestamp } = transaction
  const style = TYPE_STYLE[type] ?? FALLBACK
  const isDeduct = type === 'expense' || type === 'convert_out' || type === 'prize_redeem' || type === 'savings_open'
  const currencySymbol = currency === 'stars' ? '⭐' : '₪'
  const sign = isDeduct ? '-' : '+'

  return (
    <div className={`flex items-center gap-3 px-3 py-3 border-b border-gray-100 last:border-0 ${style.bg} ${style.border}`}>
      {/* Icon */}
      <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/70 text-lg flex-shrink-0 shadow-sm">
        {style.icon}
      </div>

      {/* Description + time */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm leading-tight truncate">
          {description || style.label}
        </p>
        {note && (
          <p className="text-xs text-gray-400 truncate">{note}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {formatRelativeTime(timestamp)}
        </p>
      </div>

      {/* Amount */}
      <div className={`font-bold text-base flex-shrink-0 ${style.amount}`} dir="ltr">
        {sign}{formatNumber(amount)}{currencySymbol}
      </div>

      {/* Edit button */}
      {childId && (
        <button
          type="button"
          onClick={() => showModal('editTransaction', { childId, transaction })}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/70 hover:bg-white text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 text-sm active:scale-90 shadow-sm"
          aria-label="ערוך עסקה"
        >
          ✏️
        </button>
      )}
    </div>
  )
}
