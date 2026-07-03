/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: "#09090b",
          panel: "#0c0c0f",
          border: "#27272a",
          text: "#f4f4f5",
          muted: "#a1a1aa",
        },
      },
      backdropBlur: {
        nexus: "16px",
      },
    },
  },
  plugins: [],
};
