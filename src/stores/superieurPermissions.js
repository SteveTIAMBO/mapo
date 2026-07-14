import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSuperieurAuthStore } from './superieurAuth'

/**
 * RBAC de l'édition Supérieur — matrice rôles × modules
 * -----------------------------------------------------
 * Même modèle que l'édition Secondaire (stores/permissions.js) :
 *   full  : lecture + écriture + suppression
 *   write : lecture + écriture
 *   read  : lecture seule
 *   none  : aucun accès (l'onglet disparaît du menu)
 *
 * Les colonnes de la matrice sont les rôles du PERSONNEL. Les rôles
 * etudiant / enseignant / parent ont leur espace dédié et ne figurent pas ici.
 * Les défauts reproduisent exactement les autorisations d'onglets actuelles
 * (SuperieurView.ALL_TABS) → aucun changement de comportement tant que le
 * directeur ne modifie pas la matrice.
 */

export const SUP_PERMISSION_LEVELS = [
  { value: 'full', label: 'Complet', description: 'Lecture, écriture, suppression', color: '#1B8A5A' },
  { value: 'write', label: 'Écriture', description: 'Lecture et écriture', color: '#1558B0' },
  { value: 'read', label: 'Lecture', description: 'Consultation uniquement', color: '#E8A838' },
  { value: 'none', label: 'Aucun', description: "Pas d'accès", color: '#9A9FA5' },
]

// Modules de l'application Supérieur (lignes de la matrice).
export const SUP_APP_MODULES = [
  { key: 'dashboard', label: 'Tableau de bord', description: "Vue d'ensemble" },
  { key: 'etudiants', label: 'Étudiants', description: 'Annuaire et fiches étudiants' },
  { key: 'formation', label: 'Offre de formation', description: 'Filières, promotions, crédits' },
  { key: 'inscriptions', label: 'Inscriptions', description: "Dossiers d'inscription et réinscription" },
  { key: 'edt', label: 'Emploi du temps', description: 'Planning des cours' },
  { key: 'intervenants', label: 'Intervenants', description: 'Enseignants et vacataires' },
  { key: 'notes', label: 'Notes & relevés', description: 'Saisie et relevés de notes' },
  { key: 'stages', label: 'Stages', description: 'Conventions et suivi de stage' },
  { key: 'salles', label: 'Salles', description: 'Salles et occupation' },
  { key: 'finance', label: 'Finance', description: 'Grilles, comptes, paiements, bourses, échéanciers' },
  { key: 'mobilite_entrante', label: 'Mobilité entrante', description: 'Étudiants en mobilité internationale' },
  { key: 'gestion_acces', label: 'Gestion des accès', description: 'Invitations du personnel' },
  { key: 'parametres', label: 'Paramètres', description: 'Établissement, profil, MIAPO' },
  { key: 'roles', label: 'Rôles & Accès', description: 'Cette page — permissions par rôle' },
]

// Rôles du personnel = colonnes de la matrice.
export const SUP_MATRIX_ROLES = ['admin', 'relation_internationale', 'responsable_formation', 'comptable']

function allFull() {
  const p = {}
  for (const m of SUP_APP_MODULES) p[m.key] = 'full'
  return p
}
function fromAllowed(keys) {
  const set = new Set(keys)
  const p = {}
  for (const m of SUP_APP_MODULES) p[m.key] = set.has(m.key) ? 'full' : 'none'
  return p
}
const clone = (o) => JSON.parse(JSON.stringify(o))

export const SUP_DEFAULT_ROLES = {
  admin: {
    label: 'Directeur / Admin',
    description: 'Accès complet',
    editable: false, // toujours full
    permissions: allFull(),
  },
  relation_internationale: {
    label: 'Relations internationales',
    description: 'Étudiants, inscriptions, mobilité',
    editable: true,
    permissions: fromAllowed(['dashboard', 'etudiants', 'inscriptions', 'mobilite_entrante']),
  },
  responsable_formation: {
    label: 'Responsable formation',
    description: 'Offre, cours, notes, stages',
    editable: true,
    permissions: fromAllowed(['dashboard', 'formation', 'inscriptions', 'edt', 'intervenants', 'notes', 'stages', 'mobilite_entrante']),
  },
  comptable: {
    label: 'Comptable',
    description: 'Finance et recouvrement',
    editable: true,
    permissions: fromAllowed(['dashboard', 'finance', 'mobilite_entrante']),
  },
}

const STORAGE_KEY = 'sup_roles_matrix'

export const useSuperieurPermissionsStore = defineStore('superieurPermissions', () => {
  const authSup = useSuperieurAuthStore()
  const roles = ref(clone(SUP_DEFAULT_ROLES))

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(roles.value)) } catch (e) { /* silent */ }
  }
  function loadRoles() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      const merged = clone(SUP_DEFAULT_ROLES)
      for (const k of Object.keys(merged)) {
        if (parsed[k] && parsed[k].permissions) {
          merged[k].permissions = { ...merged[k].permissions, ...parsed[k].permissions }
        }
      }
      merged.admin.permissions = allFull() // le directeur reste toujours complet
      roles.value = merged
    } catch (e) { /* silent */ }
  }

  function getPermission(moduleKey, roleOverride) {
    const role = roleOverride || authSup.role
    const rd = roles.value[role]
    if (!rd) return 'none'
    return rd.permissions?.[moduleKey] || 'none'
  }
  function hasAccess(moduleKey, roleOverride) { return getPermission(moduleKey, roleOverride) !== 'none' }
  function canWrite(moduleKey, roleOverride) { return ['full', 'write'].includes(getPermission(moduleKey, roleOverride)) }

  function updatePermission(roleName, moduleKey, level) {
    const rd = roles.value[roleName]
    if (rd && rd.editable !== false) {
      rd.permissions[moduleKey] = level
      persist()
    }
  }
  function resetRole(roleName) {
    if (SUP_DEFAULT_ROLES[roleName]) {
      roles.value[roleName] = clone(SUP_DEFAULT_ROLES[roleName])
      persist()
    }
  }

  // Mappe un onglet de SuperieurView vers un module de la matrice
  // (null = hors matrice : espaces perso, à traiter par la liste statique).
  function moduleForTab(tabKey) {
    if (!tabKey) return null
    if (tabKey.startsWith('finance_')) return 'finance'
    if (tabKey.startsWith('espace_')) return null
    return SUP_APP_MODULES.some((m) => m.key === tabKey) ? tabKey : null
  }

  loadRoles()

  return {
    roles,
    getPermission, hasAccess, canWrite,
    updatePermission, resetRole, loadRoles,
    moduleForTab,
  }
})
