/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Avenir Next", "Noto Sans TC", "ui-sans-serif", "system-ui"],
        display: ["Georgia", "Noto Serif TC", "serif"],
      },
      colors: {
        ink: "#1f2523",
        paper: "#f6f3ec",
        porcelain: "#fbfaf6",
        moss: "#53685a",
        oxide: "#a04c38",
        brass: "#b18a47",
        clinic: "#2f6f73",
      },
      boxShadow: {
        panel: "0 18px 40px rgba(31, 37, 35, 0.08)",
      },
    },
  },
  plugins: [],
};
