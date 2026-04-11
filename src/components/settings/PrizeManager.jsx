import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { DEFAULT_PRIZES } from '../../lib/defaults.js'
import { generateId } from '../../lib/utils.js'
import Button from '../ui/Button.jsx'

const PRIZE_EMOJIS = ['🍭','🍦','🍫','🎮','📱','🚴','🎬','⚽','🛹','🎸','✈️','🏖️','🎨','📚','🎁','🌈','🎠','🚗','🎯','🎤']

export default function PrizeManager() {
  const { settings, updateSettings } = useApp()
  const prizes = settings.prizes?.length ? settings.prizes : DEFAULT_PRIZES

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

  function movePrize(idx, dir) {
    const next = [...prizes]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    savePrizes(next)
  }

  const isEditing = editId !== null

  return (
    <div className="space-y-3">
      {/* Prize list */}
      {prizes.map((prize, i) => (
        <div key={prize.id}>
          {editId === prize.id ? (
            <PrizeForm form={form} onChange={setForm} onSave={submitForm} onCancel={cancelEdit} emojis={PRIZE_EMOJIS} />
          ) : (
            <div className="flex items-center gap-2 bg-purple-50 rounded-2xl px-3 py-3">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => movePrize(i, -1)} disabled={i === 0}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-xs text-gray-400 hover:text-purple-500 hover:bg-purple-100 disabled:opacity-20 transition-colors">▲</button>
                <button type="button" onClick={() => movePrize(i, 1)} disabled={i === prizes.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-xs text-gray-400 hover:text-purple-500 hover:bg-purple-100 disabled:opacity-20 transition-colors">▼</button>
              </div>
              <span className="text-2xl">{prize.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{prize.name}</p>
                <p className="text-xs text-purple-600 font-bold">{prize.starCost}⭐</p>
              </div>
              <button type="button" onClick={() => startEdit(prize)}
                className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1 active:scale-90">✏️</button>
              <button type="button" onClick={() => deletePrize(prize.id)}
                className="text-gray-400 hover:text-red-500 text-sm px-2 py-1 active:scale-90">🗑️</button>
            </div>
          )}
        </div>
      ))}

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
    <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-3 space-y-3">
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
