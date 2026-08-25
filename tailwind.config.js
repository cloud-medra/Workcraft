/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0E5B6D',
          hover: '#0a4a58',
        },
      },
      keyframes: {
        progressBar: {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
        },
        'toast-in': {
          '0%': { transform: 'translateX(120%) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' },
        },
        'toast-out': {
          '0%': { transform: 'translateX(0) scale(1)', opacity: '1', maxHeight: '80px', marginBottom: '8px' },
          '100%': { transform: 'translateX(120%) scale(0.9)', opacity: '0', maxHeight: '0px', marginBottom: '0px' },
        },
      },
      animation: {
        'progress-bar': 'progressBar 3s linear forwards',
        'toast-in': 'toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'toast-out': 'toast-out 0.3s cubic-bezier(0.4, 0, 1, 1) forwards',
      },
    },
  },
  plugins: [],
}