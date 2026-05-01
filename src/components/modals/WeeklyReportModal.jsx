import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { formatNumber } from '../../lib/utils.js'

const STAR_EXCLUDE   = new Set(['convert_out', 'penalty', 'prize_redeem', 'savings_open'])
const SHEKEL_NEUTRAL = new Set(['money_transfer_in', 'money_transfer_out'])
const SHEKEL_OUT_TYPES = new Set(['expense', 'convert_out', 'prize_redeem', 'savings_open', 'wheel_spin', 'loan_repay'])
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
  const starsIn  = tx.filter(t => t.currency === 'stars' && t.amount > 0 && !STAR_EXCLUDE.has(t.type)).reduce((s, t) => s + t.amount, 0)
  const starsOut = tx.filter(t => t.currency === 'stars' && STAR_EXCLUDE.has(t.type)).reduce((s, t) => s + t.amount, 0)
  const shekelsIn  = tx.filter(t => t.currency === 'shekels' && t.amount > 0 && !SHEKEL_OUT_TYPES.has(t.type) && !SHEKEL_NEUTRAL.has(t.type)).reduce((s, t) => s + t.amount, 0)
  const shekelsOut = tx.filter(t => t.currency === 'shekels' && SHEKEL_OUT_TYPES.has(t.type) && !SHEKEL_NEUTRAL.has(t.type)).reduce((s, t) => s + Math.abs(t.amount), 0)
  return { chores, learning, starsIn, starsOut, shekelsIn, shekelsOut }
}

function Row({ label, value, valueClass = 'text-gray-800' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className={`text-sm font-black ${valueClass}`}>{value}</span>
    </div>
  )
}

function ChildCard({ child, r }) {
  const shekelNet = r.shekelsIn - r.shekelsOut
  const activeSavings = (child.savings || []).filter(s => s.status === 'active')
  const savingsTotal  = activeSavings.reduce((s, sv) => s + sv.amount, 0)
  const loansTotal    = (child.loans || []).filter(l => !l.repaid).reduce((s, l) => s + l.amount, 0)

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-sm ring-1 ring-white/60 overflow-hidden">
      {/* Child header — avatar + name */}
      <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50/70 border-b border-indigo-100/50">
        <span className="text-2xl">{child.avatar || '🦁'}</span>
        <span className="font-black text-gray-800 flex-1">{child.name}</span>
      </div>

      <div className="px-4 py-3 space-y-0.5">
        {/* Activity */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-emerald-50 rounded-xl py-2 text-center">
            <p className="text-xl font-black text-emerald-700">{r.chores}</p>
            <p className="text-[10px] font-semibold text-emerald-500 mt-0.5">✅ מטלות</p>
          </div>
          <div className="flex-1 bg-sky-50 rounded-xl py-2 text-center">
            <p className="text-xl font-black text-sky-700">{r.learning}</p>
            <p className="text-[10px] font-semibold text-sky-500 mt-0.5">📚 לימוד</p>
          </div>
          <div className="flex-1 bg-amber-50 rounded-xl py-2 text-center">
            <p className="text-xl font-black text-amber-600">{r.starsIn > 0 ? `+${r.starsIn}` : '—'}</p>
            <p className="text-[10px] font-semibold text-amber-400 mt-0.5">⭐ הרוויח</p>
          </div>
          <div className="flex-1 bg-red-50 rounded-xl py-2 text-center">
            <p className="text-xl font-black text-red-500">{r.starsOut > 0 ? `-${r.starsOut}` : '—'}</p>
            <p className="text-[10px] font-semibold text-red-400 mt-0.5">⭐ הוציא</p>
          </div>
        </div>

        {/* Money flows */}
        <Row label="💵 כסף נכנס"
             value={r.shekelsIn > 0 ? `+${formatNumber(r.shekelsIn)}₪` : '—'}
             valueClass={r.shekelsIn > 0 ? 'text-emerald-600' : 'text-gray-300'} />
        <Row label="🛍️ כסף יצא"
             value={r.shekelsOut > 0 ? `-${formatNumber(r.shekelsOut)}₪` : '—'}
             valueClass={r.shekelsOut > 0 ? 'text-rose-500' : 'text-gray-300'} />
        <Row label="📊 נטו כסף"
             value={shekelNet === 0 ? 'ללא שינוי' : `${shekelNet > 0 ? '+' : ''}${formatNumber(shekelNet)}₪`}
             valueClass={shekelNet > 0 ? 'text-emerald-600 font-black' : shekelNet < 0 ? 'text-rose-500 font-black' : 'text-gray-400'} />

        {/* Current balances */}
        <div className="pt-2 mt-1 border-t border-gray-100 space-y-0.5">
          <Row label="⭐ מאזן כוכבים" value={`${formatNumber(child.starBalance)}⭐`} valueClass="text-amber-600" />
          <Row label="💵 מאזן כסף" value={`${formatNumber(child.shekelBalance)}₪`} valueClass="text-emerald-700" />
          {savingsTotal > 0 && (
            <Row label="🏦 בחסכון" value={`${formatNumber(savingsTotal)}₪`} valueClass="text-blue-600" />
          )}
          {loansTotal > 0 && (
            <Row label="💳 הלוואות פתוחות" value={`${formatNumber(loansTotal)}₪`} valueClass="text-cyan-600" />
          )}
        </div>
      </div>
    </div>
  )
}

function TotalsCard({ totals, children }) {
  const totalStars   = children.reduce((s, c) => s + c.starBalance, 0)
  const totalShekels = children.reduce((s, c) => s + c.shekelBalance, 0)
  const totalSavings = children.reduce((s, c) => s + (c.savings || []).filter(sv => sv.status === 'active').reduce((a, sv) => a + sv.amount, 0), 0)
  const shekelNet = totals.shekelsIn - totals.shekelsOut

  return (
    <div className="bg-gradient-to-br from-indigo-50/80 to-violet-50/80 backdrop-blur-sm rounded-3xl shadow-sm ring-1 ring-indigo-100/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-indigo-100/50">
        <p className="font-black text-indigo-700 text-sm">📋 סיכום כולל</p>
      </div>
      <div className="px-4 py-3 space-y-0.5">
        <Row label="✅ סה״כ מטלות"   value={totals.chores}   valueClass="text-emerald-700" />
        <Row label="📚 סה״כ לימוד"   value={totals.learning}  valueClass="text-sky-700" />
        <Row label="⭐ כוכבים הרוויחו" value={totals.starsIn > 0 ? `+${formatNumber(totals.starsIn)}` : '—'} valueClass="text-amber-600" />
        <Row label="⭐ כוכבים הוציאו" value={totals.starsOut > 0 ? `-${formatNumber(totals.starsOut)}` : '—'} valueClass="text-rose-500" />
        <Row label="💵 כסף נכנס"      value={totals.shekelsIn > 0 ? `+${formatNumber(totals.shekelsIn)}₪` : '—'} valueClass="text-emerald-600" />
        <Row label="🛍️ כסף יצא"       value={totals.shekelsOut > 0 ? `-${formatNumber(totals.shekelsOut)}₪` : '—'} valueClass="text-rose-500" />
        <Row label="📊 נטו כסף"        value={shekelNet === 0 ? 'ללא שינוי' : `${shekelNet > 0 ? '+' : ''}${formatNumber(shekelNet)}₪`}
             valueClass={shekelNet > 0 ? 'text-emerald-600' : shekelNet < 0 ? 'text-rose-500' : 'text-gray-400'} />

        <div className="pt-2 mt-1 border-t border-indigo-100 space-y-0.5">
          <Row label="⭐ סה״כ כוכבים (כולם)" value={`${formatNumber(totalStars)}⭐`} valueClass="text-amber-600" />
          <Row label="💵 סה״כ כסף (כולם)"   value={`${formatNumber(totalShekels)}₪`} valueClass="text-emerald-700" />
          {totalSavings > 0 && (
            <Row label="🏦 סה״כ בחסכון"     value={`${formatNumber(totalSavings)}₪`} valueClass="text-blue-600" />
          )}
        </div>
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
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
         style={{ background: 'linear-gradient(180deg, #ede9fe 0%, #dbeafe 100%)' }}>
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 px-5 pt-10 pb-5 text-white text-center rounded-b-[2rem] shrink-0 shadow-lg">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg active:scale-90"
        >×</button>
        <div className="text-3xl mb-1">📊</div>
        <h1 className="text-lg font-black">דוח פעילות</h1>

        {/* Period tabs */}
        <div className="flex justify-center gap-1 mt-3">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => changePeriod(p.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all active:scale-95 ${
                period === p.id ? 'bg-white text-indigo-700 shadow' : 'bg-white/20 text-white'
              }`}
            >{p.label}</button>
          ))}
        </div>

        {/* Navigation */}
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

      {/* Cards + totals at bottom */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-8">
        {rows.length === 0
          ? <p className="text-center text-gray-400 mt-12">אין ילדים</p>
          : <>
              {rows.map(r => <ChildCard key={r.child.id} child={r.child} r={r} />)}
              {rows.length > 1 && <TotalsCard totals={totals} children={children} />}
            </>
        }
      </div>
    </div>
  )
}
