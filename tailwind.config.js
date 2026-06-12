/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#191919',
        canvas: '#ffffff',
        subtle: '#f2f2f2',
        accent: '#1e88e5',
        positive: '#22c55e',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
