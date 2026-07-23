import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ── Services additionnels de l'enseignement supérieur ──────────────────
// Regroupe 4 modules additifs (mémoires & soutenances, attestations &
// relevés, congés du personnel, bibliothèque universitaire) dans un seul
// store léger à persistance locale (démo). La synchro Firestore par
// établissement pourra être ajoutée comme pour les autres modules.
const K = {
  memoires: 'mapo_sup_memoires',
  attestations: 'mapo_sup_attestations',
  conges: 'mapo_sup_conges',
  biblio: 'mapo_sup_biblio_uni',
}
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
const load = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb } catch { return fb } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota */ } }

const SEED_MEMOIRES = [
  { id: 'mem-1', titre: "Optimisation énergétique des bâtiments tropicaux", etudiant: 'Nadège Abena', formation: 'Master 2 Génie civil', directeur: 'Pr. Stephan Galy', date: '2026-09-15', statut: 'planifie', mention: '' },
  { id: 'mem-2', titre: "IA appliquée à la détection de fraude mobile", etudiant: 'Yannick Mballa', formation: 'Master 2 Informatique', directeur: 'Dr. Claire Ngo', date: '2026-07-02', statut: 'soutenu', mention: 'Très bien' },
  { id: 'mem-3', titre: "Microfinance et inclusion en zone rurale", etudiant: 'Sandra Kouam', formation: 'Master 2 Économie', directeur: 'Pr. Alain Fotso', date: '', statut: 'en_cours', mention: '' },
]
const SEED_ATTEST = [
  { id: 'att-1', type: 'Attestation de scolarité', etudiant: 'Nadège Abena', formation: 'Master 2 Génie civil', date: '2026-07-18', ref: 'ATT-2026-0142' },
  { id: 'att-2', type: 'Relevé de notes (S3)', etudiant: 'Yannick Mballa', formation: 'Master 2 Informatique', date: '2026-07-10', ref: 'REL-2026-0088' },
  { id: 'att-3', type: 'Attestation de réussite', etudiant: 'Boris Etoa', formation: 'Licence 3 Gestion', date: '2026-07-05', ref: 'ATT-2026-0131' },
]
const SEED_CONGES = [
  { id: 'cng-1', agent: 'Dr. Claire Ngo', fonction: 'Enseignant-chercheur', type: 'Congé annuel', debut: '2026-08-01', fin: '2026-08-21', statut: 'approuve' },
  { id: 'cng-2', agent: 'M. Pierre Nkoulou', fonction: 'Comptable', type: 'Congé maladie', debut: '2026-07-24', fin: '2026-07-28', statut: 'en_attente' },
  { id: 'cng-3', agent: 'Mme Julienne Onana', fonction: 'Scolarité', type: 'Congé sans solde', debut: '2026-09-01', fin: '2026-09-10', statut: 'en_attente' },
]
const SEED_BIBLIO = [
  { id: 'bu-1', titre: 'Résistance des matériaux', auteur: 'J. Goodman', cote: 'TA405.G6', type: 'Ouvrage', total: 6, dispo: 4 },
  { id: 'bu-2', titre: 'Introduction to Algorithms', auteur: 'Cormen et al.', cote: 'QA76.6.C66', type: 'Ouvrage', total: 4, dispo: 1 },
  { id: 'bu-3', titre: 'Mémoire — Réseaux 5G en Afrique centrale', auteur: 'P. Essomba', cote: 'MEM-2025-017', type: 'Mémoire', total: 1, dispo: 1 },
  { id: 'bu-4', titre: "Revue africaine d'économie (2025)", auteur: 'Collectif', cote: 'PER-ECO-25', type: 'Périodique', total: 10, dispo: 8 },
]

export const useSuperieurServicesStore = defineStore('superieurServices', () => {
  const memoires = ref(load(K.memoires, SEED_MEMOIRES))
  const attestations = ref(load(K.attestations, SEED_ATTEST))
  const conges = ref(load(K.conges, SEED_CONGES))
  const biblio = ref(load(K.biblio, SEED_BIBLIO))

  const persist = () => {
    save(K.memoires, memoires.value); save(K.attestations, attestations.value)
    save(K.conges, conges.value); save(K.biblio, biblio.value)
  }

  // ── Mémoires & soutenances ──
  const memSoutenus = computed(() => memoires.value.filter((m) => m.statut === 'soutenu').length)
  const memPlanifies = computed(() => memoires.value.filter((m) => m.statut === 'planifie').length)
  const memEnCours = computed(() => memoires.value.filter((m) => m.statut === 'en_cours').length)
  function addMemoire(m) {
    memoires.value.unshift({ id: uid('mem-'), titre: (m.titre || '').trim(), etudiant: (m.etudiant || '').trim(), formation: (m.formation || '').trim(), directeur: (m.directeur || '').trim(), date: m.date || '', statut: m.statut || 'en_cours', mention: (m.mention || '').trim() })
    persist()
  }
  function setMemoireStatut(id, statut, mention) {
    const m = memoires.value.find((x) => x.id === id)
    if (m) { m.statut = statut; if (mention !== undefined) m.mention = mention; persist() }
  }
  function removeMemoire(id) { memoires.value = memoires.value.filter((m) => m.id !== id); persist() }

  // ── Attestations & relevés ──
  const attMois = computed(() => {
    const ym = new Date().toISOString().slice(0, 7)
    return attestations.value.filter((a) => (a.date || '').startsWith(ym)).length
  })
  function addAttestation(a) {
    const n = attestations.value.length + 142
    attestations.value.unshift({ id: uid('att-'), type: a.type || 'Attestation de scolarité', etudiant: (a.etudiant || '').trim(), formation: (a.formation || '').trim(), date: new Date().toISOString().slice(0, 10), ref: a.ref || ('ATT-2026-' + String(n).padStart(4, '0')) })
    persist()
  }
  function removeAttestation(id) { attestations.value = attestations.value.filter((a) => a.id !== id); persist() }

  // ── Congés du personnel ──
  const congesEnAttente = computed(() => conges.value.filter((c) => c.statut === 'en_attente').length)
  const congesApprouves = computed(() => conges.value.filter((c) => c.statut === 'approuve').length)
  function addConge(c) {
    conges.value.unshift({ id: uid('cng-'), agent: (c.agent || '').trim(), fonction: (c.fonction || '').trim(), type: c.type || 'Congé annuel', debut: c.debut || '', fin: c.fin || '', statut: 'en_attente' })
    persist()
  }
  function setCongeStatut(id, statut) {
    const c = conges.value.find((x) => x.id === id)
    if (c) { c.statut = statut; persist() }
  }
  function removeConge(id) { conges.value = conges.value.filter((c) => c.id !== id); persist() }

  // ── Bibliothèque universitaire ──
  const biblioTotal = computed(() => biblio.value.reduce((a, o) => a + (Number(o.total) || 0), 0))
  const biblioDispo = computed(() => biblio.value.reduce((a, o) => a + (Number(o.dispo) || 0), 0))
  const biblioMemoires = computed(() => biblio.value.filter((o) => o.type === 'Mémoire').length)
  function addBiblio(o) {
    const total = Math.max(1, Number(o.total) || 1)
    biblio.value.unshift({ id: uid('bu-'), titre: (o.titre || '').trim(), auteur: (o.auteur || '').trim(), cote: (o.cote || '').trim(), type: o.type || 'Ouvrage', total, dispo: total })
    persist()
  }
  function removeBiblio(id) { biblio.value = biblio.value.filter((o) => o.id !== id); persist() }

  return {
    memoires, attestations, conges, biblio,
    memSoutenus, memPlanifies, memEnCours, addMemoire, setMemoireStatut, removeMemoire,
    attMois, addAttestation, removeAttestation,
    congesEnAttente, congesApprouves, addConge, setCongeStatut, removeConge,
    biblioTotal, biblioDispo, biblioMemoires, addBiblio, removeBiblio,
  }
})
