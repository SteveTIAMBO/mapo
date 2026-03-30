import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth, googleProvider, db } from '../firebase'
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userProfile = ref(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')
  const isDirecteur = computed(() => ['admin', 'directeur'].includes(userProfile.value?.role))

  // Connexion avec Google Workspace
  async function loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await loadUserProfile(result.user)
      return { success: true }
    } catch (error) {
      console.error('Erreur connexion Google:', error)
      return { success: false, error: error.message }
    }
  }

  // Charger le profil Firestore de l'utilisateur
  async function loadUserProfile(firebaseUser) {
    if (!firebaseUser) return
    const ref_ = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref_)

    if (snap.exists()) {
      userProfile.value = snap.data()
    } else {
      // Première connexion : créer le profil
      const newProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        role: 'enseignant', // rôle par défaut
        createdAt: new Date()
      }
      await setDoc(ref_, newProfile)
      userProfile.value = newProfile
    }
  }

  // Déconnexion
  async function logout() {
    await signOut(auth)
    user.value = null
    userProfile.value = null
  }

  // Écouter les changements d'état d'authentification
  function init() {
    onAuthStateChanged(auth, async (firebaseUser) => {
      user.value = firebaseUser
      if (firebaseUser) {
        try {
          await loadUserProfile(firebaseUser)
        } catch (error) {
          console.error('Erreur chargement profil:', error)
          userProfile.value = null
        }
      } else {
        userProfile.value = null
      }
      loading.value = false
    })
  }

  return {
    user, userProfile, loading,
    isAuthenticated, isAdmin, isDirecteur,
    loginWithGoogle, logout, init
  }
})
