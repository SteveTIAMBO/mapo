import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, auth } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { demoKey } from '../utils/demoScope'
import { DISCIPLINES_PRIMAIRE } from '../data/primaire'
import { LEVELS_PRIMAIRE_TOUS } from './classes'
import { useDisciplinesPrimaireStore } from './disciplinesPrimaire'
import { useNiveauxStore } from './niveaux'

// Version de demo pour reset quand la structure change
const DEMO_SUBJECTS_VERSION = 2

// Couleurs par défaut pour les matières
export const SUBJECT_DEFAULT_COLORS = {
  'Français': '#93C5FD',
  'Anglais': '#C4B5FD',
  'Mathématiques': '#FCA5A5',
  'SVT': '#6EE7B7',
  'PCT': '#FCD34D',
  'Physique': '#FDBA74',
  'Chimie': '#FB923C',
  'Histoire-Géographie': '#A5B4FC',
  'EPS': '#67E8F9',
  'Informatique': '#CBD5E1',
  'ECM': '#F9A8D4',
  'Espagnol': '#5EEAD4',
  'Allemand': '#D8B4FE',
  'Philosophie': '#E879F9',
}

// Données initiales par défaut (programme camerounais)
// Chaque matière a un nom, un cycle (college/lycee/both), des coefficients par niveau
const DEFAULT_SUBJECTS = [
  // ─── Collège uniquement ───
  { id: 's-pct', name: 'PCT', cycles: ['college'], color: '#FCD34D',
    coefficients: { '6e': 2, '5e': 2, '4e': 3, '3e': 3 } },
  // ─── Lycée uniquement ───
  { id: 's-physique', name: 'Physique', cycles: ['lycee'], color: '#FDBA74',
    coefficients: { '2nde': 3, '1ere': 3, 'Tle': 3 } },
  { id: 's-chimie', name: 'Chimie', cycles: ['lycee'], color: '#FB923C',
    coefficients: { '2nde': 2, '1ere': 2, 'Tle': 2 } },
  { id: 's-philo', name: 'Philosophie', cycles: ['lycee'], color: '#E879F9',
    coefficients: { '2nde': 2, '1ere': 3, 'Tle': 4 } },
  // ─── Les deux cycles ───
  { id: 's-francais', name: 'Français', cycles: ['college', 'lycee'], color: '#93C5FD',
    coefficients: { '6e': 6, '5e': 6, '4e': 5, '3e': 5, '2nde': 4, '1ere': 4, 'Tle': 3 } },
  { id: 's-anglais', name: 'Anglais', cycles: ['college', 'lycee'], color: '#C4B5FD',
    coefficients: { '6e': 5, '5e': 5, '4e': 4, '3e': 4, '2nde': 3, '1ere': 3, 'Tle': 3 } },
  { id: 's-maths', name: 'Mathématiques', cycles: ['college', 'lycee'], color: '#FCA5A5',
    coefficients: { '6e': 6, '5e': 6, '4e': 5, '3e': 5, '2nde': 5, '1ere': 4, 'Tle': 4 } },
  { id: 's-svt', name: 'SVT', cycles: ['college', 'lycee'], color: '#6EE7B7',
    coefficients: { '6e': 2, '5e': 2, '4e': 2, '3e': 2, '2nde': 2, '1ere': 2, 'Tle': 2 } },
  { id: 's-hg', name: 'Histoire-Géographie', cycles: ['college', 'lycee'], color: '#A5B4FC',
    coefficients: { '6e': 3, '5e': 3, '4e': 3, '3e': 3, '2nde': 3, '1ere': 3, 'Tle': 2 } },
  { id: 's-eps', name: 'EPS', cycles: ['college', 'lycee'], color: '#67E8F9',
    coefficients: { '6e': 2, '5e': 2, '4e': 2, '3e': 2, '2nde': 2, '1ere': 2, 'Tle': 2 } },
  { id: 's-info', name: 'Informatique', cycles: ['college', 'lycee'], color: '#CBD5E1',
    coefficients: { '6e': 1, '5e': 1, '4e': 1, '3e': 1, '2nde': 2, '1ere': 2, 'Tle': 2 } },
  { id: 's-ecm', name: 'ECM', cycles: ['college', 'lycee'], color: '#F9A8D4',
    coefficients: { '6e': 1, '5e': 1, '4e': 1, '3e': 1, '2nde': 1, '1ere': 1, 'Tle': 1 } },
  { id: 's-espagnol', name: 'Espagnol', cycles: ['college', 'lycee'], color: '#5EEAD4',
    coefficients: { '4e': 2, '3e': 2, '2nde': 2, '1ere': 2, 'Tle': 2 } },
  { id: 's-allemand', name: 'Allemand', cycles: ['college', 'lycee'], color: '#D8B4FE',
    coefficients: { '4e': 2, '3e': 2, '2nde': 2, '1ere': 2, 'Tle': 2 } },
]

// ── PRIMAIRE : niveaux + disciplines (APC, pas de coefficient chiffré) ──
//
// Cette liste sert d'AIGUILLAGE : un niveau qui n'y figure pas est traité comme
// du secondaire, donc filtré par coefficient — et comme aucun coefficient n'est
// défini pour une classe du primaire, la classe se retrouvait SANS AUCUNE
// matière. Écran vide, aucune erreur : le défaut ne se voyait pas.
// C'est ce qui arrivait à un CP1 congolais ou ivoirien, absent de la liste
// camerounaise SIL/CP. On la construit donc à partir des niveaux du primaire de
// TOUS les pays connus, jamais d'un seul.
const PRIMAIRE_LEVELS = LEVELS_PRIMAIRE_TOUS.map((l) => l.value)

/**
 * Disciplines du primaire DE L'ÉCOLE.
 *
 * ⚠️ C'était la liste camerounaise en dur, servie à toute école primaire — une
 * école de Dakar recevait « Langues et cultures nationales ». Elle vient
 * maintenant du store, qui part d'une amorce et que l'école corrige.
 */
function primaireSubjectObjects() {
  let liste = DISCIPLINES_PRIMAIRE
  try { liste = useDisciplinesPrimaireStore().disciplines } catch (e) { /* hors app */ }
  return liste.map((d, i) => ({
    id: 'sp-' + i,
    name: d.name,
    domaine: d.domaine || '',
    cycles: ['primaire'],
    coefficients: {},
    color: SUBJECT_DEFAULT_COLORS[d.name] || '#CBD5E1',
  }))
}

export const useSubjectsStore = defineStore('subjects', () => {
  const subjects = ref([]) // Array of subject objects
  const loaded = ref(false)

  // ── Getters ──


  /**
   * Cycle d'un niveau, du point de vue des MATIÈRES.
   *
   * On interroge d'abord le référentiel de l'école : c'est elle qui sait si son
   * « Form 1 » est un premier ou un second cycle. On ne retombe sur l'heuristique
   * camerounaise que si elle n'a rien déclaré.
   */
  function cycleMatieres(level) {
    let cycle = null
    try { cycle = useNiveauxStore().cycleDe(level) } catch { cycle = null }
    if (cycle === 'primaire') return 'primaire'
    if (cycle === 'premier') return 'college'
    if (cycle === 'second') return 'lycee'
    if (PRIMAIRE_LEVELS.includes(level)) return 'primaire'
    return ['2nde', '1ere', 'Tle'].includes(level) ? 'lycee' : 'college'
  }

  /**
   * Matières d'un cycle pour un niveau donné.
   *
   * ⚠️ Le filtre par coefficient est ce qui rendait une classe VIDE. Un niveau
   * que l'école vient de déclarer n'a évidemment aucun coefficient : la liste
   * revenait donc vide, sans erreur, et l'enseignant ouvrait un écran désert.
   * On ne filtre par coefficient QUE si au moins une matière en porte un pour ce
   * niveau. Sinon on sert toutes les matières du cycle, et l'école affine ensuite.
   */
  function matieresDuCycle(cycle, level) {
    const duCycle = subjects.value.filter((s) => s.cycles?.includes(cycle))
    const avecCoeff = duCycle.filter((s) => {
      const c = s.coefficients?.[level]
      return c !== undefined && c > 0
    })
    return avecCoeff.length ? avecCoeff : duCycle
  }

  // Get all subject names for a class object (by level/cycle)
  function getSubjectsForClass(cls) {
    if (!cls) return []
    const level = cls.level || ''
    const cycle = cycleMatieres(level)
    if (cycle === 'primaire') return primaireSubjectObjects().map(s => s.name)
    return matieresDuCycle(cycle, level).map(s => s.name)
  }

  // Get all subject objects for a class (with full data)
  function getSubjectObjectsForClass(cls) {
    if (!cls) return []
    const level = cls.level || ''
    const cycle = cycleMatieres(level)
    if (cycle === 'primaire') return primaireSubjectObjects()
    return matieresDuCycle(cycle, level)
  }

  // Get coefficient for a specific subject and class
  function getCoeffForClass(subjectName, cls) {
    if (!cls) return 1
    const level = cls.level || ''
    const subject = subjects.value.find(s => s.name === subjectName)
    if (!subject) return 1
    return subject.coefficients?.[level] || 1
  }

  // Get subject by ID
  function getSubjectById(id) {
    return subjects.value.find(s => s.id === id)
  }

  // Get subject by name
  function getSubjectByName(name) {
    return subjects.value.find(s => s.name === name)
  }

  // Get all unique subject names
  const allSubjectNames = computed(() => subjects.value.map(s => s.name))

  // Get subjects by cycle
  function getSubjectsByCycle(cycle) {
    return subjects.value.filter(s => s.cycles.includes(cycle))
  }

  // ── CRUD ──

  function addSubject(subjectData) {
    const id = 's-' + Date.now().toString(36)
    const newSubject = {
      id,
      name: subjectData.name,
      cycles: subjectData.cycles || ['college', 'lycee'],
      color: subjectData.color || '#CBD5E1',
      coefficients: subjectData.coefficients || {},
    }
    subjects.value.push(newSubject)
    saveSubjects()
    return newSubject
  }

  function updateSubject(id, updates) {
    const idx = subjects.value.findIndex(s => s.id === id)
    if (idx === -1) return
    subjects.value[idx] = { ...subjects.value[idx], ...updates }
    saveSubjects()
  }

  function deleteSubject(id) {
    const subject = subjects.value.find(s => s.id === id)
    if (!subject) return
    subjects.value = subjects.value.filter(s => s.id !== id)
    saveSubjects()
  }

  // Update coefficient for a subject at a specific level
  function setCoefficient(subjectId, level, coeff) {
    const subject = subjects.value.find(s => s.id === subjectId)
    if (!subject) return
    if (!subject.coefficients) subject.coefficients = {}
    subject.coefficients[level] = coeff
    saveSubjects()
  }

  // ── Persistence ──

  async function saveSubjects() {
    const authStore = useAuthStore()
    const data = JSON.parse(JSON.stringify(subjects.value))

    if (authStore.isDemo) {
      localStorage.setItem(demoKey('edufrem_subjects'), JSON.stringify({
        version: DEMO_SUBJECTS_VERSION,
        subjects: data,
      }))
      return
    }

    try {
      const sid = authStore.schoolId
      if (!sid) return
      await setDoc(doc(db, 'schools', sid, 'config', 'subjects'), {
        subjects: data,
        updatedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Erreur sauvegarde matières:', err)
    }
  }

  async function loadSubjects() {
    const authStore = useAuthStore()

    if (authStore.isDemo) {
      const saved = localStorage.getItem(demoKey('edufrem_subjects'))
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.version === DEMO_SUBJECTS_VERSION && parsed.subjects?.length > 0) {
            subjects.value = parsed.subjects
            loaded.value = true
            return
          }
        } catch {}
      }
      // Initialize with defaults
      subjects.value = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS))
      saveSubjects()
      loaded.value = true
      return
    }

    try {
      const sid = authStore.schoolId
      if (!sid) {
        subjects.value = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS))
        loaded.value = true
        return
      }
      const snap = await getDoc(doc(db, 'schools', sid, 'config', 'subjects'))
      if (snap.exists() && snap.data().subjects?.length > 0) {
        subjects.value = snap.data().subjects
      } else {
        subjects.value = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS))
        await saveSubjects()
      }
      loaded.value = true
    } catch (err) {
      console.error('Erreur chargement matières:', err)
      subjects.value = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS))
      loaded.value = true
    }
  }

  return {
    subjects,
    loaded,
    allSubjectNames,
    getSubjectsForClass,
    getSubjectObjectsForClass,
    getCoeffForClass,
    getSubjectById,
    getSubjectByName,
    getSubjectsByCycle,
    addSubject,
    updateSubject,
    deleteSubject,
    setCoefficient,
    loadSubjects,
    saveSubjects,
  }
})
