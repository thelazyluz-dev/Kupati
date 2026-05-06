import { useApp } from '../context/AppContext.jsx'
import { formatRelativeTime, formatNumber } from '../lib/utils.js'

const TYPE_STYLE = {
  chore:            { icon: '📋', label: 'מטלה',         iconBg: 'rgba(251,191,36,0.2)',  iconShadow: 'rgba(245,158,11,0.3)',  amount: 'text-amber-600'   },
  gift:             { icon: '🎁', label: 'מתנה',         iconBg: 'rgba(52,211,153,0.2)',  iconShadow: 'rgba(16,185,129,0.3)', amount: 'text-emerald-600'  },
  other:            { icon: '💝', label: 'קיבלתי',       iconBg: 'rgba(52,211,153,0.2)',  iconShadow: 'rgba(16,185,129,0.3)', amount: 'text-emerald-600'  },
  expense:          { icon: '🛍️', label: 'קנייה',        iconBg: 'rgba(251,113,133,0.2)', iconShadow: 'rgba(239,68,68,0.3)',  amount: 'text-rose-600'     },
  convert_out:      { icon: '🔄', label: 'המרה',         iconBg: 'rgba(56,189,248,0.2)',  iconShadow: 'rgba(14,165,233,0.3)', amount: 'text-sky-600'      },
  convert_in:       { icon: '✨', label: 'המרה',         iconBg: 'rgba(56,189,248,0.2)',  iconShadow: 'rgba(14,165,233,0.3)', amount: 'text-sky-600'      },
  prize_redeem:     { icon: '🎁', label: 'פרס',          iconBg: 'rgba(167,139,250,0.2)', iconShadow: 'rgba(139,92,246,0.3)', amount: 'text-purple-600'   },
  savings_open:     { icon: '🏦', label: 'חסכון נפתח',   iconBg: 'rgba(96,165,250,0.2)',  iconShadow: 'rgba(59,130,246,0.3)', amount: 'text-blue-600'     },
  savings_close:    { icon: '💰', label: 'חסכון הבשיל',  iconBg: 'rgba(45,212,191,0.2)',  iconShadow: 'rgba(20,184,166,0.3)', amount: 'text-teal-600'     },
  savings_early:    { icon: '⚠️', label: 'פדיון מוקדם',  iconBg: 'rgba(251,146,60,0.2)',  iconShadow: 'rgba(249,115,22,0.3)', amount: 'text-orange-600'   },
  penalty:          { icon: '⚡', label: 'קנס',           iconBg: 'rgba(252,165,165,0.2)', iconShadow: 'rgba(239,68,68,0.3)',  amount: 'text-red-600'      },
  stars_transfer_out:{ icon: '↗️', label: 'כוכבים נשלחו',  iconBg: 'rgba(129,140,248,0.2)', iconShadow: 'rgba(99,102,241,0.3)', amount: 'text-indigo-600' },
  stars_transfer_in: { icon: '↙️', label: 'כוכבים התקבלו', iconBg: 'rgba(129,140,248,0.2)', iconShadow: 'rgba(99,102,241,0.3)', amount: 'text-indigo-600' },
  stars_sold_out:    { icon: '🤝', label: 'מכירת כוכבים', iconBg: 'rgba(251,146,60,0.2)',  iconShadow: 'rgba(249,115,22,0.3)', amount: 'text-orange-600'  },
  stars_bought_in:   { icon: '🤝', label: 'קניית כוכבים', iconBg: 'rgba(251,146,60,0.2)',  iconShadow: 'rgba(249,115,22,0.3)', amount: 'text-orange-600'  },
  wheel_spin:       { icon: '🎰', label: 'גלגל המזל',    iconBg: 'rgba(196,181,253,0.2)', iconShadow: 'rgba(139,92,246,0.3)', amount: 'text-violet-600'   },
  wheel_win:        { icon: '🎰', label: 'גלגל המזל',    iconBg: 'rgba(196,181,253,0.2)', iconShadow: 'rgba(139,92,246,0.3)', amount: 'text-violet-600'   },
  loan:             { icon: '💳', label: 'הלוואה',       iconBg: 'rgba(103,232,249,0.2)', iconShadow: 'rgba(6,182,212,0.3)',  amount: 'text-cyan-600'     },
  learning:         { icon: '📚', label: 'למידה',        iconBg: 'rgba(196,181,253,0.2)', iconShadow: 'rgba(139,92,246,0.3)', amount: 'text-violet-600'   },
  loan_repay:       { icon: '💳', label: 'פרעון הלוואה', iconBg: 'rgba(103,232,249,0.2)', iconShadow: 'rgba(6,182,212,0.3)',  amount: 'text-cyan-600'     },
  allowance:        { icon: '💰', label: 'קצבה',         iconBg: 'rgba(163,230,53,0.2)',  iconShadow: 'rgba(101,163,13,0.3)', amount: 'text-lime-600'     },
}

const FALLBACK = { icon: '💸', label: 'עסקה', iconBg: 'rgba(156,163,175,0.2)', iconShadow: 'rgba(107,114,128,0.2)', amount: 'text-gray-600' }

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
      className={`flex items-center gap-3 px-3 py-3 rounded-2xl ${selectMode ? 'cursor-pointer active:brightness-95' : ''} ${isSelected ? 'ring-2 ring-indigo-400' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(8px)',
        border: isSelected ? '1.5px solid rgba(99,102,241,0.4)' : '1.5px solid rgba(255,255,255,0.7)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.9)',
      }}
    >
      {/* Select circle or type icon */}
      {selectMode ? (
        <div
          className={`w-9 h-9 flex items-center justify-center rounded-full border-2 flex-shrink-0 transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-gray-100 border-gray-200'}`}
        >
          {isSelected && <span className="text-white text-base font-bold">✓</span>}
        </div>
      ) : (
        <div
          className="w-9 h-9 flex items-center justify-center rounded-full text-lg flex-shrink-0"
          style={{
            background: style.iconBg,
            boxShadow: `0 2px 8px ${style.iconShadow}`,
          }}
        >
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

      {/* Edit button */}
      {childId && !selectMode && (
        <button
          type="button"
          onClick={() => showModal('editTransaction', { childId, transaction })}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 text-sm active:scale-90"
          style={{ background: 'rgba(243,244,246,0.8)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          aria-label="ערוך עסקה"
        >
          ✏️
        </button>
      )}
    </div>
  )
}
