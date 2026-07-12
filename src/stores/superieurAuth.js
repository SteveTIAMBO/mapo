import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useAuthStore } from './auth'

/**
 * Façade superieurAuth — délègue à `auth.js`.
 *
 * Historique : ce store gérait sa propre session démo Sup (localStorage,
 * profil isolé). Depuis 2026-05-28 (phase 2.2 multi-tenant Firebase MAPO Sup),
 * on FUSIONNE : un user a UN seul compte EDUFREM (gérer par `auth.js`),
 * avec son `schoolId`, son `role` et son `edition`.
 *
 * Ce fichier reste comme **façade légère** pour ne pas casser les vues sup
 * existantes (SuperieurLogin, SuperieurView, fiches détail). Aucun état
 * propre : tout vit dans le store auth principal.
 *
 * À terme (Firebase branché), `loginAs` créera une session Firebase Auth
 * pour les vrais comptes ; aujourd'hui, on délègue à `loginDemoSup` qui
 * fait le login démo sans mot de passe.
 */

/**
 * Catalogue des rôles superieur. Utilisé par SuperieurLogin pour afficher
 * la liste cliquable et par SuperieurView pour le filtrage des onglets.
 * `enabled: true` = on peut se connecter avec ce rôle en démo.
 */
export const SUP_ROLES = {
  admin: {
    key: 'admin',
    label: 'Administrateur',
    description: 'Accès complet à tous les modules',
    enabled: true,
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>',
  },
  relation_internationale: {
    key: 'relation_internationale',
    label: 'Relations internationales',
    description: 'Suivi des étudiants en mobilité entrante : dossiers, visa, logement, arrivée',
    enabled: true,
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  },
  comptable: {
    key: 'comptable',
    label: 'Comptable',
    description: 'Facturation, paiements, suivi financier',
    enabled: true,
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  },
  responsable_formation: {
    key: 'responsable_formation',
    label: 'Responsable de formation',
    description: 'Construction et pilotage des programmes',
    enabled: true,
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>',
  },
  etudiant: {
    key: 'etudiant',
    label: 'Étudiant',
    description: 'Mon parcours, mes notes, mon emploi du temps',
    enabled: true,
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  },
  enseignant: {
    key: 'enseignant',
    label: 'Enseignant',
    description: 'Mes cours, mes étudiants, la saisie des notes',
    enabled: true,
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  },
  parent: {
    key: 'parent',
    label: 'Parent',
    description: 'Le suivi de mon étudiant : notes, paiements, emploi du temps',
    enabled: true,
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  },
}

export const useSuperieurAuthStore = defineStore('superieurAuth', () => {
  const authStore = useAuthStore()

  // L'utilisateur est "connecté à l'espace sup" si :
  //   - démo : userProfile.edition === 'superieur' (set par loginDemoSup)
  //   - école Firebase : userProfile.schoolId est set (le doc users/{uid} ne
  //     contient pas d'edition, l'info est sur schools/{schoolId}). Sur un
  //     tenant école supérieur, le routeur garantit déjà que seul l'espace
  //     Sup est servi, donc accepter ce cas est sûr.
  //   - super admin : userProfile.role === 'superadmin' (accès traversier).
  const profile = computed(() => {
    const p = authStore.userProfile
    if (!p) return null
    if (p.edition === 'superieur') return p
    if (p.role === 'superadmin') return p
    if (p.schoolId && p.uid) return p
    return null
  })
  const isLoggedIn = computed(() => !!profile.value)
  const role = computed(() => profile.value?.role || null)
  const isAdmin = computed(() => role.value === 'admin')

  function loginAs(roleKey) {
    const r = SUP_ROLES[roleKey]
    if (!r) return { success: false, error: 'Rôle inconnu.' }
    if (!r.enabled) {
      return { success: false, error: `Le rôle « ${r.label} » sera bientôt disponible.` }
    }
    return authStore.loginDemoSup(roleKey)
  }

  function logout() {
    return authStore.logout()
  }

  return {
    profile,
    isLoggedIn,
    role,
    isAdmin,
    loginAs,
    logout,
  }
})
