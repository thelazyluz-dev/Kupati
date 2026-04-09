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

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {children.length === 0 && (
          <p className="text-center text-gray-400 py-6 text-sm">אין ילדים</p>
        )}
        {children.map((child) => (
          <div
            key={child.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0"
          >
            <span className="text-2xl">{child.avatar}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{child.name}</p>
              <p className="text-xs text-gray-400">
                {child.starBalance}⭐ · {child.shekelBalance}₪
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  showModal('editChild', child)
                }}
                className="text-gray-400 hover:text-indigo-500 text-lg transition-colors"
              >
                ✏️
              </button>
              <button
                onClick={() => navigate('dashboard', child.id)}
                className="text-gray-400 hover:text-indigo-500 text-lg transition-colors"
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
