import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary)",
        surface:    "var(--bg-surface)",
        elevated:   "var(--bg-elevated)",
        border:     "var(--border)",
        brand:      "var(--brand)",
        "brand-hover": "var(--brand-hover)",
        "brand-muted": "var(--brand-muted)",
        "text-primary":   "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted":     "var(--text-muted)",
        danger:   "var(--danger)",
        success:  "var(--success)",
        warning:  "var(--warning)",
      },
      backgroundColor: {
        primary:  "var(--bg-primary)",
        surface:  "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        brand:    "var(--brand)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
        brand:   "var(--brand)",
      },
      textColor: {
        primary:   "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted:     "var(--text-muted)",
        brand:     "var(--brand)",
      },
    },
  },
  plugins: [],
};
export default config;
