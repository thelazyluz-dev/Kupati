import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Button from '../ui/Button.jsx'

function ChoreRow({ chore, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(chore.name)
  const [stars, setStars] = useState(String(chore.defaultStars))

  if (editing) {
    return (
      <div className="flex gap-2 items-center py-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
        <input
          type="number"
          min="0.5"
          step="0.5"
          value={stars}
          onChange={(e) => setStars(e.target.value)}
          className="w-16 rounded-xl border-2 border-gray-200 px-2 py-2 text-sm focus:border-indigo-400 focus:outline-none text-center"
          dir="ltr"
        />
        <Button
          size="sm"
          onClick={() => {
            onSave(chore.id, { name, defaultStars: parseFloat(stars) || 1 })
            setEditing(false)
          }}
        >
          ✓
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
          ✕
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className="text-amber-500 font-bold text-sm" dir="ltr">
        {chore.defaultStars}⭐
      </span>
      <span className="flex-1 font-medium text-gray-800 text-sm">{chore.name}</span>
      <button
        onClick={() => setEditing(true)}
        className="text-gray-400 hover:text-indigo-500 transition-colors text-lg"
      >
        ✏️
      </button>
      <button
        onClick={() => onDelete(chore.id)}
        className="text-gray-400 hover:text-red-500 transition-colors text-lg"
      >
        🗑️
      </button>
    </div>
  )
}

export default function ChoreManager() {
  const { chores, addChore, updateChore, deleteChore } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
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
        <div className="bg-indigo-50 rounded-2xl p-3 mb-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="שם המטלה"
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            autoFocus
          />
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600 shrink-0">כוכבים:</span>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={newStars}
              onChange={(e) => setNewStars(e.target.value)}
              className="w-20 rounded-xl border-2 border-gray-200 px-2 py-2 text-sm focus:border-indigo-400 focus:outline-none text-center"
              dir="ltr"
            />
            <Button size="sm" fullWidth onClick={handleAdd} disabled={!newName.trim()}>
              הוסף
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden px-3">
        {chores.map((chore) => (
          <ChoreRow
            key={chore.id}
            chore={chore}
            onSave={(id, updates) => updateChore(id, updates)}
            onDelete={(id) => deleteChore(id)}
          />
        ))}
        {chores.length === 0 && (
          <p className="text-center text-gray-400 py-6 text-sm">
            אין מטלות — לחץ הוסף
          </p>
        )}
      </div>
    </div>
  )
}
