import { defineStore } from 'pinia'
import { demoKey } from '../utils/demoScope'
import { ref, computed } from 'vue'

// ── Module Bibliothèque (édition primaire/secondaire) ──────────────────
// Additif : fonds d'ouvrages + emprunts/retours. Persistance locale (démo) ;
// la synchro Firestore par école pourra être ajoutée comme les autres modules.
const K_BOOKS = 'mapo_biblio_ouvrages'
const K_LOANS = 'mapo_biblio_emprunts'
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
const load = (k, fb) => { try { const r = localStorage.getItem(demoKey(k)); return r ? JSON.parse(r) : fb } catch { return fb } }
// Clé suffixée par ÉDITION : le primaire et le secondaire sont deux produits
// distincts, leurs données de démonstration ne doivent pas se mélanger.
const save = (k, v) => { try { localStorage.setItem(demoKey(k), JSON.stringify(v)) } catch { /* quota */ } }

const SEED_BOOKS = [
  { id: 'liv-1', titre: 'Une si longue lettre', auteur: 'Mariama Bâ', isbn: '978-2-7236-0430-1', categorie: 'Roman', total: 8, dispo: 5 },
  { id: 'liv-2', titre: "L'Aventure ambiguë", auteur: 'Cheikh Hamidou Kane', isbn: '978-2-264-03651-8', categorie: 'Roman', total: 6, dispo: 6 },
  { id: 'liv-3', titre: 'Mathématiques 3e (CIAM)', auteur: 'Collectif', isbn: '978-2-84129-506-2', categorie: 'Manuel', total: 20, dispo: 12 },
  { id: 'liv-4', titre: 'Le Vieux Nègre et la médaille', auteur: 'Ferdinand Oyono', isbn: '978-2-266-13480-9', categorie: 'Roman', total: 5, dispo: 3 },
  { id: 'liv-5', titre: 'Physique-Chimie 2nde', auteur: 'Collectif', isbn: '978-2-091-72410-5', categorie: 'Manuel', total: 15, dispo: 15 },
]
const SEED_LOANS = [
  { id: 'emp-1', livreId: 'liv-1', livreTitre: 'Une si longue lettre', eleve: 'Awa Ngo', classe: '3ème C', empruntLe: '2026-07-15', rendreAvant: '2026-07-29', renduLe: '' },
  { id: 'emp-2', livreId: 'liv-4', livreTitre: 'Le Vieux Nègre et la médaille', eleve: 'Kevin Simo', classe: '4ème C', empruntLe: '2026-07-10', rendreAvant: '2026-07-24', renduLe: '' },
  { id: 'emp-3', livreId: 'liv-3', livreTitre: 'Mathématiques 3e (CIAM)', eleve: 'Christelle Fotso', classe: '3ème A', empruntLe: '2026-07-18', rendreAvant: '2026-08-01', renduLe: '' },
]

export const useBibliothequeStore = defineStore('bibliotheque', () => {
  const ouvrages = ref(load(K_BOOKS, SEED_BOOKS))
  const emprunts = ref(load(K_LOANS, SEED_LOANS))
  const persist = () => { save(K_BOOKS, ouvrages.value); save(K_LOANS, emprunts.value) }

  const empruntsEnCours = computed(() => emprunts.value.filter((e) => !e.renduLe))
  const enRetard = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return empruntsEnCours.value.filter((e) => e.rendreAvant && e.rendreAvant < today)
  })
  const totalOuvrages = computed(() => ouvrages.value.reduce((a, o) => a + (Number(o.total) || 0), 0))
  const totalDisponibles = computed(() => ouvrages.value.reduce((a, o) => a + (Number(o.dispo) || 0), 0))

  function addOuvrage(o) {
    const total = Math.max(1, Number(o.total) || 1)
    ouvrages.value.unshift({ id: uid('liv-'), titre: (o.titre || '').trim(), auteur: (o.auteur || '').trim(), isbn: (o.isbn || '').trim(), categorie: o.categorie || 'Manuel', total, dispo: total })
    persist()
  }
  function removeOuvrage(id) { ouvrages.value = ouvrages.value.filter((o) => o.id !== id); persist() }

  function emprunter({ livreId, eleve, classe, rendreAvant }) {
    const livre = ouvrages.value.find((o) => o.id === livreId)
    if (!livre || livre.dispo <= 0) return false
    livre.dispo -= 1
    emprunts.value.unshift({ id: uid('emp-'), livreId, livreTitre: livre.titre, eleve: (eleve || '').trim(), classe: (classe || '').trim(), empruntLe: new Date().toISOString().slice(0, 10), rendreAvant: rendreAvant || '', renduLe: '' })
    persist()
    return true
  }
  function rendre(empruntId) {
    const e = emprunts.value.find((x) => x.id === empruntId)
    if (!e || e.renduLe) return
    e.renduLe = new Date().toISOString().slice(0, 10)
    const livre = ouvrages.value.find((o) => o.id === e.livreId)
    if (livre) livre.dispo = Math.min(livre.total, (Number(livre.dispo) || 0) + 1)
    persist()
  }

  return {
    ouvrages, emprunts, empruntsEnCours, enRetard, totalOuvrages, totalDisponibles,
    addOuvrage, removeOuvrage, emprunter, rendre,
  }
})
