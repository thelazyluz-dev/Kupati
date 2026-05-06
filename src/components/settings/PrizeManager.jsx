import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { DEFAULT_PRIZES } from '../../lib/defaults.js'
import { generateId } from '../../lib/utils.js'
import Button from '../ui/Button.jsx'
import SortableList from '../ui/SortableList.jsx'

const PRIZE_EMOJIS = [
  // אוכל ומשקאות
  '🍭','🍦','🍫','🍕','🍔','🌮','🍩','🧁','🍰','🎂','🍿','🧃','🍓','🍉','🥤',
  // בידור וצעצועים
  '🎮','🕹️','🎲','🧩','🪀','🎯','🎪','🎠','🎡','🎢','🃏','🪁','🤿','🛷',
  // ספורט
  '⚽','🏀','🎾','🏓','⛸️','🚴','🛹','🛼','🏊','🤸','⛷️','🎿','🥊','🏄',
  // בגדים ואביזרים
  '👟','👗','🕶️','🎒','👑','💍','⌚','🎩','🛍️',
  // טכנולוגיה
  '📱','💻','🎧','📷','🎙️','🖥️',
  // חוויות ויציאות
  '✈️','🏖️','🎬','🎭','🎤','🎸','🎺','🎻','🎹','🏕️','🌍','🗺️',
  // טבע וחיות
  '🐶','🐱','🐠','🐇','🦜','🌸','🌈','⭐','🌙','🦋',
  // שונות
  '📚','🎨','🖌️','✏️','🔭','🔬','🏆','🥇','🎁','💎','🪄','🎀',
]

export default function PrizeManager() {
  const { settings, updateSettings, children, getTransactions } = useApp()
  const prizes = settings.prizes?.length ? settings.prizes : DEFAULT_PRIZES

  // Count total redemptions per prize across all children
  const allTx = (children || []).flatMap((c) => getTransactions(c.id))
  function redemptionCount(prize) {
    return allTx.filter((tx) => tx.type === 'prize_redeem' && tx.description?.includes(prize.name)).length
  }

  const [editId, setEditId] = useState(null)   // null = not editing, 'new' = new prize
  const [form, setForm] = useState({ emoji: '🎁', name: '', starCost: '' })

  function savePrizes(next) {
    updateSettings({ prizes: next })
  }

  function startAdd() {
    setEditId('new')
    setForm({ emoji: '🎁', name: '', starCost: '' })
  }

  function startEdit(prize) {
    setEditId(prize.id)
    setForm({ emoji: prize.emoji, name: prize.name, starCost: String(prize.starCost) })
  }

  function cancelEdit() {
    setEditId(null)
  }

  function submitForm() {
    if (!form.name.trim() || !parseInt(form.starCost)) return
    const cost = Math.max(1, parseInt(form.starCost))
    if (editId === 'new') {
      savePrizes([...prizes, { id: generateId(), emoji: form.emoji, name: form.name.trim(), starCost: cost }])
    } else {
      savePrizes(prizes.map((p) => p.id === editId ? { ...p, emoji: form.emoji, name: form.name.trim(), starCost: cost } : p))
    }
    setEditId(null)
  }

  function deletePrize(id) {
    savePrizes(prizes.filter((p) => p.id !== id))
  }

  const isEditing = editId !== null

  return (
    <div className="space-y-3">
      {/* Prize list */}
      <SortableList
        items={prizes}
        onReorder={(from, to) => {
          const next = [...prizes]
          const [item] = next.splice(from, 1)
          next.splice(to, 0, item)
          savePrizes(next)
        }}
        keyExtractor={(p) => p.id}
        renderItem={(prize, idx, dragHandle) => (
          editId === prize.id ? (
            <PrizeForm form={form} onChange={setForm} onSave={submitForm} onCancel={cancelEdit} emojis={PRIZE_EMOJIS} />
          ) : (
            <div
              className="flex items-center gap-2 rounded-2xl px-3 py-3 mb-1.5"
              style={{
                background: 'rgba(245,243,255,0.9)',
                border: '1.5px solid rgba(139,92,246,0.2)',
                boxShadow: '0 3px 10px rgba(139,92,246,0.1), inset 0 1px 1px rgba(255,255,255,0.9)',
              }}
            >
              <span className="text-2xl">{prize.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{prize.name}</p>
                <p className="text-xs font-bold" style={{ color: '#7c3aed' }}>{prize.starCost}⭐</p>
              </div>
              {(() => {
                const count = redemptionCount(prize)
                return count > 0 ? (
                  <span
                    className="text-xs font-black rounded-full px-2 py-0.5 leading-none flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.15)', color: '#6d28d9' }}
                    title="פעמים שמומש"
                  >
                    ×{count}
                  </span>
                ) : null
              })()}
              <button type="button" onClick={() => startEdit(prize)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-500 text-sm active:scale-90 transition-colors"
                style={{ background: 'rgba(243,244,246,0.8)' }}>✏️</button>
              <button type="button" onClick={() => deletePrize(prize.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 text-sm active:scale-90 transition-colors"
                style={{ background: 'rgba(243,244,246,0.8)' }}>🗑️</button>
              {dragHandle}
            </div>
          )
        )}
      />

      {/* Add new */}
      {editId === 'new' ? (
        <PrizeForm form={form} onChange={setForm} onSave={submitForm} onCancel={cancelEdit} emojis={PRIZE_EMOJIS} />
      ) : !isEditing && (
        <Button variant="ghost" fullWidth onClick={startAdd} className="border-dashed">
          + הוסף פרס
        </Button>
      )}
    </div>
  )
}

function PrizeForm({ form, onChange, onSave, onCancel, emojis }) {
  return (
    <div className="rounded-2xl p-3 space-y-3 mb-1.5"
      style={{ background: 'rgba(245,243,255,0.95)', border: '1.5px solid rgba(139,92,246,0.25)', boxShadow: '0 4px 14px rgba(139,92,246,0.12), inset 0 1px 1px rgba(255,255,255,0.9)' }}>
      {/* Emoji picker */}
      <div className="flex flex-wrap gap-1.5">
        {emojis.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange((f) => ({ ...f, emoji: e }))}
            className={`text-xl w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
              form.emoji === e ? 'bg-purple-400 shadow-sm scale-110' : 'bg-white hover:bg-purple-100'
            }`}
          >{e}</button>
        ))}
      </div>
      <input
        type="text"
        value={form.name}
        onChange={(e) => onChange((f) => ({ ...f, name: e.target.value }))}
        placeholder="שם הפרס"
        className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          value={form.starCost}
          onChange={(e) => onChange((f) => ({ ...f, starCost: e.target.value }))}
          placeholder="כמה כוכבים?"
          className="flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
          dir="ltr"
        />
        <span className="text-xl">⭐</span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="primary"
          fullWidth
          onClick={onSave}
          disabled={!form.name.trim() || !parseInt(form.starCost)}
        >שמור</Button>
        <Button variant="secondary" fullWidth onClick={onCancel}>ביטול</Button>
      </div>
    </div>
  )
}
