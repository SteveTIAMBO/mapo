import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth, db } from '../firebase'
import { deleteUser } from 'firebase/auth'
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
   * Supprime les données du compte, puis le compte.
   *
   * Ordre volontaire : les données d'abord. Si on supprimait le compte en
   * premier et que l'effacement des documents échouait, les données d'enfants
   * resteraient dans la base SANS que personne ne puisse plus les atteindre pour
   * les effacer — le pire des deux mondes.
   *
   * Firebase refuse `deleteUser` si la connexion est ancienne
   * (`auth/requires-recent-login`). On remonte ce cas tel quel pour que
   * l'interface demande une reconnexion, plutôt que d'échouer en silence.
   */
  async function supprimerMonCompte() {
    const u = uid()
    if (!u) { erreur.value = 'non_connecte'; return false }
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

  return { busy, erreur, collecterMesDonnees, exporterMesDonnees, supprimerMonCompte }
})
