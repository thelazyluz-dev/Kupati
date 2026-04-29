import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { getGoals, getTotalValue, formatNumber } from '../../lib/utils.js'
import { GOAL_EMOJIS } from '../../lib/defaults.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import EmojiPicker from '../ui/EmojiPicker.jsx'

function GoalForm({ initial, onSave, onCancel }) {
  const [emoji,        setEmoji]        = useState(initial?.emoji || '🎯')
  const [name,         setName]         = useState(initial?.name || '')
  const [targetAmount, setTargetAmount] = useState(
    initial?.targetAmount ? String(initial.targetAmount) : ''
  )
  const [goalImage, setGoalImage] = useState(initial?.goalImage || null)

  const target = parseFloat(targetAmount) || 0

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setGoalImage(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || target <= 0) return
    onSave({ emoji, name: name.trim(), targetAmount: target, goalImage: goalImage || null })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-indigo-100 rounded-2xl p-4 bg-indigo-50">

      {/* Image upload */}
      <div>
        <label className="text-sm font-semibold text-gray-600 block mb-1.5">תמונה (אופציונלי)</label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className={`w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-dashed transition-colors ${goalImage ? 'border-indigo-300' : 'border-gray-300 group-hover:border-indigo-400 bg-gray-50'}`}>
            {goalImage
              ? <img src={goalImage} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300 group-hover:text-indigo-400 transition-colors">📷</div>
            }
          </div>
          <div className="flex-1">
            <p className="text-sm text-indigo-600 font-semibold group-hover:text-indigo-700">
              {goalImage ? 'החלף תמונה' : 'הוסף תמונה של המטרה'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">מהגלריה או מצלמה</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>
        {goalImage && (
          <button type="button" onClick={() => setGoalImage(null)}
            className="mt-1.5 text-xs text-red-400 hover:text-red-600">
            ✕ הסר תמונה
          </button>
        )}
      </div>

      <EmojiPicker label="אימוג׳י" options={GOAL_EMOJIS} value={emoji} onChange={setEmoji} />
      <div>
        <label className="text-sm font-semibold text-gray-600 block mb-1">שם המטרה</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="אייפד, אופניים..."
          className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-indigo-400 focus:outline-none"
          required
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-gray-600 block mb-1">יעד (₪)</label>
        <input
          type="number"
          min="1"
          step="1"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          placeholder="500"
          className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-xl font-bold focus:border-indigo-400 focus:outline-none text-center"
          dir="ltr"
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" fullWidth disabled={!name.trim() || !target}>
          {initial ? '💾 שמור' : '➕ הוסף'}
        </Button>
        <Button variant="secondary" type="button" fullWidth onClick={onCancel}>ביטול</Button>
      </div>
    </form>
  )
}

export default function GoalModal() {
  const { closeModal, modalData, children, settings, addGoal, updateGoal, deleteGoal } = useApp()
  const childId = modalData?.childId
  const child = children.find((c) => c.id === childId)

  const [editing, setEditing] = useState(null) // goalId being edited, or 'new'
  const [confirmDelete, setConfirmDelete] = useState(null) // goalId pending delete

  if (!child) return null

  const goals = getGoals(child)
  const totalValue = getTotalValue(child, settings)

  function handleAdd(data) {
    addGoal(childId, data)
    setEditing(null)
  }

  function handleUpdate(goalId, data) {
    updateGoal(childId, goalId, data)
    setEditing(null)
  }

  function handleDelete(goalId) {
    if (confirmDelete !== goalId) { setConfirmDelete(goalId); return }
    deleteGoal(childId, goalId)
    setConfirmDelete(null)
  }

  return (
    <Modal title="🎯 מטרות חיסכון" onClose={closeModal} headerColor="from-indigo-400 to-purple-500">
      <div className="space-y-3">
        {/* Existing goals */}
        {goals.length === 0 && editing !== 'new' && (
          <div className="text-center py-6 text-gray-400">
            <div className="text-4xl mb-2">🎯</div>
            <p>אין מטרות עדיין — הוסף את הראשונה!</p>
          </div>
        )}

        {goals.map((goal) => {
          const pct = Math.min(1, totalValue / goal.targetAmount)
          const reached = pct >= 1
          const remaining = Math.max(0, goal.targetAmount - totalValue)

          if (editing === goal.id) {
            return (
              <GoalForm
                key={goal.id}
                initial={goal}
                onSave={(data) => handleUpdate(goal.id, data)}
                onCancel={() => setEditing(null)}
              />
            )
          }

          return (
            <div
              key={goal.id}
              className={`rounded-2xl p-3 border-2 ${reached ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {goal.goalImage
                  ? <img src={goal.goalImage} alt={goal.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm" />
                  : <span className="text-xl">{goal.emoji}</span>
                }
                <span className="font-bold text-gray-800 flex-1">{goal.name}</span>
                <span className="text-sm text-gray-500" dir="ltr">{formatNumber(goal.targetAmount)}₪</span>
              </div>

              {/* Mini progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${reached ? 'bg-amber-400' : 'bg-indigo-400'}`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {reached
                  ? '🎉 הגעת למטרה!'
                  : `עוד ${formatNumber(remaining)}₪`}
              </p>

              {/* Actions */}
              {confirmDelete === goal.id ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(goal.id)}
                    className="flex-1 py-1.5 rounded-xl bg-red-500 text-white text-sm font-semibold"
                  >מחק</button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold"
                  >ביטול</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditing(goal.id); setConfirmDelete(null) }}
                    className="flex-1 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold transition-colors"
                  >✏️ ערוך</button>
                  <button
                    type="button"
                    onClick={() => handleDelete(goal.id)}
                    className="py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-red-50 text-red-400 text-sm transition-colors"
                  >🗑️</button>
                </div>
              )}
            </div>
          )
        })}

        {/* Add new goal form */}
        {editing === 'new' ? (
          <GoalForm onSave={handleAdd} onCancel={() => setEditing(null)} />
        ) : (
          <button
            type="button"
            onClick={() => { setEditing('new'); setConfirmDelete(null) }}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-500 font-semibold hover:bg-indigo-50 transition-colors"
          >
            ➕ הוסף מטרה
          </button>
        )}
      </div>
    </Modal>
  )
}
