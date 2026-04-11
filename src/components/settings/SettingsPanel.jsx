import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { exportAll } from '../../lib/storage.js'
import Button from '../ui/Button.jsx'
import ChoreManager from './ChoreManager.jsx'
import ChildrenManager from './ChildrenManager.jsx'
import PrizeManager from './PrizeManager.jsx'
import SyncSettings from './SyncSettings.jsx'

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

function SettingsSection({ icon, label, iconColor, accent, children }) {
  return (
    <section>
      <SectionHeader icon={icon} label={label} color={iconColor} />
      <div className={`bg-white rounded-2xl shadow-sm p-4 border-r-4 ${accent}`}>
        {children}
      </div>
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

export default function SettingsPanel() {
  const { navigate, resetAllData, requirePin } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)

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
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-gradient-to-br from-gray-700 to-gray-900 px-5 pt-8 pb-6 text-white">
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
        <ChoreManager />

        <SettingsSection icon="🎁" label="מחירון פרסים בכוכבים" iconColor="bg-purple-100 text-purple-600" accent="border-purple-400">
          <PrizeManager />
        </SettingsSection>

        <ChildrenManager />

        <SettingsSection icon="🔊" label="צלילים" iconColor="bg-violet-100 text-violet-600" accent="border-violet-400">
          <SoundToggle />
        </SettingsSection>

        <SettingsSection icon="🔒" label="קוד הורים" iconColor="bg-slate-100 text-slate-600" accent="border-slate-400">
          <PinSettings />
        </SettingsSection>

        <SettingsSection icon="☁️" label="סנכרון בין מכשירים" iconColor="bg-indigo-100 text-indigo-600" accent="border-indigo-400">
          <SyncSettings />
        </SettingsSection>

        <SettingsSection icon="💾" label="גיבוי נתונים" iconColor="bg-sky-100 text-sky-600" accent="border-sky-400">
          <div className="space-y-3">
            <Button variant="secondary" fullWidth onClick={handleExport}>
              📥 ייצא JSON
            </Button>
            <p className="text-xs text-gray-400 text-center">
              כל הנתונים יורדו כקובץ JSON לגיבוי
            </p>
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

        <div className="text-center text-xs text-gray-400 pb-8">
          <p>הארנק שלי 🐷</p>
          <p>נתונים מסונכרנים דרך Firebase</p>
        </div>
      </main>
    </div>
  )
}
