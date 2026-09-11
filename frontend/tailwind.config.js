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
        city: {
          950: '#06080d',
          900: '#0b0f17',
          850: '#101622',
          800: '#161e2e',
          700: '#212c40',
          border: 'rgba(255, 255, 255, 0.08)',
          card: 'rgba(16, 22, 34, 0.75)',
        },
        risk: {
          low: '#10b981',       // Emerald
          medium: '#f59e0b',    // Amber
          high: '#ef4444',      // Red
          critical: '#991b1b',  // Dark Red
        },
        cyber: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          violet: '#7f00ff',
          neon: '#39ff14',
        }
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Syne', 'Space Grotesk', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': 'radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px)',
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 242, 254, 0.25)',
        'glow-crimson': '0 0 25px -5px rgba(239, 68, 68, 0.3)',
        'card-hud': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      }
    },
  },
  plugins: [],
}
