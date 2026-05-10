// Defines Tailwind scan targets and theme tokens for the Be Celeb web app.
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        surface: "#f8fafc",
        brand: {
          50: "#f5f3ff",
          500: "#8b5cf6",
          700: "#6d28d9",
        },
        signal: {
          500: "#e11d48",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
