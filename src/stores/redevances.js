import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from './auth'
import { useSchoolStore } from './school'

/**
 * Redevance EDUFREM — le barème est par PAYS, pas par école.
 *
 * Décision de Steve (28/08/2026) : « le taux et les coordonnées plutôt par pays,
 * pas par école ». Une seule fiche par pays, tenue côté adminmapo ; l'école la
 * LIT pour savoir combien elle doit et où verser.
 *
 * ⚠️ C'est le CODE pays (`CM`, `CG`, `SN`, `CI`) qui sélectionne la ligne. Tant
 * que l'import écrivait « Cameroun » en toutes lettres, aucune ligne n'aurait pu
 * être trouvée — d'où la normalisation faite le même jour
 * (`utils/normaliserConfigEcole.js`).
 */

/** Document unique : un seul aller-retour, et une seule source à tenir. */
const CHEMIN = ['edufrem', 'redevances']

/**
 * Taux par défaut, en pourcentage de la scolarité annuelle.
 * 6 % est le modèle en vigueur depuis le mémoire technique du 16/07/2026.
 */
export const TAUX_DEFAUT = 6

/**
 * ⚠️ Aucune coordonnée bancaire n'est écrite en dur, et il ne faut JAMAIS en
 * inventer : un RIB plausible mais faux enverrait l'argent d'une école ailleurs.
 * Un pays sans coordonnées se DIT (`coordonneesManquantes`), il ne s'affiche pas
 * comme un champ vide.
 */
export function baremeVide(pays) {
  return { pays, taux: TAUX_DEFAUT, rib: '', banque: '', orangeMoney: '', titulaire: '', note: '' }
}

export const useRedevancesStore = defineStore('redevances', () => {
  const baremes = ref({})   // { CM: {...}, CG: {...} }
  const charge = ref(false)
  const erreur = ref(null)

  function _ref() { return doc(db, ...CHEMIN) }

  async function charger(force = false) {
    if (charge.value && !force) return
    try {
      const snap = await getDoc(_ref())
      baremes.value = snap.exists() ? (snap.data().pays || {}) : {}
      erreur.value = null
    } catch (e) {
      // On DIT l'échec : sans lui, « aucun barème » et « lecture impossible »
      // se ressembleraient, et l'école croirait ne rien devoir.
      erreur.value = e?.code || 'lecture_impossible'
    }
    charge.value = true
  }

  /** Barème d'un pays — jamais `null` : on rend un barème vide, taux par défaut. */
  function baremePays(code) {
    const c = String(code || '').trim().toUpperCase()
    if (!c) return baremeVide('')
    return { ...baremeVide(c), ...(baremes.value[c] || {}) }
  }

  /** Le pays a-t-il une fiche renseignée par EDUFREM ? */
  function paysRenseigne(code) {
    const c = String(code || '').trim().toUpperCase()
    return !!baremes.value[c]
  }

  /** Barème de L'ÉCOLE courante, d'après son pays. */
  const baremeEcole = computed(() => {
    let pays = ''
    try { pays = useSchoolStore().schoolSettings?.country || '' } catch (e) { pays = '' }
    return baremePays(pays)
  })

  /**
   * Manque-t-il de quoi verser ? On distingue les deux cas :
   * ni RIB ni Orange Money = l'école ne PEUT pas payer, il faut le dire.
   */
  const coordonneesManquantes = computed(() => {
    const b = baremeEcole.value
    return !String(b.rib || '').trim() && !String(b.orangeMoney || '').trim()
  })

  /** Écriture réservée à EDUFREM (super-admin). Les règles le vérifient aussi. */
  async function enregistrer(code, valeurs) {
    const c = String(code || '').trim().toUpperCase()
    if (!c) return { ok: false, reason: 'pays' }
    const authStore = useAuthStore()
    if (!authStore.isSuperAdmin) return { ok: false, reason: 'interdit' }
    const taux = Number(valeurs?.taux)
    // Un taux négatif ou absurde se refuse ici plutôt que de produire des
    // montants faux dans toutes les écoles du pays.
    if (!Number.isFinite(taux) || taux < 0 || taux > 100) return { ok: false, reason: 'taux' }
    const fiche = { ...baremeVide(c), ...valeurs, pays: c, taux }
    try {
      await setDoc(_ref(), { pays: { ...baremes.value, [c]: fiche } }, { merge: true })
      baremes.value = { ...baremes.value, [c]: fiche }
      return { ok: true }
    } catch (e) {
      return { ok: false, reason: e?.code || 'ecriture' }
    }
  }

  return {
    baremes, charge, erreur,
    charger, baremePays, paysRenseigne, enregistrer,
    baremeEcole, coordonneesManquantes,
  }
})
