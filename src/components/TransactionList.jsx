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
      <span className="text-xs font-black text-gray-600">{label}</span>
      <div className="flex-1 h-px bg-gray-300" />
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
      // deleteTransaction (AppContext wrapper) handles balance + free spin for each tx
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
                className={[
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95',
                  filter === f.key
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50',
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="flex-shrink-0 mr-auto px-3 py-1.5 rounded-full text-xs font-bold bg-white text-gray-500 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
              ☑️ בחר
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={exitSelectMode}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-white text-gray-600 shadow-sm active:scale-95 transition-all"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 shadow-sm active:scale-95 transition-all"
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
                className="mr-auto px-3 py-1.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm active:scale-95 transition-all"
              >
                🗑️ מחק ({selected.size})
              </button>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-2xl shadow-sm text-gray-400">
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
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white shadow-sm text-sm font-semibold text-gray-600 disabled:opacity-30 active:scale-95 transition-all"
              >
                ← ישן יותר
              </button>
              <span className="text-sm text-gray-400 font-medium">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white shadow-sm text-sm font-semibold text-gray-600 disabled:opacity-30 active:scale-95 transition-all"
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
