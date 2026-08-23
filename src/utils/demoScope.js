import { useEditionStore } from '../stores/edition'
import { packPays, PAYS_DEMO } from '../data/paysDemo'

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
  const nouveau = String(code || 'CM').toUpperCase()
  try {
    const precedent = paysDemo()
    localStorage.setItem(CLE_PAYS, nouveau)
    // On libère AVANT de charger le nouveau pays, pas après avoir échoué.
    libererSiNecessaire([nouveau, precedent])
  } catch (e) { /* quota */ }
}

/** Octets approximatifs occupés par la démonstration dans ce navigateur. */
export function poidsDemo() {
  let total = 0
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('mapo_demo') && !CLES_HORS_PAYS.has(k)) total += (localStorage.getItem(k) || '').length
    }
  } catch (e) { /* silent */ }
  return total
}

/**
 * Seuil de libération, en caractères.
 *
 * Un navigateur accorde environ 5 Mo à localStorage. Mesuré le 23/08/2026 :
 * quatre pays visités occupaient 4,9 Mo, et l'écriture suivante échouait —
 * silencieusement, puisque toutes ces écritures sont dans des `try/catch`.
 * On libère bien avant d'y arriver.
 */
const SEUIL_LIBERATION = 3_000_000

/**
 * Purge les données des pays qu'on n'utilise pas, quand la place manque.
 *
 * ⚠️ Ce n'est PAS une purge systématique : tant qu'on tient dans le budget, on
 * garde tout, et revenir sur un pays restitue ce qu'on y avait laissé. On ne
 * sacrifie que ce qu'il faut, et seulement quand il le faut — en conservant le
 * pays courant ET le précédent, qui est l'aller-retour d'une démonstration
 * réelle (le pays du prospect et celui de référence).
 *
 * Renvoie le nombre de clés supprimées : l'appelant peut le DIRE, plutôt que de
 * laisser des données disparaître sans explication.
 */
/**
 * Clés de démonstration qui n'appartiennent à AUCUN pays.
 *
 * ⚠️ Elles commencent par `mapo_demo` comme les autres : les purger
 * réinitialiserait le pays choisi et déconnecterait l'utilisateur en pleine
 * démonstration, sans qu'il comprenne pourquoi.
 */
const CLES_HORS_PAYS = new Set([CLE_PAYS, 'mapo_demo_session'])

export function libererSiNecessaire(aGarder = []) {
  if (poidsDemo() < SEUIL_LIBERATION) return 0
  const suffixesGardes = new Set(
    aGarder.filter(Boolean).map((c) => packPays(c).suffixe || ''),
  )
  const suffixesConnus = Object.values(PAYS_DEMO).map((p) => p.suffixe).filter(Boolean)
  let supprimees = 0
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith('mapo_demo') || CLES_HORS_PAYS.has(k)) continue
      // À quel pays cette clé appartient-elle ? Le Cameroun n'a pas de suffixe :
      // une clé sans suffixe connu est donc camerounaise.
      const suffixe = suffixesConnus.find((sx) => k.endsWith(sx)) || ''
      if (suffixesGardes.has(suffixe)) continue
      localStorage.removeItem(k)
      supprimees++
    }
  } catch (e) { /* silent */ }
  return supprimees
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
