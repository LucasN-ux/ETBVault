/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pokemon: {
          yellow: '#FFCB05',
          red: '#CC0000',
        },
        gray: {
          950: '#0a0a0f',
          850: '#1a1a2e',
        },
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
