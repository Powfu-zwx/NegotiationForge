import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NegotiationForge 色彩系统
        // 深炭灰背景 + 琥珀色强调，传递"博弈、张力、决策"的视觉语言
        forge: {
          bg:        "#0e0f11",   // 主背景，近黑
          surface:   "#16181d",   // 卡片/面板背景
          border:    "#2a2d35",   // 边框
          muted:     "#4a4f5e",   // 次要文字
          text:      "#d6d9e0",   // 主文字，冷白
          accent:    "#e8a838",   // 琥珀色强调
          "accent-dim": "#7a5418",// 低亮度强调
          danger:    "#e05c5c",   // 警告/对手强调色
          "user-bubble":  "#1e2230",
          "ai-bubble":    "#191c23",
        },
      },
      fontFamily: {
        // IBM Plex Mono：等宽，工业感，适合"对话/终端"场景
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
        // Libre Baskerville：衬线，沉稳，适合标题
        serif: ["'Libre Baskerville'", "Georgia", "serif"],
      },
      animation: {
        "cursor-blink": "cursor-blink 1s step-end infinite",
        "fade-up":      "fade-up 0.3s ease forwards",
      },
      keyframes: {
        "cursor-blink": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
