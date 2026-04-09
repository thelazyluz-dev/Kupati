export default function EmojiPicker({ options, value, onChange, label }) {
  return (
    <div>
      {label && (
        <p className="text-sm font-semibold text-gray-600 mb-2">{label}</p>
      )}
      <div className="grid grid-cols-6 gap-2">
        {options.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={[
              'w-11 h-11 text-2xl flex items-center justify-center rounded-2xl transition-all',
              value === emoji
                ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110'
                : 'bg-gray-100 hover:bg-gray-200',
            ].join(' ')}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
