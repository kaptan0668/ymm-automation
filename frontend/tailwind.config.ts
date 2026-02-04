import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121212",
        sand: "#f7f2ea",
        terracotta: "#d67b3a",
        pine: "#1f4d3a",
        haze: "#e9e1d6"
      }
    }
  },
  plugins: []
};

export default config;
