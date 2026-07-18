import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, auth } from '../firebase'
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { inviteCode } from './coParents'

/**
 * Store « comptes enfants » — l'enfant a SON PROPRE compte MAPO+.
 *
 * Le parent génère un code POUR UN ENFANT donné. L'enfant crée son compte, saisit
 * le code, et n'accède alors qu'à SON profil :
 *   - `users/{owner}/enfantsComptes/{enfantUid}` = preuve d'accès (le parent la
 *     voit et peut la révoquer) ;
 *   - `users/{enfantUid}/b2c/link = { ownerUid, enfantId }` — le MÊME pointeur que
 *     le co-parent, mais avec un `enfantId` : c'est lui qui restreint la portée.
 *
 * Différence avec le co-parent (voir coParents.js), volontairement plus étroite :
 * le co-parent voit TOUTE la fratrie et peut écrire partout ; l'enfant ne voit que
 * son document `b2c/enfant_<enfantId>` et ne peut inviter personne. C'est la règle
 * Firestore qui l'impose, pas seulement l'interface.
 */

export const useEnfantsComptesStore = defineStore('enfantsComptes', () => {
  const busy = ref(false)
  const comptes = ref([])       // côté parent : comptes enfants rattachés à MON espace
  const ownerUid = ref(null)    // côté enfant : le parent propriétaire
  const monEnfantId = ref(null) // côté enfant : le profil que je suis autorisé à lire

  function myUid() { return auth.currentUser ? auth.currentUser.uid : null }
  function myName() {
    const p = useAuthStore().userProfile || {}
    return p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'Apprenant'
  }

  /** Parent : génère un code d'accès pour UN enfant précis. */
  async function createInvite(enfantId, prenom) {
    const uid = myUid()
    if (!uid) return { ok: false, reason: 'account' }
    if (!enfantId) return { ok: false, reason: 'enfant' }
    busy.value = true
    try {
      const c = inviteCode()
      await setDoc(doc(db, 'enfantInvites', c), {
        ownerUid: uid,
        enfantId,
        enfantPrenom: prenom || '',
        createdAt: new Date().toISOString(),
      })
      return { ok: true, code: c }
    } catch {
      return { ok: false, reason: 'network' }
    } finally { busy.value = false }
  }

  /** Parent : comptes enfants rattachés à MON espace. */
  async function loadComptes() {
    const uid = myUid()
    if (!uid) { comptes.value = []; return }
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'enfantsComptes'))
      comptes.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch { comptes.value = [] }
  }

  /** Parent : retire l'accès d'un compte enfant. */
  async function removeCompte(enfantUid) {
    const uid = myUid()
    if (!uid || !enfantUid) return { ok: false }
    try {
      await deleteDoc(doc(db, 'users', uid, 'enfantsComptes', enfantUid))
      comptes.value = comptes.value.filter((c) => c.id !== enfantUid)
      return { ok: true }
    } catch { return { ok: false } }
  }

  /** Enfant : rejoint son profil avec le code donné par son parent. */
  async function redeemInvite(rawCode) {
    const uid = myUid()
    const c = String(rawCode || '').trim().toUpperCase()
    if (!uid) return { ok: false, reason: 'account' }
    if (!c) return { ok: false, reason: 'empty' }
    busy.value = true
    try {
      const inv = await getDoc(doc(db, 'enfantInvites', c))
      if (!inv.exists()) return { ok: false, reason: 'invalid' }
      const { ownerUid: owner, enfantId, enfantPrenom } = inv.data()
      if (!owner || !enfantId) return { ok: false, reason: 'invalid' }
      if (owner === uid) return { ok: false, reason: 'self' }
      // Preuve d'accès (vérifiée par la règle contre l'invitation) + pointeur local.
      await setDoc(doc(db, 'users', owner, 'enfantsComptes', uid), {
        enfantUid: uid, enfantId, code: c, name: myName(), addedAt: new Date().toISOString(),
      })
      await setDoc(doc(db, 'users', uid, 'b2c', 'link'), { ownerUid: owner, enfantId })
      ownerUid.value = owner
      monEnfantId.value = enfantId
      return { ok: true, prenom: enfantPrenom || '' }
    } catch {
      return { ok: false, reason: 'network' }
    } finally { busy.value = false }
  }

  /** Enfant : suis-je rattaché à un profil ? */
  async function loadMyLink() {
    const uid = myUid()
    if (!uid) { ownerUid.value = null; monEnfantId.value = null; return }
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'b2c', 'link'))
      const d = snap.exists() ? snap.data() : null
      ownerUid.value = d?.ownerUid || null
      monEnfantId.value = d?.enfantId || null
    } catch { ownerUid.value = null; monEnfantId.value = null }
  }

  return { busy, comptes, ownerUid, monEnfantId, createInvite, loadComptes, removeCompte, redeemInvite, loadMyLink }
})
