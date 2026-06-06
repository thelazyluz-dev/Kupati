import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'

function generateFamilyCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

async function shareCode(code) {
  const text = `קוד המשפחה שלנו בקופתי: ${code}\nפתח את האפליקציה ולחץ "כניסה כילד"`
  if (navigator.share) {
    try { await navigator.share({ text }) } catch {}
  } else {
    try {
      await navigator.clipboard.writeText(code)
      return true // copied
    } catch {}
  }
  return false
}

function ProgressDots({ step, total }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === step ? 24 : 10,
            background: i === step ? '#6366f1' : i < step ? '#c7d2fe' : '#e5e7eb',
          }} />
      ))}
    </div>
  )
}

function Slide({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'linear-gradient(160deg,#f0f4ff 0%,#fff7ed 55%,#f0fdf4 100%)' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-5 my-4"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 32,
          border: '2px solid rgba(255,255,255,0.9)',
          boxShadow: '0 20px 60px rgba(99,102,241,0.14),0 4px 16px rgba(0,0,0,0.06)',
          padding: '32px 28px 28px',
        }}>
        {children}
      </div>
    </div>
  )
}

export default function OnboardingFlow({ onDone }) {
  const { settings, updateSettings } = useApp()
  const [step, setStep] = useState(0)
  const [tempCode, setTempCode] = useState('')
  const [copied, setCopied] = useState(false)
  const displayCode = settings.familyCode || tempCode

  function handleChildPhoneYes() {
    let code = settings.familyCode
    if (!code) {
      code = generateFamilyCode()
      setTempCode(code)
      updateSettings({ familyCode: code })
    }
    setStep(2)
  }

  function finish(childMode) {
    updateSettings({ onboardingDone: true, childModeEnabled: childMode })
    onDone()
  }

  async function handleShare() {
    const wasCopied = await shareCode(displayCode)
    if (wasCopied) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (step === 0) {
    return (
      <Slide>
        <ProgressDots step={0} total={3} />
        <div className="text-center">
          <div className="text-6xl mb-2">🎉</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">ברוכים הבאים לקופתי!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            קופתי עוזר לכם לנהל את כסף הילדים, לעקוב אחר מטלות ולחנך לניהול כסף חכם.
          </p>
        </div>

        <div className="w-full space-y-2">
          {[
            { icon: '💰', text: 'הפקידו כסף ועקבו אחר חסכונות' },
            { icon: '⭐', text: 'תנו כוכבים על מטלות ובונוסים' },
            { icon: '🎯', text: 'הגדירו מטרות וחסכו לקראתן' },
            { icon: '👨‍👩‍👧‍👦', text: 'סנכרנו בין כל בני המשפחה בזמן אמת' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
              style={{ background: 'rgba(243,244,246,0.9)', border: '1.5px solid rgba(229,231,235,0.7)' }}>
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-semibold text-gray-700">{text}</span>
            </div>
          ))}
        </div>

        <button onClick={() => setStep(1)} className="w-full py-4 rounded-2xl font-black text-white text-base active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 6px 22px rgba(99,102,241,0.4)' }}>
          בואו נתחיל →
        </button>
      </Slide>
    )
  }

  if (step === 1) {
    return (
      <Slide>
        <ProgressDots step={1} total={3} />
        <div className="text-center">
          <div className="text-5xl mb-2">📱</div>
          <h2 className="text-xl font-black text-gray-800 mb-2">האם לילדים יש טלפון משלהם?</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            קופתי יכול לעבוד גם כאפליקציית ילד — הילד רואה רק את הנתונים שלו ויכול לבקש אישור מטלות מהורה
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button onClick={handleChildPhoneYes}
            className="w-full py-4 rounded-2xl font-bold text-white text-base active:scale-95 transition-all flex items-center justify-center gap-3"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 6px 22px rgba(16,185,129,0.35)' }}>
            <span className="text-xl">✅</span> כן, הילדים ישתמשו בטלפון שלהם
          </button>
          <button onClick={() => finish(false)}
            className="w-full py-4 rounded-2xl font-bold text-gray-600 text-base border-2 border-gray-200 active:scale-95 transition-all flex items-center justify-center gap-3 bg-gray-50">
            <span className="text-xl">📵</span> לא, רק אני (ההורה) משתמש
          </button>
        </div>

        <button onClick={() => setStep(0)} className="text-sm text-gray-400 font-medium">← חזרה</button>
      </Slide>
    )
  }

  // Step 2 — show family code + share
  return (
    <Slide>
      <ProgressDots step={2} total={3} />
      <div className="text-center">
        <div className="text-5xl mb-2">🔗</div>
        <h2 className="text-xl font-black text-gray-800 mb-2">קוד המשפחה שלכם</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          שתפו את הקוד עם הילדים — הם יפתחו קופתי, ילחצו "כניסה כילד" ויקלידו אותו
        </p>
      </div>

      {/* Code display */}
      <div className="w-full rounded-2xl px-4 py-4 text-center"
        style={{ background: 'rgba(238,242,255,0.9)', border: '2px solid rgba(99,102,241,0.25)' }}>
        <p className="text-xs font-bold text-indigo-400 mb-1 tracking-wider uppercase">קוד משפחה</p>
        <p className="text-4xl font-black tracking-[0.3em] text-indigo-700" dir="ltr">{displayCode}</p>
      </div>

      {/* Share button */}
      <button onClick={handleShare}
        className="w-full py-3 rounded-2xl font-bold text-indigo-600 text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
        style={{ background: 'rgba(238,242,255,0.9)', border: '2px solid rgba(99,102,241,0.25)' }}>
        {copied ? <><span>✅</span> הועתק!</> : <><span>📤</span> שלח לילד / העתק</>}
      </button>

      {/* Instructions */}
      <div className="w-full space-y-1.5">
        {[
          { icon: '👶', text: 'הילד פותח קופתי בטלפון שלו' },
          { icon: '🔑', text: 'לוחץ "כניסה כילד" ומקליד את הקוד' },
          { icon: '👁️', text: 'רואה רק את הנתונים שלו' },
          { icon: '📝', text: 'יכול לבקש אישור מטלות מהורה' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
            <span className="text-base">{icon}</span>
            <span className="text-xs font-medium text-gray-600">{text}</span>
          </div>
        ))}
      </div>

      <button onClick={() => finish(true)} className="w-full py-4 rounded-2xl font-black text-white text-base active:scale-95 transition-all"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 6px 22px rgba(99,102,241,0.4)' }}>
        הבנתי, נתחיל! ✓
      </button>
    </Slide>
  )
}
