import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ── Module Cantine / restauration (édition primaire/secondaire) ────────
// Additif : menu de la semaine + élèves inscrits (demi-pension) avec
// suivi des paiements. Persistance locale (démo).
const K_MENUS = 'mapo_cantine_menus'
const K_INSCRITS = 'mapo_cantine_inscrits'
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
const load = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb } catch { return fb } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota */ } }

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const SEED_MENUS = [
  { id: 'men-1', jour: 'Lundi', plat: 'Riz sauté au poulet', accompagnement: 'Salade + fruit' },
  { id: 'men-2', jour: 'Mardi', plat: 'Ndolè et plantains', accompagnement: 'Yaourt' },
  { id: 'men-3', jour: 'Mercredi', plat: 'Spaghetti bolognaise', accompagnement: 'Banane' },
  { id: 'men-4', jour: 'Jeudi', plat: 'Haricots et makala', accompagnement: 'Jus local' },
  { id: 'men-5', jour: 'Vendredi', plat: 'Poisson braisé + bâton', accompagnement: 'Ananas' },
]
const SEED_INSCRITS = [
  { id: 'ins-1', eleve: 'Awa Ngo', classe: '3ème C', formule: 'Mensuel', statut: 'a_jour' },
  { id: 'ins-2', eleve: 'Kevin Simo', classe: '4ème C', formule: 'Trimestriel', statut: 'impaye' },
  { id: 'ins-3', eleve: 'Christelle Fotso', classe: '3ème A', formule: 'Mensuel', statut: 'a_jour' },
  { id: 'ins-4', eleve: 'Boris Talla', classe: '5ème B', formule: 'Ticket', statut: 'a_jour' },
]

export const useCantineStore = defineStore('cantine', () => {
  const menus = ref(load(K_MENUS, SEED_MENUS))
  const inscrits = ref(load(K_INSCRITS, SEED_INSCRITS))
  const persist = () => { save(K_MENUS, menus.value); save(K_INSCRITS, inscrits.value) }

  const totalInscrits = computed(() => inscrits.value.length)
  const totalImpayes = computed(() => inscrits.value.filter((i) => i.statut === 'impaye').length)
  const totalAJour = computed(() => inscrits.value.filter((i) => i.statut === 'a_jour').length)
  const menuOrdonne = computed(() =>
    [...menus.value].sort((a, b) => JOURS.indexOf(a.jour) - JOURS.indexOf(b.jour)))

  function setMenu({ jour, plat, accompagnement }) {
    if (!jour) return
    const existing = menus.value.find((m) => m.jour === jour)
    if (existing) { existing.plat = (plat || '').trim(); existing.accompagnement = (accompagnement || '').trim() }
    else menus.value.push({ id: uid('men-'), jour, plat: (plat || '').trim(), accompagnement: (accompagnement || '').trim() })
    persist()
  }
  function addInscrit({ eleve, classe, formule }) {
    if (!(eleve || '').trim()) return false
    inscrits.value.unshift({ id: uid('ins-'), eleve: eleve.trim(), classe: (classe || '').trim(), formule: formule || 'Mensuel', statut: 'a_jour' })
    persist()
    return true
  }
  function removeInscrit(id) { inscrits.value = inscrits.value.filter((i) => i.id !== id); persist() }
  function toggleStatut(id) {
    const i = inscrits.value.find((x) => x.id === id)
    if (i) { i.statut = i.statut === 'a_jour' ? 'impaye' : 'a_jour'; persist() }
  }

  return {
    menus, inscrits, JOURS, menuOrdonne, totalInscrits, totalImpayes, totalAJour,
    setMenu, addInscrit, removeInscrit, toggleStatut,
  }
})
