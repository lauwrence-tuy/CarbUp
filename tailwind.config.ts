import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Carbon g100 theme tokens (CSS custom properties from app/carbon.scss).
        cds: {
          background: "var(--cds-background)",
          layer: "var(--cds-layer-01)",
          "layer-2": "var(--cds-layer-02)",
          "layer-hover": "var(--cds-layer-hover-01)",
          "border-subtle": "var(--cds-border-subtle-01)",
          "border-strong": "var(--cds-border-strong-01)",
          "text-primary": "var(--cds-text-primary)",
          "text-secondary": "var(--cds-text-secondary)",
          "text-helper": "var(--cds-text-helper)",
          interactive: "var(--cds-interactive)",
          focus: "var(--cds-focus)",
          "support-error": "var(--cds-support-error)",
          "support-success": "var(--cds-support-success)",
          "support-warning": "var(--cds-support-warning)",
          "support-info": "var(--cds-support-info)"
        },
        app: {
          bg: "#000000",
          surface: "#111111",
          card: "#17181c",
          hover: "#1e2025",
          border: "rgba(255,255,255,0.06)",
          primary: "#ffffff",
          secondary: "#b5b5b5",
          muted: "#777777",
          green: "#FFDD00",
          "green-soft": "#FFE766",
          orange: "#f97316",
          red: "#ef4444",
          purple: "#a855f7",
          blue: "#60a5fa",
          yellow: "#FFDD00"
        },
        ember: {
          50: "#fff7ed",
          100: "#ffedd5",
          500: "#f97316",
          600: "#ea580c"
        },
        pine: {
          50: "#fffce5",
          500: "#FFDD00",
          700: "#b89f00"
        },
        ink: "#111827"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(17, 24, 39, 0.12)",
        card: "0 8px 30px rgba(0,0,0,0.35)",
        glow: "0 0 0 8px rgba(255,221,0,0.12), 0 16px 44px rgba(255,221,0,0.34)"
      }
    }
  },
  plugins: []
};

export default config;
