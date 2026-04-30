import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'

const STAR_EXCLUDE = new Set(['convert_out', 'penalty', 'prize_redeem', 'savings_open'])
const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

function getWeekBounds(offset = 0) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay() + offset * 7)
  return { start: d.getTime(), end: d.getTime() + 7 * 86400000 }
}

function getMonthBounds(offset = 0) {
  const d = new Date()
  d.setDate(1); d.setHours(0, 0, 0, 0)
  d.setMonth(d.getMonth() + offset)
  return { start: d.getTime(), end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() }
}

function getBounds(period, offset) {
  if (period === 'all')   return { start: 0, end: Date.now() + 86400000 }
  if (period === 'month') return getMonthBounds(offset)
  return getWeekBounds(offset)
}

function periodLabel(period, offset) {
  if (period === 'all') return 'מההתחלה'
  if (period === 'week') {
    if (offset === 0)  return 'השבוע'
    if (offset === -1) return 'שבוע שעבר'
    const { start } = getWeekBounds(offset)
    const d = new Date(start)
    return `${d.getDate()}/${d.getMonth() + 1}`
  }
  if (offset === 0)  return 'החודש'
  if (offset === -1) return 'חודש שעבר'
  const d = new Date()
  d.setDate(1); d.setMonth(d.getMonth() + offset)
  return `${HE_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function buildReport(txList, start, end) {
  const tx = txList.filter(t => t.timestamp >= start && t.timestamp < end)
  const chores   = tx.filter(t => t.type === 'chore').length
  const learning = tx.filter(t => t.type === 'learning').length
  const starsIn  = tx.filter(t => t.currency === 'stars'   && t.amount > 0 && !STAR_EXCLUDE.has(t.type)).reduce((s, t) => s + t.amount, 0)
  const starsOut = tx.filter(t => t.currency === 'stars'   && STAR_EXCLUDE.has(t.type)).reduce((s, t) => s + t.amount, 0)
  const shekelsIn  = tx.filter(t => t.currency === 'shekels' && t.amount > 0 && t.type !== 'expense').reduce((s, t) => s + t.amount, 0)
  const shekelsOut = tx.filter(t => t.currency === 'shekels' && (t.type === 'expense' || t.amount < 0)).reduce((s, t) => s + Math.abs(t.amount), 0)
  return { chores, learning, starsIn, starsOut, shekelsIn, shekelsOut }
}

function StatBox({ emoji, label, value, color }) {
  return (
    <div className={`rounded-2xl p-3 text-center ${color}`}>
      <p className="text-2xl font-black">{value || <span className="text-gray-300 text-base">—</span>}</p>
      <p className="text-xs font-semibold opacity-75 mt-0.5">{emoji} {label}</p>
    </div>
  )
}

function ChildCard({ child, r }) {
  const shekelNet = r.shekelsIn - r.shekelsOut
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Child header */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{child.avatar || '🦁'}</span>
          <span className="font-black text-gray-800">{child.name}</span>
        </div>
        <div className="flex gap-3 text-sm font-bold">
          <span className="text-amber-600">{child.starBalance}⭐</span>
          <span className="text-green-700">{child.shekelBalance}₪</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="p-3 grid grid-cols-4 gap-2">
        <StatBox emoji="✅" label="מטלות"  value={r.chores || 0}   color="bg-emerald-50 text-emerald-700" />
        <StatBox emoji="📚" label="לימוד"  value={r.learning || 0} color="bg-sky-50 text-sky-700" />
        <StatBox emoji="⭐" label="הרוויח" value={r.starsIn > 0 ? `+${r.starsIn}` : 0}  color="bg-amber-50 text-amber-600" />
        <StatBox emoji="⭐" label="הוציא"  value={r.starsOut > 0 ? `-${r.starsOut}` : 0} color="bg-red-50 text-red-500" />
      </div>

      {/* Shekel row */}
      <div className="px-4 pb-3 flex items-center justify-between text-sm">
        <span className="text-gray-500 font-semibold">שינוי בכסף</span>
        {shekelNet === 0
          ? <span className="text-gray-400">ללא שינוי</span>
          : <span className={`font-black text-base ${shekelNet > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {shekelNet > 0 ? '+' : ''}{shekelNet}₪
            </span>
        }
      </div>
    </div>
  )
}

const PERIODS = [
  { id: 'week',  label: 'שבוע' },
  { id: 'month', label: 'חודש' },
  { id: 'all',   label: 'הכל'  },
]

export default function WeeklyReportModal() {
  const { closeModal, children, getTransactions } = useApp()
  const [period, setPeriod] = useState('week')
  const [offset, setOffset] = useState(0)

  const { start, end } = getBounds(period, offset)
  const canGoForward = period !== 'all' && offset < 0

  const rows = children.map(child => ({
    child,
    ...buildReport(getTransactions(child.id), start, end),
  }))

  const totals = rows.reduce((acc, r) => ({
    chores:     acc.chores     + r.chores,
    learning:   acc.learning   + r.learning,
    starsIn:    acc.starsIn    + r.starsIn,
    starsOut:   acc.starsOut   + r.starsOut,
    shekelsIn:  acc.shekelsIn  + r.shekelsIn,
    shekelsOut: acc.shekelsOut + r.shekelsOut,
  }), { chores: 0, learning: 0, starsIn: 0, starsOut: 0, shekelsIn: 0, shekelsOut: 0 })

  function changePeriod(p) {
    setPeriod(p)
    setOffset(0)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 px-5 pt-10 pb-5 text-white text-center rounded-b-[2rem] shrink-0">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg"
        >×</button>
        <div className="text-3xl mb-1">📊</div>
        <h1 className="text-lg font-black">דוח פעילות</h1>

        {/* Period tabs */}
        <div className="flex justify-center gap-1 mt-3">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => changePeriod(p.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                period === p.id ? 'bg-white text-indigo-700 shadow' : 'bg-white/20 text-white'
              }`}
            >{p.label}</button>
          ))}
        </div>

        {/* Navigation (not shown for "all") */}
        {period !== 'all' && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <button
              onClick={() => setOffset(o => o - 1)}
              className="w-8 h-8 bg-white/20 rounded-full font-bold text-lg active:scale-90"
            >‹</button>
            <span className="font-bold text-white/90 min-w-[110px] text-center text-sm">
              {periodLabel(period, offset)}
            </span>
            <button
              onClick={() => setOffset(o => o + 1)}
              className={`w-8 h-8 bg-white/20 rounded-full font-bold text-lg active:scale-90 transition-opacity ${!canGoForward ? 'opacity-30 pointer-events-none' : ''}`}
            >›</button>
          </div>
        )}
        {period === 'all' && (
          <p className="text-white/70 text-sm mt-2">כל הזמנים</p>
        )}
      </div>

      {/* Summary bar */}
      <div className="px-4 pt-3 pb-1 grid grid-cols-4 gap-2 shrink-0">
        {[
          { v: totals.chores,   label: 'מטלות', color: 'bg-emerald-100 text-emerald-700' },
          { v: totals.learning, label: 'לימוד',  color: 'bg-sky-100 text-sky-700' },
          { v: totals.starsIn > 0 ? `+${totals.starsIn}⭐` : '—', label: 'הרוויחו', color: 'bg-amber-100 text-amber-600' },
          { v: totals.starsOut > 0 ? `-${totals.starsOut}⭐` : '—', label: 'הוציאו', color: 'bg-red-100 text-red-500' },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl py-2 text-center ${c.color}`}>
            <p className="font-black text-sm">{c.v || '—'}</p>
            <p className="text-xs opacity-70">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-6">
        {rows.length === 0
          ? <p className="text-center text-gray-400 mt-12">אין ילדים</p>
          : rows.map(r => <ChildCard key={r.child.id} child={r.child} r={r} />)
        }
      </div>
    </div>
  )
}
