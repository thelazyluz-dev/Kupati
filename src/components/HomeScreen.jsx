import { useApp } from '../context/AppContext.jsx'
import ChildCard from './ChildCard.jsx'
import Button from './ui/Button.jsx'

export default function HomeScreen() {
  const { children, navigate, showModal } = useApp()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-500 to-purple-600 px-5 pt-8 pb-10 text-white rounded-b-[2.5rem] shadow-lg">
        <div className="flex items-center justify-between">
          {/* Settings */}
          <button
            onClick={() => navigate('settings')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 transition-all text-xl"
            aria-label="הגדרות"
          >
            ⚙️
          </button>

          {/* Pig + title */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center mb-2">
              {/* Outer glow ring */}
              <div className="absolute w-20 h-20 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '3s' }} />
              {/* Avatar circle */}
              <div className="relative w-16 h-16 rounded-full bg-white/20 ring-2 ring-white/35 flex items-center justify-center shadow-inner">
                <span className="text-4xl animate-float">🐷</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">הארנק שלי</h1>
            <p className="text-sm text-white/65 mt-0.5">כסף חכם לילדים 💡</p>
          </div>

          {/* Add child */}
          <button
            onClick={() => showModal('addChild')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 transition-all text-2xl font-bold leading-none"
            aria-label="הוסף ילד"
          >
            +
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5 dot-grid -mt-4">
        {children.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center min-h-64 gap-5 text-center animate-fade-in pt-8">
            <div className="text-7xl animate-float">🐷</div>
            <div>
              <p className="text-xl font-bold text-gray-700 mb-1">הארנק ריק!</p>
              <p className="text-gray-500">הוסף ילד ראשון כדי להתחיל</p>
            </div>
            <Button size="lg" onClick={() => showModal('addChild')}>
              + הוסף ילד ראשון
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4 font-medium animate-fade-in">
              {children.length} {children.length === 1 ? 'ילד' : 'ילדים'}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {children.map((child, i) => (
                <div
                  key={child.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                >
                  <ChildCard child={child} index={i} />
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
