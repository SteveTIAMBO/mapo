import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, auth } from '../firebase'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'

export const STAFF_CATEGORIES = [
  { value: 'enseignement', label: 'Enseignement', color: '#1558B0' },
  { value: 'administration', label: 'Administration', color: '#B8892A' },
  { value: 'support', label: 'Support', color: '#0C7A52' },
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
    'Histoire-Géo',
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
    'Histoire-Géo',
    'EPS',
    'Informatique',
    'ECM',
    'Espagnol',
    'Allemand',
  ],
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
        member.firstName
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase()) ||
        member.lastName
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase()) ||
        (member.email || '')
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase())

      const matchesCategory =
        !selectedCategory.value ||
        member.category === selectedCategory.value

      return matchesSearch && matchesCategory
    })
  })

  const staffStats = computed(() => {
    const stats = {
      total: staff.value.length,
      enseignement: 0,
      administration: 0,
      support: 0,
    }

    staff.value.forEach((member) => {
      if (member.category === 'enseignement') {
        stats.enseignement++
      } else if (member.category === 'administration') {
        stats.administration++
      } else if (member.category === 'support') {
        stats.support++
      }
    })

    return stats
  })

  const loadStaff = async () => {
    if (!auth.currentUser) {
      console.warn('No authenticated user found')
      return
    }

    loading.value = true

    try {
      const collectionRef = collection(
        db,
        'personnel',
        auth.currentUser.uid,
        'members'
      )
      const querySnapshot = await getDocs(collectionRef)
      staff.value = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      localStorage.setItem('personnel', JSON.stringify(staff.value))
    } catch (error) {
      console.error(
        'Error loading personnel from Firestore, falling back to localStorage:',
        error
      )
      const stored = localStorage.getItem('personnel')
      if (stored) {
        staff.value = JSON.parse(stored)
      }
    } finally {
      loading.value = false
    }
  }

  const addStaff = async (member) => {
    if (!auth.currentUser) {
      console.warn('No authenticated user found')
      return
    }

    try {
      const collectionRef = collection(
        db,
        'personnel',
        auth.currentUser.uid,
        'members'
      )
      const docRef = await addDoc(collectionRef, member)

      const newMember = {
        id: docRef.id,
        ...member,
      }
      staff.value.push(newMember)
      localStorage.setItem('personnel', JSON.stringify(staff.value))

      return docRef.id
    } catch (error) {
      console.error(
        'Error adding staff to Firestore, saving to localStorage only:',
        error
      )
      const newMember = {
        id: Date.now().toString(),
        ...member,
      }
      staff.value.push(newMember)
      localStorage.setItem('personnel', JSON.stringify(staff.value))

      return newMember.id
    }
  }

  const updateStaff = async (id, data) => {
    if (!auth.currentUser) {
      console.warn('No authenticated user found')
      return
    }

    try {
      const docRef = doc(
        db,
        'personnel',
        auth.currentUser.uid,
        'members',
        id
      )
      await updateDoc(docRef, data)

      const index = staff.value.findIndex((m) => m.id === id)
      if (index !== -1) {
        staff.value[index] = {
          ...staff.value[index],
          ...data,
        }
      }
      localStorage.setItem('personnel', JSON.stringify(staff.value))
    } catch (error) {
      console.error(
        'Error updating staff in Firestore, saving to localStorage only:',
        error
      )
      const index = staff.value.findIndex((m) => m.id === id)
      if (index !== -1) {
        staff.value[index] = {
          ...staff.value[index],
          ...data,
        }
      }
      localStorage.setItem('personnel', JSON.stringify(staff.value))
    }
  }

  const deleteStaff = async (id) => {
    if (!auth.currentUser) {
      console.warn('No authenticated user found')
      return
    }

    try {
      const docRef = doc(
        db,
        'personnel',
        auth.currentUser.uid,
        'members',
        id
      )
      await deleteDoc(docRef)

      staff.value = staff.value.filter((m) => m.id !== id)
      localStorage.setItem('personnel', JSON.stringify(staff.value))
    } catch (error) {
      console.error(
        'Error deleting staff from Firestore, removing from localStorage only:',
        error
      )
      staff.value = staff.value.filter((m) => m.id !== id)
      localStorage.setItem('personnel', JSON.stringify(staff.value))
    }
  }

  return {
    staff,
    loading,
    searchQuery,
    selectedCategory,
    filteredStaff,
    staffStats,
    loadStaff,
    addStaff,
    updateStaff,
    deleteStaff,
  }
})
