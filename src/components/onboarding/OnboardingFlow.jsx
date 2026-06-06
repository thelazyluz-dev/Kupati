import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'

function generateFamilyCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function Step({ children }) {
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
          padding: '36px 28px',
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

  if (step === 0) {
    return (
      <Step>
        <div className="text-center">
          <div className="text-6xl mb-2">🎉</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">ברוכים הבאים לקופתי!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            קופתי עוזר לכם לנהל את כסף הילדים, לעקוב אחר מטלות הבית ולחנך לניהול כסף חכם.
          </p>
        </div>

        <div className="w-full space-y-2">
          {[
            { icon: '💰', text: 'הפקידו כסף ועקבו אחר חסכונות' },
            { icon: '⭐', text: 'תנו כוכבים על מטלות ובונוסים' },
            { icon: '🎯', text: 'הגדירו מטרות וחסכו לקראתן' },
            { icon: '👨‍👩‍👧‍👦', text: 'סנכרנו בין שני ההורים בזמן אמת' },
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
          בואו נתחיל! →
        </button>
      </Step>
    )
  }

  if (step === 1) {
    return (
      <Step>
        <div className="text-center">
          <div className="text-5xl mb-2">📱</div>
          <h2 className="text-xl font-black text-gray-800 mb-2">האם לילדים יש טלפון משלהם?</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            קופתי יכול לעבוד גם כאפליקציית ילד נפרדת — הילד רואה רק את הנתונים שלו ויכול לבקש אישור מטלות, אך ההורה שולט
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
      </Step>
    )
  }

  return (
    <Step>
      <div className="text-center">
        <div className="text-5xl mb-2">🔗</div>
        <h2 className="text-xl font-black text-gray-800 mb-2">קוד המשפחה שלכם</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          שתפו את הקוד הזה עם הילדים. הם יפתחו קופתי, ילחצו "כניסה כילד" ויקלידו אותו
        </p>
      </div>

      <div className="w-full rounded-2xl px-4 py-4 text-center"
        style={{ background: 'rgba(238,242,255,0.9)', border: '2px solid rgba(99,102,241,0.25)' }}>
        <p className="text-xs font-bold text-indigo-400 mb-1 tracking-wider uppercase">קוד משפחה</p>
        <p className="text-4xl font-black tracking-[0.3em] text-indigo-700" dir="ltr">{displayCode}</p>
      </div>

      <div className="w-full space-y-2">
        {[
          { icon: '👶', text: 'הילד פותח את קופתי בטלפון שלו' },
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
    </Step>
  )
}
