/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: { 900: '#0f1117', 800: '#161b27', 700: '#1e2535', 600: '#252d3d' },
      }
    }
  },
  plugins: [],
}
