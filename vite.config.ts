import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // On inscrit le service worker NOUS-MEMES (voir main.tsx). Le script
        // pose par defaut n'attrape pas l'echec : dans un WKWebView, ou dans
        // un onglet ou les service workers sont interdits, il laissait une
        // promesse rejetee dans la console — « An unknown error occurred when
        // fetching the script » — qui donne l'impression d'un site casse alors
        // que tout marche.
        injectRegister: null,
        manifest: false, // We already have our own site.webmanifest and meta tags in index.html
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          // Les pages autonomes (confidentialite, conditions, arcade) doivent
          // s'ouvrir DIRECTEMENT. Sans cette ligne, le service worker renvoyait
          // toute adresse vers l'accueil : /confidentialite.html affichait le site
          // et l'adresse se "nettoyait" toute seule.
          navigateFallbackDenylist: [/\.html$/],
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
