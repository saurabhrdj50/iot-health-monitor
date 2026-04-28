/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#06131a',
          900: '#0a1a23',
          800: '#102430',
          700: '#173241',
          600: '#24495e',
          500: '#37657f',
          400: '#5a8eab',
          300: '#90b6ca',
          200: '#c4dbe6',
          100: '#e7f2f7',
        },
        dark: {
          50: '#f7f7f8',
          100: '#ebeef2',
          200: '#d0d5dd',
          300: '#9ca3af',
          400: '#6b7280',
          500: '#4b5563',
          600: '#374151',
          700: '#1f2937',
          800: '#111827',
          900: '#0b0f19',
        },
        health: {
          normal: '#22c55e',
          stress: '#f59e0b',
          risk: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        }
      }
    },
  },
  plugins: [],
}
