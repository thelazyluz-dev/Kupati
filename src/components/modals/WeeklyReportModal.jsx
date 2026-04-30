import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'

// Sunday–Saturday Israeli week
function getWeekBounds(offsetWeeks = 0) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sun = new Date(today)
  sun.setDate(today.getDate() - today.getDay() + offsetWeeks * 7)
  const sat = new Date(sun)
  sat.setDate(sun.getDate() + 7)
  return { start: sun.getTime(), end: sat.getTime() }
}

function weekLabel(offset) {
  if (offset === 0) return 'השבוע'
  if (offset === -1) return 'שבוע שעבר'
  const { start } = getWeekBounds(offset)
  const d = new Date(start)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

const STAR_EXCLUDE = new Set(['convert_out', 'penalty', 'prize_redeem', 'savings_open'])

function buildReport(txList, weekStart, weekEnd) {
  const tx = txList.filter(t => t.timestamp >= weekStart && t.timestamp < weekEnd)

  const chores      = tx.filter(t => t.type === 'chore').length
  const learning    = tx.filter(t => t.type === 'learning').length

  const starsIn  = tx.filter(t => t.currency === 'stars' && t.amount > 0 && !STAR_EXCLUDE.has(t.type))
                     .reduce((s, t) => s + t.amount, 0)
  const starsOut = tx.filter(t => t.currency === 'stars' && STAR_EXCLUDE.has(t.type))
                     .reduce((s, t) => s + t.amount, 0)

  const shekelsIn  = tx.filter(t => t.currency === 'shekels' && t.amount > 0 && t.type !== 'expense')
                       .reduce((s, t) => s + t.amount, 0)
  const shekelsOut = tx.filter(t => t.currency === 'shekels' && (t.type === 'expense' || t.amount < 0))
                       .reduce((s, t) => s + Math.abs(t.amount), 0)

  return { chores, learning, starsIn, starsOut, shekelsIn, shekelsOut }
}

function Cell({ children, className = '' }) {
  return (
    <td className={`px-2 py-3 text-center text-sm ${className}`}>{children}</td>
  )
}

function Delta({ value, unit = '' }) {
  if (value === 0) return <span className="text-gray-400 text-xs">—</span>
  const pos = value > 0
  return (
    <span className={`font-bold text-sm ${pos ? 'text-green-600' : 'text-red-500'}`}>
      {pos ? '+' : ''}{value}{unit}
    </span>
  )
}

export default function WeeklyReportModal() {
  const { closeModal, children, getTransactions } = useApp()
  const [weekOffset, setWeekOffset] = useState(0)

  const { start, end } = getWeekBounds(weekOffset)

  const rows = children.map(child => {
    const tx = getTransactions(child.id)
    const r = buildReport(tx, start, end)
    return { child, ...r }
  })

  const totals = rows.reduce((acc, r) => ({
    chores:     acc.chores     + r.chores,
    learning:   acc.learning   + r.learning,
    starsIn:    acc.starsIn    + r.starsIn,
    starsOut:   acc.starsOut   + r.starsOut,
    shekelsIn:  acc.shekelsIn  + r.shekelsIn,
    shekelsOut: acc.shekelsOut + r.shekelsOut,
  }), { chores: 0, learning: 0, starsIn: 0, starsOut: 0, shekelsIn: 0, shekelsOut: 0 })

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 px-5 pt-10 pb-6 text-white text-center rounded-b-[2rem] shrink-0">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg"
        >×</button>
        <div className="text-4xl mb-2">📊</div>
        <h1 className="text-xl font-black">דוח שבועי</h1>

        {/* Week selector */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="w-8 h-8 bg-white/20 rounded-full font-bold text-lg active:scale-90"
          >‹</button>
          <span className="font-bold text-white/90 min-w-[90px] text-center">{weekLabel(weekOffset)}</span>
          <button
            onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
            className={`w-8 h-8 bg-white/20 rounded-full font-bold text-lg active:scale-90 ${weekOffset === 0 ? 'opacity-30 pointer-events-none' : ''}`}
          >›</button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
        {[
          { label: 'מטלות', value: totals.chores,   emoji: '✅', color: 'bg-emerald-100 text-emerald-700' },
          { label: 'לימוד',  value: totals.learning,  emoji: '📚', color: 'bg-sky-100 text-sky-700' },
          { label: 'כוכבים הרוויחו', value: `+${totals.starsIn}⭐`, emoji: '', color: 'bg-amber-100 text-amber-700' },
          { label: 'כוכבים הוציאו', value: `-${totals.starsOut}⭐`, emoji: '', color: 'bg-red-100 text-red-600' },
        ].map(c => (
          <div key={c.label} className={`shrink-0 rounded-2xl px-3 py-2 text-center ${c.color}`}>
            <p className="text-lg font-black">{c.emoji} {c.value}</p>
            <p className="text-xs font-semibold opacity-70">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {rows.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">אין ילדים</p>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-indigo-50 text-indigo-700 text-xs font-bold">
                  <th className="px-3 py-3 text-right">ילד</th>
                  <th className="px-2 py-3 text-center">✅<br/>מטלות</th>
                  <th className="px-2 py-3 text-center">📚<br/>לימוד</th>
                  <th className="px-2 py-3 text-center">⭐<br/>הרוויח</th>
                  <th className="px-2 py-3 text-center">⭐<br/>הוציא</th>
                  <th className="px-2 py-3 text-center">💰<br/>שינוי ₪</th>
                  <th className="px-2 py-3 text-center">🏦<br/>מאזן</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.child.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{r.child.avatar || '🦁'}</span>
                        <span className="font-bold text-gray-800 text-sm leading-tight">{r.child.name}</span>
                      </div>
                    </td>
                    <Cell>
                      <span className={`font-black text-base ${r.chores > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                        {r.chores || '—'}
                      </span>
                    </Cell>
                    <Cell>
                      <span className={`font-black text-base ${r.learning > 0 ? 'text-sky-600' : 'text-gray-300'}`}>
                        {r.learning || '—'}
                      </span>
                    </Cell>
                    <Cell>
                      <span className={`font-black text-base ${r.starsIn > 0 ? 'text-amber-500' : 'text-gray-300'}`}>
                        {r.starsIn > 0 ? `+${r.starsIn}` : '—'}
                      </span>
                    </Cell>
                    <Cell>
                      <span className={`font-black text-base ${r.starsOut > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                        {r.starsOut > 0 ? `-${r.starsOut}` : '—'}
                      </span>
                    </Cell>
                    <Cell>
                      <Delta value={r.shekelsIn - r.shekelsOut} unit="₪" />
                    </Cell>
                    <Cell>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs font-bold text-amber-600">{r.child.starBalance}⭐</span>
                        <span className="text-xs font-bold text-green-700">{r.child.shekelBalance}₪</span>
                      </div>
                    </Cell>
                  </tr>
                ))}
              </tbody>
              {rows.length > 1 && (
                <tfoot>
                  <tr className="bg-indigo-50 border-t-2 border-indigo-200 text-indigo-800 font-black">
                    <td className="px-3 py-3 text-sm">סה״כ</td>
                    <Cell>{totals.chores || '—'}</Cell>
                    <Cell>{totals.learning || '—'}</Cell>
                    <Cell>{totals.starsIn > 0 ? `+${totals.starsIn}` : '—'}</Cell>
                    <Cell>{totals.starsOut > 0 ? `-${totals.starsOut}` : '—'}</Cell>
                    <Cell><Delta value={totals.shekelsIn - totals.shekelsOut} unit="₪" /></Cell>
                    <Cell>—</Cell>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
