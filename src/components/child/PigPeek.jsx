// A little pig that peeks up from a bottom corner every few seconds — ambient charm.
export default function PigPeek({ corner = 'left' }) {
  return (
    <div className="fixed bottom-0 z-30 pointer-events-none overflow-hidden"
      style={{ [corner]: 6, width: 44, height: 40 }}>
      <div className="pig-peek text-3xl" style={{ transform: 'translateY(115%)' }}>🐷</div>
    </div>
  )
}
