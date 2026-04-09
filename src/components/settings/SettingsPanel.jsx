import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { exportAll } from '../../lib/storage.js'
import Button from '../ui/Button.jsx'
import ChoreManager from './ChoreManager.jsx'
import ChildrenManager from './ChildrenManager.jsx'
import ExchangeRateSettings from './ExchangeRateSettings.jsx'

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

export default function SettingsPanel() {
  const { navigate, resetAllData } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)

  function handleExport() {
    const data = exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `הארנק-שלי-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-br from-gray-700 to-gray-900 px-5 pt-8 pb-6 text-white">
        <div className="flex items-center justify-between">
          <div className="w-9" />
          <div className="text-center">
            <div className="text-3xl mb-1">⚙️</div>
            <h1 className="text-xl font-bold">הגדרות</h1>
          </div>
          <button
            onClick={() => navigate('home')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-lg transition-colors"
            aria-label="חזור"
          >
            →
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 space-y-6">
        {/* Exchange rates */}
        <ExchangeRateSettings />

        {/* Chore manager */}
        <ChoreManager />

        {/* Children manager */}
        <ChildrenManager />

        {/* Sound toggle */}
        <div>
          <h3 className="font-bold text-gray-700 mb-3">🔊 צלילים</h3>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <SoundToggle />
          </div>
        </div>

        {/* Export */}
        <div>
          <h3 className="font-bold text-gray-700 mb-3">💾 גיבוי נתונים</h3>
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <Button variant="secondary" fullWidth onClick={handleExport}>
              📥 ייצא JSON
            </Button>
            <p className="text-xs text-gray-400 text-center">
              כל הנתונים יורדו כקובץ JSON לגיבוי
            </p>
          </div>
        </div>

        {/* Danger zone */}
        <div>
          <h3 className="font-bold text-red-600 mb-3">⚠️ אזור מסוכן</h3>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            {confirmReset ? (
              <div className="space-y-3">
                <p className="text-sm text-red-600 font-semibold text-center">
                  בטוח? כל הנתונים יימחקו לצמיתות!
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" fullWidth onClick={resetAllData}>
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
        </div>

        {/* App info */}
        <div className="text-center text-xs text-gray-400 pb-8">
          <p>הארנק שלי 🐷</p>
          <p>כל הנתונים נשמרים מקומית במכשיר</p>
        </div>
      </main>
    </div>
  )
}
