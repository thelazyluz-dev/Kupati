const VARIANT_SHADOWS = {
  primary:   '0 6px 20px rgba(99,102,241,0.4), inset 0 1px 1px rgba(255,255,255,0.3)',
  secondary: '0 4px 12px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,1)',
  danger:    '0 6px 20px rgba(239,68,68,0.4), inset 0 1px 1px rgba(255,255,255,0.3)',
  ghost:     '0 2px 8px rgba(0,0,0,0.06)',
  success:   '0 6px 20px rgba(16,185,129,0.4), inset 0 1px 1px rgba(255,255,255,0.3)',
  warning:   '0 6px 20px rgba(245,158,11,0.4), inset 0 1px 1px rgba(255,255,255,0.3)',
}

const variants = {
  primary:   'bg-gradient-to-br from-indigo-500 to-violet-600 text-white border border-white/20',
  secondary: 'bg-white text-gray-700 border border-gray-200',
  danger:    'bg-gradient-to-br from-red-500 to-rose-600 text-white border border-white/20',
  ghost:     'bg-white/60 backdrop-blur-sm text-gray-700 border-2 border-gray-200',
  success:   'bg-gradient-to-br from-emerald-400 to-teal-500 text-white border border-white/20',
  warning:   'bg-gradient-to-br from-amber-400 to-orange-500 text-white border border-white/20',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-6 py-3.5 text-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  children,
  fullWidth = false,
}) {
  const v = variant in variants ? variant : 'primary'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ boxShadow: disabled ? 'none' : VARIANT_SHADOWS[v] }}
      className={[
        'rounded-2xl font-bold transition-all duration-150 inline-flex items-center justify-center gap-2 active:scale-95',
        variants[v],
        sizes[size] || sizes.md,
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-105 active:brightness-95',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
