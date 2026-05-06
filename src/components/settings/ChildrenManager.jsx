import { useApp } from '../../context/AppContext.jsx'
import Button from '../ui/Button.jsx'

export default function ChildrenManager() {
  const { children, showModal, navigate } = useApp()

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-700">👶 ניהול ילדים</h3>
        <Button size="sm" onClick={() => showModal('addChild')}>
          + הוסף
        </Button>
      </div>

      <div
        className="rounded-[24px] overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(255,255,255,0.75)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,0.95)',
        }}
      >
        {children.length === 0 && (
          <p className="text-center text-gray-400 py-6 text-sm">אין ילדים</p>
        )}
        {children.map((child) => (
          <div
            key={child.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: '1px solid rgba(229,231,235,0.5)' }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: 'rgba(243,244,246,0.8)', border: '2px solid rgba(209,213,219,0.5)', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
            >
              {child.avatarImage
                ? <img src={child.avatarImage} alt={child.name} className="w-full h-full object-cover" />
                : <span className="text-xl">{child.avatar}</span>}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{child.name}</p>
              <p className="text-xs text-gray-400">
                {child.starBalance}⭐ · {child.shekelBalance}₪
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => showModal('editChild', child)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-indigo-500 transition-colors active:scale-90 text-base"
                style={{ background: 'rgba(243,244,246,0.8)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                ✏️
              </button>
              <button
                onClick={() => navigate('dashboard', child.id)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-indigo-500 transition-colors active:scale-90 text-base font-bold"
                style={{ background: 'rgba(243,244,246,0.8)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
