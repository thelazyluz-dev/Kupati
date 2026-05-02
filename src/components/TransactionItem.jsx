import { useApp } from '../context/AppContext.jsx'
import { formatRelativeTime, formatNumber } from '../lib/utils.js'

const TYPE_STYLE = {
  chore:          { icon: '📋', label: 'מטלה',         bg: 'bg-white',      iconBg: 'bg-amber-100',   amount: 'text-amber-600'   },
  gift:           { icon: '🎁', label: 'מתנה',         bg: 'bg-white',      iconBg: 'bg-emerald-100', amount: 'text-emerald-600'  },
  other:          { icon: '💝', label: 'קיבלתי',       bg: 'bg-white',      iconBg: 'bg-emerald-100', amount: 'text-emerald-600'  },
  expense:        { icon: '🛍️', label: 'קנייה',        bg: 'bg-white',      iconBg: 'bg-rose-100',    amount: 'text-rose-600'     },
  convert_out:    { icon: '🔄', label: 'המרה',         bg: 'bg-white',      iconBg: 'bg-sky-100',     amount: 'text-sky-600'     },
  convert_in:     { icon: '✨', label: 'המרה',         bg: 'bg-white',      iconBg: 'bg-sky-100',     amount: 'text-sky-600'     },
  prize_redeem:   { icon: '🎁', label: 'פרס',          bg: 'bg-white',      iconBg: 'bg-purple-100',  amount: 'text-purple-600'   },
  savings_open:   { icon: '🏦', label: 'חסכון נפתח',   bg: 'bg-white',      iconBg: 'bg-blue-100',    amount: 'text-blue-600'     },
  savings_close:  { icon: '💰', label: 'חסכון הבשיל',  bg: 'bg-white',      iconBg: 'bg-teal-100',    amount: 'text-teal-600'     },
  savings_early:  { icon: '⚠️', label: 'פדיון מוקדם',  bg: 'bg-white',      iconBg: 'bg-orange-100',  amount: 'text-orange-600'   },
  penalty:        { icon: '⚡', label: 'קנס',            bg: 'bg-white',      iconBg: 'bg-red-100',     amount: 'text-red-600'      },
  stars_transfer_out: { icon: '↗️', label: 'כוכבים נשלחו',   bg: 'bg-white', iconBg: 'bg-indigo-100',  amount: 'text-indigo-600'  },
  stars_transfer_in:  { icon: '↙️', label: 'כוכבים התקבלו',  bg: 'bg-white', iconBg: 'bg-indigo-100',  amount: 'text-indigo-600'  },
  stars_sold_out:     { icon: '🤝', label: 'מכירת כוכבים',   bg: 'bg-white', iconBg: 'bg-orange-100',  amount: 'text-orange-600'  },
  stars_bought_in:    { icon: '🤝', label: 'קניית כוכבים',   bg: 'bg-white', iconBg: 'bg-orange-100',  amount: 'text-orange-600'  },
  wheel_spin:     { icon: '🎰', label: 'גלגל המזל',     bg: 'bg-white',      iconBg: 'bg-violet-100',  amount: 'text-violet-600'   },
  wheel_win:      { icon: '🎰', label: 'גלגל המזל',     bg: 'bg-white',      iconBg: 'bg-violet-100',  amount: 'text-violet-600'   },
  loan:           { icon: '💳', label: 'הלוואה',        bg: 'bg-white',      iconBg: 'bg-cyan-100',    amount: 'text-cyan-600'     },
  learning:       { icon: '📚', label: 'למידה',         bg: 'bg-white',      iconBg: 'bg-violet-100',  amount: 'text-violet-600'   },
  loan_repay:     { icon: '💳', label: 'פרעון הלוואה',  bg: 'bg-white',      iconBg: 'bg-cyan-100',    amount: 'text-cyan-600'     },
  allowance:      { icon: '💰', label: 'קצבה',           bg: 'bg-white',      iconBg: 'bg-lime-100',    amount: 'text-lime-600'     },
}

const FALLBACK = { icon: '💸', label: 'עסקה', bg: 'bg-white', iconBg: 'bg-gray-100', amount: 'text-gray-600' }

export default function TransactionItem({ transaction, childId, selectMode = false, isSelected = false, onToggle }) {
  const { showModal } = useApp()
  const { type, amount, currency, description, note, timestamp } = transaction
  const style = TYPE_STYLE[type] ?? FALLBACK
  const isDeduct = type === 'expense' || type === 'convert_out' || type === 'prize_redeem' || type === 'savings_open' || type === 'penalty' || type === 'wheel_spin' || type === 'loan_repay' || type === 'stars_transfer_out' || type === 'stars_sold_out'
  const currencySymbol = currency === 'stars' ? '⭐' : '₪'
  const sign = isDeduct ? '-' : '+'

  function handleRowClick() {
    if (selectMode) onToggle?.()
  }

  return (
    <div
      onClick={handleRowClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-2xl shadow-sm ${style.bg} ${selectMode ? 'cursor-pointer active:brightness-95' : ''} ${isSelected ? 'ring-2 ring-indigo-400' : ''}`}
    >
      {/* Select circle or type icon */}
      {selectMode ? (
        <div className={`w-9 h-9 flex items-center justify-center rounded-full border-2 flex-shrink-0 transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-gray-100 border-gray-200'}`}>
          {isSelected && <span className="text-white text-base font-bold">✓</span>}
        </div>
      ) : (
        <div className={`w-9 h-9 flex items-center justify-center rounded-full text-lg flex-shrink-0 ${style.iconBg}`}>
          {style.icon}
        </div>
      )}

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

      {/* Edit button — hidden in select mode */}
      {childId && !selectMode && (
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
