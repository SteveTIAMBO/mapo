import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth } from '../firebase'
import { useAuthStore } from './auth'
import { OFFRES as OFFRES_DEFAUT, OFFRE_GRATUITE } from '../config/offres'

/**
 * Store « abonnement MAPO+ » — offre courante + JAUGE DE TOKENS (façon Claude).
 *
 *  - Les OFFRES (prix + plafond de tokens) viennent du SERVEUR (mapo-offres.php),
 *    ajustables sans redéploiement du front (repli config locale).
 *  - Le SOLDE (offre + tokens restants + plafond) est autoritatif côté SERVEUR
 *    pour un vrai compte : l'offre n'est accordée qu'après un paiement Tranzak
 *    confirmé, et le décompte se fait dans mapo-ia.php. En démo, on tient l'état
 *    en local pour montrer le parcours.
 */
export const useAbonnementStore = defineStore('abonnement', () => {
  const authStore = useAuthStore()
  const isDemo = computed(() => authStore.isDemo)
  const owner = computed(() => authStore.userProfile?.email || authStore.userProfile?.phone || 'demo')
  const KEY = (o) => `mapo_abo_${o || 'demo'}`

  const offresServeur = ref(null)
  const offreId = ref('decouverte')
  const tokens = ref(OFFRE_GRATUITE.capTokens)   // restants
  const cap = ref(OFFRE_GRATUITE.capTokens)       // plafond du cycle
  const renewAt = ref('')

  const offres = computed(() => offresServeur.value || OFFRES_DEFAUT)
  const offre = computed(() => offres.value.find((o) => o.id === offreId.value) || offres.value[0])
  const offresPayantes = computed(() => offres.value.filter((o) => o.prix > 0))
  const restant = computed(() => Math.max(0, tokens.value))
  const utilise = computed(() => Math.max(0, cap.value - tokens.value))
  const pourcentage = computed(() => (cap.value ? Math.min(100, Math.round((utilise.value / cap.value) * 100)) : 0))
  const épuisé = computed(() => tokens.value <= 0)

  async function tok() { try { return auth.currentUser ? await auth.currentUser.getIdToken() : null } catch { return null } }

  async function fetchOffres() {
    try {
      const r = await fetch('/mapo-offres.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'offers' }) })
      const d = await r.json().catch(() => ({}))
      if (d && d.ok && Array.isArray(d.offres) && d.offres.length) offresServeur.value = d.offres
    } catch { /* repli config locale */ }
  }

  async function fetchState() {
    const t = await tok()
    if (!t) return false
    try {
      const r = await fetch('/mapo-offres.php', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'state' }) })
      const d = await r.json().catch(() => ({}))
      if (d && d.ok) { offreId.value = d.offreId || 'decouverte'; tokens.value = d.tokens ?? 0; cap.value = d.cap ?? tokens.value; renewAt.value = d.renewAt || ''; return true }
    } catch { /* offline */ }
    return false
  }

  async function load() {
    await fetchOffres()
    if (isDemo.value) { loadLocal(); return }
    const ok = await fetchState()
    if (!ok) loadLocal()
  }

  // ── Démo (local) ──
  function loadLocal() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY(owner.value)) || 'null')
      if (raw) { offreId.value = raw.offreId || 'decouverte'; tokens.value = raw.tokens ?? offre.value.capTokens; cap.value = raw.cap ?? offre.value.capTokens; renewAt.value = raw.renewAt || '' }
      else resetLocal()
    } catch { resetLocal() }
    if (renewAt.value && new Date(renewAt.value) < new Date()) resetLocal()
  }
  function saveLocal() { try { localStorage.setItem(KEY(owner.value), JSON.stringify({ offreId: offreId.value, tokens: tokens.value, cap: cap.value, renewAt: renewAt.value })) } catch { /* quota */ } }
  function resetLocal() { const f = offres.value[0]; offreId.value = f.id; tokens.value = f.capTokens; cap.value = f.capTokens; renewAt.value = ''; saveLocal() }

  /** Démo uniquement : simule l'activation d'une offre (vrai compte = grant serveur). */
  function activerDemo(id) {
    const o = offres.value.find((x) => x.id === id) || offres.value[0]
    offreId.value = o.id; tokens.value = o.capTokens; cap.value = o.capTokens
    const d = new Date(); d.setDate(d.getDate() + (o.cycleJours || 30)); renewAt.value = d.toISOString()
    saveLocal()
  }

  /** Reflète la jauge renvoyée par un appel IA (mapo-ia.php → tokens, cap). */
  function majJauge(t, c) {
    if (typeof t === 'number') tokens.value = t
    if (typeof c === 'number') cap.value = c
    if (isDemo.value) saveLocal()
  }
  function marquerEpuise() { tokens.value = 0; if (isDemo.value) saveLocal() }

  return { isDemo, offreId, tokens, cap, renewAt, offres, offre, offresPayantes, restant, utilise, pourcentage, épuisé, load, fetchState, activerDemo, majJauge, marquerEpuise }
})
