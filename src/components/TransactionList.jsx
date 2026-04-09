import { useState } from 'react'
import TransactionItem from './TransactionItem.jsx'
import Button from './ui/Button.jsx'

const PAGE_SIZE = 50

export default function TransactionList({ transactions }) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const visible = transactions.slice(0, limit)

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <div className="text-5xl mb-3">📭</div>
        <p className="font-medium">עדיין לא היו עסקאות</p>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {visible.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} />
        ))}
      </div>
      {transactions.length > limit && (
        <div className="text-center mt-4">
          <Button
            variant="secondary"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
          >
            הצג עוד ({transactions.length - limit} נוספות)
          </Button>
        </div>
      )}
    </div>
  )
}
