import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import TransactionItem from './TransactionItem.jsx'
import { formatDateLabel } from '../lib/utils.js'

const PAGE_SIZE = 10

const FILTERS = [
  { key: 'all',      label: 'הכל',       match: () => true },
  { key: 'chores',   label: '⭐ מטלות',  match: (tx) => tx.type === 'chore' },
  { key: 'income',   label: '💵 הכנסות', match: (tx) => ['gift', 'other', 'convert_in'].includes(tx.type) },
  { key: 'expenses', label: '🛍️ הוצאות', match: (tx) => ['expense', 'convert_out'].includes(tx.type) },
]

function DaySeparator({ label }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1.5">
      <span className="text-xs font-black text-gray-500">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

export default function TransactionList({ transactions, childId }) {
  const { deleteTransaction, requirePin } = useApp()
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(new Set())

  const filterFn = FILTERS.find((f) => f.key === filter)?.match ?? (() => true)
  const filtered  = transactions.filter(filterFn)

  function handleFilter(key) {
    setFilter(key)
    setPage(0)
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(filtered.map((tx) => tx.id)))
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  function deleteSelected() {
    requirePin(() => {
      selected.forEach((id) => deleteTransaction(childId, id))
      exitSelectMode()
    })
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <div className="text-5xl mb-3">📭</div>
        <p className="font-medium">עדיין לא היו עסקאות</p>
      </div>
    )
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const visible    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function buildRows(txList) {
    const rows = []
    let lastLabel = null
    let txIdx = 0
    for (const tx of txList) {
      const label = formatDateLabel(tx.timestamp)
      if (label !== lastLabel) {
        rows.push({ type: 'sep', label })
        lastLabel = label
      }
      rows.push({ type: 'tx', tx, idx: txIdx++ })
    }
    return rows
  }

  const rows = buildRows(visible)

  return (
    <div>
      {/* Filter chips + select button */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar pb-0.5">
        {!selectMode ? (
          <>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => handleFilter(f.key)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer"
                style={filter === f.key ? {
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: 'white',
                  boxShadow: '0 3px 10px rgba(99,102,241,0.4)',
                } : {
                  background: 'rgba(255,255,255,0.85)',
                  color: '#4b5563',
                  border: '1px solid rgba(229,231,235,0.8)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="flex-shrink-0 mr-auto px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.85)',
                color: '#6b7280',
                border: '1px solid rgba(229,231,235,0.8)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              }}
            >
              ☑️ בחר
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={exitSelectMode}
              className="px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.85)', color: '#4b5563', border: '1px solid rgba(229,231,235,0.8)', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.85)', color: '#6366f1', border: '1px solid rgba(199,210,254,0.8)', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
            >
              בחר הכל
            </button>
            <span className="text-xs text-gray-500 font-medium mr-1">
              {selected.size > 0 ? `${selected.size} נבחרו` : 'בחר פריטים'}
            </span>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={deleteSelected}
                className="mr-auto px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all cursor-pointer text-white"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 3px 10px rgba(239,68,68,0.4)' }}
              >
                🗑️ מחק ({selected.size})
              </button>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 rounded-2xl text-gray-400"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(229,231,235,0.6)' }}>
          <p className="font-medium">אין עסקאות בקטגוריה זו</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {rows.map((row, i) =>
              row.type === 'sep' ? (
                <DaySeparator key={`sep-${i}`} label={row.label} />
              ) : (
                <div
                  key={row.tx.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${row.idx * 35}ms`, animationFillMode: 'both' }}
                >
                  <TransactionItem
                    transaction={row.tx}
                    childId={childId}
                    selectMode={selectMode}
                    isSelected={selected.has(row.tx.id)}
                    onToggle={() => toggleSelect(row.tx.id)}
                  />
                </div>
              )
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 px-1">
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 disabled:opacity-30 active:scale-95 transition-all cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(229,231,235,0.8)' }}
              >
                ← ישן יותר
              </button>
              <span className="text-sm text-gray-400 font-medium">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 disabled:opacity-30 active:scale-95 transition-all cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(229,231,235,0.8)' }}
              >
                חדש יותר →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
