import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'

export default function ExchangeRateSettings() {
  const { settings, updateSettings, children, updateChild } = useApp()
  const [globalRate, setGlobalRate] = useState(String(settings.globalExchangeRate))
  const [threshold, setThreshold] = useState(String(settings.confettiThreshold))

  function saveGlobal() {
    const rate = parseFloat(globalRate)
    if (rate > 0) updateSettings({ globalExchangeRate: rate })
  }

  function saveThreshold() {
    const val = parseInt(threshold)
    if (val >= 1) updateSettings({ confettiThreshold: val })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-700">⚙️ הגדרות כלליות</h3>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        {/* Global exchange rate */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            שיעור המרה גלובלי (₪ לכוכב)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={globalRate}
              onChange={(e) => setGlobalRate(e.target.value)}
              className="flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 focus:border-indigo-400 focus:outline-none"
              dir="ltr"
            />
            <button
              onClick={saveGlobal}
              className="px-4 py-2 bg-indigo-500 text-white rounded-xl font-semibold text-sm hover:bg-indigo-600 transition-colors"
            >
              שמור
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            1⭐ = {settings.globalExchangeRate}₪ (כרגע)
          </p>
        </div>

        {/* Confetti threshold */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1">
            סף קונפטי (כוכבים)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 focus:border-indigo-400 focus:outline-none"
              dir="ltr"
            />
            <button
              onClick={saveThreshold}
              className="px-4 py-2 bg-indigo-500 text-white rounded-xl font-semibold text-sm hover:bg-indigo-600 transition-colors"
            >
              שמור
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            קונפטי יופיע בהוספת {settings.confettiThreshold}+ כוכבים
          </p>
        </div>
      </div>

      {/* Per-child exchange rates */}
      {children.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-600 mb-2">שיעורי המרה אישיים</h4>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {children.map((child) => (
              <ChildRateRow
                key={child.id}
                child={child}
                globalRate={settings.globalExchangeRate}
                onUpdate={(rate) => updateChild(child.id, { exchangeRate: rate })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ChildRateRow({ child, globalRate, onUpdate }) {
  const [rate, setRate] = useState(
    child.exchangeRate != null ? String(child.exchangeRate) : ''
  )

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-xl">{child.avatar}</span>
      <span className="flex-1 font-medium text-sm text-gray-800">{child.name}</span>
      <input
        type="number"
        min="0.1"
        step="0.1"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        placeholder={`${globalRate} (גלובלי)`}
        className="w-24 rounded-xl border-2 border-gray-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none text-center"
        dir="ltr"
      />
      <button
        onClick={() => onUpdate(rate ? parseFloat(rate) : null)}
        className="px-3 py-1.5 bg-indigo-500 text-white rounded-xl text-xs font-semibold hover:bg-indigo-600 transition-colors"
      >
        שמור
      </button>
    </div>
  )
}
