import { useApp } from '../context/AppContext.jsx'
import ChildCard from './ChildCard.jsx'
import Button from './ui/Button.jsx'

export default function HomeScreen() {
  const { children, navigate, showModal } = useApp()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-500 to-purple-600 px-5 pt-8 pb-6 text-white">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('settings')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-xl"
            aria-label="הגדרות"
          >
            ⚙️
          </button>
          <div className="text-center">
            <div className="text-4xl mb-1">🐷</div>
            <h1 className="text-2xl font-bold">הארנק שלי</h1>
          </div>
          {/* Spacer to balance layout */}
          <div className="w-10" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-5">
        {children.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center min-h-64 gap-5 text-center">
            <div className="text-7xl">🐷</div>
            <div>
              <p className="text-xl font-bold text-gray-700 mb-1">
                הארנק ריק!
              </p>
              <p className="text-gray-500">הוסף ילד ראשון כדי להתחיל</p>
            </div>
            <Button size="lg" onClick={() => showModal('addChild')}>
              + הוסף ילד ראשון
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4 font-medium">
              {children.length} {children.length === 1 ? 'ילד' : 'ילדים'}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {children.map((child, i) => (
                <ChildCard key={child.id} child={child} index={i} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* FAB — bottom left (logical start in RTL) */}
      {children.length > 0 && (
        <div className="fixed bottom-6 end-6">
          <button
            onClick={() => showModal('addChild')}
            className="w-14 h-14 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white rounded-full shadow-xl flex items-center justify-center text-3xl transition-all"
            aria-label="הוסף ילד"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
