import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        text: "var(--text)",
        muted: "var(--muted)",
        border: "var(--border)",
        line: "var(--border)",
        accent: "var(--accent)",
        lime: "var(--lime)",
        lavender: "var(--lavender)",
        green: "var(--green)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        search: "var(--shadow-search)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.045em",
        eyebrow: "0.12em",
      },
    },
  },
};

export default config;
