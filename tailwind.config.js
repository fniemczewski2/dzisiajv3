const { text } = require("stream/consumers");

module.exports = {
  darkMode: 'class', 
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-zinc-50",
    "bg-yellow-100",
    "bg-green-100",
    "bg-cyan-100",
    "bg-red-100",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        background: "var(--color-background)",
        card: "var(--color-card)",
        text: "var(--color-text)",
        textSecondary: "var(--color-text-secondary)",
        textMuted: "var(--color-text-muted)",
        surface: "var(--color-surface)",
        surfaceHover: "var(--color-surface-hover)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        scaleIn: {
          from: { transform: "scale(0.8)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" }
        },
        confetti: {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" }
        }
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-out",
        scaleIn: "scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        confetti: "confetti 2s ease-out forwards"
      }
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
