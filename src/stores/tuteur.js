import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth as fbAuth, db } from '../firebase'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { isMapoPlusTenant } from '../utils/tenantContext'
import { enregistrerActivite, hydraterRecompenses } from '../utils/recompenses'
import { PALIERS_PAR_CLASSE, PALIER_APRES_CHANGEMENT, niveauSuivant } from '../utils/progressionNiveau'
import { appliquerSeance } from '../utils/jaugeNiveau'
import { enregistrerResultatElo } from '../utils/elo'
import { historiqueEpreuves, remplacerEpreuves } from '../utils/examenBlanc'
import { notionsAReprendre, suiviNotions, remplacerNotions } from '../utils/notions'
import { useMiapoAnalyticsStore } from './miapoAnalytics'
import { useAuthStore } from './auth'
import { useAbonnementStore } from './abonnement'

// Crédits MAPO+ : le décompte se fait CÔTÉ SERVEUR, et seulement pour le B2C
// (drapeau `metered`). L'école n'est pas décomptée. Hors ligne, l'appel IA
// échoue et l'app retombe sur la banque de quiz LOCALE (gratuite) → aucun
// crédit consommé, l'offline reste fonctionnel.
function mtrB2C() { try { return useAuthStore().isB2C } catch { return false } }

/**
 * Déclaration de famille jointe aux appels IA d'un compte ENFANT.
 *
 * Le serveur ne la croit PAS : il recalcule `enf_<sha256(ownerUid|enfantId)>` et
 * ne la retient que si le résultat est bien l'appelant authentifié. C'est ce qui
 * lui permet de puiser dans les crédits offerts au parent sans dépendre d'un
 * registre écrit à la création du compte — donc y compris pour les comptes
 * enfants créés avant que ce registre existe.
 */
function famB2C() {
  try {
    const e = useEnfantsAutonomesStore()
    if (!e.linkedOwnerUid || !e.linkedEnfantId) return undefined
    return { ownerUid: e.linkedOwnerUid, enfantId: e.linkedEnfantId }
  } catch { return undefined }
}
function noteCredits(json) {
  try {
    const a = useAbonnementStore()
    if (json && (typeof json.tokens === 'number' || typeof json.cap === 'number')) a.majJauge(json.tokens, json.cap)
    // On transmet les soldes RÉELS renvoyés avec le refus : le client ne doit
    // plus deviner « zéro » là où le serveur dit seulement « pas assez pour
    // cette action ».
    if (json && (json.error === 'credits_epuises' || json.error === 'plafond_atteint')) a.marquerEpuise(json, json.error)
  } catch { /* pas de contexte / offline : sans effet */ }
}
import { useUsageStore, COUT_ACTION } from './usage'
import { useMiapoRefStore } from './miapoRef'
import { notionsPourPrompt, sourceOfficielle, granulariteProgramme } from '../utils/referentiel'
import { useEnfantsAutonomesStore } from './enfantsAutonomes'

// Persistance Firestore (durable + multi-appareils) pour les VRAIS comptes.
// La démo (fbAuth.currentUser === null) reste en localStorage (offline, gratuit).
// Firestore est déjà configuré avec un cache local persistant (offline-first).
function cloudUid() { return fbAuth.currentUser ? fbAuth.currentUser.uid : null }

/**
 * Identifiant de l'espace où vivent les données de révision.
 *
 * ⚠️ CE N'EST PAS TOUJOURS L'UTILISATEUR CONNECTÉ. Sur un compte ENFANT, la
 * session est celle de l'enfant, mais son profil, ses notes et son planning
 * vivent dans l'espace de son PARENT (`enfantsAutonomes.dataUid()`).
 *
 * Ce store écrivait sous l'identifiant de la session. Résultat : l'enfant
 * révisait, son historique atterrissait dans SON dossier, tandis que le module
 * Progression — indexé sur le profil, donc sur le dossier du parent — cherchait
 * au mauvais endroit et n'affichait rien. Pire que l'affichage : le même enfant
 * se retrouvait avec DEUX historiques parallèles selon qu'il avait travaillé
 * depuis son compte ou depuis celui de sa mère.
 *
 * Une famille, un espace. Le `studentId` distingue les enfants entre eux.
 */
function proprietaireUid() {
  const moi = cloudUid()
  if (!moi) return null
  try {
    const enfants = useEnfantsAutonomesStore()
    return enfants.linkedOwnerUid || moi
  } catch {
    // Store non initialisé (appel très précoce) : on retombe sur la session.
    return moi
  }
}
function revisionDocRef(uid, studentId) {
  return doc(db, 'users', uid, 'revisions', studentId || 'self')
}

// ── Banque d'exercices PARTAGÉE (économie de tokens + hors-ligne) ───────
// Les quiz générés par l'IA sont stockés dans une collection commune
// `quizBank`, indexée par (matière, niveau, difficulté). Avant d'appeler
// l'IA, on réutilise ceux déjà produits (par n'importe quel élève) → 0 token,
// et ça fonctionne en faible connectivité (cache Firestore persistant).
// Best-effort : si la règle Firestore `quizBank` n'est pas publiée ou hors-ligne,
// on régénère simplement comme avant (aucune casse).
/**
 * Version de la banque de questions partagée.
 *
 * PURGE DU 16/08 — v2. Toutes les questions écrites AVANT la vérification par
 * solveur aveugle (server/mapo-ia.php) sont du contenu non contrôlé : la banque
 * contenait au moins une question dont aucune proposition n'était juste, servie
 * à tout élève du même niveau.
 *
 * On ne supprime pas les documents : on change la CLÉ. Les anciens deviennent
 * inatteignables d'un coup, sans toucher Firestore ni manipuler la clé de
 * service — même principe que l'empreinte des codes cadeaux. Ils pourront être
 * effacés depuis la console à loisir ; en attendant ils ne coûtent que du
 * stockage.
 *
 * ⚠️ INCRÉMENTER À CHAQUE FOIS qu'on renforce le contrôle qualité : c'est la
 * seule façon de garantir qu'aucune question d'avant ne survit au changement.
 *
 * v3 (19-8-2026) : deux raisons distinctes. Le programme de maths de 2de et de
 * 1re a CHANGÉ à cette rentrée — les questions en banque portent sur un
 * programme qui n'est plus le bon. Et le référentiel de SVT n'était jamais
 * trouvé (nom de matière différent côté catalogue), donc tout ce qui a été
 * généré en SVT l'a été sans cadrage officiel.
 *
 * v4 (19-8-2026) : le lycée général est passé de 3 à 9 matières couvertes
 * (histoire-géo, enseignement scientifique, français, philosophie, SES, SNT).
 * Tout ce qui a été généré dans ces matières l'a été sans programme officiel.
 *
 * v5 (19-8-2026) : trois spécialités de plus (HGGSP, HLP, NSI) et surtout
 * l'EMC, dont le programme a été RÉÉCRIT en 2024 — du CP à la terminale. Ce
 * qui a été généré en EMC portait sur le programme abrogé.
 *
 * v6 (19-8-2026) : le PRIMAIRE entre dans le référentiel (CP au CM2), et trois
 * arrêtés du printemps 2026 y changent les programmes de sciences et
 * d'histoire-géographie au CP et au CM1. Là encore, ce qui était en banque
 * portait sur un programme qui n'est plus le bon, ou sur aucun.
 *
 * v7 (01-9-2026) : LE PAYS ENTRE DANS LA CLÉ. Il n'y était pas. Deux systèmes
 * scolaires différents pouvaient donc se partager le même document : une 5e
 * française et une 5ème camerounaise n'étaient séparées que par l'ORTHOGRAPHE
 * de la classe — une protection accidentelle, qui tombait dès qu'un profil
 * camerounais écrivait « 5e ». Le même jour, rendre la recherche de référentiel
 * tolérante aux variantes d'écriture a rendu ce trou atteignable : les
 * questions seraient venues de la banque française, annoncées sous le programme
 * camerounais. On purge donc, comme à chaque renforcement de garantie — le coût
 * est nul aujourd'hui, la banque ne contenait que deux documents vivants.
 */
const BANQUE_VERSION = 'v7'

function bankKey(matiere, niveau, difficulte, pays) {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  // PAS DE PLAFOND sur la difficulté. Un `min(5, …)` faisait tomber TOUS les
  // niveaux ≥ 5 dans le même document de banque : dès qu'il contenait 10
  // questions, l'IA n'était plus jamais appelée et l'apprenant rejouait les
  // mêmes questions à difficulté gelée, niveau après niveau. Le serveur, lui,
  // sait déjà calibrer au-delà de 5 (type concours) — c'était la clé qui bridait.
  const d = Math.max(1, Number(difficulte) || 1)
  // ⚠️ Le PAYS fait partie de l'identité d'une classe. Sans lui, « 5e » désigne
  // deux programmes différents selon qu'on est à Lyon ou à Garoua, et les
  // questions des uns partiraient chez les autres. Le niveau est normalisé au
  // passage, pour que « 5ème » et « 5e » d'un MÊME pays partagent bien leur
  // banque au lieu de la scinder en deux.
  const cl = norm(String(niveau || '').replace(/^(\d+)\s*(ème|eme)\b/i, '$1e'))
  return `${BANQUE_VERSION}__${norm(pays) || 'xx'}__${norm(matiere)}__${cl}__d${d}`
}
function bankDocRef(key) { return doc(db, 'quizBank', key) }

// Normalise un intitulé de question pour comparer « déjà vue » sans se faire
// piéger par la casse, les accents ou la ponctuation.
/**
 * Questions signalées comme FAUSSES par l'apprenant.
 *
 * La banque de questions est PARTAGÉE : une question erronée y reste et est
 * resservie indéfiniment à tous les élèves du même niveau. Ce registre local
 * la retire au moins des tirages de celui qui l'a repérée, sans attendre une
 * correction manuelle de la banque.
 */
const CLE_SIGNALEES = (sid) => `mapo_b2c_q_signalees_${sid || 'me'}`
export function questionsSignalees(studentId) {
  try {
    const b = JSON.parse(localStorage.getItem(CLE_SIGNALEES(studentId)) || '[]')
    return Array.isArray(b) ? b : []
  } catch { return [] }
}
export function exclureQuestion(studentId, texte) {
  const n = normQuestion(texte)
  if (!n) return
  const liste = questionsSignalees(studentId)
  if (liste.includes(n)) return
  try { localStorage.setItem(CLE_SIGNALEES(studentId), JSON.stringify([...liste, n].slice(-200))) } catch { /* quota */ }
}

function normQuestion(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Mélange les propositions d'une question et déplace la bonne réponse avec.
 *
 * MESURÉ EN PRODUCTION le 23/08, sur les 166 questions de la banque partagée :
 * la bonne réponse tombait en position 2 dans 52 % des cas, et en position 4
 * dans 2 % seulement (χ² = 84,6 pour 3 degrés de liberté — le seuil à 0,1 %
 * est 16,3 ; l'hypothèse du hasard est intenable).
 *
 * Et à l'échelle d'UN lot c'est pire que la moyenne ne le dit : plusieurs
 * documents ont leurs réponses TOUTES au même rang (7 sur 7 en position 1,
 * 10 sur 10 en position 2). Un apprenant qui remarque le motif coche la même
 * colonne et « réussit » sa séance sans rien savoir — ce qui fait monter la
 * jauge de niveau, donc le fait changer de classe. Le score cessait de vouloir
 * dire quelque chose.
 *
 * Personne ne mélangeait : `shuffleLocal` ne servait qu'au jeu de paires, et
 * le tri de `readBankQuiz` ne brasse que l'ORDRE DES QUESTIONS, pas les choix
 * à l'intérieur d'une question. Le rang de la bonne réponse était donc celui
 * que le modèle avait produit, tel quel.
 *
 * On mélange à la LECTURE, pas à l'écriture : la même question resservie plus
 * tard au même apprenant ne retombe pas au même endroit.
 */
export function melangerChoix(question) {
  const q = question || {}
  const choix = q.choices
  // ⚠️ Pas de Number() ici : `Number('1')` vaut 1 et laissait passer une
  // réponse de type chaîne, qu'on renvoyait alors convertie. On ne répare rien,
  // donc on ne convertit rien.
  const bonne = q.answer
  // Une question mal formée n'est pas réparée ici — le contrôle de forme est
  // ailleurs. On la rend telle quelle plutôt que d'en fabriquer une fausse.
  if (!Array.isArray(choix) || choix.length < 2) return q
  if (!Number.isInteger(bonne) || bonne < 0 || bonne >= choix.length) return q
  const rangs = choix.map((_, i) => i)
  for (let i = rangs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rangs[i], rangs[j]] = [rangs[j], rangs[i]]
  }
  return { ...q, choices: rangs.map((r) => choix[r]), answer: rangs.indexOf(bonne) }
}

/** Idem sur un lot entier. Sert à chaque sortie de séance, banque comprise. */
export function melangerLot(questions) {
  return Array.isArray(questions) ? questions.map(melangerChoix) : questions
}

async function readBankQuiz({ matiere, niveau, difficulte, nombre, dejaVues, pays }) {
  if (!cloudUid()) return null // démo / non connecté : pas de banque cloud
  try {
    const snap = await getDoc(bankDocRef(bankKey(matiere, niveau, difficulte, pays)))
    if (snap.exists()) {
      const qs = Array.isArray(snap.data()?.questions) ? snap.data().questions : []
      const valid = qs.filter((q) => q && q.q && Array.isArray(q.choices) && q.choices.length === 4)
      // On écarte ce que CET apprenant a déjà joué : sans ça, un apprenant qui
      // reste au même niveau (score < 80 %, donc pas de montée) recevait
      // indéfiniment le même lot de questions. La banque reste partagée : ce
      // filtre est purement local, il ne retire rien pour les autres.
      const neuves = valid.filter((q) => !dejaVues || !dejaVues.has(normQuestion(q.q)))
      // ⚠️ Lecture PARTIELLE, et c'est le point important. Cette fonction ne
      // rendait rien tant que la banque n'avait pas le compte EXACT demandé :
      // 6 questions déjà validées quand il en fallait 7 étaient purement
      // jetées. On les rend maintenant telles quelles, et l'appelant complète.
      // Une question validée coûte cher (un appel de génération + un appel de
      // vérification) — la gaspiller pour une unité manquante n'a aucun sens.
      const shuffled = [...neuves].sort(() => Math.random() - 0.5) // variété
      return shuffled.slice(0, nombre)
    }
  } catch { /* règle absente / offline → on régénère */ }
  return null
}
async function appendBankQuiz({ matiere, niveau, difficulte, questions, pays }) {
  if (!cloudUid() || !Array.isArray(questions) || !questions.length) return
  try {
    const ref = bankDocRef(bankKey(matiere, niveau, difficulte, pays))
    const snap = await getDoc(ref).catch(() => null)
    const existing = snap && snap.exists() && Array.isArray(snap.data()?.questions) ? snap.data().questions : []
    const seen = new Set(existing.map((q) => (q.q || '').trim().toLowerCase()))
    const fresh = questions.filter((q) => q && q.q && Array.isArray(q.choices) && q.choices.length === 4 && !seen.has(q.q.trim().toLowerCase()))
    if (!fresh.length && existing.length) return
    const merged = [...existing, ...fresh].slice(-40) // borne la taille du document
    await setDoc(ref, { pays: String(pays || ''), matiere, niveau, difficulte: Number(difficulte) || 1, questions: merged, updatedAt: new Date().toISOString() })
  } catch { /* best-effort */ }
}

/**
 * Store « tuteur » — Tuteur IA de révision (espace élève).
 *
 * Génère un quiz de révision adaptatif (QCM + indice socratique + explication)
 * via le proxy /mapo-ia.php (task tutor_quiz → modèle Gemini). UN seul appel
 * IA produit tout le quiz → faible coût + fonctionne ensuite hors-ligne (bas débit).
 * Si l'IA n'est pas configurée / indisponible → repli sur une petite banque de
 * questions locale (démo), pour que la fonctionnalité reste démontrable.
 *
 * Gère aussi la RÉPÉTITION ESPACÉE : pour chaque (élève, matière) on garde un
 * niveau de maîtrise et une date de prochaine révision (localStorage).
 */

const IA_URL = '/mapo-ia.php'
const REVISION_KEY = (sid) => `mapo_revisions_v1_${sid || 'demo'}`
// Historique des sessions de révision (rejouables, sans régénérer l'IA).
const HISTORY_KEY = (sid) => `mapo_revision_history_v1_${sid || 'demo'}`
const HISTORY_MAX = 30
function historyDocRef(uid, studentId) { return doc(db, 'users', uid, 'revisions', 'history_' + (studentId || 'self')) }
// Historique des CONVERSATIONS MIAPO (relançables). Stockage séparé des révisions.
const CONV_KEY = (sid) => `mapo_b2c_conversations_v1_${sid || 'demo'}`
const CONV_MAX = 40
function convDocRef(uid, studentId) { return doc(db, 'users', uid, 'revisions', 'conversations_' + (studentId || 'self')) }
// Récompenses (badges, série de jours) : 4e et dernier document de l'arbre de
// révision d'un enfant. La règle Firestore l'autorise nommément, comme les
// trois autres — un enfant n'écrit QUE les documents qui portent son propre
// identifiant (vérifié à l'émulateur avant publication).
function recompensesDocRef(uid, studentId) { return doc(db, 'users', uid, 'revisions', 'recompenses_' + (studentId || 'self')) }

export const useTuteurStore = defineStore('tuteur', () => {
  const generating = ref(false)
  const planning = ref(false) // moteur de cours : génération du plan en cours
  const lastMode = ref('')   // 'ia' | 'simulation'
  const lastReason = ref('')
  // Compteur réactif incrémenté à chaque sauvegarde de révision : permet aux vues
  // (tableau de progression, niveaux) de se rafraîchir après un quiz. getLevel lit
  // le localStorage (non réactif) → ce ref déclenche le recalcul des computed.
  const revisionsVersion = ref(0)

  /**
   * Génère un quiz pour une matière.
   * @returns {Promise<{ok, questions, mode, reason}>}
   *   questions: [{ q, choices[4], answer, hint, explanation }]
   */
  async function generateQuiz({ matiere, niveau, nombre = 10, themes = '', difficulte = 1, cours = '', digest = '', studentId = '', subjectId = '' }) {
    generating.value = true
    lastMode.value = ''
    lastReason.value = ''
    // Jauge d'usage IA (freemium). B2C (MAPO+) = décompté CÔTÉ SERVEUR (tokens,
    // via `metered`) → on NE double-compte PAS ici. École/Supérieur = jauge
    // locale usage.js (inchangée).
    try { if (!useAuthStore().isB2C) useUsageStore().consume(COUT_ACTION.quiz) } catch (e) { /* jauge indisponible : silencieux */ }
    // Personnalisation par école : injecte des exemples de sujets (miapoRef) dans
    // les thèmes → quiz calibré sur le niveau/style de l'établissement.
    let effThemes = themes
    try {
      const refStore = useMiapoRefStore()
      await refStore.load()
      const ex = refStore.getExemples(matiere)
      if (ex) effThemes = (themes ? themes + ' ; ' : '') + `Inspire-toi du niveau et du style de ces sujets de l'école : ${ex.slice(0, 1500)}`
    } catch (e) { /* silencieux */ }
    // Questions DÉJÀ JOUÉES par cet apprenant dans cette matière (historique
    // local, alimenté à chaque séance terminée). Sert deux fois : à écarter les
    // reprises de la banque, et à demander du neuf à l'IA. Borné aux 12 dernières
    // séances : au-delà, revoir une question est de la répétition espacée, pas
    // de la redite.
    const dejaVues = new Set()      // texte normalisé → filtre de la banque
    const dejaVuesTexte = []        // texte d'origine → envoyé à l'IA, plus lisible
    // Questions signalées comme fausses : on ne les repropose jamais, même si
    // la banque partagée les contient toujours.
    try { questionsSignalees(studentId).forEach((n) => dejaVues.add(n)) } catch { /* silent */ }
    try {
      if (studentId) {
        const m = normQuestion(matiere)
        loadHistory(studentId)
          .filter((s) => normQuestion(s?.subjectName) === m)
          .slice(0, 12)
          .forEach((s) => (Array.isArray(s.questions) ? s.questions : []).forEach((q) => {
            if (!q || !q.q) return
            const n = normQuestion(q.q)
            if (dejaVues.has(n)) return
            dejaVues.add(n)
            dejaVuesTexte.push(q.q)
          }))
      }
    } catch { /* historique illisible : on continue sans filtre */ }
    // 1) Réutilisation : banque d'exercices partagée (0 token, marche hors-ligne).
    // Uniquement pour une révision générique (pas de thème NI de cours perso imposé :
    // sinon on veut un quiz réellement tiré du cours de l'élève).
    // Notions du PROGRAMME OFFICIEL, quand on en a un pour (pays, classe,
    // matière) ET qu'il est déjà en vigueur. Calculé AVANT la banque : la
    // provenance annoncée en dépend, y compris pour une question réutilisée.
    let notions = []
    let refSource = null
    let granularite = 'classe'
    // Le pays sert DEUX fois : au référentiel, et à la clé de la banque
    // partagée — deux systèmes scolaires ne doivent pas partager un document.
    let paysEleve = 'FR'
    try {
      const e = useEnfantsAutonomesStore().enfants.find((x) => x.id === studentId)
      paysEleve = e?.pays || 'FR'
      const args = { pays: paysEleve, niveau, matiere }
      notions = notionsPourPrompt(args)
      refSource = sourceOfficielle(args)
      granularite = granulariteProgramme(args)
    } catch { /* pas de référentiel : comportement inchangé */ }
    // Écart E5 : les notions ratées récemment reviennent. On ne les envoie que
    // si elles appartiennent au programme transmis — une priorité portant sur
    // une notion absente du cadrage serait ignorée par le modèle, ou pire,
    // l'en ferait sortir.
    let prioritaires = []
    try {
      if (notions.length && studentId && subjectId) {
        const aReprendre = new Set(notionsAReprendre(studentId, subjectId))
        prioritaires = notions.filter((n) => aReprendre.has(n))
      }
    } catch { /* pas de suivi : séance normale */ }

    // ORDRE DES SOURCES. Il dépend de ce que l'apprenant a fourni :
    //
    //  • Cours importé (ou thème ciblé) → le COURS est prioritaire. L'IA est
    //    donc sollicitée pour la séance ENTIÈRE, à partir du cours (le serveur
    //    lui impose déjà « tire les questions du cours, complète par le
    //    programme officiel si nécessaire »). La banque partagée n'intervient
    //    qu'en COMPLÉMENT, si le tri laisse la séance trop courte : ses
    //    questions viennent du programme officiel de la MÊME classe, donc
    //    cohérentes avec le niveau, mais elles ne doivent pas prendre la place
    //    de questions tirées du cours de l'élève.
    //  • Sans cours → la banque est le SOCLE (elle ne coûte rien) et l'IA ne
    //    produit que le complément.
    //
    // Dans les deux cas la banque n'est ALIMENTÉE que par les quiz génériques :
    // le contenu d'un cours personnel n'a rien à faire dans une banque partagée.
    const banqueEnComplement = !!(effThemes || cours)
    const fromBank = await readBankQuiz({ matiere, niveau, difficulte, nombre, dejaVues, pays: paysEleve })
    const banqueDispo = Array.isArray(fromBank) ? fromBank : []
    let socleBanque = banqueEnComplement ? [] : banqueDispo
    {
      if (socleBanque.length >= nombre) {
        generating.value = false
        lastMode.value = 'banque'
        // ⚠️ Cette branche annonçait TOUJOURS « referentiel », même dans une
        // matière qui n'en a aucun — le correctif du 19/08 n'avait touché que
        // la génération fraîche. Une question ressortie de la banque n'est pas
        // mieux sourcée qu'une neuve : elle a la provenance de sa matière.
        return { ok: true, questions: melangerLot(socleBanque.slice(0, nombre)), mode: 'banque', reason: '', source: refSource ? 'referentiel' : 'ia' }
      }
    }
    // Confidentialité + frugalité : le digest (profil PRIVÉ de l'apprenant) ne
    // personnalise QUE les quiz déjà privés (thème ciblé OU cours importé). Sur le
    // parcours générique (ni thème ni cours), le quiz reste neutre — c'est LUI qui
    // alimente la banque PARTAGÉE (appendBankQuiz) ; y injecter un profil personnel
    // ferait fuiter les centres d'intérêt d'un élève dans les quiz des autres.
    const digestEff = (effThemes || cours) ? digest : ''

    // Ce qui manque encore, une fois le socle de la banque posé.
    const manque = Math.max(1, nombre - socleBanque.length)
    // MARGE DE SURGÉNÉRATION. Le solveur aveugle rejette une partie des
    // questions produites — c'est son travail. Sans marge, chaque rejet
    // raccourcit la séance de l'élève, et le raccourcissement frappe le PLUS
    // FORT les plus jeunes : le manifeste ne leur accorde que 5 questions
    // (mémoire de travail, attention soutenue), donc deux rejets leur en
    // laissent 3. On demande donc davantage et on sert la cible.
    // Le serveur borne de toute façon à 12.
    const nombreDemande = Math.min(12, manque + Math.max(2, Math.ceil(manque * 0.4)))
    // Ne pas régénérer ce que la banque peut fournir — qu'elle serve de socle
    // ou seulement de complément : dans les deux cas ces questions peuvent
    // finir dans la séance, et une question posée deux fois est une question
    // perdue.
    const exclureTexte = [...banqueDispo.map((q) => q.q), ...dejaVuesTexte].slice(0, 40)

    // DEUX TENTATIVES. Un échec de génération est le plus souvent transitoire :
    // réseau coupé, réponse tronquée, ou lot entièrement rejeté par le solveur
    // (le tirage suivant sera différent). On redemande donc à l'IA plutôt que
    // de servir autre chose. Il n'y a plus AUCUN contenu de remplacement :
    // servir des questions hors programme pour éviter un écran vide revient à
    // faire croire à l'apprenant qu'il révise sa leçon.
    // ⚠️ On ne relance PAS quand l'échec est définitif (crédits épuisés, IA non
    // configurée, limite atteinte) : une seconde tentative ne changerait rien
    // et, pour les crédits, la facturerait deux fois.
    let definitif = false
    for (let tentative = 1; tentative <= 2 && !definitif; tentative++) {
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token

      const res = await fetch(IA_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'tutor_quiz', data: { matiere, niveau, nombre: nombreDemande, themes: effThemes, difficulte, cours, digest: digestEff, notions, granularite, prioritaires, exclure: exclureTexte } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      // Crédits épuisés (B2C) : on ne bascule PAS sur la banque locale, on invite
      // à passer à l'offre supérieure (l'IA fraîche est réservée aux crédits).
      if (json && (json.error === 'credits_epuises' || json.error === 'plafond_atteint')) {
        generating.value = false
        return { ok: false, questions: [], mode: 'none', reason: json.error }
      }

      if (json && json.ok && json.text) {
        // On ne garde le tag de notion QUE s'il figure dans la liste envoyée :
        // un intitulé inventé rangerait le suivi de l'apprenant sous une notion
        // qui n'existe pas au programme (cf. `validerNotions`).
        const parsed = validerNotions(parseQuiz(json.text), notions)
        if (parsed.length) {
          lastMode.value = 'ia'
          // Provenance des questions (cours de l'élève / référentiel / mix) pour le
          // petit disclaimer affiché au lancement. Repli : cours fourni → 'cours'.
          // « referentiel » ne doit se dire que si un VRAI programme officiel a
          // cadré la génération. Sans lui, la source honnête est le modèle
          // lui-même — l'ancienne étiquette laissait croire à un sourçage
          // officiel qui n'existait pas.
          // ⚠️ La provenance ne se DEMANDE PAS au modèle. On lisait le champ
          // `source` qu'il renvoie et il écrasait notre calcul : mesuré le
          // 22/08, un quiz de maths de 3e — classe pour laquelle aucun
          // programme n'est applicable cette année — s'annonçait « referentiel ».
          // L'élève lisait « Questions basées sur le référentiel national »
          // pour des questions que rien n'avait cadrées.
          // Seul le CLIENT sait s'il a envoyé des notions officielles.
          let source = cours ? 'cours' : (refSource ? 'referentiel' : 'ia')
          // Un cours importé PEUT être complété par le programme : dans ce cas
          // seulement, la mention « mix » est méritée.
          if (cours && refSource) source = 'mix'
          // Alimente la banque partagée SEULEMENT pour un quiz générique (pas de cours perso).
          if (!effThemes && !cours) appendBankQuiz({ matiere, niveau, difficulte, questions: parsed, pays: paysEleve })
          // Socle validé d'abord, complément frais ensuite, sans doublon. Le
          // socle vient de la banque : ces questions ont DÉJÀ passé le solveur.
          const vus = new Set()
          const dedoublonne = (liste) => liste.filter((q) => {
            const k = normQuestion(q && q.q)
            if (!k || vus.has(k)) return false
            vus.add(k); return true
          })
          const retenues = dedoublonne([...socleBanque, ...parsed])
          // Séance encore trop courte alors qu'un cours était prioritaire : on
          // la complète par le programme officiel (banque partagée, même
          // classe). L'apprenant garde une séance de la bonne longueur sans que
          // le programme ait pris la place de son cours.
          // ⚠️ LE COMPLÉMENT NE JOUAIT QUE DANS UN CAS SUR DEUX (corrigé le
          // 01/09). Il était conditionné à `banqueEnComplement`, c'est-à-dire au
          // seul cas d'un cours ou d'un thème imposé. Pour une révision
          // générique, une séance revenue courte partait telle quelle.
          //
          // Or c'est justement là que ça arrivait. Mesuré dans le registre
          // qualité serveur : les séances de 5 et 6 questions ont TOUTES **zéro
          // rejet** — ce n'est pas le solveur qui coupe, c'est le modèle qui
          // rend moins que demandé. Toute la mécanique bâtie jusqu'ici (marge de
          // surgénération, complément, régénération) réagit aux REJETS ; la
          // sous-production, elle, passait entre les mailles.
          //
          // Compléter depuis la banque ne coûte aucun token et ces questions ont
          // déjà passé le solveur : il n'y a aucune raison de s'en priver.
          if (retenues.length < nombre && banqueDispo.length) {
            const ajouts = dedoublonne(banqueDispo).slice(0, nombre - retenues.length)
            if (ajouts.length) {
              retenues.push(...ajouts)
              // On le DIT : la séance n'est plus tirée du seul cours.
              if (source === 'cours') source = 'mix'
            }
          }
          generating.value = false
          // ⚠️ Et si elle reste courte, on l'ANNONCE. Une séance de 6 questions
          // renvoyée en `ok: true` sans un mot ressemble trait pour trait à une
          // séance normale : ni l'apprenant ni nous ne pouvions le savoir.
          const attendues = nombre
          const livrees = Math.min(retenues.length, nombre)
          return {
            ok: true,
            questions: melangerLot(retenues.slice(0, nombre)),
            mode: 'ia',
            reason: '',
            source,
            courte: livrees < attendues ? { livrees, attendues } : null,
          }
        }
        // Aucune question retenue : lot entièrement rejeté par le solveur, ou
        // réponse illisible. Cas typiquement transitoire → on retente.
        lastReason.value = 'Aucune question n’a passé la vérification'
      } else {
        const err = json && json.error
        // Échecs DÉFINITIFS : retenter ne ferait que perdre du temps.
        definitif = err === 'not_configured' || err === 'non_autorise'
          || err === 'limite_atteinte' || err === 'limite_globale'
        lastReason.value = err === 'not_configured'
          ? 'IA pas encore configurée'
          : err === 'non_autorise'
            ? 'Connexion requise'
            : (err === 'limite_atteinte' || err === 'limite_globale')
              ? 'Limite atteinte, réessaie plus tard'
              : (json && (json.detail || err)) || 'Service IA indisponible'
      }
    } catch (e) {
      lastReason.value = 'Service IA injoignable'
    }
    }
    generating.value = false
    // L'IA a échoué. Si la banque partagée a fourni ne serait-ce qu'une
    // question, on la sert : elle est validée ET conforme au niveau, alors que
    // le repli local est générique et hors programme. Mieux vaut une séance
    // courte mais juste qu'une séance complète mais hors sujet.
    if (banqueDispo.length) {
      lastMode.value = 'banque'
      // Même quand un cours était prioritaire : l'IA n'ayant rien rendu, le
      // programme officiel de la classe reste la meilleure séance disponible.
      return { ok: true, questions: melangerLot(banqueDispo.slice(0, nombre)), mode: 'banque', reason: '', source: refSource ? 'referentiel' : 'ia' }
    }
    // Deux tentatives infructueuses et rien en banque. On ne fabrique RIEN pour
    // combler : l'appelant affiche un écran d'échec avec « Réessayer ». Un
    // apprenant qui repart les mains vides le sait ; un apprenant à qui l'on
    // sert des questions hors programme croit avoir révisé sa leçon.
    lastMode.value = 'echec'
    return { ok: false, questions: [], mode: 'echec', reason: lastReason.value }
  }

  // ── Répétition espacée ────────────────────────────────────────────────
  function loadRevisions(studentId) {
    try { return JSON.parse(localStorage.getItem(REVISION_KEY(studentId)) || '{}') } catch { return {} }
  }
  function saveRevisions(studentId, data) {
    try { localStorage.setItem(REVISION_KEY(studentId), JSON.stringify(data)) } catch {}
    revisionsVersion.value++ // notifie les vues réactives (progression, niveaux)
    // Miroir Firestore pour les vrais comptes (durable, cross-appareils).
    const uid = proprietaireUid()
    if (uid) {
      setDoc(revisionDocRef(uid, studentId), { map: data, updatedAt: new Date().toISOString() })
        .catch(() => { /* offline : le cache Firestore réessaiera */ })
    }
  }

  /**
   * Hydrate l'état de révision depuis Firestore (vrais comptes) vers le
   * localStorage, pour que le suivi soit retrouvé sur un autre appareil/session.
   * Sans effet en démo. À appeler à l'ouverture d'un quiz/écran de révision.
   */
  async function syncFromCloud(studentId) {
    const uid = proprietaireUid()
    if (!uid) return
    try {
      const snap = await getDoc(revisionDocRef(uid, studentId))
      if (snap.exists()) {
        const cloud = snap.data()?.map
        if (cloud && typeof cloud === 'object') {
          // Le cloud fait autorité (dernier état consolidé du suivi).
          try { localStorage.setItem(REVISION_KEY(studentId), JSON.stringify(cloud)) } catch {}
          revisionsVersion.value++
        }
      }
    } catch { /* offline / non autorisé : on garde l'état local */ }
    await syncRecompensesFromCloud(studentId)
  }

  /**
   * Hydrate les RÉCOMPENSES (badges, série de jours) depuis l'espace de la
   * famille.
   *
   * Elles ne vivaient que dans le `localStorage` de l'appareil : ce qu'un enfant
   * gagnait sur son téléphone n'existait nulle part ailleurs. Son parent ne le
   * voyait jamais, et un changement d'appareil ou un vidage de cache effaçait
   * des mois de série. Même arbre que ses révisions : une famille, un espace.
   */
  async function syncRecompensesFromCloud(studentId) {
    const uid = proprietaireUid()
    if (!uid) return
    try {
      const snap = await getDoc(recompensesDocRef(uid, studentId))
      if (snap.exists()) {
        hydraterRecompenses(studentId, snap.data()?.stats)
        revisionsVersion.value++ // les vues Récompenses lisent le localStorage
      }
    } catch { /* offline / non autorisé : on garde l'état local */ }
  }

  // Difficulté adaptative BORNÉE PAR LA CLASSE : 5 paliers à l'intérieur du
  // programme de l'année. Au-delà, on ne durcit plus, on PROPOSE de passer au
  // programme suivant (cf. utils/progressionNiveau.js). Sans ce plafond, une
  // élève de 6e atteignait le niveau 13 et recevait des questions de concours.
  const MAX_LEVEL = PALIERS_PAR_CLASSE

  /** Enregistre le résultat d'un quiz et planifie la prochaine révision. */
  function recordResult(studentId, subjectId, subjectName, scorePercent) {
    const data = loadRevisions(studentId)
    const prev = data[subjectId] || { mastery: 0, attempts: 0, level: 1 }
    // Les profils existants portent des paliers hérités > 5 (13 pour certains) :
    // on les ramène dans l'échelle plutôt que de les laisser dériver.
    const prevLevel = Math.min(PALIERS_PAR_CLASSE, Math.max(1, prev.level || 1))
    // Maîtrise = moyenne mobile (donne du poids à la dernière session)
    const mastery = Math.round(prev.attempts ? prev.mastery * 0.5 + scorePercent * 0.5 : scorePercent)
    // Difficulté ADAPTATIVE, mais qui se MÉRITE. Avant le 22/08/2026, un seul
    // quiz à 80 % faisait monter d'un palier : quatre bonnes séances suffisaient
    // à épuiser les 5 paliers d'une classe et à se voir proposer l'année
    // suivante. La progression enregistrait une performance ponctuelle, pas un
    // apprentissage. Elle passe désormais par une jauge qui se remplit séance
    // après séance et se vide en cas d'échec — voir utils/jaugeNiveau.js.
    let pretPourAnneeSuivante = !!prev.pretPourAnneeSuivante
    const prog = appliquerSeance(
      { palier: prevLevel, jauge: prev.jauge || 0 },
      scorePercent,
      PALIERS_PAR_CLASSE,
    )
    const level = prog.palier
    // Jauge pleine AU SOMMET de la classe : c'est ce qui déclenche la
    // PROPOSITION de changer de programme. Elle reste posée jusqu'à ce que
    // l'apprenant l'accepte ou la refuse, on ne la redemande pas à chaque quiz.
    if (prog.auSommet) pretPourAnneeSuivante = true
    const levelChange = level - prevLevel // +1 monté, -1 redescendu, 0 stable
    // Intervalle selon le score : faible → revoir vite, fort → espacer
    const days = scorePercent >= 80 ? 7 : scorePercent >= 50 ? 3 : 1
    const due = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString()
    data[subjectId] = {
      name: subjectName,
      mastery,
      lastScore: scorePercent,
      level,
      // Avancement DANS le palier courant (0..100). Le palier seul ne dit pas
      // où en est l'apprenant : entre « vient d'arriver au palier 3 » et « à
      // deux séances du palier 4 », il y a des semaines de travail.
      jauge: prog.jauge,
      // Programme sur lequel l'apprenant révise CETTE matière. Vide = celui de
      // sa classe. Il ne change QUE s'il accepte explicitement de passer à
      // l'année suivante : un élève peut être en avance en anglais et à sa
      // place en mathématiques.
      programme: prev.programme || '',
      pretPourAnneeSuivante,
      attempts: (prev.attempts || 0) + 1,
      lastReviewed: new Date().toISOString(),
      due,
    }
    saveRevisions(studentId, data)
    // ELO propre (par matière) : le score reflète le niveau RÉEL atteint, au-delà
    // de la difficulté jouée (= `prevLevel`, le niveau affronté cette séance).
    // Best-effort : ne doit jamais casser l'enregistrement du résultat.
    try { enregistrerResultatElo(studentId, subjectName, scorePercent, prevLevel) } catch { /* best-effort */ }
    // Suivi d'adoption MAPO+ (B2C) : on ne compte QUE dans le tenant MAPO+,
    // pas les quiz des élèves d'école. Best-effort (n'impacte jamais le quiz).
    if (isMapoPlusTenant()) {
      try { useMiapoAnalyticsStore().recordQuiz({ subject: subjectName, scorePct: scorePercent, level }) } catch { /* best-effort */ }
    }
    // `deltaJauge` remonte à l'écran de résultat : voir sa jauge bouger est
    // TOUT l'intérêt du mécanisme. Une progression invisible ne motive personne.
    return { ...data[subjectId], levelChange, maxLevel: MAX_LEVEL, pretPourAnneeSuivante, deltaJauge: prog.delta }
  }

  // ── Historique des révisions (rejouable, économe : pas de re-génération IA) ──
  function loadHistory(studentId) {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY(studentId)) || '[]') } catch { return [] }
  }
  /** Enregistre une session terminée (questions incluses) pour pouvoir la revoir. */
  function saveRevisionSession(studentId, session) {
    const list = loadHistory(studentId)
    const entry = { id: 'rs-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), date: new Date().toISOString(), ...session }
    list.unshift(entry)
    const capped = list.slice(0, HISTORY_MAX)
    try { localStorage.setItem(HISTORY_KEY(studentId), JSON.stringify(capped)) } catch { /* quota */ }
    // Récompenses : chaque révision archivée compte (total + série de jours).
    let stats = null
    try { stats = enregistrerActivite(studentId, { format: session?.format || session?.mode || 'quiz' }) } catch { /* best-effort */ }
    revisionsVersion.value++
    const uid = proprietaireUid()
    if (uid) {
      setDoc(historyDocRef(uid, studentId), { list: capped, updatedAt: new Date().toISOString() })
        .catch(() => { /* offline : le cache Firestore réessaiera */ })
      // Les récompenses partent dans le MÊME arbre que l'historique. C'est ce
      // qui les rend visibles par le parent et les fait suivre l'apprenant d'un
      // appareil à l'autre — avant, elles mouraient dans le navigateur.
      if (stats) {
        setDoc(recompensesDocRef(uid, studentId), { stats, updatedAt: new Date().toISOString() })
          .catch(() => { /* offline : le cache Firestore réessaiera */ })
      }
    }
    return entry.id
  }
  /** Liste des sessions passées (les plus récentes d'abord). */
  function getRevisionHistory(studentId) { return loadHistory(studentId) }

  // ── ÉPREUVES SANS ASSISTANCE (référentiel, écart E10) ──────────────────────
  //
  // Le registre est tenu en local par `utils/examenBlanc.js`, module sans
  // Firebase, comme la calibration. Le miroir vit ICI, dans le même arbre que
  // l'historique : une famille, un espace. Sans lui, une mesure d'apprentissage
  // disparaissait avec le cache du navigateur ou un changement de téléphone —
  // et une mesure qu'un nettoyage efface ne démontre rien à personne.
  //
  // ⚠️ On ne pousse QUE ce que le local retient : matière, score, total, durée,
  // date et l'état de révision d'avant. Jamais une question, jamais une réponse
  // (minimisation, section 5.4 du référentiel). Ce sont des résultats scolaires
  // de mineurs.
  //
  // ⚠️ Un compte ENFANT ne pourra écrire ici qu'une fois la règle Firestore
  // publiée (`docId == 'epreuves_' + monEnfantId()`, cf. `firestore.rules`).
  // Tant qu'elle ne l'est pas, l'écriture échoue en silence et l'épreuve reste
  // locale : le produit fonctionne, seule la durabilité manque.
  function epreuvesDocRef(uid, studentId) {
    return doc(db, 'users', uid, 'revisions', 'epreuves_' + (studentId || 'self'))
  }
  function pousserEpreuves(studentId) {
    const uid = proprietaireUid()
    if (!uid) return
    setDoc(epreuvesDocRef(uid, studentId), {
      list: historiqueEpreuves(studentId), updatedAt: new Date().toISOString(),
    }).catch(() => { /* hors ligne ou règle non publiée : le local fait foi */ })
  }
  // Suivi par notion — même arbre, même raison : ce que l'apprenant a
  // réellement travaillé ne doit pas mourir avec un cache de navigateur.
  function notionsDocRef(uid, studentId) {
    return doc(db, 'users', uid, 'revisions', 'notions_' + (studentId || 'self'))
  }
  function pousserNotions(studentId) {
    const uid = proprietaireUid()
    if (!uid) return
    setDoc(notionsDocRef(uid, studentId), {
      suivi: suiviNotions(studentId), updatedAt: new Date().toISOString(),
    }).catch(() => { /* hors ligne ou règle non publiée : le local fait foi */ })
  }
  async function syncNotionsFromCloud(studentId) {
    const uid = proprietaireUid()
    if (!uid) return
    try {
      const snap = await getDoc(notionsDocRef(uid, studentId))
      if (snap.exists()) remplacerNotions(studentId, snap.data()?.suivi)
    } catch { /* hors ligne ou non autorisé : on garde le suivi local */ }
  }

  async function syncEpreuvesFromCloud(studentId) {
    const uid = proprietaireUid()
    if (!uid) return
    try {
      const snap = await getDoc(epreuvesDocRef(uid, studentId))
      if (snap.exists()) remplacerEpreuves(studentId, snap.data()?.list)
    } catch { /* hors ligne ou non autorisé : on garde le registre local */ }
  }
  /** Hydrate l'historique depuis Firestore (vrais comptes, multi-appareils). */
  async function syncHistoryFromCloud(studentId) {
    const uid = proprietaireUid()
    if (!uid) return
    try {
      const snap = await getDoc(historyDocRef(uid, studentId))
      if (snap.exists()) {
        const l = snap.data()?.list
        if (Array.isArray(l)) { try { localStorage.setItem(HISTORY_KEY(studentId), JSON.stringify(l.slice(0, HISTORY_MAX))) } catch { /* quota */ } }
      }
    } catch { /* offline / non autorisé : on garde l'historique local */ }
  }

  // ── Historique des CONVERSATIONS MIAPO (relançables sans régénérer) ──────────
  const conversationsVersion = ref(0)
  function loadConversations(studentId) {
    try { return JSON.parse(localStorage.getItem(CONV_KEY(studentId)) || '[]') } catch { return [] }
  }
  /** Enregistre (ou met à jour) une conversation MIAPO. Si `id` fourni et déjà
   *  présent, on remplace l'entrée (mise à jour au fil de l'échange) ; sinon on
   *  crée. Ignore les conversations vides ou sans message d'apprenant. */
  function saveConversation(studentId, conv) {
    const msgs = Array.isArray(conv?.messages) ? conv.messages : []
    if (!msgs.some((m) => m && m.role === 'user' && (m.text || '').trim())) return null
    const list = loadConversations(studentId)
    const id = conv.id || ('cv-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5))
    // Titre = 1re question de l'apprenant (tronquée), sauf titre explicite.
    const firstUser = msgs.find((m) => m.role === 'user' && (m.text || '').trim())
    const title = (conv.title || (firstUser ? firstUser.text.trim() : '')).slice(0, 80)
    const entry = { id, date: new Date().toISOString(), title, messages: msgs.slice(-40) }
    const without = list.filter((c) => c.id !== id)
    without.unshift(entry)
    const capped = without.slice(0, CONV_MAX)
    try { localStorage.setItem(CONV_KEY(studentId), JSON.stringify(capped)) } catch { /* quota */ }
    conversationsVersion.value++
    const uid = proprietaireUid()
    if (uid) {
      setDoc(convDocRef(uid, studentId), { list: capped, updatedAt: new Date().toISOString() })
        .catch(() => { /* offline : cache Firestore réessaiera */ })
    }
    return id
  }
  function getConversations(studentId) { return loadConversations(studentId) }
  function deleteConversation(studentId, id) {
    const capped = loadConversations(studentId).filter((c) => c.id !== id)
    try { localStorage.setItem(CONV_KEY(studentId), JSON.stringify(capped)) } catch { /* quota */ }
    conversationsVersion.value++
    const uid = proprietaireUid()
    if (uid) { setDoc(convDocRef(uid, studentId), { list: capped, updatedAt: new Date().toISOString() }).catch(() => {}) }
  }
  /** Hydrate les conversations depuis Firestore (vrais comptes, multi-appareils). */
  async function syncConversationsFromCloud(studentId) {
    const uid = proprietaireUid()
    if (!uid) return
    try {
      const snap = await getDoc(convDocRef(uid, studentId))
      if (snap.exists()) {
        const l = snap.data()?.list
        if (Array.isArray(l)) {
          try { localStorage.setItem(CONV_KEY(studentId), JSON.stringify(l.slice(0, CONV_MAX))) } catch { /* quota */ }
          conversationsVersion.value++
        }
      }
    } catch { /* offline / non autorisé : on garde le cache local */ }
  }

  /** Niveau de difficulté courant pour (élève, matière). Défaut : 1. */
  function getLevel(studentId, subjectId) {
    const data = loadRevisions(studentId)
    const brut = (data[subjectId] && data[subjectId].level) || 1
    // Les profils créés avant le plafonnement portent des paliers hérités (13
    // pour certains). On les ramène dans l'échelle À LA LECTURE : sans ça, le
    // premier quiz repartirait au niveau concours qu'on vient d'interdire.
    return Math.min(PALIERS_PAR_CLASSE, Math.max(1, brut))
  }

  /**
   * Avancement DANS le palier courant (0..100).
   *
   * Les profils antérieurs à la jauge n'ont pas ce champ : ils repartent de 0
   * sur le palier où l'ancienne règle les avait laissés. C'est le comportement
   * voulu — on ne leur retire pas un palier acquis, mais le suivant se mérite.
   */
  function getJauge(studentId, subjectId) {
    const data = loadRevisions(studentId)
    const j = Number((data[subjectId] || {}).jauge) || 0
    return Math.max(0, Math.min(100, j))
  }

  /**
   * L'apprenant accepte de passer au programme de l'année suivante pour CETTE
   * matière. On repart au palier du milieu : il vient de prouver qu'il maîtrise
   * l'année précédente, le renvoyer aux bases serait décourageant et faux.
   */
  function accepterAnneeSuivante(studentId, subjectId, classeActuelle, pays) {
    const data = loadRevisions(studentId)
    const e = data[subjectId]
    if (!e) return null
    const base = e.programme || classeActuelle
    const suivant = niveauSuivant(base, pays)
    if (!suivant) return null // déjà en haut de l'échelle : rien à proposer
    // Jauge remise à zéro : nouveau programme, nouveau palier, nouvelle
    // conquête. Reporter l'avancement de l'année précédente n'aurait aucun sens
    // — ce n'est pas la même matière qu'on maîtrise.
    data[subjectId] = { ...e, programme: suivant, level: PALIER_APRES_CHANGEMENT, jauge: 0, pretPourAnneeSuivante: false }
    saveRevisions(studentId, data)
    revisionsVersion.value++
    return suivant
  }

  /** L'apprenant décline : on ne le relance pas à chaque quiz. */
  function refuserAnneeSuivante(studentId, subjectId) {
    const data = loadRevisions(studentId)
    if (!data[subjectId]) return
    data[subjectId] = { ...data[subjectId], pretPourAnneeSuivante: false }
    saveRevisions(studentId, data)
    revisionsVersion.value++
  }

  /**
   * Génère le test de positionnement d'une matière (8 questions, 2 par palier).
   * Jamais servi depuis la banque partagée : le placement doit reposer sur des
   * questions du programme de CETTE classe, pas sur un lot mutualisé.
   */
  async function genererPositionnement({ matiere, niveau, themes = '' }) {
    generating.value = true
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'positionnement', data: { matiere, niveau, themes } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && (json.error === 'credits_epuises' || json.error === 'plafond_atteint')) {
        return { ok: false, reason: json.error }
      }
      if (json && json.ok && json.text) {
        const valides = parsePositionnement(json.text)
        // Le positionnement ne passe pas par generateQuiz, et c'est lui qui
        // FIXE le niveau de départ de l'apprenant : le biais de position y
        // coûtait le plus cher.
        if (valides.length) return { ok: true, questions: melangerLot(valides) }
      }
      return { ok: false, reason: 'indisponible' }
    } catch {
      return { ok: false, reason: 'reseau' }
    } finally {
      generating.value = false
    }
  }

  /**
   * Enregistre le placement issu du test. On écrit le palier ET on marque la
   * matière comme positionnée : le test ne doit être proposé qu'UNE fois.
   */
  function enregistrerPositionnement(studentId, subjectId, subjectName, palier) {
    const data = loadRevisions(studentId)
    const prev = data[subjectId] || {}
    data[subjectId] = {
      ...prev,
      name: subjectName,
      level: Math.min(PALIERS_PAR_CLASSE, Math.max(1, Number(palier) || 1)),
      positionne: true,
      attempts: prev.attempts || 0,
    }
    saveRevisions(studentId, data)
    revisionsVersion.value++
    return data[subjectId]
  }

  /**
   * Faut-il proposer le test de positionnement ?
   *
   * Uniquement au tout premier contact avec la matière : jamais joué ET jamais
   * positionné. Un apprenant qui a déjà révisé a un palier gagné sur le terrain,
   * plus fiable que huit questions.
   */
  function doitProposerPositionnement(studentId, subjectId) {
    const e = loadRevisions(studentId)[subjectId]
    if (!e) return true
    return !e.positionne && !(e.attempts > 0)
  }

  /** L'apprenant décline le test : on ne le repropose pas. */
  function refuserPositionnement(studentId, subjectId, subjectName) {
    const data = loadRevisions(studentId)
    data[subjectId] = { ...(data[subjectId] || {}), name: subjectName, positionne: true, attempts: data[subjectId]?.attempts || 0 }
    saveRevisions(studentId, data)
    revisionsVersion.value++
  }

  /** Programme suivi pour une matière (vide = celui de la classe). */
  function getProgramme(studentId, subjectId) {
    return (loadRevisions(studentId)[subjectId] || {}).programme || ''
  }

  function getRevisionState(studentId) {
    return loadRevisions(studentId)
  }

  /** Matières dont la date de révision est échue (à revoir maintenant). */
  function getDueSubjects(studentId) {
    const data = loadRevisions(studentId)
    const now = Date.now()
    return Object.entries(data)
      .filter(([, v]) => v.due && new Date(v.due).getTime() <= now)
      .map(([id, v]) => ({ subjectId: id, ...v }))
  }

  // ── Remontée enseignants/direction ────────────────────────────────────
  /** Agrège l'état de révision de plusieurs élèves (lecture locale). */
  function getAllRevisionStates(studentIds) {
    const out = {}
    for (const id of studentIds || []) {
      const st = loadRevisions(id)
      if (st && Object.keys(st).length) out[id] = st
    }
    return out
  }

  /**
   * Démo : sème des données de révision réalistes (quelques élèves en
   * difficulté sur certaines matières) pour que l'écran enseignant soit
   * parlant sans avoir à jouer 30 quiz. Ne s'exécute qu'une fois.
   */
  function seedDemoIfEmpty(eleves, subjects) {
    if (typeof localStorage === 'undefined') return
    if (localStorage.getItem('mapo_revisions_seeded_v1')) return
    const inscrits = (eleves || []).filter((e) => e.status === 'inscrit')
    const byId = Object.fromEntries((subjects || []).map((s) => [s.id, s.name || s.label]))
    const wanted = ['s-maths', 's-francais', 's-anglais', 's-physique', 's-svt', 's-hg', 's-pct']
      .filter((id) => byId[id])
    if (!inscrits.length || !wanted.length) return
    // Profils : ~40% des élèves ont au moins une matière fragile, certains 2.
    inscrits.forEach((e, i) => {
      if (i % 5 === 4) return // ~20% sans aucune donnée (pas encore révisé)
      const data = {}
      const nb = i % 3 === 0 ? 2 : 1
      for (let k = 0; k < nb; k++) {
        const sid = wanted[(i + k * 3) % wanted.length]
        // Maîtrise : mélange de fragiles (<50) et de corrects pour le contraste.
        const weak = (i + k) % 2 === 0
        const mastery = weak ? 25 + ((i * 7 + k * 13) % 24) : 62 + ((i * 5) % 30)
        const daysAgo = 1 + ((i + k) % 9)
        const reviewed = new Date(Date.now() - daysAgo * 86400000)
        const dueDays = mastery >= 80 ? 7 : mastery >= 50 ? 3 : 1
        data[sid] = {
          name: byId[sid],
          mastery,
          lastScore: mastery,
          attempts: 1 + ((i + k) % 3),
          lastReviewed: reviewed.toISOString(),
          due: new Date(reviewed.getTime() + dueDays * 86400000).toISOString(),
        }
      }
      if (Object.keys(data).length) saveRevisions(e.id, data)
    })
    localStorage.setItem('mapo_revisions_seeded_v1', '1')
  }

  /**
   * Analyse une copie d'examen photographiée (MIAPO vision / Gemini).
   * @param {{imageDataUrl:string, niveau?:string}} opts
   * @returns {Promise<{ok, analyse?:{matiere,note,points_faibles,conseil}, mode, reason?}>}
   */
  async function analyserCopie({ imageDataUrl, niveau = '' }) {
    // Consentement avant envoi de l'image à l'IA (données personnelles). Rien n'est conservé.
    if (typeof window !== 'undefined' && typeof window.confirm === 'function' &&
        !window.confirm("La photo de la copie va être analysée par l'IA pour repérer les points à revoir. L'image n'est pas conservée après l'analyse. Confirmez-vous l'envoi ?")) {
      return { ok: false, mode: 'annule', reason: 'Analyse annulée.' }
    }
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'vision_copie', data: { image: imageDataUrl, niveau } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && json.ok && json.text) {
        const obj = parseJsonObject(json.text)
        if (obj) {
          return {
            ok: true,
            mode: 'ia',
            analyse: {
              matiere: String(obj.matiere || '').trim(),
              note: clampNote(obj.note),
              points_faibles: Array.isArray(obj.points_faibles) ? obj.points_faibles.map((x) => String(x).trim()).filter(Boolean).slice(0, 5) : [],
              conseil: String(obj.conseil || '').trim(),
            },
          }
        }
      }
      const reason = json && json.error === 'not_configured' ? 'IA pas encore configurée'
        : json && (json.error === 'limite_atteinte' || json.error === 'limite_globale') ? 'Limite de démo atteinte, réessayez plus tard'
        : (json && (json.detail || json.error)) || 'Lecture de la copie impossible pour le moment.'
      return { ok: false, mode: 'simulation', reason }
    } catch (e) {
      return { ok: false, mode: 'simulation', reason: 'Service indisponible. Réessayez.' }
    }
  }

  /**
   * Génère une DICTÉE (titre + phrases courtes) à énoncer à voix haute côté client.
   * @returns {Promise<{ok, titre?:string, phrases?:string[], reason?}>}
   */
  async function genererDictee({ matiere = 'Français', niveau = '', cours = '', digest = '', langue = 'fr', longueur = 'moyenne' }) {
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'dictee', data: { matiere, niveau, cours, digest, langue, longueur } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && (json.error === 'credits_epuises' || json.error === 'plafond_atteint')) return { ok: false, reason: 'credits_epuises' }
      if (json && json.ok && json.text) {
        const o = parseJsonObject(json.text)
        const phrases = o && Array.isArray(o.phrases) ? o.phrases.map((p) => String(p).trim()).filter(Boolean) : []
        if (phrases.length) return { ok: true, titre: String((o && o.titre) || '').trim(), phrases }
      }
      return { ok: false, reason: (json && (json.detail || json.error)) || 'dictee_failed' }
    } catch (e) {
      return { ok: false, reason: 'network' }
    }
  }

  /**
   * Corrige une DICTÉE : compare la copie de l'apprenant au texte de référence et
   * renvoie une note + TOUTES les fautes réelles, chacune avec l'extrait EXACT écrit
   * par l'apprenant (pour surligner dans sa copie), la correction, le POURQUOI (la
   * règle) et un type. Distincte de evaluerReponse (qui juge le FOND d'une réponse).
   * @returns {Promise<{ok, correction?:{note,bilan,fautes:Array<{extrait,correction,pourquoi,type}>}, reason?}>}
   */
  async function corrigerDictee({ reference = '', reponse = '', niveau = '', langue = 'fr' }) {
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'dictee_correction', data: { reference, reponse, niveau, langue } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && (json.error === 'credits_epuises' || json.error === 'plafond_atteint')) return { ok: false, reason: 'credits_epuises' }
      if (json && json.ok && json.text) {
        const o = parseJsonObject(json.text)
        if (o) {
          const fautes = Array.isArray(o.fautes)
            ? o.fautes.map((f) => ({
              extrait: String((f && f.extrait) || '').trim(),
              correction: String((f && f.correction) || '').trim(),
              pourquoi: String((f && f.pourquoi) || '').trim(),
              type: String((f && f.type) || '').trim().toLowerCase(),
            })).filter((f) => f.extrait && f.correction).slice(0, 20)
            : []
          return { ok: true, correction: { note: clampNote10(o.note), bilan: String(o.bilan || '').trim(), fautes } }
        }
      }
      return { ok: false, reason: (json && (json.detail || json.error)) || 'correction_failed' }
    } catch (e) {
      return { ok: false, reason: 'network' }
    }
  }

  /**
   * Génère un exercice d'APPARIEMENT (paires à relier) : titre + liste de paires
   * { a, b }. En mode `visuel` (jeune apprenant / primaire), b est un emoji qui
   * illustre le mot a (double codage, coût nul). La correction est côté client
   * (l'apprenant relie a↔b) : aucune bonne réponse cachée à protéger.
   * @returns {Promise<{ok, titre?:string, paires?:Array<{a,b}>, reason?}>}
   */
  async function genererAppariement({ matiere = 'Culture générale', niveau = '', difficulte = 1, cours = '', digest = '', visuel = false, langue = 'fr', exclure = [] }) {
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST', headers,
        // exclure : termes déjà vus dans la session → l'IA renouvelle le vocabulaire à chaque tour.
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'appariement', data: { matiere, niveau, difficulte, cours, digest, visuel, langue, exclure: Array.isArray(exclure) ? exclure.slice(-40) : [] } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && (json.error === 'credits_epuises' || json.error === 'plafond_atteint')) return { ok: false, reason: 'credits_epuises' }
      if (json && json.ok && json.text) {
        const o = parseJsonObject(json.text)
        const paires = o && Array.isArray(o.paires)
          ? o.paires
              .map((p) => ({ a: String((p && p.a) || '').trim(), b: String((p && p.b) || '').trim() }))
              .filter((p) => p.a && p.b)
          : []
        if (paires.length >= 3) return { ok: true, titre: String((o && o.titre) || '').trim(), paires }
      }
    } catch (e) { /* réseau / IA indispo → repli local ci-dessous */ }
    // Repli hors-ligne / démo propre à « Relie les paires » : le QUIZ, lui, n'a
    // plus de repli local (servir des questions hors programme faisait croire à
    // l'apprenant qu'il révisait sa leçon). Ici le contenu est un jeu de
    // vocabulaire assumé comme tel, pas une révision du programme.
    const n = Math.max(4, Math.min(8, 3 + (difficulte || 1)))
    return { ok: true, titre: '', paires: buildLocalPairs(matiere, n, visuel), mode: 'simulation' }
  }

  /**
   * Transcrit en TEXTE une photo de cours (page de manuel / cahier) pour l'ajouter
   * au dépôt « Mes cours ». Le backend ignore les données personnelles (nom, n°) :
   * seule la matière pédagogique est restituée. L'image n'est pas conservée.
   * @returns {Promise<{ok, texte?:string, reason?}>}
   */
  async function transcrireCours({ imageDataUrl, niveau = '' }) {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function' &&
        !window.confirm("La photo va être transcrite en texte par l'IA pour l'ajouter à tes cours. L'image n'est pas conservée. Confirmer l'envoi ?")) {
      return { ok: false, reason: 'annule' }
    }
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'vision_cours', data: { image: imageDataUrl, niveau } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      const txt = json && json.ok && json.text ? String(json.text).trim() : ''
      if (txt && !/^\(illisible\)$/i.test(txt)) return { ok: true, texte: txt }
      return { ok: false, reason: txt ? 'illisible' : ((json && (json.detail || json.error)) || 'vision_failed') }
    } catch (e) {
      return { ok: false, reason: 'network' }
    }
  }

  /**
   * Évalue une réponse RÉDIGÉE (question ouverte). Sépare le FOND (la matière)
   * de la FORME (orthographe/grammaire) : un devoir d'histoire renseigne aussi
   * sur le niveau de français, sans jamais pénaliser le fond pour des fautes.
   * @returns {Promise<{ok, eval?:{note,verdict,explication,langue:{gravite,commentaire,fautes}}, reason?}>}
   */
  async function evaluerReponse({ question, reponse, matiere = '', niveau = '' }) {
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'eval_reponse', data: { question, reponse, matiere, niveau } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && json.ok && json.text) {
        const o = parseJsonObject(json.text)
        if (o) {
          const l = o.langue || {}
          const g = String(l.gravite || '').toLowerCase()
          return {
            ok: true,
            eval: {
              note: clampNote10(o.note),
              verdict: String(o.verdict || '').trim(),
              explication: String(o.explication || '').trim(),
              langue: {
                gravite: ['aucune', 'legere', 'importante'].includes(g) ? g : 'aucune',
                commentaire: String(l.commentaire || '').trim(),
                fautes: Array.isArray(l.fautes)
                  ? l.fautes.map((f) => ({ extrait: String(f?.extrait || '').trim(), correction: String(f?.correction || '').trim() })).filter((f) => f.extrait).slice(0, 3)
                  : [],
              },
            },
          }
        }
      }
      const reason = json && json.error === 'not_configured' ? 'IA pas encore configurée'
        : json && (json.error === 'limite_atteinte' || json.error === 'limite_globale') ? 'Limite de démo atteinte, réessayez plus tard'
        : (json && (json.detail || json.error)) || 'Évaluation impossible pour le moment.'
      return { ok: false, reason }
    } catch (e) {
      return { ok: false, reason: 'Service indisponible. Réessayez.' }
    }
  }

  /**
   * Pistes d'orientation contextualisées (MIAPO / Gemini).
   * @param {{niveau:string, pays?:string, forts?:string[], faibles?:string[]}} opts
   * @returns {Promise<{ok, orientation?:{profil,pistes,conseil}, reason?}>}
   */
  async function orientation({ niveau, pays = '', forts = [], faibles = [] }) {
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'orientation', data: { niveau, pays, forts, faibles } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && json.ok && json.text) {
        const obj = parseJsonObject(json.text)
        if (obj) {
          return {
            ok: true,
            orientation: {
              profil: String(obj.profil || '').trim(),
              pistes: Array.isArray(obj.pistes) ? obj.pistes.map((p) => ({
                filiere: String(p.filiere || '').trim(),
                pourquoi: String(p.pourquoi || '').trim(),
                debouches: Array.isArray(p.debouches) ? p.debouches.map((x) => String(x).trim()).filter(Boolean).slice(0, 5) : [],
              })).filter((p) => p.filiere).slice(0, 4) : [],
              conseil: String(obj.conseil || '').trim(),
            },
          }
        }
      }
      const reason = json && json.error === 'not_configured' ? 'IA pas encore configurée'
        : json && (json.error === 'limite_atteinte' || json.error === 'limite_globale') ? 'Limite de démo atteinte, réessayez plus tard'
        : (json && (json.detail || json.error)) || 'Orientation indisponible pour le moment.'
      return { ok: false, reason }
    } catch (e) {
      return { ok: false, reason: 'Service indisponible. Réessayez.' }
    }
  }

  /**
   * Orientation 6C : recommandations ARGUMENTÉES, fondées sur des domaines
   * candidats RÉELS (présélectionnés côté front via le référentiel embarqué).
   * @param {{niveau, pays, competences:Object, forts:string[], faibles:string[], candidats:Array}} o
   * @returns {Promise<{ok, result?:{profil,recommandations,conseil,prudence}, reason?}>}
   */
  async function orientation6c({ niveau, pays = '', competences = {}, forts = [], faibles = [], interets = [], candidats = [], passions = '', metiers = '', age = 0, langue = 'fr' }) {
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'orientation6c', data: { niveau, pays, competences, forts, faibles, interets, candidats, passions, metiers, age, langue } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && json.ok && json.text) {
        const obj = parseJsonObject(json.text)
        if (obj) {
          return {
            ok: true,
            result: {
              profil: String(obj.profil || '').trim(),
              recommandations: Array.isArray(obj.recommandations) ? obj.recommandations.map((r) => ({
                domaine: String(r.domaine || '').trim(),
                adequation: String(r.adequation || '').trim().toLowerCase() === 'forte' ? 'forte' : 'moyenne',
                pourquoi: String(r.pourquoi || '').trim(),
                metiers_cles: Array.isArray(r.metiers_cles) ? r.metiers_cles.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [],
                etablissements_cles: Array.isArray(r.etablissements_cles) ? r.etablissements_cles.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [],
              })).filter((r) => r.domaine).slice(0, 4) : [],
              conseil: String(obj.conseil || '').trim(),
              prudence: String(obj.prudence || '').trim(),
            },
          }
        }
      }
      const reason = json && (json.error === 'limite_atteinte' || json.error === 'limite_globale') ? 'Limite de démo atteinte, réessayez plus tard'
        : (json && (json.detail || json.error)) || 'Orientation indisponible pour le moment.'
      return { ok: false, reason }
    } catch (e) {
      return { ok: false, reason: 'Service indisponible. Réessayez.' }
    }
  }

  /**
   * Programme de préparation à l'examen national (MIAPO / Gemini).
   * @param {{niveau:string, pays?:string, faibles?:string[]}} opts
   * @returns {Promise<{ok, prepa?:{examen,matieres_cles,plan,conseil}, reason?}>}
   */
  async function prepaExamen({ niveau, pays = '', faibles = [] }) {
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'prepa_examen', data: { niveau, pays, faibles } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && json.ok && json.text) {
        const obj = parseJsonObject(json.text)
        if (obj) {
          return {
            ok: true,
            prepa: {
              examen: String(obj.examen || '').trim(),
              matieres_cles: Array.isArray(obj.matieres_cles) ? obj.matieres_cles.map((x) => String(x).trim()).filter(Boolean).slice(0, 10) : [],
              plan: Array.isArray(obj.plan) ? obj.plan.map((p) => ({
                etape: String(p.etape || '').trim(),
                objectif: String(p.objectif || '').trim(),
                focus: Array.isArray(p.focus) ? p.focus.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [],
                actions: Array.isArray(p.actions) ? p.actions.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [],
              })).filter((p) => p.etape || p.objectif).slice(0, 6) : [],
              conseil: String(obj.conseil || '').trim(),
            },
          }
        }
      }
      const reason = json && json.error === 'not_configured' ? 'IA pas encore configurée'
        : json && (json.error === 'limite_atteinte' || json.error === 'limite_globale') ? 'Limite de démo atteinte, réessayez plus tard'
        : (json && (json.detail || json.error)) || 'Préparation indisponible pour le moment.'
      return { ok: false, reason }
    } catch (e) {
      return { ok: false, reason: 'Service indisponible. Réessayez.' }
    }
  }

  /**
   * Moteur de cours (apprenant hors-catalogue) : à partir du NOM de la formation
   * et, si fourni, du TEXTE du programme collé, MIAPO décompose la formation en
   * MODULES (avec notions clés) et bâtit un PLAN d'apprentissage séquencé.
   * Repli LOCAL si l'IA n'est pas déployée/indisponible : on découpe le
   * programme collé en modules (lignes / puces / points-virgules / virgules) →
   * la fonctionnalité reste utilisable, l'IA ne fait que l'enrichir.
   * @param {{formation:string, programme?:string, niveau?:string}} opts
   * @returns {Promise<{ok, modules, plan, conseil, mode, reason}>}
   *   modules: [{titre, notions[]}]   plan: [{periode, module, objectif, actions[]}]
   */
  async function generateCoursePlan({ formation, programme = '', niveau = '' }) {
    planning.value = true
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'course_plan', data: { formation, programme, niveau } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && json.ok && json.text) {
        const obj = parseJsonObject(json.text)
        if (obj) {
          const modules = normalizeModules(obj.modules)
          const plan = normalizePlan(obj.plan)
          if (modules.length) {
            planning.value = false
            return { ok: true, modules, plan, conseil: String(obj.conseil || '').trim(), mode: 'ia', reason: '' }
          }
        }
      }
      // IA non configurée / illisible / hors-ligne → on bascule sur le repli local.
    } catch { /* proxy indisponible → repli local */ }
    planning.value = false
    const local = localCoursePlan(formation, programme)
    return { ok: !!local.modules.length, ...local, mode: 'simulation', reason: 'Plan généré localement (IA indisponible)' }
  }

  /**
   * Bilan 6C : à partir des 6 scores auto-évalués, MIAPO rédige un bilan
   * (synthèse + 2 points forts + 2 axes à améliorer avec conseils concrets),
   * au ton adapté au persona (enfant/élève/adulte) et à la langue. Repli LOCAL
   * (règles + conseils pré-écrits bilingues) si l'IA est indisponible.
   * @param {{competences:Object, persona?:string, niveau?:string, formation?:string, langue?:string}} o
   * @returns {Promise<{ok, bilan:{synthese,forces,axes,conseil}, mode}>}
   */
  async function generateBilan6c({ competences = {}, persona = 'eleve', niveau = '', formation = '', langue = 'fr' }) {
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'bilan6c', data: { competences, persona, niveau, formation, langue } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && json.ok && json.text) {
        const bilan = normalizeBilan6c(parseJsonObject(json.text))
        if (bilan) return { ok: true, bilan, mode: 'ia' }
      }
    } catch { /* repli local */ }
    return { ok: true, bilan: localBilan6c(competences, langue), mode: 'simulation' }
  }

  // Propose/extrait les modules d'une formation (nom + établissement + descriptif
  // optionnel). Sans descriptif : MIAPO propose les modules typiques ; l'apprenant
  // complète / modifie / valide.
  async function extraireModules({ formation, ecole = '', texte = '' }) {
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'extract_modules', data: { formation, ecole, texte } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && json.ok && json.text) {
        const obj = parseJsonObject(json.text)
        if (obj && Array.isArray(obj.modules)) {
          const modules = obj.modules.map((m) => String(m).trim()).filter(Boolean).slice(0, 16)
          if (modules.length) return { ok: true, modules }
        }
      }
      const reason = json && json.error === 'not_configured' ? 'IA pas encore configurée'
        : json && (json.error === 'limite_atteinte' || json.error === 'limite_globale') ? 'Limite de démonstration atteinte'
        : (json && (json.detail || json.error)) || 'Proposition impossible pour le moment.'
      return { ok: false, reason }
    } catch { return { ok: false, reason: 'Service indisponible. Réessayez.' } }
  }

  /**
   * Chat pédagogique MIAPO (MAPO+ / B2C) : réponse SOCRATIQUE en texte libre.
   * Cultive la compréhension et l'esprit critique — n'écrit pas le devoir à la
   * place de l'apprenant. `internet` autorise les connaissances générales ;
   * sinon MIAPO se limite aux `cours` fournis.
   * @param {{message:string, niveau?:string, matieres?:string, cours?:string, historique?:string, internet?:boolean, prenom?:string, langue?:string}} opts
   * @returns {Promise<{ok, text?, reason?}>}
   */
  async function chatTuteur({ message, niveau = '', matieres = '', cours = '', historique = '', internet = false, prenom = '', interets = '', digest = '', langue = 'fr' }) {
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ metered: mtrB2C(), famille: famB2C(), task: 'tuteur_chat', data: { message, niveau, matieres, cours, historique, internet, prenom, interets, digest, langue } }),
      })
      const json = await res.json().catch(() => null)
      noteCredits(json)
      if (json && (json.error === 'credits_epuises' || json.error === 'plafond_atteint')) return { ok: false, reason: 'credits_epuises' }
      if (json && json.ok && json.text) return { ok: true, text: String(json.text).trim() }
      const reason = json && json.error === 'not_configured' ? 'IA pas encore configurée'
        : json && json.error === 'non_autorise' ? 'Connexion requise'
        : json && (json.error === 'limite_atteinte' || json.error === 'limite_globale') ? 'Limite de démo atteinte, réessayez plus tard'
        : (json && (json.detail || json.error)) || 'Réponse impossible pour le moment.'
      return { ok: false, reason }
    } catch (e) {
      return { ok: false, reason: 'Service indisponible. Réessayez.' }
    }
  }

  // Traduction de libellés d'interface vers une 2e langue (accessibilité). NON
  // décomptée (metered absent) : c'est un service d'inclusion, pas une révision.
  async function translateUI(texts, target, source = 'French') {
    if (!Array.isArray(texts) || !texts.length || !target) return []
    try {
      const user = fbAuth.currentUser
      const token = user ? await user.getIdToken().catch(() => null) : null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(IA_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ task: 'translate', data: { texts, target, source } }),
      })
      const json = await res.json().catch(() => null)
      if (json && json.ok && json.text) {
        const o = parseJsonObject(json.text)
        if (o && Array.isArray(o.t)) return o.t.map((s) => String(s == null ? '' : s))
      }
    } catch { /* silencieux */ }
    return []
  }


  /**
   * Rapatrie les révisions faites AVANT le correctif du 06/08.
   *
   * Tant que ce store écrivait sous l'identifiant de la session, les révisions
   * d'un enfant connecté à son propre compte atterrissaient dans SON dossier au
   * lieu de celui de sa famille. Elles existent, elles sont juste au mauvais
   * endroit — et personne ne les voit.
   *
   * Ce déplacement a lieu une seule fois, au démarrage d'une session enfant, et
   * ne peut pas abîmer de données : on ne recopie QUE si la destination est
   * vide, puis on efface la source (données d'un mineur, on ne les laisse pas
   * traîner en double). Rejouable sans risque : la fois suivante, il n'y a plus
   * rien à déplacer.
   */
  async function migrerRevisionsVersProprietaire(studentId) {
    const moi = cloudUid()
    const proprio = proprietaireUid()
    // Rien à faire pour un parent : source et destination sont le même dossier.
    if (!moi || !proprio || moi === proprio || !studentId) return { deplaces: 0 }
    let deplaces = 0
    for (const nom of [studentId, 'history_' + studentId, 'conversations_' + studentId]) {
      try {
        const source = doc(db, 'users', moi, 'revisions', nom)
        const snap = await getDoc(source)
        if (!snap.exists()) continue
        const cible = doc(db, 'users', proprio, 'revisions', nom)
        const dejaLa = await getDoc(cible)
        // La destination fait foi : on n'écrase jamais un travail déjà rapatrié.
        if (!dejaLa.exists()) {
          await setDoc(cible, snap.data())
          deplaces++
        }
        await deleteDoc(source)
      } catch { /* hors ligne ou refusé : on retentera au prochain démarrage */ }
    }
    return { deplaces }
  }

  return {
    generating, planning, lastMode, lastReason, revisionsVersion, conversationsVersion,
    generateQuiz, recordResult, getLevel, getJauge, getRevisionState, getDueSubjects, syncFromCloud,
    accepterAnneeSuivante, refuserAnneeSuivante, getProgramme,
    genererPositionnement, enregistrerPositionnement, doitProposerPositionnement, refuserPositionnement,
    saveRevisionSession, getRevisionHistory, syncHistoryFromCloud, migrerRevisionsVersProprietaire,
    pousserEpreuves, syncEpreuvesFromCloud, pousserNotions, syncNotionsFromCloud,
    saveConversation, getConversations, deleteConversation, syncConversationsFromCloud,
    getAllRevisionStates, seedDemoIfEmpty, analyserCopie, transcrireCours, genererDictee, corrigerDictee, genererAppariement, orientation, prepaExamen, generateCoursePlan, generateBilan6c, extraireModules, evaluerReponse, chatTuteur, translateUI,
  }
})

// ── Bilan 6C : normalisation IA + repli local bilingue ──────────────────
function normalizeBilan6c(o) {
  if (!o || typeof o !== 'object') return null
  const arr = (x) => (Array.isArray(x) ? x : [])
  const forces = arr(o.forces).map((f) => ({
    competence: String(f?.competence || '').trim(),
    pourquoi: String(f?.pourquoi || '').trim(),
  })).filter((f) => f.competence).slice(0, 3)
  const axes = arr(o.axes).map((a) => ({
    competence: String(a?.competence || '').trim(),
    pourquoi: String(a?.pourquoi || '').trim(),
    comment: arr(a?.comment).map((c) => String(c).trim()).filter(Boolean).slice(0, 4),
  })).filter((a) => a.competence).slice(0, 3)
  if (!forces.length && !axes.length) return null
  return { synthese: String(o.synthese || '').trim(), forces, axes, conseil: String(o.conseil || '').trim() }
}

const SIXC_META = {
  creativite: { fr: 'Créativité', en: 'Creativity' },
  esprit_critique: { fr: 'Esprit critique', en: 'Critical thinking' },
  communication: { fr: 'Communication', en: 'Communication' },
  cooperation: { fr: 'Coopération', en: 'Cooperation' },
  courage: { fr: 'Courage', en: 'Courage' },
  confiance: { fr: 'Confiance', en: 'Confidence' },
}
const SIXC_TIPS = {
  creativite: { fr: ["Note chaque jour une idée nouvelle, même minuscule.", "Face à un problème, cherche 3 solutions différentes avant de choisir."], en: ["Jot down one new idea every day, even a tiny one.", "For a problem, find 3 different solutions before you choose."] },
  esprit_critique: { fr: ["Avant de partager une info, vérifie sa source.", "Entraîne-toi à distinguer un fait d'une opinion dans ce que tu lis."], en: ["Before sharing information, check its source.", "Practise telling a fact from an opinion in what you read."] },
  communication: { fr: ["Explique une idée compliquée à quelqu'un en une minute.", "Reformule ce que dit l'autre avant de répondre."], en: ["Explain a complex idea to someone in one minute.", "Rephrase what the other person said before answering."] },
  cooperation: { fr: ["Propose ton aide sur un projet de groupe cette semaine.", "Demande l'avis des autres avant de trancher seul."], en: ["Offer your help on a group project this week.", "Ask others' opinion before deciding alone."] },
  courage: { fr: ["Choisis une chose qui te fait un peu peur et lance-toi.", "Après un échec, note ce que tu réessaieras autrement."], en: ["Pick one thing that scares you a bit and go for it.", "After a setback, note what you'll try differently."] },
  confiance: { fr: ["Liste 3 réussites récentes et relis-les avant un défi.", "Prends une petite décision par jour sans demander l'avis de tous."], en: ["List 3 recent wins and reread them before a challenge.", "Make one small decision a day without asking everyone."] },
}
function localBilan6c(competences, langue = 'fr') {
  const L = langue === 'en' ? 'en' : 'fr'
  const entries = Object.keys(SIXC_META).map((k) => ({ k, v: Number(competences?.[k]) || 0 }))
  const scored = entries.filter((e) => e.v > 0)
  const base = scored.length ? scored : entries
  const sorted = [...base].sort((a, b) => b.v - a.v)
  const top = sorted.slice(0, 2)
  const low = [...sorted].reverse().slice(0, 2)
  const forces = top.map((e) => ({
    competence: SIXC_META[e.k][L],
    pourquoi: L === 'en' ? 'One of your clear strengths — keep building on it.' : "L'une de tes forces nettes — appuie-toi dessus.",
  }))
  const axes = low.map((e) => ({
    competence: SIXC_META[e.k][L],
    pourquoi: L === 'en' ? 'A bit lower than the rest — a real lever for progress.' : 'Un peu plus bas que le reste — un vrai levier de progrès.',
    comment: SIXC_TIPS[e.k][L],
  }))
  return {
    synthese: L === 'en' ? 'Your 6C profile shows clear strengths and realistic room to grow.' : 'Ton profil 6C montre des forces nettes et des marges de progression réalistes.',
    forces, axes,
    conseil: L === 'en' ? 'Go step by step: a small regular exercise beats one big effort.' : 'Avance pas à pas : un petit exercice régulier vaut mieux qu\'un grand coup ponctuel.',
  }
}

// ── Moteur de cours : normalisation + repli local ───────────────────────
function normalizeModules(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map((m) => ({
    titre: String(m?.titre ?? m ?? '').trim(),
    notions: Array.isArray(m?.notions) ? m.notions.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [],
  })).filter((m) => m.titre).slice(0, 10)
}
function normalizePlan(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map((p) => ({
    periode: String(p?.periode ?? p?.etape ?? '').trim(),
    module: String(p?.module ?? '').trim(),
    objectif: String(p?.objectif ?? '').trim(),
    actions: Array.isArray(p?.actions) ? p.actions.map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : [],
  })).filter((p) => p.periode || p.module || p.objectif).slice(0, 12)
}
// Repli sans IA : découpe le texte collé (ou, à défaut, le nom de la formation)
// en modules, puis génère un plan hebdomadaire simple (1 module par semaine).
function localCoursePlan(formation, programme) {
  let titles = []
  const txt = String(programme || '').trim()
  if (txt) {
    titles = txt
      .split(/\r?\n|[•·▪◦]|;|(?:^|\s)\d+[.)]\s+/)
      .map((s) => s.replace(/^[\s\-–—*•.)\d]+/, '').trim())
      .filter((s) => s.length >= 3 && s.length <= 80)
    // Une seule ligne longue avec des virgules → on tente le découpage par virgules.
    if (titles.length <= 1 && txt.includes(',')) {
      titles = txt.split(',').map((s) => s.trim()).filter((s) => s.length >= 3 && s.length <= 80)
    }
  }
  titles = [...new Set(titles)].slice(0, 10)
  if (!titles.length && formation) titles = [String(formation).trim()]
  const modules = titles.map((titre) => ({ titre, notions: [] }))
  const plan = modules.map((m, i) => ({
    periode: `Semaine ${i + 1}`,
    module: m.titre,
    objectif: `Maîtriser : ${m.titre}`,
    actions: ['Relire le cours', 'Faire un quiz MIAPO'],
  }))
  return { modules, plan, conseil: '' }
}

/** Note sur 10 (question ouverte), au demi-point. */
function clampNote10(n) {
  const v = Number(n)
  if (Number.isNaN(v)) return null
  return Math.max(0, Math.min(10, Math.round(v * 2) / 2))
}

function clampNote(n) {
  const v = Number(n)
  if (Number.isNaN(v)) return null
  return Math.max(0, Math.min(20, Math.round(v * 2) / 2))
}

// Parse robuste d'un objet JSON (réponse vision), tolère ```json et le texte autour.
function parseJsonObject(text) {
  if (!text) return null
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const s = t.indexOf('{'), e = t.lastIndexOf('}')
  if (s !== -1 && e !== -1 && e > s) t = t.slice(s, e + 1)
  try { return JSON.parse(t) } catch { return null }
}

// ── Parsing robuste du JSON renvoyé par l'IA ────────────────────────────
function parseQuiz(text) {
  if (!text) return []
  let t = String(text).trim()
  // Retire d'éventuelles balises markdown ```json ... ```
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  const slice = (start !== -1 && end !== -1 && end > start) ? t.slice(start, end + 1) : t
  let arr = []
  try {
    const obj = JSON.parse(slice)
    arr = Array.isArray(obj?.questions) ? obj.questions : (Array.isArray(obj) ? obj : [])
  } catch {
    // Réponse tronquée (cap de tokens) → on récupère les objets-questions complets
    arr = salvageQuestions(t)
  }
  return arr
    .map((x) => ({
      q: String(x.q ?? x.question ?? '').trim(),
      choices: Array.isArray(x.choices) ? x.choices.map((c) => String(c).trim()).slice(0, 4) : [],
      answer: Number.isInteger(x.answer) ? x.answer : 0,
      hint: String(x.hint ?? '').trim(),
      explanation: String(x.explanation ?? x.explication ?? '').trim(),
      // Notion du programme sur laquelle porte la question (écarts E2 et E5).
      // Gardée telle quelle ici ; c'est `generateQuiz` qui la VALIDE contre la
      // liste envoyée, parce que lui seul sait ce qui a été envoyé.
      notion: String(x.notion ?? '').trim(),
    }))
    .filter((x) => x.q && x.choices.length === 4 && x.answer >= 0 && x.answer < 4)
}

/**
 * Ne garde la notion que si elle figure dans la liste envoyée au modèle.
 *
 * ⚠️ Sans ce filtre, le tag serait une ÉTIQUETTE — exactement le défaut que le
 * référentiel reproche à l'ancien `source: "referentiel"` : on demandait au
 * modèle d'écrire un mot, il l'écrivait, et ça avait l'apparence d'un sourçage.
 * Une notion inventée rangerait le suivi de l'apprenant sous un intitulé qui
 * n'existe pas au programme : pire que pas de suivi du tout.
 *
 * La comparaison tolère la casse, les accents et les espaces : le modèle
 * recopie fidèlement le sens, pas toujours la typographie.
 */
function normNotion(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
export function validerNotions(questions, notionsEnvoyees) {
  const index = new Map()
  for (const n of (notionsEnvoyees || [])) index.set(normNotion(n), n)
  return (questions || []).map((q) => {
    const officiel = index.get(normNotion(q && q.notion))
    return { ...q, notion: officiel || '' }
  })
}

/**
 * Questions du test de positionnement, avec leur PALIER.
 *
 * On ne peut pas réutiliser `parseQuiz` : il jette le champ `niveau`, qui est
 * précisément ce qui permet de placer l'apprenant. On réutilise en revanche sa
 * tolérance — mesuré en production le 13/08, le modèle rend parfois du JSON
 * malformé en cours de route (« "niveau1, » au lieu de « "niveau":1, »). Sur un
 * JSON.parse strict, tout le test était perdu pour une virgule ; avec le
 * repêchage, on garde les questions bien formées et le placement reste valable.
 */
function parsePositionnement(text) {
  if (!text) return []
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const start = t.indexOf('{'); const end = t.lastIndexOf('}')
  const slice = (start !== -1 && end !== -1 && end > start) ? t.slice(start, end + 1) : t
  let arr = []
  try {
    const obj = JSON.parse(slice)
    arr = Array.isArray(obj?.questions) ? obj.questions : (Array.isArray(obj) ? obj : [])
  } catch {
    arr = salvageQuestions(t)
  }
  return arr
    .map((x) => ({
      niveau: Number(x.niveau) || 1,
      q: String(x.q ?? x.question ?? '').trim(),
      choices: Array.isArray(x.choices) ? x.choices.map((c) => String(c).trim()).slice(0, 4) : [],
      answer: Number.isInteger(x.answer) ? x.answer : 0,
      hint: String(x.hint ?? '').trim(),
      explanation: String(x.explanation ?? x.explication ?? '').trim(),
    }))
    .filter((x) => x.q && x.choices.length === 4 && x.answer >= 0 && x.answer < 4)
}

// Récupère les objets-questions JSON complets d'une réponse tronquée.
// Pile d'indices d'ouverture → chaque '}' ferme l'objet le plus récent ;
// on tente de parser ce fragment (les questions sont des objets imbriqués).
function salvageQuestions(text) {
  const out = []
  const stack = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') stack.push(i)
    else if (ch === '}') {
      const s = stack.pop()
      if (s === undefined) continue
      const frag = text.slice(s, i + 1)
      if (/"choices"\s*:/.test(frag)) {
        try { const o = JSON.parse(frag); if (o && Array.isArray(o.choices)) out.push(o) } catch { /* incomplet */ }
      }
    }
  }
  return out
}

function normalizeKey(name) {
  const n = (name || '').toLowerCase()
  if (/(math)/.test(n)) return 'maths'
  if (/(fran|lettre|expression)/.test(n)) return 'francais'
  if (/(hist|geo|géo)/.test(n)) return 'histoire'
  if (/(svt|biolog|science.*vie|nature)/.test(n)) return 'svt'
  if (/(angl|english)/.test(n)) return 'anglais'
  return ''
}

// Banque de PAIRES locale (repli hors-ligne / démo de « Relie les paires »).
const LOCAL_PAIRS = {
  maths: [{ a: '7 × 8', b: '56' }, { a: '3²', b: '9' }, { a: 'Aire du rectangle', b: 'L × l' }, { a: 'Périmètre du carré', b: '4 × côté' }, { a: '½', b: '0,5' }, { a: 'PGCD(12, 18)', b: '6' }, { a: '10 %', b: 'un dixième' }, { a: 'Angle droit', b: '90°' }],
  francais: [{ a: 'content', b: 'heureux' }, { a: 'rapide', b: 'vif' }, { a: 'triste', b: 'malheureux' }, { a: 'beau', b: 'joli' }, { a: 'la peur', b: 'la crainte' }, { a: 'une maison', b: 'une demeure' }, { a: 'malin', b: 'rusé' }, { a: 'calme', b: 'paisible' }],
  anglais: [{ a: 'chat', b: 'cat' }, { a: 'chien', b: 'dog' }, { a: 'maison', b: 'house' }, { a: 'eau', b: 'water' }, { a: 'livre', b: 'book' }, { a: 'école', b: 'school' }, { a: 'ami', b: 'friend' }, { a: 'rouge', b: 'red' }],
  svt: [{ a: 'cœur', b: 'pompe le sang' }, { a: 'poumons', b: 'la respiration' }, { a: 'estomac', b: 'la digestion' }, { a: 'racine', b: 'absorbe l’eau' }, { a: 'reins', b: 'filtrent le sang' }, { a: 'photosynthèse', b: 'la plante fabrique sa matière' }],
  histoire: [{ a: 'Cameroun', b: 'Yaoundé' }, { a: 'Sénégal', b: 'Dakar' }, { a: 'Gabon', b: 'Libreville' }, { a: 'France', b: 'Paris' }, { a: 'Égypte', b: 'Le Caire' }, { a: 'Côte d’Ivoire', b: 'Yamoussoukro' }],
}
// Paires VISUELLES (primaire) : mot ↔ emoji.
const LOCAL_PAIRS_EMOJI = [
  { a: 'chat', b: '🐱' }, { a: 'chien', b: '🐶' }, { a: 'soleil', b: '☀️' }, { a: 'pomme', b: '🍎' },
  { a: 'maison', b: '🏠' }, { a: 'voiture', b: '🚗' }, { a: 'ballon', b: '⚽' }, { a: 'fleur', b: '🌸' },
  { a: 'poisson', b: '🐟' }, { a: 'étoile', b: '⭐' },
]

function shuffleLocal(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function buildLocalPairs(matiere, nombre = 6, visuel = false) {
  if (visuel) return shuffleLocal(LOCAL_PAIRS_EMOJI).slice(0, Math.max(4, Math.min(8, nombre)))
  const key = normalizeKey(matiere)
  const bank = LOCAL_PAIRS[key] || LOCAL_PAIRS.francais
  return shuffleLocal(bank).slice(0, Math.max(4, Math.min(8, nombre)))
}
