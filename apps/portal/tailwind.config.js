/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
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
          DEFAULT: '#1351b4',
          dark: '#0c326f',
          light: '#ebf5ff',
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
