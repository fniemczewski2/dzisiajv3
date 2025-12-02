module.exports = {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
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
        primary: "#2563EB", // intensywny niebieski
        secondary: "#1E3A8A", // ciemny granat
        accent: "#F59E0B",
        background: "#F3F4F6",
        card: "#FFFFFF",
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
