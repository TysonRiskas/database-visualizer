/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        uvu: {
          green: '#275D38',
          darkgreen: '#1b4327',
          lightgreen: '#327D4B',
          accent: '#00843D',
          gold: '#D4AF37',
          warmgold: '#C69214',
          bg: '#F8FAFC',
          card: '#FFFFFF',
          surface: '#F1F5F9',
          border: '#E2E8F0',
          text: '#0F172A',
          muted: '#64748B',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce-subtle 2s infinite',
        'laser-scan': 'laserScan 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
