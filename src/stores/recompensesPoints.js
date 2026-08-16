import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth as fbAuth } from '../firebase'
import { useEnfantsAutonomesStore } from './enfantsAutonomes'

/**
 * Points d'effort — dialogue avec le registre SERVEUR.
 *
 * Le serveur (server/mapo-points.php) est la source de vérité : c'est lui qui
 * compte, qui tient la série de jours à partir de SES dates, et qui plafonne.
 * Le client ne fait que déclarer « une séance vient de se terminer ».
 *
 * Hors ligne, on ne perd rien d'important : la séance n'est pas comptée, et on
 * le DIT. Créditer localement puis rejouer à la reconnexion ouvrirait la porte
 * exacte qu'on vient de fermer — il suffirait de couper le réseau pour
 * fabriquer des points.
 */
const URL_POINTS = '/mapo-points.php'

export const useRecompensesPointsStore = defineStore('recompensesPoints', () => {
  const etat = ref(null)        // vue renvoyée par le serveur
  const chargement = ref(false)
  const horsLigne = ref(false)  // le serveur n'a pas répondu à la dernière tentative
  const dernierGain = ref(null) // { total, detail } de la dernière séance comptée

  function famille() {
    try {
      const e = useEnfantsAutonomesStore()
      if (!e.linkedOwnerUid || !e.linkedEnfantId) return undefined
      return { ownerUid: e.linkedOwnerUid, enfantId: e.linkedEnfantId }
    } catch { return undefined }
  }

  async function appeler(action, data) {
    const user = fbAuth.currentUser
    if (!user) return null
    const token = await user.getIdToken().catch(() => null)
    if (!token) return null
    try {
      const res = await fetch(URL_POINTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action, famille: famille(), data }),
      })
      const json = await res.json().catch(() => null)
      horsLigne.value = !json
      if (json && json.points !== undefined) etat.value = json
      return json
    } catch {
      horsLigne.value = true
      return null
    }
  }

  const charger = () => appeler('etat')

  /**
   * Déclare une séance terminée. Renvoie le gain, ou null si rien n'a été
   * compté (hors ligne, ou plafond journalier atteint).
   */
  async function declarerSeance({ meilleureSerie = 0, palierFranchi = false } = {}) {
    const r = await appeler('seance', { meilleureSerie, palierFranchi })
    dernierGain.value = r && r.compte ? r.gain : null
    return r
  }

  /** Convertit des points en tokens MAPO+. Le serveur débite et crédite. */
  async function convertir() {
    chargement.value = true
    const r = await appeler('convertir')
    chargement.value = false
    return r
  }

  /** Signale l'éligibilité à un bon partenaire (aucune promesse faite). */
  const demanderBon = () => appeler('bon')

  return { etat, chargement, horsLigne, dernierGain, charger, declarerSeance, convertir, demanderBon }
})
