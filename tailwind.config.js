/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        sand: "#f5efe6",
        dune: "#d7c2a2",
        tide: "#2f6d7a",
        coral: "#f07f5a"
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        sans: ["'Space Grotesk'", "sans-serif"]
      },
      boxShadow: {
        card: "0 30px 60px -40px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};
