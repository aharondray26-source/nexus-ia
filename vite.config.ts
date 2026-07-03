import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuration Vite. Le port est fige pour que Tauri sache ou se connecter.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
});
