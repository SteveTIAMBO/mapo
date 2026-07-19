import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth } from '../firebase'
import { useAuthStore } from './auth'
import { OFFRES as OFFRES_DEFAUT, OFFRE_GRATUITE } from '../config/offres'

/**
 * Store « abonnement MAPO+ » — offre courante + crédits restants.
 *
 * Deux sources :
 *  - Les OFFRES (prix + quotas) viennent du SERVEUR (mapo-offres.php), pour
 *    rester ajustables sans redéploiement du front. Repli sur la config locale.
 *  - Le SOLDE (offre active + crédits) est autoritatif côté SERVEUR pour un vrai
 *    compte (mapo-offres.php action=state ; l'offre n'est accordée qu'après un
 *    paiement Tranzak confirmé). En démo (sans compte), on tient l'état en local
 *    pour montrer le parcours.
 */
export const useAbonnementStore = defineStore('abonnement', () => {
  const authStore = useAuthStore()
  const isDemo = computed(() => authStore.isDemo)
  const owner = computed(() => authStore.userProfile?.email || authStore.userProfile?.phone || 'demo')
  const KEY = (o) => `mapo_abo_${o || 'demo'}`

  const offresServeur = ref(null)                 // [{id,nom,prix,credits,dureeJours}] ou null
  const offreId = ref('decouverte')
  const credits = ref(OFFRE_GRATUITE.credits)
  const renewAt = ref('')

  const offres = computed(() => offresServeur.value || OFFRES_DEFAUT)
  const offre = computed(() => offres.value.find((o) => o.id === offreId.value) || offres.value[0])
  const offresPayantes = computed(() => offres.value.filter((o) => o.prix > 0))
  const épuisé = computed(() => credits.value <= 0)

  async function token() { try { return auth.currentUser ? await auth.currentUser.getIdToken() : null } catch { return null } }

  /** Offres (quotas ajustables) : serveur d'abord, repli config locale. */
  async function fetchOffres() {
    try {
      const r = await fetch('/mapo-offres.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'offers' }) })
      const d = await r.json().catch(() => ({}))
      if (d && d.ok && Array.isArray(d.offres) && d.offres.length) offresServeur.value = d.offres
    } catch { /* repli config locale */ }
  }

  /** Solde depuis le serveur (vrai compte). */
  async function fetchState() {
    const t = await token()
    if (!t) return false
    try {
      const r = await fetch('/mapo-offres.php', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'state' }) })
      const d = await r.json().catch(() => ({}))
      if (d && d.ok) { offreId.value = d.offreId || 'decouverte'; credits.value = d.credits ?? 0; renewAt.value = d.renewAt || ''; return true }
    } catch { /* offline */ }
    return false
  }

  async function load() {
    await fetchOffres()
    if (isDemo.value) { loadLocal(); return }
    const ok = await fetchState()
    if (!ok) loadLocal() // repli hors-ligne
  }

  // ── Démo (local) ──
  function loadLocal() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY(owner.value)) || 'null')
      if (raw) { offreId.value = raw.offreId || 'decouverte'; credits.value = raw.credits ?? OFFRE_GRATUITE.credits; renewAt.value = raw.renewAt || '' }
      else resetLocal()
    } catch { resetLocal() }
    if (renewAt.value && new Date(renewAt.value) < new Date()) resetLocal()
  }
  function saveLocal() { try { localStorage.setItem(KEY(owner.value), JSON.stringify({ offreId: offreId.value, credits: credits.value, renewAt: renewAt.value })) } catch { /* quota */ } }
  function resetLocal() { offreId.value = 'decouverte'; credits.value = (offre.value?.credits) ?? OFFRE_GRATUITE.credits; renewAt.value = ''; saveLocal() }

  /** Démo uniquement : simule l'activation d'une offre (vrai compte = grant serveur). */
  function activerDemo(id) {
    const o = offres.value.find((x) => x.id === id) || offres.value[0]
    offreId.value = o.id; credits.value = o.credits
    const d = new Date(); d.setDate(d.getDate() + (o.dureeJours || 30)); renewAt.value = d.toISOString()
    saveLocal()
  }

  /** Reflète le solde renvoyé par un appel IA (mapo-ia.php → champ credits). */
  function majCredits(n) { if (typeof n === 'number') { credits.value = n; if (isDemo.value) saveLocal() } }
  function marquerEpuise() { credits.value = 0; if (isDemo.value) saveLocal() }

  return { isDemo, offreId, credits, renewAt, offres, offre, offresPayantes, épuisé, load, fetchState, activerDemo, majCredits, marquerEpuise }
})
