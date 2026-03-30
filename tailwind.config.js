/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette MAPO by EDUFREM
        primary: {
          50:  '#eef6ff',
          100: '#d9ebff',
          200: '#bbdaff',
          300: '#8ec2ff',
          400: '#59a0ff',
          500: '#2f7bff',
          600: '#1a5cf5',
          700: '#1346e1',
          800: '#1639b6',
          900: '#18358f',
          950: '#131f57',
        },
        secondary: {
          50:  '#fdf8ee',
          100: '#faefd0',
          200: '#f4db9e',
          300: '#edc16a',
          400: '#e7a840',
          500: '#df8c25',
          600: '#c56c1a',
          700: '#a44f18',
          800: '#863e1a',
          900: '#6e3419',
          DEFAULT: '#df8c25',
        },
        surface: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

