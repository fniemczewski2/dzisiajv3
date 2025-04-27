module.exports = {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
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
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
