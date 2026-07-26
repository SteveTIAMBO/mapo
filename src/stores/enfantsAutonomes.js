import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { auth as fbAuth, db } from '../firebase'
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore'
import { enregistrerActivite } from '../utils/recompenses'
import { addCoursPerso } from '../utils/coursPerso'

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

// ── France (édition pilotée par le pays du profil = 'FR') ──
// Réforme du lycée 2019 : plus de séries A/C/D, mais 2nde / 1re / Terminale.
export const NIVEAUX_PRIMAIRE_FR = ['CP', 'CE1', 'CE2', 'CM1', 'CM2']
export const NIVEAUX_SECONDAIRE_FR = ['6e', '5e', '4e', '3e', '2nde', '1re', 'Terminale']
export function niveauxPrimairePays(pays) { return pays === 'FR' ? NIVEAUX_PRIMAIRE_FR : NIVEAUX_PRIMAIRE }
export function niveauxSecondairePays(pays) { return pays === 'FR' ? NIVEAUX_SECONDAIRE_FR : NIVEAUX_SECONDAIRE }

// Apprenant adulte / autonome dont le cursus n'est PAS au catalogue scolaire
// (MBA, BTS, certif, MOOC, prépa concours, langue, permis…). Quand l'apprenant
// choisit ce « niveau », il saisit librement le NOM de sa formation (champ
// `formation`) et, plus tard, son URL (`formationUrl`, Étape 2). Le profil reste
// le même modèle ; seul le point d'entrée du cursus change.
export const NIVEAU_HORS_CATALOGUE = 'Formation (hors catalogue)'

// Pays choisi à l'inscription (accueil MAPO+) → adapte niveaux/matières/notes.
// Sert de valeur par défaut à la création des profils. Persisté localement.
export const B2C_PAYS_KEY = 'mapo_b2c_pays'
export function paysParDefaut() { try { return localStorage.getItem(B2C_PAYS_KEY) || 'CM' } catch { return 'CM' } }
export function setPaysParDefaut(code) { try { if (code) localStorage.setItem(B2C_PAYS_KEY, code) } catch { /* ignore */ } }

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
// Référentiel national camerounais (sous-système francophone), programme uniforme
// public = privé. Primaire : MINEDUB (APC, mêmes disciplines de la SIL au CM2).
export const MATIERES_PRIMAIRE = [
  'Français', 'Anglais', 'Mathématiques', 'Sciences et technologie',
  'Histoire', 'Géographie', 'Éducation à la citoyenneté et à la morale (ECM)',
  'Informatique (TIC)', 'Langues et cultures nationales',
  'Éducation artistique', 'Éducation physique et sportive (EPS)',
]
// Secondaire 1er cycle (6e-3e) — tronc commun MINESEC (sanction : BEPC).
export const MATIERES_SECONDAIRE_1ER_CYCLE = [
  'Français', 'Anglais', 'Mathématiques', 'Physique-Chimie-Technologie (PCT)',
  'SVT', 'Histoire', 'Géographie', 'Éducation à la citoyenneté et à la morale (ECM)',
  'Informatique', 'Éducation physique et sportive (EPS)',
  'Deuxième langue (Espagnol/Allemand)', 'Langues et cultures nationales',
]
// Second cycle — série A (littéraire).
export const MATIERES_SERIE_A = [
  'Français', 'Philosophie', 'Littérature', 'Anglais',
  'Deuxième langue (Espagnol/Allemand)', 'Histoire', 'Géographie',
  'Éducation à la citoyenneté et à la morale (ECM)', 'Mathématiques',
  'Informatique', 'Éducation physique et sportive (EPS)',
]
// Second cycle — série C (mathématiques & sciences physiques).
export const MATIERES_SERIE_C = [
  'Mathématiques', 'Physique', 'Chimie', 'SVT', 'Technologie', 'Informatique',
  'Français', 'Philosophie', 'Anglais', 'Histoire', 'Géographie',
  'Éducation à la citoyenneté et à la morale (ECM)', 'Éducation physique et sportive (EPS)',
]
// Second cycle — série D (mathématiques & sciences de la vie).
export const MATIERES_SERIE_D = [
  'Mathématiques', 'SVT', 'Physique', 'Chimie', 'Informatique',
  'Français', 'Philosophie', 'Anglais', 'Histoire', 'Géographie',
  'Éducation à la citoyenneté et à la morale (ECM)', 'Éducation physique et sportive (EPS)',
]
const NIVEAUX_PREMIER_CYCLE = ['6ème', '5ème', '4ème', '3ème']

// ── Référentiel FRANCE (Éducation nationale) — même programme public/privé sous contrat ──
export const MATIERES_PRIMAIRE_FR = [
  'Français', 'Mathématiques', 'Anglais (LV1)', 'Sciences et technologie',
  'Histoire-Géographie', 'Enseignement moral et civique (EMC)',
  'Éducation physique et sportive (EPS)', 'Arts plastiques', 'Éducation musicale',
]
export const MATIERES_COLLEGE_FR = [
  'Français', 'Mathématiques', 'Histoire-Géographie', 'Enseignement moral et civique (EMC)',
  'Anglais (LV1)', 'LV2 (Espagnol/Allemand)', 'Sciences de la vie et de la Terre (SVT)',
  'Physique-Chimie', 'Technologie', 'Éducation physique et sportive (EPS)',
  'Arts plastiques', 'Éducation musicale',
]
export const MATIERES_LYCEE_2NDE_FR = [
  'Français', 'Histoire-Géographie', 'Anglais (LVA)', 'LVB (Espagnol/Allemand)',
  'Sciences économiques et sociales (SES)', 'Mathématiques', 'Physique-Chimie',
  'Sciences de la vie et de la Terre (SVT)', 'Éducation physique et sportive (EPS)',
  'Enseignement moral et civique (EMC)', 'Sciences numériques et technologie (SNT)',
]
// Tronc commun 1re/Tle : Français en 1re → Philosophie en Terminale (filtré selon le niveau).
const MATIERES_LYCEE_CYCLE_TERMINAL_FR = [
  'Français', 'Philosophie', 'Histoire-Géographie', 'Anglais (LVA)',
  'LVB (Espagnol/Allemand)', 'Enseignement scientifique',
  'Éducation physique et sportive (EPS)', 'Enseignement moral et civique (EMC)',
]
// 13 spécialités du lycée général — à ajouter au profil selon le choix de l'élève.
export const SPECIALITES_LYCEE_GENERAL_FR = [
  'Mathématiques', 'Physique-Chimie', 'Sciences de la vie et de la Terre (SVT)',
  'Sciences économiques et sociales (SES)',
  'Histoire-géographie, géopolitique et sciences politiques (HGGSP)',
  'Humanités, littérature et philosophie (HLP)',
  'Langues, littératures et cultures étrangères (LLCER)',
  'Littératures et langues et cultures de l’Antiquité (LLCA)',
  'Numérique et sciences informatiques (NSI)', 'Sciences de l’ingénieur (SI)',
  'Arts', 'Biologie-écologie', 'Éducation physique, pratiques et culture sportives (EPPCS)',
]
function matieresFR(niveau) {
  if (NIVEAUX_PRIMAIRE_FR.includes(niveau)) return MATIERES_PRIMAIRE_FR
  if (['6e', '5e', '4e', '3e'].includes(niveau)) return MATIERES_COLLEGE_FR
  if (niveau === '2nde') return MATIERES_LYCEE_2NDE_FR
  if (niveau === '1re') return MATIERES_LYCEE_CYCLE_TERMINAL_FR.filter((m) => m !== 'Philosophie')
  if (niveau === 'Terminale') return MATIERES_LYCEE_CYCLE_TERMINAL_FR.filter((m) => m !== 'Français')
  return MATIERES_COLLEGE_FR
}

// Renvoie la liste de matières adaptée au niveau ET au pays.
// Cameroun : primaire APC, 1er cycle 6e-3e, séries A/C/D (philo 1ère/Tle). France : matieresFR().
export function matieresPourNiveau(niveau, pays) {
  if (pays === 'FR') return matieresFR(niveau)
  if (NIVEAUX_PRIMAIRE.includes(niveau)) return MATIERES_PRIMAIRE
  if (NIVEAUX_PREMIER_CYCLE.includes(niveau)) return MATIERES_SECONDAIRE_1ER_CYCLE
  if (typeof niveau === 'string') {
    let liste = null
    if (/ A$/.test(niveau)) liste = MATIERES_SERIE_A
    else if (/ C$/.test(niveau)) liste = MATIERES_SERIE_C
    else if (/ D$/.test(niveau)) liste = MATIERES_SERIE_D
    if (liste) return niveau.startsWith('2nde') ? liste.filter((m) => m !== 'Philosophie') : liste
  }
  return MATIERES
}

// Types de note selon le pays (proposés à la saisie, après le choix de la matière).
export const TYPES_NOTE_CM = ['Devoir', 'Note de séquence', 'Note trimestrielle']
export const TYPES_NOTE_FR = ['Devoir sur table', 'Devoir maison', 'Interrogation', 'Moyenne trimestrielle', 'Moyenne annuelle']
export function typesNotePays(pays) { return pays === 'FR' ? TYPES_NOTE_FR : TYPES_NOTE_CM }

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

  const owner = computed(() => {
    const p = authStore.userProfile
    if (p?.email) return p.email
    if (p?.phone) return p.phone
    // Compte réel authentifié dont le profil n'est pas encore chargé : on se cale
    // sur l'uid, JAMAIS sur 'demo-parent'. Ce seau de repli est adjacent aux
    // données de démo ; un vrai compte ne doit jamais y lire/écrire (source du
    // mélange démo ↔ production). Seule une session démo utilise un seau démo.
    if (authStore.user?.uid && !authStore.isDemo) return 'uid-' + authStore.user.uid
    return 'demo-parent'
  })

  // Co-parent : si mon compte est rattaché à un parent propriétaire (pointeur
  // `users/{uid}/b2c/link`), mes données « enfants » sont les SIENNES.
  const linkedOwnerUid = ref(null)
  function dataUid() { return linkedOwnerUid.value || cloudUid() }

  // Compte ENFANT : le même pointeur `link` porte en plus un `enfantId`. Il change
  // tout — je ne suis pas un second parent, je suis UN élève, et je n'ai droit
  // qu'à mon propre document. Cf. stores/enfantsComptes.js.
  const linkedEnfantId = ref(null)
  const isCompteEnfant = computed(() => !!linkedEnfantId.value)

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
    // SAUF depuis un compte enfant : ce document contient TOUTE la fratrie, il
    // n'a ni le droit ni la moindre raison de le réécrire (il l'écraserait avec
    // son seul profil).
    if (isCompteEnfant.value) return
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
    // Le pointeur `b2c/link` désigne le parent propriétaire. S'il porte un
    // `enfantId`, je suis un compte ENFANT et non un co-parent.
    try {
      const ls = await getDoc(doc(db, 'users', myUid, 'b2c', 'link'))
      const lien = ls.exists() ? ls.data() : null
      linkedOwnerUid.value = lien?.ownerUid || null
      linkedEnfantId.value = lien?.enfantId || null
    } catch { linkedOwnerUid.value = null; linkedEnfantId.value = null }
    const uid = dataUid()

    // Compte enfant : lecture DIRECTE de mon seul document. Surtout pas un
    // `list` sur `b2c` — la règle refuserait la requête entière (elle exige que
    // TOUS les documents renvoyés soient autorisés, et ceux de ma fratrie ne le
    // sont pas). C'est voulu : l'isolement vient de la règle, pas de l'écran.
    if (linkedEnfantId.value) {
      setMode('apprenant')
      try {
        const snap = await getDoc(enfantDocRef(uid, linkedEnfantId.value))
        const profil = snap.exists() ? snap.data()?.enfant : null
        if (profil) { enfants.value = [profil]; cacheLocal() }
      } catch { /* offline / non autorisé : on garde l'état local */ }
      return
    }

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

  function addEnfant({ firstName, lastName, gender, niveau, pays, age, cycle, ecole, ecoleReliee, filiere, photoURL, formation, formationUrl, formationModules }) {
    const enfant = {
      id: localId('ea-'),
      firstName: (firstName || '').trim(),
      lastName: (lastName || '').trim(),
      gender: gender === 'F' ? 'F' : 'M',
      cycle: cycle || '',       // 'primaire' | 'secondaire' | 'superieur'
      niveau: niveau || '3ème', // la classe (SIL, 6ème, 2nde, 2e année…) OU « Formation (hors catalogue) »
      pays: pays || 'CM',
      age: (age != null ? String(age) : '').trim(),  // âge (facultatif) → calibre la longueur des sessions
      ecole: (ecole || '').trim(),
      ecoleReliee: !!ecoleReliee,  // apprenant RÉELLEMENT rattaché à une école MAPO (cours profs, devoirs, examens)
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
    for (const k of ['firstName', 'lastName', 'gender', 'cycle', 'niveau', 'pays', 'age', 'ecole', 'filiere', 'formation', 'formationUrl', 'formationModules', 'photoURL', 'certifId', 'organisme', 'certifDate', 'passions', 'metiersVises']) {
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

  function addNote(enfantId, matiere, note, type) {
    const e = getEnfant(enfantId)
    if (!e) return
    const n = Math.max(0, Math.min(20, Number(note)))
    if (Number.isNaN(n) || !matiere) return
    // remplace la note existante de la matière, sinon ajoute (type = devoir/séquence/trimestre…)
    const existing = e.notes.find((x) => x.matiere === matiere)
    if (existing) { existing.note = n; if (type !== undefined) existing.type = type }
    else e.notes.push({ id: localId('n-'), matiere, note: n, type: type || '' })
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

  /** Date (jour ISO) de la dernière séance FAITE, ou '' si aucune. Sert à la relance. */
  function derniereRevision(enfantId) {
    const e = getEnfant(enfantId)
    if (!e || !e.seances) return ''
    const jours = Object.keys(e.seances).filter((j) => e.seances[j] && e.seances[j].status === 'done').sort()
    return jours.length ? jours[jours.length - 1] : ''
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
  /** Centres d'intérêt / passions de l'apprenant (orientation) — liste de clés de thèmes. */
  function setInterets(enfantId, interets) {
    const e = getEnfant(enfantId)
    if (!e) return
    e.interets = Array.isArray(interets) ? interets.filter(Boolean) : []
    persist(enfantId)
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
    // Awa : apprenante B2C NON rattachée à une école (auto-inscription).
    const id = addEnfant({ firstName: 'Awa', lastName: 'Nkeng', gender: 'F', niveau: '5ème', pays: 'CM' })
    addNote(id, 'Mathématiques', 8)
    addNote(id, 'Français', 14)
    addNote(id, 'Anglais', 11)
    addNote(id, 'SVT', 9)
    // Profil sur le référentiel élargi à 10 compétences (WEF 2025 + OCDE 2030).
    setComp6c(id, { creativite: 4, esprit_critique: 3, communication: 4, cooperation: 4, courage: 3, confiance: 3, resilience: 4, curiosite: 5, motivation: 3, responsabilite: 4 })
    // Cours importés « tests » (comme si Awa les avait ajoutés) → tous les modules
    // de révision fonctionnent, et le quiz peut tirer ses questions de ces cours.
    try {
      addCoursPerso(id, { matiere: 'Mathématiques', titre: 'Les fractions', contenu: "Une fraction a/b : a est le numérateur, b le dénominateur (b ≠ 0). Fractions équivalentes : on multiplie/divise numérateur et dénominateur par le même nombre (2/3 = 4/6). Pour additionner des fractions de même dénominateur, on ajoute les numérateurs : 1/5 + 2/5 = 3/5. Simplifier : diviser par le PGCD." })
      addCoursPerso(id, { matiere: 'Français', titre: 'Le sujet du verbe', contenu: "Le sujet fait l'action du verbe. Pour le trouver, on pose la question « Qui est-ce qui… ? » ou « Qu'est-ce qui… ? » devant le verbe. Ex : « Les oiseaux chantent » → Qui est-ce qui chante ? → les oiseaux (sujet). Le sujet peut être un nom, un groupe nominal ou un pronom." })
      addCoursPerso(id, { matiere: 'SVT', titre: 'La digestion', contenu: "La digestion transforme les aliments en nutriments assimilables. Elle commence dans la bouche (mastication + salive), se poursuit dans l'estomac (sucs gastriques) puis l'intestin grêle où les nutriments passent dans le sang. Les déchets sont évacués par le gros intestin." })
    } catch { /* best-effort démo */ }
    // Historique d'activité → badges/récompenses visibles (démo).
    try { for (let i = 0; i < 12; i++) enregistrerActivite(id, { format: i % 3 === 0 ? 'chat' : 'quiz' }) } catch { /* best-effort */ }
  }

  // Démo : (re)pose un profil UNIQUE cohérent avec le point de vue choisi sur
  // l'accueil MAPO+ (parent/élève → un écolier ; formation pro → un apprenant
  // ADULTE hors-catalogue, ex. MBA). Uniquement en démo — on repart propre à
  // chaque entrée pour montrer le bon persona. `kind` : 'ecolier' | 'pro'.
  function seedDemoAs(kind) {
    enfants.value = []
    if (kind === 'pro') {
      if (paysParDefaut() === 'FR') {
        // Apprenante adulte française (formation / certification, hors catalogue) :
        // le profil doit rester cohérent avec le pays choisi à l'inscription.
        const id = addEnfant({
          firstName: 'Camille', lastName: 'Démo', gender: 'F',
          niveau: NIVEAU_HORS_CATALOGUE, pays: 'FR', cycle: 'superieur',
          ecole: 'IAE Paris',
          formation: 'Master 2 — Management',
          formationModules: "Contrôle de gestion, Finance d'entreprise, Marketing, Stratégie",
        })
        addNote(id, 'Contrôle de gestion', 11, 'Partiel')
        addNote(id, "Finance d'entreprise", 12, 'Partiel')
        addNote(id, 'Marketing', 14, 'Partiel')
        addNote(id, 'Stratégie', 13, 'Partiel')
      } else {
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
      }
    } else if (paysParDefaut() === 'FR') {
      // Démo adaptée au pays choisi à l'inscription : lycéenne française (1re).
      const id = addEnfant({
        firstName: 'Léa', lastName: 'Démo', gender: 'F', niveau: '1re', pays: 'FR', ecole: 'Lycée Victor Hugo',
        formationModules: [...matieresFR('1re'), 'Mathématiques', 'Physique-Chimie'].join(', '),
      })
      addNote(id, 'Mathématiques', 11, 'Moyenne trimestrielle')
      addNote(id, 'Physique-Chimie', 9, 'Moyenne trimestrielle')
      addNote(id, 'Français', 14, 'Moyenne trimestrielle')
      addNote(id, 'Histoire-Géographie', 13, 'Moyenne trimestrielle')
      setComp6c(id, { creativite: 4, esprit_critique: 4, communication: 3, cooperation: 4, courage: 3, confiance: 3 })
    } else {
      seedDemoIfEmpty()
    }
    persist()
  }

  return {
    enfants, mode, setMode, load, hydrate, isCompteEnfant,
    parentPin, childSessionId, setParentPin, startChildSession, endChildSession,
    addEnfant, updateEnfant, removeEnfant, getEnfant,
    addNote, removeNote, faiblesses, objectifDe,
    setSeance, getSeance, serieRevision,
    addCreneau, removeCreneau, setEdt,
    addRevisionCiblee, removeRevision,
    setComp6c, getComp6c, setInterets, setBilan6c, seedDemoAs, setFormationPlan,
    derniereRevision, owner,
  }
})
