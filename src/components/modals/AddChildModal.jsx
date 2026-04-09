import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { AVATAR_EMOJIS } from '../../lib/defaults.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import EmojiPicker from '../ui/EmojiPicker.jsx'

export default function AddChildModal() {
  const { closeModal, addChild, navigate } = useApp()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🦁')
  const [exchangeRate, setExchangeRate] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const child = addChild({
      name: name.trim(),
      avatar,
      exchangeRate: exchangeRate || null,
    })
    closeModal()
    navigate('dashboard', child.id)
  }

  return (
    <Modal title="👶 הוסף ילד" onClose={closeModal}>
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
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            שם הילד
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="יוסי"
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-indigo-400 focus:outline-none"
            required
            autoFocus
          />
        </div>

        {/* Per-child exchange rate */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            שער המרה אישי (₪ לכוכב) — אופציונלי
          </label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            placeholder="כברירת מחדל"
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-indigo-400 focus:outline-none"
            dir="ltr"
          />
          <p className="text-xs text-gray-400 mt-1">
            אם לא מוגדר, יופעל שיעור גלובלי
          </p>
        </div>

        <Button type="submit" fullWidth size="lg" disabled={!name.trim()}>
          ✅ הוסף {avatar}
        </Button>
      </form>
    </Modal>
  )
}
