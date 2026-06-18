import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Store "edition" de MAPO
 * ------------------------
 * MAPO se décline en deux espaces qui partagent le même socle technique :
 *   - 'secondaire' : écoles primaires et secondaires (collèges, lycées) — contexte africain
 *   - 'superieur'  : enseignement supérieur (universités, écoles supérieures, BTS) —
 *                    compatible avec l'enseignement supérieur français
 *
 * Note d'architecture : tout ce qui relève de l'agrégation multi-écoles (vue
 * gouvernementale, indicateurs régionaux, diagnostic territorial, recommandations
 * d'action) appartient à NOVA, pas à MAPO. MAPO se concentre sur la gestion
 * scolaire mono-établissement.
 *
 * L'édition est choisie sur la page d'accueil (WelcomeView) et conservée dans
 * localStorage. Tout le reste de l'application peut lire ce store pour adapter
 * sa terminologie, ses modules et ses données de démonstration.
 */

const STORAGE_KEY = 'mapo_edition'

// Liste des éditions valides
const VALID_EDITIONS = ['primaire', 'secondaire', 'superieur']

// Métadonnées d'affichage de chaque édition
export const EDITIONS = {
  primaire: {
    key: 'primaire',
    name: 'Primaire',
    tagline: 'Écoles primaires (SIL → CM2)',
    context: "Programme officiel camerounais (APC) — fonctionne hors ligne",
  },
  secondaire: {
    key: 'secondaire',
    name: 'Secondaire',
    tagline: 'Collèges et lycées',
    context: 'Pensé pour les établissements africains — fonctionne hors ligne',
  },
  superieur: {
    key: 'superieur',
    name: 'Enseignement Supérieur',
    tagline: 'Universités, écoles supérieures et BTS',
    context: "Compatible avec l'enseignement supérieur français — Europe et Afrique",
  },
}

/**
 * Terminologie par édition.
 * Permet aux vues partagées d'afficher le bon vocabulaire selon l'édition active.
 * (Utilisé progressivement — la version secondaire reste la référence aujourd'hui.)
 */
export const TERMINOLOGY = {
  primaire: {
    learner: 'écolier',
    learnerCap: 'Écolier',
    learners: 'écoliers',
    learnersCap: 'Écoliers',
    group: 'classe',
    groupCap: 'Classe',
    groups: 'classes',
    groupsCap: 'Classes',
    teacher: 'maître',
    teacherCap: 'Maître',
    teachers: 'maîtres',
    report: 'bulletin',
    reportCap: 'Bulletin',
    reports: 'bulletins',
    guardian: 'parent',
    guardianCap: 'Parent',
    term: 'trimestre',
    termCap: 'Trimestre',
    establishment: 'école primaire',
  },
  secondaire: {
    learner: 'élève',
    learnerCap: 'Élève',
    learners: 'élèves',
    learnersCap: 'Élèves',
    group: 'classe',
    groupCap: 'Classe',
    groups: 'classes',
    groupsCap: 'Classes',
    teacher: 'enseignant',
    teacherCap: 'Enseignant',
    teachers: 'enseignants',
    report: 'bulletin',
    reportCap: 'Bulletin',
    reports: 'bulletins',
    guardian: 'parent',
    guardianCap: 'Parent',
    term: 'trimestre',
    termCap: 'Trimestre',
    establishment: 'établissement scolaire',
  },
  superieur: {
    learner: 'étudiant',
    learnerCap: 'Étudiant',
    learners: 'étudiants',
    learnersCap: 'Étudiants',
    group: 'promotion',
    groupCap: 'Promotion',
    groups: 'promotions',
    groupsCap: 'Promotions',
    teacher: 'intervenant',
    teacherCap: 'Intervenant',
    teachers: 'intervenants',
    report: 'relevé de notes',
    reportCap: 'Relevé de notes',
    reports: 'relevés de notes',
    guardian: 'contact',
    guardianCap: 'Contact',
    term: 'semestre',
    termCap: 'Semestre',
    establishment: "établissement d'enseignement supérieur",
  },
}

export const useEditionStore = defineStore('edition', () => {
  // null = aucune édition choisie (l'utilisateur doit passer par la page d'accueil)
  const current = ref(null)

  const isChosen = computed(() => VALID_EDITIONS.includes(current.value))
  const isPrimaire = computed(() => current.value === 'primaire')
  const isSecondaire = computed(() => current.value === 'secondaire')
  const isSuperieur = computed(() => current.value === 'superieur')

  // Métadonnées de l'édition active
  const meta = computed(() => (isChosen.value ? EDITIONS[current.value] : null))

  // Terminologie de l'édition active (secondaire par défaut si rien n'est choisi)
  const terms = computed(() => TERMINOLOGY[current.value] || TERMINOLOGY.secondaire)

  function setEdition(edition) {
    if (!VALID_EDITIONS.includes(edition)) return
    current.value = edition
    try {
      localStorage.setItem(STORAGE_KEY, edition)
    } catch (e) { /* silent */ }
  }

  function clearEdition() {
    current.value = null
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) { /* silent */ }
  }

  /**
   * Restaure l'édition depuis localStorage au démarrage.
   * Rétro-compatibilité : si une session démo existe déjà sans édition enregistrée,
   * on considère qu'il s'agit de l'édition secondaire (la seule disponible auparavant).
   */
  function init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (VALID_EDITIONS.includes(stored)) {
        current.value = stored
        return
      }
      // Rétro-compatibilité avec les sessions démo antérieures
      if (localStorage.getItem('mapo_demo_session')) {
        setEdition('secondaire')
      }
    } catch (e) { /* silent */ }
  }

  return {
    current,
    isChosen,
    isPrimaire,
    isSecondaire,
    isSuperieur,
    meta,
    terms,
    setEdition,
    clearEdition,
    init,
  }
})
