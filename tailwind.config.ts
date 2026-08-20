import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#141b2b",
          900: "#1b2438",
          800: "#242f47",
        },
        teal: {
          700: "#3d6b62",
          600: "#4a7f73",
          500: "#5c9284",
        },
        cream: "#f6f4ef",
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
