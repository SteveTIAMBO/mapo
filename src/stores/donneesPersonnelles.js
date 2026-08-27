import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth, db } from '../firebase'
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { doc, getDoc, getDocs, deleteDoc, collection } from 'firebase/firestore'
import { useEnfantsComptesStore } from './enfantsComptes'
import { useEnfantsAutonomesStore } from './enfantsAutonomes'

/**
 * Store « donneesPersonnelles » — les droits RGPD, côté code.
 *
 * MAPO+ conserve des données d'ENFANTS MINEURS : prénom, nom, âge, photo,
 * notes, profil de compétences. C'est la catégorie la plus sensible qui soit
 * pour un parent, et la première question d'une école ou d'une famille
 * française. Deux droits ne peuvent pas se régler par une page de texte, ils
 * demandent du code :
 *
 *  - ACCÈS et PORTABILITÉ (art. 15 et 20) : `exporterMesDonnees()` produit un
 *    fichier lisible contenant TOUT ce que l'application détient sur le compte.
 *  - EFFACEMENT (art. 17) : `supprimerMonCompte()` détruit ces données puis le
 *    compte lui-même.
 *
 * Choix assumé : on n'« anonymise » pas, on supprime. Un profil d'enfant
 * anonymisé reste ré-identifiable par ses notes et son école — mieux vaut
 * effacer franchement.
 */
export const useDonneesPersonnellesStore = defineStore('donneesPersonnelles', () => {
  const busy = ref(false)
  const erreur = ref('')

  function uid() { return auth.currentUser ? auth.currentUser.uid : null }

  /**
   * Rassemble tout ce qui est rattaché au compte : le profil, la
   * sous-collection `b2c` (enfants, lien, compte enfant) et le registre
   * d'inscription B2C. Renvoie un objet simple, prêt à sérialiser.
   */
  async function collecterMesDonnees() {
    const u = uid()
    if (!u) return null
    const paquet = {
      exporteLe: new Date().toISOString(),
      compte: { uid: u, email: auth.currentUser.email || null },
      profil: null,
      b2c: {},
      revisions: {},
      registreMapoPlus: null,
      // Données locales à l'appareil : elles n'existent que dans ce navigateur,
      // mais elles font partie de ce que la personne peut légitimement réclamer.
      local: {},
    }
    try {
      const s = await getDoc(doc(db, 'users', u))
      if (s.exists()) paquet.profil = s.data()
    } catch { /* lecture refusée ou hors ligne : on exporte ce qu'on peut */ }
    try {
      const snap = await getDocs(collection(db, 'users', u, 'b2c'))
      for (const d of snap.docs) paquet.b2c[d.id] = d.data()
    } catch { /* idem */ }
    // ⚠️ L'historique de révisions manquait à l'export. C'est pourtant la donnée
    // la plus parlante du compte : ce que la personne a travaillé, quel jour,
    // avec quels résultats. Un export qui l'omet n'est pas « tout ce que
    // l'application détient », contrairement à ce que la page annonce.
    try {
      const snap = await getDocs(collection(db, 'users', u, 'revisions'))
      for (const d of snap.docs) paquet.revisions[d.id] = d.data()
    } catch { /* idem */ }
    try {
      const s = await getDoc(doc(db, 'mapoplus_users', u))
      if (s.exists()) paquet.registreMapoPlus = s.data()
    } catch { /* idem */ }
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('mapo')) paquet.local[k] = localStorage.getItem(k)
      }
    } catch { /* quota / navigation privée */ }
    return paquet
  }

  /** Télécharge l'export au format JSON (lisible et réutilisable ailleurs). */
  async function exporterMesDonnees() {
    busy.value = true
    erreur.value = ''
    try {
      const paquet = await collecterMesDonnees()
      if (!paquet) { erreur.value = 'non_connecte'; return false }
      const blob = new Blob([JSON.stringify(paquet, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mapoplus-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    } catch (e) {
      erreur.value = String((e && e.code) || 'export_impossible')
      return false
    } finally {
      busy.value = false
    }
  }

  /**
   * Firebase exige une connexion RÉCENTE (moins de 5 minutes) pour supprimer un
   * compte. On le vérifie AVANT de toucher à quoi que ce soit.
   */
  async function connexionRecente() {
    const u = auth.currentUser
    if (!u) return false
    try {
      const r = await u.getIdTokenResult()
      const age = Date.now() - Date.parse(r.authTime)
      return age < 4 * 60 * 1000 // marge sous les 5 min de Firebase
    } catch { return false }
  }

  /** Reconnexion par mot de passe, préalable à une suppression. */
  async function reauthentifier(motDePasse) {
    const u = auth.currentUser
    if (!u || !u.email) return { ok: false, reason: 'non_connecte' }
    try {
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, motDePasse))
      return { ok: true }
    } catch (e) {
      const c = (e && e.code) || ''
      if (c === 'auth/wrong-password' || c === 'auth/invalid-credential') return { ok: false, reason: 'mdp_faux' }
      return { ok: false, reason: 'echec' }
    }
  }

  /**
   * Supprime les données du compte, puis le compte.
   *
   * ⚠️ LEÇON PAYÉE EN PRODUCTION. La version précédente effaçait les données
   * PUIS appelait `deleteUser`, qui a échoué sur `auth/requires-recent-login`.
   * Résultat : toutes les données détruites, le compte toujours vivant, et un
   * message disant « ça n'a pas marché ». Le pire des deux mondes, exactement ce
   * que l'ordre était censé éviter.
   *
   * La vraie protection n'est pas dans l'ordre, elle est AVANT : on vérifie que
   * la suppression du compte sera acceptée, et on ne détruit rien tant qu'on
   * n'en est pas sûr. `deleteUser` échoue de façon PRÉVISIBLE — il fallait donc
   * traiter ce cas d'abord, pas le rattraper après.
   */
  async function supprimerMonCompte() {
    const u = uid()
    if (!u) { erreur.value = 'non_connecte'; return false }
    // GARDE-FOU : rien n'est effacé si le compte ne pourra pas être supprimé.
    if (!(await connexionRecente())) { erreur.value = 'auth/requires-recent-login'; return false }
    busy.value = true
    erreur.value = ''
    try {
      // 0. Les COMPTES ENFANTS rattachés, d'abord. Ce sont des comptes
      //    d'authentification distincts : les laisser derrière soi ferait
      //    survivre l'accès d'un mineur à un espace dont le parent est parti.
      //    Ils appartiennent au parent, c'est donc à lui de les emporter.
      try {
        const eco = useEnfantsComptesStore()
        const enfants = useEnfantsAutonomesStore()
        for (const e of (enfants.enfants || [])) {
          await eco.supprimerCompteEnfant(e.id)
        }
      } catch { /* best-effort : ne doit jamais empêcher la suppression du parent */ }
      // 1. La sous-collection b2c : profils enfants, lien co-parent, compte enfant.
      try {
        const snap = await getDocs(collection(db, 'users', u, 'b2c'))
        for (const d of snap.docs) await deleteDoc(d.ref)
      } catch { /* déjà vide ou hors ligne */ }
      // 1 bis. L'HISTORIQUE DE RÉVISIONS (`users/{uid}/revisions/*`).
      //    ⚠️ Il survivait à la suppression du compte. Supprimer le document
      //    parent `users/{uid}` ne supprime PAS ses sous-collections : Firestore
      //    n'a pas de suppression en cascade, et un document parent effacé
      //    laisse ses enfants intacts et lisibles par chemin direct. On avait
      //    donc un « effacement » (art. 17) qui laissait derrière lui le détail
      //    de ce que la personne avait révisé, jour par jour.
      try {
        const snap = await getDocs(collection(db, 'users', u, 'revisions'))
        for (const d of snap.docs) await deleteDoc(d.ref)
      } catch { /* déjà vide ou hors ligne */ }
      // 2. Le registre d'inscription B2C (suivi d'adoption côté EDUFREM).
      try { await deleteDoc(doc(db, 'mapoplus_users', u)) } catch { /* absent */ }
      // 3. Le document de profil.
      try { await deleteDoc(doc(db, 'users', u)) } catch { /* absent */ }
      // 4. Tout ce qui traîne dans ce navigateur.
      try {
        const aSupprimer = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith('mapo')) aSupprimer.push(k)
        }
        for (const k of aSupprimer) localStorage.removeItem(k)
      } catch { /* quota / navigation privée */ }
      // 5. Le compte lui-même.
      await deleteUser(auth.currentUser)
      return true
    } catch (e) {
      erreur.value = String((e && e.code) || 'suppression_impossible')
      return false
    } finally {
      busy.value = false
    }
  }

  return { busy, erreur, collecterMesDonnees, exporterMesDonnees, supprimerMonCompte, connexionRecente, reauthentifier }
})
