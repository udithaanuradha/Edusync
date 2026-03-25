 /** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f172a',
          blue: '#003366',
          teal: '#005b96',
          gradientStart: '#002244',
          gradientEnd: '#004d99',
        }
      }
    },
  },
  plugins: [],
}