import { useState, useContext, useCallback } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { AuthContext } from '../../context/AuthContext.jsx'
import BackupSettings from './BackupSettings.jsx'
import { getPermission, requestPermission } from '../../lib/notifications.js'
import { DEFAULT_WHEEL_PRIZES } from '../../lib/defaults.js'
import { generateId } from '../../lib/utils.js'
import { CLEAR_PIN_SETTINGS } from '../../lib/pin.js'
import Button from '../ui/Button.jsx'
import ChoreManager from './ChoreManager.jsx'
import ChildrenManager from './ChildrenManager.jsx'
import PrizeManager from './PrizeManager.jsx'
import SyncSettings from './SyncSettings.jsx'
import ExchangeRateSettings from './ExchangeRateSettings.jsx'
import { useSwipeBack } from '../../hooks/useSwipeBack.js'

function useAuthSafe() {
  const ctx = useContext(AuthContext)
  return ctx ?? { user: null, signOut: null }
}

function SectionHeader({ icon, label, color }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-base ${color}`}>
        {icon}
      </span>
      <h3 className="font-bold text-gray-700 text-sm">{label}</h3>
    </div>
  )
}

function SettingsSection({ icon, label, iconColor, accent, children, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section>
      {collapsible ? (
        <button
          type="button"
          className="flex items-center gap-2 mb-2 w-full active:opacity-70"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${iconColor}`}>
            {icon}
          </span>
          <h3 className="font-bold text-gray-700 text-sm flex-1 text-right">{label}</h3>
          <span
            className="text-gray-400 text-[11px] transition-transform duration-200 flex-shrink-0"
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >▼</span>
        </button>
      ) : (
        <SectionHeader icon={icon} label={label} color={iconColor} />
      )}
      {(!collapsible || open) && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm ring-1 ring-white/50 p-4">
          {children}
        </div>
      )}
    </section>
  )
}

function SoundToggle() {
  const { settings, updateSettings } = useApp()
  const enabled = settings.soundEnabled !== false
  return (
    <button
      type="button"
      onClick={() => updateSettings({ soundEnabled: !enabled })}
      className="w-full flex items-center justify-between py-1"
    >
      <span className="font-semibold text-gray-700">
        {enabled ? '🔊 צלילים פעילים' : '🔇 צלילים כבויים'}
      </span>
      <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${enabled ? 'bg-indigo-500' : 'bg-gray-300'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${enabled ? 'right-1' : 'right-7'}`} />
      </div>
    </button>
  )
}

function DailyPenaltySettings() {
  const { settings, updateSettings } = useApp()
  const dp = settings.dailyPenalty ?? { first: 5, repeat: 10 }

  function setAmount(field, raw) {
    const v = Math.max(0, parseInt(raw) || 0)
    updateSettings({ dailyPenalty: { ...dp, [field]: v } })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-rose-50 rounded-2xl px-4 py-3">
        <div>
          <p className="text-sm font-bold text-gray-700">יום ראשון ללא מטלה</p>
          <p className="text-xs text-gray-400">כוכבים שינוכו</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-base">⭐</span>
          <input
            type="number" min="0" max="99" value={dp.first}
            onChange={(e) => setAmount('first', e.target.value)}
            dir="ltr"
            className="w-16 text-center font-bold text-sm rounded-xl border-2 border-rose-200 py-1.5 focus:border-rose-400 focus:outline-none bg-white"
          />
        </div>
      </div>
      <div className="flex items-center justify-between bg-rose-50 rounded-2xl px-4 py-3">
        <div>
          <p className="text-sm font-bold text-gray-700">ימים ברצף</p>
          <p className="text-xs text-gray-400">כשממשיכים לא לבצע</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-base">⭐</span>
          <input
            type="number" min="0" max="99" value={dp.repeat}
            onChange={(e) => setAmount('repeat', e.target.value)}
            dir="ltr"
            className="w-16 text-center font-bold text-sm rounded-xl border-2 border-rose-200 py-1.5 focus:border-rose-400 focus:outline-none bg-white"
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 leading-snug">
        הקנס נבדק פעם ביום (אחרי הצהריים). אפשר לכבות קנסות לילד מסוים במסך עריכת הילד.
      </p>
    </div>
  )
}

function PinSettings() {
  const { settings, updateSettings, showModal, requirePin } = useApp()
  const hasPin = !!(settings.pinHash || settings.pin)

  function handleSetup() {
    showModal('pin', { mode: hasPin ? 'change' : 'setup' })
  }

  function handleRemove() {
    requirePin(() => updateSettings(CLEAR_PIN_SETTINGS))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {hasPin ? '🔒 קוד הורים פעיל' : '🔓 אין קוד הורים'}
        </span>
        <button
          type="button"
          onClick={handleSetup}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          {hasPin ? 'שנה קוד' : 'הגדר קוד'}
        </button>
      </div>
      {hasPin && (
        <button
          type="button"
          onClick={handleRemove}
          className="w-full text-sm text-red-500 hover:text-red-700 text-right"
        >
          הסר קוד
        </button>
      )}
      <p className="text-xs text-gray-400">
        הקוד יידרש לפני מחיקת ילד או איפוס נתונים
      </p>
    </div>
  )
}

const WHEEL_COLORS = [
  '#0ea5e9','#059669','#0891b2','#0e7490','#06b6d4',
  '#7c3aed','#0d9488','#15803d','#047857','#0369a1','#8b5cf6','#d97706',
]
const PRIZE_EMOJIS = ['💵','💸','🤑','💎','⭐','🎁','🎮','🍦','🍕','🎪','🏆','🎯']

function WheelPrizeManager() {
  const { settings, updateSettings } = useApp()
  const prizes = settings.wheelPrizes?.length >= 2 ? settings.wheelPrizes : DEFAULT_WHEEL_PRIZES

  const [editId,    setEditId]    = useState(null)
  const [editAmt,   setEditAmt]   = useState('')
  const [editEmoji, setEditEmoji] = useState('💵')
  const [newAmt,    setNewAmt]    = useState('')
  const [newEmoji,  setNewEmoji]  = useState('💵')

  function save(next) { updateSettings({ wheelPrizes: next }) }

  function startEdit(p) { setEditId(p.id); setEditAmt(String(p.shekels)); setEditEmoji(p.emoji) }

  function saveEdit() {
    const amt = parseFloat(editAmt)
    if (!(amt > 0)) return
    save(prizes.map(p => p.id === editId ? { ...p, shekels: amt, emoji: editEmoji } : p))
    setEditId(null)
  }

  function deletePrize(id) {
    if (prizes.length <= 2) return
    save(prizes.filter(p => p.id !== id))
  }

  function addPrize() {
    const amt = parseFloat(newAmt)
    if (!(amt > 0) || prizes.length >= 12) return
    save([...prizes, { id: generateId(), shekels: amt, emoji: newEmoji }])
    setNewAmt('')
  }

  const spinCost = settings.wheelSpinCost ?? 70

  return (
    <div className="space-y-3">

      {/* Spin cost */}
      <div className="flex items-center justify-between bg-violet-50 rounded-2xl px-4 py-3">
        <div>
          <p className="text-sm font-bold text-gray-700">עלות סיבוב</p>
          <p className="text-xs text-gray-400">כוכבים לסיבוב אחד</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-base">⭐</span>
          <input
            type="number" min="1" max="999" value={spinCost}
            onChange={e => updateSettings({ wheelSpinCost: Math.max(1, parseInt(e.target.value) || 1) })}
            dir="ltr"
            className="w-16 text-center font-bold text-sm rounded-xl border-2 border-violet-200 py-1.5 focus:border-violet-400 focus:outline-none bg-white"
          />
        </div>
      </div>

      {/* Prize grid */}
      <div className="grid grid-cols-2 gap-2">
        {prizes.map((p, i) => {
          const color = WHEEL_COLORS[i % WHEEL_COLORS.length]
          return (
            <div key={p.id} className="rounded-2xl overflow-hidden"
              style={{ border: `2px solid ${color}55` }}>
              {editId === p.id ? (
                /* ── Edit mode ── */
                <div className="p-2 space-y-1.5" style={{ background: color + '18' }}>
                  <select value={editEmoji} onChange={e => setEditEmoji(e.target.value)}
                    className="w-full text-center text-xl bg-white border border-gray-200 rounded-xl py-1 cursor-pointer outline-none">
                    {PRIZE_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <input type="number" min="1" value={editAmt}
                    onChange={e => setEditAmt(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 px-2 py-1.5 text-sm font-bold text-center focus:outline-none focus:border-violet-400"
                    dir="ltr" placeholder="₪" />
                  <div className="flex gap-1">
                    <button onClick={saveEdit}
                      className="flex-1 text-white text-xs font-bold py-1.5 rounded-xl"
                      style={{ background: '#10b981' }}>✓ שמור</button>
                    <button onClick={() => setEditId(null)}
                      className="flex-1 text-gray-500 text-xs font-bold py-1.5 rounded-xl bg-gray-100">ביטול</button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <div className="flex items-center gap-2 px-2.5 py-2" style={{ background: color + '12' }}>
                  <span className="text-xl flex-shrink-0">{p.emoji}</span>
                  <span className="font-black text-sm flex-1" style={{ color }}>{p.shekels}₪</span>
                  <button onClick={() => startEdit(p)}
                    className="text-[11px] font-bold text-gray-500 px-1.5 py-1 rounded-lg bg-white/70 active:scale-90">✏️</button>
                  <button onClick={() => deletePrize(p.id)} disabled={prizes.length <= 2}
                    className="text-[11px] font-bold text-red-400 px-1.5 py-1 rounded-lg bg-white/70 active:scale-90 disabled:opacity-25">🗑️</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add new prize */}
      {prizes.length < 12 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-3 space-y-2">
          <p className="text-xs font-bold text-gray-400 text-center">+ הוסף פרס חדש</p>
          <div className="flex gap-2">
            <select value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
              className="w-14 text-center text-xl bg-white border-2 border-gray-200 rounded-xl py-2 cursor-pointer outline-none focus:border-violet-400 flex-shrink-0">
              {PRIZE_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <input type="number" min="1" value={newAmt}
              onChange={e => setNewAmt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPrize()}
              placeholder="סכום ₪" dir="ltr"
              className="flex-1 min-w-0 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm font-bold focus:border-violet-400 focus:outline-none" />
          </div>
          <button onClick={addPrize} disabled={!(parseFloat(newAmt) > 0)}
            className="w-full text-white font-bold text-sm py-2.5 rounded-xl active:scale-95 disabled:opacity-40 transition-all"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            + הוסף לגלגל
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">{prizes.length} / 12 פרסים</p>
    </div>
  )
}

const NOTIFY_EVENTS = [
  { key: 'choreRequest',   icon: '📝', label: 'בקשת מטלה מילד',    desc: 'כשילד מבקש אישור מטלה' },
  { key: 'choreCompleted', icon: '⭐', label: 'מטלה הושלמה',       desc: 'כשמסמנים מטלה ידנית' },
  { key: 'moneyAdded',     icon: '💵', label: 'הפקדת כסף',         desc: 'כשמפקידים כסף לילד' },
  { key: 'penalty',        icon: '⚡', label: 'קנס יומי',           desc: 'כשנוצר קנס על מטלה שלא בוצעה' },
  { key: 'allowance',      icon: '💰', label: 'קצבה שבועית/חודשית', desc: 'כשמופקדת קצבה אוטומטית' },
  { key: 'weeklySummary',  icon: '📊', label: 'סיכום שבועי',        desc: 'סיכום פעילות כל יום שישי' },
]

function NotificationSettings() {
  const { settings, updateSettings } = useApp()
  const [permission, setPermission]  = useState(getPermission)

  const notifyPrefs = settings.notify ?? {}

  async function handleRequest() {
    const result = await requestPermission()
    setPermission(result)
  }

  function togglePref(key) {
    const current = notifyPrefs[key] !== false // default true
    updateSettings({ notify: { ...notifyPrefs, [key]: !current } })
  }

  if (permission === 'unsupported') {
    return <p className="text-xs text-gray-400 text-center">הדפדפן לא תומך בהתראות</p>
  }

  if (permission === 'denied') {
    return (
      <div className="space-y-1 text-center">
        <p className="text-sm text-red-500 font-semibold">התראות חסומות בדפדפן</p>
        <p className="text-xs text-gray-400">פתח הגדרות דפדפן ← אתרים ← אפשר התראות</p>
      </div>
    )
  }

  if (permission !== 'granted') {
    return (
      <div className="space-y-2">
        <Button variant="secondary" fullWidth onClick={handleRequest}>
          🔔 אפשר התראות
        </Button>
        <p className="text-xs text-gray-400 text-center">
          קבלו התראות על מטלות, כסף, קנסות ועוד
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-sm">✅</span>
        <span className="text-xs font-semibold text-green-700">התראות מופעלות</span>
      </div>
      {NOTIFY_EVENTS.map(({ key, icon, label, desc }) => {
        const enabled = notifyPrefs[key] !== false
        return (
          <button
            key={key}
            type="button"
            onClick={() => togglePref(key)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl active:scale-98 transition-all"
            style={{ background: enabled ? 'rgba(238,242,255,0.7)' : 'rgba(249,250,251,0.7)' }}
          >
            <span className="text-lg flex-shrink-0">{icon}</span>
            <div className="flex-1 text-right min-w-0">
              <p className="text-sm font-semibold text-gray-700">{label}</p>
              <p className="text-[11px] text-gray-400 truncate">{desc}</p>
            </div>
            <div className="flex-shrink-0 w-10 h-6 rounded-full transition-all duration-200 relative"
              style={{ background: enabled ? '#6366f1' : '#d1d5db' }}>
              <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200"
                style={{ right: enabled ? 2 : 'auto', left: enabled ? 'auto' : 2 }} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default function SettingsPanel() {
  const { navigate, resetAllData, requirePin, showModal } = useApp()
  const { user, signOut } = useAuthSafe()
  useSwipeBack(useCallback(() => navigate('home'), [navigate]))
  const [confirmReset, setConfirmReset] = useState(false)

  async function handleForceUpdate() {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    } catch {}
    window.location.reload(true)
  }


  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #ede9fe 0%, #dbeafe 100%)', backgroundAttachment: 'fixed' }}>
      <header className="bg-gradient-to-br from-indigo-500 to-violet-600 px-5 pt-8 pb-6 text-white">
        <div className="flex items-center justify-between">
          <div className="invisible flex items-center gap-1 pl-3 pr-2 py-2 text-sm font-bold">
            חזרה ›
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">⚙️</div>
            <h1 className="text-xl font-bold">הגדרות</h1>
          </div>
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-1 pl-3 pr-2 py-2 rounded-2xl bg-white/25 hover:bg-white/40 active:scale-95 transition-all text-sm font-bold shadow-sm"
            aria-label="חזרה לבית"
          >
            <span>חזרה</span>
            <span className="text-base leading-none">›</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-5">
        <SettingsSection
          icon="📋" label="רשימת מטלות"
          iconColor="bg-indigo-100 text-indigo-600" accent="border-indigo-400"
          collapsible defaultOpen={false}
        >
          <ChoreManager hideTitle />
        </SettingsSection>

        <SettingsSection
          icon="🎁" label="מחירון פרסים בכוכבים"
          iconColor="bg-purple-100 text-purple-600" accent="border-purple-400"
          collapsible defaultOpen={false}
        >
          <PrizeManager />
        </SettingsSection>

        <SettingsSection
          icon="🎰" label="פרסי גלגל המזל"
          iconColor="bg-violet-100 text-violet-600" accent="border-violet-400"
          collapsible defaultOpen={false}
        >
          <WheelPrizeManager />
        </SettingsSection>

        <ChildrenManager />

        <SettingsSection
          icon="💱" label="המרת כוכבים לשקלים"
          iconColor="bg-sky-100 text-sky-600" accent="border-sky-400"
          collapsible defaultOpen={false}
        >
          <ExchangeRateSettings hideTitle />
        </SettingsSection>

        <SettingsSection
          icon="⚡" label="קנס יומי"
          iconColor="bg-rose-100 text-rose-600" accent="border-rose-400"
          collapsible defaultOpen={false}
        >
          <DailyPenaltySettings />
        </SettingsSection>

        <SettingsSection icon="🔊" label="צלילים" iconColor="bg-violet-100 text-violet-600" accent="border-violet-400">
          <SoundToggle />
        </SettingsSection>

        <SettingsSection icon="🔔" label="התראות" iconColor="bg-amber-100 text-amber-600" accent="border-amber-400">
          <NotificationSettings />
        </SettingsSection>

        <SettingsSection icon="🔒" label="קוד הורים" iconColor="bg-slate-100 text-slate-600" accent="border-slate-400">
          <PinSettings />
        </SettingsSection>

        <SettingsSection icon="☁️" label="סנכרון בין מכשירים" iconColor="bg-indigo-100 text-indigo-600" accent="border-indigo-400">
          <SyncSettings />
        </SettingsSection>

        <SettingsSection icon="📊" label="דוח פעילות" iconColor="bg-indigo-100 text-indigo-600" accent="border-indigo-400">
          <Button variant="secondary" fullWidth onClick={() => showModal('weeklyReport')}>
            📊 פתח דוח פעילות
          </Button>
          <p className="text-xs text-gray-400 text-center mt-2">
            מטלות, לימודים, שינויי כוכבים וכספים לכל ילד
          </p>
        </SettingsSection>

        <SettingsSection icon="💾" label="גיבוי ושחזור" iconColor="bg-sky-100 text-sky-600" accent="border-sky-400">
          <div className="space-y-3">
            <BackupSettings />
            <div className="border-t border-gray-100 pt-3">
              <Button variant="ghost" fullWidth onClick={handleForceUpdate} className="border-blue-200 text-blue-600 hover:bg-blue-50">
                🔄 נקה cache ועדכן אפליקציה
              </Button>
              <p className="text-xs text-gray-400 text-center mt-1.5">
                אם האפליקציה לא מתעדכנת — לחץ כאן
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Danger zone */}
        <section>
          <SectionHeader icon="⚠️" label="אזור מסוכן" color="bg-red-100 text-red-600" />
          <div className="bg-white rounded-2xl shadow-sm p-4 border-r-4 border-red-400">
            {confirmReset ? (
              <div className="space-y-3">
                <p className="text-sm text-red-600 font-semibold text-center">
                  בטוח? כל הנתונים יימחקו לצמיתות!
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => requirePin(resetAllData)}
                  >
                    כן, מחק הכל
                  </Button>
                  <Button variant="secondary" fullWidth onClick={() => setConfirmReset(false)}>
                    ביטול
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setConfirmReset(true)}
                className="text-red-500 border-red-200 hover:bg-red-50"
              >
                🗑️ מחק את כל הנתונים
              </Button>
            )}
          </div>
        </section>

        {user && signOut && (
          <div className="rounded-[20px] px-4 py-3 flex items-center gap-3"
            style={{ background: 'rgba(243,244,246,0.85)', border: '1.5px solid rgba(209,213,219,0.6)' }}>
            {user.photoURL && <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{user.displayName || 'משתמש'}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <button type="button" onClick={signOut}
              className="text-xs font-bold text-red-500 px-3 py-1.5 rounded-xl active:scale-95 transition-all flex-shrink-0"
              style={{ background: 'rgba(254,226,226,0.8)', border: '1px solid rgba(252,165,165,0.5)' }}>
              התנתק
            </button>
          </div>
        )}

        <div className="text-center text-xs text-gray-400 pb-8">
          <p>הארנק שלי 🐷 · גרסה {__APP_VERSION__}</p>
          <p>נתונים מסונכרנים דרך Firebase</p>
        </div>
      </main>
    </div>
  )
}
