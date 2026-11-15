/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#18382F', 700: '#254B3F', 500: '#587267', 300: '#93A69B' },
        brand: { DEFAULT: '#18785E', dark: '#125F4B', soft: '#E7F1EB' },
        canvas: '#F5F6F0',
        surface: '#FFFEFA',
        line: '#DEE6DC',
        critical: '#C43D3D',
        high: '#D46A31',
        medium: '#B47B16',
        low: '#2E8058',
      },
      fontFamily: {
        display: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(24,56,47,.05), 0 6px 20px rgba(24,56,47,.06)',
        lift: '0 14px 40px rgba(24,56,47,.14)',
      },
      borderRadius: { xl2: '1.125rem' },
    },
  },
  plugins: [],
}
