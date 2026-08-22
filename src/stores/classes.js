import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import { useEditionStore } from './edition'
import { demoSuffix as demoSuffixGlobal, paysDemo } from '../utils/demoScope'
import { packPays, localiserNomComplet, appliquerSeries, PAYS_DEMO } from '../data/paysDemo'
import { NOMS_REFERENCE } from '../data/nomsDemo'
import { useNiveauxStore } from './niveaux'

export const LEVELS = [
  { value: '6e', label: '6ème', cycle: 'premier' },
  { value: '5e', label: '5ème', cycle: 'premier' },
  { value: '4e', label: '4ème', cycle: 'premier' },
  { value: '3e', label: '3ème', cycle: 'premier' },
  { value: '2nde', label: '2nde', cycle: 'second' },
  { value: '1ere', label: '1ère', cycle: 'second' },
  { value: 'Tle', label: 'Terminale', cycle: 'second' },
]

// Niveaux du PRIMAIRE (édition 'primaire') — programme camerounais SIL → CM2.
export const LEVELS_PRIMAIRE = [
  { value: 'SIL', label: 'SIL', cycle: 'primaire' },
  { value: 'CP', label: 'CP', cycle: 'primaire' },
  { value: 'CE1', label: 'CE1', cycle: 'primaire' },
  { value: 'CE2', label: 'CE2', cycle: 'primaire' },
  { value: 'CM1', label: 'CM1', cycle: 'primaire' },
  { value: 'CM2', label: 'CM2', cycle: 'primaire' },
]

/**
 * Niveaux du PRIMAIRE au Congo-Brazzaville — CP1 → CM2, six ans.
 *
 * Le Congo n'a pas de SIL : le primaire démarre à CP1 et CP2, là où le Cameroun
 * a SIL puis CP. Servir la liste camerounaise à une école congolaise l'obligerait
 * à ranger ses écoliers dans une classe qui n'existe pas chez elle.
 *
 * Structure sourcée : loi n° 25-95 du 17 novembre 1995 (art. 13) — le primaire
 * est organisé en deux cycles, « cycle d'éveil » puis « cycle de fixation ».
 * Répartition des six classes dans ces deux cycles : tableau « Structure du
 * système scolaire », MEPSA 2008, repris par l'ODSEF (Université Laval, 2015).
 * Le second cycle du secondaire est inchangé (6e → Tle) : la structure
 * congolaise est identique à celle déjà servie par LEVELS.
 */
export const LEVELS_PRIMAIRE_CG = [
  { value: 'CP1', label: 'CP1', cycle: 'primaire' },
  { value: 'CP2', label: 'CP2', cycle: 'primaire' },
  { value: 'CE1', label: 'CE1', cycle: 'primaire' },
  { value: 'CE2', label: 'CE2', cycle: 'primaire' },
  { value: 'CM1', label: 'CM1', cycle: 'primaire' },
  { value: 'CM2', label: 'CM2', cycle: 'primaire' },
]

/**
 * Niveaux de l'ÉLÉMENTAIRE au Sénégal — CI → CM2, six ans.
 *
 * Le Sénégal commence au cours d'initiation (CI) là où le Cameroun a la SIL et
 * le Congo le CP1 : trois pays, trois noms pour la première année d'école.
 * Source : ministère de l'Éducation nationale (education.sn) et
 * senegalecoles.com/systeme-educatif-2-enseignement-elementaire.html — six ans,
 * de 7 à 12 ans, CI, CP, CE1, CE2, CM1, CM2.
 */
export const LEVELS_PRIMAIRE_SN = [
  { value: 'CI', label: 'CI', cycle: 'primaire' },
  { value: 'CP', label: 'CP', cycle: 'primaire' },
  { value: 'CE1', label: 'CE1', cycle: 'primaire' },
  { value: 'CE2', label: 'CE2', cycle: 'primaire' },
  { value: 'CM1', label: 'CM1', cycle: 'primaire' },
  { value: 'CM2', label: 'CM2', cycle: 'primaire' },
]

/**
 * Niveaux de l'école ÉLÉMENTAIRE en France — CP → CM2, CINQ ans.
 *
 * ⚠️ Une année de moins que partout ailleurs dans cette liste : la grande
 * section de maternelle n'est pas de l'élémentaire. Servir une liste de six
 * niveaux à une école française lui ferait inventer une classe qui n'existe pas.
 * Source : education.gouv.fr, « L'école élémentaire ».
 */
export const LEVELS_PRIMAIRE_FR = [
  { value: 'CP', label: 'CP', cycle: 'primaire' },
  { value: 'CE1', label: 'CE1', cycle: 'primaire' },
  { value: 'CE2', label: 'CE2', cycle: 'primaire' },
  { value: 'CM1', label: 'CM1', cycle: 'primaire' },
  { value: 'CM2', label: 'CM2', cycle: 'primaire' },
]

const PRIMAIRE_PAR_PAYS = {
  CG: LEVELS_PRIMAIRE_CG,
  SN: LEVELS_PRIMAIRE_SN,
  FR: LEVELS_PRIMAIRE_FR,
}

/** Niveaux du primaire du pays de l'école. Pays sans liste propre → Cameroun. */
export function levelsPrimairePour(pays) {
  return PRIMAIRE_PAR_PAYS[pays] || LEVELS_PRIMAIRE
}

/**
 * Tous les niveaux connus, tous pays et tous cycles confondus. Sert à RECONNAÎTRE
 * un niveau saisi ou importé — jamais à en proposer une liste à l'écran, sinon on
 * remettrait sous les yeux d'une école congolaise la SIL camerounaise.
 */
export const LEVELS_TOUS = (() => {
  const vus = new Set()
  const out = []
  for (const l of [...LEVELS, ...LEVELS_PRIMAIRE, ...Object.values(PRIMAIRE_PAR_PAYS).flat()]) {
    if (vus.has(l.value)) continue
    vus.add(l.value)
    out.push(l)
  }
  return out
})()

export const SECTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
]

// Données de démo — Collège EDUFREM Yaoundé, 3 classes par niveau (6e→Tle)
const DEMO_CLASSES = [
  // 6ème
  { id: 'c-6a', name: '6ème A', level: '6e', section: 'A', capacity: 60, enrolled: 52, homeroomTeacher: 'Jean Kamga', homeroomTeacherId: null },
  { id: 'c-6b', name: '6ème B', level: '6e', section: 'B', capacity: 60, enrolled: 58, homeroomTeacher: 'Paul Mbarga', homeroomTeacherId: null },
  { id: 'c-6c', name: '6ème C', level: '6e', section: 'C', capacity: 60, enrolled: 45, homeroomTeacher: 'Claire Ngo', homeroomTeacherId: null },
  // 5ème
  { id: 'c-5a', name: '5ème A', level: '5e', section: 'A', capacity: 55, enrolled: 50, homeroomTeacher: 'François Nana', homeroomTeacherId: null },
  { id: 'c-5b', name: '5ème B', level: '5e', section: 'B', capacity: 55, enrolled: 53, homeroomTeacher: 'Marie Atangana', homeroomTeacherId: null },
  { id: 'c-5c', name: '5ème C', level: '5e', section: 'C', capacity: 55, enrolled: 48, homeroomTeacher: 'Alain Fotso', homeroomTeacherId: null },
  // 4ème
  { id: 'c-4a', name: '4ème A', level: '4e', section: 'A', capacity: 50, enrolled: 47, homeroomTeacher: 'Hélène Djomou', homeroomTeacherId: null },
  { id: 'c-4b', name: '4ème B', level: '4e', section: 'B', capacity: 50, enrolled: 50, homeroomTeacher: 'Samuel Kenfack', homeroomTeacherId: null },
  { id: 'c-4c', name: '4ème C', level: '4e', section: 'C', capacity: 50, enrolled: 42, homeroomTeacher: 'Brigitte Ngono', homeroomTeacherId: null },
  // 3ème
  { id: 'c-3a', name: '3ème A', level: '3e', section: 'A', capacity: 50, enrolled: 49, homeroomTeacher: 'Joseph Tagne', homeroomTeacherId: null },
  { id: 'c-3b', name: '3ème B', level: '3e', section: 'B', capacity: 50, enrolled: 46, homeroomTeacher: 'Sylvie Mballa', homeroomTeacherId: null },
  { id: 'c-3c', name: '3ème C', level: '3e', section: 'C', capacity: 50, enrolled: 44, homeroomTeacher: 'Patrick Essomba', homeroomTeacherId: null },
  // 2nde
  { id: 'c-2a', name: '2nde A', level: '2nde', section: 'A', capacity: 45, enrolled: 43, homeroomTeacher: 'Rosalie Tchinda', homeroomTeacherId: null },
  { id: 'c-2b', name: '2nde B', level: '2nde', section: 'B', capacity: 45, enrolled: 40, homeroomTeacher: 'Emmanuel Simo', homeroomTeacherId: null },
  { id: 'c-2c', name: '2nde C', level: '2nde', section: 'C', capacity: 45, enrolled: 38, homeroomTeacher: 'Anne Mbianda', homeroomTeacherId: null },
  // 1ère (série = A littéraire, C sci-maths, D sci-bio)
  { id: 'c-1a', name: '1ère A', level: '1ere', section: 'A', serie: 'A', capacity: 40, enrolled: 38, homeroomTeacher: 'Daniel Tchoupo', homeroomTeacherId: null },
  { id: 'c-1c', name: '1ère C', level: '1ere', section: 'C', serie: 'C', capacity: 40, enrolled: 35, homeroomTeacher: 'Victoire Nkeng', homeroomTeacherId: null },
  { id: 'c-1d', name: '1ère D', level: '1ere', section: 'D', serie: 'D', capacity: 40, enrolled: 37, homeroomTeacher: 'Georges Fouda', homeroomTeacherId: null },
  // Terminale
  { id: 'c-ta', name: 'Tle A', level: 'Tle', section: 'A', serie: 'A', capacity: 40, enrolled: 36, homeroomTeacher: 'Jeanne Messi', homeroomTeacherId: null },
  { id: 'c-tc', name: 'Tle C', level: 'Tle', section: 'C', serie: 'C', capacity: 40, enrolled: 33, homeroomTeacher: 'Richard Ndjock', homeroomTeacherId: null },
  { id: 'c-td', name: 'Tle D', level: 'Tle', section: 'D', serie: 'D', capacity: 40, enrolled: 31, homeroomTeacher: 'Cécile Owona', homeroomTeacherId: null },
]

// Classes de démo pour l'édition PRIMAIRE (SIL → CM2). Clés démo namespacées
// par édition (suffixe _primaire) → la démo secondaire reste inchangée.
const DEMO_CLASSES_PRIMAIRE = [
  { id: 'cp-sil', name: 'SIL', level: 'SIL', section: '', capacity: 45, enrolled: 38, homeroomTeacher: 'Bernadette Atangana', homeroomTeacherId: null },
  { id: 'cp-cp', name: 'CP', level: 'CP', section: '', capacity: 45, enrolled: 42, homeroomTeacher: 'Pierre Manga', homeroomTeacherId: null },
  { id: 'cp-ce1', name: 'CE1', level: 'CE1', section: '', capacity: 45, enrolled: 40, homeroomTeacher: 'Estelle Ndongo', homeroomTeacherId: null },
  { id: 'cp-ce2', name: 'CE2', level: 'CE2', section: '', capacity: 45, enrolled: 36, homeroomTeacher: 'Joseph Bilong', homeroomTeacherId: null },
  { id: 'cp-cm1', name: 'CM1', level: 'CM1', section: '', capacity: 40, enrolled: 34, homeroomTeacher: 'Brigitte Eyenga', homeroomTeacherId: null },
  { id: 'cp-cm2a', name: 'CM2 A', level: 'CM2', section: 'A', capacity: 40, enrolled: 33, homeroomTeacher: 'Sylvie Manga', homeroomTeacherId: null },
  { id: 'cp-cm2b', name: 'CM2 B', level: 'CM2', section: 'B', capacity: 38, enrolled: 31, homeroomTeacher: 'André Tchoua', homeroomTeacherId: null },
]

const DEMO_CLASSES_KEY = 'mapo_demo_classes'
const DEMO_CLASSES_VERSION_KEY = 'mapo_demo_classes_version'
const DEMO_CLASSES_VERSION = 3 // v3: effectifs démo primaire enrichis

export const useClassesStore = defineStore('classes', () => {
  const classes = ref([])
  const loading = ref(false)
  const searchQuery = ref('')
  const selectedLevel = ref('')

  const filteredClasses = computed(() => {
    return classes.value.filter((cls) => {
      const matchesSearch =
        !searchQuery.value ||
        cls.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (cls.homeroomTeacher || '').toLowerCase().includes(searchQuery.value.toLowerCase())

      const matchesLevel =
        !selectedLevel.value ||
        cls.level === selectedLevel.value

      return matchesSearch && matchesLevel
    })
  })

  const classStats = computed(() => {
    const stats = { total: classes.value.length, premier: 0, second: 0, totalStudents: 0 }
    classes.value.forEach((cls) => {
      // Le cycle vient du référentiel de l'école. Avant, il était cherché dans la
      // seule liste 6e-Tle : une école primaire ou anglophone affichait donc
      // « premier : 0, second : 0 » sur son tableau de bord, sans explication.
      let cycle = null
      try { cycle = useNiveauxStore().cycleDe(cls.level) } catch { cycle = null }
      if (!cycle) cycle = LEVELS.find((l) => l.value === cls.level)?.cycle || null
      if (cycle === 'premier') stats.premier++
      else if (cycle === 'second') stats.second++
      stats.totalStudents += cls.enrolled || 0
    })
    return stats
  })

  // Resynchronise l'effectif de chaque classe sur le nombre RÉEL d'élèves
  // inscrits (source de vérité = store élèves). Évite l'incohérence démo
  // entre l'effectif codé en dur des classes et le total réel d'élèves.
  function syncEnrollment(elevesList) {
    if (!Array.isArray(elevesList) || elevesList.length === 0) return
    const counts = {}
    for (const e of elevesList) {
      if (e.status && e.status !== 'inscrit') continue
      if (!e.className) continue
      counts[e.className] = (counts[e.className] || 0) + 1
    }
    let changed = false
    for (const cls of classes.value) {
      const n = counts[cls.name] || 0
      if (cls.enrolled !== n) { cls.enrolled = n; changed = true }
    }
    if (changed) saveDemoClasses()
  }

  // Suffixe de clé démo : édition ET pays. Source unique, utils/demoScope.js —
  // ce fichier en gardait une copie locale qui ignorait le pays.
  function demoSuffix() { return demoSuffixGlobal() }

  // Helpers demo localStorage
  function saveDemoClasses() {
    try { localStorage.setItem(DEMO_CLASSES_KEY + demoSuffix(), JSON.stringify(classes.value)) } catch (e) { /* silent */ }
  }
  function loadDemoClasses() {
    try {
      const raw = localStorage.getItem(DEMO_CLASSES_KEY + demoSuffix())
      return raw ? JSON.parse(raw) : null
    } catch (e) { return null }
  }

  const loadClasses = async () => {
    const authStore = useAuthStore()
    loading.value = true

    if (authStore.isDemo) {
      const ed = useEditionStore()
      const savedVer = localStorage.getItem(DEMO_CLASSES_VERSION_KEY + demoSuffix())
      const saved = (savedVer === String(DEMO_CLASSES_VERSION)) ? loadDemoClasses() : null
      // Classes de démo DU PAYS choisi. Le primaire change de niveaux (CP1/CP2
      // au Congo, SIL/CP au Cameroun) ; le secondaire a la même structure dans
      // les deux pays (6e → Tle, séries A, C, D), seuls les noms des professeurs
      // principaux sont localisés.
      const pack = packPays(paysDemo())
      const base = ed.isPrimaire
        ? (pack.classesPrimaire || DEMO_CLASSES_PRIMAIRE)
        : appliquerSeries(
            DEMO_CLASSES.map((c) => ({ ...c, homeroomTeacher: localiserNomComplet(c.homeroomTeacher, NOMS_REFERENCE, pack) })),
            PAYS_DEMO.CM,
            pack,
          )
      classes.value = saved || base.map((c) => ({ ...c }))
      if (!saved) {
        localStorage.setItem(DEMO_CLASSES_VERSION_KEY + demoSuffix(), String(DEMO_CLASSES_VERSION))
        saveDemoClasses()
      }
      loading.value = false
      return
    }

    if (!authStore.schoolId) {
      loading.value = false
      return
    }

    try {
      const collectionRef = collection(db, 'schools', authStore.schoolId, 'classes')
      const querySnapshot = await getDocs(collectionRef)
      classes.value = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      localStorage.setItem('classes', JSON.stringify(classes.value))
    } catch (error) {
      console.error('Error loading classes:', error)
      const stored = localStorage.getItem('classes')
      if (stored) classes.value = JSON.parse(stored)
    } finally {
      loading.value = false
    }
  }

  const addClass = async (cls) => {
    const authStore = useAuthStore()

    if (authStore.isDemo) {
      const newClass = { id: Date.now().toString(), ...cls }
      classes.value.push(newClass)
      saveDemoClasses()
      return newClass.id
    }

    if (!authStore.schoolId) return

    try {
      const collectionRef = collection(db, 'schools', authStore.schoolId, 'classes')
      const docRef = await addDoc(collectionRef, cls)
      classes.value.push({ id: docRef.id, ...cls })
      localStorage.setItem('classes', JSON.stringify(classes.value))
      return docRef.id
    } catch (error) {
      console.error('Error adding class:', error)
      const newClass = { id: Date.now().toString(), ...cls }
      classes.value.push(newClass)
      localStorage.setItem('classes', JSON.stringify(classes.value))
      return newClass.id
    }
  }

  const updateClass = async (id, data) => {
    const authStore = useAuthStore()
    const index = classes.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      classes.value[index] = { ...classes.value[index], ...data }
    }

    if (authStore.isDemo) {
      saveDemoClasses()
      return
    }

    if (!authStore.schoolId) return

    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'classes', id)
      await updateDoc(docRef, data)
      localStorage.setItem('classes', JSON.stringify(classes.value))
    } catch (error) {
      console.error('Error updating class:', error)
      localStorage.setItem('classes', JSON.stringify(classes.value))
    }
  }

  const deleteClass = async (id) => {
    const authStore = useAuthStore()
    classes.value = classes.value.filter((c) => c.id !== id)

    if (authStore.isDemo) {
      saveDemoClasses()
      return
    }

    if (!authStore.schoolId) return

    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'classes', id)
      await deleteDoc(docRef)
      localStorage.setItem('classes', JSON.stringify(classes.value))
    } catch (error) {
      console.error('Error deleting class:', error)
      localStorage.setItem('classes', JSON.stringify(classes.value))
    }
  }

  return {
    classes, loading, searchQuery, selectedLevel,
    filteredClasses, classStats,
    loadClasses, addClass, updateClass, deleteClass, syncEnrollment,
  }
})
