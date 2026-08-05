import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, auth } from '../firebase'
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { signInWithCustomToken } from 'firebase/auth'
import { useAuthStore } from './auth'
import { inviteCode } from './coParents'

// Proxy serveur qui forge un jeton personnalisé Firebase pour un compte enfant
// à partir d'un code d'invitation valide (lien magique famille). Même origine.
const FAMILLE_URL = '/mapo-famille.php'

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

  /**
   * Enfant : rejoint son espace via le LIEN MAGIQUE (aucune inscription).
   * Le serveur forge un jeton personnalisé si le code est valide ; on connecte
   * l'enfant (signInWithCustomToken) puis on scelle le rattachement via le flux
   * existant `redeemInvite` (mêmes documents, mêmes règles Firestore).
   *
   * ⚠️ Remplace la session courante : à n'utiliser que sur l'appareil de
   * l'ENFANT (l'écran d'accueil du lien confirme avant d'appeler).
   */
  async function joinViaLink(rawCode) {
    const c = String(rawCode || '').trim().toUpperCase()
    if (!c) return { ok: false, reason: 'empty' }
    busy.value = true
    try {
      // 1. Le serveur vérifie le code et forge un jeton personnalisé.
      let data
      try {
        const res = await fetch(FAMILLE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'join_child', code: c }),
        })
        data = await res.json().catch(() => null)
        if (!res.ok || !data || !data.ok || !data.token) {
          return { ok: false, reason: (data && data.error) || 'server' }
        }
      } catch {
        return { ok: false, reason: 'network' }
      }
      // 2. Connexion enfant SANS mot de passe (remplace la session courante).
      try {
        const cred = await signInWithCustomToken(auth, data.token)
        // On pose TOUT DE SUITE l'utilisateur dans le store, sans attendre
        // `onAuthStateChanged`. Sans cela, la vue naviguait vers l'espace avant
        // que le store ait vu la nouvelle session : le garde ne trouvait
        // personne de connecté et renvoyait vers l'accueil — l'enfant tombait
        // sur l'écran de connexion, et le lien semblait ne rien faire.
        const authStore = useAuthStore()
        authStore.user = cred.user
        authStore.isDemo = false
      } catch (e) {
        return { ok: false, reason: 'signin', detail: e && (e.code || e.message) }
      }
      // 3. Sceller le rattachement (preuve d'accès + pointeur `b2c/link`).
      const rr = await redeemInvite(c)
      // « self » = le propriétaire a cliqué son propre lien : sans objet ici
      // (l'UID enfant forgé n'est jamais celui du parent), on ignore.
      if (!rr.ok && rr.reason !== 'self') {
        return { ok: true, prenom: data.prenom || '', childUid: data.childUid, sealWarn: rr.reason }
      }
      return { ok: true, prenom: data.prenom || rr.prenom || '', childUid: data.childUid }
    } finally {
      busy.value = false
    }
  }


  /** Jeton du parent, pour les actions serveur qui le concernent lui et ses enfants. */
  async function jetonParent() {
    const u = auth.currentUser
    return u ? u.getIdToken() : null
  }

  /**
   * Le PARENT fixe l'identifiant et le code de son enfant.
   *
   * C'est le parent qui décide, pas l'enfant : on ne demande pas à un mineur de
   * choisir un mot de passe, ni son adresse e-mail. Le code (4 à 6 chiffres) ne
   * transite que vers le serveur et n'est JAMAIS écrit dans la base — c'est
   * Firebase Auth qui le conserve, haché.
   */
  async function definirLoginEnfant(enfantId, identifiant, code) {
    const t = await jetonParent()
    if (!t) return { ok: false, reason: 'account' }
    busy.value = true
    try {
      const res = await fetch(FAMILLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify({ action: 'set_child_login', enfantId, identifiant, code }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok || !d || !d.ok) return { ok: false, reason: (d && d.error) || 'server' }
      return { ok: true, identifiant: d.identifiant }
    } catch {
      return { ok: false, reason: 'network' }
    } finally { busy.value = false }
  }

  /**
   * Le PARENT supprime le compte de son enfant (compte d'authentification +
   * documents). Un mineur n'a pas à réclamer lui-même l'effacement de ses
   * données : ce droit s'exerce par son parent.
   */
  async function supprimerCompteEnfant(enfantId) {
    const t = await jetonParent()
    if (!t) return { ok: false, reason: 'account' }
    busy.value = true
    try {
      const res = await fetch(FAMILLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify({ action: 'delete_child', enfantId }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok || !d || !d.ok) return { ok: false, reason: (d && d.error) || 'server' }
      await loadComptes()
      return { ok: true }
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

  return { busy, comptes, ownerUid, monEnfantId, createInvite, loadComptes, removeCompte, redeemInvite, joinViaLink, loadMyLink,
    definirLoginEnfant, supprimerCompteEnfant }
})
