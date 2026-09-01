import { useState } from 'react'
import { get, set } from '../../lib/storage.js'
import CodeGate from './CodeGate.jsx'

// Lets a child on a shared tablet switch to a sibling's account WITHOUT
// re-entering the family code — only the target child's personal code.
// Staying within child mode, so the parent PIN is never involved.
export default function ChildSwitcher({ children, currentChildId, onClose }) {
  const [gateChild, setGateChild] = useState(null)

  function switchTo(child) {
    const childMode = get('childMode') || {}
    set('childMode', { ...childMode, childId: child.id, childName: child.name })
    window.location.reload()
  }

  function pick(child) {
    if (child.id === currentChildId) { onClose(); return }
    if (child.accessCode) setGateChild(child)
    else switchTo(child)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(160deg,#eef2ff,#faf5ff)' }}>
      <div className="flex-shrink-0 flex items-center gap-2 px-5 pt-12 pb-4"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
        <h1 className="text-lg font-black text-gray-800 flex-1">👋 מי משתמש עכשיו?</h1>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold text-gray-500 active:scale-90"
          style={{ background: 'rgba(243,244,246,0.9)' }}>×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="w-full flex flex-col gap-2 max-w-sm mx-auto">
          {children.map((child) => {
            const isCurrent = child.id === currentChildId
            return (
              <button key={child.id} onClick={() => pick(child)}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl active:scale-95 transition-all"
                style={{ background: isCurrent ? 'rgba(224,231,255,0.95)' : 'rgba(238,242,255,0.9)', border: `2px solid ${isCurrent ? 'rgba(99,102,241,0.45)' : 'rgba(99,102,241,0.15)'}` }}>
                {child.avatarImage
                  ? <img src={child.avatarImage} alt={child.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  : <span className="text-3xl flex-shrink-0">{child.avatar || '🦁'}</span>}
                <span className="text-lg font-black text-gray-800">{child.name}</span>
                {child.accessCode && <span className="text-sm">🔒</span>}
                {isCurrent
                  ? <span className="mr-auto text-xs font-bold text-indigo-500 bg-white/70 rounded-full px-2 py-0.5">מחובר</span>
                  : <span className="mr-auto text-indigo-400 text-xl leading-none">›</span>}
              </button>
            )
          })}
        </div>
      </div>

      {gateChild && (
        <CodeGate child={gateChild} onSuccess={() => switchTo(gateChild)} onCancel={() => setGateChild(null)} />
      )}
    </div>
  )
}
