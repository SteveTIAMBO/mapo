import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Store APEE — Association des Parents d'Élèves et Enseignants.
 *
 * Cadre camerounais (circulaire MINESEC 07/2008 + MINEDUB au primaire) :
 *  - Le BUREAU EXÉCUTIF (Président, Trésorier, Secrétaire, Commissaires…) est
 *    élu par les parents via les délégués de classe. Le CHEF D'ÉTABLISSEMENT
 *    n'en est PAS membre : il est « conseiller technique ». Ce module permet
 *    donc au directeur de PILOTER / SUPERVISER l'APEE, pas de la diriger.
 *  - Les fonds APEE sont DISTINCTS de la scolarité : ils financent les
 *    enseignants vacataires, le gardiennage, l'entretien et les constructions.
 *  - La cotisation est votée en assemblée générale, obligatoire sauf « cas
 *    sociaux » (exonérés). Un rapport trimestriel est dû à l'autorité.
 *
 * Démo : persistée en localStorage (`mapo_apee`). Sync Firestore = évolution.
 */

const KEY = 'mapo_apee'

function seed() {
  return {
    annee: '2025-2026',
    cotisationMontant: 15000, // FCFA / an, voté en AG
    bureau: [
      { id: 'b1', role: 'Président', nom: 'M. Nkolo Jean', tel: '+237 6 99 00 11 22' },
      { id: 'b2', role: 'Vice-président', nom: 'Mme Eyenga Brigitte', tel: '+237 6 77 33 44 55' },
      { id: 'b3', role: 'Trésorier', nom: 'Mme Abena Rose', tel: '+237 6 90 12 34 56' },
      { id: 'b4', role: 'Secrétaire', nom: 'M. Fouda Paul', tel: '+237 6 55 66 77 88' },
      { id: 'b5', role: 'Commissaire aux comptes', nom: 'Mme Ngo Marie', tel: '+237 6 70 80 90 10' },
    ],
    delegues: [
      { id: 'd1', niveau: 'SIL', nom: 'Mme Manga Julienne' },
      { id: 'd2', niveau: 'CP', nom: 'M. Owona Éric' },
      { id: 'd3', niveau: 'CE1', nom: 'Mme Bella Chantal' },
      { id: 'd4', niveau: 'CE2', nom: 'M. Ateba Serge' },
      { id: 'd5', niveau: 'CM1', nom: 'Mme Ndongo Alice' },
      { id: 'd6', niveau: 'CM2', nom: 'M. Zambo Victor' },
    ],
    // Suivi des cotisations par famille (démo : échantillon représentatif).
    familles: [
      { id: 'f1', nom: 'Famille Mvondo', classe: 'CM1', du: 15000, paye: 15000, exonere: false },
      { id: 'f2', nom: 'Famille Atangana', classe: 'CE2', du: 15000, paye: 15000, exonere: false },
      { id: 'f3', nom: 'Famille Ekotto', classe: 'SIL', du: 15000, paye: 7500, exonere: false },
      { id: 'f4', nom: 'Famille Biya (cas social)', classe: 'CP', du: 0, paye: 0, exonere: true },
      { id: 'f5', nom: 'Famille Ngono', classe: 'CM2', du: 15000, paye: 0, exonere: false },
      { id: 'f6', nom: 'Famille Tchoua', classe: 'CE1', du: 15000, paye: 15000, exonere: false },
      { id: 'f7', nom: 'Famille Kamdem', classe: 'CM2', du: 15000, paye: 15000, exonere: false },
      { id: 'f8', nom: 'Famille Essomba', classe: 'CE1', du: 15000, paye: 5000, exonere: false },
    ],
    // Effectif total de familles cotisantes (pour l'agrégat global au-delà de l'échantillon).
    famillesTotal: 180, famillesPayees: 118, famillesExonerees: 9,
    reunions: [
      { id: 'r1', date: '2025-10-04', type: 'Assemblée générale', objet: 'AG de rentrée : vote de la cotisation, programme annuel',
        presents: 142, pv: "Cotisation fixée à 15 000 FCFA. Priorités : réfection du bloc B, appui à 2 enseignants vacataires. Bureau reconduit." },
      { id: 'r2', date: '2025-11-15', type: 'Réunion du bureau', objet: "Point sur la collecte et lancement des travaux de toiture",
        presents: 5, pv: "Collecte à 62 %. Démarrage des travaux de toiture voté. Relances des familles en retard décidées." },
    ],
    projets: [
      { id: 'p1', intitule: 'Réfection de la toiture — bloc B', categorie: 'Construction / entretien', budget: 3500000, depense: 2100000, statut: 'En cours' },
      { id: 'p2', intitule: 'Appui à 2 enseignants vacataires', categorie: 'Personnel vacataire', budget: 1800000, depense: 1200000, statut: 'En cours' },
      { id: 'p3', intitule: 'Achat de 60 tables-bancs', categorie: 'Équipement', budget: 900000, depense: 900000, statut: 'Terminé' },
      { id: 'p4', intitule: 'Gardiennage (année scolaire)', categorie: 'Gardiennage / entretien', budget: 1200000, depense: 700000, statut: 'En cours' },
    ],
  }
}

export const useApeeStore = defineStore('apee', () => {
  const data = ref(seed())

  function load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) data.value = { ...seed(), ...JSON.parse(raw) }
    } catch { /* seed par défaut */ }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(data.value)) } catch { /* ignore */ }
  }
  function resetDemo() { data.value = seed(); persist() }

  // ── Cotisations : agrégats (échelle réelle via famillesTotal) ──────────
  const coti = computed(() => {
    const d = data.value
    const attendu = (d.famillesTotal - d.famillesExonerees) * d.cotisationMontant
    // Ratio de collecte estimé depuis l'échantillon + le nb de familles payées.
    const collecte = d.famillesPayees * d.cotisationMontant
      + Math.round(d.familles.reduce((s, f) => s + (f.exonere ? 0 : Math.min(f.paye, f.du)), 0) * 0)
    const reste = Math.max(0, attendu - collecte)
    const taux = attendu ? Math.round(collecte / attendu * 100) : 0
    const impayes = d.famillesTotal - d.famillesExonerees - d.famillesPayees
    return { attendu, collecte, reste, taux, impayes, exoneres: d.famillesExonerees }
  })

  // ── Budget des projets ─────────────────────────────────────────────────
  const budget = computed(() => {
    const prevu = data.value.projets.reduce((s, p) => s + (p.budget || 0), 0)
    const depense = data.value.projets.reduce((s, p) => s + (p.depense || 0), 0)
    return { prevu, depense, reste: prevu - depense, taux: prevu ? Math.round(depense / prevu * 100) : 0 }
  })

  const prochaineReunion = computed(() => {
    const futures = [...data.value.reunions].sort((a, b) => a.date.localeCompare(b.date))
    return futures[futures.length - 1] || null
  })

  // ── Actions CRUD simples (démo) ─────────────────────────────────────────
  const uid = () => Math.random().toString(36).slice(2, 9)
  function addBureau(m) { data.value.bureau.push({ id: uid(), ...m }); persist() }
  function removeBureau(id) { data.value.bureau = data.value.bureau.filter(x => x.id !== id); persist() }
  function setFamillePaye(id, paye) { const f = data.value.familles.find(x => x.id === id); if (f) { f.paye = paye; persist() } }
  function toggleExonere(id) { const f = data.value.familles.find(x => x.id === id); if (f) { f.exonere = !f.exonere; f.du = f.exonere ? 0 : data.value.cotisationMontant; persist() } }
  function addReunion(r) { data.value.reunions.push({ id: uid(), ...r }); persist() }
  function addProjet(p) { data.value.projets.push({ id: uid(), depense: 0, statut: 'En cours', ...p }); persist() }
  function setCotisationMontant(v) { data.value.cotisationMontant = Number(v) || 0; persist() }

  return {
    data, load, persist, resetDemo,
    coti, budget, prochaineReunion,
    addBureau, removeBureau, setFamillePaye, toggleExonere, addReunion, addProjet, setCotisationMontant,
  }
})
