import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-secondary": "var(--bg-secondary)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "accent-teal": "var(--accent-teal)",
        "accent-gold": "var(--accent-gold)",
        border: "var(--border)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        serif: ["var(--font-fraunces)", "Fraunces", "serif"],
        cursive: ["var(--font-caveat)", "Caveat", "cursive"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "5px",
        md: "6px",
      },
    },
  },
  plugins: [],
};
export default config;

