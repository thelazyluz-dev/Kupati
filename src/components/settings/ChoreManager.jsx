import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Button from '../ui/Button.jsx'

function ChoreRow({ chore, onSave, onDelete, onMoveUp, onMoveDown }) {
  const [editing, setEditing] = useState(false)
  const [name, setName]   = useState(chore.name)
  const [stars, setStars] = useState(String(chore.defaultStars))

  if (editing) {
    return (
      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3 my-1 space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={stars}
            onChange={(e) => setStars(e.target.value)}
            className="w-20 rounded-xl border-2 border-gray-200 px-2 py-2 text-sm focus:border-indigo-400 focus:outline-none text-center"
            dir="ltr"
          />
          <span className="text-sm text-gray-500">⭐</span>
          <Button
            size="sm"
            fullWidth
            onClick={() => { onSave(chore.id, { name: name.trim() || chore.name, defaultStars: parseFloat(stars) || 1 }); setEditing(false) }}
          >
            ✓ שמור
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { setName(chore.name); setStars(String(chore.defaultStars)); setEditing(false) }}>
            ✕
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0">
      {/* Reorder */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={!onMoveUp}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-xs text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 disabled:opacity-20 transition-colors"
        >▲</button>
        <button
          onClick={onMoveDown}
          disabled={!onMoveDown}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-xs text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 disabled:opacity-20 transition-colors"
        >▼</button>
      </div>

      <span className="text-amber-500 font-bold text-sm w-10 text-center" dir="ltr">
        {chore.defaultStars}⭐
      </span>
      <span className="flex-1 font-medium text-gray-800 text-sm">{chore.name}</span>

      <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-indigo-500 transition-colors px-1">✏️</button>
      <button onClick={() => onDelete(chore.id)} className="text-gray-400 hover:text-red-500 transition-colors px-1">🗑️</button>
    </div>
  )
}

export default function ChoreManager() {
  const { chores, addChore, updateChore, deleteChore, reorderChores } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName]   = useState('')
  const [newStars, setNewStars] = useState('2')

  function handleAdd() {
    if (!newName.trim()) return
    addChore({ name: newName.trim(), defaultStars: parseFloat(newStars) || 1 })
    setNewName('')
    setNewStars('2')
    setShowAdd(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-700">📋 רשימת מטלות</h3>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? '✕' : '+ הוסף'}
        </Button>
      </div>

      {showAdd && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3 mb-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="שם המטלה"
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={newStars}
              onChange={(e) => setNewStars(e.target.value)}
              className="w-20 rounded-xl border-2 border-gray-200 px-2 py-2 text-sm focus:border-indigo-400 focus:outline-none text-center"
              dir="ltr"
            />
            <span className="text-sm text-gray-500">⭐</span>
            <Button size="sm" fullWidth onClick={handleAdd} disabled={!newName.trim()}>
              הוסף
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden px-3">
        {chores.map((chore, i) => (
          <ChoreRow
            key={chore.id}
            chore={chore}
            onSave={(id, updates) => updateChore(id, updates)}
            onDelete={(id) => deleteChore(id)}
            onMoveUp={i > 0 ? () => reorderChores(i, i - 1) : null}
            onMoveDown={i < chores.length - 1 ? () => reorderChores(i, i + 1) : null}
          />
        ))}
        {chores.length === 0 && (
          <p className="text-center text-gray-400 py-6 text-sm">אין מטלות — לחץ הוסף</p>
        )}
      </div>
    </div>
  )
}
