import {
  doc, collection, getDocs, setDoc, deleteDoc as fbDeleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { getTenant, tenantSchoolId } from './tenantContext'

/**
 * Couche de synchronisation Firestore pour MAPO Supérieur (phase 2.3).
 *
 * Principe offline-first :
 *   - localStorage reste le cache local (lu/écrit par superieur.js, finance.js,
 *     mobilite.js de façon synchrone).
 *   - En mode `school` (sous-domaine école), au démarrage on PULL Firestore
 *     vers localStorage (asynchrone) puis le store recharge ses reactive.
 *   - Après chaque CRUD, on PUSH le doc affecté vers Firestore en
 *     fire-and-forget (l'UI ne bloque pas, la sync se rattrape quand le
 *     réseau revient grâce à la persistance Firestore native).
 *   - En mode `preview` (mapo.app-edufrem.com), aucune interaction Firestore.
 *
 * Mapping clé localStorage ↔ sous-collection Firestore. Les clés sont celles
 * utilisées dans loadEntity/saveEntity (`sup_<key>_v1`, `fin_<key>_v1`,
 * `mob_<key>_v1`).
 */

// Mapping clé localStorage → nom de sous-collection Firestore.
// Cf ARCHITECTURE-SUPERIEUR.md §4.
const COLL_MAP = {
  // superieur.js
  'sup_intervenants': 'intervenants',
  'sup_ue': 'ue',
  'sup_etudiants': 'etudiants',
  'sup_edt': 'edt',
  'sup_inscriptions': 'inscriptions_peda',
  'sup_notes': 'notes_sup',
  'sup_stages': 'stages',
  'sup_salles': 'salles',
  'sup_prog_responsables': 'programme_responsables',
  // finance.js
  'fin_tarifs': 'finance_tarifs',
  'fin_bourses': 'finance_bourses',
  'fin_comptes': 'finance_comptes',
  'fin_echeances': 'finance_echeances',
  'fin_paiements': 'finance_paiements',
  'fin_financements': 'finance_financements',
  'fin_relances': 'finance_relances',
  'fin_alloc_bourses': 'finance_alloc_bourses',
  // mobilite.js
  'mob_dossiers': 'mobilite_dossiers',
}

// Toutes les clés sup, finance, mobilité gérées.
export const SUP_STORAGE_KEYS = Object.keys(COLL_MAP)

/** Vrai si on est dans une instance école (avec un schoolId Firestore). */
export function isSchoolMode() {
  return getTenant().mode === 'school' && !!tenantSchoolId()
}

/** Identifiant école courant (null en mode preview / megaAdmin). */
export function currentSchoolId() {
  return isSchoolMode() ? tenantSchoolId() : null
}

/** Donne le nom de sous-collection Firestore pour une clé localStorage. */
function collName(storageKey) {
  // Accepte "sup_intervenants" ou "sup_intervenants_v1" → on enlève le _v\d+
  const base = storageKey.replace(/_v\d+$/, '')
  return COLL_MAP[base] || null
}

// ── PULL initial ────────────────────────────────────────────────────
/**
 * Pull une sous-collection Firestore et écrit le résultat en localStorage.
 * Renvoie le nombre de documents lus, ou null en cas d'erreur.
 *
 * Si Firestore est vide pour cette collection, on N'ÉCRASE PAS le
 * localStorage existant (ce qui permet à une démo de continuer à fonctionner
 * si le mode school est testé sans vraies données). En prod sur ENTPE, la
 * collection sera explicitement vide au démarrage et le localStorage le
 * deviendra aussi via splice.
 */
async function pullOne(schoolId, storageKey) {
  const coll = collName(storageKey)
  if (!coll) return null
  try {
    const ref = collection(db, 'schools', schoolId, coll)
    const snap = await getDocs(ref)
    if (snap.empty) return 0
    const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }))
    try {
      localStorage.setItem(`${storageKey}_v1`, JSON.stringify(list))
    } catch (e) { /* silent */ }
    return list.length
  } catch (e) {
    // En cas d'erreur (offline, droits), on garde le cache local. Pas bloquant.
    console.warn(`[supSync] pull ${storageKey} : ${e?.message || e}`)
    return null
  }
}

/**
 * Pull toutes les sous-collections sup/finance/mobilité d'une école.
 * Renvoie un dictionnaire `{ key: count }` (count = null si erreur).
 */
export async function pullAll(schoolId) {
  if (!schoolId) return {}
  const result = {}
  await Promise.all(
    SUP_STORAGE_KEYS.map(async (key) => {
      result[key] = await pullOne(schoolId, key)
    })
  )
  return result
}

// ── PUSH (fire-and-forget) ──────────────────────────────────────────
/**
 * Pousse un document vers Firestore. Fire-and-forget : si ça échoue
 * (offline, droits), Firestore retentera grâce à sa persistance native.
 * Aucun await côté appelant : l'UI ne bloque pas.
 *
 * Pour les "documents" qui ne sont pas des tableaux (ex. PROGRAMME_RESPONSABLES
 * qui est un objet mapping programmeId → intervenantId), utiliser pushDocBulk.
 */
export function pushDoc(storageKey, docId, data) {
  if (!isSchoolMode()) return
  const schoolId = currentSchoolId()
  const coll = collName(storageKey)
  if (!schoolId || !coll || !docId) return
  try {
    const ref = doc(db, 'schools', schoolId, coll, String(docId))
    setDoc(ref, data, { merge: true }).catch((e) => {
      console.warn(`[supSync] push ${storageKey}/${docId} : ${e?.message || e}`)
    })
  } catch (e) {
    console.warn(`[supSync] push setup ${storageKey}/${docId} : ${e?.message || e}`)
  }
}

/**
 * Supprime un document Firestore. Fire-and-forget.
 */
export function deleteDoc(storageKey, docId) {
  if (!isSchoolMode()) return
  const schoolId = currentSchoolId()
  const coll = collName(storageKey)
  if (!schoolId || !coll || !docId) return
  try {
    const ref = doc(db, 'schools', schoolId, coll, String(docId))
    fbDeleteDoc(ref).catch((e) => {
      console.warn(`[supSync] delete ${storageKey}/${docId} : ${e?.message || e}`)
    })
  } catch (e) {
    console.warn(`[supSync] delete setup ${storageKey}/${docId} : ${e?.message || e}`)
  }
}

/**
 * Pour les entités "objets-mapping" (ex. PROGRAMME_RESPONSABLES qui est un
 * objet et non un tableau), on stocke comme UN document Firestore unique
 * d'id "_singleton" sous la collection.
 *
 * En pratique : `programme_responsables/_singleton` = { 'bachelor-mgt': 'int-001', ... }.
 */
export function pushSingleton(storageKey, data) {
  if (!isSchoolMode()) return
  const schoolId = currentSchoolId()
  const coll = collName(storageKey)
  if (!schoolId || !coll) return
  try {
    const ref = doc(db, 'schools', schoolId, coll, '_singleton')
    setDoc(ref, { data }, { merge: false }).catch((e) => {
      console.warn(`[supSync] push singleton ${storageKey} : ${e?.message || e}`)
    })
  } catch (e) {
    console.warn(`[supSync] push singleton setup ${storageKey} : ${e?.message || e}`)
  }
}
