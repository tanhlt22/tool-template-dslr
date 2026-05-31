/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#090d16", // Deep space dark
        cardBg: "rgba(17, 24, 39, 0.7)", // Glassmorphism container background
        accentIndigo: "#6366f1",
        accentPink: "#ec4899",
        accentCyan: "#22d3ee",
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-indigo': '0 0 15px rgba(99, 102, 241, 0.4)',
        'glow-pink': '0 0 15px rgba(236, 72, 153, 0.4)',
        'glow-cyan': '0 0 15px rgba(34, 211, 238, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
