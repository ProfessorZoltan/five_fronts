/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          900: '#0b2f1f',
          800: '#0f3a27',
          700: '#155f3e',
        },
        gold: {
          400: '#e7c15a',
          500: '#d4a73a',
          600: '#a8822a',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pulseSoft: {
          '0%,100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 1.8s ease-in-out infinite',
        flip: 'flip 0.6s ease-in-out forwards',
      },
    },
  },
  plugins: [],
}
