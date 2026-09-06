/**
 * schoolDirectory.js
 * ------------------
 * Publie un profil école agrégé dans la collection Firestore "school_directory".
 * Ce document est lisible par NOVA (et toute autre app partenaire) pour
 * auto-remplir le formulaire ADN sans re-saisie.
 *
 * Le document est indexé par le slug de l'école (schoolName normalisé)
 * ET par l'UID du propriétaire, ce qui permet une recherche par nom ou par ID.
 *
 * Structure Firestore :
 *   school_directory/{slug}  →  { ...schoolProfile }
 */

import { db, auth } from '../firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

/**
 * Génère un slug URL-safe à partir du nom d'école
 * Ex: "Collège Privé EDUFREM" → "college-prive-edufrem"
 */
export function slugify(name) {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // supprime accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')       // remplace non-alphanum par tiret
    .replace(/^-|-$/g, '')             // supprime tirets début/fin
}

/**
 * Mappe le schoolType MAPO vers le type NOVA
 *   MAPO: college_prive, lycee_public, lycee_prive, college_public, ...
 *   NOVA: public, prive_laic, prive_confessionnel, communautaire
 */
function mapSchoolType(mapoType) {
  if (!mapoType) return ''
  if (mapoType.includes('public')) return 'public'
  if (mapoType.includes('prive') || mapoType.includes('privé')) return 'prive_laic'
  return ''
}

/**
 * Mappe le code pays MAPO (CM, SN, CI) vers le nom complet
 */
function mapCountry(code) {
  const map = { CM: 'Cameroun', SN: 'Sénégal', CI: "Côte d'Ivoire" }
  return map[code] || code || ''
}

/**
 * Déduit les niveaux offerts à partir de la liste des classes
 * Retourne un objet { '6e': true, '5e': true, ... } compatible avec NOVA
 */
function extractLevelsFromClasses(classes) {
  const levels = {}
  const levelMap = {
    '6e': '6e', '6ème': '6e', '6eme': '6e',
    '5e': '5e', '5ème': '5e', '5eme': '5e',
    '4e': '4e', '4ème': '4e', '4eme': '4e',
    '3e': '3e', '3ème': '3e', '3eme': '3e',
    '2nde': '2nde',
    '1ere': '1ere', '1ère': '1ere',
    'tle': 'Tle', 'terminale': 'Tle',
  }

  for (const cls of classes) {
    const name = (cls.name || cls.level || '').toLowerCase()
    for (const [key, val] of Object.entries(levelMap)) {
      if (name.includes(key)) {
        levels[val] = true
        break
      }
    }
  }
  return levels
}

/**
 * Déduit la langue d'enseignement et le SYSTÈME de l'établissement.
 *
 * Vocabulaire unifié le 06/09/2026 : « système » partout, au lieu de
 * « sous-système » ici et de rien ailleurs. Trois endroits portaient ou allaient
 * porter la même notion (l'annuaire public, les examens de fin de primaire, et
 * le rattachement des niveaux et des personnels d'une école bilingue) ; deux
 * mots pour une idée, c'est un mot de trop.
 *
 * ⚠️ `bilingue` n'existe qu'ICI. Un établissement peut faire les deux ; un
 * niveau ou un enseignant appartient à l'un ou à l'autre.
 */
function mapLanguage(lang) {
  if (lang === 'fr') return { langues: ['Français'], systeme: 'francophone' }
  if (lang === 'en') return { langues: ['English'], systeme: 'anglophone' }
  return { langues: ['Français', 'English'], systeme: 'bilingue' }
}

/**
 * Calcule les séries/filières à partir des classes de 1ère et Tle
 */
function extractSeries(classes) {
  const series = new Set()
  for (const cls of classes) {
    if (cls.serie) series.add(cls.serie)
  }
  const serieLabels = {
    A: 'Série A (Littéraire)',
    B: 'Série B (Économique)',
    C: 'Série C (Mathématiques)',
    D: 'Série D (Sciences biologiques)',
    E: 'Série E (Sciences techniques)',
    F: 'Série F (Technique)',
    G: 'Série G (Gestion)',
  }
  return [...series].map(s => serieLabels[s] || `Série ${s}`)
}

/**
 * Construit le profil complet de l'école pour la collection school_directory.
 * Prend les stores Pinia en paramètre (pour éviter les imports circulaires).
 *
 * @param {Object} params
 * @param {Object} params.schoolSettings - schoolStore.schoolSettings
 * @param {Array}  params.eleves        - elevesStore.eleves
 * @param {Array}  params.staff         - personnelStore.staff
 * @param {Array}  params.classes       - classesStore.classes
 * @param {Object} params.globalStats   - facturationStore.globalStats
 * @param {Array}  params.feeStructure  - facturationStore.feeStructure
 */
export function buildSchoolProfile({ schoolSettings, eleves, staff, classes, globalStats, feeStructure }) {
  const s = schoolSettings || {}
  const allEleves = eleves || []
  const allStaff = staff || []
  const allClasses = classes || []
  const stats = globalStats || {}
  const fees = feeStructure || []

  // ── Effectifs élèves ──
  const inscrits = allEleves.filter(e => e.status === 'inscrit')
  const totalEleves = inscrits.length
  const filles = inscrits.filter(e => e.gender === 'F').length
  const garcons = inscrits.filter(e => e.gender === 'M').length
  const abandons = allEleves.filter(e => e.status === 'abandon').length
  const redoublants = inscrits.filter(e => e.redoublant === true).length
  const handicapEleves = inscrits.filter(e => e.handicap === true).length
  const boursiers = inscrits.filter(e => e.boursier === true).length
  const vulnerables = inscrits.filter(e => e.vulnerabilities && e.vulnerabilities.length > 0).length

  // Âge moyen (approximatif)
  let ageMoyenne = null
  const now = new Date()
  const ages = inscrits
    .map(e => e.dateOfBirth ? (now.getFullYear() - new Date(e.dateOfBirth).getFullYear()) : null)
    .filter(a => a !== null && a > 0)
  if (ages.length > 0) {
    ageMoyenne = Math.round((ages.reduce((s, a) => s + a, 0) / ages.length) * 10) / 10
  }

  // ── Effectifs personnel ──
  const enseignants = allStaff.filter(m => m.category === 'enseignement')
  const adminStaff = allStaff.filter(m => m.category === 'administration')
  const supportStaff = allStaff.filter(m => m.category === 'support')
  const enseignantsFemmes = enseignants.filter(m => m.gender === 'F').length
  const enseignantsQualifies = enseignants.filter(m => m.qualification && !['autre', 'baccalaureat'].includes(m.qualification)).length
  const vacataires = allStaff.filter(m => m.contractType === 'vacataire').length
  const staffHandicap = allStaff.filter(m => m.handicap === true).length

  // Expérience moyenne des enseignants
  const ensExp = enseignants.filter(m => m.experienceYears > 0)
  const experienceMoyenne = ensExp.length > 0
    ? Math.round((ensExp.reduce((s, m) => s + m.experienceYears, 0) / ensExp.length) * 10) / 10
    : null

  // ── Niveaux & Séries ──
  const levelsOffered = extractLevelsFromClasses(allClasses)
  const series = extractSeries(allClasses)
  const { langues, systeme } = mapLanguage(s.language)

  // ── Finances ──
  // Frais moyen de scolarité (fee type "scolarite" seulement)
  const scolariteFees = fees.filter(f => f.feeType === 'scolarite')
  const fraisScolariteMoyen = scolariteFees.length > 0
    ? Math.round(scolariteFees.reduce((sum, f) => sum + (f.amount || 0), 0) / scolariteFees.length)
    : null

  // ── Salles de classe ──
  const sallesClasse = allClasses.length
  const placesAssises = allClasses.reduce((sum, c) => sum + (c.capacity || 0), 0)

  // ── Profil final ──
  return {
    // Métadonnées
    source: 'mapo',
    ownerUid: auth.currentUser?.uid || null,
    updatedAt: null, // sera remplacé par serverTimestamp()
    academicYear: s.academicYear || '',

    // Tab 1 — Identité
    identite: {
      nom: s.schoolName || '',
      sigle: s.acronym || '',
      typeEtablissement: mapSchoolType(s.schoolType),
      typeOriginal: s.schoolType || '',
      statutJuridique: '',       // pas dans MAPO
      codeMinisteriel: '',       // pas dans MAPO
      anneeCreation: '',         // pas dans MAPO
      pays: mapCountry(s.country),
      paysCode: s.country || '',
      region: '',                // pas dans MAPO
      ville: s.city || '',
      quartier: s.address || '',
      adresseBP: '',
      typeZone: '',              // pas dans MAPO
      telephone: s.phone || '',
      email: s.email || '',
      website: s.website || '',
      niveauxOfferts: levelsOffered,
      langues,
      systeme,
      // ⚠️ ANCIEN NOM, CONSERVÉ EXPRÈS. Ce document n'est pas à nous seuls : NOVA
      // et les applications partenaires le lisent pour pré-remplir leur
      // formulaire ADN, avec la copie de `mapo-bridge.js` qu'elles ont déployée,
      // pas celle de ce dépôt. Publier `systeme` seul viderait leur champ en
      // silence. On écrit donc les deux le temps que NOVA bascule.
      // À retirer une fois `mapo-bridge.js` redéployé côté NOVA — et pas avant.
      sousSysteme: systeme,
      filieres: series,
      horairesCours: '',         // pas dans MAPO
    },

    // Tab 2 — Effectifs
    effectifs: {
      eleves: {
        total: totalEleves,
        filles,
        garcons,
        handicap: handicapEleves,
        redoublants,
        boursiers,
        vulnerables,
        orphelins: inscrits.filter(e => (e.vulnerabilities || []).includes('orphelin')).length || null,
        ageMoyen: ageMoyenne,
      },
      enseignants: {
        total: enseignants.length,
        femmes: enseignantsFemmes,
        qualifies: enseignantsQualifies,
        vacataires,
        experienceMoyenne,
        handicap: staffHandicap,
        partis: null,
        turnover: null,
      },
      admin: {
        administratif: adminStaff.length,
        appui: supportStaff.length,
        conseillerOrientation: null,
        personnelSante: null,
      },
    },

    // Tab 3 — Infrastructure (partiel — on ne peut remplir que salles & places)
    infrastructure: {
      sallesClasse,
      placesAssises,
      etatBatiments: '',
      nombreBatiments: null,
      bureauxAdmin: null,
      electricite: null,
      eauPotable: null,
      internet: null,
      toilettes: null,
      toilettesFilles: null,
      etatToilettes: '',
      equipements: {},  // checkboxes vides
      ordinateurs: null,
      videoprojecteurs: null,
    },

    // Tab 4 — Finances & Gouvernance
    finances: {
      fraisScolarite: fraisScolariteMoyen,
      budgetAnnuel: null,             // pas dans MAPO
      montantAttendu: stats.totalExpected || null,
      montantRecouvre: stats.totalCollected || null,
      tauxRecouvrement: stats.collectionRate || null,
      dernierAudit: '',
      sourcesFinancement: {},
    },
    gouvernance: {
      ape: null,
      conseilEtablissement: null,
      planDeveloppement: null,
      reglementInterieur: null,
    },
    resultats: {
      candidatsExamen: null,
      admis: null,
      tauxReussite: null,
      inscritsDebutAnnee: totalEleves,
      abandons,
      tauxAbandon: totalEleves > 0 ? Math.round((abandons / totalEleves) * 100 * 10) / 10 : 0,
    },
  }
}

/**
 * Publie le profil dans Firestore → school_directory/{slug}
 * Appelé automatiquement quand les paramètres école sont sauvegardés.
 */
export async function publishSchoolDirectory(storeData) {
  if (!auth.currentUser) return

  const profile = buildSchoolProfile(storeData)
  const slug = slugify(storeData.schoolSettings?.schoolName)
  if (!slug) return

  profile.updatedAt = serverTimestamp()

  try {
    // Document principal indexé par slug (recherche par nom)
    await setDoc(doc(db, 'school_directory', slug), profile, { merge: true })

    // Index secondaire par UID (recherche par propriétaire)
    await setDoc(doc(db, 'school_directory_by_uid', auth.currentUser.uid), {
      slug,
      schoolName: storeData.schoolSettings?.schoolName || '',
      updatedAt: serverTimestamp(),
    }, { merge: true })

    console.log(`[schoolDirectory] Published profile for "${slug}"`)
  } catch (error) {
    console.error('[schoolDirectory] Error publishing:', error)
  }
}
