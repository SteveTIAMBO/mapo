import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useElevesStore } from './eleves'
import { useAuthStore } from './auth'

/**
 * Store "parentChildren" — lien parent → enfants, partagé par TOUTES les vues
 * de l'espace parent.
 *
 * - Un parent peut avoir plusieurs enfants (même école ou plusieurs niveaux).
 * - Le rapprochement se fait par TÉLÉPHONE en priorité (réalité Afrique : peu
 *   d'emails), avec repli sur l'email. On compare les 9 derniers chiffres du
 *   numéro pour tolérer +237 / 00237 / espaces / formats variés.
 * - L'enfant actif (`activeChildId`) est mémorisé et commun à toutes les vues :
 *   on change d'enfant une fois, ça se propage partout (notes, finances,
 *   présences, emploi du temps…).
 */

const ACTIVE_KEY = 'mapo_parent_active_child'

function phoneKey(s) {
  const digits = (s || '').replace(/\D/g, '')
  return digits ? digits.slice(-9) : ''
}
function emailKey(s) {
  return (s || '').trim().toLowerCase()
}

export const useParentChildrenStore = defineStore('parentChildren', () => {
  const elevesStore = useElevesStore()
  const authStore = useAuthStore()

  const activeChildId = ref('')
  try { activeChildId.value = localStorage.getItem(ACTIVE_KEY) || '' } catch { /* ignore */ }

  // Enfants liés au parent connecté (tél prioritaire, email en repli).
  const children = computed(() => {
    const p = authStore.userProfile || {}
    const pEmail = emailKey(p.email)
    const pPhone = phoneKey(p.phone || p.phoneNumber || p.tel || p.telephone)
    if (!pEmail && !pPhone) return []
    return elevesStore.eleves
      .filter((e) => (e.status || 'inscrit') === 'inscrit')
      .filter((e) => {
        const byPhone = pPhone && (phoneKey(e.parentPhone) === pPhone || phoneKey(e.parentPhone2) === pPhone)
        const byEmail = pEmail && emailKey(e.parentEmail) === pEmail
        return byPhone || byEmail
      })
      .sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''))
  })

  // Enfant actuellement affiché (par défaut le premier).
  const activeChild = computed(() => {
    if (!children.value.length) return null
    return children.value.find((c) => c.id === activeChildId.value) || children.value[0]
  })

  function setActiveChild(id) {
    activeChildId.value = id
    try { localStorage.setItem(ACTIVE_KEY, id) } catch { /* ignore */ }
  }

  return { activeChildId, children, activeChild, setActiveChild }
})
