/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"EB Garamond"', '"Cormorant"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        parchment: '#f0e3c4',
        sepia: '#6b4f2a',
        'pin-home': '#a02828',
        'pin-travel': '#2a5a8a',
      },
    },
  },
  plugins: [],
}

