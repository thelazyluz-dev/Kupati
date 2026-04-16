import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

const MAX = 120

export default function ParentNoteModal() {
  const { closeModal, modalData, updateChild } = useApp()
  const { childId, child } = modalData || {}
  const [text, setText] = useState(child?.parentNote || '')

  function handleSave() {
    updateChild(childId, { parentNote: text.trim() || null })
    closeModal()
  }

  function handleClear() {
    updateChild(childId, { parentNote: null })
    closeModal()
  }

  return (
    <Modal title="💌 הודעה לילד" onClose={closeModal} headerColor="from-pink-400 to-rose-500">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 text-center">
          ההודעה תוצג בדשבורד של <strong>{child?.name}</strong> עד שתמחק אותה
        </p>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            placeholder="כתוב הודעה אישית... ❤️"
            rows={4}
            autoFocus
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-pink-400 focus:outline-none resize-none"
            dir="rtl"
          />
          <span className="absolute bottom-3 left-3 text-xs text-gray-300">
            {text.length}/{MAX}
          </span>
        </div>

        <Button fullWidth size="lg" onClick={handleSave} disabled={!text.trim() && !child?.parentNote}>
          💾 שמור הודעה
        </Button>

        {child?.parentNote && (
          <Button
            variant="ghost"
            fullWidth
            onClick={handleClear}
            className="text-red-400 border-red-200 hover:bg-red-50"
          >
            🗑️ מחק הודעה
          </Button>
        )}
      </div>
    </Modal>
  )
}
