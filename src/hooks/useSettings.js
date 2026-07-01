import { useLocalStorage } from './useLocalStorage.js'
import { DEFAULT_SETTINGS } from '../lib/defaults.js'

export function useSettings() {
  const [settings, setSettings] = useLocalStorage('settings', DEFAULT_SETTINGS)

  function updateSettings(updates) {
    setSettings((prev) => {
      const next = { ...prev, ...updates }
      // Sanitize: never allow 0 or NaN exchange rate
      if (!next.globalExchangeRate || next.globalExchangeRate <= 0) {
        next.globalExchangeRate = DEFAULT_SETTINGS.globalExchangeRate
      }
      return next
    })
  }

  return { settings, updateSettings }
}
