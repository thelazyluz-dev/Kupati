import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { AVATAR_EMOJIS } from '../../lib/defaults.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import EmojiPicker from '../ui/EmojiPicker.jsx'

const MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר',
]

function BirthdayPicker({ value, onChange }) {
  // value is "MM-DD" or ''
  const [month, day] = value ? value.split('-').map(Number) : [0, 0]

  function handleMonth(m) {
    const d = day || 1
    onChange(m ? `${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '')
  }
  function handleDay(d) {
    const m = month || 1
    onChange(d ? `${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '')
  }

  const daysInMonth = month ? new Date(2000, month, 0).getDate() : 31

  return (
    <div className="flex gap-2" dir="rtl">
      <select
        value={month || ''}
        onChange={(e) => handleMonth(Number(e.target.value))}
        className="flex-1 rounded-2xl border-2 border-gray-200 px-3 py-3 focus:border-indigo-400 focus:outline-none text-sm"
      >
        <option value="">-- חודש --</option>
        {MONTHS.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={day || ''}
        onChange={(e) => handleDay(Number(e.target.value))}
        className="w-24 rounded-2xl border-2 border-gray-200 px-3 py-3 focus:border-indigo-400 focus:outline-none text-sm"
        disabled={!month}
      >
        <option value="">-- יום --</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  )
}

export default function EditChildModal() {
  const { closeModal, modalData, updateChild, deleteChild, navigate } = useApp()
  const child = modalData

  const [name, setName] = useState(child?.name || '')
  const [avatar, setAvatar] = useState(child?.avatar || '🦁')
  const [exchangeRate, setExchangeRate] = useState(
    child?.exchangeRate != null ? String(child.exchangeRate) : ''
  )
  // birthday stored as "MM-DD", e.g. "03-15"
  const [birthday, setBirthday] = useState(child?.birthday || '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!child) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    updateChild(child.id, {
      name: name.trim(),
      avatar,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
      birthday: birthday || null,
    })
    closeModal()
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteChild(child.id)
    closeModal()
    navigate('home')
  }

  return (
    <Modal title={`✏️ ערוך — ${child.name}`} onClose={closeModal}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Avatar picker */}
        <EmojiPicker
          label="בחר אווטאר"
          options={AVATAR_EMOJIS}
          value={avatar}
          onChange={setAvatar}
        />

        {/* Name */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">שם</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-indigo-400 focus:outline-none"
            required
          />
        </div>

        {/* Birthday — two selects: month + day */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            🎂 יום הולדת (אופציונלי)
          </label>
          <BirthdayPicker value={birthday} onChange={setBirthday} />
          <p className="text-xs text-gray-400 mt-1 text-center">
            מציג ספירה לאחור על הכרטיס וה-Dashboard
          </p>
        </div>

        {/* Exchange rate */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            שער המרה אישי (₪ לכוכב)
          </label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            placeholder="כברירת מחדל גלובלית"
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-indigo-400 focus:outline-none"
            dir="ltr"
          />
        </div>

        <Button type="submit" fullWidth size="lg" disabled={!name.trim()}>
          💾 שמור שינויים
        </Button>

        {/* Delete */}
        <div className="pt-2 border-t border-gray-100">
          {confirmDelete ? (
            <div className="space-y-2">
              <p className="text-sm text-red-600 font-semibold text-center">
                בטוח? פעולה זו אינה הפיכה!
              </p>
              <div className="flex gap-2">
                <Button variant="danger" fullWidth onClick={handleDelete} type="button">
                  כן, מחק
                </Button>
                <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(false)} type="button">
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              fullWidth
              onClick={handleDelete}
              type="button"
              className="text-red-500 border-red-200 hover:bg-red-50"
            >
              🗑️ מחק ילד
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
