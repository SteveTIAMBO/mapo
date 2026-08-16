import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth as fbAuth, db } from '../firebase'
import { doc, setDoc, collection, getDocs } from 'firebase/firestore'
import { idLigue, TAILLE_LIGUE, zoneClassement } from '../utils/pointsEffort'

/**
 * Store « ligue » — classement hebdomadaire à l'effort.
 *
 * Une ligue par (semaine ISO, niveau de classe). Chaque participant écrit sa
 * propre entrée et lit toute la ligue.
 *
 * ⚠️ CE QUI EST PUBLIÉ : prénom et total de points, RIEN D'AUTRE. Ce sont des
 * mineurs, et la règle Firestore ferme la liste des champs — même un client
 * modifié ne peut y glisser l'école, le pays ou l'âge. Le classement ne doit
 * jamais devenir un annuaire d'enfants.
 *
 * SOURCE DE VÉRITÉ = LE SERVEUR (server/mapo-points.php) depuis que les points
 * s'échangent contre des tokens. Le calcul local subsiste pour l'affichage
 * immédiat et le mode hors ligne, mais le total du serveur écrase le local dès
 * qu'il répond. On ne peut pas demander au client de compter ce qu'on lui paie.
 */

// Total de points de la semaine, par apprenant. Local : c'est la source, le
// document de ligue n'en est que la publication.
const CLE_POINTS = (sid, ligue) => `mapo_b2c_points_${ligue}_${sid || 'me'}`

export const useLigueStore = defineStore('ligue', () => {
  const membres = ref([])       // [{ uid, prenom, points }] triés
  const chargement = ref(false)
  const ligueCourante = ref('')

  function uid() { return fbAuth.currentUser ? fbAuth.currentUser.uid : null }

  /** Points cumulés cette semaine (lecture locale, instantanée et hors ligne). */
  function pointsSemaine(studentId, niveau) {
    const l = idLigue(niveau)
    try { return Number(localStorage.getItem(CLE_POINTS(studentId, l))) || 0 } catch { return 0 }
  }

  /**
   * Ajoute des points et publie le nouveau total dans la ligue.
   *
   * L'écriture distante est best-effort : hors ligne, le total local continue
   * de monter et sera publié à la prochaine séance connectée. Perdre le
   * classement d'une semaine n'est rien ; empêcher un enfant de réviser parce
   * que le réseau est absent serait grave.
   */
  async function ajouterPoints(studentId, niveau, prenom, points) {
    const gain = Math.max(0, Number(points) || 0)
    if (!gain) return { total: pointsSemaine(studentId, niveau) }
    const l = idLigue(niveau)
    const total = pointsSemaine(studentId, niveau) + gain
    try { localStorage.setItem(CLE_POINTS(studentId, l), String(total)) } catch { /* quota */ }

    const u = uid()
    if (u) {
      // Le plafond de la règle est à 100 000 : on borne AVANT d'écrire, sinon
      // l'écriture serait refusée et le classement figé sans que ça se voie.
      const publie = Math.min(100000, total)
      setDoc(doc(db, 'ligues', l, 'membres', u), {
        points: publie,
        prenom: String(prenom || '').trim().slice(0, 40),
        maj: new Date().toISOString(),
      }).catch(() => { /* hors ligne : republié à la prochaine séance */ })
    }
    return { total }
  }

  /**
   * Publie un total QUI VIENT DU SERVEUR.
   *
   * Remplace l'ancien cumul local : le client n'additionne plus rien, il
   * recopie. Le miroir local reste écrit pour que le classement s'affiche
   * hors ligne, mais il ne fait plus autorité.
   */
  async function publierTotal(studentId, niveau, prenom, total) {
    const t = Math.max(0, Number(total) || 0)
    const l = idLigue(niveau)
    try { localStorage.setItem(CLE_POINTS(studentId, l), String(t)) } catch { /* quota */ }
    const u = uid()
    if (!u) return { total: t }
    // Le plafond de la règle est à 100 000 : on borne AVANT d'écrire, sinon
    // l'écriture serait refusée et le classement figé sans que ça se voie.
    setDoc(doc(db, 'ligues', l, 'membres', u), {
      points: Math.min(100000, t),
      prenom: String(prenom || '').trim().slice(0, 40),
      maj: new Date().toISOString(),
    }).catch(() => { /* hors ligne : republié à la prochaine séance */ })
    return { total: t }
  }

  /** Charge le classement de la ligue courante. */
  async function charger(niveau) {
    const l = idLigue(niveau)
    ligueCourante.value = l
    chargement.value = true
    try {
      const snap = await getDocs(collection(db, 'ligues', l, 'membres'))
      membres.value = snap.docs
        .map((d) => ({ uid: d.id, prenom: d.data()?.prenom || '', points: Number(d.data()?.points) || 0 }))
        .sort((a, b) => b.points - a.points || a.prenom.localeCompare(b.prenom))
        .slice(0, TAILLE_LIGUE)
    } catch {
      // Règle absente, hors ligne, ou ligue vide : on n'affiche rien plutôt
      // qu'un classement faux.
      membres.value = []
    } finally {
      chargement.value = false
    }
  }

  /** Rang de l'utilisateur courant (1-based), ou 0 s'il n'est pas classé. */
  const monRang = computed(() => {
    const u = uid()
    if (!u) return 0
    const i = membres.value.findIndex((m) => m.uid === u)
    return i < 0 ? 0 : i + 1
  })

  const maZone = computed(() => zoneClassement(monRang.value, membres.value.length))

  return { membres, chargement, ligueCourante, monRang, maZone, pointsSemaine, ajouterPoints, publierTotal, charger }
})
