import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand — from the "Cyprus / Sand" palette
        cyprus: {
          DEFAULT: "#004741",
          50: "#e8f1ef",
          100: "#c6dedb",
          200: "#8fbfb9",
          300: "#4f9a91",
          400: "#1c766c",
          500: "#005a52",
          600: "#004741",
          700: "#013a35",
          800: "#012b28",
          900: "#01201d",
        },
        sand: {
          DEFAULT: "#F0EDE4",
          50: "#fbfaf6",
          100: "#f5f2ea",
          200: "#f0ede4",
          300: "#e4dfd0",
          400: "#d3ccb8",
        },
        // Semantic tokens wired to CSS variables (theme-switchable)
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        content: "rgb(var(--content) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
        "brand-strong": "rgb(var(--brand-strong) / <alpha-value>)",
        "brand-contrast": "rgb(var(--brand-contrast) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        positive: "rgb(var(--positive) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-grotesk)", "var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.18)",
        lift: "0 24px 60px -24px rgb(0 0 0 / 0.35)",
        glow: "0 0 0 1px rgb(var(--brand) / 0.35), 0 12px 40px -12px rgb(var(--brand) / 0.45)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        grain: {
          "0%,100%": { transform: "translate(0,0)" },
          "50%": { transform: "translate(-2%,1%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "spin-slow": "spin-slow 14s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
