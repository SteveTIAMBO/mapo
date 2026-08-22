import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { demoKey, paysDemo } from '../utils/demoScope'
import { useSchoolStore } from './school'
import { packPays, localiserDonnees } from '../data/paysDemo'
import { NOMS_REFERENCE } from '../data/nomsDemo'

/**
 * Données de démonstration localisées selon le pays choisi.
 * Passe unique et générique : voir `localiserDonnees` dans data/paysDemo.js.
 */
function localiser(v) {
  return localiserDonnees(v, NOMS_REFERENCE, packPays(paysDemo()))
}

/**
 * Store « Cahier de préparation ».
 *
 * Demandé par Lorene (Shakespeare Academy, Pointe-Noire) le 13/08/2026 : chaque
 * enseignant planifie les modules qu'il va traiter dans SES matières, période par
 * période, et la direction valide.
 *
 * Une FICHE = le plan d'une matière, pour une classe, sur une période.
 * Elle porte une liste ORDONNÉE de modules.
 *
 * ⚠️ L'état vit sur le MODULE, pas sur la fiche (revu le 19/08/2026 après retour
 * de Steve). La direction doit pouvoir valider le module 1, refuser le 2 et
 * demander une modification sur le 3 : un état unique par fiche l'en empêchait,
 * et l'obligeait à tout rejeter pour signaler un seul problème. L'état de la
 * fiche est désormais un RÉSUMÉ calculé, jamais une donnée stockée.
 */

// Clé SUFFIXÉE PAR ÉDITION : sans cela, le primaire lirait les données du
// secondaire et inversement. Les deux éditions sont des produits distincts.
const DEMO_KEY = 'mapo_preparation_v1'

/**
 * États d'un module.
 *
 * Les LIBELLÉS diffèrent selon qui regarde, et c'est voulu : « soumis » décrit
 * ce que l'enseignant vient de faire, pas ce que la direction a à faire. Côté
 * direction on lit « en attente de validation ». Voir les clés i18n
 * `prep.statutProf.*` et `prep.statutDir.*`.
 */
export const STATUTS_MODULE = ['brouillon', 'soumis', 'valide', 'refuse', 'a_modifier']

/** Un module attend-il une action de la direction ? */
export function attendDirection(m) {
  return m?.statut === 'soumis'
}

/** Un module attend-il une action de l'enseignant ? */
export function attendEnseignant(m) {
  return m?.statut === 'brouillon' || m?.statut === 'a_modifier'
}

/**
 * État de synthèse d'une fiche, DÉDUIT de ses modules.
 *
 * Ordre de priorité volontaire : ce qui demande une action passe devant ce qui
 * est réglé. Une fiche dont un seul module est refusé ne doit pas s'afficher
 * « validée » parce que les autres le sont.
 */
export function etatFiche(fiche) {
  const mods = fiche?.modules || []
  if (!mods.length) return 'vide'
  if (mods.some((m) => m.statut === 'refuse')) return 'refuse'
  if (mods.some((m) => m.statut === 'a_modifier')) return 'a_modifier'
  if (mods.some((m) => m.statut === 'soumis')) return 'soumis'
  if (mods.every((m) => m.statut === 'valide')) return 'valide'
  return 'brouillon'
}

/** Compte les modules par état : c'est ce qu'on affiche sur la fiche. */
export function compterParEtat(fiche) {
  const n = { brouillon: 0, soumis: 0, valide: 0, refuse: 0, a_modifier: 0 }
  for (const m of fiche?.modules || []) if (n[m.statut] !== undefined) n[m.statut]++
  return n
}

export const usePreparationStore = defineStore('preparation', () => {
  const fiches = ref([])
  const loaded = ref(false)

  function _ref(sid) { return doc(db, 'schools', sid, 'config', 'preparation') }

  /**
   * Migration des fiches enregistrées avec un état AU NIVEAU DE LA FICHE.
   * Sans elle, les plans déjà saisis se retrouveraient avec des modules sans
   * statut : ni l'enseignant ni la direction ne sauraient quoi en faire, et
   * l'écran les afficherait comme des brouillons jamais soumis.
   */
  function _migrer(liste) {
    for (const f of liste || []) {
      for (const m of f.modules || []) {
        if (!m.statut) m.statut = f.statut === 'a_revoir' ? 'a_modifier' : (f.statut || 'brouillon')
        if (m.motif === undefined) m.motif = f.statut === 'a_revoir' ? (f.motif || '') : ''
        if (m.details === undefined) m.details = ''
      }
    }
    return liste
  }

  async function load() {
    const authStore = useAuthStore()
    if (authStore.isDemo) {
      try {
        const s = JSON.parse(localStorage.getItem(demoKey(DEMO_KEY)) || '{}')
        fiches.value = _migrer(Array.isArray(s.fiches) ? s.fiches : demoSeed())
      } catch { fiches.value = demoSeed() }
      loaded.value = true
      return
    }
    try {
      const sid = authStore.schoolId
      if (!sid) { fiches.value = []; loaded.value = true; return }
      const snap = await getDoc(_ref(sid))
      fiches.value = _migrer(snap.exists() && Array.isArray(snap.data().fiches) ? snap.data().fiches : [])
      loaded.value = true
    } catch { fiches.value = []; loaded.value = true }
  }

  async function save() {
    const authStore = useAuthStore()
    const data = JSON.parse(JSON.stringify(fiches.value))
    if (authStore.isDemo) {
      try { localStorage.setItem(demoKey(DEMO_KEY), JSON.stringify({ fiches: data })) } catch { /* quota */ }
      return
    }
    try {
      const sid = authStore.schoolId
      if (!sid) return
      await setDoc(_ref(sid), { fiches: data, updatedAt: new Date().toISOString() })
    } catch (e) { console.error('Erreur sauvegarde préparation:', e) }
  }

  function trouver(id) { return fiches.value.find((f) => f.id === id) || null }
  function trouverModule(ficheId, moduleId) {
    return trouver(ficheId)?.modules.find((m) => m.id === moduleId) || null
  }

  function _qui() {
    const p = useAuthStore().userProfile || {}
    return [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.displayName || ''
  }

  /**
   * Crée ou retrouve la fiche d'une matière, pour une classe et une période.
   * Une seule fiche par triplet : sans cette unicité, deux enseignants d'une même
   * matière produiraient deux plans concurrents que la direction devrait arbitrer.
   *
   * Renvoie `{ fiche, creee }` — l'appelant DOIT pouvoir dire à l'utilisateur si
   * la fiche existait déjà. Sans cette information, le bouton « Ouvrir la fiche »
   * ne produisait aucun retour visible et paraissait cassé.
   */
  function ouvrirFiche({ matiere, classe, periode }) {
    const m = String(matiere || '').trim()
    const c = String(classe || '').trim()
    const p = String(periode || '').trim()
    if (!m || !c || !p) return { fiche: null, creee: false }

    const existante = fiches.value.find((f) => f.matiere === m && f.classe === c && f.periode === p)
    if (existante) return { fiche: existante, creee: false }

    const prof = useAuthStore().userProfile || {}
    const fiche = {
      id: 'pr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      matiere: m, classe: c, periode: p,
      modules: [],
      auteurId: prof.uid || '',
      auteurNom: _qui(),
      creeLe: new Date().toISOString(),
      majLe: new Date().toISOString(),
    }
    fiches.value.push(fiche)
    save()
    return { fiche, creee: true }
  }

  /** Ajoute un module. Il naît en brouillon : rien n'est soumis sans un geste explicite. */
  function ajouterModule(ficheId, { titre, objectifs = '', details = '', semaines = '' }) {
    const f = trouver(ficheId)
    if (!f || !String(titre || '').trim()) return null
    const mod = {
      id: 'md-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      titre: String(titre).trim(),
      objectifs: String(objectifs || '').trim(),
      details: String(details || '').trim(),
      semaines: String(semaines || '').trim(),
      fait: false,
      statut: 'brouillon',
      motif: '',
      valideLe: '',
      validePar: '',
    }
    f.modules.push(mod)
    _touche(f)
    return mod
  }

  /**
   * Modifie le contenu d'un module.
   *
   * Un module VALIDÉ qui change repasse en attente : le visa de la direction ne
   * couvre pas une version qu'elle n'a pas lue. Les autres états sont conservés
   * tels quels — corriger un module « à modifier » ne le renvoie pas tout seul,
   * l'enseignant le soumet quand il a fini.
   */
  function modifierModule(ficheId, moduleId, patch = {}) {
    const f = trouver(ficheId)
    const m = trouverModule(ficheId, moduleId)
    if (!m) return false
    for (const cle of ['titre', 'objectifs', 'details', 'semaines']) {
      if (patch[cle] !== undefined) m[cle] = String(patch[cle]).trim()
    }
    if (!m.titre) return false
    if (m.statut === 'valide') {
      m.statut = 'soumis'
      m.valideLe = ''
      m.validePar = ''
    }
    _touche(f)
    return true
  }

  function retirerModule(ficheId, moduleId) {
    const f = trouver(ficheId)
    if (!f) return
    f.modules = f.modules.filter((x) => x.id !== moduleId)
    _touche(f)
  }

  /** Déplace un module : l'ORDRE des modules est l'essentiel d'une progression. */
  function deplacerModule(ficheId, moduleId, sens) {
    const f = trouver(ficheId)
    if (!f) return
    const i = f.modules.findIndex((x) => x.id === moduleId)
    const j = sens === 'haut' ? i - 1 : i + 1
    if (i === -1 || j < 0 || j >= f.modules.length) return
    const [m] = f.modules.splice(i, 1)
    f.modules.splice(j, 0, m)
    _touche(f)
  }

  function _touche(f) {
    if (f) f.majLe = new Date().toISOString()
    save()
  }

  // ── Circuit, module par module ────────────────────────────────────────────

  /** L'enseignant envoie un module à la direction. */
  function soumettreModule(ficheId, moduleId) {
    const m = trouverModule(ficheId, moduleId)
    if (!m || m.statut === 'soumis' || m.statut === 'valide') return false
    m.statut = 'soumis'
    m.motif = ''
    _touche(trouver(ficheId))
    return true
  }

  /** Envoie d'un coup tout ce qui attend l'enseignant. Renvoie le nombre envoyé. */
  function soumettreTout(ficheId) {
    const f = trouver(ficheId)
    if (!f) return 0
    let n = 0
    for (const m of f.modules) {
      if (attendEnseignant(m)) { m.statut = 'soumis'; m.motif = ''; n++ }
    }
    if (n) _touche(f)
    return n
  }

  function validerModule(ficheId, moduleId) {
    const m = trouverModule(ficheId, moduleId)
    if (!m) return false
    m.statut = 'valide'
    m.motif = ''
    m.valideLe = new Date().toISOString()
    m.validePar = _qui()
    _touche(trouver(ficheId))
    return true
  }

  /** Valide en lot tout ce qui est en attente. Renvoie le nombre validé. */
  function validerTout(ficheId) {
    const f = trouver(ficheId)
    if (!f) return 0
    const qui = _qui()
    const quand = new Date().toISOString()
    let n = 0
    for (const m of f.modules) {
      if (attendDirection(m)) {
        m.statut = 'valide'; m.motif = ''; m.valideLe = quand; m.validePar = qui; n++
      }
    }
    if (n) _touche(f)
    return n
  }

  /**
   * Refuse un module, ou demande une modification. Le MOTIF est obligatoire dans
   * les deux cas : un refus sans explication n'aide personne et sera subi.
   *   - `refuse`     : le module ne sera pas traité, la discussion est close.
   *   - `a_modifier` : la direction attend une nouvelle version.
   */
  function deciderModule(ficheId, moduleId, decision, motif) {
    if (decision !== 'refuse' && decision !== 'a_modifier') return false
    const m = trouverModule(ficheId, moduleId)
    if (!m || !String(motif || '').trim()) return false
    m.statut = decision
    m.motif = String(motif).trim()
    m.valideLe = ''
    m.validePar = ''
    _touche(trouver(ficheId))
    return true
  }

  /**
   * Coche un module traité.
   * Volontairement SANS changement de statut : rendre compte de l'avancement
   * n'est pas modifier le plan, et confondre les deux ferait retomber la fiche en
   * validation toutes les semaines — l'école cesserait de cocher.
   */
  function marquerFait(ficheId, moduleId, fait) {
    const m = trouverModule(ficheId, moduleId)
    // Un module refusé ne sera pas traité : le cocher n'aurait aucun sens.
    if (!m || m.statut === 'refuse') return
    m.fait = !!fait
    _touche(trouver(ficheId))
  }

/**
 * Modules qui comptent dans l'avancement.
 *
 * ⚠️ Un module REFUSÉ en sort, numérateur ET dénominateur. Décision de Steve :
 * refuser veut dire « on laisse tomber, on propose autre chose ». Le garder au
 * dénominateur ferait baisser l'avancement d'un enseignant à cause d'un module
 * qu'on lui a justement demandé de ne pas traiter.
 */
  function modulesComptes(fiche) {
    return (fiche?.modules || []).filter((m) => m.statut !== 'refuse')
  }

  /** Avancement d'une fiche, en pourcentage de modules traités. */
  function avancement(fiche) {
    const comptes = modulesComptes(fiche)
    if (!comptes.length) return 0
    return Math.round((comptes.filter((m) => m.fait).length / comptes.length) * 100)
  }

  /** Modules en attente de la direction, toutes fiches confondues. */
  const modulesEnAttente = computed(() =>
    fiches.value.reduce((n, f) => n + f.modules.filter(attendDirection).length, 0))

  function demoSeed() {
    // Noms du pays choisi : le cahier de démo nommait ses enseignants en dur.
    const periode = Object.keys(useSchoolStore().schoolSettings?.periods || {})[0] || 'T1'
    const base = { fait: false, motif: '', valideLe: '', validePar: '', details: '' }
    return localiser([
      {
        id: 'pr-demo1', matiere: 'Mathématiques', classe: '6ème A', periode,
        modules: [
          { ...base, id: 'md-d1', titre: 'Nombres entiers et décimaux', objectifs: 'Lire, écrire, comparer et ranger.', details: 'Départ des situations de la vie courante : prix, distances, mesures. Une évaluation courte en fin de module.', semaines: '1-3', fait: true, statut: 'valide', validePar: 'Teussop Michel', valideLe: new Date().toISOString() },
          { ...base, id: 'md-d2', titre: 'Fractions', objectifs: 'Représenter, comparer, additionner à même dénominateur.', details: 'Support : bandes de papier et disques fractionnaires. Les dénominateurs différents sont reportés au trimestre suivant.', semaines: '4-6', statut: 'soumis' },
          { ...base, id: 'md-d3', titre: 'Figures usuelles', objectifs: 'Construire et reconnaître les figures de base.', details: '', semaines: '7-9', statut: 'brouillon' },
        ],
        auteurId: 'demo-enseignant', auteurNom: 'Jean Kamga',
        creeLe: new Date().toISOString(), majLe: new Date().toISOString(),
      },
      {
        id: 'pr-demo2', matiere: 'Français', classe: '6ème A', periode,
        modules: [
          { ...base, id: 'md-d4', titre: 'Types et formes de phrases', objectifs: 'Identifier et transformer.', semaines: '1-2', fait: true, statut: 'valide', validePar: 'Teussop Michel', valideLe: new Date().toISOString() },
          { ...base, id: 'md-d5', titre: 'Le récit', objectifs: 'Comprendre la structure d’un récit court.', details: 'Deux textes au programme, lecture suivie puis production écrite.', semaines: '3-6', statut: 'a_modifier', motif: 'Prévoir une séance de plus sur la production écrite.' },
        ],
        auteurId: '', auteurNom: 'Claire Ngo',
        creeLe: new Date().toISOString(), majLe: new Date().toISOString(),
      },
    ])
  }

  return {
    fiches, loaded, modulesEnAttente,
    load, save, trouver, trouverModule, ouvrirFiche,
    ajouterModule, modifierModule, retirerModule, deplacerModule,
    soumettreModule, soumettreTout, validerModule, validerTout, deciderModule,
    marquerFait, avancement, modulesComptes,
  }
})
