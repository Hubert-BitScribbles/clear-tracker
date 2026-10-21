import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };
import { licences } from './licences';

// base: './' keeps asset paths relative, so the build works from any
// static host or sub-folder without extra configuration.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    // licenses.txt: every open-source part that ships, with its licence (About → Credits).
    licences(pkg.version),
    // Installable, and works offline: a service worker caches the whole app
    // (code, fonts, icons, sounds) on first visit and updates it in the
    // background when a new version is published.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Clear Tracker',
        short_name: 'Clear Tracker',
        description: 'Track the days you choose not to drink.',
        start_url: './',
        scope: './',
        display: 'standalone',
        // Lets Chrome and Edge on computers (134+) open links to the app —
        // from Reminders, Calendar, email — in the installed app, reusing its
        // window. Android Chrome does this anyway; iPhone never does.
        launch_handler: { client_mode: ['navigate-existing', 'auto'] },
        background_color: '#FAFAF9',
        theme_color: '#FAFAF9',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,mp3,woff2,webmanifest,txt}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // The privacy pages (privacy.html, privacy-de.html, …) and licenses.txt are their own pages, not the
        // app: don't answer them with the app's index.html (they're still precached, so they work offline).
        navigateFallbackDenylist: [/\/privacy(-\w+)?\.html$/, /\/licenses\.txt$/],
      },
    }),
  ],
});
