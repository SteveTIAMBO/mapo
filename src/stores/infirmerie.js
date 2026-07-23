import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ── Module Infirmerie & santé (édition primaire/secondaire) ────────────
// Additif : registre des passages à l'infirmerie + fiches santé (allergies,
// traitements). Persistance locale (démo). Données sensibles : la synchro
// Firestore devra restreindre l'accès (infirmier + direction).
const K_PASSAGES = 'mapo_infirmerie_passages'
const K_FICHES = 'mapo_infirmerie_fiches'
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
const load = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb } catch { return fb } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota */ } }

const SEED_PASSAGES = [
  { id: 'pas-1', date: '2026-07-21', eleve: 'Kevin Simo', classe: '4ème C', motif: 'Maux de tête', soin: 'Repos + paracétamol', sortie: 'Retour en classe' },
  { id: 'pas-2', date: '2026-07-20', eleve: 'Awa Ngo', classe: '3ème C', motif: 'Chute cour de récré', soin: 'Désinfection éraflure', sortie: 'Retour en classe' },
  { id: 'pas-3', date: '2026-07-18', eleve: 'Boris Talla', classe: '5ème B', motif: 'Fièvre', soin: 'Prise de température (38.5°)', sortie: 'Parent appelé' },
]
const SEED_FICHES = [
  { id: 'fic-1', eleve: 'Christelle Fotso', classe: '3ème A', groupeSanguin: 'O+', allergies: 'Arachides', traitement: 'Aucun', contact: '+237 699 00 11 22' },
  { id: 'fic-2', eleve: 'Boris Talla', classe: '5ème B', groupeSanguin: 'A-', allergies: 'Aucune connue', traitement: 'Ventoline (asthme)', contact: '+237 677 33 44 55' },
]

export const useInfirmerieStore = defineStore('infirmerie', () => {
  const passages = ref(load(K_PASSAGES, SEED_PASSAGES))
  const fiches = ref(load(K_FICHES, SEED_FICHES))
  const persist = () => { save(K_PASSAGES, passages.value); save(K_FICHES, fiches.value) }

  const today = new Date().toISOString().slice(0, 10)
  const passagesOrdonnes = computed(() => [...passages.value].sort((a, b) => (b.date || '').localeCompare(a.date || '')))
  const totalPassages = computed(() => passages.value.length)
  const passagesDuJour = computed(() => passages.value.filter((p) => p.date === today).length)
  const totalFiches = computed(() => fiches.value.length)
  const totalAllergies = computed(() =>
    fiches.value.filter((f) => (f.allergies || '').trim() && !/aucune/i.test(f.allergies)).length)

  function addPassage({ eleve, classe, motif, soin, sortie }) {
    if (!(eleve || '').trim()) return false
    passages.value.unshift({
      id: uid('pas-'), date: new Date().toISOString().slice(0, 10),
      eleve: eleve.trim(), classe: (classe || '').trim(), motif: (motif || '').trim(),
      soin: (soin || '').trim(), sortie: sortie || 'Retour en classe',
    })
    persist()
    return true
  }
  function removePassage(id) { passages.value = passages.value.filter((p) => p.id !== id); persist() }
  function addFiche({ eleve, classe, groupeSanguin, allergies, traitement, contact }) {
    if (!(eleve || '').trim()) return false
    fiches.value.unshift({
      id: uid('fic-'), eleve: eleve.trim(), classe: (classe || '').trim(),
      groupeSanguin: (groupeSanguin || '').trim(), allergies: (allergies || '').trim(),
      traitement: (traitement || '').trim(), contact: (contact || '').trim(),
    })
    persist()
    return true
  }
  function removeFiche(id) { fiches.value = fiches.value.filter((f) => f.id !== id); persist() }

  return {
    passages, fiches, passagesOrdonnes, totalPassages, passagesDuJour, totalFiches, totalAllergies,
    addPassage, removePassage, addFiche, removeFiche,
  }
})
