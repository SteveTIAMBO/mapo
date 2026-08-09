import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth } from '../firebase'
import { useAuthStore } from './auth'
import { OFFRES as OFFRES_DEFAUT, OFFRE_GRATUITE, REMISE_FAMILLE, CREDIT_PACKS } from '../config/offres'
import { detectDevise, guichetPour } from '../utils/devise'

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
  // Cache local par COMPTE : indexé sur l'UID (cf. enfantsAutonomes) — jamais sur
  // l'e-mail, sinon un e-mail recréé/recyclé hériterait de l'ancien cache d'abonnement.
  // L'état fait autorité côté serveur (/mapo-offres.php) : ce cache n'est qu'un repli.
  const owner = computed(() => {
    if (authStore.user?.uid && !authStore.isDemo) return 'uid-' + authStore.user.uid
    return authStore.userProfile?.email || authStore.userProfile?.phone || 'demo'
  })
  const KEY = (o) => `mapo_abo_${o || 'demo'}`

  const offresServeur = ref(null)
  const offreId = ref('decouverte')
  const tokens = ref(OFFRE_GRATUITE.capTokens)   // restants
  const cap = ref(OFFRE_GRATUITE.capTokens)       // plafond du cycle
  const renewAt = ref('')
  const remiseFamille = ref(REMISE_FAMILLE)       // { minEnfants, pct } — serveur fait foi
  const devise = ref(detectDevise())              // 'XAF' (Tranzak) | 'EUR' (Stripe)
  const bonus = ref(0)                            // crédits achetés (PAYG), hors jauge hebdo
  const packsServeur = ref(null)
  const packs = computed(() => packsServeur.value || CREDIT_PACKS)

  // Les offres SERVEUR portent prix + quotas, mais pas la copie « avantages »
  // (texte UI). On la ré-attache depuis la config locale par id.
  const offres = computed(() => {
    const src = offresServeur.value || OFFRES_DEFAUT
    return src.map((o) => ({ ...o, avantages: o.avantages || OFFRES_DEFAUT.find((d) => d.id === o.id)?.avantages || [] }))
  })
  const offre = computed(() => offres.value.find((o) => o.id === offreId.value) || offres.value[0])
  const offresPayantes = computed(() => offres.value.filter((o) => o.prix > 0))
  const guichet = computed(() => guichetPour(devise.value)) // 'tranzak' | 'stripe'
  // Relance WhatsApp des parents : réservée aux offres 6500+ (whatsapp:true).
  const relanceWhatsappDispo = computed(() => !!offre.value?.whatsapp)
  /** Affine la devise selon le pays du profil (sinon fuseau/langue). */
  function refreshDevise(pays) { devise.value = detectDevise(pays) }
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
      if (d && d.remiseFamille) remiseFamille.value = d.remiseFamille
      if (d && Array.isArray(d.packs) && d.packs.length) packsServeur.value = d.packs
    } catch { /* repli config locale */ }
  }

  async function fetchState() {
    const t = await tok()
    if (!t) return false
    try {
      const r = await fetch('/mapo-offres.php', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'state' }) })
      const d = await r.json().catch(() => ({}))
      if (d && d.ok) { offreId.value = d.offreId || 'decouverte'; tokens.value = d.tokens ?? 0; cap.value = d.cap ?? tokens.value; bonus.value = d.bonus ?? 0; renewAt.value = d.renewAt || ''; return true }
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
      if (raw) { offreId.value = raw.offreId || 'decouverte'; tokens.value = raw.tokens ?? offre.value.capTokens; cap.value = raw.cap ?? offre.value.capTokens; bonus.value = raw.bonus ?? 0; renewAt.value = raw.renewAt || '' }
      else resetLocal()
    } catch { resetLocal() }
    if (renewAt.value && new Date(renewAt.value) < new Date()) resetLocal()
  }
  function saveLocal() { try { localStorage.setItem(KEY(owner.value), JSON.stringify({ offreId: offreId.value, tokens: tokens.value, cap: cap.value, bonus: bonus.value, renewAt: renewAt.value })) } catch { /* quota */ } }
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

  /**
   * Utilise un code de crédits offert par EDUFREM.
   *
   * Le code est validé et décompté CÔTÉ SERVEUR : le client n'est pas cru sur
   * parole, et deux saisies simultanées du même code se départagent sous verrou.
   * Renvoie { ok, credites, reason }.
   */
  async function utiliserCodeCredits(code) {
    try {
      const t = await tok()
      if (!t) return { ok: false, reason: 'non_connecte' }
      const res = await fetch('/mapo-pay.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify({ action: 'code_utiliser', code }),
      })
      const d = await res.json().catch(() => null)
      if (!d || !d.ok) return { ok: false, reason: (d && d.error) || 'serveur' }
      // On répercute le nouveau solde immédiatement : le parent doit VOIR que
      // son code a servi, sans recharger la page.
      if (typeof d.tokens === 'number') tokens.value = d.tokens
      if (typeof d.cap === 'number') cap.value = d.cap
      if (typeof d.bonus === 'number') bonus.value = d.bonus
      return { ok: true, credites: d.credites }
    } catch {
      return { ok: false, reason: 'reseau' }
    }
  }

  /** Démo : simule l'achat d'une recharge (ajoute les tokens au solde bonus). */
  function activerDemoCredits(packId) {
    const p = packs.value.find((x) => x.id === packId)
    if (!p) return
    bonus.value = (bonus.value || 0) + (p.tokens || 0)
    saveLocal()
  }

  return { isDemo, offreId, tokens, cap, bonus, renewAt, remiseFamille, devise, packs, offres, offre, offresPayantes, guichet, relanceWhatsappDispo, refreshDevise, restant, utilise, pourcentage, épuisé, load, fetchState, activerDemo, activerDemoCredits, majJauge, marquerEpuise, utiliserCodeCredits }
})
