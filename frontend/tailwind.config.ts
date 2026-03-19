import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: "#0e0f11", surface: "#16181d", border: "#2a2d35",
          muted: "#4a4f5e", text: "#d6d9e0", accent: "#e8a838",
          "accent-dim": "#7a5418", danger: "#e05c5c",
          "user-bubble": "#1e2230", "ai-bubble": "#191c23",
        },
      },
      fontFamily: {
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
        serif: ["'Libre Baskerville'", "Georgia", "serif"],
      },
      animation: {
        "cursor-blink": "cursor-blink 1s step-end infinite",
        "fade-up": "fade-up 0.3s ease forwards",
      },
      keyframes: {
        "cursor-blink": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
} satisfies Config;
