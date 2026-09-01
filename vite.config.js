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
        // ⚠️ pdf.js est EXCLU du préchargement, et c'est délibéré.
        //
        // La lecture d'un PDF de programme (import de maquette) tire une
        // bibliothèque de 427 Ko. Précachée, elle s'imposait à CHAQUE
        // installation : +441 Kio mesurés, soit 5 % de plus, pour une fonction
        // que la plupart des apprenants n'utiliseront jamais. Sur un forfait
        // data africain, c'est le genre de détail qui décide d'une désinstallation.
        //
        // Elle est donc chargée à la demande, au premier import. L'opération est
        // de toute façon EN LIGNE (elle appelle l'IA derrière), donc ne pas
        // l'avoir hors connexion ne retire rien.
        globIgnores: ['**/pdf-*.js', '**/pdf.worker*'],
        cleanupOutdatedCaches: true,
        /**
         * ⚠️ `/site` n'appartient PAS à cette application.
         *
         * Le site vitrine de l'école est un AUTRE produit, servi sur le même
         * sous-domaine sous `/site/`. Sans cette exclusion, le service worker de
         * l'ERP répond à sa place : `navigateFallback` vaut `index.html` par
         * défaut, donc un visiteur ayant déjà ouvert MAPO sur cette origine
         * arrivait sur le TABLEAU DE BORD en demandant le site public.
         *
         * Mesuré le 01/09/2026 sur epc1 : `curl` recevait bien la vitrine (le
         * serveur fait son travail), mais le navigateur affichait l'ERP. Le
         * défaut ne touche donc que les personnes ayant déjà utilisé MAPO —
         * c'est-à-dire l'équipe de l'école, exactement celles qui vérifient si
         * « notre site est en ligne ».
         */
        navigateFallbackDenylist: [/^\/site(\/|$)/],
        // Greffe les handlers push/notificationclick en tête du SW généré,
        // sans avoir à passer en injectManifest (on garde generateSW).
        importScripts: ['/push-sw.js'],
        runtimeCaching: [
          // App shell (navigations HTML) : NetworkFirst → on récupère TOUJOURS
          // la dernière version en ligne, donc l'utilisateur voit la nouvelle
          // version dès sa 1re visite (fini le « recharger 2 fois »). Repli sur
          // le cache seulement hors-ligne. On NE touche pas aux .php (proxies)
          // ni au bridge scolarité : ce ne sont pas des navigations.
          {
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' &&
              !url.pathname.endsWith('.php') &&
              !url.pathname.startsWith('/scolarite-bridge') &&
              // Le site vitrine vit sous /site : ne pas le mettre en cache sous
              // le nom « app-shell », sinon on lui sert la coquille de l'ERP.
              !url.pathname.startsWith('/site'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 12 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
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
    // Cible CSS explicite. Par défaut, Vite 8 minifie vers une base récente et
    // réécrit `@media (max-width: 768px)` en `@media (width <= 768px)` (syntaxe
    // Media Queries Level 4, Chrome 104+ / Safari 16.4+). Sur un navigateur plus
    // ancien, la règle est ignorée EN ENTIER : plus aucune mise en page mobile
    // dans toute l'application — et rien ne le signale, la page s'affiche
    // simplement en version bureau sur un téléphone.
    // MAPO vise l'Afrique et des téléphones d'entrée de gamme : on redescend la
    // cible. Le surcoût est de quelques kilo-octets de CSS.
    cssTarget: ['chrome90', 'safari14', 'firefox88', 'edge90'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Les tests de RÈGLES Firestore ont besoin de l'émulateur : ils échoueraient
    // tous ici et noieraient les vraies régressions dans du bruit. Ils ont leur
    // propre commande, `npm run test:rules`, qui démarre l'émulateur.
    // `tests/enfants-stockage.test.mjs` est un script AUTONOME (son en-tête le
    // dit : `node tests/enfants-stockage.test.mjs`). Il recopie le store dans
    // un dossier temporaire et l'importe par chemin ABSOLU, hors du projet —
    // ce que la résolution de modules de Vite ne sait pas suivre. Sous vitest
    // il échouait au chargement et polluait le rapport, alors qu'il passe
    // intégralement sous node. Il a son propre script : `npm run test:enfants`.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/regles-firestore.test.js', 'tests/enfants-stockage.test.mjs'],
  },
})
