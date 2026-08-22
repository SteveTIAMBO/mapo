import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
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
  const potFamille = ref(0)                       // solde du PARENT, où l'enfant puise
  // Compte ENFANT : il n'a pas de jauge à lui. On garde sa CONSOMMATION de la
  // semaine et le plafond que son parent lui a éventuellement fixé.
  const estEnfant = ref(false)
  const conso = ref(0)
  const plafond = ref(0)
  const plafondAtteint = ref(false)
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
  // ⚠️ La jauge doit regarder ce que le SERVEUR regarde (mc_hasTokens) :
  // le quota de la semaine, PLUS les crédits achetés ou offerts, PLUS le pot de
  // la famille pour un enfant. Elle ne comptait que le quota hebdomadaire : une
  // enfant dont le parent venait de créditer 100 000 crédits voyait « il te
  // reste peu de crédits, ton parent est prévenu » alors qu'elle pouvait réviser
  // pendant des semaines. Le blocage, lui, était correct (`épuisé` additionnait
  // déjà les trois) — seul l'AFFICHAGE mentait, ce qui est le pire cas : rien
  // n'était cassé, tout paraissait l'être.
  const disponible = computed(() => tokens.value + bonus.value + potFamille.value)
  const dotation = computed(() => cap.value + bonus.value + potFamille.value)
  const restant = computed(() => Math.max(0, disponible.value))
  const utilise = computed(() => Math.max(0, dotation.value - disponible.value))
  // Pour un enfant RATIONNÉ par son parent, la limite qui le concerne n'est pas
  // le quota de la famille mais le plafond qu'on lui a fixé. C'est ce chiffre
  // qui doit remplir sa jauge, sinon elle reste plate et ne l'informe de rien.
  const rationne = computed(() => estEnfant.value && plafond.value > 0)
  const jaugeTotal = computed(() => (rationne.value ? plafond.value : dotation.value))
  const jaugeUtilise = computed(() => (rationne.value ? conso.value : utilise.value))
  const pourcentage = computed(() => (jaugeTotal.value
    ? Math.min(100, Math.round((jaugeUtilise.value / jaugeTotal.value) * 100))
    : 0))
  // « Pas assez pour la dernière action tentée ». DISTINCT de « solde nul » :
  // un reste de 1 000 ne paie pas un quiz à 2 500, alors que la jauge affiche
  // encore quelque chose. Sans cette distinction, le client remettait sa jauge
  // à zéro pour refléter l'échec et retrouvait la vraie valeur au rechargement,
  // d'où l'alternance « épuisé » / « bientôt épuisé » signalée le 09/08.
  const insuffisant = ref(false)
  // On compte AUSSI le pot de la famille : un enfant dont le quota hebdomadaire
  // est à zéro peut continuer sur les crédits de son parent. Sans ça, l'écran
  // annonçait « terminé » alors que le serveur servait ses requêtes.
  const épuisé = computed(() => tokens.value + bonus.value + potFamille.value <= 0 || insuffisant.value)

  async function tok() { try { return auth.currentUser ? await auth.currentUser.getIdToken() : null } catch { return null } }

  /**
   * Déclaration de famille pour un compte ENFANT. Le serveur ne la croit pas :
   * il recalcule `enf_<sha256(ownerUid|enfantId)>` et la jette si le résultat
   * n'est pas l'appelant. Import différé pour éviter un cycle entre stores.
   */
  async function famille() {
    try {
      const { useEnfantsAutonomesStore } = await import('./enfantsAutonomes')
      const e = useEnfantsAutonomesStore()
      if (!e.linkedOwnerUid || !e.linkedEnfantId) return undefined
      return { ownerUid: e.linkedOwnerUid, enfantId: e.linkedEnfantId }
    } catch { return undefined }
  }

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
      const r = await fetch('/mapo-offres.php', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'state', famille: await famille() }) })
      const d = await r.json().catch(() => ({}))
      if (d && d.ok) {
        offreId.value = d.offreId || 'decouverte'; tokens.value = d.tokens ?? 0
        cap.value = d.cap ?? tokens.value; bonus.value = d.bonus ?? 0
        potFamille.value = d.potFamille ?? potFamille.value
        estEnfant.value = !!d.estEnfant; conso.value = d.conso ?? 0; plafond.value = d.plafond ?? 0
        renewAt.value = d.renewAt || ''; insuffisant.value = false; plafondAtteint.value = false
        return true
      }
    } catch { /* offline */ }
    return false
  }

  // Consommation de CHAQUE enfant, vue du parent. Le client n'envoie que des
  // `enfantId` : le serveur reconstruit l'uid du compte à partir du sien, donc
  // il ne peut jamais renvoyer que les enfants de l'appelant.
  const enfantsUsage = ref([])   // [{ enfantId, tokens, cap, bonus }]

  async function fetchEnfantsUsage(enfantIds) {
    const t = await tok()
    if (!t || !Array.isArray(enfantIds) || !enfantIds.length) { enfantsUsage.value = []; return false }
    try {
      const r = await fetch('/mapo-offres.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify({ action: 'etat_enfants', enfantIds }),
      })
      const d = await r.json().catch(() => null)
      if (!d || !d.ok) return false
      enfantsUsage.value = Array.isArray(d.enfants) ? d.enfants : []
      potFamille.value = Number(d.potFamille) || 0
      return true
    } catch { return false }
  }

  /** Le parent fixe (0 = lève) le plafond hebdomadaire d'un enfant. */
  async function definirPlafondEnfant(enfantId, valeur) {
    const t = await tok()
    if (!t) return { ok: false }
    try {
      const r = await fetch('/mapo-offres.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify({ action: 'plafond_enfant', enfantId, plafond: valeur }),
      })
      const d = await r.json().catch(() => null)
      if (!d || !d.ok) return { ok: false }
      const l = enfantsUsage.value.find((x) => x.enfantId === enfantId)
      if (l) l.plafond = d.plafond
      return { ok: true, plafond: d.plafond }
    } catch { return { ok: false } }
  }

  /**
   * ⚠️ COURSE À L'INITIALISATION, corrigée le 13/08.
   *
   * Le lien de famille (`linkedOwnerUid` / `linkedEnfantId`) est résolu par
   * `enfantsAutonomes.hydrate()`. Or les composants ENFANTS montent AVANT leur
   * vue parente : `MiapoAlerteUsage` appelait donc `load()` avant que le lien
   * soit connu. Sans déclaration de famille, le serveur répondait avec le
   * compte PROPRE de l'enfant — zéro, puisqu'il n'a pas de jauge à lui — et
   * l'app annonçait « crédits épuisés » à une enfant dont la famille avait près
   * de deux millions de crédits.
   *
   * On re-demande donc l'état dès que le lien apparaît. Une surveillance, pas
   * un ordre d'appel imposé : elle tient quel que soit l'ordre de montage, y
   * compris pour les écrans qu'on ajoutera plus tard.
   */
  let lienSurveille = false
  async function surveillerLienFamille() {
    if (lienSurveille) return
    lienSurveille = true
    try {
      const { useEnfantsAutonomesStore } = await import('./enfantsAutonomes')
      const e = useEnfantsAutonomesStore()
      watch(() => e.linkedEnfantId, (id) => { if (id) fetchState() })
    } catch { /* sans effet : on garde l'état déjà chargé */ }
  }

  async function load() {
    await fetchOffres()
    if (isDemo.value) { loadLocal(); return }
    const ok = await fetchState()
    if (!ok) loadLocal()
    surveillerLienFamille()
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
    // Un appel qui aboutit prouve qu'on pouvait payer : le refus précédent est
    // caduc. Sans ça, l'écran « épuisé » survivrait à une recharge.
    insuffisant.value = false
    if (isDemo.value) saveLocal()
  }
  /**
   * Le serveur a refusé la dernière action faute de crédits.
   *
   * On NE FALSIFIE PLUS le solde : on note que l'action n'était pas payable, et
   * on enregistre les soldes RÉELS que le serveur renvoie avec son refus.
   */
  function marquerEpuise(soldes, motif) {
    insuffisant.value = true
    plafondAtteint.value = motif === 'plafond_atteint'
    if (soldes && typeof soldes.conso === 'number') conso.value = soldes.conso
    if (soldes && typeof soldes.plafond === 'number') plafond.value = soldes.plafond
    if (soldes && typeof soldes.tokens === 'number') tokens.value = soldes.tokens
    if (soldes && typeof soldes.cap === 'number') cap.value = soldes.cap
    if (soldes && typeof soldes.bonus === 'number') bonus.value = soldes.bonus
    if (isDemo.value) saveLocal()
  }

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
      insuffisant.value = false // le code vient de renflouer : on rouvre l'usage
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

  return { isDemo, offreId, tokens, cap, bonus, renewAt, remiseFamille, devise, packs, offres, offre, offresPayantes, guichet, relanceWhatsappDispo, refreshDevise, restant, utilise, pourcentage, jaugeTotal, jaugeUtilise, rationne, disponible, épuisé, insuffisant, plafondAtteint, estEnfant, conso, plafond, enfantsUsage, potFamille, fetchEnfantsUsage, definirPlafondEnfant, load, fetchState, activerDemo, activerDemoCredits, majJauge, marquerEpuise, utiliserCodeCredits }
})
