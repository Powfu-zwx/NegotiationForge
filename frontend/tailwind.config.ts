import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: "rgb(var(--bg-primary-rgb) / <alpha-value>)",
          surface: "rgb(var(--bg-secondary-rgb) / <alpha-value>)",
          panel: "rgb(var(--bg-tertiary-rgb) / <alpha-value>)",
          border: "rgb(var(--border-default-rgb) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary-rgb) / <alpha-value>)",
          muted: "rgb(var(--text-muted-rgb) / <alpha-value>)",
          subtle: "rgb(var(--text-muted-rgb) / <alpha-value>)",
          text: "rgb(var(--text-primary-rgb) / <alpha-value>)",
          accent: "rgb(var(--accent-warm-rgb) / <alpha-value>)",
          cold: "rgb(var(--accent-cold-rgb) / <alpha-value>)",
          alt: "rgb(var(--accent-alt-rgb) / <alpha-value>)",
          danger: "rgb(var(--accent-danger-rgb) / <alpha-value>)",
          success: "rgb(var(--accent-success-rgb) / <alpha-value>)",
          "accent-dim": "var(--accent-warm-dim)",
          "user-bubble": "var(--bubble-user)",
          "ai-bubble": "var(--bubble-opponent)",
          "tree-mainline": "rgb(var(--tree-mainline-rgb) / <alpha-value>)",
          "tree-branch-aggressive": "rgb(var(--tree-branch-aggressive-rgb) / <alpha-value>)",
          "tree-branch-concede": "rgb(var(--tree-branch-concede-rgb) / <alpha-value>)",
          "tree-branch-redirect": "rgb(var(--tree-branch-redirect-rgb) / <alpha-value>)",
          "tree-branch-neutral": "rgb(var(--tree-branch-neutral-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      animation: {
        "cursor-blink": "cursor-blink 1s step-end infinite",
        "fade-up": "fade-up 0.35s ease forwards",
        "glow-pulse": "glow-pulse 2.6s ease-in-out infinite",
        "phase-shift": "phase-shift 0.55s ease forwards",
        "signal-wave": "signal-wave 1.5s ease-in-out infinite",
        "scan-sweep": "scan-sweep 2.2s linear infinite",
      },
      keyframes: {
        "cursor-blink": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212, 168, 67, 0.12)" },
          "50%": { boxShadow: "0 0 0 10px rgba(212, 168, 67, 0)" },
        },
        "phase-shift": {
          from: { opacity: "0.65", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "signal-wave": {
          "0%, 100%": { transform: "scaleY(0.35)", opacity: "0.4" },
          "50%": { transform: "scaleY(1)", opacity: "1" },
        },
        "scan-sweep": {
          from: { transform: "translateX(-110%)" },
          to: { transform: "translateX(130%)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
