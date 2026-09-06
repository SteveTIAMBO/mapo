import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSchoolStore } from './school'

/**
 * Filtre « système » d'une école bilingue.
 *
 * Un établissement bilingue tient deux systèmes — francophone et anglophone —
 * dans les mêmes murs : des classes, des enseignants et des bulletins de chaque
 * côté. Le censeur du système anglophone n'a pas à faire défiler les classes
 * francophones pour trouver les siennes.
 *
 * UN SEUL choix, partagé par tous les écrans. Un filtre par vue obligerait à le
 * repositionner à chaque navigation, et surtout : on croirait voir toute
 * l'école alors qu'on n'en voit qu'une moitié, parce que le filtre resté actif
 * sur un autre écran ne se voit pas depuis celui-ci.
 *
 * ⚠️ CE STORE NE FAIT RIEN DANS UNE ÉCOLE À UN SEUL SYSTÈME. `actif` y vaut
 * toujours '' et les listes ne sont jamais réduites — voir `estBilingue` dans
 * le store école, qui est l'interrupteur unique de la fonctionnalité.
 */
export const useSystemeFiltreStore = defineStore('systemeFiltre', () => {
  // '' = tous les systèmes. C'est le départ, et le seul état possible pour une
  // école qui n'en déclare qu'un.
  const choix = ref('')

  /**
   * Le filtre RÉELLEMENT appliqué.
   *
   * On ne se fie pas à `choix` seul : si l'école repasse à un seul système
   * alors qu'un filtre était posé, ses listes resteraient amputées sans que
   * rien ne l'explique. Le filtre s'éteint donc avec le mode bilingue.
   */
  const actif = computed(() => {
    try { return useSchoolStore().estBilingue ? choix.value : '' } catch { return '' }
  })

  function choisir(systeme) {
    choix.value = systeme === 'francophone' || systeme === 'anglophone' ? systeme : ''
  }

  /**
   * Cette ligne passe-t-elle le filtre ?
   *
   * ⚠️ UNE LIGNE SANS SYSTÈME PASSE TOUJOURS. Pour un membre du personnel c'est
   * le sens voulu — vide veut dire partagé entre les deux systèmes, comme la
   * direction ou le secrétariat. Pour une classe que l'école n'a pas encore
   * rattachée, c'est une décision de prudence : la cacher ferait disparaître
   * des élèves d'une liste sans rien dire, et on chercherait le défaut partout
   * sauf dans un champ vide.
   */
  function passe(systemeDeLaLigne) {
    if (!actif.value) return true
    const s = String(systemeDeLaLigne || '').trim().toLowerCase()
    return !s || s === actif.value
  }

  return { choix, actif, choisir, passe }
})
