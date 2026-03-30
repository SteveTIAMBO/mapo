import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, auth } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export const COUNTRY_DEFAULTS = {
  CM: {
    name: 'Cameroun',
    currency: 'XAF',
    dateFormat: 'DD/MM/YYYY',
    phoneFormat: '+237 6XX XXX XXX',
  },
  SN: {
    name: 'Sénégal',
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
]

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
    academicYear: '',
    cycles: [],
    language: 'fr',
  })

  const hasCompletedOnboarding = computed(() => {
    return !!schoolSettings.value.schoolName
  })

  const loadSettings = async () => {
    if (!auth.currentUser) {
      console.warn('No authenticated user found')
      return
    }

    try {
      const docRef = doc(db, 'schoolSettings', auth.currentUser.uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        schoolSettings.value = {
          ...schoolSettings.value,
          ...docSnap.data(),
        }
      } else {
        const stored = localStorage.getItem('schoolSettings')
        if (stored) {
          schoolSettings.value = {
            ...schoolSettings.value,
            ...JSON.parse(stored),
          }
        }
      }
    } catch (error) {
      console.error('Error loading school settings from Firestore, falling back to localStorage:', error)
      const stored = localStorage.getItem('schoolSettings')
      if (stored) {
        schoolSettings.value = {
          ...schoolSettings.value,
          ...JSON.parse(stored),
        }
      }
    }
  }

  const saveSettings = async (data) => {
    if (!auth.currentUser) {
      console.warn('No authenticated user found')
      return
    }

    schoolSettings.value = {
      ...schoolSettings.value,
      ...data,
    }

    try {
      const docRef = doc(db, 'schoolSettings', auth.currentUser.uid)
      await setDoc(docRef, schoolSettings.value, { merge: true })
      localStorage.setItem('schoolSettings', JSON.stringify(schoolSettings.value))
    } catch (error) {
      console.error('Error saving school settings to Firestore, saving to localStorage only:', error)
      localStorage.setItem('schoolSettings', JSON.stringify(schoolSettings.value))
    }
  }

  return {
    schoolSettings,
    hasCompletedOnboarding,
    loadSettings,
    saveSettings,
  }
})
