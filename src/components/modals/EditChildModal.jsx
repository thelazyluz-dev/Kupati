import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { AVATAR_EMOJIS, COLOR_OPTIONS } from '../../lib/defaults.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import EmojiPicker from '../ui/EmojiPicker.jsx'

// Resize + center-crop an image File to a square JPEG dataURL
function resizeImage(file, size = 200) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width  = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const minDim = Math.min(img.width, img.height)
      const sx = (img.width  - minDim) / 2
      const sy = (img.height - minDim) / 2
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.src = url
  })
}

const MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר',
]

function BirthdayPicker({ value, onChange }) {
  const [month, day] = value ? value.split('-').map(Number) : [0, 0]

  function handleMonth(m) {
    const d = day || 1
    onChange(m ? `${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '')
  }
  function handleDay(d) {
    const m = month || 1
    onChange(d ? `${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '')
  }

  const daysInMonth = month ? new Date(2000, month, 0).getDate() : 31

  return (
    <div className="flex gap-2" dir="rtl">
      <select
        value={month || ''}
        onChange={(e) => handleMonth(Number(e.target.value))}
        className="flex-1 rounded-2xl border-2 border-gray-200 px-3 py-3 focus:border-indigo-400 focus:outline-none text-sm"
      >
        <option value="">-- חודש --</option>
        {MONTHS.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={day || ''}
        onChange={(e) => handleDay(Number(e.target.value))}
        className="w-24 rounded-2xl border-2 border-gray-200 px-3 py-3 focus:border-indigo-400 focus:outline-none text-sm"
        disabled={!month}
      >
        <option value="">-- יום --</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  )
}

function ColorPicker({ value, onChange }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-600 block mb-2">🎨 צבע</label>
      <div className="grid grid-cols-5 gap-2">
        {COLOR_OPTIONS.map((opt) => {
          const selected = value === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              title={opt.label}
              className={[
                'relative h-11 rounded-2xl transition-all active:scale-90',
                selected
                  ? 'ring-3 ring-offset-2 ring-gray-700 scale-105'
                  : 'opacity-80 hover:opacity-100 hover:scale-105',
              ].join(' ')}
              style={{
                background: `linear-gradient(135deg, ${opt.from}, ${opt.to})`,
              }}
            >
              {selected && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-base font-black drop-shadow">
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
      {value && (
        <p className="text-xs text-gray-400 mt-1 text-center">
          {COLOR_OPTIONS.find((o) => o.key === value)?.label}
        </p>
      )}
    </div>
  )
}

export default function EditChildModal() {
  const { closeModal, modalData, updateChild, deleteChild, navigate, requirePin, resetChildData, recalculateBalance } = useApp()
  const child = modalData

  const [name, setName] = useState(child?.name || '')
  const [avatar, setAvatar] = useState(child?.avatar || '🦁')
  const [colorKey, setColorKey] = useState(child?.colorKey || '')
  const [birthday, setBirthday] = useState(child?.birthday || '')
  const [grade, setGrade] = useState(child?.grade || 1)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmRecalc, setConfirmRecalc] = useState(false)
  const [editBalance, setEditBalance] = useState(false)
  const [manualStars, setManualStars] = useState('')
  const [manualShekels, setManualShekels] = useState('')
  // undefined = unchanged, null = remove, string = new dataURL
  const [avatarImage, setAvatarImage] = useState(undefined)
  // Allowance
  const initAllowance = child?.allowance || {}
  const [allowanceEnabled, setAllowanceEnabled] = useState(!!initAllowance.enabled)
  const [allowanceAmount, setAllowanceAmount]   = useState(String(initAllowance.amount || ''))
  const [allowancePeriod, setAllowancePeriod]   = useState(initAllowance.period || 'weekly')
  // Penalty
  const [penaltyEnabled, setPenaltyEnabled] = useState(child?.penaltyEnabled !== false)
  const [accessCode, setAccessCode] = useState(child?.accessCode || '')
  // Streak bonus
  const initStreak = child?.streakBonus || {}
  const [streakEnabled,   setStreakEnabled]   = useState(!!initStreak.enabled)
  const [streakThreshold, setStreakThreshold] = useState(initStreak.threshold || 7)
  const [streakStars,     setStreakStars]     = useState(String(initStreak.stars ?? 10))
  const [streakFreeSpin,  setStreakFreeSpin]  = useState(initStreak.freeSpin !== false)

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await resizeImage(file, 200)
    setAvatarImage(dataUrl)
  }

  if (!child) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const updates = {
      name: name.trim(),
      avatar,
      colorKey: colorKey || null,
      birthday: birthday || null,
      grade: grade || 1,
      allowance: {
        enabled: allowanceEnabled,
        amount: parseFloat(allowanceAmount) || 0,
        period: allowancePeriod,
        lastPaid: child.allowance?.lastPaid || null,
      },
      penaltyEnabled,
      accessCode: /^\d{4}$/.test(accessCode) ? accessCode : '',
      streakBonus: {
        enabled:   streakEnabled,
        threshold: streakThreshold,
        stars:     parseInt(streakStars) || 0,
        freeSpin:  streakFreeSpin,
      },
    }
    if (avatarImage !== undefined) updates.avatarImage = avatarImage  // null removes it
    updateChild(child.id, updates)
    closeModal()
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    requirePin(() => {
      deleteChild(child.id)
      closeModal()
      navigate('home')
    })
  }

  return (
    <Modal title={`✏️ ערוך — ${child.name}`} onClose={closeModal} headerColor="from-slate-500 to-gray-700">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Avatar picker */}
        <EmojiPicker
          label="בחר אווטאר"
          options={AVATAR_EMOJIS}
          value={avatar}
          onChange={setAvatar}
        />

        {/* Photo avatar */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-2">📸 תמונה (מחליפה אימוג׳י)</label>
          {(avatarImage ?? child?.avatarImage) ? (
            <div className="flex items-center gap-3">
              <img
                src={avatarImage ?? child.avatarImage}
                alt="preview"
                className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-300 flex-shrink-0"
              />
              <div className="flex-1 space-y-1.5">
                <label className="flex items-center justify-center gap-1.5 w-full text-xs bg-gray-100 hover:bg-gray-200 rounded-xl py-2 cursor-pointer transition-colors font-semibold text-gray-600">
                  🔄 החלף תמונה
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
                <button
                  type="button"
                  onClick={() => setAvatarImage(null)}
                  className="w-full text-xs text-red-400 bg-red-50 hover:bg-red-100 rounded-xl py-2 transition-colors font-semibold"
                >
                  🗑️ הסר תמונה
                </button>
              </div>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 w-full h-14 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all text-gray-400 text-sm font-medium">
              📸 צלם או בחר תמונה
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          )}
        </div>

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

        {/* Color picker */}
        <ColorPicker value={colorKey} onChange={setColorKey} />

        {/* Birthday */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            🎂 יום הולדת (אופציונלי)
          </label>
          <BirthdayPicker value={birthday} onChange={setBirthday} />
          <p className="text-xs text-gray-400 mt-1 text-center">
            מציג ספירה לאחור על הכרטיס וה-Dashboard
          </p>
        </div>

        {/* Grade */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-2">📚 כיתה (ללמידה)</label>
          <div className="grid grid-cols-6 gap-1.5">
            {[1,2,3,4,5,6].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`py-2.5 rounded-xl font-bold text-sm transition-all active:scale-90 ${grade === g ? 'bg-violet-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {['א','ב','ג','ד','ה','ו'][g-1]}׳
              </button>
            ))}
          </div>
        </div>

        {/* Allowance */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-600">💰 קצבה אוטומטית</label>
            <button
              type="button"
              onClick={() => setAllowanceEnabled((v) => !v)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${allowanceEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
              aria-label="הפעל/כבה קצבה"
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${allowanceEnabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          {allowanceEnabled && (
            <div className="space-y-2 bg-green-50 border border-green-100 rounded-2xl p-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">סכום (₪)</label>
                <input
                  type="number"
                  min="1"
                  value={allowanceAmount}
                  onChange={(e) => setAllowanceAmount(e.target.value)}
                  placeholder="20"
                  className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-base focus:border-green-400 focus:outline-none"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">תדירות</label>
                <select
                  value={allowancePeriod}
                  onChange={(e) => setAllowancePeriod(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                >
                  <option value="weekly">שבועי (כל ראשון)</option>
                  <option value="monthly">חודשי (ה-1 לחודש)</option>
                </select>
              </div>
              <p className="text-xs text-gray-400 text-center">מופקד אוטומטית בפתיחת הדשבורד</p>
            </div>
          )}
        </div>

        {/* Penalty toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex-1 min-w-0 ml-3">
            <p className="text-sm font-semibold text-gray-600">⚡ קנס על אי-ביצוע מטלה</p>
            <p className="text-xs text-gray-400 mt-0.5">כבה בחגים, חופשות או מחלה</p>
          </div>
          <button
            type="button"
            onClick={() => setPenaltyEnabled((v) => !v)}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${penaltyEnabled ? 'bg-amber-500' : 'bg-gray-300'}`}
            aria-label="הפעל/כבה קנס"
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${penaltyEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Personal access code (child mode) */}
        <div className="py-1">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 ml-3">
              <p className="text-sm font-semibold text-gray-600">🔑 קוד אישי לכניסה (טאבלט)</p>
              <p className="text-xs text-gray-400 mt-0.5">4 ספרות — יידרש כדי להיכנס במצב ילד</p>
            </div>
            <input
              type="text" inputMode="numeric" maxLength={4}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="—"
              className="w-20 text-center text-lg font-black tracking-widest rounded-xl border-2 border-gray-200 py-2 focus:border-indigo-400 focus:outline-none flex-shrink-0"
              dir="ltr"
            />
          </div>
          {accessCode && accessCode.length > 0 && accessCode.length < 4 && (
            <p className="text-[11px] text-rose-400 mt-1 text-left" dir="ltr">4 ספרות בדיוק (או ריק לביטול)</p>
          )}
        </div>

        {/* Streak bonus */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-600">🔥 בונוס רצף מטלות</label>
            <button
              type="button"
              onClick={() => setStreakEnabled(v => !v)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${streakEnabled ? 'bg-orange-500' : 'bg-gray-300'}`}
              aria-label="הפעל/כבה בונוס רצף"
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${streakEnabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          {streakEnabled && (
            <div className="space-y-3 bg-orange-50 border border-orange-100 rounded-2xl p-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">בונוס כל כמה ימים ברצף</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[3, 5, 7, 10].map(n => (
                    <button key={n} type="button" onClick={() => setStreakThreshold(n)}
                      className={`py-2 rounded-xl font-bold text-sm transition-all active:scale-90 ${streakThreshold === n ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">⭐ כוכבי בונוס (0 = ללא)</label>
                <input type="number" min="0" value={streakStars}
                  onChange={e => setStreakStars(e.target.value)}
                  placeholder="10"
                  className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-base focus:border-orange-400 focus:outline-none"
                  dir="ltr" />
              </div>
              <div className="flex items-center justify-between py-0.5">
                <label className="text-xs font-semibold text-gray-500">🎰 גם סיבוב חינם בגלגל המזל</label>
                <button type="button" onClick={() => setStreakFreeSpin(v => !v)}
                  className={`w-11 h-5 rounded-full transition-colors relative flex-shrink-0 ${streakFreeSpin ? 'bg-orange-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${streakFreeSpin ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        <Button type="submit" fullWidth size="lg" disabled={!name.trim()}>
          💾 שמור שינויים
        </Button>

        {/* Reset balance */}
        <div className="pt-2 border-t border-gray-100">
          {confirmReset ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-700 font-semibold text-center bg-amber-50 rounded-xl py-2 px-3">
                איפוס יאפס כוכבים, שקלים והיסטוריה.<br />מטרות לא יימחקו.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="warning"
                  fullWidth
                  type="button"
                  onClick={() => requirePin(() => { resetChildData(child.id); setConfirmReset(false); closeModal() })}
                >
                  כן, אפס
                </Button>
                <Button variant="secondary" fullWidth type="button" onClick={() => setConfirmReset(false)}>
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              fullWidth
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              🔄 איפוס יתרה והיסטוריה
            </Button>
          )}
        </div>

        {/* Manual balance correction */}
        <div className="pt-2 border-t border-gray-100">
          {editBalance ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-semibold text-center">תקן יתרה ידנית</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1 text-center">כוכבים ⭐</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={manualStars}
                    onChange={(e) => setManualStars(e.target.value)}
                    placeholder={String(child.starBalance)}
                    className="w-full rounded-xl border-2 border-indigo-200 px-3 py-2 text-center font-bold focus:border-indigo-400 focus:outline-none"
                    dir="ltr"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1 text-center">שקלים ₪</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualShekels}
                    onChange={(e) => setManualShekels(e.target.value)}
                    placeholder={String(child.shekelBalance)}
                    className="w-full rounded-xl border-2 border-green-200 px-3 py-2 text-center font-bold focus:border-green-400 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  fullWidth
                  type="button"
                  onClick={() => {
                    const stars   = manualStars   !== '' ? parseFloat(manualStars)   : child.starBalance
                    const shekels = manualShekels !== '' ? parseFloat(manualShekels) : child.shekelBalance
                    if (!isNaN(stars) && !isNaN(shekels)) {
                      updateChild(child.id, { starBalance: Math.max(0, stars), shekelBalance: Math.max(0, shekels) })
                    }
                    setEditBalance(false)
                    closeModal()
                  }}
                >
                  💾 שמור יתרה
                </Button>
                <Button variant="secondary" fullWidth type="button" onClick={() => setEditBalance(false)}>
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              fullWidth
              type="button"
              onClick={() => { setManualStars(''); setManualShekels(''); setEditBalance(true) }}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              ✏️ תקן יתרה ידנית
            </Button>
          )}
        </div>

        {/* Recalculate balance from transaction history */}
        <div className="pt-2 border-t border-gray-100">
          {confirmRecalc ? (
            <div className="space-y-2">
              <p className="text-sm text-blue-700 font-semibold text-center bg-blue-50 rounded-xl py-2 px-3">
                יחושב מחדש מתוך כל ההיסטוריה.<br />פעולה זו בטוחה ואפשר לבטל עם undo.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  fullWidth
                  type="button"
                  onClick={() => { recalculateBalance(child.id); setConfirmRecalc(false); closeModal() }}
                >
                  כן, שחזר
                </Button>
                <Button variant="secondary" fullWidth type="button" onClick={() => setConfirmRecalc(false)}>
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              fullWidth
              type="button"
              onClick={() => setConfirmRecalc(true)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              🔧 שחזר יתרה מהיסטוריה
            </Button>
          )}
        </div>

        {/* Delete */}
        <div className="pt-2 border-t border-gray-100">
          {confirmDelete ? (
            <div className="space-y-2">
              <p className="text-sm text-red-600 font-semibold text-center">
                בטוח? פעולה זו אינה הפיכה!
              </p>
              <div className="flex gap-2">
                <Button variant="danger" fullWidth onClick={handleDelete} type="button">
                  כן, מחק
                </Button>
                <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(false)} type="button">
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
