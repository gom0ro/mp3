export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        green: { 400: '#1DB954', 500: '#1AA34A', 600: '#168D40' },
        surface: '#121212',
        card: '#181818',
        elevated: '#282828',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
