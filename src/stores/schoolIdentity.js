import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { getTenant, tenantSchoolId } from '../utils/tenantContext'
import { SOCLE_MODULES } from './permissions'

/**
 * Store "schoolIdentity" — identité légère de l'école courante.
 *
 * À ne pas confondre avec `school.js` (settings secondaire). Ce store
 * sert UNIQUEMENT à exposer le branding et la config tenant : nom, sigle,
 * edition, logoUrl, modulesActifs, anneeAcademique, etc. Il est lu par
 * les vues partagées (WelcomeView, SuperieurView, SuperieurLogin) pour
 * adapter l'UI au tenant courant (preview vs school).
 *
 * - En mode preview (mapo.app-edufrem.com) : expose une fiche démo EBS.
 * - En mode school (entpe.app-edufrem.com) : abonnement temps réel sur
 *   `schools/{schoolId}` Firestore.
 */

// Fiche école démo utilisée en preview (et fallback).
export const DEMO_SCHOOL_IDENTITY = {
  id: 'demo-sup',
  nom: 'Institut Supérieur EDUFREM',
  sigle: 'UEDF',
  edition: 'superieur',
  type: 'Université — système LMD',
  anneeAcademique: '2025 — 2026',
  modulesActifs: null,
  logoUrl: null,
  configSup: { devise: 'XAF' },
}

export const useSchoolIdentityStore = defineStore('schoolIdentity', () => {
  const school = ref(null)
  const isLoading = ref(false)
  const loadError = ref(null)
  let unsubscribe = null

  const tenant = getTenant()
  const isSchoolTenant = tenant.mode === 'school' && !!tenantSchoolId()

  // En preview, on a déjà la fiche démo
  if (!isSchoolTenant) school.value = DEMO_SCHOOL_IDENTITY

  function init() {
    if (!isSchoolTenant) return
    if (unsubscribe) return
    const schoolId = tenantSchoolId()
    isLoading.value = true
    loadError.value = null
    try {
      const ref_ = doc(db, 'schools', schoolId)
      unsubscribe = onSnapshot(
        ref_,
        (snap) => {
          if (snap.exists()) {
            school.value = { id: snap.id, ...snap.data() }
          } else {
            school.value = null
            loadError.value = `École "${schoolId}" introuvable.`
          }
          isLoading.value = false
        },
        (err) => {
          loadError.value = err?.message || String(err)
          isLoading.value = false
          console.error('[schoolIdentity] onSnapshot failed', err)
        }
      )
    } catch (e) {
      loadError.value = e?.message || String(e)
      isLoading.value = false
    }
  }

  function destroy() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
  }

  const nom = computed(() => school.value?.nom || '')
  const sigle = computed(() => school.value?.sigle || '')
  const edition = computed(() => school.value?.edition || null)
  const logoUrl = computed(() => school.value?.logoUrl || null)
  const anneeAcademique = computed(() => school.value?.anneeAcademique || '')
  const modulesActifs = computed(() => school.value?.modulesActifs || null)
  // Modèle de modules porté par le document école. Absent = ancien modèle, où le
  // socle était implicite. Voir `isModuleActif`.
  const modulesVersion = computed(() => Number(school.value?.modulesVersion) || 1)
  const pack = computed(() => school.value?.pack || null)
  const trialUntil = computed(() => school.value?.trialUntil || null)
  // Essai version complète en cours : tous les modules sont accessibles.
  const isTrialActive = computed(() => {
    const t = trialUntil.value
    if (!t) return false
    try { return new Date(t).getTime() > Date.now() } catch { return false }
  })
  const isReady = computed(() => !!school.value)
  const isTenantSchool = computed(() => isSchoolTenant)
  const isDemoTenant = computed(() => !isSchoolTenant)

  /**
   * Un module est-il actif pour cette école ?
   *
   * Depuis le 19/08/2026 il n'y a PLUS DE SOCLE : chaque module se coche
   * individuellement dans l'espace méga admin, structure comprise.
   *
   * ⚠️ Compatibilité, et c'est le point délicat. Les écoles créées AVANT ce
   * changement ont un `modulesActifs` qui ne liste que les modules optionnels,
   * le socle étant implicite à l'époque. Filtrer toutes les clés sur cette liste
   * leur ferait perdre d'un coup Élèves, Classes, Paramètres et Accès, sans le
   * moindre message. On lit donc `modulesVersion` : à partir de 2 la liste fait
   * foi pour tout ; en dessous, l'ancien socle reste implicitement actif.
   */
  function isModuleActif(key) {
    // Essai version complète : tout est ouvert jusqu'à trialUntil
    if (isTrialActive.value) return true
    const m = modulesActifs.value
    // Aucune liste : école non configurée, on n'enferme personne.
    if (!m) return true
    if (modulesVersion.value < 2 && SOCLE_MODULES.includes(key)) return true
    return m.includes(key)
  }

  /**
   * Y a-t-il au moins un module actif ?
   * Si la réponse est non, l'application n'a aucun écran à afficher. Il faut le
   * DIRE : rediriger vers un tableau de bord lui-même désactivé produirait une
   * boucle silencieuse, où l'écran précédent reste affiché sans une erreur.
   */
  const aucunModuleActif = computed(() => {
    if (isTrialActive.value) return false
    const m = modulesActifs.value
    if (!m) return false
    return m.length === 0
  })

  return {
    school, isLoading, loadError, isReady,
    nom, sigle, edition, logoUrl, anneeAcademique, modulesActifs, modulesVersion,
    aucunModuleActif,
    pack, trialUntil, isTrialActive,
    isTenantSchool, isDemoTenant,
    init, destroy, isModuleActif,
  }
})
