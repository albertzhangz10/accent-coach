import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        panel: "#14141c",
        border: "#26262f",
        accent: "#ff4d6d",
        accent2: "#7c5cff",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
