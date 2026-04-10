/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'progress-fill':  'progress-fill 0.7s ease-in-out forwards',
        'bounce-in':      'bounce-in 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'pulse-gold':     'pulse-gold 1.5s ease-in-out infinite',
        'pulse-ring':     'pulse-ring 2s ease-out infinite',
        'fade-in':        'fade-in 0.2s ease-out',
        'fade-out':       'fade-out 0.2s ease-in forwards',
        'float':          'float 3s ease-in-out infinite',
        'wiggle':         'wiggle 0.4s ease-in-out',
        'slide-up':       'slide-up 0.28s cubic-bezier(0.22,1,0.36,1)',
        'slide-down':     'slide-down 0.22s ease-in forwards',
        'pop':            'pop 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        'star-burst':     'star-burst 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        'spin-slow':      'spin 8s linear infinite',
        'shimmer':        'shimmer 2.2s linear infinite',
        'glow-amber':     'glow-amber 2s ease-in-out infinite',
        'tab-in':         'tab-in 0.18s ease-out',
      },
      keyframes: {
        'progress-fill': {
          from: { width: '0%' },
          to: { width: 'var(--progress-width)' },
        },
        'bounce-in': {
          from: { opacity: '0', transform: 'scale(0.85) translateY(16px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(251,191,36,0.4)' },
          '50%':      { boxShadow: '0 0 0 10px rgba(251,191,36,0)' },
        },
        'pulse-ring': {
          '0%':   { boxShadow: '0 0 0 0 rgba(99,102,241,0.5)' },
          '70%':  { boxShadow: '0 0 0 14px rgba(99,102,241,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to:   { opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        'wiggle': {
          '0%':   { transform: 'scale(1)' },
          '30%':  { transform: 'scale(1.2)' },
          '60%':  { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to:   { opacity: '0', transform: 'translateY(60px)' },
        },
        'pop': {
          from: { opacity: '0', transform: 'scale(0.7)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'star-burst': {
          '0%':   { opacity: '0', transform: 'scale(0) rotate(-20deg)' },
          '60%':  { opacity: '1', transform: 'scale(1.25) rotate(8deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-amber': {
          '0%, 100%': { boxShadow: '0 4px 14px rgba(251,146,60,0.25), 0 0 0 0 rgba(251,146,60,0.2)' },
          '50%':      { boxShadow: '0 4px 22px rgba(251,146,60,0.5), 0 0 0 8px rgba(251,146,60,0)' },
        },
        'tab-in': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
