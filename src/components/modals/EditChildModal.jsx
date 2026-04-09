import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { AVATAR_EMOJIS } from '../../lib/defaults.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import EmojiPicker from '../ui/EmojiPicker.jsx'

export default function EditChildModal() {
  const { closeModal, modalData, updateChild, deleteChild, navigate } = useApp()
  const child = modalData

  const [name, setName] = useState(child?.name || '')
  const [avatar, setAvatar] = useState(child?.avatar || '🦁')
  const [exchangeRate, setExchangeRate] = useState(
    child?.exchangeRate != null ? String(child.exchangeRate) : ''
  )
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!child) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    updateChild(child.id, {
      name: name.trim(),
      avatar,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
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
                <Button
                  variant="danger"
                  fullWidth
                  onClick={handleDelete}
                  type="button"
                >
                  כן, מחק
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setConfirmDelete(false)}
                  type="button"
                >
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
