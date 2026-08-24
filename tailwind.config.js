/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: "var(--nexus-bg)",
          panel: "var(--nexus-panel)",
          "panel-solid": "var(--nexus-panel-solid)",
          border: "var(--nexus-border)",
          text: "var(--nexus-text)",
          muted: "var(--nexus-muted)",
          card: "var(--nexus-card)",
          "card-hover": "var(--nexus-card-hover)",
          input: "var(--nexus-input-bg)",
          "input-border": "var(--nexus-input-border)",
        },
      },
      backdropBlur: {
        nexus: "16px",
      },
    },
  },
  plugins: [],
};
