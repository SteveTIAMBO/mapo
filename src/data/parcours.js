// MAPO+ — Parcours éducatifs par métier et par PAYS (sourcé). Répond au besoin :
// « un 5e qui veut être médecin » → montrer le chemin scolaire concret jusqu'au
// métier (et une alternative proche), avec les vraies filières du pays.
//
// SOURCES (revues mensuellement — cf. MAJ_PARCOURS) :
//  • Cameroun : séries du secondaire (A/B/C/D/E/TI) et débouchés ; accès médecine/
//    dentaire par Bac C ou D puis Examen National d'Aptitude (MINESUP), Faculté de
//    Médecine (FMSB Yaoundé I, FMSP Douala, UdM…). Médecine ~7 ans, chirurgie-
//    dentaire (odontostomatologie) ~6 ans.
//  • France : baccalauréat général à spécialités ; accès médecine via PASS/LAS.
//
// Ce référentiel est un point de départ pédagogique, PAS un document officiel :
// les modalités (concours, capacités d'accueil) changent — d'où la veille.

export const MAJ_PARCOURS = '2026-07' // dernière revue (veille mensuelle)

// Métiers d'avenir (cadrage WEF Future of Jobs 2025) : marqués d'un éclair dans
// l'UI. Sert à mettre en avant des trajectoires porteuses, sans les imposer.
export const METIERS_AVENIR = new Set([
  'informaticien', 'data', 'ia_ml', 'cybersecurite', 'agronome', 'energie',
  'sante', 'medecin', 'infirmier', 'ingenieur',
])

// Chaque métier : libellés, domaine, `avenir` (porteur), alternatives proches,
// et le parcours PAR PAYS (étapes ordonnées depuis le collège). `serie` (Cameroun)
// aide l'élève à choisir sa série au lycée.
export const PARCOURS = {
  medecin: {
    fr: 'Médecin', en: 'Doctor', domaine: 'Santé', avenir: true,
    alternatives: ['dentiste', 'pharmacien', 'infirmier'],
    pays: {
      CM: {
        serie: 'D', duree: '~7 ans après le Bac',
        etapes: ['2nde scientifique', '1re D (maths + SVT)', 'Terminale D → Bac D', 'Examen National d\'Aptitude (MINESUP)', 'Faculté de Médecine — Doctorat en Médecine (~7 ans)'],
        ecoles: ['FMSB (Yaoundé I)', 'FMSP (Douala)', 'ISSS — Univ. des Montagnes', 'Buea', 'Bamenda'],
        note: 'Accès sur concours (moins de 23 ans, une spécialité/établissement). Série C acceptée aussi.',
      },
      FR: {
        serie: 'Bac général — spé SVT / Physique-Chimie (+ Maths conseillé)', duree: '9 ans et +',
        etapes: ['Seconde générale', '1re générale (spécialités scientifiques)', 'Terminale → Bac général', 'PASS ou L.AS (1re année santé)', 'Études de médecine (externat, internat)'],
        ecoles: ['UFR de médecine (universités)'],
        note: 'Accès très sélectif à la 2e année (PASS/L.AS).',
      },
    },
  },
  dentiste: {
    fr: 'Chirurgien-dentiste', en: 'Dentist', domaine: 'Santé', avenir: true,
    alternatives: ['medecin', 'pharmacien'],
    pays: {
      CM: {
        serie: 'D', duree: '~6 ans après le Bac',
        etapes: ['2nde scientifique', '1re D', 'Terminale D → Bac D', 'Examen National d\'Aptitude (MINESUP)', 'Odontostomatologie — Chirurgien-dentiste (~6 ans)'],
        ecoles: ['FMSB (Yaoundé I)', 'FMSP (Douala)'],
        note: 'Même concours que médecine ; on choisit la spécialité dentaire.',
      },
      FR: {
        serie: 'Bac général — spé scientifiques', duree: '6 ans et +',
        etapes: ['Seconde', '1re générale (spécialités scientifiques)', 'Terminale → Bac', 'PASS ou L.AS', 'Odontologie (chirurgie dentaire)'],
        ecoles: ['UFR d\'odontologie'],
        note: 'Accès en 2e année sur classement PASS/L.AS.',
      },
    },
  },
  ingenieur: {
    fr: 'Ingénieur', en: 'Engineer', domaine: 'Sciences & technique', avenir: true,
    alternatives: ['informaticien', 'energie'],
    pays: {
      CM: {
        serie: 'C ou E', duree: '~5 ans après le Bac',
        etapes: ['2nde scientifique', '1re C (maths + physique) ou E', 'Terminale C/E → Bac', 'Concours grande école d\'ingénieur', 'École d\'ingénieur (~5 ans)'],
        ecoles: ['ENSPY (Polytechnique Yaoundé)', 'UCAC-ICAM', 'ENSPD (Douala)'],
        note: 'La série C ouvre le plus largement les écoles d\'ingénieur.',
      },
      FR: {
        serie: 'Bac général — spé Maths + Physique (ou NSI)', duree: '5 ans',
        etapes: ['Seconde', '1re générale (Maths + Physique/NSI)', 'Terminale → Bac', 'CPGE ou prépa intégrée / BUT', 'École d\'ingénieur (diplôme Bac+5)'],
        ecoles: ['Écoles d\'ingénieur (CTI)'],
        note: 'Voie prépa (CPGE) ou postbac intégrée.',
      },
    },
  },
  informaticien: {
    fr: 'Informaticien / Développeur', en: 'Software developer', domaine: 'Numérique', avenir: true,
    alternatives: ['data', 'ingenieur'],
    pays: {
      CM: {
        serie: 'C ou TI', duree: '3 à 5 ans après le Bac',
        etapes: ['2nde', '1re C ou TI (informatique)', 'Terminale → Bac', 'Fac des sciences / IUT / école du numérique', 'Licence/Master ou cycle ingénieur informatique'],
        ecoles: ['Universités (informatique)', 'IUT', 'écoles du numérique'],
        note: 'La série TI ou C aide, mais la reconversion vers le code reste possible.',
      },
      FR: {
        serie: 'Bac général — spé NSI / Maths', duree: '3 à 5 ans',
        etapes: ['Seconde', '1re générale (NSI, Maths)', 'Terminale → Bac', 'BUT Informatique / Licence / école', 'Licence-Master ou diplôme d\'ingénieur'],
        ecoles: ['Universités', 'BUT Informatique', 'écoles d\'ingénieur'],
        note: 'Filière très porteuse et accessible par plusieurs voies.',
      },
    },
  },
  juriste: {
    fr: 'Juriste / Avocat', en: 'Lawyer', domaine: 'Droit & société', avenir: false,
    alternatives: ['enseignant'],
    pays: {
      CM: {
        serie: 'A (ou toute série)', duree: '5 ans et + après le Bac',
        etapes: ['2nde', '1re A (littéraire) ou autre', 'Terminale → Bac', 'Faculté de Droit (Licence)', 'Master + (avocat : formation professionnelle)'],
        ecoles: ['Facultés de Droit (universités)'],
        note: 'La série A est classique, mais le droit accueille toutes les séries.',
      },
      FR: {
        serie: 'Bac général — spé HGGSP / SES / Humanités', duree: '5 ans et +',
        etapes: ['Seconde', '1re générale', 'Terminale → Bac', 'Licence de Droit', 'Master + école d\'avocats (CRFPA)'],
        ecoles: ['Facultés de Droit'],
        note: 'Avocat : Master 1 + examen d\'entrée à l\'école d\'avocats.',
      },
    },
  },
  gestionnaire: {
    fr: 'Gestion / Comptabilité / Commerce', en: 'Business & finance', domaine: 'Économie & gestion', avenir: false,
    alternatives: ['juriste'],
    pays: {
      CM: {
        serie: 'B', duree: '3 à 5 ans après le Bac',
        etapes: ['2nde', '1re B (économie)', 'Terminale B → Bac', 'Fac / école de commerce / BTS', 'Licence-Master gestion, finance, marketing'],
        ecoles: ['Universités', 'écoles de commerce', 'BTS/HND'],
        note: 'La série B est la voie naturelle vers l\'économie-gestion.',
      },
      FR: {
        serie: 'Bac général — spé SES / Maths', duree: '3 à 5 ans',
        etapes: ['Seconde', '1re générale (SES, Maths)', 'Terminale → Bac', 'BUT GEA / Licence / école de commerce', 'Licence-Master ou PGE'],
        ecoles: ['Universités', 'écoles de commerce', 'BUT GEA'],
        note: 'Voie université ou école de commerce (post-bac ou prépa).',
      },
    },
  },
  agronome: {
    fr: 'Agronome / Agro-alimentaire', en: 'Agronomist', domaine: 'Agriculture & vivant', avenir: true,
    alternatives: ['ingenieur'],
    pays: {
      CM: {
        serie: 'D (ou C)', duree: '~5 ans après le Bac',
        etapes: ['2nde scientifique', '1re D (SVT) ou C', 'Terminale → Bac', 'Concours école d\'agronomie', 'École/Faculté d\'agronomie (~5 ans)'],
        ecoles: ['FASA (Univ. de Dschang)', 'écoles d\'agronomie'],
        note: 'Secteur porteur (souveraineté alimentaire).',
      },
      FR: {
        serie: 'Bac général — spé SVT / Physique-Chimie', duree: '5 ans',
        etapes: ['Seconde', '1re générale (SVT)', 'Terminale → Bac', 'CPGE BCPST / BUT / Licence', 'École d\'ingénieur agronome'],
        ecoles: ['Écoles d\'agronomie', 'AgroParisTech, etc.'],
        note: 'Voie prépa BCPST ou universitaire.',
      },
    },
  },
  enseignant: {
    fr: 'Enseignant', en: 'Teacher', domaine: 'Éducation', avenir: false,
    alternatives: ['juriste'],
    pays: {
      CM: {
        serie: 'Selon la matière', duree: '3 à 5 ans après le Bac',
        etapes: ['2nde', '1re (série selon la matière visée)', 'Terminale → Bac', 'Licence dans la discipline', 'ENS (École Normale Supérieure) sur concours'],
        ecoles: ['ENS Yaoundé', 'ENS Bambili', 'universités'],
        note: 'La série dépend de la matière que l\'on veut enseigner.',
      },
      FR: {
        serie: 'Bac général (selon la discipline)', duree: '5 ans',
        etapes: ['Seconde', '1re générale', 'Terminale → Bac', 'Licence dans la discipline', 'Master MEEF + concours (CRPE/CAPES)'],
        ecoles: ['INSPÉ', 'universités'],
        note: 'Concours (CRPE au primaire, CAPES au secondaire).',
      },
    },
  },
}

// Pays disposant d'un référentiel de parcours (sinon : on l'indique honnêtement).
export const PARCOURS_PAYS = { CM: 'Cameroun', FR: 'France' }

// Liste des métiers pour la découverte (ordre : avenir d'abord, puis alpha).
export function listeMetiers(en = false) {
  return Object.entries(PARCOURS)
    .map(([id, m]) => ({ id, label: en ? m.en : m.fr, domaine: m.domaine, avenir: !!m.avenir }))
    .sort((a, b) => (b.avenir - a.avenir) || a.label.localeCompare(b.label))
}

// Parcours d'un métier pour un pays (code CM/FR/…), ou null si non couvert.
export function parcoursMetier(metierId, paysCode) {
  const m = PARCOURS[metierId]
  if (!m) return null
  const p = m.pays[paysCode] || null
  return p ? { ...m, id: metierId, ...p, alternatives: m.alternatives || [] } : null
}
