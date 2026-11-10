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
        // Theme tokens: CSS custom properties set in app/carbon.scss (Carbon g100
        // re-skinned to the CarbUp palette).
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
        // Accent colours that need Tailwind opacity modifiers (e.g. bg-app-red/10),
        // plus the macro colours (protein blue, fat purple).
        app: {
          green: "#FFDD00",
          yellow: "#FFDD00",
          orange: "#f97316",
          red: "#ef4444",
          purple: "#a855f7",
          blue: "#60a5fa"
        }
      }
    }
  },
  plugins: []
};

export default config;
