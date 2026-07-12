import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import * as supSync from '../utils/supSync'

// ── Persistance localStorage (cache local, source en mode démo) ──
// Les entités mutables (étudiants, intervenants, UE, stages, inscriptions,
// notes, salles) sont hydratées depuis localStorage si présent, sinon
// générées (mode démo) ou laissées vides (mode école : remplies par le
// pull Firestore via supSync). Chaque mutation est persistée + poussée
// vers Firestore en mode école.
export const SUP_VERSION = '2'
function loadEntity(key, fallback) {
  try {
    const raw = localStorage.getItem(`sup_${key}_v${SUP_VERSION}`)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* silent */ }
  // Mode école : pas de génération démo. Le pull Firestore remplira.
  if (supSync.isSchoolMode()) return Array.isArray(fallback) ? [] : (typeof fallback === 'object' ? {} : fallback)
  return fallback
}
function saveEntity(key, value) {
  try {
    localStorage.setItem(`sup_${key}_v${SUP_VERSION}`, JSON.stringify(value))
  } catch (e) { /* silent */ }
}

// En mode école, on saute l'évaluation des générateurs démo (qui peuvent
// crasher car ils s'appuient sur des collections vides). Le pull Firestore
// remplira les reactive plus tard via initSchoolSync.
const IS_SCHOOL_MODE = supSync.isSchoolMode()
/**
 * Sauve un tableau localement + push le doc affecté vers Firestore
 * (fire-and-forget en mode école, no-op en mode démo).
 */
function saveOne(key, list, docId, docData) {
  saveEntity(key, list)
  if (docId != null) supSync.pushDoc(`sup_${key}`, docId, docData)
}
function deleteOne(key, list, docId) {
  saveEntity(key, list)
  if (docId != null) supSync.deleteDoc(`sup_${key}`, docId)
}

/**
 * Store "superieur" de MAPO
 * -------------------------
 * Alimente la démonstration de l'édition Enseignement Supérieur.
 * Établissement de démonstration : une université africaine au système LMD
 * (Licence / Master / Doctorat), tel que pratiqué au Cameroun / dans la zone
 * CEMAC (semestres, unités d'enseignement, crédits, mentions sur 20).
 *
 * Les données sont générées de façon DÉTERMINISTE (graine fixe) :
 * les chiffres sont stables d'un chargement à l'autre — indispensable
 * pour une démonstration. Données fictives, ne représentent personne.
 */

// ── Établissement de démonstration ──
export const ECOLE = {
  nom: 'Institut Supérieur EDUFREM',
  sigle: 'ISE',
  type: 'Enseignement supérieur : BTS, Licence, Master',
  anneeAcademique: '2025 — 2026',
}

// ── Programmes et promotions ──
// ── Campus (le groupe est multi-campus, comme Pigier : Douala siège, Yaoundé, Maroua) ──
export const CAMPUS = [
  { id: 'douala', nom: 'Campus de Douala', ville: 'Douala', siege: true, directeur: 'Dr Fabrice NDONKO' },
  { id: 'yaounde', nom: 'Campus de Yaoundé', ville: 'Yaoundé', directeur: 'Mme Chantal OWONA' },
  { id: 'maroua', nom: 'Campus de Maroua', ville: 'Maroua', directeur: 'M. Aboubakar BELLO' },
]
// Répartition pondérée des effectifs (Douala, le siège, est le plus gros campus).
const CAMPUS_POOL = ['douala', 'douala', 'douala', 'douala', 'yaounde', 'yaounde', 'yaounde', 'maroua', 'maroua', 'maroua']

export const PROGRAMMES = [
  // ── Pôle Management & Commerce ──
  {
    id: 'bts-mco',
    nom: 'BTS Management Commercial Opérationnel',
    niveau: 'BTS',
    domaine: 'gestion',
    faculte: 'Management & Commerce',
    dureeAns: 2,
    ectsTotal: 120,
    annees: [
      { id: 'btsmco1', nom: 'BTS 1', rang: 1, semestres: ['S1', 'S2'] },
      { id: 'btsmco2', nom: 'BTS 2', rang: 2, semestres: ['S3', 'S4'] },
    ],
  },
  {
    id: 'lic-mgt',
    nom: 'Licence Management & Stratégie',
    niveau: 'Licence',
    domaine: 'gestion',
    faculte: 'Management & Commerce',
    dureeAns: 3,
    ectsTotal: 180,
    annees: [
      { id: 'lmgt1', nom: 'Licence 1', rang: 1, semestres: ['S1', 'S2'] },
      { id: 'lmgt2', nom: 'Licence 2', rang: 2, semestres: ['S3', 'S4'] },
      { id: 'lmgt3', nom: 'Licence 3', rang: 3, semestres: ['S5', 'S6'] },
    ],
  },
  {
    id: 'mas-mgt',
    nom: 'Master Management & Stratégie',
    niveau: 'Master',
    domaine: 'gestion',
    faculte: 'Management & Commerce',
    dureeAns: 2,
    ectsTotal: 120,
    annees: [
      { id: 'mmgt1', nom: 'Master 1', rang: 1, semestres: ['S7', 'S8'] },
      { id: 'mmgt2', nom: 'Master 2', rang: 2, semestres: ['S9', 'S10'] },
    ],
  },
  // ── Pôle Finance, Comptabilité & Gestion ──
  {
    id: 'bts-cg',
    nom: 'BTS Comptabilité & Gestion',
    niveau: 'BTS',
    domaine: 'gestion',
    faculte: 'Finance & Comptabilité',
    dureeAns: 2,
    ectsTotal: 120,
    annees: [
      { id: 'btscg1', nom: 'BTS 1', rang: 1, semestres: ['S1', 'S2'] },
      { id: 'btscg2', nom: 'BTS 2', rang: 2, semestres: ['S3', 'S4'] },
    ],
  },
  {
    id: 'lic-fc',
    nom: 'Licence Finance-Comptabilité',
    niveau: 'Licence',
    domaine: 'gestion',
    faculte: 'Finance & Comptabilité',
    dureeAns: 3,
    ectsTotal: 180,
    annees: [
      { id: 'lfc1', nom: 'Licence 1', rang: 1, semestres: ['S1', 'S2'] },
      { id: 'lfc2', nom: 'Licence 2', rang: 2, semestres: ['S3', 'S4'] },
      { id: 'lfc3', nom: 'Licence 3', rang: 3, semestres: ['S5', 'S6'] },
    ],
  },
  {
    id: 'mas-fc',
    nom: 'Master Finance & Contrôle de Gestion',
    niveau: 'Master',
    domaine: 'gestion',
    faculte: 'Finance & Comptabilité',
    dureeAns: 2,
    ectsTotal: 120,
    annees: [
      { id: 'mfc1', nom: 'Master 1', rang: 1, semestres: ['S7', 'S8'] },
      { id: 'mfc2', nom: 'Master 2', rang: 2, semestres: ['S9', 'S10'] },
    ],
  },
  // ── Pôle Communication & Marketing ──
  {
    id: 'lic-com',
    nom: 'Licence Communication & Marketing Digital',
    niveau: 'Licence',
    domaine: 'gestion',
    faculte: 'Communication & Marketing',
    dureeAns: 3,
    ectsTotal: 180,
    annees: [
      { id: 'lcom1', nom: 'Licence 1', rang: 1, semestres: ['S1', 'S2'] },
      { id: 'lcom2', nom: 'Licence 2', rang: 2, semestres: ['S3', 'S4'] },
      { id: 'lcom3', nom: 'Licence 3', rang: 3, semestres: ['S5', 'S6'] },
    ],
  },
]

// Liste à plat des promotions (programme + année)
export const PROMOTIONS = PROGRAMMES.flatMap((p) =>
  p.annees.map((a) => ({
    id: `${p.id}__${a.id}`,
    programmeId: p.id,
    programmeNom: p.nom,
    niveau: p.niveau,
    domaine: p.domaine,
    faculte: p.faculte,
    anneeId: a.id,
    anneeNom: a.nom,
    rang: a.rang,
    semestres: a.semestres,
    // Semestre "en cours" pour la démo (nous sommes au 2e semestre de l'année)
    semestreCourant: a.semestres[1],
  }))
)

// ── Types d'unités d'enseignement ──
export const UE_TYPES = {
  fondamentale: { key: 'fondamentale', label: 'Fondamentale' },
  methodologique: { key: 'methodologique', label: 'Méthodologique' },
  professionnelle: { key: 'professionnelle', label: 'Professionnelle' },
  electif: { key: 'electif', label: 'Électif' },
}

// ── Générateur pseudo-aléatoire déterministe ──
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20252026)
const rand = (min, max) => min + rng() * (max - min)
const randInt = (min, max) => Math.floor(rand(min, max + 1))
const pick = (arr) => arr[Math.floor(rng() * arr.length)]
const chance = (p) => rng() < p

// ── Pools de données ──
// ── Noms camerounais, par grande région ──
// L'établissement est multi-campus (Douala siège, Yaoundé, Maroua). On couple les
// prénoms/noms au campus : Maroua (Grand Nord) = noms peul/foulbé/musulmans en
// majorité ; Douala/Yaoundé (Sud) = noms béti, bassa, bamiléké, sawa. Avec un
// brassage réaliste (les étudiants circulent d'une région à l'autre).
const NORD_PRENOMS = [
  'Amadou', 'Aliou', 'Ousmane', 'Ibrahim', 'Bouba', 'Hamadou', 'Oumarou', 'Abdoulaye', 'Sadou', 'Moussa',
  'Aboubakar', 'Yacouba', 'Souaïbou', 'Djibril', 'Adamou', 'Saïdou', 'Issa', 'Nassourou', 'Haman', 'Bello',
  'Fadimatou', 'Aïssatou', 'Halimatou', 'Aminatou', 'Djamila', 'Habiba', 'Maïmouna', 'Ramatou', 'Zara', 'Hadidja',
  'Roukayatou', 'Balkissou', 'Mairama', 'Hawaou', 'Rakiatou', 'Djaïli', 'Farida', 'Nafissatou', 'Oumou', 'Asta',
]
const NORD_NOMS = [
  'Bello', 'Bakary', 'Aboubakar', 'Hamadou', 'Oumarou', 'Alhadji', 'Moustapha', 'Abba', 'Mahamat', 'Djibrilla',
  'Saïdou', 'Sali', 'Yaya', 'Haman', 'Amadou', 'Modibbo', 'Bouba', 'Wakil', 'Nassourou', 'Ousmanou',
]
const SUD_PRENOMS = [
  'Jean', 'Paul', 'Emmanuel', 'Serge', 'Landry', 'Hervé', 'Rodrigue', 'Aimé', 'Christian', 'Franck',
  'Cédric', 'Ghislain', 'Boris', 'Armand', 'Achille', 'Brice', 'William', 'Guy', 'Yannick', 'Éric',
  'Marie', 'Chantal', 'Solange', 'Nadège', 'Estelle', 'Carine', 'Larissa', 'Sandrine', 'Rosine', 'Yolande',
  'Gaëlle', 'Danielle', 'Flore', 'Mireille', 'Grâce', 'Laure', 'Michelle', 'Prudence', 'Vanessa', 'Sylvie',
]
const SUD_NOMS = [
  'Nkoulou', 'Mballa', 'Owona', 'Atangana', 'Ngono', 'Onana', 'Essomba', 'Ewane', 'Njoya', 'Kamga',
  'Fotso', 'Kenfack', 'Tagne', 'Nana', 'Djoumessi', 'Tchakounté', 'Ndongo', 'Manga', 'Etoundi', 'Abena',
  'Zoa', 'Ondoua', 'Mvondo', 'Ateba', 'Mengue', 'Belinga', 'Amougou', 'Fongang', 'Njie', 'Eyenga',
]
// Pools fusionnés (usage générique : tuteurs de stage, etc.)
const PRENOMS = [...NORD_PRENOMS, ...SUD_PRENOMS]
const NOMS = [...NORD_NOMS, ...SUD_NOMS]

// Villes d'origine par région
const VILLES_NORD = ['Maroua', 'Garoua', 'Ngaoundéré', 'Kousséri', 'Mokolo', 'Guider', 'Kaélé', 'Yagoua', 'Meiganga']
const VILLES_SUD = ['Yaoundé', 'Douala', 'Bafoussam', 'Bamenda', 'Dschang', 'Ébolowa', 'Bertoua', 'Kribi', 'Édéa', 'Nkongsamba']
const VILLES_ENS = [...VILLES_NORD, ...VILLES_SUD]

// Région dominante de chaque campus + tirage couplé prénom/nom/ville
const REGION_BY_CAMPUS = { maroua: 'nord', douala: 'sud', yaounde: 'sud' }
function personneCampus(campusId) {
  const region = REGION_BY_CAMPUS[campusId] || 'sud'
  const useNord = region === 'nord' ? chance(0.8) : chance(0.15)
  return { prenom: pick(useNord ? NORD_PRENOMS : SUD_PRENOMS), nom: pick(useNord ? NORD_NOMS : SUD_NOMS) }
}
function villeCampus(campusId) {
  const region = REGION_BY_CAMPUS[campusId] || 'sud'
  return region === 'nord' ? pick(VILLES_NORD) : pick(VILLES_SUD)
}
// Corps enseignant national : représentation du Nord (~35 %) sans exclusivité.
function personneMix() {
  const useNord = chance(0.35)
  return { prenom: pick(useNord ? NORD_PRENOMS : SUD_PRENOMS), nom: pick(useNord ? NORD_NOMS : SUD_NOMS) }
}

// Entreprises d'accueil de stages / alternance — mix grands comptes France
// et Afrique francophone (le profil des écoles de management cibles).
// Entreprises d'accueil — tissu économique camerounais, avec de forts
// employeurs du Grand Nord (SODECOTON, SEMRY, Maïscam, CICAM) cohérents avec Maroua.
const ENTREPRISES = [
  'SODECOTON', 'SEMRY', 'Maïscam', 'CICAM', 'Cimencam', 'Brasseries du Cameroun',
  'Guinness Cameroon', 'Chococam', 'MTN Cameroon', 'Orange Cameroun',
  'Camtel', 'Nexttel', 'Afriland First Bank', 'BICEC', 'Société Générale Cameroun',
  'Ecobank Cameroun', 'UBA Cameroun', 'CCA Bank', 'Express Union', 'La Régionale',
  'Total Energies Cameroun', 'Tradex', 'ENEO Cameroon', 'CAMWATER', 'Dovv Supermarché',
]
const VILLES_STAGES = ['Maroua', 'Garoua', 'Ngaoundéré', 'Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Bertoua', 'Kribi', 'Ébolowa', 'Yagoua']

// Catalogue d'UE par DOMAINE puis par type (l'université est multi-facultés :
// Gestion, Droit, et une École doctorale en recherche).
const UE_POOL_BY_DOMAINE = {
  gestion: {
    fondamentale: [
      'Fondamentaux du management', 'Théorie des organisations', 'Microéconomie', 'Macroéconomie',
      'Comptabilité générale', 'Marketing fondamental', 'Droit des affaires', 'Management stratégique',
      'Finance d\'entreprise', 'Gouvernance d\'entreprise', 'Économie internationale', 'Analyse financière',
    ],
    methodologique: [
      'Statistiques appliquées', 'Méthodes quantitatives', 'Systèmes d\'information', 'Anglais des affaires',
      'Communication professionnelle', 'Excel & analyse de données', 'Gestion de projet', 'Méthodologie de recherche',
    ],
    professionnelle: [
      'Projet professionnel', 'Stage en entreprise', 'Mission de conseil', 'Séminaire métiers',
      'Soft skills & leadership', 'Mémoire de recherche', 'Business game', 'Conduite du changement',
    ],
    electif: [
      'Entrepreneuriat & création', 'RSE & développement durable', 'Management interculturel',
      'Négociation commerciale', 'Supply chain management', 'Marketing digital', 'Finance de marché',
      'Transformation digitale', 'Économie sociale et solidaire', 'Data marketing',
    ],
  },
  droit: {
    fondamentale: [
      'Introduction au droit', 'Droit civil', 'Droit constitutionnel', 'Droit pénal général',
      'Droit administratif', 'Droit des obligations', 'Droit commercial', 'Droit des sociétés',
      'Droit du travail', 'Droit international public', 'Procédure civile', 'Droit fiscal',
    ],
    methodologique: [
      'Méthodologie juridique', 'Recherche documentaire juridique', 'Anglais juridique',
      'Expression écrite et orale', 'Informatique juridique', 'Méthodes du cas pratique',
    ],
    professionnelle: [
      'Stage en cabinet', 'Clinique juridique', 'Plaidoirie & art oratoire',
      'Rédaction d\'actes juridiques', 'Séminaire métiers du droit', 'Mémoire de recherche',
    ],
    electif: [
      'Droit des affaires OHADA', 'Droit de l\'environnement', 'Droit du numérique',
      'Propriété intellectuelle', 'Droit bancaire', 'Contentieux des affaires',
      'Arbitrage & médiation', 'Droit des assurances',
    ],
  },
  doctorat: {
    fondamentale: [
      'Épistémologie et théories', 'État de l\'art du domaine', 'Séminaire de recherche thématique',
      'Cadres conceptuels avancés',
    ],
    methodologique: [
      'Méthodologie de la recherche', 'Méthodes quantitatives avancées', 'Méthodes qualitatives',
      'Statistiques pour la recherche', 'Rédaction scientifique',
    ],
    professionnelle: [
      'Séminaire doctoral', 'Encadrement de thèse', 'Publication scientifique',
      'Communication en colloque', 'Éthique de la recherche', 'Valorisation de la recherche',
    ],
    electif: [
      'Pédagogie universitaire', 'Veille scientifique internationale',
      'Montage de projet de recherche', 'Vulgarisation scientifique',
    ],
  },
}

const SPECIALITES = [
  'Stratégie', 'Marketing', 'Finance', 'Comptabilité-contrôle', 'Droit des affaires', 'Économie',
  'Systèmes d\'information', 'Langues', 'Entrepreneuriat', 'Ressources humaines', 'Communication',
]
const SALLES_POOL_EDT = ['Amphi A', 'Amphi B', 'Salle 101', 'Salle 102', 'Salle 204', 'Salle 205', 'Salle informatique', 'Salle projet']
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const CRENEAUX = [
  { debut: '08:00', fin: '10:00' },
  { debut: '10:15', fin: '12:15' },
  { debut: '14:00', fin: '16:00' },
  { debut: '16:15', fin: '18:15' },
]

const fullName = () => `${pick(PRENOMS)} ${pick(NOMS)}`

// ── Génération des intervenants ──
function generateIntervenants() {
  const list = []
  for (let i = 0; i < 32; i++) {
    const { prenom, nom } = personneMix()
    const vacataire = chance(0.45)
    list.push({
      id: `int-${String(i + 1).padStart(3, '0')}`,
      prenom,
      nom,
      nomComplet: `${prenom} ${nom}`,
      statut: vacataire ? 'vacataire' : 'permanent',
      specialite: pick(SPECIALITES),
      coutHoraire: vacataire ? randInt(8000, 20000) : null,
    })
  }
  return list
}
const INTERVENANTS = reactive(loadEntity('intervenants', IS_SCHOOL_MODE ? [] : generateIntervenants()))

// Responsable de chaque formation (programmeId → intervenantId).
// Initialisation : on désigne les deux premiers intervenants permanents.
function initialResponsables() {
  const permanents = INTERVENANTS.filter((i) => i.statut === 'permanent')
  const pickId = (idx) => permanents[idx % Math.max(permanents.length, 1)]?.id || INTERVENANTS[idx % Math.max(INTERVENANTS.length, 1)]?.id || null
  const map = {}
  PROGRAMMES.forEach((p, idx) => { map[p.id] = pickId(idx) })
  return map
}
const PROGRAMME_RESPONSABLES = reactive(loadEntity('prog_responsables', IS_SCHOOL_MODE ? {} : initialResponsables()))

// ── Génération de l'offre de formation (UE) ──
function generateUE() {
  const list = []
  let counter = 1

  for (const prog of PROGRAMMES) {
    const pool = UE_POOL_BY_DOMAINE[prog.domaine] || UE_POOL_BY_DOMAINE.gestion
    for (const annee of prog.annees) {
      annee.semestres.forEach((sem, semIndex) => {
        // Progression : les premiers semestres sont plus "fondamentaux",
        // les derniers plus "professionnels" et ouverts aux électifs.
        const niveauAvancement = (annee.rang - 1) * 2 + semIndex // 0 → 9
        let ectsRestants = 30
        let electifsPlaces = 0
        const maxElectifs = niveauAvancement >= 3 ? 2 : niveauAvancement >= 1 ? 1 : 0
        const usedTitles = new Set()

        while (ectsRestants > 0) {
          // Choix du type d'UE
          let type
          const r = rng()
          if (electifsPlaces < maxElectifs && r < 0.22) {
            type = 'electif'
          } else if (niveauAvancement <= 2) {
            type = r < 0.62 ? 'fondamentale' : 'methodologique'
          } else if (niveauAvancement <= 5) {
            type = r < 0.42 ? 'fondamentale' : r < 0.72 ? 'methodologique' : 'professionnelle'
          } else {
            type = r < 0.35 ? 'fondamentale' : r < 0.6 ? 'methodologique' : 'professionnelle'
          }

          // Crédits ECTS de l'UE
          let ects = type === 'electif' ? randInt(2, 4) : randInt(3, 6)
          if (ects > ectsRestants) ects = ectsRestants
          if (ectsRestants - ects > 0 && ectsRestants - ects < 2) ects = ectsRestants

          // Intitulé non répété dans le semestre
          let intitule = pick(pool[type])
          let guard = 0
          while (usedTitles.has(intitule) && guard < 12) {
            intitule = pick(pool[type])
            guard++
          }
          usedTitles.add(intitule)

          const intervenant = pick(INTERVENANTS)
          const codePrefix = { fondamentale: 'FND', methodologique: 'MET', professionnelle: 'PRO', electif: 'ELE' }[type]

          list.push({
            id: `ue-${String(counter).padStart(3, '0')}`,
            code: `${codePrefix}-${String(counter).padStart(3, '0')}`,
            intitule,
            type,
            electif: type === 'electif',
            ects,
            volumeHoraire: Math.round(ects * rand(7, 9)),
            programmeId: prog.id,
            programmeNom: prog.nom,
            anneeId: annee.id,
            anneeNom: annee.nom,
            promotionId: `${prog.id}__${annee.id}`,
            semestre: sem,
            intervenantId: intervenant.id,
            intervenantNom: intervenant.nomComplet,
          })

          if (type === 'electif') electifsPlaces++
          ectsRestants -= ects
          counter++
        }
      })
    }
  }
  return list
}
const UE = reactive(loadEntity('ue', IS_SCHOOL_MODE ? [] : generateUE()))

// ── Génération des étudiants ──
function generateEtudiants() {
  const list = []
  let counter = 1

  for (const promo of PROMOTIONS) {
    // Les promotions avancées sont un peu moins nombreuses (sélection, abandons)
    const effectif = promo.niveau === 'Doctorat' ? randInt(6, 16) : promo.niveau === 'Master' ? randInt(28, 46) : randInt(38, 64)
    // ECTS attendus à ce stade de l'année (semestre 1 validé, semestre 2 en cours)
    const ectsAnnee = 60
    const ectsAcquisAnneesPrecedentes = (promo.rang - 1) * 60

    for (let i = 0; i < effectif; i++) {
      const campus = pick(CAMPUS_POOL)
      const { prenom, nom } = personneCampus(campus)
      // Profil de réussite de l'étudiant
      const reussite = rand(0, 1)
      // ECTS validés : années précédentes + une partie du semestre 1 de l'année courante
      let ectsSemestre1 = reussite > 0.75 ? 30 : reussite > 0.35 ? randInt(24, 30) : randInt(12, 24)
      const ectsValides = ectsAcquisAnneesPrecedentes + ectsSemestre1
      const ectsRequis = ectsAcquisAnneesPrecedentes + ectsAnnee

      let statut = 'inscrit'
      if (ectsSemestre1 < 24) statut = 'en_difficulte'

      list.push({
        id: `etu-${String(counter).padStart(4, '0')}`,
        matricule: `ISE${promo.rang}${String(counter).padStart(4, '0')}`,
        prenom,
        nom,
        nomComplet: `${nom.toUpperCase()} ${prenom}`,
        programmeId: promo.programmeId,
        programmeNom: promo.programmeNom,
        niveau: promo.niveau,
        promotionId: promo.id,
        anneeNom: promo.anneeNom,
        villeOrigine: villeCampus(campus),
        campus,
        ectsValides,
        ectsRequis,
        moyenne: Math.round((8 + reussite * 9) * 10) / 10,
        statut,
        boursier: chance(0.34),
      })
      counter++
    }
  }
  return list
}
const ETUDIANTS = reactive(loadEntity('etudiants', IS_SCHOOL_MODE ? [] : generateEtudiants()))

// ── Génération de l'emploi du temps (semestre en cours, par promotion) ──
function generateEmploiDuTemps() {
  const sessions = []
  let counter = 1

  for (const promo of PROMOTIONS) {
    // UE du semestre en cours pour cette promotion
    const ueSemestre = UE.filter(
      (u) => u.promotionId === promo.id && u.semestre === promo.semestreCourant
    )
    if (ueSemestre.length === 0) continue

    // Créneaux disponibles (jours × créneaux), on en remplit une partie
    const slots = []
    for (const jour of JOURS) {
      for (const creneau of CRENEAUX) {
        slots.push({ jour, creneau })
      }
    }
    // Mélange déterministe
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[slots[i], slots[j]] = [slots[j], slots[i]]
    }

    const nbSessions = randInt(13, 17)
    for (let i = 0; i < nbSessions && i < slots.length; i++) {
      const ue = ueSemestre[i % ueSemestre.length]
      const slot = slots[i]
      sessions.push({
        id: `ses-${String(counter).padStart(4, '0')}`,
        promotionId: promo.id,
        jour: slot.jour,
        debut: slot.creneau.debut,
        fin: slot.creneau.fin,
        ueCode: ue.code,
        ueIntitule: ue.intitule,
        type: ue.type,
        intervenantNom: ue.intervenantNom,
        salle: pick(SALLES_POOL_EDT),
      })
      counter++
    }
  }
  return sessions
}
const EMPLOI_DU_TEMPS = reactive(loadEntity('edt', IS_SCHOOL_MODE ? [] : generateEmploiDuTemps()))

// ── Génération des inscriptions pédagogiques ──
// Pour le semestre en cours de chaque étudiant : on assigne toutes les UE
// obligatoires + une partie des UE électives, et on en déduit un statut.
function generateInscriptions() {
  const map = {}
  for (const etu of ETUDIANTS) {
    const promo = PROMOTIONS.find((p) => p.id === etu.promotionId)
    if (!promo) continue
    const ueSemestre = UE.filter(
      (u) => u.promotionId === promo.id && u.semestre === promo.semestreCourant
    )
    const obligatoires = ueSemestre.filter((u) => !u.electif)
    const electifsDispo = ueSemestre.filter((u) => u.electif)

    // Choix des électifs : presque tous sauf une fraction qui en oublie un
    const r = rng()
    let electifsChoisis
    if (r < 0.15 && electifsDispo.length > 0) {
      // incomplète : un électif manquant
      electifsChoisis = electifsDispo.slice(0, Math.max(0, electifsDispo.length - 1))
    } else {
      electifsChoisis = electifsDispo
    }

    const ueChoisies = [...obligatoires, ...electifsChoisis]
    const ectsChoisis = ueChoisies.reduce((s, u) => s + u.ects, 0)
    const ectsObligatoires = obligatoires.reduce((s, u) => s + u.ects, 0) +
      electifsDispo.reduce((s, u) => s + u.ects, 0)

    let statut
    if (electifsChoisis.length < electifsDispo.length) statut = 'incomplete'
    else if (rng() < 0.35) statut = 'validee'
    else statut = 'complete'

    map[etu.id] = {
      etudiantId: etu.id,
      promotionId: etu.promotionId,
      semestre: promo.semestreCourant,
      ueChoisies: ueChoisies.map((u) => u.id),
      ueElectivesDispo: electifsDispo.map((u) => u.id),
      ueElectivesChoisies: electifsChoisis.map((u) => u.id),
      ectsChoisis,
      ectsRequis: ectsObligatoires,
      statut,
    }
  }
  return map
}
const INSCRIPTIONS = reactive(loadEntity('inscriptions', IS_SCHOOL_MODE ? {} : generateInscriptions()))

// ── Génération des notes (par étudiant × UE de son semestre en cours) ──
function generateNotes() {
  const map = {}
  for (const etu of ETUDIANTS) {
    const insc = INSCRIPTIONS[etu.id]
    if (!insc) continue
    map[etu.id] = {}
    // Profil de réussite déduit de la moyenne déjà attribuée à l'étudiant
    const baseProfil = (etu.moyenne - 8) / 9 // 0 à 1
    for (const ueId of insc.ueChoisies) {
      // Variance par UE
      const noise = (rng() - 0.5) * 5 // ± 2.5 points
      let note = 8 + baseProfil * 9 + noise
      note = Math.max(0, Math.min(20, note))
      // Arrondi au quart de point
      note = Math.round(note * 4) / 4
      map[etu.id][ueId] = note
    }
  }
  return map
}
const NOTES = reactive(loadEntity('notes', IS_SCHOOL_MODE ? {} : generateNotes()))

// ── Génération des stages et alternances ──
// Cibles : Bachelor 3, Master 1, Master 2 prioritairement.
const STAGE_STATUTS = ['en_cours', 'a_pourvoir', 'soutenance_prevue', 'valide']
function generateStages() {
  const list = []
  let counter = 1
  for (const etu of ETUDIANTS) {
    const promo = PROMOTIONS.find((p) => p.id === etu.promotionId)
    if (!promo) continue
    // Eligible selon le NIVEAU et l'année (robuste aux identifiants de filière) :
    // Master toutes années, dernière année de Licence/BTS quasi tous, Licence 2 = stage court.
    const prog = PROGRAMMES.find((p) => p.id === promo.programmeId)
    const annee = prog?.annees.find((a) => a.id === promo.anneeId)
    const rang = annee?.rang || 1
    const isFinal = rang === (prog?.annees.length || 1)
    let proba = 0
    if (promo.niveau === 'Master') proba = 0.92
    else if (promo.niveau === 'BTS') proba = isFinal ? 0.9 : 0.4
    else if (promo.niveau === 'Licence') proba = isFinal ? 0.9 : (rang === 2 ? 0.3 : 0)
    if (!chance(proba)) continue

    const altEligible = promo.niveau === 'BTS' || (promo.niveau === 'Master' && isFinal)
    const type = altEligible && chance(0.4) ? 'alternance' : 'stage'
    const duree = type === 'alternance' ? randInt(40, 48) : randInt(8, 26)
    const today = new Date(2026, 4, 15) // 15 mai 2026
    const offsetWeeksStart = randInt(-12, 4)
    const start = new Date(today.getTime() + offsetWeeksStart * 7 * 24 * 3600 * 1000)
    const end = new Date(start.getTime() + duree * 7 * 24 * 3600 * 1000)

    let statut
    if (start > today) statut = 'a_pourvoir'
    else if (end < today) statut = chance(0.7) ? 'valide' : 'soutenance_prevue'
    else statut = chance(0.15) ? 'soutenance_prevue' : 'en_cours'

    const noteSoutenance = statut === 'valide' ? Math.round((10 + rng() * 9) * 4) / 4 : null

    list.push({
      id: `stg-${String(counter).padStart(4, '0')}`,
      etudiantId: etu.id,
      etudiantNom: etu.nomComplet,
      matricule: etu.matricule,
      programmeNom: etu.programmeNom,
      anneeNom: etu.anneeNom,
      promotionId: etu.promotionId,
      type,
      entreprise: pick(ENTREPRISES),
      ville: pick(VILLES_STAGES),
      dateDebut: start.toISOString().slice(0, 10),
      dateFin: end.toISOString().slice(0, 10),
      dureeSemaines: duree,
      tuteurEntreprise: fullName(),
      tuteurEcole: fullName(),
      statut,
      noteSoutenance,
    })
    counter++
  }
  return list
}
const STAGES = reactive(loadEntity('stages', IS_SCHOOL_MODE ? [] : generateStages()))

// ── Salles (classes, amphis, salles de réunion, salles informatiques) ──
export const SALLE_TYPES = {
  classe: { key: 'classe', label: 'Salle de classe' },
  amphi: { key: 'amphi', label: 'Amphithéâtre' },
  reunion: { key: 'reunion', label: 'Salle de réunion' },
  informatique: { key: 'informatique', label: 'Salle informatique' },
}
export const EQUIPEMENTS_SALLE = [
  { key: 'videoprojecteur', label: 'Vidéoprojecteur' },
  { key: 'ecran', label: 'Écran interactif' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'climatisation', label: 'Climatisation' },
  { key: 'tableau_blanc', label: 'Tableau blanc' },
  { key: 'visio', label: 'Visioconférence' },
  { key: 'ordinateurs', label: 'Postes informatiques' },
]
function generateSalles() {
  return [
    { id: 'sal-0001', nom: 'Amphi A', type: 'amphi', capacite: 220, batiment: 'A', etage: 0, equipements: ['videoprojecteur', 'ecran', 'wifi', 'climatisation', 'visio'], statut: 'active' },
    { id: 'sal-0002', nom: 'Amphi B', type: 'amphi', capacite: 180, batiment: 'A', etage: 0, equipements: ['videoprojecteur', 'ecran', 'wifi', 'climatisation'], statut: 'active' },
    { id: 'sal-0003', nom: 'Salle 101', type: 'classe', capacite: 40, batiment: 'A', etage: 1, equipements: ['videoprojecteur', 'tableau_blanc', 'wifi', 'climatisation'], statut: 'active' },
    { id: 'sal-0004', nom: 'Salle 102', type: 'classe', capacite: 40, batiment: 'A', etage: 1, equipements: ['videoprojecteur', 'tableau_blanc', 'wifi', 'climatisation'], statut: 'active' },
    { id: 'sal-0005', nom: 'Salle 103', type: 'classe', capacite: 35, batiment: 'A', etage: 1, equipements: ['tableau_blanc', 'wifi'], statut: 'maintenance' },
    { id: 'sal-0006', nom: 'Salle 201', type: 'classe', capacite: 50, batiment: 'A', etage: 2, equipements: ['videoprojecteur', 'tableau_blanc', 'wifi', 'climatisation'], statut: 'active' },
    { id: 'sal-0007', nom: 'Salle 202', type: 'classe', capacite: 50, batiment: 'A', etage: 2, equipements: ['videoprojecteur', 'tableau_blanc', 'wifi'], statut: 'active' },
    { id: 'sal-0008', nom: 'Salle 204', type: 'classe', capacite: 45, batiment: 'A', etage: 2, equipements: ['videoprojecteur', 'tableau_blanc', 'wifi', 'climatisation'], statut: 'active' },
    { id: 'sal-0009', nom: 'Salle 205', type: 'classe', capacite: 45, batiment: 'A', etage: 2, equipements: ['videoprojecteur', 'tableau_blanc', 'wifi'], statut: 'active' },
    { id: 'sal-0010', nom: 'Salle informatique 1', type: 'informatique', capacite: 30, batiment: 'B', etage: 1, equipements: ['ordinateurs', 'videoprojecteur', 'wifi', 'climatisation'], statut: 'active' },
    { id: 'sal-0011', nom: 'Salle informatique 2', type: 'informatique', capacite: 28, batiment: 'B', etage: 1, equipements: ['ordinateurs', 'videoprojecteur', 'wifi', 'climatisation'], statut: 'active' },
    { id: 'sal-0012', nom: 'Salle projet', type: 'classe', capacite: 24, batiment: 'B', etage: 2, equipements: ['videoprojecteur', 'tableau_blanc', 'wifi', 'visio'], statut: 'active' },
    { id: 'sal-0013', nom: 'Salle Conseil', type: 'reunion', capacite: 24, batiment: 'C', etage: 3, equipements: ['videoprojecteur', 'ecran', 'wifi', 'climatisation', 'visio'], statut: 'active' },
    { id: 'sal-0014', nom: 'Salle Comité', type: 'reunion', capacite: 14, batiment: 'C', etage: 3, equipements: ['videoprojecteur', 'wifi', 'climatisation', 'visio'], statut: 'active' },
    { id: 'sal-0015', nom: 'Salle Innovation', type: 'reunion', capacite: 10, batiment: 'C', etage: 2, equipements: ['ecran', 'wifi', 'tableau_blanc'], statut: 'active' },
    { id: 'sal-0016', nom: 'Salle Vision', type: 'reunion', capacite: 8, batiment: 'C', etage: 2, equipements: ['ecran', 'wifi', 'climatisation'], statut: 'active' },
    { id: 'sal-0017', nom: 'Salle Direction', type: 'reunion', capacite: 6, batiment: 'C', etage: 4, equipements: ['wifi', 'climatisation', 'visio'], statut: 'active' },
  ]
}
const SALLES = reactive(loadEntity('salles', IS_SCHOOL_MODE ? [] : generateSalles()))

// ── Store ──
export const useSuperieurStore = defineStore('superieur', () => {
  const ecole = ECOLE
  const programmes = PROGRAMMES
  const promotions = PROMOTIONS
  const intervenants = INTERVENANTS
  const ue = UE
  const etudiants = ETUDIANTS

  // État de chargement : true le temps que le pull Firestore initial soit fait
  // (mode école seulement, sinon false dès le départ).
  const isLoading = ref(false)
  const schoolSyncError = ref(null)

  /**
   * Lance le pull initial depuis Firestore vers localStorage, puis recharge
   * les reactive depuis localStorage. À appeler depuis le composant racine
   * de l'espace sup (SuperieurView) dès que l'utilisateur est authentifié.
   * No-op en mode démo.
   */
  async function initSchoolSync() {
    if (!supSync.isSchoolMode()) return
    isLoading.value = true
    schoolSyncError.value = null
    try {
      await supSync.pullAll(supSync.currentSchoolId())
      // Recharger les reactive depuis localStorage frais
      INTERVENANTS.splice(0, INTERVENANTS.length, ...loadEntity('intervenants', []))
      UE.splice(0, UE.length, ...loadEntity('ue', []))
      ETUDIANTS.splice(0, ETUDIANTS.length, ...loadEntity('etudiants', []))
      EMPLOI_DU_TEMPS.splice(0, EMPLOI_DU_TEMPS.length, ...loadEntity('edt', []))
      SALLES.splice(0, SALLES.length, ...loadEntity('salles', []))
      const newInsc = loadEntity('inscriptions', {})
      for (const k of Object.keys(INSCRIPTIONS)) delete INSCRIPTIONS[k]
      Object.assign(INSCRIPTIONS, newInsc)
      const newNotes = loadEntity('notes', {})
      for (const k of Object.keys(NOTES)) delete NOTES[k]
      Object.assign(NOTES, newNotes)
      STAGES.splice(0, STAGES.length, ...loadEntity('stages', []))
      const newResp = loadEntity('prog_responsables', {})
      for (const k of Object.keys(PROGRAMME_RESPONSABLES)) delete PROGRAMME_RESPONSABLES[k]
      Object.assign(PROGRAMME_RESPONSABLES, newResp)
    } catch (e) {
      schoolSyncError.value = e?.message || String(e)
      console.error('[superieur] initSchoolSync failed', e)
    } finally {
      isLoading.value = false
    }
  }

  // Filtres écran Étudiants
  const etudiantFilters = ref({ promotionId: '', statut: '', campus: '', search: '' })

  // Promotion sélectionnée pour l'emploi du temps
  const selectedPromotionId = ref(PROMOTIONS[0].id)

  // ── Étudiants filtrés ──
  const filteredEtudiants = computed(() => {
    const f = etudiantFilters.value
    const q = f.search.trim().toLowerCase()
    return etudiants.filter((e) => {
      if (f.promotionId && e.promotionId !== f.promotionId) return false
      if (f.statut && e.statut !== f.statut) return false
      if (f.campus && e.campus !== f.campus) return false
      if (q && !`${e.nomComplet} ${e.matricule} ${e.programmeNom}`.toLowerCase().includes(q)) return false
      return true
    })
  })

  // ── Intervenants avec charge calculée ──
  const intervenantsAvecCharge = computed(() =>
    intervenants
      .map((it) => {
        const ueAssignees = ue.filter((u) => u.intervenantId === it.id)
        return {
          ...it,
          nbUE: ueAssignees.length,
          volumeHoraire: ueAssignees.reduce((s, u) => s + u.volumeHoraire, 0),
        }
      })
      .filter((it) => it.nbUE > 0)
  )

  // ── Responsables de formation ─────────────────────────────────
  function getResponsable(programmeId) {
    const id = PROGRAMME_RESPONSABLES[programmeId]
    if (!id) return null
    return intervenants.find((i) => i.id === id) || null
  }
  function assignResponsable(programmeId, intervenantId) {
    if (!programmes.some((p) => p.id === programmeId)) return false
    if (intervenantId && !intervenants.some((i) => i.id === intervenantId)) return false
    PROGRAMME_RESPONSABLES[programmeId] = intervenantId || null
    saveEntity('prog_responsables', PROGRAMME_RESPONSABLES)
    supSync.pushSingleton('sup_prog_responsables', PROGRAMME_RESPONSABLES)
    return true
  }

  // ── Offre de formation : UE groupées par programme → semestre ──
  const offreParProgramme = computed(() =>
    programmes.map((prog) => {
      const annees = prog.annees.map((annee) => {
        const semestres = annee.semestres.map((sem) => {
          const items = ue.filter((u) => u.anneeId === annee.id && u.semestre === sem)
          return {
            semestre: sem,
            ue: items,
            totalEcts: items.reduce((s, u) => s + u.ects, 0),
            totalHeures: items.reduce((s, u) => s + u.volumeHoraire, 0),
          }
        })
        return { ...annee, semestres }
      })
      return { ...prog, annees, responsable: getResponsable(prog.id) }
    })
  )

  // ── Emploi du temps de la promotion sélectionnée ──
  const selectedPromotion = computed(
    () => promotions.find((p) => p.id === selectedPromotionId.value) || promotions[0]
  )
  const emploiDuTemps = computed(() =>
    EMPLOI_DU_TEMPS.filter((s) => s.promotionId === selectedPromotionId.value)
  )

  // ── Statistiques pour le tableau de bord ──
  const stats = computed(() => {
    const nbEtudiants = etudiants.length
    const ectsValides = etudiants.reduce((s, e) => s + e.ectsValides, 0)
    const ectsRequis = etudiants.reduce((s, e) => s + e.ectsRequis, 0)
    const enDifficulte = etudiants.filter((e) => e.statut === 'en_difficulte').length
    const boursiers = etudiants.filter((e) => e.boursier).length
    const vacataires = intervenants.filter((i) => i.statut === 'vacataire').length
    const totalHeures = ue.reduce((s, u) => s + u.volumeHoraire, 0)
    const totalEctsCatalogue = ue.reduce((s, u) => s + u.ects, 0)

    // Répartition des étudiants par programme
    const parProgramme = programmes.map((p) => ({
      id: p.id,
      nom: p.nom,
      niveau: p.niveau,
      effectif: etudiants.filter((e) => e.programmeId === p.id).length,
    }))

    // Répartition des étudiants par campus (le groupe est multi-campus)
    const parCampus = CAMPUS.map((c) => ({
      id: c.id,
      nom: c.nom,
      ville: c.ville,
      siege: !!c.siege,
      directeur: c.directeur,
      effectif: etudiants.filter((e) => e.campus === c.id).length,
    }))

    return {
      nbEtudiants,
      nbProgrammes: programmes.length,
      nbPromotions: promotions.length,
      nbIntervenants: intervenantsAvecCharge.value.length,
      vacataires,
      nbUE: ue.length,
      totalHeures,
      totalEctsCatalogue,
      enDifficulte,
      boursiers,
      tauxProgressionEcts: ectsRequis ? Math.round((ectsValides / ectsRequis) * 100) : 0,
      moyenneGenerale: Math.round((etudiants.reduce((s, e) => s + e.moyenne, 0) / nbEtudiants) * 10) / 10,
      parProgramme,
      parCampus,
    }
  })

  function setEtudiantFilter(key, value) {
    if (key in etudiantFilters.value) etudiantFilters.value[key] = value
  }
  function resetEtudiantFilters() {
    etudiantFilters.value = { promotionId: '', statut: '', campus: '', search: '' }
  }
  function setPromotion(id) {
    if (promotions.some((p) => p.id === id)) selectedPromotionId.value = id
  }

  // ── Helpers ────────────────────────────────────────────────────
  function getUe(id) { return ue.find((u) => u.id === id) }
  function getEtudiant(id) { return etudiants.find((e) => e.id === id) }

  // ── Intervenants — filtres ─────────────────────────────────────
  const intervenantsFilters = ref({ statut: '', specialite: '', search: '' })
  function setIntervenantFilter(k, v) { if (k in intervenantsFilters.value) intervenantsFilters.value[k] = v }
  function resetIntervenantFilters() { intervenantsFilters.value = { statut: '', specialite: '', search: '' } }
  const filteredIntervenants = computed(() => {
    const f = intervenantsFilters.value
    const q = f.search.trim().toLowerCase()
    return intervenantsAvecCharge.value.filter((it) => {
      if (f.statut && it.statut !== f.statut) return false
      if (f.specialite && it.specialite !== f.specialite) return false
      if (q && !`${it.nomComplet} ${it.specialite}`.toLowerCase().includes(q)) return false
      return true
    })
  })
  const intervenantsSpecialites = computed(() =>
    [...new Set(intervenantsAvecCharge.value.map((i) => i.specialite))].sort()
  )
  const intervenantsStats = computed(() => {
    const arr = intervenantsAvecCharge.value
    return {
      total: arr.length,
      vacataires: arr.filter((i) => i.statut === 'vacataire').length,
      heuresTotal: arr.reduce((s, i) => s + i.volumeHoraire, 0),
      moyenneHeures: arr.length ? Math.round(arr.reduce((s, i) => s + i.volumeHoraire, 0) / arr.length) : 0,
    }
  })

  // ── Inscriptions pédagogiques ─────────────────────────────────
  const inscriptionsFilters = ref({ promotionId: '', statut: '', search: '' })
  function setInscriptionFilter(k, v) { if (k in inscriptionsFilters.value) inscriptionsFilters.value[k] = v }
  function resetInscriptionFilters() { inscriptionsFilters.value = { promotionId: '', statut: '', search: '' } }
  const inscriptionsList = computed(() => {
    const f = inscriptionsFilters.value
    const q = f.search.trim().toLowerCase()
    return etudiants
      .filter((e) => {
        if (f.promotionId && e.promotionId !== f.promotionId) return false
        const insc = INSCRIPTIONS[e.id]
        if (!insc) return false
        if (f.statut && insc.statut !== f.statut) return false
        if (q && !`${e.nomComplet} ${e.matricule}`.toLowerCase().includes(q)) return false
        return true
      })
      .map((e) => ({ etudiant: e, inscription: INSCRIPTIONS[e.id] }))
  })
  const inscriptionsStats = computed(() => {
    const arr = Object.values(INSCRIPTIONS)
    return {
      total: arr.length,
      complete: arr.filter((i) => i.statut === 'complete').length,
      validee: arr.filter((i) => i.statut === 'validee').length,
      incomplete: arr.filter((i) => i.statut === 'incomplete').length,
    }
  })
  const populariteElectifs = computed(() => {
    const counts = {}
    for (const insc of Object.values(INSCRIPTIONS)) {
      for (const ueId of insc.ueElectivesChoisies) counts[ueId] = (counts[ueId] || 0) + 1
    }
    return ue
      .filter((u) => u.electif)
      .map((u) => ({ ...u, nbInscrits: counts[u.id] || 0 }))
      .sort((a, b) => b.nbInscrits - a.nbInscrits)
  })

  // ── Notes & relevés ────────────────────────────────────────────
  const ueAvecNotes = computed(() => {
    const set = new Set()
    for (const m of Object.values(NOTES)) for (const id of Object.keys(m)) set.add(id)
    return ue.filter((u) => set.has(u.id)).sort((a, b) =>
      a.semestre.localeCompare(b.semestre) || a.code.localeCompare(b.code)
    )
  })
  function notesPourUE(ueId) {
    const items = []
    for (const e of etudiants) {
      const n = NOTES[e.id] && NOTES[e.id][ueId]
      if (n !== undefined) items.push({ etudiant: e, note: n })
    }
    return items.sort((a, b) => a.etudiant.nomComplet.localeCompare(b.etudiant.nomComplet))
  }
  function releveEtudiant(etudiantId) {
    const e = getEtudiant(etudiantId)
    if (!e) return null
    const insc = INSCRIPTIONS[etudiantId]
    if (!insc) return null
    const lignes = insc.ueChoisies.map((ueId) => {
      const u = getUe(ueId)
      const note = NOTES[etudiantId]?.[ueId]
      const validee = note !== undefined && note >= 10
      return {
        ueId,
        ueCode: u?.code || ueId,
        ueIntitule: u?.intitule || '',
        type: u?.type || '',
        ects: u?.ects || 0,
        note,
        validee,
      }
    })
    const totalEcts = lignes.reduce((s, l) => s + l.ects, 0)
    const ectsValides = lignes.filter((l) => l.validee).reduce((s, l) => s + l.ects, 0)
    const totalPoints = lignes.reduce((s, l) => s + (l.note ?? 0) * l.ects, 0)
    const moyenne = totalEcts ? Math.round((totalPoints / totalEcts) * 100) / 100 : 0
    const admis = moyenne >= 10
    let mention = ''
    if (admis) {
      if (moyenne >= 16) mention = 'Très Bien'
      else if (moyenne >= 14) mention = 'Bien'
      else if (moyenne >= 12) mention = 'Assez Bien'
      else mention = 'Passable'
    }
    return { etudiant: e, semestre: insc.semestre, lignes, totalEcts, ectsValides, moyenne, mention, admis }
  }
  const juryParPromotion = computed(() => {
    return promotions.map((p) => {
      const etudiantsPromo = etudiants.filter((e) => e.promotionId === p.id)
      const releves = etudiantsPromo.map((e) => releveEtudiant(e.id)).filter(Boolean)
      const admis = releves.filter((r) => r.admis).length
      const moyenne = releves.length
        ? Math.round((releves.reduce((s, r) => s + r.moyenne, 0) / releves.length) * 100) / 100
        : 0
      return {
        promotion: p,
        nbEtudiants: etudiantsPromo.length,
        nbAdmis: admis,
        nbAjournes: etudiantsPromo.length - admis,
        moyennePromo: moyenne,
        tauxReussite: etudiantsPromo.length ? Math.round((admis / etudiantsPromo.length) * 100) : 0,
      }
    })
  })

  // ── Stages & alternance ───────────────────────────────────────
  const stages = STAGES
  const stagesFilters = ref({ statut: '', type: '', promotionId: '', search: '' })
  function setStageFilter(k, v) { if (k in stagesFilters.value) stagesFilters.value[k] = v }
  function resetStageFilters() { stagesFilters.value = { statut: '', type: '', promotionId: '', search: '' } }
  const filteredStages = computed(() => {
    const f = stagesFilters.value
    const q = f.search.trim().toLowerCase()
    return stages.filter((s) => {
      if (f.statut && s.statut !== f.statut) return false
      if (f.type && s.type !== f.type) return false
      if (f.promotionId && s.promotionId !== f.promotionId) return false
      if (q && !`${s.etudiantNom} ${s.entreprise} ${s.ville}`.toLowerCase().includes(q)) return false
      return true
    })
  })
  const stagesStats = computed(() => ({
    total: stages.length,
    enCours: stages.filter((s) => s.statut === 'en_cours').length,
    aPourvoir: stages.filter((s) => s.statut === 'a_pourvoir').length,
    soutenance: stages.filter((s) => s.statut === 'soutenance_prevue').length,
    valides: stages.filter((s) => s.statut === 'valide').length,
    alternances: stages.filter((s) => s.type === 'alternance').length,
  }))

  // ── Salles ────────────────────────────────────────────────────
  const salles = SALLES
  const sallesFilters = ref({ type: '', batiment: '', statut: '', search: '' })
  function setSalleFilter(k, v) { if (k in sallesFilters.value) sallesFilters.value[k] = v }
  function resetSalleFilters() { sallesFilters.value = { type: '', batiment: '', statut: '', search: '' } }
  const filteredSalles = computed(() => {
    const f = sallesFilters.value
    const q = f.search.trim().toLowerCase()
    return salles.filter((s) => {
      if (f.type && s.type !== f.type) return false
      if (f.batiment && s.batiment !== f.batiment) return false
      if (f.statut && s.statut !== f.statut) return false
      if (q && !`${s.nom} ${s.batiment}`.toLowerCase().includes(q)) return false
      return true
    })
  })
  const sallesStats = computed(() => ({
    total: salles.length,
    classes: salles.filter((s) => s.type === 'classe' || s.type === 'informatique').length,
    amphis: salles.filter((s) => s.type === 'amphi').length,
    reunion: salles.filter((s) => s.type === 'reunion').length,
    capaciteTotal: salles.reduce((sum, s) => sum + (s.capacite || 0), 0),
    maintenance: salles.filter((s) => s.statut === 'maintenance').length,
  }))
  const sallesBatiments = computed(() =>
    [...new Set(salles.map((s) => s.batiment))].filter(Boolean).sort()
  )

  // ── CRUD générique : id incrémental ────────────────────────────
  function nextId(prefix, list) {
    const max = list.reduce((m, x) => {
      const n = parseInt((x.id || '').replace(prefix + '-', ''), 10)
      return isNaN(n) ? m : Math.max(m, n)
    }, 0)
    return `${prefix}-${String(max + 1).padStart(4, '0')}`
  }

  // ── CRUD étudiants ─────────────────────────────────────────────
  function addEtudiant(data) {
    const promo = promotions.find((p) => p.id === data.promotionId)
    const ectsRequis = Number(data.ectsRequis) || (promo ? promo.rang * 60 : 60)
    const etu = {
      id: nextId('etu', etudiants),
      matricule: (data.matricule || '').trim() || `ISE${promo?.rang || 0}${String(Date.now()).slice(-5)}`,
      prenom: (data.prenom || '').trim(),
      nom: (data.nom || '').trim(),
      nomComplet: `${(data.nom || '').trim().toUpperCase()} ${(data.prenom || '').trim()}`.trim(),
      programmeId: promo?.programmeId || '',
      programmeNom: promo?.programmeNom || '',
      niveau: promo?.niveau || '',
      promotionId: data.promotionId,
      anneeNom: promo?.anneeNom || '',
      villeOrigine: data.villeOrigine || '',
      ectsValides: Number(data.ectsValides) || 0,
      ectsRequis,
      moyenne: data.moyenne !== undefined && data.moyenne !== '' ? Number(data.moyenne) : 12,
      statut: data.statut || 'inscrit',
      boursier: !!data.boursier,
    }
    etudiants.push(etu)
    saveEntity('etudiants', etudiants)
    supSync.pushDoc('sup_etudiants', etu.id, etu)
    return etu
  }
  function updateEtudiant(id, patch) {
    const idx = etudiants.findIndex((e) => e.id === id)
    if (idx === -1) return null
    const current = etudiants[idx]
    const promo = promotions.find((p) => p.id === (patch.promotionId || current.promotionId))
    Object.assign(current, patch)
    current.nomComplet = `${(current.nom || '').toUpperCase()} ${current.prenom || ''}`.trim()
    if (promo) {
      current.programmeId = promo.programmeId
      current.programmeNom = promo.programmeNom
      current.niveau = promo.niveau
      current.anneeNom = promo.anneeNom
    }
    if (patch.ectsValides !== undefined) current.ectsValides = Number(patch.ectsValides) || 0
    if (patch.ectsRequis !== undefined) current.ectsRequis = Number(patch.ectsRequis) || current.ectsRequis
    if (patch.moyenne !== undefined) current.moyenne = Number(patch.moyenne) || 0
    saveEntity('etudiants', etudiants)
    supSync.pushDoc('sup_etudiants', current.id, current)
    return current
  }
  function deleteEtudiant(id) {
    const idx = etudiants.findIndex((e) => e.id === id)
    if (idx === -1) return false
    etudiants.splice(idx, 1)
    saveEntity('etudiants', etudiants)
    supSync.deleteDoc('sup_etudiants', id)
    if (INSCRIPTIONS[id]) {
      delete INSCRIPTIONS[id]; saveEntity('inscriptions', INSCRIPTIONS)
      supSync.deleteDoc('sup_inscriptions', id)
    }
    if (NOTES[id]) {
      delete NOTES[id]; saveEntity('notes', NOTES)
      supSync.deleteDoc('sup_notes', id)
    }
    let removed = false
    for (let i = stages.length - 1; i >= 0; i--) {
      if (stages[i].etudiantId === id) {
        supSync.deleteDoc('sup_stages', stages[i].id)
        stages.splice(i, 1); removed = true
      }
    }
    if (removed) saveEntity('stages', stages)
    return true
  }

  // ── CRUD intervenants ──────────────────────────────────────────
  function addIntervenant(data) {
    const it = {
      id: nextId('int', intervenants),
      prenom: (data.prenom || '').trim(),
      nom: (data.nom || '').trim(),
      nomComplet: `${(data.prenom || '').trim()} ${(data.nom || '').trim()}`.trim(),
      statut: data.statut || 'permanent',
      specialite: data.specialite || '',
      coutHoraire: data.coutHoraire ? Number(data.coutHoraire) : null,
    }
    intervenants.push(it)
    saveEntity('intervenants', intervenants)
    supSync.pushDoc('sup_intervenants', it.id, it)
    return it
  }
  function updateIntervenant(id, patch) {
    const idx = intervenants.findIndex((i) => i.id === id)
    if (idx === -1) return null
    const current = intervenants[idx]
    Object.assign(current, patch)
    current.nomComplet = `${current.prenom || ''} ${current.nom || ''}`.trim()
    if (patch.coutHoraire !== undefined) {
      current.coutHoraire = patch.coutHoraire ? Number(patch.coutHoraire) : null
    }
    // Répercuter le nom sur les UE assignées
    for (const u of ue) {
      if (u.intervenantId === id) {
        u.intervenantNom = current.nomComplet
        supSync.pushDoc('sup_ue', u.id, u)
      }
    }
    saveEntity('intervenants', intervenants)
    saveEntity('ue', ue)
    supSync.pushDoc('sup_intervenants', current.id, current)
    return current
  }
  function deleteIntervenant(id) {
    const idx = intervenants.findIndex((i) => i.id === id)
    if (idx === -1) return false
    intervenants.splice(idx, 1)
    saveEntity('intervenants', intervenants)
    supSync.deleteDoc('sup_intervenants', id)
    for (const u of ue) {
      if (u.intervenantId === id) {
        u.intervenantId = null
        u.intervenantNom = '(à attribuer)'
        supSync.pushDoc('sup_ue', u.id, u)
      }
    }
    saveEntity('ue', ue)
    return true
  }

  // ── CRUD unités d'enseignement ────────────────────────────────
  function addUe(data) {
    const intervenant = intervenants.find((i) => i.id === data.intervenantId) || null
    const annee = programmes.flatMap((p) => p.annees).find((a) => a.id === data.anneeId)
    const programme = programmes.find((p) => p.annees.some((a) => a.id === data.anneeId))
    const idNum = nextId('ue', ue)
    const num = idNum.replace('ue-', '')
    const codePrefix = ({ fondamentale: 'FND', methodologique: 'MET', professionnelle: 'PRO', electif: 'ELE' })[data.type] || 'UE'
    const u = {
      id: idNum,
      code: (data.code || '').trim() || `${codePrefix}-${num}`,
      intitule: (data.intitule || '').trim(),
      type: data.type || 'fondamentale',
      electif: data.type === 'electif',
      ects: Number(data.ects) || 3,
      volumeHoraire: Number(data.volumeHoraire) || ((Number(data.ects) || 3) * 8),
      programmeId: programme?.id || '',
      programmeNom: programme?.nom || '',
      anneeId: data.anneeId || '',
      anneeNom: annee?.nom || '',
      promotionId: programme && annee ? `${programme.id}__${annee.id}` : '',
      semestre: data.semestre || '',
      intervenantId: data.intervenantId || null,
      intervenantNom: intervenant?.nomComplet || '(à attribuer)',
    }
    ue.push(u)
    saveEntity('ue', ue)
    supSync.pushDoc('sup_ue', u.id, u)
    return u
  }
  function updateUe(id, patch) {
    const idx = ue.findIndex((u) => u.id === id)
    if (idx === -1) return null
    const current = ue[idx]
    Object.assign(current, patch)
    if (patch.ects !== undefined) current.ects = Number(patch.ects) || 0
    if (patch.volumeHoraire !== undefined) current.volumeHoraire = Number(patch.volumeHoraire) || 0
    if (patch.type !== undefined) current.electif = (patch.type === 'electif')
    if (patch.intervenantId !== undefined) {
      const it = intervenants.find((i) => i.id === patch.intervenantId)
      current.intervenantNom = it?.nomComplet || '(à attribuer)'
    }
    saveEntity('ue', ue)
    supSync.pushDoc('sup_ue', current.id, current)
    return current
  }
  function deleteUe(id) {
    const idx = ue.findIndex((u) => u.id === id)
    if (idx === -1) return false
    ue.splice(idx, 1)
    saveEntity('ue', ue)
    supSync.deleteDoc('sup_ue', id)
    for (const [etuId, insc] of Object.entries(INSCRIPTIONS)) {
      insc.ueChoisies = insc.ueChoisies.filter((x) => x !== id)
      insc.ueElectivesChoisies = insc.ueElectivesChoisies.filter((x) => x !== id)
      insc.ueElectivesDispo = insc.ueElectivesDispo.filter((x) => x !== id)
      supSync.pushDoc('sup_inscriptions', etuId, insc)
    }
    saveEntity('inscriptions', INSCRIPTIONS)
    for (const [etuId, m] of Object.entries(NOTES)) {
      if (m[id] !== undefined) {
        delete m[id]
        supSync.pushDoc('sup_notes', etuId, m)
      }
    }
    saveEntity('notes', NOTES)
    return true
  }

  // ── CRUD stages ────────────────────────────────────────────────
  function addStage(data) {
    const etu = etudiants.find((e) => e.id === data.etudiantId)
    const s = {
      id: nextId('stg', stages),
      etudiantId: data.etudiantId,
      etudiantNom: etu?.nomComplet || '',
      matricule: etu?.matricule || '',
      programmeNom: etu?.programmeNom || '',
      anneeNom: etu?.anneeNom || '',
      promotionId: etu?.promotionId || '',
      type: data.type || 'stage',
      entreprise: (data.entreprise || '').trim(),
      ville: (data.ville || '').trim(),
      dateDebut: data.dateDebut || '',
      dateFin: data.dateFin || '',
      dureeSemaines: Number(data.dureeSemaines) || 0,
      tuteurEntreprise: (data.tuteurEntreprise || '').trim(),
      tuteurEcole: (data.tuteurEcole || '').trim(),
      statut: data.statut || 'a_pourvoir',
      noteSoutenance: data.noteSoutenance !== undefined && data.noteSoutenance !== ''
        ? Number(data.noteSoutenance) : null,
    }
    stages.push(s)
    saveEntity('stages', stages)
    supSync.pushDoc('sup_stages', s.id, s)
    return s
  }
  function updateStage(id, patch) {
    const idx = stages.findIndex((s) => s.id === id)
    if (idx === -1) return null
    const current = stages[idx]
    Object.assign(current, patch)
    if (patch.etudiantId !== undefined) {
      const etu = etudiants.find((e) => e.id === patch.etudiantId)
      if (etu) {
        current.etudiantNom = etu.nomComplet
        current.matricule = etu.matricule
        current.programmeNom = etu.programmeNom
        current.anneeNom = etu.anneeNom
        current.promotionId = etu.promotionId
      }
    }
    if (patch.dureeSemaines !== undefined) current.dureeSemaines = Number(patch.dureeSemaines) || 0
    if (patch.noteSoutenance !== undefined) {
      current.noteSoutenance = patch.noteSoutenance === '' || patch.noteSoutenance === null
        ? null : Number(patch.noteSoutenance)
    }
    saveEntity('stages', stages)
    supSync.pushDoc('sup_stages', current.id, current)
    return current
  }
  function deleteStage(id) {
    const idx = stages.findIndex((s) => s.id === id)
    if (idx === -1) return false
    stages.splice(idx, 1)
    saveEntity('stages', stages)
    supSync.deleteDoc('sup_stages', id)
    return true
  }

  // ── CRUD salles ────────────────────────────────────────────────
  function addSalle(data) {
    const s = {
      id: nextId('sal', salles),
      nom: (data.nom || '').trim(),
      type: data.type || 'classe',
      capacite: Number(data.capacite) || 0,
      batiment: (data.batiment || '').trim(),
      etage: Number(data.etage) || 0,
      equipements: Array.isArray(data.equipements) ? data.equipements.slice() : [],
      statut: data.statut || 'active',
    }
    salles.push(s)
    saveEntity('salles', salles)
    supSync.pushDoc('sup_salles', s.id, s)
    return s
  }
  function updateSalle(id, patch) {
    const idx = salles.findIndex((s) => s.id === id)
    if (idx === -1) return null
    const current = salles[idx]
    Object.assign(current, patch)
    if (patch.capacite !== undefined) current.capacite = Number(patch.capacite) || 0
    if (patch.etage !== undefined) current.etage = Number(patch.etage) || 0
    if (patch.equipements !== undefined) current.equipements = patch.equipements.slice()
    saveEntity('salles', salles)
    supSync.pushDoc('sup_salles', current.id, current)
    return current
  }
  function deleteSalle(id) {
    const idx = salles.findIndex((s) => s.id === id)
    if (idx === -1) return false
    salles.splice(idx, 1)
    saveEntity('salles', salles)
    supSync.deleteDoc('sup_salles', id)
    return true
  }

  return {
    ecole,
    campusList: CAMPUS,
    programmes,
    promotions,
    intervenants,
    ue,
    etudiants,
    etudiantFilters,
    selectedPromotionId,
    filteredEtudiants,
    intervenantsAvecCharge,
    offreParProgramme,
    selectedPromotion,
    emploiDuTemps,
    stats,
    setEtudiantFilter,
    resetEtudiantFilters,
    setPromotion,
    // Helpers
    getUe,
    getEtudiant,
    // Intervenants
    intervenantsFilters,
    filteredIntervenants,
    intervenantsSpecialites,
    intervenantsStats,
    setIntervenantFilter,
    resetIntervenantFilters,
    // Inscriptions pédagogiques
    inscriptionsFilters,
    inscriptionsList,
    inscriptionsStats,
    populariteElectifs,
    setInscriptionFilter,
    resetInscriptionFilters,
    // Notes & relevés
    ueAvecNotes,
    notesPourUE,
    releveEtudiant,
    juryParPromotion,
    // Stages
    stages,
    stagesFilters,
    filteredStages,
    stagesStats,
    setStageFilter,
    resetStageFilters,
    // Salles
    salles,
    sallesFilters,
    filteredSalles,
    sallesStats,
    sallesBatiments,
    setSalleFilter,
    resetSalleFilters,
    // CRUD
    addEtudiant, updateEtudiant, deleteEtudiant,
    addIntervenant, updateIntervenant, deleteIntervenant,
    addUe, updateUe, deleteUe,
    addStage, updateStage, deleteStage,
    addSalle, updateSalle, deleteSalle,
    // Responsables de formation
    getResponsable, assignResponsable,
    // Mode école Firebase (mode démo : isLoading=false, initSchoolSync no-op)
    isLoading, schoolSyncError, initSchoolSync,
  }
})
