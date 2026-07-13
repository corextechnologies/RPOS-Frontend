import type { Config } from "tailwindcss";

/**
 * ROS design tokens — Cyprus / Sand palette.
 *
 * Semantic colors (bg, surface, content, brand, etc.) are defined as CSS
 * variables in src/app/globals.css and mapped in @theme inline for Tailwind v4.
 * This config documents the brand scales and shared theme extensions.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
        bg: "rgb(var(--bg))",
        surface: "rgb(var(--surface))",
        "surface-2": "rgb(var(--surface-2))",
        line: "rgb(var(--line))",
        content: "rgb(var(--content))",
        muted: "rgb(var(--muted))",
        faint: "rgb(var(--faint))",
        brand: "rgb(var(--brand))",
        "brand-strong": "rgb(var(--brand-strong))",
        "brand-contrast": "rgb(var(--brand-contrast))",
        accent: "rgb(var(--accent))",
        positive: "rgb(var(--positive))",
        warning: "rgb(var(--warning))",
        danger: "rgb(var(--danger))",
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
