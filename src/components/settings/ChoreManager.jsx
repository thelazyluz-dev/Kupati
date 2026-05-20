import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Button from '../ui/Button.jsx'
import SortableList from '../ui/SortableList.jsx'
import { CHORE_EMOJIS } from '../../lib/defaults.js'

const CLAY_CARD = {
  background: 'rgba(238,242,255,0.9)',
  border: '1.5px solid rgba(99,102,241,0.2)',
  boxShadow: '0 4px 14px rgba(99,102,241,0.1), inset 0 1px 1px rgba(255,255,255,0.9)',
}

function ChoreRow({ chore, onSave, onDelete, dragHandle }) {
  const [editing, setEditing] = useState(false)
  const [emoji, setEmoji]   = useState(chore.emoji || '⭐')
  const [name, setName]     = useState(chore.name)
  const [stars, setStars]   = useState(String(chore.defaultStars))

  if (editing) {
    return (
      <div className="rounded-2xl p-3 my-1 space-y-2" style={CLAY_CARD}>
        <div className="flex flex-wrap gap-1">
          {CHORE_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`text-lg w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                emoji === e ? 'bg-indigo-400 shadow-sm scale-110' : 'bg-white hover:bg-indigo-100'
              }`}
            >{e}</button>
          ))}
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border-2 border-indigo-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={stars}
            onChange={(e) => setStars(e.target.value)}
            className="w-20 rounded-xl border-2 border-indigo-200 px-2 py-2 text-sm focus:border-indigo-400 focus:outline-none text-center"
            dir="ltr"
          />
          <span className="text-sm text-gray-500">⭐</span>
          <Button
            size="sm"
            fullWidth
            onClick={() => {
              onSave(chore.id, { emoji, name: name.trim() || chore.name, defaultStars: parseFloat(stars) || 1 })
              setEditing(false)
            }}
          >
            ✓ שמור
          </Button>
          <Button size="sm" variant="secondary" onClick={() => {
            setEmoji(chore.emoji || '⭐'); setName(chore.name); setStars(String(chore.defaultStars)); setEditing(false)
          }}>
            ✕
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 py-2.5"
      style={{ borderBottom: '1px solid rgba(229,231,235,0.5)' }}
    >
      <span className="text-xl w-7 text-center flex-shrink-0">{chore.emoji || '⭐'}</span>
      <span
        className="font-black text-sm w-8 text-center flex-shrink-0 rounded-full px-1 py-0.5"
        style={{ color: '#d97706', background: 'rgba(251,191,36,0.15)' }}
        dir="ltr"
      >
        {chore.defaultStars}⭐
      </span>
      <span className="flex-1 font-medium text-gray-800 text-sm">{chore.name}</span>
      <button
        onClick={() => setEditing(true)}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-500 transition-colors active:scale-90 text-sm"
        style={{ background: 'rgba(243,244,246,0.8)' }}
      >✏️</button>
      <button
        onClick={() => onDelete(chore.id)}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 transition-colors active:scale-90 text-sm"
        style={{ background: 'rgba(243,244,246,0.8)' }}
      >🗑️</button>
      {dragHandle}
    </div>
  )
}

export default function ChoreManager({ hideTitle = false }) {
  const { chores, addChore, updateChore, deleteChore, reorderChores } = useApp()
  const [showAdd, setShowAdd]   = useState(false)
  const [newEmoji, setNewEmoji] = useState('🧹')
  const [newName, setNewName]   = useState('')
  const [newStars, setNewStars] = useState('2')

  function handleAdd() {
    if (!newName.trim()) return
    addChore({ emoji: newEmoji, name: newName.trim(), defaultStars: parseFloat(newStars) || 1 })
    setNewEmoji('🧹')
    setNewName('')
    setNewStars('2')
    setShowAdd(false)
  }

  return (
    <div>
      <div className={`flex items-center justify-between mb-3 ${hideTitle ? 'justify-end' : ''}`}>
        {!hideTitle && <h3 className="font-bold text-gray-700">📋 רשימת מטלות</h3>}
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? '✕' : '+ הוסף'}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-2xl p-3 mb-3 space-y-2" style={CLAY_CARD}>
          <div className="flex flex-wrap gap-1">
            {CHORE_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setNewEmoji(e)}
                className={`text-lg w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                  newEmoji === e ? 'bg-indigo-400 shadow-sm scale-110' : 'bg-white hover:bg-indigo-100'
                }`}
              >{e}</button>
            ))}
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="שם המטלה"
            className="w-full rounded-xl border-2 border-indigo-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
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
              className="w-20 rounded-xl border-2 border-indigo-200 px-2 py-2 text-sm focus:border-indigo-400 focus:outline-none text-center"
              dir="ltr"
            />
            <span className="text-sm text-gray-500">⭐</span>
            <Button size="sm" fullWidth onClick={handleAdd} disabled={!newName.trim()}>
              הוסף
            </Button>
          </div>
        </div>
      )}

      <div
        className="rounded-[22px] overflow-hidden px-3"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(255,255,255,0.75)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,0.95)',
        }}
      >
        {chores.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="text-5xl mb-1">📋</div>
            <p className="font-bold text-gray-700 text-sm">עוד לא הוספת מטלות</p>
            <p className="text-xs text-gray-400 leading-relaxed max-w-[200px]">
              הוסף מטלות — הילדים יוכלו לסמן ולהרוויח כוכבים
            </p>
          </div>
        ) : (
          <SortableList
            items={chores}
            onReorder={(from, to) => reorderChores(from, to)}
            keyExtractor={(c) => c.id}
            renderItem={(chore, idx, dragHandle) => (
              <ChoreRow
                chore={chore}
                dragHandle={dragHandle}
                onSave={(id, updates) => updateChore(id, updates)}
                onDelete={(id) => deleteChore(id)}
              />
            )}
          />
        )}
      </div>
    </div>
  )
}
