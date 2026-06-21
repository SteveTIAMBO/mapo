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

export const GENDERS = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
]

export const STATUSES = [
  { value: 'inscrit', label: 'Inscrit' },
  { value: 'en_attente', label: 'En attente d\'inscription' },
  { value: 'diplome', label: 'Diplômé' },
  { value: 'transfere', label: 'Transféré' },
  { value: 'abandon', label: 'Abandon' },
  { value: 'exclu', label: 'Exclu' },
]

// Types de vulnérabilité (compatibles NOVA / CESA)
export const VULNERABILITY_TYPES = [
  { value: 'orphelin', label: 'Orphelin(e)' },
  { value: 'refugie', label: 'Réfugié(e)' },
  { value: 'deplacement_interne', label: 'Déplacé(e) interne' },
  { value: 'enfant_rue', label: 'Enfant de la rue' },
  { value: 'travail_enfant', label: 'Travail des enfants' },
  { value: 'autre', label: 'Autre situation' },
]

// Prenoms camerounais courants
const FIRST_NAMES_M = ['Jean', 'Paul', 'Samuel', 'David', 'Emmanuel', 'Patrick', 'François', 'Daniel', 'Joseph', 'Albert', 'Pierre', 'Henri', 'Marc', 'Stéphane', 'Kevin', 'Yannick', 'Olivier', 'Christian', 'Éric', 'Joël', 'Isaac', 'Benjamin', 'Armand', 'Cédric', 'Fabrice']
const FIRST_NAMES_F = ['Marie', 'Claire', 'Hélène', 'Brigitte', 'Sylvie', 'Rose', 'Jeanne', 'Bernadette', 'Julienne', 'Victoire', 'Anne', 'Céline', 'Sandrine', 'Florence', 'Grâce', 'Esther', 'Ruth', 'Vanessa', 'Christelle', 'Nadège', 'Pauline', 'Viviane', 'Colette', 'Irène', 'Monique']
const LAST_NAMES = ['Kamga', 'Mbarga', 'Ngo', 'Nana', 'Atangana', 'Fotso', 'Djomou', 'Kenfack', 'Ngono', 'Tagne', 'Mballa', 'Essomba', 'Teussop', 'Fouda', 'Nkoulou', 'Onana', 'Biyick', 'Ekotto', 'Mvondo', 'Ndjie', 'Tchinda', 'Simo', 'Mbianda', 'Tchoupo', 'Nkeng', 'Messi', 'Ndjock', 'Owona', 'Tamba', 'Eyebe', 'Belibi', 'Ongolo', 'Zang', 'Etoundi', 'Abega']
const CITIES = ['Yaounde', 'Douala', 'Bafoussam', 'Garoua', 'Bamenda']
const QUARTIERS_YDE = ['Santa Barbara', 'Bastos', 'Mvan', 'Essos', 'Nkolbisson', 'Biyem-Assi', 'Mendong', 'Emana', 'Ngousso', 'Mimboman', 'Nkoldongo', 'Mokolo']

// Classes demo
const DEMO_CLASSES = [
  '6ème A', '6ème B', '6ème C',
  '5ème A', '5ème B', '5ème C',
  '4ème A', '4ème B', '4ème C',
  '3ème A', '3ème B', '3ème C',
  '2nde A', '2nde B', '2nde C',
  '1ère A', '1ère C', '1ère D',
  'Tle A', 'Tle C', 'Tle D',
]

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateMatricule(year, index) {
  return `EDU${String(year).slice(2)}${String(index).padStart(4, '0')}`
}

function generateDemoStudents() {
  const students = []
  let id = 1

  DEMO_CLASSES.forEach((className) => {
    const count = Math.floor(Math.random() * 9) + 20
    for (let i = 0; i < count; i++) {
      const gender = Math.random() > 0.48 ? 'M' : 'F'
      const firstNames = gender === 'M' ? FIRST_NAMES_M : FIRST_NAMES_F
      const firstName = pickRandom(firstNames)
      const lastName = pickRandom(LAST_NAMES)
      const birthYear = className.startsWith('6') ? 2014 : className.startsWith('5') ? 2013 : className.startsWith('4') ? 2012 : className.startsWith('3') ? 2011 : className.startsWith('2') ? 2010 : className.startsWith('1') ? 2009 : 2008
      const birthMonth = Math.floor(Math.random() * 12) + 1
      const birthDay = Math.floor(Math.random() * 28) + 1
      const parentGender = Math.random() > 0.5 ? 'M' : 'F'
      const parentFirstNames = parentGender === 'M' ? FIRST_NAMES_M : FIRST_NAMES_F

      students.push({
        id: `e-${String(id).padStart(4, '0')}`,
        matricule: generateMatricule(birthYear, id),
        firstName,
        lastName,
        gender,
        dateOfBirth: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
        className,
        city: 'Yaounde',
        quartier: pickRandom(QUARTIERS_YDE),
        parentLastName: pickRandom(LAST_NAMES),
        parentFirstName: pickRandom(parentFirstNames),
        parentPhone: `+237 6${Math.floor(Math.random() * 4) + 5}${Math.floor(Math.random() * 10)} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        parentPhone2: Math.random() > 0.7 ? `+237 6${Math.floor(Math.random() * 4) + 5}${Math.floor(Math.random() * 10)} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}` : '',
        parentEmail: '',
        status: 'inscrit',
      })
      id++
    }
  })

  // Lier 2 élèves au compte demo parent (parent@demo)
  // Un en 6ème A, un en Tle D — on force les noms pour la cohérence familiale
  const child6e = students.find(s => s.className === '6ème A' && s.status === 'inscrit')
  const child3e = students.find(s => s.className === '3ème B' && s.status === 'inscrit')
  if (child6e) {
    child6e.firstName = 'François'
    child6e.lastName = 'Mbarga'
    child6e.gender = 'M'
    child6e.dateOfBirth = '2013-04-12'
    child6e.parentEmail = 'parent@demo'
    child6e.parentLastName = 'Mbarga'
    child6e.parentFirstName = 'Thomas'
  }
  if (child3e) {
    child3e.firstName = 'Hélène'
    child3e.lastName = 'Mbarga'
    child3e.gender = 'F'
    child3e.dateOfBirth = '2008-09-28'
    child3e.className = 'Tle D'
    child3e.parentEmail = 'parent@demo'
    child3e.parentLastName = 'Mbarga'
    child3e.parentFirstName = 'Thomas'
    child3e.childAccountAuthorized = true
    child3e.studentEmail = 'eleve@demo'
  }

  // Ajouter des exemples pour chaque statut non-inscrit
  // Transferes (2 eleves)
  students.push({
    id: `e-${String(id++).padStart(4, '0')}`,
    matricule: generateMatricule(2013, id),
    firstName: 'Rodrigue', lastName: 'Belibi', gender: 'M',
    dateOfBirth: '2013-03-15', className: '5ème A',
    city: 'Yaounde', quartier: 'Bastos',
    parentLastName: 'Belibi', parentFirstName: 'Thomas',
    parentPhone: '+237 699 100 200', parentPhone2: '',
    status: 'transfere',
  })
  students.push({
    id: `e-${String(id++).padStart(4, '0')}`,
    matricule: generateMatricule(2012, id),
    firstName: 'Sandrine', lastName: 'Ongolo', gender: 'F',
    dateOfBirth: '2012-07-22', className: '4ème B',
    city: 'Douala', quartier: 'Akwa',
    parentLastName: 'Ongolo', parentFirstName: 'Pierre',
    parentPhone: '+237 677 300 400', parentPhone2: '',
    status: 'transfere',
  })

  // Abandons (2 eleves)
  students.push({
    id: `e-${String(id++).padStart(4, '0')}`,
    matricule: generateMatricule(2011, id),
    firstName: 'Kevin', lastName: 'Zang', gender: 'M',
    dateOfBirth: '2011-11-08', className: '3ème C',
    city: 'Yaounde', quartier: 'Mvan',
    parentLastName: 'Zang', parentFirstName: 'Julienne',
    parentPhone: '+237 690 500 600', parentPhone2: '',
    status: 'abandon',
  })
  students.push({
    id: `e-${String(id++).padStart(4, '0')}`,
    matricule: generateMatricule(2014, id),
    firstName: 'Christelle', lastName: 'Etoundi', gender: 'F',
    dateOfBirth: '2014-01-30', className: '6ème B',
    city: 'Yaounde', quartier: 'Essos',
    parentLastName: 'Etoundi', parentFirstName: 'David',
    parentPhone: '+237 655 700 800', parentPhone2: '',
    status: 'abandon',
  })

  // Exclus (2 eleves)
  students.push({
    id: `e-${String(id++).padStart(4, '0')}`,
    matricule: generateMatricule(2010, id),
    firstName: 'Armand', lastName: 'Abega', gender: 'M',
    dateOfBirth: '2010-05-12', className: '2nde A',
    city: 'Yaounde', quartier: 'Mendong',
    parentLastName: 'Abega', parentFirstName: 'Hélène',
    parentPhone: '+237 699 900 100', parentPhone2: '',
    status: 'exclu',
  })
  students.push({
    id: `e-${String(id++).padStart(4, '0')}`,
    matricule: generateMatricule(2009, id),
    firstName: 'Vanessa', lastName: 'Tamba', gender: 'F',
    dateOfBirth: '2009-09-18', className: '1ère C',
    city: 'Yaounde', quartier: 'Biyem-Assi',
    parentLastName: 'Tamba', parentFirstName: 'Samuel',
    parentPhone: '+237 677 200 300', parentPhone2: '',
    status: 'exclu',
  })

  return students
}

// Écoliers de démo pour l'édition PRIMAIRE (3 par classe SIL → CM2).
function generatePrimaireStudents() {
  const PRIMAIRE = [
    { name: 'SIL', year: 2019, count: 38 }, { name: 'CP', year: 2018, count: 42 },
    { name: 'CE1', year: 2017, count: 40 }, { name: 'CE2', year: 2016, count: 36 },
    { name: 'CM1', year: 2015, count: 34 }, { name: 'CM2 A', year: 2014, count: 33 }, { name: 'CM2 B', year: 2014, count: 31 },
  ]
  const students = []
  let id = 1
  PRIMAIRE.forEach(({ name, year, count }) => {
    for (let i = 0; i < count; i++) {
      const gender = Math.random() > 0.48 ? 'M' : 'F'
      const firstNames = gender === 'M' ? FIRST_NAMES_M : FIRST_NAMES_F
      students.push({
        id: `ep-${String(id).padStart(4, '0')}`,
        matricule: generateMatricule(year, id),
        firstName: pickRandom(firstNames),
        lastName: pickRandom(LAST_NAMES),
        gender,
        dateOfBirth: `${year}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        className: name,
        city: 'Douala',
        quartier: pickRandom(QUARTIERS_YDE),
        parentLastName: pickRandom(LAST_NAMES),
        parentFirstName: pickRandom(FIRST_NAMES_M),
        parentPhone: `+237 6${Math.floor(Math.random() * 4) + 5}${Math.floor(Math.random() * 10)} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        parentPhone2: '',
        parentEmail: '',
        status: 'inscrit',
      })
      id++
    }
  })
  return students
}

const DEMO_ELEVES_KEY = 'mapo_demo_eleves'
const DEMO_ELEVES_VERSION_KEY = 'mapo_demo_eleves_version'
const DEMO_ELEVES_VERSION = 10 // v10: démo primaire enrichie (~254 écoliers SIL-CM2)

export const useElevesStore = defineStore('eleves', () => {
  const eleves = ref([])
  const loading = ref(false)
  const searchQuery = ref('')
  const selectedClass = ref('')
  const selectedStatus = ref('')

  const filteredEleves = computed(() => {
    return eleves.value.filter((e) => {
      const matchesSearch =
        !searchQuery.value ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        `${e.lastName} ${e.firstName}`.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (e.matricule || '').toLowerCase().includes(searchQuery.value.toLowerCase())

      const matchesClass =
        !selectedClass.value ||
        e.className === selectedClass.value

      const matchesStatus =
        !selectedStatus.value ||
        e.status === selectedStatus.value

      return matchesSearch && matchesClass && matchesStatus
    })
  })

  const elevesStats = computed(() => {
    const stats = {
      total: eleves.value.length, garcons: 0, filles: 0, inscrits: 0,
      handicap: 0, redoublants: 0, boursiers: 0, vulnerables: 0,
    }
    eleves.value.forEach((e) => {
      if (e.gender === 'M') stats.garcons++
      else if (e.gender === 'F') stats.filles++
      if (e.status === 'inscrit') stats.inscrits++
      if (e.handicap) stats.handicap++
      if (e.redoublant) stats.redoublants++
      if (e.boursier) stats.boursiers++
      if (e.vulnerabilities && e.vulnerabilities.length > 0) stats.vulnerables++
    })
    return stats
  })

  const classesList = computed(() => {
    const set = new Set(eleves.value.map(e => e.className))
    return [...set].sort()
  })

  // Suffixe de clé démo selon l'édition (primaire = cache séparé).
  function demoSuffix() { return useEditionStore().isPrimaire ? '_primaire' : '' }

  // Helpers demo localStorage
  function saveDemoEleves() {
    try { localStorage.setItem(DEMO_ELEVES_KEY + demoSuffix(), JSON.stringify(eleves.value)) } catch (e) { /* silent */ }
  }
  function loadDemoEleves() {
    try {
      const raw = localStorage.getItem(DEMO_ELEVES_KEY + demoSuffix())
      return raw ? JSON.parse(raw) : null
    } catch (e) { return null }
  }

  const loadEleves = async () => {
    const authStore = useAuthStore()
    loading.value = true

    if (authStore.isDemo) {
      const ed = useEditionStore()
      const savedVersion = localStorage.getItem(DEMO_ELEVES_VERSION_KEY + demoSuffix())
      const saved = (savedVersion === String(DEMO_ELEVES_VERSION)) ? loadDemoEleves() : null
      eleves.value = saved || (ed.isPrimaire ? generatePrimaireStudents() : generateDemoStudents())
      if (!saved) {
        localStorage.setItem(DEMO_ELEVES_VERSION_KEY + demoSuffix(), String(DEMO_ELEVES_VERSION))
        saveDemoEleves()
      }
      loading.value = false
      return
    }

    if (!authStore.schoolId) { loading.value = false; return }

    try {
      const collectionRef = collection(db, 'schools', authStore.schoolId, 'eleves')
      const querySnapshot = await getDocs(collectionRef)
      eleves.value = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (error) {
      console.error('Erreur chargement élèves:', error)
    } finally {
      loading.value = false
    }
  }

  const addEleve = async (eleve) => {
    const authStore = useAuthStore()
    let resultId = null

    if (authStore.isDemo) {
      const newEleve = { id: Date.now().toString(), ...eleve }
      eleves.value.push(newEleve)
      saveDemoEleves()
      resultId = newEleve.id
    } else {
      if (!authStore.schoolId) return
      try {
        const collectionRef = collection(db, 'schools', authStore.schoolId, 'eleves')
        const docRef = await addDoc(collectionRef, eleve)
        eleves.value.push({ id: docRef.id, ...eleve })
        resultId = docRef.id
      } catch (error) {
        console.error('Erreur ajout élève:', error)
      }
    }

    // Log activity in both modes
    if (resultId) {
      try {
        const { useActivityStore } = await import('./activity')
        const actStore = useActivityStore()
        actStore.loadActivities()
        actStore.log('eleve', `${eleve.lastName} ${eleve.firstName} inscrit(e) en ${eleve.className || '?'}`)
      } catch {}
    }

    return resultId
  }

  const updateEleve = async (id, data) => {
    const authStore = useAuthStore()
    const index = eleves.value.findIndex((e) => e.id === id)
    if (index !== -1) eleves.value[index] = { ...eleves.value[index], ...data }
    if (authStore.isDemo) { saveDemoEleves(); return }
    if (!authStore.schoolId) return
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'eleves', id)
      await updateDoc(docRef, data)
    } catch (error) { console.error('Erreur mise à jour élève:', error) }
  }

  const deleteEleve = async (id) => {
    const authStore = useAuthStore()
    eleves.value = eleves.value.filter((e) => e.id !== id)
    if (authStore.isDemo) { saveDemoEleves(); return }
    if (!authStore.schoolId) return
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'eleves', id)
      await deleteDoc(docRef)
    } catch (error) { console.error('Erreur suppression élève:', error) }
  }

  // Générer un matricule unique
  const generateNextMatricule = () => {
    const year = new Date().getFullYear()
    const prefix = `EDU${String(year).slice(2)}`
    const existing = eleves.value
      .map(e => e.matricule)
      .filter(m => m && m.startsWith(prefix))
      .map(m => parseInt(m.replace(prefix, ''), 10))
      .filter(n => !isNaN(n))
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
    return `${prefix}${String(next).padStart(4, '0')}`
  }

  return {
    eleves, loading, searchQuery, selectedClass, selectedStatus,
    filteredEleves, elevesStats, classesList,
    loadEleves, addEleve, updateEleve, deleteEleve,
    generateNextMatricule, saveDemoEleves,
  }
})
