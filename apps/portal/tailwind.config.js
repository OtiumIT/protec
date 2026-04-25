/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.css",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      maxWidth: {
        '5xl': '80rem',
      },
      colors: {
        /** Cor principal do app (login + área logada): azul alinhado à landing */
        brand: {
          DEFAULT: '#4f46e5',
          dark: '#4338ca',
          light: '#818cf8',
        },
        'otium-black': '#000000',
        'otium-dark': '#2d2d2d',
        /** Protec: azul navy (consistente com landing) */
        protec: {
          DEFAULT: '#1e3a5f',
          dark: '#0f172a',
          light: '#e0e7ff',
        },
        /** Landing: azul marinho profundo + laranja CTA (high contrast) */
        landing: {
          primary: '#1e293b',
          navy: '#0f172a',
          'navy-light': '#1e3a5f',
          accent: '#4f46e5',
          'accent-hover': '#4338ca',
          'accent-light': '#818cf8',
          cta: '#ea580c',
        },
        /** Fundo do canvas da área logada (nome plano: bg-app-canvas) */
        'app-canvas': '#f8fafc',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 4px 12px -2px rgb(15 23 42 / 0.07)',
        'card-hover': '0 2px 4px 0 rgb(0 0 0 / 0.05), 0 8px 20px -4px rgb(15 23 42 / 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
