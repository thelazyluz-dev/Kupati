const variants = {
  primary: 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white shadow-md',
  secondary: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700',
  danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-md',
  ghost: 'bg-transparent border-2 border-gray-200 hover:bg-gray-50 text-gray-700',
  success: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-md',
  warning: 'bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-white shadow-md',
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
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-2xl font-bold transition-all duration-150 inline-flex items-center justify-center gap-2 active:scale-95',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
