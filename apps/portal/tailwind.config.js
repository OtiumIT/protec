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
        brand: {
          DEFAULT: '#32CD32',
          dark: '#28a428',
          light: '#7CFC00',
        },
        'otium-black': '#000000',
        'otium-dark': '#2d2d2d',
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
