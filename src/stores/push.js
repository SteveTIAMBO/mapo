import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth } from '../firebase'
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from '../config/push'

/**
 * Store « push web » — rappels de révision GRATUITS via les serveurs push des
 * navigateurs (Google/Mozilla/Apple, sans frais). L'apprenant (ou le parent
 * pour lui) active les rappels : on demande la permission, on s'abonne, et on
 * inscrit l'abonnement au registre serveur (mapo-push.php action register) pour
 * que le rappel quotidien puisse l'envoyer. Marche même en démo (sans compte).
 *
 * Rien ici n'est payant ni secret : la clé VAPID publique identifie juste
 * l'expéditeur. L'envoi réel est fait par server/mapo-push.php.
 */
export const usePushStore = defineStore('push', () => {
  const supported = ref(typeof window !== 'undefined'
    && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window)
  const permission = ref(supported.value ? Notification.permission : 'denied')
  const subscribed = ref(false)
  const busy = ref(false)

  // `navigator.serviceWorker.ready` NE se résout PAS tant que la page n'est pas
  // « contrôlée » par le SW — ce qui arrive à la 1re visite (ou après une mise à
  // jour) avant le premier rechargement → le bouton tournerait dans le vide.
  // On prend donc directement la registration active si elle existe ; l'abonnement
  // push fonctionne dessus même quand la page n'est pas encore contrôlée.
  async function ready() {
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg && reg.active) return reg
    return navigator.serviceWorker.ready
  }

  /** Inscrit / désinscrit l'abonnement au registre serveur (rappel quotidien). */
  async function registerServer(sub, action) {
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (auth.currentUser) headers.Authorization = 'Bearer ' + await auth.currentUser.getIdToken()
      await fetch('/mapo-push.php', {
        method: 'POST', headers,
        body: JSON.stringify({ action, subscription: JSON.parse(JSON.stringify(sub)) }),
      })
    } catch { /* le test immédiat marche quand même ; le quotidien reprendra au prochain enable */ }
  }

  /** Reflète l'état réel (permission + abonnement présent) au montage de l'UI. */
  async function refresh() {
    if (!supported.value) return
    permission.value = Notification.permission
    try {
      const reg = await ready()
      subscribed.value = !!(await reg.pushManager.getSubscription())
    } catch { subscribed.value = false }
  }

  /** Active les rappels : permission → abonnement → rangement Firestore. */
  async function enable() {
    if (!supported.value) return { ok: false, reason: 'unsupported' }
    busy.value = true
    try {
      const perm = await Notification.requestPermission()
      permission.value = perm
      if (perm !== 'granted') return { ok: false, reason: 'denied' }

      const reg = await ready()
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true, // exigé par Chrome : chaque push doit être visible
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }
      // Inscription au registre serveur (rappel quotidien). Sans jeton en démo,
      // avec jeton si compte réel — l'endpoint accepte les deux.
      await registerServer(sub, 'register')
      subscribed.value = true
      return { ok: true }
    } catch (e) {
      return { ok: false, reason: 'error', detail: String(e && e.message || e) }
    } finally { busy.value = false }
  }

  /** Coupe les rappels : désabonnement navigateur + retrait Firestore. */
  async function disable() {
    if (!supported.value) return { ok: false }
    busy.value = true
    try {
      const reg = await ready()
      const sub = await reg.pushManager.getSubscription()
      if (sub) { await registerServer(sub, 'unregister'); await sub.unsubscribe() }
      subscribed.value = false
      return { ok: true }
    } catch { return { ok: false } } finally { busy.value = false }
  }

  /**
   * Envoi de contrôle : demande au serveur de pousser une notif à CE navigateur.
   * Prouve toute la chaîne (abonnement → VAPID → chiffrement → affichage) sans
   * attendre le CRON quotidien.
   */
  async function sendTest() {
    busy.value = true
    try {
      const reg = await ready()
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return { ok: false, reason: 'not_subscribed' }
      const headers = { 'Content-Type': 'application/json' }
      const payload = { subscription: sub, lang: (navigator.language || 'fr').slice(0, 2) }
      // Compte réel : jeton joint → message personnalisable. Démo : sans jeton,
      // le serveur impose le texte du rappel standard.
      if (auth.currentUser) {
        headers.Authorization = 'Bearer ' + await auth.currentUser.getIdToken()
        payload.title = 'MAPO+'
        payload.body = "C'est l'heure de réviser ! Ouvre MAPO+ pour ta séance du jour."
      }
      const r = await fetch('/mapo-push.php', { method: 'POST', headers, body: JSON.stringify(payload) })
      const data = await r.json().catch(() => ({}))
      return data && data.ok ? { ok: true } : { ok: false, reason: data.error || 'server' }
    } catch (e) {
      return { ok: false, reason: 'error', detail: String(e && e.message || e) }
    } finally { busy.value = false }
  }

  /**
   * L'apprenant demande à prévenir son parent que ses crédits sont épuisés.
   *
   * On n'envoie AUCUN destinataire : le serveur part du jeton et retrouve le
   * parent dans son propre registre. Un client qui pourrait désigner la cible
   * pourrait arroser n'importe quel compte.
   *
   * Renvoie { ok, deja } — `deja` quand la demande a déjà été faite aujourd'hui.
   */
  async function prevenirParent(langue = 'fr') {
    try {
      if (!auth.currentUser) return { ok: false, reason: 'non_connecte' }
      const res = await fetch('/mapo-push.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await auth.currentUser.getIdToken() },
        body: JSON.stringify({ action: 'alerte-parent', lang: langue }),
      })
      const d = await res.json().catch(() => null)
      if (!d || !d.ok) return { ok: false, reason: (d && d.error) || 'serveur' }
      return { ok: true, deja: !!d.deja }
    } catch (e) {
      return { ok: false, reason: 'reseau' }
    }
  }

  return { supported, permission, subscribed, busy, refresh, enable, disable, sendTest, prevenirParent }
})
