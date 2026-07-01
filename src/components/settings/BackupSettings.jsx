import { useRef, useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { exportAll, importAll } from '../../lib/storage.js'
import { setLocalTs } from '../../lib/syncEngine.js'
import { computeBalanceFromTransactions, formatNumber } from '../../lib/utils.js'
import Button from '../ui/Button.jsx'

/**
 * Backup & data-health tools:
 *  - Export all data as JSON (existing behaviour, moved here)
 *  - Restore from a backup file (with preview + PIN + confirm)
 *  - Balance audit: compares stored balances to what the transaction
 *    history says, with one-tap fix per child
 */
export default function BackupSettings() {
  const { children, getTransactions, recalculateBalance, requirePin } = useApp()
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)   // { data, childCount, txCount, error }
  const [audit, setAudit]     = useState(null)   // [{ id, name, stars, shekels, expStars, expShekels, drift }]

  function handleExport() {
    const data = exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kupati-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFilePicked(e) {
    const file = e.target.files?.[0]
    e.target.value = ''   // allow re-picking the same file
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('bad')
        const kids = Array.isArray(data.children) ? data.children : []
        const txCount = Object.values(data.all_transactions || {})
          .reduce((s, list) => s + (Array.isArray(list) ? list.length : 0), 0)
        if (kids.length === 0 && txCount === 0 && !data.settings) throw new Error('bad')
        setPreview({ data, childCount: kids.length, names: kids.map(c => c.name).join(', '), txCount, error: null })
      } catch {
        setPreview({ data: null, error: 'הקובץ אינו גיבוי תקין של קופתי' })
      }
    }
    reader.readAsText(file)
  }

  function applyRestore() {
    requirePin(() => {
      importAll(preview.data)
      // Stamp overwrite-keys as "just written locally" so a sync attach()
      // won't immediately clobber the restored data with older remote state.
      const now = Date.now()
      ;['children', 'chores', 'settings'].forEach((k) => setLocalTs(k, now))
      window.location.reload()
    })
  }

  function runAudit() {
    const rows = children.map((c) => {
      const exp = computeBalanceFromTransactions(getTransactions(c.id))
      return {
        id: c.id, name: c.name,
        stars: c.starBalance, shekels: c.shekelBalance,
        expStars: exp.stars, expShekels: exp.shekels,
        drift: Math.abs(exp.stars - c.starBalance) > 0.01 || Math.abs(exp.shekels - c.shekelBalance) > 0.01,
      }
    })
    setAudit(rows)
  }

  return (
    <div className="space-y-3">
      {/* Export */}
      <Button variant="secondary" fullWidth onClick={handleExport}>
        📥 ייצא גיבוי (JSON)
      </Button>

      {/* Import */}
      <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFilePicked} />
      <Button variant="secondary" fullWidth onClick={() => fileRef.current?.click()}>
        📤 שחזר מגיבוי
      </Button>

      {preview?.error && (
        <p className="text-xs text-red-500 text-center font-semibold">{preview.error}</p>
      )}

      {preview?.data && (
        <div className="rounded-2xl p-3 space-y-2 animate-pop"
          style={{ background: 'rgba(254,249,195,0.6)', border: '1.5px solid rgba(250,204,21,0.5)' }}>
          <p className="text-sm font-bold text-amber-800">⚠️ שחזור ידרוס את הנתונים הנוכחיים</p>
          <p className="text-xs text-gray-600">
            בקובץ: {preview.childCount} ילדים ({preview.names}) · {preview.txCount} תנועות
          </p>
          <div className="flex gap-2">
            <Button variant="danger" fullWidth size="sm" onClick={applyRestore}>
              שחזר עכשיו
            </Button>
            <Button variant="secondary" fullWidth size="sm" onClick={() => setPreview(null)}>
              ביטול
            </Button>
          </div>
        </div>
      )}

      {/* Balance audit */}
      <div className="border-t border-gray-100 pt-3">
        <Button variant="ghost" fullWidth onClick={runAudit} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
          🩺 בדיקת עקביות יתרות
        </Button>
        <p className="text-xs text-gray-400 text-center mt-1.5">
          משווה את היתרה השמורה למה שיוצא מחישוב כל התנועות
        </p>
      </div>

      {audit && (
        <div className="space-y-2">
          {audit.map((row) => (
            <div key={row.id} className="rounded-2xl px-3 py-2.5 flex items-center justify-between"
              style={{
                background: row.drift ? 'rgba(254,226,226,0.7)' : 'rgba(209,250,229,0.6)',
                border: `1.5px solid ${row.drift ? 'rgba(252,165,165,0.6)' : 'rgba(110,231,183,0.5)'}`,
              }}>
              <div>
                <p className="text-sm font-bold text-gray-800">{row.drift ? '⚠️' : '✅'} {row.name}</p>
                {row.drift ? (
                  <p className="text-xs text-gray-500" dir="ltr">
                    ⭐ {formatNumber(row.stars)} → {formatNumber(row.expStars)} · ₪ {formatNumber(row.shekels)} → {formatNumber(row.expShekels)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">היתרה תואמת להיסטוריה</p>
                )}
              </div>
              {row.drift && (
                <button
                  type="button"
                  onClick={() => requirePin(() => { recalculateBalance(row.id); runAudit() })}
                  className="px-3 py-1.5 rounded-xl text-xs font-black text-white active:scale-95 transition-all flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                  תקן
                </button>
              )}
            </div>
          ))}
          {audit.some(r => r.drift) && (
            <p className="text-[11px] text-gray-400 leading-snug">
              שים לב: תיקון ידני של יתרה (במסך עריכת ילד) לא נרשם כתנועה — במקרה כזה
              ה"תיקון" כאן יחזיר את היתרה למה שיוצא מהתנועות בלבד.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
