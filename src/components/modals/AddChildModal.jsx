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

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const child = addChild({
      name: name.trim(),
      avatar,
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

<Button type="submit" fullWidth size="lg" disabled={!name.trim()}>
          ✅ הוסף {avatar}
        </Button>
      </form>
    </Modal>
  )
}
