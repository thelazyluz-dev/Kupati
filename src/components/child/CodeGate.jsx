import { useState } from 'react'
import { set } from '../../lib/storage.js'

// 4-digit personal-code keypad shown before a child enters/switches to their
// account, or confirms a significant action. Compares against child.accessCode;
// on a match it stamps the verification time and calls onSuccess.
export default function CodeGate({ child, onSuccess, onCancel, title }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  function check(value) {
    if (value === String(child.accessCode)) {
      try { set('childVerifiedAt', Date.now()) } catch { /* ignore */ }
      onSuccess()
    } else { setPin(''); setError('קוד שגוי') }
  }
  function push(d) {
    const n = (pin + d).slice(0, 4)
    setPin(n); setError('')
    if (n.length === 4) check(n)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-xs rounded-3xl bg-white p-6 pt-2 text-center space-y-4 overflow-hidden">
        {/* Pig strolling across the top */}
        <div className="relative h-8 -mx-2">
          <span className="pig-stroll text-2xl" style={{ bottom: 0 }}>
            <span className="pig-bob">🐷</span>
          </span>
        </div>
        <div className="text-4xl">{child.avatarImage ? '🔒' : (child.avatar || '🔒')}</div>
        <p className="font-black text-gray-800">{title || `הקוד האישי של ${child.name}`}</p>
        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 ${i < pin.length ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`} />
          ))}
        </div>
        {error && <p className="text-rose-500 text-sm font-semibold">{error}</p>}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <button key={d} onClick={() => push(String(d))}
              className="h-12 rounded-2xl bg-gray-100 text-lg font-bold text-gray-800 active:scale-90 transition-all">{d}</button>
          ))}
          <button onClick={onCancel} className="h-12 rounded-2xl text-sm font-bold text-gray-400 active:scale-90">ביטול</button>
          <button onClick={() => push('0')} className="h-12 rounded-2xl bg-gray-100 text-lg font-bold text-gray-800 active:scale-90 transition-all">0</button>
          <button onClick={() => setPin((p) => p.slice(0, -1))} className="h-12 rounded-2xl text-lg text-gray-500 active:scale-90">⌫</button>
        </div>
      </div>
    </div>
  )
}
