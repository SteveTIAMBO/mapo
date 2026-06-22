import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { useEditionStore } from './edition'
import { publishSchoolDirectory } from '../utils/schoolDirectory'

export const COUNTRY_DEFAULTS = {
  CM: {
    name: 'Cameroun',
    currency: 'XAF',
    dateFormat: 'DD/MM/YYYY',
    phoneFormat: '+237 6XX XXX XXX',
  },
  SN: {
    name: 'Senegal',
    currency: 'XOF',
    dateFormat: 'DD/MM/YYYY',
    phoneFormat: '+221 7X XXX XX XX',
  },
  CI: {
    name: "Côte d'Ivoire",
    currency: 'XOF',
    dateFormat: 'DD/MM/YYYY',
    phoneFormat: '+225 XX XX XX XX XX',
  },
}

export const SCHOOL_TYPES = [
  { value: 'college_prive', label: 'Collège privé' },
  { value: 'lycee_public', label: 'Lycée public' },
  { value: 'lycee_prive', label: 'Lycée privé' },
  { value: 'college_public', label: 'Collège public' },
  { value: 'ecole_primaire', label: 'École primaire' },
  { value: 'universite', label: 'Université' },
  { value: 'centre_formation', label: 'Centre de formation' },
  { value: 'ecole_superieure', label: 'École supérieure' },
]

const DEMO_SETTINGS_KEY = 'mapo_demo_school_settings'
const DEMO_SCHOOL_VERSION_KEY = 'mapo_demo_school_version'
const DEMO_SCHOOL_VERSION = 6

// La démo doit être propre à chaque édition (primaire ≠ secondaire) : on suffixe
// les clés localStorage par édition, sinon une école primaire hériterait des
// réglages du collège (nom, séquences…). Voir aussi classes.js / eleves.js.
function demoSuffix() {
  try {
    return useEditionStore().isPrimaire ? '_primaire' : ''
  } catch (e) {
    return ''
  }
}
function demoSettingsKey() { return DEMO_SETTINGS_KEY + demoSuffix() }
function demoVersionKey() { return DEMO_SCHOOL_VERSION_KEY + demoSuffix() }

// Génère une signature manuscrite demo sur un canvas puis retourne un data:image/png
function generateDemoSignature() {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.clearRect(0, 0, 300, 100)
    ctx.strokeStyle = '#1a3a6b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // "T" cursif
    ctx.beginPath()
    ctx.moveTo(12, 25); ctx.quadraticCurveTo(18, 18, 30, 20)
    ctx.quadraticCurveTo(42, 22, 38, 40); ctx.quadraticCurveTo(35, 55, 48, 50)
    ctx.stroke()

    // "eussop" cursif
    ctx.beginPath()
    ctx.moveTo(48, 50); ctx.quadraticCurveTo(55, 35, 62, 40)
    ctx.quadraticCurveTo(68, 45, 72, 38); ctx.quadraticCurveTo(78, 30, 84, 36)
    ctx.quadraticCurveTo(90, 42, 96, 34); ctx.quadraticCurveTo(102, 26, 108, 34)
    ctx.quadraticCurveTo(114, 42, 120, 36); ctx.quadraticCurveTo(128, 28, 135, 38)
    ctx.stroke()

    // espace + "M" cursif
    ctx.beginPath()
    ctx.moveTo(148, 50); ctx.quadraticCurveTo(150, 20, 155, 22)
    ctx.quadraticCurveTo(160, 24, 162, 42); ctx.quadraticCurveTo(164, 24, 170, 22)
    ctx.quadraticCurveTo(176, 20, 178, 42)
    ctx.stroke()

    // "ichel" cursif
    ctx.beginPath()
    ctx.moveTo(178, 42); ctx.quadraticCurveTo(185, 35, 190, 40)
    ctx.quadraticCurveTo(196, 45, 202, 38); ctx.quadraticCurveTo(208, 32, 215, 38)
    ctx.quadraticCurveTo(222, 44, 230, 36); ctx.quadraticCurveTo(238, 28, 248, 38)
    ctx.stroke()

    // Trait de soulignement
    ctx.lineWidth = 0.8
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.moveTo(20, 62); ctx.quadraticCurveTo(130, 55, 245, 58)
    ctx.stroke()
    ctx.globalAlpha = 1

    return canvas.toDataURL('image/png')
  } catch (e) {
    return null
  }
}

const DEMO_SCHOOL_DEFAULTS = {
  schoolName: 'Collège Privé EDUFREM',
  schoolType: 'college_prive',
  acronym: 'EDUFREM',
  address: 'Quartier Santa Barbara',
  city: 'Yaoundé',
  country: 'CM',
  phone: '+237 699 000 000',
  email: 'contact@edufrem.com',
  website: 'https://edufrem.com',
  currency: 'XAF',
  dateFormat: 'DD/MM/YYYY',
  phoneFormat: '+237 6XX XXX XXX',
  logo: '/logo-edufrem.png',
  directorPhoto: '/photo-directeur.png',
  directorName: 'Teussop Michel',
  directorLastName: 'Teussop',
  directorFirstName: 'Michel',
  directorTitle: 'Directeur',
  directorSignature: null, // sera défini dans generateDemoSignature()
  academicYear: '2025-2026',
  cycles: ['college', 'lycee'],
  language: 'fr',
  primaryColor: '#0A84FF',
  evaluationType: '2_sequences',
  gradingMode: 'notes',
  periods: {
    T1: {
      start: '2025-09-02',
      end: '2025-12-20',
      sequences: {
        S1: { start: '2025-09-02', end: '2025-10-25' },
        S2: { start: '2025-10-27', end: '2025-12-20' },
      },
      conseil: '2025-12-22',
    },
    T2: {
      start: '2026-01-05',
      end: '2026-03-27',
      sequences: {
        S3: { start: '2026-01-05', end: '2026-02-14' },
        S4: { start: '2026-02-16', end: '2026-03-27' },
      },
      conseil: '2026-03-30',
    },
    T3: {
      start: '2026-04-06',
      end: '2026-06-26',
      sequences: {
        S5: { start: '2026-04-06', end: '2026-05-15' },
        S6: { start: '2026-05-19', end: '2026-06-26' },
      },
      conseil: '2026-06-29',
    },
  },
}

// Surcharge démo pour l'édition PRIMAIRE : identité « école primaire » + évaluation
// TRIMESTRIELLE (le bulletin APC du primaire est par trimestre, PAS découpé en
// séquences comme au secondaire). evaluationType '1_evaluation' = 1 note/trimestre.
const DEMO_SCHOOL_PRIMAIRE = {
  schoolName: 'École Primaire EDUFREM',
  schoolType: 'ecole_primaire',
  acronym: 'EDUFREM',
  cycles: ['primaire'],
  evaluationType: '1_evaluation',
}

export const useSchoolStore = defineStore('school', () => {
  const schoolSettings = ref({
    schoolName: '',
    schoolType: '',
    acronym: '',
    address: '',
    city: '',
    country: 'CM',
    phone: '',
    email: '',
    website: '',
    currency: 'XAF',
    dateFormat: 'DD/MM/YYYY',
    phoneFormat: '+237 6XX XXX XXX',
    logo: null,
    directorPhoto: null,
    directorName: '',
    directorLastName: '',
    directorFirstName: '',
    directorTitle: 'Directeur',
    directorSignature: null,
    academicYear: '',
    cycles: [],
    language: 'fr',
    primaryColor: '#0A84FF',
    evaluationType: '2_sequences',
    // Mode de notation : 'notes' (chiffré /20) ou 'apc' (compétences A/ECA/NA).
    // Choisi à la création de l'école ; déterminant pour les bulletins du primaire.
    gradingMode: 'notes',
    periods: {},
  })

  const hasCompletedOnboarding = computed(() => {
    return !!schoolSettings.value.schoolName
  })

  const currentAcademicYear = computed(() => {
    // If academicYear is explicitly set, return it
    if (schoolSettings.value.academicYear) {
      return schoolSettings.value.academicYear
    }
    // Auto-calculate based on current date
    const now = new Date()
    const month = now.getMonth() + 1 // getMonth returns 0-11
    const year = now.getFullYear()

    if (month >= 8) {
      // August onwards: return YEAR-(YEAR+1)
      return `${year}-${year + 1}`
    } else {
      // Before August: return (YEAR-1)-YEAR
      return `${year - 1}-${year}`
    }
  })

  // Appliquer la couleur principale (dominante) de l'école au :root.
  // On pilote --pr + --pr-rgb (et les variantes translucides --pr-light/--pr-glow
  // ainsi que --pr-dark) : tous les accents du site suivent automatiquement.
  // NB : on ne touche plus à --sidebar (la barre latérale reste en verre clair).
  const applyPrimaryColor = () => {
    const color = schoolSettings.value.primaryColor
    if (!color || typeof document === 'undefined') return
    const hex = color.replace('#', '')
    if (hex.length !== 6) return
    const R = parseInt(hex.substr(0, 2), 16)
    const G = parseInt(hex.substr(2, 2), 16)
    const B = parseInt(hex.substr(4, 2), 16)
    if ([R, G, B].some(Number.isNaN)) return
    const root = document.documentElement.style
    const d = (c) => Math.max(0, c - 32)
    const toHex = (c) => c.toString(16).padStart(2, '0')
    root.setProperty('--pr', color)
    root.setProperty('--pr-rgb', `${R}, ${G}, ${B}`)
    root.setProperty('--pr-dark', `#${toHex(d(R))}${toHex(d(G))}${toHex(d(B))}`)
    root.setProperty('--pr-light', `rgba(${R}, ${G}, ${B}, 0.10)`)
    root.setProperty('--pr-glow', `rgba(${R}, ${G}, ${B}, 0.28)`)
  }

  const loadSettings = async () => {
    const authStore = useAuthStore()

    // Mode demo : charger depuis localStorage ou utiliser les valeurs par défaut
    if (authStore.isDemo) {
      const ed = useEditionStore()
      const sKey = demoSettingsKey()
      const vKey = demoVersionKey()
      const savedVersion = localStorage.getItem(vKey)
      if (savedVersion === String(DEMO_SCHOOL_VERSION)) {
        try {
          const stored = localStorage.getItem(sKey)
          if (stored) {
            schoolSettings.value = { ...schoolSettings.value, ...JSON.parse(stored) }
          }
        } catch (e) { /* silent */ }
      } else {
        // Initialize with demo defaults (+ surcharge primaire si édition primaire)
        schoolSettings.value = {
          ...schoolSettings.value,
          ...DEMO_SCHOOL_DEFAULTS,
          ...(ed.isPrimaire ? DEMO_SCHOOL_PRIMAIRE : {}),
        }
        // Ajouter la signature manuscrite demo du directeur
        if (!schoolSettings.value.directorSignature) {
          schoolSettings.value.directorSignature = generateDemoSignature()
        }
        localStorage.setItem(sKey, JSON.stringify(schoolSettings.value))
        localStorage.setItem(vKey, String(DEMO_SCHOOL_VERSION))
      }
      if (!schoolSettings.value.academicYear) {
        schoolSettings.value.academicYear = currentAcademicYear.value
      }
      applyPrimaryColor()
      return
    }

    // Mode production : charger depuis Firestore (document de l'école)
    if (!authStore.schoolId) {
      console.warn('Aucune école associée à cet utilisateur')
      return
    }

    try {
      const docRef = doc(db, 'schools', authStore.schoolId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        schoolSettings.value = { ...schoolSettings.value, ...docSnap.data() }
      } else {
        const stored = localStorage.getItem('schoolSettings')
        if (stored) {
          schoolSettings.value = { ...schoolSettings.value, ...JSON.parse(stored) }
        }
      }
    } catch (error) {
      console.error('Error loading settings from Firestore:', error)
      const stored = localStorage.getItem('schoolSettings')
      if (stored) {
        schoolSettings.value = { ...schoolSettings.value, ...JSON.parse(stored) }
      }
    }
    // Ensure academicYear defaults to computed value if not set
    if (!schoolSettings.value.academicYear) {
      schoolSettings.value.academicYear = currentAcademicYear.value
    }
    applyPrimaryColor()
  }

  const saveSettings = async (data) => {
    const authStore = useAuthStore()

    schoolSettings.value = { ...schoolSettings.value, ...data }

    // Mode demo : sauvegarder dans localStorage uniquement
    if (authStore.isDemo) {
      try {
        localStorage.setItem(demoSettingsKey(), JSON.stringify(schoolSettings.value))
      } catch (e) { /* silent */ }
      return
    }

    // Mode production : sauvegarder dans le document de l'école
    if (!authStore.schoolId) {
      console.warn('Aucune école associée à cet utilisateur')
      return
    }

    try {
      const docRef = doc(db, 'schools', authStore.schoolId)
      await setDoc(docRef, schoolSettings.value, { merge: true })
      localStorage.setItem('schoolSettings', JSON.stringify(schoolSettings.value))
    } catch (error) {
      console.error('Error saving settings to Firestore:', error)
      localStorage.setItem('schoolSettings', JSON.stringify(schoolSettings.value))
    }
  }

  const setAcademicYear = async (year) => {
    await saveSettings({ academicYear: year })
  }

  const currentPeriod = computed(() => {
    const today = new Date()
    const periods = schoolSettings.value.periods || {}

    for (const [trimCode, trimData] of Object.entries(periods)) {
      const startDate = new Date(trimData.start)
      const endDate = new Date(trimData.end)

      if (today >= startDate && today <= endDate) {
        // Find current sequence
        let currentSeq = null
        for (const [seqCode, seqData] of Object.entries(trimData.sequences || {})) {
          const seqStart = new Date(seqData.start)
          const seqEnd = new Date(seqData.end)
          if (today >= seqStart && today <= seqEnd) {
            currentSeq = { code: seqCode, ...seqData }
            break
          }
        }
        return { trimester: trimCode, ...trimData, currentSequence: currentSeq }
      }
    }
    return null
  })

  const isSequenceLocked = (seqValue) => {
    // seqValue is in format like 'T1:S1' or just 'S1'
    const periods = schoolSettings.value.periods || {}
    const gracePeriod = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

    for (const trimData of Object.entries(periods)) {
      const sequences = trimData[1].sequences || {}
      for (const seqData of Object.entries(sequences)) {
        const seqCode = seqData[0]
        const endDate = new Date(seqData[1].end)
        const lockDate = new Date(endDate.getTime() + gracePeriod)

        if (seqCode === seqValue) {
          return new Date() > lockDate
        }
      }
    }
    return false
  }

  const getUpcomingConseil = () => {
    const today = new Date()
    const periods = schoolSettings.value.periods || {}
    const upcomingEvents = []

    for (const [trimCode, trimData] of Object.entries(periods)) {
      const conseilDate = new Date(trimData.conseil)
      const daysUntil = Math.ceil((conseilDate - today) / (1000 * 60 * 60 * 24))

      // Within next 14 days (but not past)
      if (daysUntil > 0 && daysUntil <= 14) {
        upcomingEvents.push({
          trimester: trimCode,
          date: trimData.conseil,
          daysUntil,
        })
      }
    }

    // Return the soonest one
    return upcomingEvents.length > 0
      ? upcomingEvents.sort((a, b) => a.daysUntil - b.daysUntil)[0]
      : null
  }

  /**
   * Publie le profil agrégé de l'école dans school_directory (Firestore).
   * Utilisé par NOVA pour auto-remplir le formulaire ADN.
   * Charge les stores nécessaires de façon asynchrone (lazy) pour éviter les
   * imports circulaires et ne pas alourdir le chargement initial.
   */
  async function publishToDirectory() {
    try {
      const [
        { useElevesStore },
        { usePersonnelStore },
        { useClassesStore },
        { useFacturationStore },
      ] = await Promise.all([
        import('./eleves'),
        import('./personnel'),
        import('./classes'),
        import('./facturation'),
      ])

      const elevesStore = useElevesStore()
      const personnelStore = usePersonnelStore()
      const classesStore = useClassesStore()
      const facturationStore = useFacturationStore()

      await publishSchoolDirectory({
        schoolSettings: schoolSettings.value,
        eleves: elevesStore.eleves,
        staff: personnelStore.staff,
        classes: classesStore.classes,
        globalStats: facturationStore.globalStats,
        feeStructure: facturationStore.feeStructure,
      })
    } catch (err) {
      console.warn('[school] publishToDirectory failed (non-blocking):', err)
    }
  }

  const savePeriods = async (periodsData) => {
    await saveSettings({ periods: periodsData })
  }

  return {
    schoolSettings,
    hasCompletedOnboarding,
    currentAcademicYear,
    currentPeriod,
    isSequenceLocked,
    getUpcomingConseil,
    savePeriods,
    loadSettings,
    saveSettings,
    setAcademicYear,
  }
})
