import { useApp } from '../context/AppContext.jsx'
import ChildCard from './ChildCard.jsx'
import Button from './ui/Button.jsx'
import { formatNumber } from '../lib/utils.js'

// Particles spread around the dead-space of the header (avoiding center pig & corner buttons)
const PARTICLES = [
  { e: '⭐', l: '7%',  t: '44%', s: 16, d: 0,    dur: 3.5 },
  { e: '🪙', l: '13%', t: '20%', s: 14, d: 1.4,  dur: 4.1 },
  { e: '⭐', l: '19%', t: '72%', s: 12, d: 2.8,  dur: 3.8 },
  { e: '🪙', l: '4%',  t: '76%', s: 13, d: 0.6,  dur: 4.4 },
  { e: '⭐', l: '84%', t: '38%', s: 15, d: 0.3,  dur: 3.6 },
  { e: '🪙', l: '91%', t: '62%', s: 13, d: 2.0,  dur: 4.0 },
  { e: '⭐', l: '78%', t: '76%', s: 11, d: 3.2,  dur: 3.9 },
  { e: '🪙', l: '93%', t: '16%', s: 14, d: 1.8,  dur: 4.2 },
  { e: '⭐', l: '30%', t: '7%',  s: 11, d: 1.6,  dur: 3.3 },
  { e: '🪙', l: '66%', t: '5%',  s: 11, d: 2.5,  dur: 4.6 },
  { e: '⭐', l: '3%',  t: '30%', s: 10, d: 3.8,  dur: 4.8 },
  { e: '🪙', l: '96%', t: '38%', s: 10, d: 0.9,  dur: 3.7 },
]

const ONBOARDING_FEATURES = [
  { e: '⭐', t: 'מטלות וכוכבים' },
  { e: '🎁', t: 'מימוש פרסים' },
  { e: '🏦', t: 'חסכון עם ריבית' },
  { e: '🔄', t: 'סנכרון משפחתי' },
]

export default function HomeScreen() {
  const { children, navigate, showModal } = useApp()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 px-5 pt-6 pb-10 text-white rounded-b-[2.5rem] shadow-lg">
        {/* Floating stars & coins */}
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute pointer-events-none select-none"
            style={{
              left: p.l, top: p.t,
              fontSize: p.s,
              animationName: 'particle-float',
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.d}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              opacity: 0.72,
            }}
          >{p.e}</span>
        ))}
        {/* Top row — action buttons */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate('settings')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 transition-all text-xl"
            aria-label="הגדרות"
          >
            ⚙️
          </button>
          <button
            onClick={() => showModal('addChild')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 transition-all text-2xl font-bold leading-none"
            aria-label="הוסף ילד"
          >
            +
          </button>
        </div>

        {/* Hero — pig + title */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-3">
            <div className="absolute w-20 h-20 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="relative w-16 h-16 rounded-full bg-white/20 ring-2 ring-white/35 flex items-center justify-center shadow-inner">
              <span className="text-4xl animate-float">🐷</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">הארנק שלי</h1>
          <p className="text-sm text-white/65 mt-0.5">כסף חכם לילדים 💡</p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 dot-grid -mt-4">
        {children.length === 0 ? (
          /* ── Onboarding ─────────────────────────────────────────── */
          <div className="flex flex-col items-center gap-5 text-center animate-fade-in pt-4">
            <div className="text-8xl animate-float">🐷</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">ברוכים הבאים!</h2>
              <p className="text-gray-500 leading-relaxed text-sm">
                הארנק החכם לילדים —<br />מטלות, כוכבים, חסכון ופרסים
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {ONBOARDING_FEATURES.map(({ e, t }) => (
                <div key={t} className="bg-white rounded-2xl p-3 flex items-center gap-2.5 shadow-sm text-right">
                  <span className="text-2xl flex-shrink-0">{e}</span>
                  <span className="text-sm font-semibold text-gray-700">{t}</span>
                </div>
              ))}
            </div>

            <Button size="lg" fullWidth onClick={() => showModal('addChild')}>
              🚀 בואו נתחיל — הוסף ילד ראשון
            </Button>
          </div>
        ) : (
          /* ── Children list ──────────────────────────────────────── */
          <>
            <p className="text-sm text-gray-500 mb-3 font-medium animate-fade-in">
              {children.length} {children.length === 1 ? 'ילד' : 'ילדים'}
            </p>
            <div className="flex flex-col gap-4">
              {children.map((child, i) => (
                <div
                  key={child.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                >
                  {/* Child card */}
                  <ChildCard child={child} index={i} />

                  {/* Quick action strip */}
                  <div className="flex gap-2 mt-1.5 px-1">
                    <button
                      onClick={() => showModal('addStars', { childId: child.id, allowFreeEntry: false })}
                      className="flex-1 bg-white rounded-2xl shadow-sm border border-amber-200 border-b-[3px] border-b-amber-400 px-3 py-2 flex items-center justify-center gap-1.5 text-sm font-bold text-amber-600 active:scale-95 active:shadow-inner transition-all"
                    >
                      <span>⭐</span>
                      <span>מטלה מהירה</span>
                    </button>
                    <button
                      onClick={() => showModal('addMoney', { childId: child.id })}
                      className="flex-1 bg-white rounded-2xl shadow-sm border border-emerald-200 border-b-[3px] border-b-emerald-400 px-3 py-2 flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-600 active:scale-95 active:shadow-inner transition-all"
                    >
                      <span>💵</span>
                      <span>הפקדה מהירה</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
