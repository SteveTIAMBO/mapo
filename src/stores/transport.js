import { defineStore } from 'pinia'
import { demoKey } from '../utils/demoScope'
import { ref, computed } from 'vue'

// ── Module Transport scolaire (édition primaire/secondaire) ────────────
// Additif : lignes/circuits de ramassage + élèves abonnés. Persistance
// locale (démo) ; la synchro Firestore par école pourra être ajoutée
// comme les autres modules.
const K_LIGNES = 'mapo_transport_lignes'
const K_ABOS = 'mapo_transport_abonnes'
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
const load = (k, fb) => { try { const r = localStorage.getItem(demoKey(k)); return r ? JSON.parse(r) : fb } catch { return fb } }
// Clé suffixée par ÉDITION : le primaire et le secondaire sont deux produits
// distincts, leurs données de démonstration ne doivent pas se mélanger.
const save = (k, v) => { try { localStorage.setItem(demoKey(k), JSON.stringify(v)) } catch { /* quota */ } }

const SEED_LIGNES = [
  { id: 'lig-1', nom: 'Ligne A — Centre-ville', chauffeur: 'Emmanuel Ndjock', immat: 'CE 4521 A', capacite: 30, depart: '06:30', tarif: 25000 },
  { id: 'lig-2', nom: 'Ligne B — Nkolbisson', chauffeur: 'Alphonse Kana', immat: 'LT 8890 B', capacite: 25, depart: '06:15', tarif: 30000 },
  { id: 'lig-3', nom: 'Ligne C — Mvog-Ada', chauffeur: 'Pauline Eyenga', immat: 'CE 1245 C', capacite: 22, depart: '06:45', tarif: 22000 },
]
const SEED_ABOS = [
  { id: 'abo-1', ligneId: 'lig-1', eleve: 'Awa Ngo', classe: '3ème C', arret: 'Carrefour Warda', statut: 'a_jour' },
  { id: 'abo-2', ligneId: 'lig-1', eleve: 'Kevin Simo', classe: '4ème C', arret: 'Poste centrale', statut: 'impaye' },
  { id: 'abo-3', ligneId: 'lig-2', eleve: 'Christelle Fotso', classe: '3ème A', arret: 'Marché Nkolbisson', statut: 'a_jour' },
]

export const useTransportStore = defineStore('transport', () => {
  const lignes = ref(load(K_LIGNES, SEED_LIGNES))
  const abonnes = ref(load(K_ABOS, SEED_ABOS))
  const persist = () => { save(K_LIGNES, lignes.value); save(K_ABOS, abonnes.value) }

  const totalLignes = computed(() => lignes.value.length)
  const totalAbonnes = computed(() => abonnes.value.length)
  const totalImpayes = computed(() => abonnes.value.filter((a) => a.statut === 'impaye').length)
  const placesRestantes = computed(() =>
    lignes.value.reduce((a, l) => a + Math.max(0, (Number(l.capacite) || 0) - abonnes.value.filter((x) => x.ligneId === l.id).length), 0))

  const abonnesDe = (ligneId) => abonnes.value.filter((a) => a.ligneId === ligneId)
  const nomLigne = (id) => lignes.value.find((l) => l.id === id)?.nom || '—'

  function addLigne(l) {
    lignes.value.unshift({
      id: uid('lig-'), nom: (l.nom || '').trim(), chauffeur: (l.chauffeur || '').trim(),
      immat: (l.immat || '').trim(), capacite: Math.max(1, Number(l.capacite) || 1),
      depart: l.depart || '', tarif: Math.max(0, Number(l.tarif) || 0),
    })
    persist()
  }
  function removeLigne(id) {
    lignes.value = lignes.value.filter((l) => l.id !== id)
    abonnes.value = abonnes.value.filter((a) => a.ligneId !== id)
    persist()
  }
  function addAbonne({ ligneId, eleve, classe, arret }) {
    if (!ligneId || !(eleve || '').trim()) return false
    abonnes.value.unshift({ id: uid('abo-'), ligneId, eleve: eleve.trim(), classe: (classe || '').trim(), arret: (arret || '').trim(), statut: 'a_jour' })
    persist()
    return true
  }
  function removeAbonne(id) { abonnes.value = abonnes.value.filter((a) => a.id !== id); persist() }
  function toggleStatut(id) {
    const a = abonnes.value.find((x) => x.id === id)
    if (a) { a.statut = a.statut === 'a_jour' ? 'impaye' : 'a_jour'; persist() }
  }

  return {
    lignes, abonnes, totalLignes, totalAbonnes, totalImpayes, placesRestantes,
    abonnesDe, nomLigne, addLigne, removeLigne, addAbonne, removeAbonne, toggleStatut,
  }
})
