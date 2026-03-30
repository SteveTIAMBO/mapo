/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#EDEAE3',
        pr: {
          DEFAULT: '#1558B0',
          dark: '#0E3F7E',
          light: 'rgba(21,88,176,.08)',
        },
        sidebar: '#0C2D5A',
        gold: { DEFAULT: '#B8892A', light: 'rgba(184,137,42,.1)' },
        tx: '#1A1D1F',
        tx2: '#6F767E',
        tx3: '#9A9FA5',
        card: '#FFFFFF',
        divider: '#EAEAEA',
        danger: { DEFAULT: '#D93025', light: 'rgba(217,48,37,.08)' },
        warn:   { DEFAULT: '#E8950A', light: 'rgba(232,149,10,.08)' },
        info:   { DEFAULT: '#1558B0', light: 'rgba(21,88,176,.08)' },
        success:{ DEFAULT: '#1B8A5A', light: 'rgba(27,138,90,.08)' },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        btn: '100px',
        input: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03)',
        sm: '0 1px 2px rgba(0,0,0,.05)',
      },
    },
  },
  plugins: [],
}
