import { useEditionStore } from '../stores/edition'

/**
 * Isolation des DONNÉES DE DÉMONSTRATION par édition.
 * -----------------------------------------------------
 * Chaque édition (primaire / secondaire / supérieur) doit avoir son propre jeu
 * de données de démo : une modification faite en primaire ne doit JAMAIS
 * apparaître en secondaire (et inversement). On y parvient en suffixant les clés
 * localStorage des données de démo par l'édition active.
 *
 * Choix du suffixe :
 *   - secondaire → ''            (référence historique : on NE migre PAS les
 *                                 clés existantes, la démo secondaire validée
 *                                 reste intacte)
 *   - primaire   → '_primaire'
 *   - superieur  → '_superieur'  (le supérieur a son propre socle `sup_*`, mais
 *                                 on gère le cas par cohérence)
 *
 * ⚠️ À n'utiliser que pour les clés de DÉMO. Les clés des vraies écoles
 * (cache Firestore par schoolId, ex. `classes`, `mapo_edt_<schoolId>`) ne
 * doivent PAS être suffixées : une école réelle appartient à une seule édition.
 */
export function demoSuffix() {
  try {
    const c = useEditionStore().current
    if (c === 'primaire') return '_primaire'
    if (c === 'superieur') return '_superieur'
    return ''
  } catch (e) {
    return ''
  }
}

/** Retourne la clé de démo suffixée par l'édition active. */
export function demoKey(base) {
  return base + demoSuffix()
}
