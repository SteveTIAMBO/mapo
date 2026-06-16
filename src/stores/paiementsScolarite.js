import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth } from '../firebase'

/**
 * Store « paiementsScolarite » — pont MOBI ↔ MAPO via le bridge serveur.
 *
 * ATTENTION ARCHITECTURE (incident du 7 juin 2026) : MOBI (mobi-9c97b) et
 * MAPO (mapo-edufrem) sont DEUX projets Firebase SÉPARÉS. Les paiements de
 * scolarité vivent dans Firestore MOBI. MAPO n'y accède JAMAIS directement :
 * tout passe par l'endpoint serveur scolarite-bridge.php (mobi.app-edufrem.com),
 * qui vérifie le jeton Firebase MAPO de l'école et la liste d'emails autorisés
 * (gérée par EDUFREM dans l'admin MOBI, collection bridge_ecoles).
 *
 * Workflow à 4 états (document paiements_scolarite côté MOBI) :
 *   declare_etudiant → recu_edufrem → transfert_envoye → recu_ecole
 *
 * Côté MAPO (école), trois capacités :
 *   - lister ses paiements validés par EDUFREM (recu_edufrem et suivants)
 *   - confirmer la réception du virement (→ recu_ecole, l'étudiant est notifié)
 *   - envoyer le certificat de scolarité (PDF) que l'étudiant reçoit dans MOBI
 *
 * Les validations EDUFREM (recu_edufrem, transfert_envoye) se font dans
 * l'admin MOBI, pas ici.
 */

const BRIDGE_URL = 'https://mobi.app-edufrem.com/scolarite-bridge.php'
const CERTIFICAT_URL = 'https://mobi.app-edufrem.com/certificat.php'

export const PAIEMENT_STATUTS = {
  declare_etudiant: {
    label: 'Déclaré par l’étudiant',
    courtEtudiant: 'En attente de validation EDUFREM',
    courtEdufrem: 'Nouveau paiement à valider',
    courtEcole: 'Paiement déclaré, en cours chez EDUFREM',
    tone: 'info',
    order: 1,
  },
  recu_edufrem: {
    label: 'Reçu par EDUFREM',
    courtEtudiant: 'Reçu par EDUFREM, transfert à venir',
    courtEdufrem: 'À transférer à l’école',
    courtEcole: 'Paiement reçu par EDUFREM, transfert à venir',
    tone: 'warning',
    order: 2,
  },
  transfert_envoye: {
    label: 'Transfert envoyé à l’école',
    courtEtudiant: 'Transfert à l’école en cours',
    courtEdufrem: 'En attente de confirmation école',
    courtEcole: 'Virement envoyé, à confirmer côté école',
    tone: 'progress',
    order: 3,
  },
  recu_ecole: {
    label: 'Reçu par l’école',
    courtEtudiant: 'Scolarité validée par l’école',
    courtEdufrem: 'Cycle terminé',
    courtEcole: 'Reçu, scolarité validée',
    tone: 'success',
    order: 4,
  },
}

export const MODES_PAIEMENT = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'especes', label: 'Espèces (dépôt)' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'cb', label: 'Carte bancaire' },
]

// Messages lisibles pour les codes d'erreur renvoyés par le bridge.
const BRIDGE_ERRORS = {
  missing_token: 'Connectez-vous avec votre compte école pour accéder aux paiements.',
  invalid_token: 'Session expirée : reconnectez-vous puis réessayez.',
  email_required: 'Votre compte ne porte pas d’adresse email vérifiable.',
  school_not_authorized: 'Votre compte n’est pas encore autorisé par EDUFREM pour cette école. Contactez EDUFREM (contact@edufrem.com).',
  not_yet_validated_by_edufrem: 'Ce paiement n’a pas encore été validé par EDUFREM.',
  already_confirmed: 'Ce paiement est déjà confirmé.',
  pdf_only: 'Le certificat doit être un fichier PDF.',
  file_too_large: 'Fichier trop volumineux (8 Mo maximum).',
  service_account_unavailable: 'Service momentanément indisponible côté MOBI. Réessayez plus tard.',
}
function frError(code, fallback) {
  return BRIDGE_ERRORS[code] || fallback || 'Une erreur est survenue. Réessayez.'
}

// Timestamp RFC3339 du bridge → 'YYYY-MM-DD' (format attendu par fmtDate des vues)
function jour(ts) {
  if (!ts || typeof ts !== 'string') return null
  return ts.slice(0, 10)
}
function normalize(p) {
  return {
    ...p,
    declareAt: jour(p.declareAt),
    recuEdufremAt: jour(p.recuEdufremAt),
    transfertEnvoyeAt: jour(p.transfertEnvoyeAt),
    recuEcoleAt: jour(p.recuEcoleAt),
    certificatAt: jour(p.certificatAt),
  }
}

export const usePaiementsScolariteStore = defineStore('paiementsScolarite', () => {
  const paiements = ref([])
  const loading = ref(false)
  const error = ref('')
  const schoolId = ref('')
  let pollTimer = null

  // ── Appel du bridge ───────────────────────────────────────────────
  async function bridgeCall(action, payload = {}) {
    const user = auth.currentUser
    if (!user) {
      throw new Error(frError('missing_token'))
    }
    const token = await user.getIdToken()
    const res = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ action, schoolId: schoolId.value, ...payload }),
    })
    let json = null
    try { json = await res.json() } catch (e) { /* silent */ }
    if (!res.ok || !json || json.error) {
      throw new Error(frError(json && json.error, 'Erreur ' + res.status))
    }
    return json
  }

  // ── Sélecteurs ────────────────────────────────────────────────────
  const paiementsTries = computed(() =>
    [...paiements.value].sort((a, b) => {
      const oa = PAIEMENT_STATUTS[a.status]?.order || 99
      const ob = PAIEMENT_STATUTS[b.status]?.order || 99
      if (oa !== ob) return oa - ob
      return (b.declareAt || '').localeCompare(a.declareAt || '')
    })
  )
  function getByStatut(statut) {
    return paiements.value.filter((p) => p.status === statut)
  }
  function getByStudent(studentUid) {
    return paiements.value.filter((p) => p.studentUid === studentUid)
  }
  function getBySchool(sid) {
    return paiements.value.filter((p) => p.schoolId === sid)
  }

  // ── Chargement (école) ────────────────────────────────────────────
  async function refresh() {
    if (!schoolId.value) return
    loading.value = true
    try {
      const json = await bridgeCall('list')
      paiements.value = (json.paiements || []).map(normalize)
      error.value = ''
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Mode école : charge les paiements de l'école et ré-actualise
   * toutes les 2 minutes (le bridge n'est pas temps réel).
   */
  function subscribeBySchool(sid) {
    unsubscribeAll()
    if (!sid) return
    schoolId.value = String(sid).toLowerCase()
    refresh()
    pollTimer = setInterval(refresh, 120000)
  }

  function unsubscribeAll() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  }

  // ── Actions école ─────────────────────────────────────────────────
  /** L'école confirme la réception du virement (→ recu_ecole, étudiant notifié). */
  async function confirmerReceptionEcole(paymentId) {
    try {
      await bridgeCall('confirm', { paiementId: paymentId })
      await refresh()
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  /**
   * L'école envoie le certificat de scolarité (PDF). L'étudiant le reçoit
   * dans MOBI (notification in-app + push) et peut le télécharger.
   */
  async function envoyerCertificat(paymentId, file) {
    if (!file) return { success: false, error: 'Aucun fichier sélectionné.' }
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name || '')) {
      return { success: false, error: frError('pdf_only') }
    }
    if (file.size > 8 * 1024 * 1024) {
      return { success: false, error: frError('file_too_large') }
    }
    try {
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let bin = ''
      const CHUNK = 0x8000
      for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
      }
      const b64 = btoa(bin)
      await bridgeCall('certificat', {
        paiementId: paymentId,
        filename: file.name || 'certificat.pdf',
        contentBase64: b64,
      })
      await refresh()
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  /** Re-télécharge un certificat déjà envoyé (vérification côté serveur). */
  async function telechargerCertificat(p) {
    try {
      const user = auth.currentUser
      if (!user) throw new Error(frError('missing_token'))
      const token = await user.getIdToken()
      const res = await fetch(CERTIFICAT_URL + '?id=' + encodeURIComponent(p.id), {
        headers: { 'Authorization': 'Bearer ' + token },
      })
      if (!res.ok) throw new Error('Téléchargement impossible (erreur ' + res.status + ').')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = p.certificatNom || 'certificat.pdf'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 4000)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  // ── Compatibilité (anciennes vues) ────────────────────────────────
  // La déclaration étudiant et les validations EDUFREM vivent dans MOBI
  // (app étudiante + admin MOBI). Ces fonctions restent pour ne pas casser
  // les vues existantes mais renvoient vers MOBI.
  const MSG_MOBI = 'Cette action se fait dans MOBI (admin EDUFREM ou app étudiante), pas dans MAPO.'
  function subscribeAll() {
    unsubscribeAll()
    paiements.value = []
    error.value = 'La validation des paiements EDUFREM se fait dans l’admin MOBI (mobi.app-edufrem.com, mode admin, onglet Scolarité).'
  }
  function subscribeByStudent() { /* géré côté MOBI */ }
  async function fetchByStudent() { return [] }
  async function declarerParEtudiant() { return { success: false, error: MSG_MOBI } }
  async function confirmerReceptionEdufrem() { return { success: false, error: MSG_MOBI } }
  async function marquerTransfertEnvoye() { return { success: false, error: MSG_MOBI } }

  return {
    paiements,
    paiementsTries,
    loading,
    error,
    schoolId,
    // sélecteurs
    getByStatut,
    getByStudent,
    getBySchool,
    // chargement
    subscribeAll,
    subscribeBySchool,
    subscribeByStudent,
    unsubscribeAll,
    refresh,
    // actions école
    confirmerReceptionEcole,
    envoyerCertificat,
    telechargerCertificat,
    // compatibilité (renvoient vers MOBI)
    declarerParEtudiant,
    confirmerReceptionEdufrem,
    marquerTransfertEnvoye,
    fetchByStudent,
  }
})
