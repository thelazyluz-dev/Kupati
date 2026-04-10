import { useState } from 'react'
import TransactionItem from './TransactionItem.jsx'

const PAGE_SIZE = 10

export default function TransactionList({ transactions, childId }) {
  const [page, setPage] = useState(0)

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <div className="text-5xl mb-3">📭</div>
        <p className="font-medium">עדיין לא היו עסקאות</p>
      </div>
    )
  }

  const totalPages = Math.ceil(transactions.length / PAGE_SIZE)
  const visible    = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {visible.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} childId={childId} />
        ))}
      </div>

      {/* Pagination */}
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
    </div>
  )
}
