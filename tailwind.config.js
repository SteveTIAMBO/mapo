/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MAPO by EDUFREM — palette inspirée ARIS, adaptée bleu
        pr: {
          DEFAULT: '#1558B0',
          dark: '#0E3F7E',
          light: 'rgba(21,88,176,.11)',
          glow: 'rgba(21,88,176,.18)',
        },
        gold: {
          DEFAULT: '#B8892A',
          light: 'rgba(184,137,42,.13)',
          dark: '#9A711F',
        },
        bg: '#EDEAE3',
        gl: 'rgba(255,255,255,.68)',
        gl2: 'rgba(255,255,255,.9)',
        glb: 'rgba(255,255,255,.52)',
        tx: '#161E18',
        tx2: '#546058',
        tx3: '#98ADA5',
        danger: { DEFAULT: '#D93025', light: 'rgba(217,48,37,.1)' },
        warn: { DEFAULT: '#C96B10', light: 'rgba(201,107,16,.1)' },
        info: { DEFAULT: '#1558B0', light: 'rgba(21,88,176,.1)' },
        success: { DEFAULT: '#0C7A52', light: 'rgba(12,122,82,.1)' },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        btn: '14px',
        xs: '10px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(14,30,20,.07)',
        lg: '0 16px 56px rgba(14,30,20,.1)',
        btn: '0 2px 12px rgba(21,88,176,.18)',
      },
      backdropBlur: {
        glass: '24px',
      },
    },
  },
  plugins: [],
}
