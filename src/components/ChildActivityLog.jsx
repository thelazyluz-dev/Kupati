import { useApp } from '../context/AppContext.jsx'

const TYPE_META = {
  savings_open:  { icon: '🏦', label: 'פתח חסכון'   },
  savings_close: { icon: '💰', label: 'פדה חסכון'   },
  savings_early: { icon: '⚠️', label: 'פדיון מוקדם' },
  transfer_out:  { icon: '💸', label: 'העביר כסף'   },
  wheel_spin:    { icon: '🎰', label: 'גלגל המזל'   },
  wheel_win:     { icon: '🎉', label: 'זכייה בגלגל' },
}

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60)   return 'עכשיו'
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק׳`
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע׳`
  return new Date(ts).toLocaleDateString('he', { day: 'numeric', month: 'short' })
}

export default function ChildActivityLog({ onClose }) {
  const { childActivity, markChildActivityRead } = useApp()

  function handleClose() {
    markChildActivityRead()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 100%)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
        <h1 className="text-lg font-black text-gray-800">🔔 עדכוני ילדים</h1>
        <button onClick={handleClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold text-gray-500 active:scale-90 transition-all"
          style={{ background: 'rgba(243,244,246,0.9)' }}>×</button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {childActivity.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-gray-400 font-semibold">אין עדיינה פעולות</p>
            <p className="text-gray-300 text-sm mt-1">פעולות של הילדים יופיעו כאן</p>
          </div>
        ) : (
          childActivity.map((entry) => {
            const meta = TYPE_META[entry.type] || { icon: '📋', label: entry.type }
            const isCredit = entry.type === 'wheel_win' || entry.type === 'savings_close' || entry.type === 'savings_early'
            const isDebit  = entry.type === 'savings_open' || entry.type === 'wheel_spin'
            const amtColor = isCredit ? 'text-emerald-600' : isDebit ? 'text-rose-500' : 'text-indigo-600'
            const amtSign  = isCredit ? '+' : isDebit ? '-' : ''
            const unit     = entry.currency === 'stars' ? '⭐' : '₪'
            return (
              <div key={entry.id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <span className="text-2xl flex-shrink-0">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{entry.childName}</p>
                  <p className="text-xs text-gray-500 truncate">{entry.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {entry.amount > 0 && (
                    <p className={`text-sm font-black ${amtColor}`} dir="ltr">
                      {amtSign}{entry.amount}{unit}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">{timeAgo(entry.timestamp)}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
