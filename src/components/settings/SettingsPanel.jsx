import { useState, useContext, useCallback } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { AuthContext } from '../../context/AuthContext.jsx'
import { exportAll } from '../../lib/storage.js'
import { getPermission, requestPermission } from '../../lib/notifications.js'
import Button from '../ui/Button.jsx'
import ChoreManager from './ChoreManager.jsx'
import ChildrenManager from './ChildrenManager.jsx'
import PrizeManager from './PrizeManager.jsx'
import SyncSettings from './SyncSettings.jsx'
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

function PinSettings() {
  const { settings, updateSettings, showModal, requirePin } = useApp()
  const hasPin = !!settings.pin

  function handleSetup() {
    showModal('pin', { mode: hasPin ? 'change' : 'setup' })
  }

  function handleRemove() {
    requirePin(() => updateSettings({ pin: '' }))
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

function NotificationSettings() {
  const [permission, setPermission] = useState(getPermission)

  async function handleRequest() {
    const result = await requestPermission()
    setPermission(result)
  }

  if (permission === 'unsupported') {
    return <p className="text-xs text-gray-400 text-center">הדפדפן לא תומך בהתראות</p>
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2.5 text-green-700">
        <span className="text-xl">✅</span>
        <div>
          <p className="text-sm font-bold">התראות מופעלות</p>
          <p className="text-xs text-gray-400">מטלות, קנסות וקצבות</p>
        </div>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="space-y-1 text-center">
        <p className="text-sm text-red-500 font-semibold">התראות חסומות בדפדפן</p>
        <p className="text-xs text-gray-400">פתח הגדרות דפדפן ← אתרים ← אפשר התראות</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" fullWidth onClick={handleRequest}>
        🔔 אפשר התראות
      </Button>
      <p className="text-xs text-gray-400 text-center">
        כשמסמנים מטלה, כשנוצר קנס יומי, וכשקצבה מופקדת
      </p>
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

  function handleExport() {
    const data = exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `הארנק-שלי-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
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

        <ChildrenManager />

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

        <SettingsSection icon="💾" label="גיבוי ועדכון" iconColor="bg-sky-100 text-sky-600" accent="border-sky-400">
          <div className="space-y-3">
            <Button variant="secondary" fullWidth onClick={handleExport}>
              📥 ייצא JSON
            </Button>
            <p className="text-xs text-gray-400 text-center">
              כל הנתונים יורדו כקובץ JSON לגיבוי
            </p>
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
          <p>הארנק שלי 🐷 · גרסה 1.4</p>
          <p>נתונים מסונכרנים דרך Firebase</p>
        </div>
      </main>
    </div>
  )
}
