import { useEditionStore } from '../stores/edition'
import { packPays } from '../data/paysDemo'

/**
 * Isolation des DONNÉES DE DÉMONSTRATION par édition ET PAR PAYS.
 * ---------------------------------------------------------------
 * Chaque édition (primaire / secondaire / supérieur) doit avoir son propre jeu
 * de données de démo : une modification faite en primaire ne doit JAMAIS
 * apparaître en secondaire (et inversement). On y parvient en suffixant les clés
 * localStorage des données de démo par l'édition active.
 *
 * Depuis le 22/08/2026, le PAYS choisi sur l'écran de connexion entre dans le
 * même suffixe. C'est ce qui évite l'hybride : sans lui, basculer sur le Congo
 * afficherait une école de Pointe-Noire remplie d'élèves camerounais, parce que
 * les données déjà enregistrées auraient été relues telles quelles. Chaque pays
 * a donc son propre espace, et revenir au Cameroun restitue exactement ce qu'on
 * y avait laissé.
 *
 * Choix des suffixes :
 *   - secondaire → ''            (référence historique : on NE migre PAS les
 *                                 clés existantes, la démo secondaire validée
 *                                 reste intacte)
 *   - primaire   → '_primaire'
 *   - superieur  → '_superieur'  (le supérieur a son propre socle `sup_*`, mais
 *                                 on gère le cas par cohérence)
 *   - Cameroun   → ''            (même raison : c'est le pays de référence)
 *   - Congo      → '_cg'
 *
 * ⚠️ À n'utiliser que pour les clés de DÉMO. Les clés des vraies écoles
 * (cache Firestore par schoolId, ex. `classes`, `mapo_edt_<schoolId>`) ne
 * doivent PAS être suffixées : une école réelle appartient à une seule édition
 * et à un seul pays.
 */

const CLE_PAYS = 'mapo_demo_pays'

/**
 * Pays de démonstration actif.
 *
 * Lu depuis localStorage plutôt que d'un store Pinia : ce suffixe est réclamé
 * par des stores au moment de leur initialisation, donc parfois avant qu'un
 * autre store soit prêt. Une dépendance entre stores produirait ici un ordre de
 * chargement fragile, et l'échec serait muet — on lirait le Cameroun sans le
 * savoir.
 */
export function paysDemo() {
  try { return localStorage.getItem(CLE_PAYS) || 'CM' } catch (e) { return 'CM' }
}

/** Change le pays de démonstration. L'appelant doit recharger l'application. */
export function setPaysDemo(code) {
  try { localStorage.setItem(CLE_PAYS, String(code || 'CM').toUpperCase()) } catch (e) { /* quota */ }
}

/** Suffixe du pays actif ('' pour le Cameroun, la référence). */
export function paysSuffix() {
  return packPays(paysDemo()).suffixe || ''
}

export function demoSuffix() {
  let edition = ''
  try {
    const c = useEditionStore().current
    if (c === 'primaire') edition = '_primaire'
    else if (c === 'superieur') edition = '_superieur'
  } catch (e) {
    edition = ''
  }
  return edition + paysSuffix()
}

/** Retourne la clé de démo suffixée par l'édition ET le pays actifs. */
export function demoKey(base) {
  return base + demoSuffix()
}
