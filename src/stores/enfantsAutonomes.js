import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { auth as fbAuth, db } from '../firebase'
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore'

// Persistance Firestore (durable + multi-appareils) pour les VRAIS comptes B2C.
// La démo (fbAuth.currentUser === null) reste en localStorage (offline, gratuit).
function cloudUid() { return fbAuth.currentUser ? fbAuth.currentUser.uid : null }

// ── Stockage : UN DOCUMENT PAR ENFANT ────────────────────────────────
// Firestore donne accès à un document ENTIER ou à rien : tant que la fratrie
// vivait dans un seul document `b2c/enfants`, un enfant ne pouvait pas lire son
// propre profil sans voir ceux de ses frères et sœurs. D'où l'éclatement en
// `b2c/enfant_<id>` — préalable au compte propre de l'enfant.
// L'ancien document groupé reste écrit en repli (voir persist()).
function b2cCol(uid) { return collection(db, 'users', uid, 'b2c') }
function enfantDocRef(uid, id) { return doc(db, 'users', uid, 'b2c', `enfant_${id}`) }
function legacyDocRef(uid) { return doc(db, 'users', uid, 'b2c', 'enfants') }

/**
 * Store « enfantsAutonomes » — profils enfants gérés par le PARENT, hors école
 * (MIAPO en mode B2C autonome). Le parent crée l'enfant, saisit ses notes (et,
 * plus tard, photographie ses copies). MIAPO en déduit les faiblesses puis
 * propose révision / prépa examen / orientation. C'est la même IA que l'espace
 * école, juste une autre porte d'entrée des données (profil « école-optionnel »).
 *
 * Persistance : localStorage par parent. Repli EN MÉMOIRE si le quota est saturé
 * (la démo école remplit déjà le localStorage) → la fonctionnalité reste
 * démontrable même sans place disque navigateur.
 */

const KEY = (owner) => `mapo_enfants_autonomes_${owner || 'demo'}`

// Niveaux courants (secondaire Afrique francophone) — series pour le lycée.
// Niveaux du primaire (Cameroun / Afrique francophone) et du secondaire.
export const NIVEAUX_PRIMAIRE = ['SIL', 'CP', 'CE1', 'CE2', 'CM1', 'CM2']
export const NIVEAUX_SECONDAIRE = [
  '6ème', '5ème', '4ème', '3ème',
  '2nde A', '2nde C', '2nde D',
  '1ère A', '1ère C', '1ère D',
  'Tle A', 'Tle C', 'Tle D',
]
// Niveaux du supérieur (LMD africain) — pour l'étudiant universitaire.
export const NIVEAUX_SUPERIEUR = ['Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2', 'Doctorat']
// Liste plate (primaire → secondaire → supérieur) — conservée pour compatibilité.
export const NIVEAUX = [...NIVEAUX_PRIMAIRE, ...NIVEAUX_SECONDAIRE, ...NIVEAUX_SUPERIEUR]
export function isNiveauSuperieur(niveau) { return NIVEAUX_SUPERIEUR.includes(niveau) }

// Apprenant adulte / autonome dont le cursus n'est PAS au catalogue scolaire
// (MBA, BTS, certif, MOOC, prépa concours, langue, permis…). Quand l'apprenant
// choisit ce « niveau », il saisit librement le NOM de sa formation (champ
// `formation`) et, plus tard, son URL (`formationUrl`, Étape 2). Le profil reste
// le même modèle ; seul le point d'entrée du cursus change.
export const NIVEAU_HORS_CATALOGUE = 'Formation (hors catalogue)'

export const PAYS = [
  { code: 'CM', label: 'Cameroun' },
  { code: 'SN', label: 'Sénégal' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'GA', label: 'Gabon' },
  { code: 'FR', label: 'France' },
  { code: 'autre', label: 'Autre' },
]

// Matières proposées à la saisie (le parent choisit + met une note /20).
// Secondaire (défaut) et primaire, pour que la liste colle au niveau de l'enfant.
export const MATIERES = [
  'Mathématiques', 'Français', 'Anglais', 'Physique-Chimie', 'SVT',
  'Histoire-Géographie', 'Philosophie', 'Informatique', 'Espagnol', 'Allemand', 'ECM',
]
export const MATIERES_PRIMAIRE = [
  'Français', 'Mathématiques', 'Anglais', 'Sciences', 'Histoire-Géographie',
  'Éducation civique et morale', 'Informatique',
]
// Renvoie la liste de matières adaptée au niveau (primaire vs secondaire).
export function matieresPourNiveau(niveau) {
  return NIVEAUX_PRIMAIRE.includes(niveau) ? MATIERES_PRIMAIRE : MATIERES
}

/**
 * Clé de jour LOCALE (AAAA-MM-JJ). On n'utilise pas toISOString() : il convertit
 * en UTC et ferait basculer la séance au mauvais jour selon le fuseau.
 */
export function jourISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * Identifiant local unique. `Date.now()` SEUL ne suffit pas : plusieurs créations
 * dans la même milliseconde (l'amorçage démo crée ses 4 notes d'affilée, un
 * import en crée des dizaines) recevaient toutes le MÊME id — supprimer une
 * note les supprimait donc TOUTES. Et depuis l'éclatement du stockage, l'id
 * d'un enfant EST la clé de son document Firestore : deux enfants créés coup
 * sur coup s'écraseraient l'un l'autre.
 */
function localId(prefix) {
  return prefix + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36)
}

export const useEnfantsAutonomesStore = defineStore('enfantsAutonomes', () => {
  const authStore = useAuthStore()
  const enfants = ref([])
  let memoryFallback = false

  const owner = computed(() => authStore.userProfile?.email || authStore.userProfile?.phone || 'demo-parent')

  // Co-parent : si mon compte est rattaché à un parent propriétaire (pointeur
  // `users/{uid}/b2c/link`), mes données « enfants » sont les SIENNES.
  const linkedOwnerUid = ref(null)
  function dataUid() { return linkedOwnerUid.value || cloudUid() }

  // ── Mode d'usage de MAPO+ (multi-personas, 1er pas) ──────────────────
  // 'parent'    : un parent suit son/ses enfant(s) (cadre par défaut).
  // 'apprenant' : l'apprenant (élève/étudiant) pilote SON propre apprentissage.
  // Même moteur, même profil — seul le point de vue (langage, sujet) change.
  const MODE_KEY = (o) => `mapo_miapo_mode_${o || 'demo'}`
  const mode = ref('parent')
  function setMode(m) {
    mode.value = m === 'apprenant' ? 'apprenant' : 'parent'
    try { localStorage.setItem(MODE_KEY(owner.value), mode.value) } catch { /* quota : on garde en mémoire */ }
  }
  function loadMode() {
    try { mode.value = localStorage.getItem(MODE_KEY(owner.value)) === 'apprenant' ? 'apprenant' : 'parent' } catch { mode.value = 'parent' }
    loadSession()
  }

  // ── « Mode Netflix » : le parent confie le téléphone à un enfant ────────
  // On reste sur le MÊME compte (pas de reconnexion) : l'appli bascule en vue
  // apprenant sur l'enfant choisi. Le retour au profil parent demande un code.
  // NB : ce code est un garde-fou d'usage (empêcher l'enfant de revenir dans
  // l'espace parent), PAS un secret cryptographique.
  const PIN_KEY = (o) => `mapo_miapo_pin_${o || 'demo'}`
  const SESS_KEY = (o) => `mapo_miapo_childsess_${o || 'demo'}`
  const parentPin = ref('')
  const childSessionId = ref('')

  function loadSession() {
    try {
      parentPin.value = localStorage.getItem(PIN_KEY(owner.value)) || ''
      childSessionId.value = localStorage.getItem(SESS_KEY(owner.value)) || ''
    } catch { parentPin.value = ''; childSessionId.value = '' }
  }
  function setParentPin(pin) {
    parentPin.value = String(pin || '').trim()
    try { localStorage.setItem(PIN_KEY(owner.value), parentPin.value) } catch { /* quota */ }
  }
  /** Confie le téléphone à un enfant : vue apprenant verrouillée sur lui. */
  function startChildSession(enfantId) {
    if (!enfantId) return false
    childSessionId.value = enfantId
    try { localStorage.setItem(SESS_KEY(owner.value), enfantId) } catch { /* quota */ }
    setMode('apprenant')
    return true
  }
  /** Retour au profil parent — refusé si le code ne correspond pas. */
  function endChildSession(pin) {
    if (parentPin.value && String(pin || '').trim() !== parentPin.value) return false
    childSessionId.value = ''
    try { localStorage.removeItem(SESS_KEY(owner.value)) } catch { /* silent */ }
    setMode('parent')
    return true
  }

  function load() {
    loadMode()
    try {
      const raw = localStorage.getItem(KEY(owner.value))
      enfants.value = raw ? JSON.parse(raw) : []
    } catch {
      enfants.value = []
    }
  }

  /** Cache local (affichage instantané + hors-ligne). Silencieux si quota plein. */
  function cacheLocal() {
    if (memoryFallback) return
    try {
      localStorage.setItem(KEY(owner.value), JSON.stringify(enfants.value))
    } catch {
      memoryFallback = true // quota dépassé → on bascule en mémoire, sans casser
    }
  }

  /**
   * Écrit l'état courant. `enfantId` (optionnel) = ne pousser QUE cet enfant vers
   * Firestore, ce qui est le cas de presque toutes les mutations (une note, une
   * séance… concernent un seul profil).
   */
  function persist(enfantId) {
    cacheLocal()
    // Miroir Firestore pour les vrais comptes (durable, cross-appareils).
    // Co-parent : on écrit dans l'espace du parent propriétaire (droits partagés).
    const uid = dataUid()
    if (!uid) return
    const at = new Date().toISOString()
    const cibles = enfantId ? enfants.value.filter((e) => e.id === enfantId) : enfants.value
    for (const e of cibles) {
      setDoc(enfantDocRef(uid, e.id), { enfant: e, updatedAt: at })
        .catch(() => { /* offline : le cache Firestore réessaiera */ })
    }
    // Repli : l'ancien document groupé continue d'être écrit. Un appareil qui
    // sert encore l'ancien bundle (service worker) ne lit QUE celui-là — cesser
    // de l'alimenter lui ferait perdre les mises à jour.
    setDoc(legacyDocRef(uid), { enfants: enfants.value, updatedAt: at })
      .catch(() => { /* idem */ })
  }

  /**
   * Hydrate les enfants depuis Firestore (vrais comptes) : le cloud fait
   * autorité pour retrouver le suivi sur un autre appareil. Sans effet en démo.
   */
  async function hydrate() {
    load() // local d'abord (affichage instantané, offline)
    // Démo : amorcer un écolier cohérent pour que l'espace MAPO+ ne soit pas vide.
    if (authStore.isDemo) seedDemoIfEmpty()
    const myUid = cloudUid()
    if (!myUid) return
    // Co-parent : le pointeur `b2c/link` désigne le parent propriétaire des enfants.
    try {
      const ls = await getDoc(doc(db, 'users', myUid, 'b2c', 'link'))
      linkedOwnerUid.value = ls.exists() ? (ls.data()?.ownerUid || null) : null
    } catch { linkedOwnerUid.value = null }
    const uid = dataUid()
    try {
      // La sous-collection `b2c` héberge aussi `link` (pointeur co-parent) et
      // `enfants` (ancien document groupé) : on ne retient que les `enfant_*`.
      const snap = await getDocs(b2cCol(uid))
      const profils = snap.docs
        .filter((d) => d.id.startsWith('enfant_'))
        .map((d) => d.data()?.enfant)
        .filter(Boolean)
      if (profils.length) {
        enfants.value = profils
        cacheLocal()
        return
      }
      // Migration (idempotente) : aucun document éclaté → on reprend l'ancien
      // document groupé comme source, puis persist() écrit un document par
      // enfant. Tant qu'un `enfant_*` existe, cette branche n'est plus prise.
      const legacy = snap.docs.find((d) => d.id === 'enfants')
      if (legacy && Array.isArray(legacy.data()?.enfants)) {
        enfants.value = legacy.data().enfants
        cacheLocal()
        if (enfants.value.length) persist()
      }
    } catch { /* offline / non autorisé : on garde l'état local */ }
  }

  function addEnfant({ firstName, lastName, gender, niveau, pays, cycle, ecole, filiere, photoURL, formation, formationUrl, formationModules }) {
    const enfant = {
      id: localId('ea-'),
      firstName: (firstName || '').trim(),
      lastName: (lastName || '').trim(),
      gender: gender === 'F' ? 'F' : 'M',
      cycle: cycle || '',       // 'primaire' | 'secondaire' | 'superieur'
      niveau: niveau || '3ème', // la classe (SIL, 6ème, 2nde, 2e année…) OU « Formation (hors catalogue) »
      pays: pays || 'CM',
      ecole: (ecole || '').trim(),
      filiere: (filiere || '').trim(),                 // filière/spécialité (étudiant du supérieur)
      formation: (formation || '').trim(),             // nom libre de la formation (apprenant hors-catalogue)
      formationUrl: (formationUrl || '').trim(),       // URL du programme de la formation (Étape 2)
      formationModules: (formationModules || '').trim(), // modules/matières saisis à la main (plan B, séparés par des virgules)
      photoURL: photoURL || '',
      // Objectif de note (sur 20) choisi par la famille : toute note EN DESSOUS
      // est proposée à la révision. 10 par défaut, modifiable dans le profil —
      // viser 10 en CM2 et 14 en Terminale n'a pas le même sens.
      objectifNote: 10,
      // Séances de révision : { 'AAAA-MM-JJ': { matiere, status, at } }
      // status ∈ 'done' | 'skipped'. Une journée sans entrée = simplement pas
      // encore faite (ou jour de repos) — ce qui ne casse pas la série.
      seances: {},
      notes: [], // [{ id, matiere, note }]
      revisions: [], // [{ id, matiere, themes:[] }] — faiblesses détectées (photo de copie)
      edt: [], // [{ id, jour, heure, matiere }] — emploi du temps (saisie / scan / import)
      createdAt: new Date().toISOString(),
    }
    enfants.value.push(enfant)
    persist(enfant.id)
    return enfant.id
  }

  function removeEnfant(id) {
    enfants.value = enfants.value.filter((e) => e.id !== id)
    const uid = dataUid()
    if (uid) deleteDoc(enfantDocRef(uid, id)).catch(() => { /* offline */ })
    persist()
  }

  /** Met à jour la fiche de profil (config) d'un enfant/apprenant. */
  function updateEnfant(id, patch) {
    const e = getEnfant(id)
    if (!e || !patch) return
    for (const k of ['firstName', 'lastName', 'gender', 'cycle', 'niveau', 'pays', 'ecole', 'filiere', 'formation', 'formationUrl', 'formationModules', 'photoURL']) {
      if (k in patch) e[k] = typeof patch[k] === 'string' ? patch[k].trim?.() ?? patch[k] : patch[k]
    }
    if ('objectifNote' in patch) {
      const v = Number(patch.objectifNote)
      e.objectifNote = Number.isFinite(v) ? Math.max(0, Math.min(20, v)) : 10
    }
    persist(id)
  }

  function getEnfant(id) {
    return enfants.value.find((e) => e.id === id) || null
  }

  /**
   * Moteur de cours (apprenant hors-catalogue) : enregistre le résultat de la
   * décomposition MIAPO — les MODULES (→ formationModules, string, qui pilote la
   * boucle notes/quiz/progression + le détail des notions) et le PLAN séquencé
   * (formationPlan : [{periode, module, objectif, actions[]}]).
   */
  function setFormationPlan(enfantId, { modules = [], plan = [] } = {}) {
    const e = getEnfant(enfantId)
    if (!e) return
    const mods = (Array.isArray(modules) ? modules : [])
      .map((m) => (typeof m === 'string'
        ? { titre: m.trim(), notions: [] }
        : { titre: String(m?.titre || '').trim(), notions: Array.isArray(m?.notions) ? m.notions.map((x) => String(x).trim()).filter(Boolean) : [] }))
      .filter((m) => m.titre)
    if (mods.length) {
      e.formationModules = mods.map((m) => m.titre).join(', ')
      e.formationModulesDetail = mods
    }
    if (Array.isArray(plan)) e.formationPlan = plan
    e.formationPlanAt = new Date().toISOString()
    persist(enfantId)
  }

  function addNote(enfantId, matiere, note) {
    const e = getEnfant(enfantId)
    if (!e) return
    const n = Math.max(0, Math.min(20, Number(note)))
    if (Number.isNaN(n) || !matiere) return
    // remplace la note existante de la matière, sinon ajoute
    const existing = e.notes.find((x) => x.matiere === matiere)
    if (existing) existing.note = n
    else e.notes.push({ id: localId('n-'), matiere, note: n })
    persist(enfantId)
  }

  function removeNote(enfantId, noteId) {
    const e = getEnfant(enfantId)
    if (!e) return
    e.notes = e.notes.filter((x) => x.id !== noteId)
    persist(enfantId)
  }

  // ── Emploi du temps (créneaux) ──
  function addCreneau(enfantId, creneau) {
    const e = getEnfant(enfantId)
    if (!e) return
    if (!Array.isArray(e.edt)) e.edt = []
    e.edt.push({ id: 'cr-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), jour: creneau.jour || '', heure: creneau.heure || '', matiere: (creneau.matiere || '').trim() })
    persist(enfantId)
  }
  function removeCreneau(enfantId, crId) {
    const e = getEnfant(enfantId)
    if (!e || !Array.isArray(e.edt)) return
    e.edt = e.edt.filter((x) => x.id !== crId)
    persist(enfantId)
  }
  function setEdt(enfantId, creneaux) {
    const e = getEnfant(enfantId)
    if (!e) return
    e.edt = (creneaux || []).map((c) => ({ id: 'cr-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), jour: c.jour || '', heure: c.heure || '', matiere: (c.matiere || '').trim() })).filter((c) => c.matiere)
    persist(enfantId)
  }

  /** Matières fragiles d'un enfant (note < objectif) triées de la plus faible. */
  function faiblesses(enfantId) {
    const e = getEnfant(enfantId)
    if (!e) return []
    const seuil = objectifDe(e)
    return [...e.notes].filter((n) => n.note < seuil).sort((a, b) => a.note - b.note)
  }

  // ── Séances de révision (agenda actionnable) ──────────────────────────
  /** Marque une séance : 'done' (faite) ou 'skipped' (reportée). */
  function setSeance(enfantId, jour, matiere, status) {
    const e = getEnfant(enfantId)
    if (!e || !jour) return
    if (!e.seances) e.seances = {}
    if (status === 'todo') delete e.seances[jour]
    else e.seances[jour] = { matiere: matiere || '', status, at: new Date().toISOString() }
    persist(enfantId)
  }
  function getSeance(enfantId, jour) {
    const e = getEnfant(enfantId)
    return (e && e.seances && e.seances[jour]) || null
  }
  /**
   * Série : jours consécutifs (en remontant depuis aujourd'hui) avec une séance
   * faite. Un jour SANS séance programmée (repos, week-end) ne casse pas la
   * série ; une séance programmée et non faite, oui — sauf aujourd'hui, encore
   * en cours.
   */
  function serieRevision(enfantId) {
    const e = getEnfant(enfantId)
    if (!e || !e.seances) return 0
    let n = 0
    const d = new Date(); d.setHours(0, 0, 0, 0)
    for (let i = 0; i < 90; i++) {
      const s = e.seances[jourISO(d)]
      if (s && s.status === 'done') n++
      else if (s && i > 0) break
      d.setDate(d.getDate() - 1)
    }
    return n
  }

  /** Objectif de note de l'enfant (sur 20). 10 par défaut. */
  function objectifDe(e) {
    const v = Number(e && e.objectifNote)
    return Number.isFinite(v) && v > 0 ? v : 10
  }

  // Révisions ciblées : faiblesses détectées par la lecture d'une copie (photo).
  // Alimentent « À réviser » et ciblent les notions du quiz (champ themes).
  function addRevisionCiblee(enfantId, matiere, themes) {
    const e = getEnfant(enfantId)
    if (!e || !matiere) return
    if (!Array.isArray(e.revisions)) e.revisions = []
    const list = Array.isArray(themes) ? themes.map((t) => String(t).trim()).filter(Boolean) : []
    const existing = e.revisions.find((r) => r.matiere === matiere)
    if (existing) existing.themes = [...new Set([...(existing.themes || []), ...list])]
    else e.revisions.push({ id: localId('rv-'), matiere, themes: list })
    persist(enfantId)
  }
  function removeRevision(enfantId, id) {
    const e = getEnfant(enfantId)
    if (!e || !Array.isArray(e.revisions)) return
    e.revisions = e.revisions.filter((r) => r.id !== id)
    persist(enfantId)
  }

  // ── Auto-évaluation 6C (orientation) ────────────────────────────────
  // Profil de compétences (Créativité, Esprit critique, Communication,
  // Coopération, Courage, Confiance), noté /5, persisté avec l'enfant.
  function setComp6c(enfantId, scores, answers) {
    const e = getEnfant(enfantId)
    if (!e || !scores) return
    const clean = {}
    for (const k of Object.keys(scores)) {
      let v = Math.max(1, Math.min(5, Number(scores[k])))
      if (!Number.isNaN(v)) clean[k] = Math.round(v * 10) / 10 // score = moyenne des items (1 décimale)
    }
    e.comp6c = clean
    e.comp6cAt = new Date().toISOString()
    if (answers && typeof answers === 'object') e.comp6cAnswers = answers // réponses brutes (refaire/traçabilité)
    e.comp6cBilan = null // le profil change → l'ancien bilan n'est plus valable
    persist(enfantId)
  }
  function getComp6c(enfantId) {
    const e = getEnfant(enfantId)
    return e && e.comp6c ? e.comp6c : null
  }
  /** Mémorise le bilan 6C généré (MIAPO ou local) pour l'afficher sans re-générer. */
  function setBilan6c(enfantId, bilan) {
    const e = getEnfant(enfantId)
    if (!e) return
    e.comp6cBilan = bilan || null
    persist(enfantId)
  }

  // Amorçage démo : un écolier cohérent (notes + profil 6C) pour montrer MAPO+
  // sans saisie préalable. Démo uniquement, et seulement si aucun enfant.
  function seedDemoIfEmpty() {
    if (enfants.value.length) return
    const id = addEnfant({ firstName: 'Awa', lastName: 'Démo', gender: 'F', niveau: '5ème', pays: 'CM' })
    addNote(id, 'Mathématiques', 8)
    addNote(id, 'Français', 14)
    addNote(id, 'Anglais', 11)
    addNote(id, 'SVT', 9)
    setComp6c(id, { creativite: 4, esprit_critique: 3, communication: 4, cooperation: 4, courage: 3, confiance: 3 })
  }

  // Démo : (re)pose un profil UNIQUE cohérent avec le point de vue choisi sur
  // l'accueil MAPO+ (parent/élève → un écolier ; formation pro → un apprenant
  // ADULTE hors-catalogue, ex. MBA). Uniquement en démo — on repart propre à
  // chaque entrée pour montrer le bon persona. `kind` : 'ecolier' | 'pro'.
  function seedDemoAs(kind) {
    enfants.value = []
    if (kind === 'pro') {
      const id = addEnfant({
        firstName: 'Diane', lastName: 'Démo', gender: 'F',
        niveau: NIVEAU_HORS_CATALOGUE, pays: 'CM', cycle: 'superieur',
        formation: 'MBA — Management',
        formationModules: "Contrôle de gestion, Finance d'entreprise, Marketing, Stratégie",
      })
      addNote(id, 'Contrôle de gestion', 8)
      addNote(id, "Finance d'entreprise", 9)
      addNote(id, 'Marketing', 14)
      addNote(id, 'Stratégie', 12)
    } else {
      seedDemoIfEmpty()
    }
    persist()
  }

  return {
    enfants, mode, setMode, load, hydrate,
    parentPin, childSessionId, setParentPin, startChildSession, endChildSession,
    addEnfant, updateEnfant, removeEnfant, getEnfant,
    addNote, removeNote, faiblesses, objectifDe,
    setSeance, getSeance, serieRevision,
    addCreneau, removeCreneau, setEdt,
    addRevisionCiblee, removeRevision,
    setComp6c, getComp6c, setBilan6c, seedDemoAs, setFormationPlan,
  }
})
