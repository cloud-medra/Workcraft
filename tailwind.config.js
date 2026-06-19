/** @type {import('tailwindcss').Config} */
export default {
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
      },
      animation: {
        'progress-bar': 'progressBar 3s linear forwards',
      },
    },
  },
  plugins: [],
}