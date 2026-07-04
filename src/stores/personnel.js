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

export const STAFF_CATEGORIES = [
  { value: 'enseignement', label: 'Enseignement', color: '#1558B0' },
  { value: 'administration', label: 'Administration', color: '#B8892A' },
  { value: 'support', label: 'Support', color: '#0C7A52' },
]

// Niveaux de qualification enseignant (compatibles NOVA / CESA)
export const QUALIFICATION_LEVELS = [
  { value: 'doctorat', label: 'Doctorat / PhD' },
  { value: 'master', label: 'Master / DEA / DIPES II' },
  { value: 'licence', label: 'Licence / DIPES I' },
  { value: 'bts', label: 'BTS / DUT / CAPIEMP' },
  { value: 'baccalaureat', label: 'Baccalauréat' },
  { value: 'autre', label: 'Autre' },
]

// Types de contrat
export const CONTRACT_TYPES = [
  { value: 'permanent', label: 'Permanent / Fonctionnaire' },
  { value: 'contractuel', label: 'Contractuel' },
  { value: 'vacataire', label: 'Vacataire' },
]

export const STAFF_ROLES = {
  enseignement: [
    'Professeur',
    'Professeur Principal',
    'Surveillant Général',
    'Censeur',
  ],
  administration: ['Directeur', 'Secrétaire', 'Comptable', 'Intendant'],
  support: [
    'Agent de sécurité',
    "Agent d'entretien",
    'Chauffeur',
    'Cuisinier',
  ],
}

export const SUBJECTS_BY_CYCLE = {
  college: [
    'Français',
    'Anglais',
    'Mathématiques',
    'SVT',
    'PCT',
    'Histoire-Géographie',
    'EPS',
    'Informatique',
    'ECM',
    'Espagnol',
    'Allemand',
  ],
  lycee: [
    'Français',
    'Anglais',
    'Mathématiques',
    'Physique',
    'Chimie',
    'SVT',
    'Philosophie',
    'Histoire-Géographie',
    'EPS',
    'Informatique',
    'ECM',
    'Espagnol',
    'Allemand',
  ],
}

// Données de démo pour le personnel du Collège EDUFREM Yaoundé
// 26 enseignants (dont censeur+SG), 4 admin, 4 support = 34 personnes
const DEMO_STAFF_DATA = [
  // ── Français (3 profs) ──
  { id: 'p-002', firstName: 'Paul', lastName: 'Mbarga', category: 'enseignement', role: 'Professeur Principal', email: 'p.mbarga@edufrem.com', phone: '+237 677 445 566', subjects: ['Français'], status: 'Actif' },
  { id: 'p-024', firstName: 'Véronique', lastName: 'Tchinda', category: 'enseignement', role: 'Professeur', email: 'v.tchinda@edufrem.com', phone: '+237 690 556 012', subjects: ['Français'], status: 'Actif' },
  { id: 'p-025', firstName: 'André', lastName: 'Mefane', category: 'enseignement', role: 'Professeur', email: 'a.mefane@edufrem.com', phone: '+237 655 667 123', subjects: ['Français'], status: 'Actif' },
  // ── Mathématiques (3 profs) ──
  { id: 'p-001', firstName: 'Jean', lastName: 'Kamga', category: 'enseignement', role: 'Professeur Principal', email: 'j.kamga@edufrem.com', phone: '+237 699 112 233', subjects: ['Mathématiques'], classesBySubject: { 'Mathématiques': ['c-6a', 'c-tc'] }, status: 'Actif' },
  { id: 'p-026', firstName: 'Gaston', lastName: 'Nkemeni', category: 'enseignement', role: 'Professeur', email: 'g.nkemeni@edufrem.com', phone: '+237 677 778 234', subjects: ['Mathématiques'], status: 'Actif' },
  { id: 'p-027', firstName: 'Cécile', lastName: 'Ewane', category: 'enseignement', role: 'Professeur', email: 'c.ewane@edufrem.com', phone: '+237 699 889 345', subjects: ['Mathématiques'], status: 'Actif' },
  // ── Anglais (2 profs) ──
  { id: 'p-003', firstName: 'Claire', lastName: 'Ngo', category: 'enseignement', role: 'Professeur', email: 'c.ngo@edufrem.com', phone: '+237 690 778 899', subjects: ['Anglais'], status: 'Actif' },
  { id: 'p-028', firstName: 'David', lastName: 'Ashu', category: 'enseignement', role: 'Professeur', email: 'd.ashu@edufrem.com', phone: '+237 655 990 456', subjects: ['Anglais'], status: 'Actif' },
  // ── SVT (2 profs) ──
  { id: 'p-004', firstName: 'François', lastName: 'Nana', category: 'enseignement', role: 'Professeur', email: 'f.nana@edufrem.com', phone: '+237 655 223 344', subjects: ['SVT'], status: 'Actif' },
  { id: 'p-029', firstName: 'Solange', lastName: 'Bidja', category: 'enseignement', role: 'Professeur', email: 's.bidja@edufrem.com', phone: '+237 690 101 567', subjects: ['SVT'], status: 'Actif' },
  // ── PCT (collège) + Physique/Chimie (lycée) — 3 profs ──
  { id: 'p-006', firstName: 'Alain', lastName: 'Fotso', category: 'enseignement', role: 'Professeur', email: 'a.fotso@edufrem.com', phone: '+237 677 889 900', subjects: ['PCT'], status: 'Actif' },
  { id: 'p-030', firstName: 'Hervé', lastName: 'Talla', category: 'enseignement', role: 'Professeur', email: 'h.talla@edufrem.com', phone: '+237 699 212 678', subjects: ['Physique', 'PCT'], status: 'Actif' },
  { id: 'p-022', firstName: 'Estelle', lastName: 'Mbassi', category: 'enseignement', role: 'Professeur', email: 'e.mbassi@edufrem.com', phone: '+237 677 334 567', subjects: ['Chimie'], status: 'Actif' },
  // ── Histoire-Géographie (2 profs) ──
  { id: 'p-005', firstName: 'Marie', lastName: 'Atangana', category: 'enseignement', role: 'Professeur', email: 'm.atangana@edufrem.com', phone: '+237 699 556 677', subjects: ['Histoire-Géographie'], status: 'Actif' },
  { id: 'p-031', firstName: 'Germain', lastName: 'Eko', category: 'enseignement', role: 'Professeur', email: 'g.eko@edufrem.com', phone: '+237 677 323 789', subjects: ['Histoire-Géographie'], status: 'Actif' },
  // ── EPS (2 profs) ──
  { id: 'p-007', firstName: 'Hélène', lastName: 'Djomou', category: 'enseignement', role: 'Professeur', email: 'h.djomou@edufrem.com', phone: '+237 690 112 234', subjects: ['EPS'], status: 'Actif' },
  { id: 'p-032', firstName: 'Fabien', lastName: 'Yomba', category: 'enseignement', role: 'Professeur', email: 'f.yomba@edufrem.com', phone: '+237 655 434 890', subjects: ['EPS'], status: 'Actif' },
  // ── Informatique (2 profs) ──
  { id: 'p-008', firstName: 'Samuel', lastName: 'Kenfack', category: 'enseignement', role: 'Professeur', email: 's.kenfack@edufrem.com', phone: '+237 655 334 455', subjects: ['Informatique'], status: 'Actif' },
  { id: 'p-033', firstName: 'Patricia', lastName: 'Manga', category: 'enseignement', role: 'Professeur', email: 'p.manga@edufrem.com', phone: '+237 699 545 901', subjects: ['Informatique'], status: 'Actif' },
  // ── ECM (1 prof) ──
  { id: 'p-010', firstName: 'Joseph', lastName: 'Tagne', category: 'enseignement', role: 'Professeur', email: 'j.tagne@edufrem.com', phone: '+237 677 990 011', subjects: ['ECM'], status: 'Actif' },
  // ── Espagnol (2 profs) ──
  { id: 'p-009', firstName: 'Brigitte', lastName: 'Ngono', category: 'enseignement', role: 'Professeur Principal', email: 'b.ngono@edufrem.com', phone: '+237 699 667 788', subjects: ['Espagnol'], status: 'Actif' },
  { id: 'p-034', firstName: 'Rodrigue', lastName: 'Belinga', category: 'enseignement', role: 'Professeur', email: 'r.belinga@edufrem.com', phone: '+237 690 656 012', subjects: ['Espagnol'], status: 'Actif' },
  // ── Allemand (1 prof) ──
  { id: 'p-023', firstName: 'Robert', lastName: 'Atemengue', category: 'enseignement', role: 'Professeur', email: 'r.atemengue@edufrem.com', phone: '+237 690 445 678', subjects: ['Allemand'], status: 'Actif' },
  // ── Philosophie (1 prof — lycée uniquement) ──
  { id: 'p-021', firstName: 'Augustin', lastName: 'Njoya', category: 'enseignement', role: 'Professeur', email: 'a.njoya@edufrem.com', phone: '+237 699 223 456', subjects: ['Philosophie'], status: 'Actif' },
  // ── Encadrement ──
  { id: 'p-011', firstName: 'Sylvie', lastName: 'Mballa', category: 'enseignement', role: 'Censeur', email: 's.mballa@edufrem.com', phone: '+237 690 223 345', subjects: [], status: 'Actif' },
  { id: 'p-012', firstName: 'Patrick', lastName: 'Essomba', category: 'enseignement', role: 'Surveillant Général', email: 'p.essomba@edufrem.com', phone: '+237 655 445 567', subjects: [], status: 'Actif' },
  // ── Administration ──
  { id: 'p-013', firstName: 'Steve', lastName: 'Tiambo', category: 'administration', role: 'Directeur', email: 'directeur@edufrem.com', phone: '+237 699 001 122', subjects: [], status: 'Actif' },
  { id: 'p-014', firstName: 'Marie', lastName: 'Fouda', category: 'administration', role: 'Secrétaire', email: 'secretariat@edufrem.com', phone: '+237 677 112 233', subjects: [], status: 'Actif' },
  { id: 'p-015', firstName: 'Pierre', lastName: 'Nkoulou', category: 'administration', role: 'Comptable', email: 'compta@edufrem.com', phone: '+237 690 334 456', subjects: [], status: 'Actif' },
  { id: 'p-016', firstName: 'Julienne', lastName: 'Onana', category: 'administration', role: 'Intendant', email: 'intendance@edufrem.com', phone: '+237 655 556 678', subjects: [], status: 'Actif' },
  // ── Support ──
  { id: 'p-017', firstName: 'Thomas', lastName: 'Biyick', category: 'support', role: 'Agent de sécurité', email: '', phone: '+237 699 778 890', subjects: [], status: 'Actif' },
  { id: 'p-018', firstName: 'Rose', lastName: 'Ekotto', category: 'support', role: "Agent d'entretien", email: '', phone: '+237 677 890 012', subjects: [], status: 'Actif' },
  { id: 'p-019', firstName: 'Albert', lastName: 'Mvondo', category: 'support', role: 'Chauffeur', email: '', phone: '+237 690 001 123', subjects: [], status: 'Actif' },
  { id: 'p-020', firstName: 'Bernadette', lastName: 'Ndjié', category: 'support', role: 'Cuisinier', email: '', phone: '+237 655 112 234', subjects: [], status: 'Actif' },
]

const DEMO_STAFF_KEY = 'mapo_demo_personnel'
const DEMO_STAFF_VERSION_KEY = 'mapo_demo_personnel_version'
const DEMO_STAFF_VERSION = 7 // v7: affectations classesBySubject (Jean Kamga = Maths 6ème A + Tle C)

// Salaires par défaut par catégorie/rôle (XAF mensuel)
const DEMO_SALARIES = {
  'Directeur': 350000,
  'Censeur': 280000,
  'Surveillant Général': 250000,
  'Professeur Principal': 220000,
  'Professeur': 180000,
  'Comptable': 200000,
  'Secrétaire': 150000,
  'Intendant': 160000,
  'Agent de sécurité': 80000,
  "Agent d'entretien": 75000,
  'Chauffeur': 85000,
  'Cuisinier': 75000,
}

export const usePersonnelStore = defineStore('personnel', () => {
  const staff = ref([])
  const loading = ref(false)
  const searchQuery = ref('')
  const selectedCategory = ref('')

  const filteredStaff = computed(() => {
    return staff.value.filter((member) => {
      const matchesSearch =
        !searchQuery.value ||
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (member.email || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (member.role || '').toLowerCase().includes(searchQuery.value.toLowerCase())

      const matchesCategory =
        !selectedCategory.value ||
        member.category === selectedCategory.value

      return matchesSearch && matchesCategory
    })
  })

  const staffStats = computed(() => {
    const stats = {
      total: staff.value.length, enseignement: 0, administration: 0, support: 0,
      hommes: 0, femmes: 0, vacataires: 0, handicap: 0,
      enseignantsFemmes: 0, enseignantsQualifies: 0,
    }
    staff.value.forEach((m) => {
      if (stats[m.category] !== undefined) stats[m.category]++
      if (m.gender === 'M') stats.hommes++
      else if (m.gender === 'F') stats.femmes++
      if (m.contractType === 'vacataire') stats.vacataires++
      if (m.handicap) stats.handicap++
      if (m.category === 'enseignement') {
        if (m.gender === 'F') stats.enseignantsFemmes++
        if (m.qualification && m.qualification !== 'autre' && m.qualification !== 'baccalaureat') stats.enseignantsQualifies++
      }
    })
    return stats
  })

  // Helpers demo localStorage
  function saveDemoStaff() {
    try { localStorage.setItem(DEMO_STAFF_KEY, JSON.stringify(staff.value)) } catch (e) { /* silent */ }
  }
  function loadDemoStaff() {
    try {
      const raw = localStorage.getItem(DEMO_STAFF_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (e) { return [] }
  }

  const loadStaff = async () => {
    const authStore = useAuthStore()
    loading.value = true

    if (authStore.isDemo) {
      const savedVersion = localStorage.getItem(DEMO_STAFF_VERSION_KEY)
      const saved = (savedVersion === String(DEMO_STAFF_VERSION)) ? loadDemoStaff() : []
      const baseData = saved.length > 0 ? saved : [...DEMO_STAFF_DATA]
      // Ensure salary field exists on all demo staff
      staff.value = baseData.map(s => ({
        ...s,
        salary: s.salary || DEMO_SALARIES[s.role] || 150000,
      }))
      if (saved.length === 0) {
        localStorage.setItem(DEMO_STAFF_VERSION_KEY, String(DEMO_STAFF_VERSION))
        saveDemoStaff()
      }
      loading.value = false
      return
    }

    if (!authStore.schoolId) {
      loading.value = false
      return
    }

    try {
      const collectionRef = collection(db, 'schools', authStore.schoolId, 'personnel')
      const querySnapshot = await getDocs(collectionRef)
      staff.value = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (error) {
      console.error('Error loading personnel:', error)
    } finally {
      loading.value = false
    }
  }

  const addStaff = async (member) => {
    const authStore = useAuthStore()

    let resultId = null

    if (authStore.isDemo) {
      const newMember = { id: Date.now().toString(), ...member }
      staff.value.push(newMember)
      saveDemoStaff()
      resultId = newMember.id
    } else {
      if (!authStore.schoolId) return
      try {
        const collectionRef = collection(db, 'schools', authStore.schoolId, 'personnel')
        const docRef = await addDoc(collectionRef, member)
        staff.value.push({ id: docRef.id, ...member })
        resultId = docRef.id
      } catch (error) {
        console.error('Error adding staff:', error)
      }
    }

    // Log activity in both modes
    try {
      const { useActivityStore } = await import('./activity')
      const actStore = useActivityStore()
      actStore.loadActivities()
      actStore.log('personnel', `${member.firstName} ${member.lastName} ajouté(e) au personnel (${member.role || member.category})`)
    } catch {}

    return resultId
  }

  const updateStaff = async (id, data) => {
    const authStore = useAuthStore()
    const index = staff.value.findIndex((m) => m.id === id)
    if (index !== -1) {
      staff.value[index] = { ...staff.value[index], ...data }
    }

    if (authStore.isDemo) {
      saveDemoStaff()
      return
    }

    if (!authStore.schoolId) return

    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'personnel', id)
      await updateDoc(docRef, data)
    } catch (error) {
      console.error('Error updating staff:', error)
    }
  }

  const deleteStaff = async (id) => {
    const authStore = useAuthStore()
    const member = staff.value.find(m => m.id === id)
    staff.value = staff.value.filter((m) => m.id !== id)

    if (authStore.isDemo) {
      saveDemoStaff()
    } else {
      if (!authStore.schoolId) return
      try {
        const docRef = doc(db, 'schools', authStore.schoolId, 'personnel', id)
        await deleteDoc(docRef)
      } catch (error) {
        console.error('Error deleting staff:', error)
      }
    }

    // Log activity in both modes
    try {
      const { useActivityStore } = await import('./activity')
      const actStore = useActivityStore()
      actStore.loadActivities()
      actStore.log('personnel', `${member?.firstName || ''} ${member?.lastName || ''} retiré(e) du personnel`)
    } catch {}
  }

  /**
   * Trouve le dossier personnel correspondant au profil enseignant connecté.
   * Correspondance par email ou par nom complet (demo).
   */
  function getTeacherStaffRecord(userProfile) {
    if (!userProfile) return null
    return staff.value.find(s =>
      s.category === 'enseignement' &&
      (s.email === userProfile.email ||
       (`${s.firstName} ${s.lastName}` === userProfile.displayName) ||
       (`${s.lastName} ${s.firstName}` === userProfile.displayName))
    ) || null
  }

  /**
   * IDs de classes où l'enseignant enseigne une matière donnée, d'après ses
   * AFFECTATIONS (fiche personnel → classesBySubject). Vide si non renseigné.
   */
  function getTeacherClassIdsForSubject(userProfile, subjectName) {
    const record = getTeacherStaffRecord(userProfile)
    const cbs = record && record.classesBySubject
    if (!cbs || !subjectName) return []
    return Array.isArray(cbs[subjectName]) ? [...cbs[subjectName]] : []
  }

  /**
   * Retourne les IDs de classes où l'enseignant intervient.
   * Source de vérité = les AFFECTATIONS de la fiche personnel (classesBySubject) ;
   * repli = les teacherAssignments de l'emploi du temps (compat écoles existantes).
   * Le store EDT peut être passé pour éviter l'import circulaire.
   */
  function getTeacherClassIds(userProfile, edtStore) {
    const record = getTeacherStaffRecord(userProfile)
    if (!record) return []
    // 1) Affectations de la fiche prof (nouvelle source de vérité)
    const cbs = record.classesBySubject && typeof record.classesBySubject === 'object' ? record.classesBySubject : null
    if (cbs) {
      const set = new Set()
      for (const subj of Object.keys(cbs)) for (const cid of (cbs[subj] || [])) set.add(cid)
      if (set.size) return [...set]
    }
    // 2) Repli : emploi du temps
    let assignments = []
    if (edtStore && edtStore.teacherAssignments) {
      assignments = edtStore.teacherAssignments
    } else {
      // Fallback: lire depuis localStorage
      try {
        const raw = localStorage.getItem('mapo_demo_edt')
        if (raw) {
          const data = JSON.parse(raw)
          assignments = data.teacherAssignments || []
        }
      } catch { /* silent */ }
    }
    const classIdSet = new Set()
    for (const a of assignments) {
      if (a.teacherId === record.id) {
        for (const cid of (a.classIds || [])) classIdSet.add(cid)
      }
    }
    return [...classIdSet]
  }

  return {
    staff, loading, searchQuery, selectedCategory,
    filteredStaff, staffStats,
    loadStaff, addStaff, updateStaff, deleteStaff,
    getTeacherStaffRecord, getTeacherClassIds, getTeacherClassIdsForSubject,
  }
})
