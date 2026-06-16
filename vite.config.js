import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'MAPO — Gestion Scolaire',
        short_name: 'MAPO',
        description: 'ERP de gestion scolaire pour écoles primaires, secondaires et supérieures. Installable sur ordinateur et téléphone.',
        lang: 'fr',
        theme_color: '#1558B0',
        background_color: '#EDEAE3',
        display: 'standalone',
        // 'any' permet desktop + mobile dans n'importe quelle orientation
        orientation: 'any',
        scope: '/',
        start_url: '/',
        id: '/',
        categories: ['education', 'productivity', 'business'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Le service worker ne doit JAMAIS servir l'index.html (SPA) à la place
        // d'un endpoint serveur : sinon les appels au provisioning PHP reçoivent
        // la page de l'app (HTML) et échouent. On exclut les .php du fallback.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/mapo-provision\.php/,
          /\.php(\?.*)?$/,
          /^\/scolarite-bridge/,
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    outDir: '/tmp/mapo-build',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
