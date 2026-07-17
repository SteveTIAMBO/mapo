import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSchoolIdentityStore } from './schoolIdentity'

// ──────────────────────────────────────────────────────────────────────────
// Personnalisation de MIAPO par école : exemples de sujets (devoirs / examens
// des années précédentes) que l'enseignant colle par matière. Ces exemples
// sont injectés comme MODÈLES dans la génération (via le champ `theme`, lu
// tel quel par le serveur → aucun redéploiement PHP). But : que MIAPO s'aligne
// sur le style, le niveau et le format attendus par l'établissement.
// Stockage local, scopé à l'école (démo = clé unique).
// ──────────────────────────────────────────────────────────────────────────

const keyFor = (school) => `mapo_miapo_ref_${school || 'demo'}`

export const useMiapoRefStore = defineStore('miapoRef', () => {
  const schoolIdentity = useSchoolIdentityStore()
  const data = ref({}) // { [matiere]: texte }

  function _key() {
    return keyFor(schoolIdentity.school?.id || schoolIdentity.slug || 'demo')
  }

  function load() {
    try { data.value = JSON.parse(localStorage.getItem(_key()) || '{}') || {} }
    catch { data.value = {} }
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
    try { localStorage.setItem(_key(), JSON.stringify(next)) } catch { /* quota */ }
  }

  function hasAny() {
    return Object.values(data.value).some((v) => String(v || '').trim())
  }

  load()

  return { data, load, getExemples, setExemples, hasAny }
})
