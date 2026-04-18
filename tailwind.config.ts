import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/stores/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
    "./src/shared/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--primary-rgb) / <alpha-value>)",
        "primary-hover": "rgb(var(--primary-hover-rgb) / <alpha-value>)",
        "primary-soft": "rgb(var(--primary-rgb) / 0.08)",
        "on-primary": "#FFFFFF",
        surface: "var(--surface)",
        "surface-low": "var(--surface-low)",
        "surface-mid": "var(--surface-mid)",
        "surface-high": "var(--surface-high)",
        "surface-highest": "var(--surface-highest)",
        card: "rgb(var(--card-rgb) / <alpha-value>)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        success: "#16A34A",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6"
      },
      fontFamily: {
        display: ["var(--font-plus-jakarta)", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        body: ["var(--font-inter)", "PingFang SC", "Microsoft YaHei", "sans-serif"]
      },
      borderRadius: {
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        pill: "999px"
      },
      boxShadow: {
        soft: "0 8px 24px rgba(45,51,55,0.05)",
        float: "0 12px 32px rgba(45,51,55,0.06)",
        focus: "0 0 0 4px rgba(56,117,246,0.12)"
      },
      maxWidth: {
        stage: "980px",
        chat: "820px"
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top, rgba(56,117,246,0.12), transparent 28%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.75), transparent 22%)"
      }
    }
  },
  plugins: []
};

export default config;
