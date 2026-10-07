import type { Config } from "tailwindcss";

/**
 * Swiss / International Typographic Style foundation.
 * One accent colour, hairline rules, tight grid, Helvetica-first stack.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        muted: "var(--muted)",
        line: "var(--line)",
        accent: "var(--accent)",
      },
      fontFamily: {
        sans: [
          "Helvetica Neue",
          "Helvetica",
          "Inter",
          "Arial",
          "Liberation Sans",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      letterSpacing: {
        label: "0.14em",
        wide2: "0.22em",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      maxWidth: {
        grid: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
