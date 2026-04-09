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
        'progress-fill': 'progress-fill 0.7s ease-in-out forwards',
        'bounce-in': 'bounce-in 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        'pulse-gold': 'pulse-gold 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'wiggle': 'wiggle 0.4s ease-in-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'pop': 'pop 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        'progress-fill': {
          from: { width: '0%' },
          to: { width: 'var(--progress-width)' },
        },
        'bounce-in': {
          from: { opacity: '0', transform: 'scale(0.8)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(251,191,36,0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(251,191,36,0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'wiggle': {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.2)' },
          '60%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          from: { opacity: '0', transform: 'scale(0.7)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
