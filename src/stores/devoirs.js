import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, auth } from '../firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { demoKey } from '../utils/demoScope'
import { useElevesStore } from './eleves'
import { useClassesStore } from './classes'

export const DEVOIR_TYPES = [
  { value: 'devoir_maison', label: 'Devoir de maison' },
  { value: 'exercice', label: 'Exercice' },
  { value: 'projet', label: 'Projet' },
  { value: 'expose', label: 'Exposé' },
  { value: 'recherche', label: 'Recherche' },
]

export const DEVOIR_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',    // Date limite dépassée
  GRADED: 'graded',    // Noté par l'enseignant
}

const DEMO_DEVOIRS_KEY = 'mapo_demo_devoirs'
const DEMO_DEVOIRS_VERSION_KEY = 'mapo_demo_devoirs_version'
const DEMO_DEVOIRS_VERSION = 4 // v4: devoirs année complète, Hélène en Tle D, plus de devoirs

export const useDevoirsStore = defineStore('devoirs', () => {
  const devoirs = ref([])
  const submissions = ref({}) // { [devoirId_eleveId]: { ... } }
  const loading = ref(false)

  // ── Getters ──

  const devoirsCount = computed(() => devoirs.value.length)

  // Devoirs filtrés par classe
  function getDevoirsByClass(className) {
    return devoirs.value
      .filter(d => d.className === className)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  // Devoirs filtrés par classe + matière
  function getDevoirsByClassAndSubject(className, subjectName) {
    return devoirs.value
      .filter(d => d.className === className && d.subjectName === subjectName)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  // Devoirs pour un élève (par son className)
  function getDevoirsForEleve(eleveClassName) {
    return devoirs.value
      .filter(d => d.className === eleveClassName)
      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
  }

  // Devoirs à venir (date limite pas encore passée)
  function getUpcomingDevoirs(className) {
    const now = new Date().toISOString().split('T')[0]
    return devoirs.value
      .filter(d => d.className === className && d.dueDate >= now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  }

  // Devoirs en retard (date passée, pas de soumission)
  function getOverdueDevoirs(eleveId, eleveClassName) {
    const now = new Date().toISOString().split('T')[0]
    return devoirs.value
      .filter(d => d.className === eleveClassName && d.dueDate < now && d.isDigital && !getSubmission(d.id, eleveId))
      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
  }

  // Stats pour un enseignant
  function getTeacherStats(className) {
    const classDevoirs = getDevoirsByClass(className)
    const now = new Date().toISOString().split('T')[0]
    return {
      total: classDevoirs.length,
      active: classDevoirs.filter(d => d.dueDate >= now).length,
      past: classDevoirs.filter(d => d.dueDate < now).length,
      digital: classDevoirs.filter(d => d.isDigital).length,
    }
  }

  // ── Submissions ──

  function submissionKey(devoirId, eleveId) {
    return `${devoirId}_${eleveId}`
  }

  function getSubmission(devoirId, eleveId) {
    return submissions.value[submissionKey(devoirId, eleveId)] || null
  }

  function getSubmissionsForDevoir(devoirId) {
    const results = []
    for (const key in submissions.value) {
      if (key.startsWith(`${devoirId}_`)) {
        const eleveId = key.replace(`${devoirId}_`, '')
        results.push({ ...submissions.value[key], eleveId })
      }
    }
    return results
  }

  function getSubmissionStats(devoirId, classEleves) {
    const subs = getSubmissionsForDevoir(devoirId)
    return {
      submitted: subs.length,
      total: classEleves.length,
      graded: subs.filter(s => s.grade !== null && s.grade !== undefined).length,
    }
  }

  // Soumettre un devoir (élève)
  function submitDevoir(devoirId, eleveId, content, attachmentName) {
    const key = submissionKey(devoirId, eleveId)
    submissions.value[key] = {
      submittedAt: new Date().toISOString(),
      content: content || '',
      attachmentName: attachmentName || '',
      grade: null,
      gradedAt: null,
      gradedBy: null,
      feedback: '',
    }
    saveAll()
  }

  // Noter une soumission (enseignant)
  function gradeSubmission(devoirId, eleveId, grade, feedback, gradedBy) {
    const key = submissionKey(devoirId, eleveId)
    if (!submissions.value[key]) return
    submissions.value[key].grade = grade
    submissions.value[key].gradedAt = new Date().toISOString()
    submissions.value[key].gradedBy = gradedBy
    submissions.value[key].feedback = feedback || ''
    saveAll()
  }

  // ── CRUD Devoirs ──

  async function addDevoir(devoir) {
    const authStore = useAuthStore()
    const newDevoir = {
      id: Date.now().toString(),
      ...devoir,
      createdAt: new Date().toISOString(),
    }

    if (authStore.isDemo) {
      devoirs.value.push(newDevoir)
      saveAll()
      return newDevoir.id
    }

    if (!authStore.schoolId) return null
    try {
      const collectionRef = collection(db, 'schools', authStore.schoolId, 'devoirs')
      const docRef = await addDoc(collectionRef, devoir)
      devoirs.value.push({ ...newDevoir, id: docRef.id })
      saveAll()
      return docRef.id
    } catch (err) {
      console.error('Erreur ajout devoir:', err)
      devoirs.value.push(newDevoir)
      saveAll()
      return newDevoir.id
    }
  }

  async function updateDevoir(id, data) {
    const authStore = useAuthStore()
    const index = devoirs.value.findIndex(d => d.id === id)
    if (index !== -1) devoirs.value[index] = { ...devoirs.value[index], ...data }

    if (authStore.isDemo) { saveAll(); return }
    if (!authStore.schoolId) return
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'devoirs', id)
      await updateDoc(docRef, data)
    } catch (err) { console.error('Erreur MAJ devoir:', err) }
    saveAll()
  }

  async function deleteDevoir(id) {
    const authStore = useAuthStore()
    devoirs.value = devoirs.value.filter(d => d.id !== id)
    // Supprimer les soumissions associées
    for (const key in submissions.value) {
      if (key.startsWith(`${id}_`)) delete submissions.value[key]
    }

    if (authStore.isDemo) { saveAll(); return }
    if (!authStore.schoolId) return
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'devoirs', id)
      await deleteDoc(docRef)
    } catch (err) { console.error('Erreur suppression devoir:', err) }
    saveAll()
  }

  // ── Persistence ──

  function saveAll() {
    const authStore = useAuthStore()
    const data = { devoirs: devoirs.value, submissions: submissions.value }

    if (authStore.isDemo) {
      localStorage.setItem(demoKey(DEMO_DEVOIRS_KEY), JSON.stringify(data))
      localStorage.setItem(demoKey(DEMO_DEVOIRS_VERSION_KEY), String(DEMO_DEVOIRS_VERSION))
    } else {
      localStorage.setItem('mapo_devoirs', JSON.stringify(data))
      if (authStore.schoolId) {
        const docRef = doc(db, 'schools', authStore.schoolId, 'devoirs-data', 'data')
        setDoc(docRef, data, { merge: true }).catch(err => console.error('Erreur sauvegarde devoirs:', err))
      }
    }
  }

  function loadDemoData() {
    try {
      const raw = localStorage.getItem(demoKey(DEMO_DEVOIRS_KEY))
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  async function loadDevoirs() {
    const authStore = useAuthStore()
    loading.value = true

    if (authStore.isDemo) {
      const savedVer = localStorage.getItem(demoKey(DEMO_DEVOIRS_VERSION_KEY))
      if (savedVer === String(DEMO_DEVOIRS_VERSION)) {
        const saved = loadDemoData()
        if (saved) {
          devoirs.value = saved.devoirs || []
          submissions.value = saved.submissions || {}
          loading.value = false
          return
        }
      }
      generateDemoDevoirs()
      loading.value = false
      return
    }

    if (!authStore.schoolId) { loading.value = false; return }
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'devoirs-data', 'data')
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        const data = snap.data()
        devoirs.value = data.devoirs || []
        submissions.value = data.submissions || {}
      }
    } catch (err) {
      console.error('Erreur chargement devoirs:', err)
    } finally {
      loading.value = false
    }
  }

  // ── Demo data ──

  function generateDemoDevoirs() {
    const elevesStore = useElevesStore()
    const parentChildren = elevesStore.eleves.filter(e => e.parentEmail === 'parent@demo')
    const child6e = parentChildren.find(e => e.className === '6ème A')
    const childTle = parentChildren.find(e => e.className === 'Tle D')

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // Utility: date relative
    function dateOffset(days) {
      const d = new Date(now)
      d.setDate(d.getDate() + days)
      return d.toISOString().split('T')[0]
    }

    const demoDevoirs = [
      // ─── 6ème A ───
      {
        id: 'dev-001',
        className: '6ème A',
        classId: 'c-6a',
        subjectName: 'Français',
        title: 'Rédaction : Ma famille',
        description: 'Rédigez un texte de 15 à 20 lignes décrivant votre famille. Utilisez des adjectifs qualificatifs et au moins 3 figures de style étudiées en classe.',
        type: 'devoir_maison',
        isDigital: true,
        dueDate: dateOffset(-5),
        createdAt: dateOffset(-15),
        createdBy: 'Prof. Français',
      },
      {
        id: 'dev-002',
        className: '6ème A',
        classId: 'c-6a',
        subjectName: 'Mathématiques',
        title: 'Exercices fractions (chap. 7)',
        description: 'Faire les exercices 12, 14 et 16 page 87 du manuel. Montrer tous les calculs.',
        type: 'exercice',
        isDigital: false,
        dueDate: dateOffset(-2),
        createdAt: dateOffset(-9),
        createdBy: 'Prof. Mathématiques',
      },
      {
        id: 'dev-003',
        className: '6ème A',
        classId: 'c-6a',
        subjectName: 'Anglais',
        title: 'Write about your school',
        description: 'Write a short paragraph (10-15 sentences) describing your school, your favorite subject and your best friend. Use present simple tense.',
        type: 'devoir_maison',
        isDigital: true,
        dueDate: dateOffset(3),
        createdAt: dateOffset(-2),
        createdBy: 'Prof. Anglais',
      },
      {
        id: 'dev-004',
        className: '6ème A',
        classId: 'c-6a',
        subjectName: 'Histoire-Géographie',
        title: 'Exposé : Les grandes civilisations africaines',
        description: 'Par groupes de 3, préparez un exposé de 10 minutes sur une civilisation africaine au choix (Égypte ancienne, Empire du Mali, Royaume du Bénin...). Support visuel obligatoire.',
        type: 'expose',
        isDigital: false,
        dueDate: dateOffset(10),
        createdAt: dateOffset(-1),
        createdBy: 'Prof. Histoire-Géographie',
      },
      {
        id: 'dev-005',
        className: '6ème A',
        classId: 'c-6a',
        subjectName: 'SVT',
        title: 'Recherche : Les plantes de mon quartier',
        description: 'Identifiez 5 plantes que vous trouvez dans votre quartier. Pour chacune, notez le nom (si connu), décrivez les feuilles et prenez une photo ou faites un dessin.',
        type: 'recherche',
        isDigital: true,
        dueDate: dateOffset(7),
        createdAt: dateOffset(0),
        createdBy: 'Prof. SVT',
      },

      // ─── Tle D (classe d'Hélène) ───
      {
        id: 'dev-101',
        className: 'Tle D',
        classId: 'c-td',
        subjectName: 'Mathématiques',
        title: 'Problèmes de suites numériques et limites',
        description: 'Résoudre les exercices 15, 18 et 22 du chapitre Suites. Démontrer la convergence et calculer les limites. Rédaction rigoureuse exigée.',
        type: 'exercice',
        isDigital: false,
        dueDate: dateOffset(-5),
        createdAt: dateOffset(-12),
        createdBy: 'Mme Ewane Cécile',
      },
      {
        id: 'dev-102',
        className: 'Tle D',
        classId: 'c-td',
        subjectName: 'Physique',
        title: 'Compte rendu TP : Oscillations mécaniques',
        description: 'Rédigez le compte rendu du TP sur le pendule simple. Plan : Introduction, Matériel, Protocole, Mesures, Graphiques, Analyse, Conclusion. Inclure la détermination expérimentale de g.',
        type: 'devoir_maison',
        isDigital: true,
        dueDate: dateOffset(-3),
        createdAt: dateOffset(-10),
        createdBy: 'M. Talla Hervé',
      },
      {
        id: 'dev-103',
        className: 'Tle D',
        classId: 'c-td',
        subjectName: 'SVT',
        title: 'Dossier : Mécanismes immunitaires',
        description: 'Rédigez un dossier de 3-4 pages sur les mécanismes de défense immunitaire. Distinguez immunité innée et acquise, illustrez avec des schémas annotés.',
        type: 'projet',
        isDigital: true,
        dueDate: dateOffset(-1),
        createdAt: dateOffset(-14),
        createdBy: 'Mme Bidja Solange',
      },
      {
        id: 'dev-104',
        className: 'Tle D',
        classId: 'c-td',
        subjectName: 'Philosophie',
        title: 'Dissertation : La liberté et la responsabilité',
        description: 'Sujet : « Être libre, est-ce faire ce que l\'on veut ? » Traitez en 3 parties avec intro et conclusion structurées. Minimum 3 pages.',
        type: 'devoir_maison',
        isDigital: true,
        dueDate: dateOffset(-2),
        createdAt: dateOffset(-9),
        createdBy: 'M. Njoya Augustin',
      },
      {
        id: 'dev-105',
        className: 'Tle D',
        classId: 'c-td',
        subjectName: 'Anglais',
        title: 'Essay: Climate change and Africa',
        description: 'Write an argumentative essay (300-400 words) on the impact of climate change on African countries. Include causes, effects, and potential solutions.',
        type: 'devoir_maison',
        isDigital: true,
        dueDate: dateOffset(2),
        createdAt: dateOffset(-4),
        createdBy: 'M. Ashu David',
      },
      // ─── Autres classes (pour enrichir la démo) ───
      {
        id: 'dev-201',
        className: '3ème A',
        classId: 'c-3a',
        subjectName: 'Français',
        title: 'Commentaire composé : extrait de L\'Enfant noir',
        description: 'Rédigez un commentaire composé de l\'extrait étudié en classe (p. 45-48). Plan en 2 parties. Minimum 2 pages.',
        type: 'devoir_maison',
        isDigital: true,
        dueDate: dateOffset(-4),
        createdAt: dateOffset(-11),
        createdBy: 'M. Mbarga Paul',
      },
      {
        id: 'dev-202',
        className: '2nde A',
        classId: 'c-2a',
        subjectName: 'Histoire-Géographie',
        title: 'Recherche : Les enjeux démographiques au Cameroun',
        description: 'Recherche documentaire sur la croissance démographique au Cameroun. Statistiques, graphiques et analyse en 2 pages.',
        type: 'recherche',
        isDigital: false,
        dueDate: dateOffset(5),
        createdAt: dateOffset(-2),
        createdBy: 'M. Eko Germain',
      },
    ]

    devoirs.value = demoDevoirs

    // Soumissions démo pour les enfants parent
    const demoSubmissions = {}

    if (child6e) {
      // François a rendu la rédaction Français (noté)
      demoSubmissions[submissionKey('dev-001', child6e.id)] = {
        submittedAt: dateOffset(-6) + 'T18:30:00Z',
        content: 'Ma famille est composée de mon père Thomas, de ma mère et de ma grande soeur Hélène qui est en 3ème. Nous habitons dans le quartier Santa Barbara à Yaoundé...',
        attachmentName: '',
        grade: 13,
        gradedAt: dateOffset(-4) + 'T10:00:00Z',
        gradedBy: 'Prof. Français',
        feedback: 'Bon travail ! Les descriptions sont vivantes et le portrait de ta famille est touchant. Attention aux accords des adjectifs (3 erreurs relevées). Continue ainsi.',
      }
    }

    if (childTle) {
      // Hélène a rendu le TP Physique (noté)
      demoSubmissions[submissionKey('dev-102', childTle.id)] = {
        submittedAt: dateOffset(-4) + 'T20:15:00Z',
        content: 'I. Introduction\nLe pendule simple est un système oscillant constitué d\'une masse ponctuelle suspendue à un fil inextensible. L\'objectif de ce TP est de déterminer expérimentalement l\'accélération de la pesanteur g...',
        attachmentName: '',
        grade: 18,
        gradedAt: dateOffset(-2) + 'T09:00:00Z',
        gradedBy: 'M. Talla Hervé',
        feedback: 'Excellent travail ! Mesures précises, graphiques soignés. La détermination de g = 9,78 m/s² est remarquable. Bravo pour la rigueur scientifique.',
      }
      // Hélène a rendu le dossier SVT (noté)
      demoSubmissions[submissionKey('dev-103', childTle.id)] = {
        submittedAt: dateOffset(-2) + 'T19:30:00Z',
        content: '',
        attachmentName: 'Dossier_Immunologie_Helene_Mbarga.pdf',
        grade: 17.5,
        gradedAt: dateOffset(0) + 'T10:00:00Z',
        gradedBy: 'Mme Bidja Solange',
        feedback: 'Dossier très complet et bien structuré. Les schémas sont clairs. Légère confusion entre lymphocytes T cytotoxiques et helper à corriger.',
      }
      // Hélène a rendu les exercices Maths (noté)
      demoSubmissions[submissionKey('dev-101', childTle.id)] = {
        submittedAt: dateOffset(-6) + 'T07:45:00Z',
        content: '',
        attachmentName: 'Exercices_Suites_Helene.pdf',
        grade: 19,
        gradedAt: dateOffset(-3) + 'T14:00:00Z',
        gradedBy: 'Mme Ewane Cécile',
        feedback: 'Parfait. Démonstrations rigoureuses, calculs sans erreur. Excellente maîtrise des suites numériques.',
      }
      // Hélène a rendu la dissert Philo (pas encore noté)
      demoSubmissions[submissionKey('dev-104', childTle.id)] = {
        submittedAt: dateOffset(-3) + 'T21:00:00Z',
        content: 'La liberté est souvent définie comme la capacité de faire ce que l\'on veut, sans contrainte extérieure. Pourtant, cette définition est-elle suffisante pour comprendre ce qu\'être libre signifie véritablement ?...',
        attachmentName: '',
        grade: null,
        gradedAt: null,
        gradedBy: null,
        feedback: '',
      }
    }

    submissions.value = demoSubmissions
    saveAll()
  }

  return {
    devoirs, submissions, loading,
    devoirsCount,
    getDevoirsByClass, getDevoirsByClassAndSubject,
    getDevoirsForEleve, getUpcomingDevoirs, getOverdueDevoirs,
    getTeacherStats,
    getSubmission, getSubmissionsForDevoir, getSubmissionStats,
    submitDevoir, gradeSubmission,
    addDevoir, updateDevoir, deleteDevoir,
    loadDevoirs, saveAll,
  }
})
