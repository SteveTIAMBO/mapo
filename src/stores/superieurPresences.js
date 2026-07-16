import { reactive } from 'vue'
import { defineStore } from 'pinia'
import { useSuperieurStore } from './superieur'

/**
 * Assiduité (présences) du Supérieur — agrégée par étudiant.
 *
 * Le modèle Supérieur ne suit pas l'appel séance par séance ; on modélise
 * ici, par étudiant, un compteur { present, retard, absent } sur le semestre.
 * Les données de démo sont SEEDÉES de façon déterministe (hash de l'id) pour
 * rester stables entre les rechargements, avec une légère corrélation aux
 * résultats (les étudiants les plus faibles s'absentent un peu plus) tout en
 * gardant l'assiduité comme un signal SEMI-INDÉPENDANT (utile au décrochage).
 */

const LS_KEY = 'sup_presences'

// RNG déterministe à partir de l'id (mulberry32 sur un hash simple).
function seededRng(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFor(etu) {
  const rng = seededRng(etu.id || 'x')
  const total = 40 + Math.floor(rng() * 21) // 40 à 60 séances
  // Taux d'absence de base 0–18 %, + petit bonus si résultats faibles (moyenne < 11).
  const faible = typeof etu.moyenne === 'number' && etu.moyenne < 11
  let tauxAbs = rng() * 0.18 + (faible ? rng() * 0.14 : 0)
  tauxAbs = Math.min(tauxAbs, 0.55)
  const absent = Math.round(total * tauxAbs)
  const retard = Math.round(total * (rng() * 0.08))
  return { total, absent, retard }
}

export const useSuperieurPresencesStore = defineStore('superieurPresences', () => {
  const map = reactive({}) // { [etudiantId]: { total, absent, retard } }
  let loaded = false

  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(map)) } catch (e) { /* silent */ }
  }

  function loadPresences() {
    if (loaded) return
    let saved = null
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch (e) { saved = null }
    const sup = useSuperieurStore()
    for (const etu of sup.etudiants) {
      if (saved && saved[etu.id]) map[etu.id] = saved[etu.id]
      else map[etu.id] = seedFor(etu)
    }
    loaded = true
    if (!saved) persist()
  }

  function statsFor(id) {
    const r = map[id] || { total: 0, absent: 0, retard: 0 }
    const total = r.total || 0
    const present = Math.max(0, total - (r.absent || 0) - (r.retard || 0))
    const tauxAbs = total > 0 ? (r.absent || 0) / total : 0
    const tauxPresence = total > 0 ? present / total : 1
    return { total, absent: r.absent || 0, retard: r.retard || 0, present, tauxAbs, tauxPresence }
  }

  // Enregistre une séance pour un étudiant : 'present' | 'absent' | 'retard'.
  function enregistrer(id, statut) {
    if (!map[id]) map[id] = { total: 0, absent: 0, retard: 0 }
    map[id].total = (map[id].total || 0) + 1
    if (statut === 'absent') map[id].absent = (map[id].absent || 0) + 1
    else if (statut === 'retard') map[id].retard = (map[id].retard || 0) + 1
    persist()
  }

  return { map, loadPresences, statsFor, enregistrer }
})
