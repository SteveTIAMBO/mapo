import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { useSchoolIdentityStore } from './schoolIdentity'

// ──────────────────────────────────────────────────────────────────────────
// Personnalisation de MIAPO par école : exemples de sujets (devoirs / examens
// des années précédentes) collés par matière. Injectés comme MODÈLES dans la
// génération (via `theme`, lu tel quel par le serveur → aucun redéploiement PHP)
// pour que MIAPO s'aligne sur le style, le niveau et le format de l'établissement.
//
// Persistance : école réelle → schools/{sid}/config/miapoRef (réutilise les
// règles du sous-espace config, comme le store `cours`) ; démo / hors-ligne →
// localStorage. La lecture Firestore alimente aussi le cache local → l'ÉLÈVE
// (autre appareil) reçoit les exemples posés par le directeur.
// ──────────────────────────────────────────────────────────────────────────

const keyFor = (school) => `mapo_miapo_ref_${school || 'demo'}`

export const useMiapoRefStore = defineStore('miapoRef', () => {
  const data = ref({}) // { [matiere]: texte }

  function _localKey() {
    try { return keyFor(useSchoolIdentityStore().school?.id || 'demo') } catch { return keyFor('demo') }
  }
  function _fsRef(sid) { return doc(db, 'schools', sid, 'config', 'miapoRef') }

  function _loadLocal() {
    try { data.value = JSON.parse(localStorage.getItem(_localKey()) || '{}') || {} }
    catch { data.value = {} }
  }

  // Charge le cache local immédiatement (sync), puis rafraîchit depuis Firestore
  // pour les écoles réelles (best-effort ; on garde le local si hors-ligne).
  async function load() {
    _loadLocal()
    try {
      const auth = useAuthStore()
      if (auth.isDemo) return
      const sid = auth.schoolId
      if (!sid) return
      const snap = await getDoc(_fsRef(sid))
      if (snap.exists()) {
        const ex = snap.data().examples || {}
        data.value = ex
        try { localStorage.setItem(_localKey(), JSON.stringify(ex)) } catch { /* quota */ }
      }
    } catch { /* hors-ligne / perms : on garde le cache local */ }
  }

  function getExemples(matiere) {
    if (!matiere) return ''
    return String(data.value[matiere] || '').trim()
  }

  function setExemples(matiere, texte) {
    if (!matiere) return
    const next = { ...data.value }
    const t = String(texte || '').trim()
    if (t) next[matiere] = t
    else delete next[matiere]
    data.value = next
    try { localStorage.setItem(_localKey(), JSON.stringify(next)) } catch { /* quota */ }
    // École réelle → mirroir Firestore (best-effort, non bloquant).
    try {
      const auth = useAuthStore()
      if (!auth.isDemo && auth.schoolId) {
        setDoc(_fsRef(auth.schoolId), { examples: next, updatedAt: new Date().toISOString() }).catch(() => {})
      }
    } catch { /* silencieux */ }
  }

  function hasAny() {
    return Object.values(data.value).some((v) => String(v || '').trim())
  }

  _loadLocal()

  return { data, load, getExemples, setExemples, hasAny }
})
