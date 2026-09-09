import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#10142a",
          900: "#1a2040",
          800: "#252c52",
        },
        gold: {
          700: "#8a6a1f",
          600: "#b0872c",
          500: "#c9a03f",
        },
        cream: "#f8f4ea",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
