/* eslint-disable no-undef */
// Handlers push de MAPO+, importés en tête du service worker généré par Workbox
// (voir vite.config.js → workbox.importScripts). On garde ce fichier minuscule :
// afficher la notification reçue et, au clic, ouvrir/replacer l'appli.

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = {} }
  const title = data.title || 'MAPO+'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-miapo-192.png',
    badge: '/icon-miapo-192.png',
    // Regrouper par enfant : une nouvelle notif remplace la précédente du même
    // apprenant plutôt que d'en empiler cinq. `renotify` = ré-alerter quand même
    // (sinon le rappel du jour remplacerait celui de la veille EN SILENCE si
    // l'utilisateur ne l'a pas fermé → il raterait le rappel).
    tag: data.tag || 'mapo-plus',
    renotify: true,
    data: { url: data.url || '/parent/miapo' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const cible = (event.notification.data && event.notification.data.url) || '/parent/miapo'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Onglet MAPO+ déjà ouvert → on le ramène au premier plan.
      for (const c of clients) {
        if (c.url.includes('/parent/miapo') && 'focus' in c) return c.focus()
      }
      return self.clients.openWindow ? self.clients.openWindow(cible) : null
    }),
  )
})
