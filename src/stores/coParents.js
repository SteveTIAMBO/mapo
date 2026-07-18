import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, auth } from '../firebase'
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { useAuthStore } from './auth'

/**
 * Store « co-parents » — accès partagé d'un espace MAPO+ B2C entre deux parents.
 *
 * Le parent 1 (propriétaire des enfants, sous `users/{owner}/b2c/enfants`) génère
 * un CODE d'invitation. Le parent 2, avec son PROPRE compte MAPO+, saisit ce code :
 *   - un lien est créé sous `users/{owner}/coParents/{uid2}` (preuve d'accès) ;
 *   - un pointeur `users/{uid2}/b2c/link = { ownerUid }` indique à son appli de
 *     charger les enfants du propriétaire.
 * Les deux parents ont alors les MÊMES droits (lecture + écriture) sur la scolarité.
 *
 * Sécurité : l'accès aux données du propriétaire est accordé par la règle Firestore
 * uniquement si le document de lien existe ; et le lien ne peut être créé qu'avec un
 * code d'invitation valide émis par le propriétaire (voir firestore.rules).
 */

// Code d'invitation : 8 caractères sur un alphabet de 31 → ~8.5e11 combinaisons.
// Les règles n'autorisent que `get` (pas de listing), donc un code ne peut pas
// être énuméré : le deviner est hors de portée en pratique.
function inviteCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // sans I,O,0,1,L (lisibles)
  const buf = new Uint32Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf)
  else for (let i = 0; i < 8; i++) buf[i] = Math.floor(Math.random() * 4294967296)
  let c = ''
  for (let i = 0; i < 8; i++) c += chars[buf[i] % chars.length]
  return c
}

export const useCoParentsStore = defineStore('coParents', () => {
  const busy = ref(false)
  const coParents = ref([])       // côté propriétaire : liste des co-parents rattachés
  const ownerUid = ref(null)      // côté co-parent : le parent propriétaire auquel je suis lié
  const ownerName = ref('')

  function myUid() { return auth.currentUser ? auth.currentUser.uid : null }
  function myName() {
    const p = useAuthStore().userProfile || {}
    return p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'Parent'
  }

  /** Propriétaire : génère un code d'invitation pour l'autre parent. */
  async function createInvite() {
    const uid = myUid()
    if (!uid) return { ok: false, reason: 'account' }
    busy.value = true
    try {
      const c = inviteCode()
      await setDoc(doc(db, 'coParentInvites', c), { ownerUid: uid, ownerName: myName(), createdAt: new Date().toISOString() })
      return { ok: true, code: c }
    } catch (e) {
      return { ok: false, reason: 'network' }
    } finally { busy.value = false }
  }

  /** Propriétaire : liste des co-parents rattachés à MON espace. */
  async function loadCoParents() {
    const uid = myUid()
    if (!uid) { coParents.value = []; return }
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'coParents'))
      coParents.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch { coParents.value = [] }
  }

  /** Propriétaire : retire un co-parent (révoque l'accès). */
  async function removeCoParent(coParentUid) {
    const uid = myUid()
    if (!uid || !coParentUid) return { ok: false }
    try {
      await deleteDoc(doc(db, 'users', uid, 'coParents', coParentUid))
      coParents.value = coParents.value.filter((c) => c.id !== coParentUid)
      return { ok: true }
    } catch { return { ok: false } }
  }

  /** Co-parent : rejoint l'espace d'un parent avec un code d'invitation. */
  async function redeemInvite(rawCode) {
    const uid = myUid()
    const c = String(rawCode || '').trim().toUpperCase()
    if (!uid) return { ok: false, reason: 'account' }
    if (!c) return { ok: false, reason: 'empty' }
    busy.value = true
    try {
      const inv = await getDoc(doc(db, 'coParentInvites', c))
      if (!inv.exists()) return { ok: false, reason: 'invalid' }
      const owner = inv.data().ownerUid
      if (!owner) return { ok: false, reason: 'invalid' }
      if (owner === uid) return { ok: false, reason: 'self' }
      // Preuve d'accès (vérifiée par la règle contre l'invitation) + pointeur local.
      await setDoc(doc(db, 'users', owner, 'coParents', uid), { coParentUid: uid, code: c, name: myName(), addedAt: new Date().toISOString() })
      await setDoc(doc(db, 'users', uid, 'b2c', 'link'), { ownerUid: owner })
      ownerUid.value = owner
      ownerName.value = inv.data().ownerName || ''
      return { ok: true, ownerName: ownerName.value }
    } catch (e) {
      return { ok: false, reason: 'network' }
    } finally { busy.value = false }
  }

  /** Co-parent : suis-je rattaché à un parent propriétaire ? */
  async function loadMyLink() {
    const uid = myUid()
    if (!uid) { ownerUid.value = null; return }
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'b2c', 'link'))
      ownerUid.value = snap.exists() ? (snap.data()?.ownerUid || null) : null
    } catch { ownerUid.value = null }
  }

  /** Co-parent : quitte l'espace partagé. */
  async function unlink() {
    const uid = myUid()
    if (!uid || !ownerUid.value) return { ok: false }
    try {
      await deleteDoc(doc(db, 'users', ownerUid.value, 'coParents', uid)).catch(() => {})
      await deleteDoc(doc(db, 'users', uid, 'b2c', 'link'))
      ownerUid.value = null
      ownerName.value = ''
      return { ok: true }
    } catch { return { ok: false } }
  }

  return { busy, coParents, ownerUid, ownerName, createInvite, loadCoParents, removeCoParent, redeemInvite, loadMyLink, unlink }
})
