import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { auth as fbAuth, db } from '../firebase'
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore'
import { enregistrerActivite } from '../utils/recompenses'
import { addCoursPerso } from '../utils/coursPerso'
import { DEMO_LIEN } from '../data/demoEcoleLiee'
import { baremePour, versAcquisition, maxDe, paliersDe } from '../data/baremes'
import { ROLE_ENFANT, ROLE_APPRENANT, typeProfilPour, typeProfilDe } from '../utils/typeProfil'

// Les rôles dont le titulaire APPREND (par opposition au parent qui suit).
const ROLES_APPRENANTS = [ROLE_APPRENANT, ROLE_ENFANT]

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
// Version des données de DÉMO : à incrémenter dès que l'amorçage démo change
// (profil élargi à 10 compétences, suppression du 2e enfant…) → purge auto de la
// démo périmée dans le navigateur. N'affecte QUE la démo, jamais un vrai compte.
const DEMO_VERSION = 4
const DEMO_VERSION_KEY = (owner) => `mapo_ea_demo_version_${owner || 'demo'}`

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
export function niveauxPrimairePays(pays) {
  if (pays === 'FR') return NIVEAUX_PRIMAIRE_FR
  if (pays === 'CD') return NIVEAUX_PRIMAIRE_CD
  return NIVEAUX_PRIMAIRE
}
export function niveauxSecondairePays(pays) {
  if (pays === 'FR') return NIVEAUX_SECONDAIRE_FR
  if (pays === 'CD') return NIVEAUX_SECONDAIRE_CD
  if (pays === 'SN') return NIVEAUX_SECONDAIRE_SN
  if (pays === 'CI') return NIVEAUX_SECONDAIRE_CI
  return NIVEAUX_SECONDAIRE
}

// ── Cycle → classes ────────────────────────────────────────────────────
// Source de vérité UNIQUE pour « quelles classes proposer ».
//
// Les écrans présentaient auparavant les trois cycles dans un seul menu
// déroulant, séparés par des intitulés de groupe. Un parent camerounais qui
// inscrit son enfant en CM1 y faisait défiler des classes de Terminale et des
// années de Master. On choisit d'abord le cycle, la liste se réduit ensuite —
// c'est déjà ce que fait la page d'inscription.
export const CYCLES = ['primaire', 'secondaire', 'superieur']

export function niveauxPourCycle(cycle, pays) {
  if (cycle === 'primaire') return niveauxPrimairePays(pays)
  if (cycle === 'secondaire') return niveauxSecondairePays(pays)
  if (cycle === 'superieur') return NIVEAUX_SUPERIEUR
  return []
}

/**
 * Cycle d'une classe donnée. Indispensable pour les profils DÉJÀ créés : ils
 * portent une classe mais souvent pas de cycle (le champ ne leur avait jamais
 * été demandé). Sans cette déduction, ouvrir leur profil afficherait un cycle
 * vide et donc une liste de classes vide — on effacerait leur niveau en leur
 * demandant de le confirmer.
 */
export function cycleDuNiveau(niveau, pays) {
  if (!niveau) return ''
  if (niveau === NIVEAU_HORS_CATALOGUE) return 'superieur'
  if (niveauxPrimairePays(pays).includes(niveau)) return 'primaire'
  if (niveauxSecondairePays(pays).includes(niveau)) return 'secondaire'
  if (NIVEAUX_SUPERIEUR.includes(niveau)) return 'superieur'
  // Classe d'un autre pays (l'enfant a changé de système) : on ne devine pas,
  // on cherche dans tous les référentiels avant d'abandonner.
  if (NIVEAUX_PRIMAIRE.includes(niveau) || NIVEAUX_PRIMAIRE_FR.includes(niveau)) return 'primaire'
  if (NIVEAUX_SECONDAIRE.includes(niveau) || NIVEAUX_SECONDAIRE_FR.includes(niveau)) return 'secondaire'
  return ''
}

// ── RD Congo ──
// Primaire de 6 ans en trois degrés (élémentaire 1re-2e, moyen 3e-4e, terminal
// 5e-6e). Secondaire : 2 ans de cycle d'orientation (7e, 8e) puis 4 ans
// d'humanités (pédagogique, littéraire, scientifique…).
export const NIVEAUX_PRIMAIRE_CD = ['1re primaire', '2e primaire', '3e primaire', '4e primaire', '5e primaire', '6e primaire']
// Le ministère nomme les classes en DOUBLE : « 7ème année de l'Éducation de Base
// (1ère secondaire) », puis « 1ère année des Humanités (3ème secondaire) »… On
// affiche les deux, sinon un parent congolais ne reconnaît pas la classe de son
// enfant selon l'école qui lui parle.
export const NIVEAUX_SECONDAIRE_CD = [
  '7e année (1re secondaire)', '8e année (2e secondaire)',
  '1re humanités (3e secondaire)', '2e humanités (4e secondaire)',
  '3e humanités (5e secondaire)', '4e humanités (6e secondaire)',
]

// ── Référentiel RD Congo (MEPST / Ministère de l'Éducation nationale et de la
// Nouvelle Citoyenneté). Programmes nationaux publiés par le ministère :
// edu-nc.gouv.cd/national-programmes.
//
// Primaire : français, mathématiques, éveil (sciences/histoire/géographie),
// langues nationales, éducation civique et morale, EPS, arts. L'informatique a
// son propre programme national au primaire.
export const MATIERES_PRIMAIRE_CD = [
  'Français', 'Mathématiques', 'Éveil (sciences, histoire, géographie)',
  'Langues nationales', 'Éducation civique et morale',
  'Éducation physique et sport', 'Arts plastiques et musique', 'Informatique',
]
// Éducation de base, 7e et 8e année (1re et 2e secondaire). Les sciences y sont
// organisées en Domaine d'Apprentissage des Sciences : mathématiques, SVT, et
// sciences physiques/technologie/TIC — c'est le découpage des programmes officiels.
export const MATIERES_BASE_CD = [
  'Français', 'Mathématiques', 'Sciences de la vie et de la Terre (SVT)',
  'Sciences physiques, technologie et TIC', 'Histoire', 'Géographie',
  'Éducation civique et morale', 'Anglais', 'Langues nationales',
  'Éducation physique et sport',
]
// Humanités (3e à 6e secondaire), tronc général. Les options (scientifique,
// pédagogique, commerciale et gestion, technique…) ajoutent leurs branches
// propres : à sourcer option par option, on ne les invente pas ici.
export const MATIERES_HUMANITES_CD = [
  'Français', 'Mathématiques', 'Sciences de la vie et de la Terre (SVT)',
  'Sciences physiques, technologie et TIC', 'Histoire', 'Géographie',
  'Éducation civique et morale', 'Anglais', 'Philosophie', 'Économie',
  'Informatique', 'Éducation physique et sport',
]

// ── Sénégal ──
// Moyen : 6e → 3e (sanction BFEM). Secondaire général : 2nde → Terminale, avec
// des SÉRIES qui ne ressemblent pas à celles du Cameroun — imposer A/C/D à une
// école de Dakar l'empêche simplement de déclarer ses classes.
// Source : CAOSP (Centre académique de l'orientation scolaire et
// professionnelle, caosp-pikine.gouv.sn), « Les séries de l'enseignement général ».
export const NIVEAUX_SECONDAIRE_SN = [
  '6e', '5e', '4e', '3e',
  '2nde L', '2nde S',
  "1re L1a", "1re L1b", "1re L'1", '1re L2', '1re S1', '1re S2', '1re S3',
  'Tle L1a', 'Tle L1b', "Tle L'1", 'Tle L2', 'Tle S1', 'Tle S2', 'Tle S3',
]

// Tronc commun du moyen sénégalais (6e-3e).
export const MATIERES_MOYEN_SN = [
  'Français', 'Anglais', 'Mathématiques', 'Sciences physiques', 'SVT',
  'Histoire-Géographie', 'Éducation physique et sportive (EPS)',
]
// Matières DOMINANTES de chaque série, telles que le CAOSP les décrit (ce sont
// elles qui portent les forts coefficients). On y ajoute le tronc commun, sans
// lequel la liste serait inutilisable au quotidien. Les coefficients eux-mêmes
// ne sont pas modélisés ici — MAPO+ ne pondère pas encore les matières.
const DOMINANTES_SN = {
  L1a: ['Français', 'Philosophie', 'Latin ou Arabe classique', 'Grec'],
  L1b: ['Français', 'Philosophie', 'Latin ou Arabe classique', 'Deuxième langue vivante (LV2)'],
  "L'1": ['Français', 'Philosophie', 'Anglais (LV1)', 'Deuxième langue vivante (LV2)'],
  L2: ['Philosophie', 'Histoire-Géographie', 'Français', 'Anglais (LV1)', 'Économie générale'],
  S1: ['Mathématiques', 'Sciences physiques'],
  S2: ['SVT', 'Sciences physiques', 'Mathématiques'],
  S3: ['Mathématiques', 'Sciences physiques', 'SVT'],
}
const COMMUN_LYCEE_SN = ['Français', 'Anglais (LV1)', 'Histoire-Géographie', 'Mathématiques', 'Éducation physique et sportive (EPS)']

/** Matières d'un niveau sénégalais. Série reconnue par le suffixe du niveau. */
export function matieresSN(niveau) {
  const n = String(niveau || '')
  if (['6e', '5e', '4e', '3e'].includes(n)) return MATIERES_MOYEN_SN
  // La seconde n'est pas encore différenciée en série : L ou S seulement.
  if (/^2nde/.test(n)) {
    const base = /S$/.test(n) ? ['Mathématiques', 'Sciences physiques', 'SVT'] : ['Français', 'Philosophie', 'Histoire-Géographie']
    return [...new Set([...base, ...COMMUN_LYCEE_SN])]
  }
  const serie = Object.keys(DOMINANTES_SN).find((k) => n.endsWith(' ' + k))
  if (serie) return [...new Set([...DOMINANTES_SN[serie], ...COMMUN_LYCEE_SN])]
  return MATIERES_MOYEN_SN
}

// ── Côte d'Ivoire ──
// Seconde A (littéraire) ou C (scientifique), puis séries A1, A2, C et D.
// Proches des séries camerounaises mais PAS identiques : la Côte d'Ivoire
// distingue A1 (langues vivantes) et A2 (humanités et sciences sociales) là où
// le Cameroun n'a qu'une série A. Baccalauréat délivré par la DECO (MENA).
export const NIVEAUX_SECONDAIRE_CI = [
  '6e', '5e', '4e', '3e',
  '2nde A', '2nde C',
  '1re A1', '1re A2', '1re C', '1re D',
  'Tle A1', 'Tle A2', 'Tle C', 'Tle D',
]

// EDHC (Éducation aux Droits de l'Homme et à la Citoyenneté) est la matière
// civique ivoirienne — ce n'est pas l'ECM camerounaise, ni l'EMC française.
// Tronc commun du LYCÉE. Inchangé : l'index du DPFC n'expose pas de créneau
// lycée pour EDHC, l'éducation musicale ni l'EPS, mais une absence dans un
// index de publication ne prouve pas qu'une matière n'est pas enseignée — au
// collège les créneaux existent tous, ce qui rend l'absence parlante ; au lycée
// l'index est lacunaire. On ne retire donc rien ici sans source positive.
const COMMUN_CI = ['Français', 'Anglais', 'Histoire-Géographie', 'Mathématiques', 'EDHC', 'Éducation physique et sportive (EPS)']
/**
 * Tronc commun du COLLÈGE (6è-3è).
 * Le DPFC publie un programme d'arts plastiques ET d'éducation musicale pour
 * chacune des quatre classes : ils manquaient. ⚠️ Ils ne remontent PAS au
 * lycée — l'éducation musicale n'y a aucun créneau dans l'index.
 */
const COMMUN_CI_COLLEGE = [...COMMUN_CI, 'Arts plastiques', 'Éducation musicale']
/**
 * CÔTE D'IVOIRE — la LV2 commence en 4ème.
 * Le DPFC ne publie l'espagnol et l'allemand qu'à partir de la 4ème
 * (ESPAGNOL_4eme.pdf, ALLEMAND_4eme.pdf), alors que l'anglais existe dès la 6ème.
 * ⚠️ En revanche, physique-chimie et SVT existent bien DÈS LA 6ÈME en Côte
 * d'Ivoire — contrairement à la France et au Cameroun. Ne pas uniformiser.
 */
const LV2_CI = ['Espagnol (LV2)', 'Allemand (LV2)']
const DOMINANTES_CI = {
  A1: ['Français', 'Philosophie', 'Anglais', 'Espagnol'],
  A2: ['Philosophie', 'Histoire-Géographie', 'Français', 'Anglais'],
  C: ['Mathématiques', 'Physique-Chimie', 'SVT'],
  D: ['SVT', 'Physique-Chimie', 'Mathématiques'],
}

/** Matières d'un niveau ivoirien. */
export function matieresCI(niveau) {
  const n = String(niveau || '')
  if (['6e', '5e'].includes(n)) return [...COMMUN_CI_COLLEGE, 'SVT', 'Physique-Chimie']
  if (['4e', '3e'].includes(n)) return [...COMMUN_CI_COLLEGE, 'SVT', 'Physique-Chimie', ...LV2_CI]
  if (/^2nde/.test(n)) {
    const base = /C$/.test(n) ? ['Mathématiques', 'Physique-Chimie', 'SVT'] : ['Français', 'Philosophie', 'Espagnol']
    return [...new Set([...base, ...COMMUN_CI])]
  }
  const serie = Object.keys(DOMINANTES_CI).find((k) => n.endsWith(' ' + k))
  if (serie) return [...new Set([...DOMINANTES_CI[serie], ...COMMUN_CI])]
  return [...COMMUN_CI_COLLEGE, 'SVT', 'Physique-Chimie']
}

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
  // ⚠️ DEUX Congo, à ne jamais confondre : « Congo-Brazzaville » (CG, +242,
  // Pointe-Noire, XAF) et « RD Congo » (CD, +243, Kinshasa, CDF). Les libellés
  // sont explicites pour que le parent ne se trompe pas de pays.
  { code: 'CG', label: 'Congo-Brazzaville' },
  { code: 'CD', label: 'RD Congo (Kinshasa)' },
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
/**
 * CAMEROUN, 6ème-5ème — le MINESEC publie DEUX jeux de programmes pour le 1er
 * cycle : « 6ème-5ème » et « 4ème-3ème ». Ce ne sont pas les mêmes matières.
 *
 *   • « Sciences » est UNE matière en 6ème-5ème ; elle se sépare en PCT et SVT
 *     en 4ème-3ème. Notre propre référentiel le dit déjà : cm-sciences porte
 *     matiereAussi = ['Physique-Chimie-Technologie (PCT)', 'SVT'] et ne couvre
 *     que 6ème et 5ème.
 *   • pas de LV2. Le MINESEC ne publie un programme d'espagnol que pour les
 *     4ème-3ème (programme_Espagnol_4eme3eme.pdf), et le dossier IP-LAL des
 *     6ème-5ème ne contient aucun programme de langue seconde.
 */
export const MATIERES_CM_6E_5E = [
  'Français', 'Anglais', 'Mathématiques', 'Sciences',
  'Histoire', 'Géographie', 'Éducation à la citoyenneté et à la morale (ECM)',
  'Informatique', 'Éducation physique et sportive (EPS)',
  'Langues et cultures nationales',
]
// Secondaire 1er cycle, 4ème-3ème — PCT et SVT séparés, LV2 introduite.
export const MATIERES_SECONDAIRE_1ER_CYCLE = [
  'Français', 'Anglais', 'Mathématiques', 'Physique-Chimie-Technologie (PCT)',
  'SVT', 'Histoire', 'Géographie', 'Éducation à la citoyenneté et à la morale (ECM)',
  'Informatique', 'Éducation physique et sportive (EPS)',
  // Le MINESEC publie « Programme Education artistique 4e 3e » dans IP-LAL :
  // la matière existe bien à ces deux niveaux, elle manquait au catalogue.
  // ⚠️ On ne l'ajoute PAS en 6ème-5ème : le dossier correspondant du ministère
  // ne contient qu'un guide pédagogique, donc rien ne l'atteste à ce niveau.
  'Éducation artistique',
  // ⚠️ Libellé conservé tel quel : des profils existants l'ont enregistré sous
  // cette chaîne exacte. Le ministère publie en réalité QUATRE langues
  // secondes (allemand, arabe, chinois, espagnol) plus les lettres classiques
  // (latin, grec) ; les moins courantes passent par « ajouter une matière »,
  // où leur référentiel est retrouvé par son nom.
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

/**
 * CONGO-BRAZZAVILLE — structure sourcée, PROGRAMME NON SOURCÉ.
 *
 * Ce que l'on sait : primaire CP1→CM2 (MEPSA 2008, repris par l'ODSEF),
 * secondaire 6e→Tle, notation sur 20 (décret n° 2013-295 du 25 juin 2013).
 * Tout cela vient du travail déjà fait côté ERP, on ne le refait pas.
 *
 * Ce que l'on ne sait PAS : la liste officielle des matières par classe. Les
 * trois portails du ministère sont hors service (enseignement-general.gouv.cg
 * et e-meppsa.net ne résolvent plus, meppsa.cg répond « deployment paused »).
 *
 * On ne fabrique donc pas un programme congolais. On propose un socle réduit
 * aux matières qu'aucune source ne contredit — celles qui structurent tout
 * collège d'enseignement général francophone, dont la géographie, attestée
 * comme discipline propre par le programme congolais publié par l'UNESCO —
 * et l'apprenant complète lui-même. ⚠️ Ne PAS gonfler cette liste par
 * analogie avec le Cameroun : c'est exactement l'erreur du référentiel
 * primaire camerounais imposé aux autres pays.
 */
export const MATIERES_PRIMAIRE_CG = [
  'Français', 'Mathématiques', 'Histoire', 'Géographie',
  'Éducation physique et sportive (EPS)',
]
export const MATIERES_SECONDAIRE_CG = [
  'Français', 'Mathématiques', 'Anglais', 'Histoire', 'Géographie',
  'Éducation physique et sportive (EPS)',
]
const NIVEAUX_PRIMAIRE_CG = ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2']

// ── Référentiel FRANCE (Éducation nationale) — même programme public/privé sous contrat ──
export const MATIERES_PRIMAIRE_FR = [
  'Français', 'Mathématiques', 'Anglais (LV1)', 'Sciences et technologie',
  'Histoire-Géographie', 'Enseignement moral et civique (EMC)',
  'Éducation physique et sportive (EPS)', 'Arts plastiques', 'Éducation musicale',
]
/**
 * 6e — DERNIÈRE ANNÉE DU CYCLE 3, et non première année du collège.
 *
 * C'est la source d'une erreur facile : la 6e se trouve au collège, donc on lui
 * sert le programme du collège. Or elle appartient au cycle 3, avec le CM1 et
 * le CM2. Deux conséquences que mes propres référentiels confirment :
 *
 *   • pas de LV2. L'enseignement d'une deuxième langue vivante commence en 5e
 *     (les classes bilangues sont une option, pas la règle) ;
 *   • « Sciences et technologie » est UNE matière, pas trois. SVT,
 *     physique-chimie et technologie ne se séparent qu'au cycle 4 — d'où les
 *     fichiers svt-cycle4, physique-chimie-cycle4 et technologie-cycle4, sans
 *     équivalent en 6e, face à sciences-technologie-cycle3.
 *
 * L'histoire des arts est également un enseignement de cycle 4 (référentiel
 * histoire-des-arts-cycle4 : 5e, 4e, 3e).
 *
 * Une 6e bilangue reste possible : l'apprenant AJOUTE la langue à son profil.
 * Le catalogue donne le cas général, pas la liste des exceptions.
 */
export const MATIERES_6E_FR = [
  'Français', 'Mathématiques', 'Histoire-Géographie', 'Enseignement moral et civique (EMC)',
  'Anglais (LV1)', 'Sciences et technologie',
  'Éducation physique et sportive (EPS)', 'Arts plastiques', 'Éducation musicale',
]
/** 5e, 4e, 3e — cycle 4 : la LV2 apparaît, les sciences se séparent. */
export const MATIERES_COLLEGE_FR = [
  'Français', 'Mathématiques', 'Histoire-Géographie', 'Enseignement moral et civique (EMC)',
  'Anglais (LV1)', 'Espagnol (LV2)', 'Allemand (LV2)', 'Italien (LV2)',
  'Sciences de la vie et de la Terre (SVT)',
  'Physique-Chimie', 'Technologie', 'Éducation physique et sportive (EPS)',
  'Arts plastiques', 'Éducation musicale', 'Histoire des arts',
]
export const MATIERES_LYCEE_2NDE_FR = [
  'Français', 'Histoire-Géographie', 'Anglais (LVA)',
  'Espagnol (LVB)', 'Allemand (LVB)', 'Italien (LVB)',
  'Sciences économiques et sociales (SES)', 'Mathématiques', 'Physique-Chimie',
  'Sciences de la vie et de la Terre (SVT)', 'Éducation physique et sportive (EPS)',
  'Enseignement moral et civique (EMC)', 'Sciences numériques et technologie (SNT)',
]
// Tronc commun 1re/Tle : Français en 1re → Philosophie en Terminale (filtré selon le niveau).
const MATIERES_LYCEE_CYCLE_TERMINAL_FR = [
  'Français', 'Philosophie', 'Histoire-Géographie', 'Anglais (LVA)',
  'Espagnol (LVB)', 'Allemand (LVB)', 'Italien (LVB)', 'Enseignement scientifique',
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
  if (niveau === '6e') return MATIERES_6E_FR // cycle 3, pas cycle 4
  if (['5e', '4e', '3e'].includes(niveau)) return MATIERES_COLLEGE_FR
  if (niveau === '2nde') return MATIERES_LYCEE_2NDE_FR
  if (niveau === '1re') return MATIERES_LYCEE_CYCLE_TERMINAL_FR.filter((m) => m !== 'Philosophie')
  if (niveau === 'Terminale') return MATIERES_LYCEE_CYCLE_TERMINAL_FR.filter((m) => m !== 'Français')
  return MATIERES_COLLEGE_FR
}

// Renvoie la liste de matières adaptée au niveau ET au pays.
// Cameroun : primaire APC, 1er cycle 6e-3e, séries A/C/D (philo 1ère/Tle). France : matieresFR().
export function matieresPourNiveau(niveau, pays) {
  if (pays === 'FR') return matieresFR(niveau)
  if (pays === 'SN') {
    if (NIVEAUX_PRIMAIRE.includes(niveau)) return MATIERES_PRIMAIRE
    return matieresSN(niveau)
  }
  if (pays === 'CI') {
    if (NIVEAUX_PRIMAIRE.includes(niveau)) return MATIERES_PRIMAIRE
    return matieresCI(niveau)
  }
  if (pays === 'CG') {
    if (NIVEAUX_PRIMAIRE_CG.includes(niveau)) return MATIERES_PRIMAIRE_CG
    return MATIERES_SECONDAIRE_CG
  }
  if (pays === 'CD') {
    if (NIVEAUX_PRIMAIRE_CD.includes(niveau)) return MATIERES_PRIMAIRE_CD
    if (/^(7e|8e) /.test(String(niveau))) return MATIERES_BASE_CD
    if (/humanités/i.test(String(niveau))) return MATIERES_HUMANITES_CD
    return MATIERES_HUMANITES_CD
  }
  if (NIVEAUX_PRIMAIRE.includes(niveau)) return MATIERES_PRIMAIRE
  if (['6ème', '5ème'].includes(niveau)) return MATIERES_CM_6E_5E // « Sciences », pas de LV2
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
    // Clé du cache LOCAL par COMPTE : on se cale sur l'UID Firebase (unique et stable
    // par compte, source de vérité côté cloud aussi). SURTOUT PAS l'e-mail : un e-mail
    // supprimé puis recréé — ou recyclé par une autre personne — donne un NOUVEAU
    // compte (uid différent) qui, s'il était indexé par e-mail, hériterait de l'ancien
    // profil resté en localStorage (bug « nouveau compte, ancien profil MBA »). Les
    // repères e-mail/téléphone ne servent que de repli hors Firebase (rare).
    if (authStore.user?.uid && !authStore.isDemo) return 'uid-' + authStore.user.uid
    const p = authStore.userProfile
    if (p?.email) return p.email
    if (p?.phone) return p.phone
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

  // Le profil de l'enfant n'a pas pu être chargé alors que la session EST celle
  // d'un enfant. Cause la plus fréquente : le document de reconnaissance
  // `users/<parent>/enfantsComptes/<enfantUid>` manque, donc la règle Firestore
  // refuse la lecture. Sans ce drapeau, l'échec était muet et l'écran d'appel
  // retombait sur « aucun enfant » — c'est-à-dire sur l'onboarding d'un PARENT,
  // servi à une enfant, à chaque connexion.
  const profilEnfantIndisponible = ref(false)

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
  /**
   * Le point de vue choisi vit en LOCAL, donc il ne suit pas l'utilisateur d'un
   * appareil à l'autre : un apprenant qui se reconnecte ailleurs retombait en
   * mode « parent », et se voyait proposer d'ajouter un enfant.
   *
   * Le profil du compte porte désormais le rôle réellement choisi à
   * l'inscription : il sert de repli quand aucun choix local n'existe. Le choix
   * local reste PRIORITAIRE — c'est lui qui porte la bascule « je confie le
   * téléphone », qui ne doit pas être annulée par le profil.
   */
  function loadMode() {
    let local = null
    try { local = localStorage.getItem(MODE_KEY(owner.value)) } catch { local = null }
    if (local === 'apprenant' || local === 'parent') mode.value = local
    // ⚠️ DEUX rôles apprennent : l'apprenant majeur qui gère son compte, et
    // l'enfant autonome à qui son parent a généré un accès. Ne tester que
    // 'apprenant' rangeait l'enfant du côté parent le temps qu'hydrate() lise
    // `b2c/link` — soit un espace parent affiché à un enfant à chaque ouverture.
    else mode.value = ROLES_APPRENANTS.includes(authStore.userProfile?.role) ? 'apprenant' : 'parent'
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
      // `typeProfil` est répété À LA RACINE du document, à côté de `updatedAt` :
      // c'est la seule ligne visible sans déplier la carte `enfant` dans la
      // console Firestore. La duplication est assumée — elle sert exactement à
      // ce qu'un humain qui regarde la base sache ce qu'il regarde.
      setDoc(enfantDocRef(uid, e.id), { enfant: e, typeProfil: typeProfilDe(e, authStore.userProfile?.role), updatedAt: at })
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
    // Démo : amorcer un écolier cohérent. On PURGE d'abord une démo périmée (issue
    // d'une version antérieure : ancien 2e enfant « Junior », profil 6 compétences au
    // lieu de 10…) via un numéro de version — sinon seedDemoIfEmpty ne rafraîchit
    // jamais des données démo déjà présentes.
    if (authStore.isDemo) {
      try {
        if (localStorage.getItem(DEMO_VERSION_KEY(owner.value)) !== String(DEMO_VERSION)) {
          enfants.value = []
          localStorage.removeItem(KEY(owner.value))
          localStorage.setItem(DEMO_VERSION_KEY(owner.value), String(DEMO_VERSION))
        }
      } catch { /* quota / privé : on continue */ }
      seedDemoIfEmpty()
    }
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
        // Lecture acceptée mais document absent : le rattachement est incomplet.
        profilEnfantIndisponible.value = !profil && !enfants.value.length
      } catch (e) {
        // Refus de la règle ou hors ligne. On garde le cache local s'il existe ;
        // sinon on le DIT, au lieu de laisser croire à un premier lancement.
        profilEnfantIndisponible.value = !enfants.value.length
        if (!enfants.value.length) console.warn('[MAPO+] profil enfant illisible', e?.code || e)
      }
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
        // Rattrapage des fiches créées avant l'existence du champ : on le pose
        // une fois, puis on n'a plus jamais à le déduire. Silencieux et
        // idempotent — dès la 2e ouverture, `manquants` est vide.
        const manquants = profils.filter((p) => !p.typeProfil)
        if (manquants.length) {
          const t = typeProfilPour(authStore.userProfile?.role)
          for (const p of manquants) p.typeProfil = t
          cacheLocal()
          for (const p of manquants) persist(p.id)
        }
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

  function addEnfant({ firstName, lastName, gender, niveau, pays, age, cycle, ecole, ecoleReliee, matricule, filiere, photoURL, formation, formationUrl, formationModules }) {
    const enfant = {
      id: localId('ea-'),
      // ⚠️ QUI est décrit par cette fiche. L'identifiant du document
      // (`b2c/enfant_<id>`) est une CLÉ TECHNIQUE, pas une information : la
      // fiche d'un adulte en MBA s'y appelait aussi « enfant_… », et personne,
      // en ouvrant la console Firestore, ne pouvait faire la différence.
      // On l'écrit donc à la création, une fois pour toutes.
      typeProfil: typeProfilPour(authStore.userProfile?.role),
      firstName: (firstName || '').trim(),
      lastName: (lastName || '').trim(),
      gender: gender === 'F' ? 'F' : 'M',
      cycle: cycle || '',       // 'primaire' | 'secondaire' | 'superieur'
      niveau: niveau || '3ème', // la classe (SIL, 6ème, 2nde, 2e année…) OU « Formation (hors catalogue) »
      pays: pays || 'CM',
      age: (age != null ? String(age) : '').trim(),  // âge (facultatif) → calibre la longueur des sessions
      ecole: (ecole || '').trim(),
      ecoleReliee: !!ecoleReliee,  // apprenant RÉELLEMENT rattaché à une école MAPO (cours profs, devoirs, examens)
      // Matricule national de l'élève (« carte scolaire » — plateforme obligatoire
      // du secondaire au Cameroun). Il SUIT l'élève d'un établissement à l'autre :
      // c'est la CLÉ D'IDENTITÉ qui permettra de relier ce compte MAPO+ au dossier
      // MAPO de son école (cours des profs, devoirs, notes, bulletins — #124) sans
      // ambiguïté ni doublon. Vide tant que l'école ne l'a pas fourni.
      matricule: (matricule || '').trim(),
      // Lien école ↔ MAPO+ (#124) : rempli APRÈS avoir saisi le code d'autorisation
      // délivré par l'école (le serveur scelle le lien de confiance). Contient
      // { schoolId, eleveId, className, classId, matricule } → sert de contexte aux
      // appels au pont serveur (devoirs, puis cours/notes/bulletins). null = non relié.
      lienEcole: null,
      filiere: (filiere || '').trim(),                 // filière/spécialité (étudiant du supérieur)
      formation: (formation || '').trim(),             // nom libre de la formation (apprenant hors-catalogue)
      formationUrl: (formationUrl || '').trim(),       // URL du programme de la formation (Étape 2)
      formationModules: (formationModules || '').trim(), // modules/matières saisis à la main (plan B, séparés par des virgules)
      photoURL: photoURL || '',
      // Objectif de note (sur 20) choisi par la famille : toute note EN DESSOUS
      // est proposée à la révision. 10 par défaut, modifiable dans le profil —
      // viser 10 en CM2 et 14 en Terminale n'a pas le même sens.
      // `null` = pas encore choisi → `objectifDe` prend la moitié de l'échelle.
      // Surtout pas 10 en dur : sur une échelle de 10 (primaire sénégalais et
      // ivoirien) cela exigerait la note maximale, et TOUT deviendrait une faiblesse.
      objectifNote: null,
      // Objectifs PAR MATIÈRE : { 'Mathématiques': 14, … }. Surcharge l'objectif
      // global pour cette matière seulement — viser 14 en maths et 10 en sport
      // est la demande normale d'une famille. Vide = tout suit le global.
      objectifs: {},
      // Surcharge du barème ('' = déduit du pays et du niveau, cf. data/baremes.js).
      bareme: '',
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
    if (uid) {
      deleteDoc(enfantDocRef(uid, id)).catch(() => { /* offline */ })
      // ⚠️ La fiche ne vit pas seule : le tuteur écrit QUATRE documents par
      // apprenant sous `users/{uid}/revisions/` (cf. stores/tuteur.js). Supprimer
      // la seule fiche laissait donc derrière elle la progression, l'historique
      // de séances, les conversations et les récompenses — invisibles dans
      // l'app, mais bien présentes, et rattachables à la personne.
      for (const n of [id, `history_${id}`, `conversations_${id}`, `recompenses_${id}`]) {
        deleteDoc(doc(db, 'users', uid, 'revisions', n)).catch(() => { /* absent ou offline */ })
      }
    }
    persist()
  }

  /** Met à jour la fiche de profil (config) d'un enfant/apprenant. */
  function updateEnfant(id, patch) {
    const e = getEnfant(id)
    if (!e || !patch) return
    for (const k of ['firstName', 'lastName', 'gender', 'cycle', 'niveau', 'pays', 'age', 'ecole', 'matricule', 'ecoleReliee', 'filiere', 'formation', 'formationUrl', 'formationModules', 'photoURL', 'certifId', 'organisme', 'certifDate', 'passions', 'metiersVises', 'bareme']) {
      if (k in patch) e[k] = typeof patch[k] === 'string' ? patch[k].trim?.() ?? patch[k] : patch[k]
    }
    if ('objectifNote' in patch) {
      const v = Number(patch.objectifNote)
      const max = maxSaisie(e)
      e.objectifNote = Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : max / 2
    }
    persist(id)
  }

  function getEnfant(id) {
    return enfants.value.find((e) => e.id === id) || null
  }

  /**
   * Scelle le lien école ↔ MAPO+ (#124) sur le profil, APRÈS validation du code
   * par le pont serveur (mapo-lien.php → action redeem). `lien` =
   * { schoolId, eleveId, className, classId, matricule, ecole? }. On marque
   * l'apprenant « relié » : le module Devoirs (puis cours/notes) s'active alors,
   * et les appels au pont utilisent ce contexte. Le lien de confiance vit CÔTÉ
   * ÉCOLE (schools/{sid}/liens_mapoplus/{uid}) ; ici on ne garde que le contexte.
   */
  function lierEcole(enfantId, lien) {
    const e = getEnfant(enfantId)
    if (!e || !lien || !lien.schoolId || !lien.eleveId) return false
    e.lienEcole = {
      schoolId: String(lien.schoolId), eleveId: String(lien.eleveId),
      className: String(lien.className || ''), classId: String(lien.classId || ''),
      matricule: String(lien.matricule || e.matricule || ''),
    }
    e.ecoleReliee = true
    if (lien.matricule) e.matricule = String(lien.matricule)
    if (lien.ecole && !e.ecole) e.ecole = String(lien.ecole)
    persist(enfantId)
    return true
  }
  /** Défait le lien école (l'apprenant redevient purement B2C autonome). */
  function delierEcole(enfantId) {
    const e = getEnfant(enfantId)
    if (!e) return
    e.lienEcole = null
    e.ecoleReliee = false
    persist(enfantId)
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
    if (note === '' || note === null || note === undefined || !matiere) return
    const bareme = baremeDe(e)
    // En barème par paliers, la « note » est un CODE (A, ECA, MS…), pas un nombre.
    const paliers = paliersDe(bareme)
    let n
    if (paliers) {
      const code = String(note).toUpperCase()
      if (!paliers.some((p) => p.code === code)) return
      n = code
    } else {
      n = Math.max(0, Math.min(maxSaisie(e), Number(note)))
      if (Number.isNaN(n)) return
    }
    // La note garde le barème utilisé à la SAISIE : un 8/10 du primaire reste
    // 80 % même après un passage au secondaire, qui bascule l'enfant sur 20.
    // remplace la note existante de la matière, sinon ajoute (type = devoir/séquence/trimestre…)
    const existing = e.notes.find((x) => x.matiere === matiere)
    if (existing) { existing.note = n; existing.bareme = bareme; if (type !== undefined) existing.type = type }
    else e.notes.push({ id: localId('n-'), matiere, note: n, type: type || '', bareme })
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
    // Comparaison en ACQUISITION, jamais en points bruts : une note et un
    // objectif peuvent être exprimés dans deux barèmes différents (un 8/10 saisi
    // au primaire face à un objectif sur 20 après passage au secondaire).
    // Seuil PAR MATIÈRE aussi : 11 est un échec en maths si la famille y vise 14,
    // et une réussite en sport si l'objectif global est 10.
    return [...e.notes]
      .filter((n) => {
        const a = acquisitionNote(n)
        const cible = acquisitionCible(e, n.matiere)
        return a != null && cible != null && a < cible
      })
      .sort((a, b) => acquisitionNote(a) - acquisitionNote(b))
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

  // ── Barème de l'apprenant ────────────────────────────────────────────
  // Le pays et le niveau décident du barème réel (le primaire sénégalais et
  // ivoirien note sur 10, pas sur 20) ; `e.bareme` le surcharge si la famille a
  // choisi. Cf. data/baremes.js — c'est là que vivent les régimes et leurs sources.
  function baremeDe(e) {
    return baremePour({ pays: e && e.pays, niveau: e && e.niveau, surcharge: e && e.bareme }).bareme
  }
  /** Barème d'APPOINT, affiché à côté de la note (APC au primaire camerounais,
   *  4 niveaux de maîtrise au collège français). null s'il n'y en a pas. */
  function complementDe(e) {
    return baremePour({ pays: e && e.pays, niveau: e && e.niveau, surcharge: e && e.bareme }).complement
  }
  /** Maximum saisissable pour cet apprenant (20, 10… ; 20 par défaut). */
  function maxSaisie(e) {
    const m = maxDe(baremeDe(e))
    return m == null ? 20 : m
  }
  /**
   * Acquisition (0..1) d'une note enregistrée. La note porte le barème EN
   * VIGUEUR AU MOMENT DE LA SAISIE : un 8/10 saisi au primaire reste 80 % même
   * si l'enfant passe au secondaire et bascule sur 20. Les notes d'avant cette
   * livraison n'ont pas de barème → /20, ce qui est ce qu'elles valaient.
   */
  function acquisitionNote(n) {
    return versAcquisition(n && n.note, (n && n.bareme) || 'note20')
  }
  /** Acquisition visée pour une matière (le seuil « en dessous, on révise »). */
  function acquisitionCible(e, matiere) {
    return versAcquisition(objectifDe(e, matiere), baremeDe(e))
  }

  /**
   * Objectif de note de l'enfant, exprimé DANS SON BARÈME.
   * Par défaut la moitié de l'échelle (10 sur 20, 5 sur 10).
   * Avec `matiere`, renvoie la surcharge de cette matière si elle existe.
   * C'est LE point unique où se décide « en dessous de quoi on révise ».
   */
  function objectifDe(e, matiere) {
    if (matiere && e && e.objectifs) {
      const o = Number(e.objectifs[matiere])
      if (Number.isFinite(o) && o > 0) return o
    }
    const v = Number(e && e.objectifNote)
    return Number.isFinite(v) && v > 0 ? v : maxSaisie(e) / 2
  }

  /**
   * Fixe (ou retire, avec `valeur` vide/null) l'objectif d'UNE matière.
   * On ne stocke pas une valeur égale au global : ça éviterait une surcharge
   * fantôme qui ne suivrait plus le global si la famille le change ensuite.
   */
  function setObjectifMatiere(enfantId, matiere, valeur) {
    const e = getEnfant(enfantId)
    if (!e || !matiere) return
    if (!e.objectifs) e.objectifs = {}
    const v = Number(valeur)
    if (valeur === '' || valeur == null || !Number.isFinite(v) || v <= 0 || v === objectifDe(e)) {
      delete e.objectifs[matiere]
    } else {
      e.objectifs[matiere] = Math.max(0, Math.min(maxSaisie(e), v))
    }
    persist(enfantId)
  }

  // Révisions ciblées : faiblesses détectées par la lecture d'une copie (photo).
  // Alimentent « À réviser » et ciblent les notions du quiz (champ themes).
  // `origine` : 'copie' (faiblesse lue sur une photo de copie, défaut historique)
  // ou 'parent' (le parent DEMANDE cette révision). L'enfant doit voir la
  // différence : « ton parent te propose » n'est pas « MIAPO a repéré ».
  function addRevisionCiblee(enfantId, matiere, themes, origine) {
    const e = getEnfant(enfantId)
    if (!e || !matiere) return
    if (!Array.isArray(e.revisions)) e.revisions = []
    const list = Array.isArray(themes) ? themes.map((t) => String(t).trim()).filter(Boolean) : []
    const existing = e.revisions.find((r) => r.matiere === matiere)
    if (existing) {
      existing.themes = [...new Set([...(existing.themes || []), ...list])]
      if (origine === 'parent') existing.origine = 'parent'
    } else {
      e.revisions.push({ id: localId('rv-'), matiere, themes: list, origine: origine === 'parent' ? 'parent' : 'copie' })
    }
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
    // Awa : apprenante B2C reliée à une école MAPO (Collège EDUFREM) pour que la
    // démo montre d'emblée la section « Mon école » (devoirs, cours, bulletins,
    // messagerie). On peut la délier pour retrouver le parcours de saisie du code.
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
    // Liaison école (démo) → section « Mon école » active dès l'entrée.
    try { lierEcole(id, { ...DEMO_LIEN }) } catch { /* best-effort démo */ }
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
    enfants, mode, setMode, load, hydrate, isCompteEnfant, linkedOwnerUid, linkedEnfantId,
    profilEnfantIndisponible,
    parentPin, childSessionId, setParentPin, startChildSession, endChildSession,
    addEnfant, updateEnfant, removeEnfant, getEnfant, lierEcole, delierEcole,
    addNote, removeNote, faiblesses, objectifDe, setObjectifMatiere,
    baremeDe, complementDe, maxSaisie, acquisitionNote, acquisitionCible,
    setSeance, getSeance, serieRevision,
    addCreneau, removeCreneau, setEdt,
    addRevisionCiblee, removeRevision,
    setComp6c, getComp6c, setInterets, setBilan6c, seedDemoAs, setFormationPlan,
    derniereRevision, owner,
  }
})
