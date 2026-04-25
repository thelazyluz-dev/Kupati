import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'

const CARD_COLORS = [
  'bg-amber-50 border-amber-200',
  'bg-rose-50 border-rose-200',
  'bg-violet-50 border-violet-200',
  'bg-emerald-50 border-emerald-200',
  'bg-sky-50 border-sky-200',
  'bg-orange-50 border-orange-200',
]

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

function formatDate(dateStr) {
  const today     = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (dateStr === today)     return 'היום'
  if (dateStr === yesterday) return 'אתמול'
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ב${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function MemoriesModal() {
  const { children, closeModal, modalData, addMemory, deleteMemory } = useApp()
  const { childId } = modalData || {}
  const child    = children.find((c) => c.id === childId)
  const memories = [...(child?.memories || [])].sort((a, b) => b.timestamp - a.timestamp)

  const todayStr = new Date().toISOString().slice(0, 10)
  const [text, setText] = useState('')
  const [date, setDate] = useState(todayStr)
  const [confirmDelete, setConfirmDelete] = useState(null)

  function handleSave() {
    const trimmed = text.trim()
    if (!trimmed) return
    addMemory(childId, { text: trimmed, date })
    setText('')
    setDate(todayStr)
  }

  function handleDelete(id) {
    if (confirmDelete === id) {
      deleteMemory(childId, id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
    }
  }

  if (!child) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: '#fffbf0' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-amber-100 flex-shrink-0 bg-white shadow-sm">
        <div className="w-10" />
        <div className="text-center">
          <h1 className="text-base font-black text-gray-800">📖 זכרונות</h1>
          <p className="text-xs text-gray-400 font-semibold">{child.name}</p>
        </div>
        <button
          onClick={closeModal}
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold active:scale-90 transition-all leading-none text-gray-500"
          aria-label="סגור"
        >×</button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Add form */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-4 space-y-3">
          <p className="text-xs font-bold text-amber-600 tracking-wider">✨ הוסף זכרון חדש</p>
          <textarea
            className="w-full resize-none rounded-xl border border-gray-200 bg-amber-50/60 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 leading-relaxed"
            rows={3}
            placeholder={`כתוב כאן מה קרה עם ${child.name}...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              max={todayStr}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              onClick={handleSave}
              disabled={!text.trim()}
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 transition-all text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              שמור
            </button>
          </div>
        </div>

        {/* Count chip */}
        {memories.length > 0 && (
          <p className="text-xs font-semibold text-gray-400 text-center">
            {memories.length} {memories.length === 1 ? 'זכרון' : 'זכרונות'} שמורים
          </p>
        )}

        {/* Memories list */}
        {memories.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-7xl mb-4">📸</div>
            <p className="text-gray-500 font-bold text-lg">עוד אין זכרונות</p>
            <p className="text-gray-400 text-sm mt-1">כתוב את הראשון למעלה!</p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {memories.map((m, i) => (
              <div
                key={m.id}
                className={`rounded-2xl border p-4 flex gap-3 transition-all ${CARD_COLORS[i % CARD_COLORS.length]}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    📅 {formatDate(m.date)}
                  </p>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{m.text}</p>
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className={`flex-shrink-0 text-sm leading-none mt-0.5 px-2 py-1 rounded-lg transition-all active:scale-90 ${
                    confirmDelete === m.id
                      ? 'bg-red-500 text-white font-bold text-xs'
                      : 'text-gray-300 hover:text-red-400'
                  }`}
                  aria-label="מחק"
                >
                  {confirmDelete === m.id ? 'מחק?' : '🗑️'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
