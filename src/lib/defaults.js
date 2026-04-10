export const DEFAULT_SETTINGS = {
  globalExchangeRate: 2,
  confettiThreshold: 5,
  soundEnabled: true,
  pin: '',
}

export const DEFAULT_PRIZES = [
  { id: 'prize_1', emoji: '🍭', name: 'סוכריה על מקל',       starCost: 5  },
  { id: 'prize_2', emoji: '🍦', name: 'גלידה',               starCost: 8  },
  { id: 'prize_3', emoji: '🎮', name: 'שעה משחק מסך',        starCost: 15 },
  { id: 'prize_4', emoji: '🚴', name: 'טיול אופניים עם אבא', starCost: 20 },
  { id: 'prize_5', emoji: '🎬', name: 'בחירת סרט לערב',      starCost: 12 },
]

export const DEFAULT_CHORES = [
  { id: 'chore_1', name: 'נקיון חדר', defaultStars: 3 },
  { id: 'chore_2', name: 'שטיפת כלים', defaultStars: 2 },
  { id: 'chore_3', name: 'הכנת שולחן', defaultStars: 1 },
  { id: 'chore_4', name: 'ניקוי אמבטיה', defaultStars: 3 },
  { id: 'chore_5', name: 'קניות', defaultStars: 4 },
  { id: 'chore_6', name: 'גינון', defaultStars: 3 },
  { id: 'chore_7', name: 'ניקוי מכונית', defaultStars: 4 },
  { id: 'chore_8', name: 'עזרה בבישול', defaultStars: 2 },
]

export const CARD_GRADIENTS = [
  'from-purple-400 to-indigo-500',
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500',
]

// Named color choices a child can pick.
// `gradient` — Tailwind bg-gradient classes used on the card/dashboard.
// `from` / `to` — actual hex values for inline-style preview swatches
//  (so Tailwind purge doesn't need to see them dynamically).
export const COLOR_OPTIONS = [
  { key: 'purple',  label: 'סגול',    gradient: 'from-purple-400 to-indigo-500',  from: '#c084fc', to: '#6366f1' },
  { key: 'pink',    label: 'ורוד',    gradient: 'from-pink-400 to-rose-500',      from: '#f472b6', to: '#f43f5e' },
  { key: 'amber',   label: 'כתום',   gradient: 'from-amber-400 to-orange-500',   from: '#fbbf24', to: '#f97316' },
  { key: 'emerald', label: 'ירוק',    gradient: 'from-emerald-400 to-teal-500',   from: '#34d399', to: '#14b8a6' },
  { key: 'sky',     label: 'כחול',    gradient: 'from-sky-400 to-blue-500',       from: '#38bdf8', to: '#3b82f6' },
  { key: 'red',     label: 'אדום',    gradient: 'from-red-400 to-rose-600',       from: '#f87171', to: '#e11d48' },
  { key: 'lime',    label: 'ליים',    gradient: 'from-lime-400 to-green-500',     from: '#a3e635', to: '#22c55e' },
  { key: 'cyan',    label: 'טורקיז',  gradient: 'from-cyan-400 to-sky-500',       from: '#22d3ee', to: '#0ea5e9' },
  { key: 'fuchsia', label: 'פוקסיה',  gradient: 'from-fuchsia-400 to-purple-600', from: '#e879f9', to: '#9333ea' },
  { key: 'yellow',  label: 'צהוב',    gradient: 'from-yellow-300 to-amber-500',   from: '#fde047', to: '#f59e0b' },
]

export const AVATAR_EMOJIS = [
  '🦁', '🐯', '🐻', '🦊', '🐼', '🐨', '🐸', '🦄',
  '🐧', '🦋', '🐬', '🦕', '🦖', '🐙', '🦉', '🦚',
  '🌟', '🚀', '🎮', '🎨', '⚽', '🎸', '🍕', '🌈',
]

export const GOAL_EMOJIS = [
  '🎮', '📱', '🚲', '✈️', '🎁', '👟', '🎨', '📚',
  '🎸', '🏀', '⚽', '🎯', '🎪', '🍦', '🌈', '💎',
  '🏖️', '🎠', '🦄', '🎭', '🚗', '🎬', '🎤', '🌍',
]
