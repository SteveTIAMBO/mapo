import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth, db } from '../firebase'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from '../config/push'

/**
 * Store « push web » — rappels de révision GRATUITS via les serveurs push des
 * navigateurs (Google/Mozilla/Apple, sans frais). L'apprenant (ou le parent
 * pour lui) active les rappels : on demande la permission, on s'abonne, et on
 * range l'abonnement sous SON compte (`users/{uid}/push/sub`) pour que l'envoi
 * quotidien côté serveur puisse le retrouver.
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

  function uid() { return auth.currentUser ? auth.currentUser.uid : null }
  async function ready() { return navigator.serviceWorker.ready }

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
      // Compte réel : on range l'abonnement pour que le rappel quotidien (CRON)
      // le retrouve. En démo (pas de compte), on s'abonne quand même — le test
      // immédiat marche, mais rien n'est persisté côté serveur.
      if (uid()) {
        await setDoc(doc(db, 'users', uid(), 'push', 'sub'), {
          subscription: JSON.parse(JSON.stringify(sub)),
          updatedAt: new Date().toISOString(),
          ua: navigator.userAgent || '',
        })
      }
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
      if (sub) await sub.unsubscribe()
      if (uid()) await deleteDoc(doc(db, 'users', uid(), 'push', 'sub')).catch(() => {})
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

  return { supported, permission, subscribed, busy, refresh, enable, disable, sendTest }
})
