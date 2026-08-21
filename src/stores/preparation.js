import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { demoKey } from '../utils/demoScope'
import { useSchoolStore } from './school'

/**
 * Store « Cahier de préparation ».
 *
 * Demandé par Lorene (Shakespeare Academy, Pointe-Noire) le 13/08/2026 : chaque
 * enseignant planifie les modules qu'il va traiter dans SES matières, période par
 * période, et la direction valide. Le plan se discute en début d'année et
 * s'ajuste en cours de route.
 *
 * Un item = une fiche de préparation, c'est-à-dire le plan d'UNE matière pour UNE
 * classe sur UNE période. Elle contient une liste de modules ordonnés.
 *
 * Cycle de vie, volontairement court : l'enseignant rédige (`brouillon`), soumet
 * (`soumis`), la direction valide (`valide`) ou renvoie avec un motif
 * (`a_revoir`). Pas d'états intermédiaires : un circuit de validation à cinq
 * étapes ne serait jamais utilisé par une école.
 *
 * Un plan VALIDÉ reste modifiable par son enseignant, mais toute modification le
 * repasse en `soumis`. C'est ce qui rend le « ajustable en cours d'année » honnête :
 * la direction revoit ce qui a changé au lieu de découvrir un plan modifié sous
 * son visa.
 *
 * Persistance : école réelle → schools/{sid}/config/preparation, comme le module
 * Cours (mêmes règles Firestore, aucune règle à ajouter) ; démo → localStorage.
 */

// Clé SUFFIXÉE PAR ÉDITION : sans cela, le primaire lirait les données du
// secondaire et inversement. Les deux éditions sont des produits distincts.
const DEMO_KEY = 'mapo_preparation_v1'

export const STATUTS = ['brouillon', 'soumis', 'valide', 'a_revoir']

/** Un plan validé et non retouché : le seul état qui n'attend personne. */
export function estFige(fiche) {
  return fiche?.statut === 'valide'
}

export const usePreparationStore = defineStore('preparation', () => {
  const fiches = ref([])
  const loaded = ref(false)

  function _ref(sid) { return doc(db, 'schools', sid, 'config', 'preparation') }

  async function load() {
    const authStore = useAuthStore()
    if (authStore.isDemo) {
      try {
        const s = JSON.parse(localStorage.getItem(demoKey(DEMO_KEY)) || '{}')
        fiches.value = Array.isArray(s.fiches) ? s.fiches : demoSeed()
      } catch { fiches.value = demoSeed() }
      loaded.value = true
      return
    }
    try {
      const sid = authStore.schoolId
      if (!sid) { fiches.value = []; loaded.value = true; return }
      const snap = await getDoc(_ref(sid))
      fiches.value = snap.exists() && Array.isArray(snap.data().fiches) ? snap.data().fiches : []
      loaded.value = true
    } catch { fiches.value = []; loaded.value = true }
  }

  async function save() {
    const authStore = useAuthStore()
    const data = JSON.parse(JSON.stringify(fiches.value))
    if (authStore.isDemo) {
      try { localStorage.setItem(demoKey(DEMO_KEY), JSON.stringify({ fiches: data })) } catch { /* quota */ }
      return
    }
    try {
      const sid = authStore.schoolId
      if (!sid) return
      await setDoc(_ref(sid), { fiches: data, updatedAt: new Date().toISOString() })
    } catch (e) { console.error('Erreur sauvegarde préparation:', e) }
  }

  function trouver(id) { return fiches.value.find((f) => f.id === id) || null }

  /**
   * Crée ou retrouve la fiche d'une matière, pour une classe et une période.
   * Une seule fiche par triplet : sans cette unicité, deux enseignants d'une même
   * matière produiraient deux plans concurrents que la direction devrait arbitrer.
   */
  function ouvrirFiche({ matiere, classe, periode }) {
    const m = String(matiere || '').trim()
    const c = String(classe || '').trim()
    const p = String(periode || '').trim()
    if (!m || !c || !p) return null

    const existante = fiches.value.find(
      (f) => f.matiere === m && f.classe === c && f.periode === p,
    )
    if (existante) return existante

    const authStore = useAuthStore()
    const prof = authStore.userProfile || {}
    const fiche = {
      id: 'pr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      matiere: m,
      classe: c,
      periode: p,
      modules: [],
      statut: 'brouillon',
      motif: '',
      auteurId: prof.uid || '',
      auteurNom: [prof.firstName, prof.lastName].filter(Boolean).join(' ').trim() || prof.displayName || '',
      creeLe: new Date().toISOString(),
      majLe: new Date().toISOString(),
      valideLe: '',
      validePar: '',
    }
    fiches.value.push(fiche)
    save()
    return fiche
  }

  /** Ajoute un module au plan. `semaines` est indicatif, l'école n'est pas tenue de le remplir. */
  function ajouterModule(ficheId, { titre, objectifs = '', semaines = '' }) {
    const f = trouver(ficheId)
    if (!f || !String(titre || '').trim()) return null
    const mod = {
      id: 'md-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      titre: String(titre).trim(),
      objectifs: String(objectifs || '').trim(),
      semaines: String(semaines || '').trim(),
      fait: false,
    }
    f.modules.push(mod)
    _touche(f)
    return mod
  }

  function modifierModule(ficheId, moduleId, patch = {}) {
    const f = trouver(ficheId)
    const m = f?.modules.find((x) => x.id === moduleId)
    if (!m) return
    Object.assign(m, patch)
    _touche(f)
  }

  function retirerModule(ficheId, moduleId) {
    const f = trouver(ficheId)
    if (!f) return
    f.modules = f.modules.filter((x) => x.id !== moduleId)
    _touche(f)
  }

  /** Déplace un module dans le plan : l'ORDRE des modules est l'essentiel d'une progression. */
  function deplacerModule(ficheId, moduleId, sens) {
    const f = trouver(ficheId)
    if (!f) return
    const i = f.modules.findIndex((x) => x.id === moduleId)
    const j = sens === 'haut' ? i - 1 : i + 1
    if (i === -1 || j < 0 || j >= f.modules.length) return
    const [m] = f.modules.splice(i, 1)
    f.modules.splice(j, 0, m)
    _touche(f)
  }

  /**
   * Toute modification du plan le remet dans le circuit.
   * Un plan validé puis retouché en silence, c'est un visa que la direction n'a
   * pas donné.
   */
  function _touche(f) {
    f.majLe = new Date().toISOString()
    if (f.statut === 'valide' || f.statut === 'a_revoir') {
      f.statut = 'soumis'
      f.valideLe = ''
      f.validePar = ''
    }
    save()
  }

  function soumettre(ficheId) {
    const f = trouver(ficheId)
    // Un plan vide ne se soumet pas : la direction n'a rien à viser.
    if (!f || !f.modules.length) return false
    f.statut = 'soumis'
    f.motif = ''
    f.majLe = new Date().toISOString()
    save()
    return true
  }

  function valider(ficheId) {
    const f = trouver(ficheId)
    if (!f) return false
    const authStore = useAuthStore()
    const p = authStore.userProfile || {}
    f.statut = 'valide'
    f.motif = ''
    f.valideLe = new Date().toISOString()
    f.validePar = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.displayName || ''
    save()
    return true
  }

  /** Renvoyer sans motif n'aide personne : le motif est obligatoire. */
  function renvoyer(ficheId, motif) {
    const f = trouver(ficheId)
    if (!f || !String(motif || '').trim()) return false
    f.statut = 'a_revoir'
    f.motif = String(motif).trim()
    f.valideLe = ''
    f.validePar = ''
    f.majLe = new Date().toISOString()
    save()
    return true
  }

  /** Coche un module traité : c'est ce qui transforme un plan en suivi d'avancement. */
  function marquerFait(ficheId, moduleId, fait) {
    const f = trouver(ficheId)
    const m = f?.modules.find((x) => x.id === moduleId)
    if (!m) return
    m.fait = !!fait
    // Volontairement SANS `_touche` : cocher un module traité rend compte de
    // l'avancement, ça ne modifie pas le plan et ça ne doit pas casser le visa.
    f.majLe = new Date().toISOString()
    save()
  }

  /** Avancement d'une fiche, en pourcentage de modules traités. */
  function avancement(fiche) {
    if (!fiche?.modules?.length) return 0
    const faits = fiche.modules.filter((m) => m.fait).length
    return Math.round((faits / fiche.modules.length) * 100)
  }

  const enAttente = computed(() => fiches.value.filter((f) => f.statut === 'soumis'))

  function demoSeed() {
    const schoolStore = useSchoolStore()
    const periode = Object.keys(schoolStore.schoolSettings?.periods || {})[0] || 'T1'
    return [
      {
        id: 'pr-demo1', matiere: 'Mathématiques', classe: '6ème A', periode,
        modules: [
          { id: 'md-d1', titre: 'Nombres entiers et décimaux', objectifs: 'Lire, écrire, comparer et ranger.', semaines: '1-3', fait: true },
          { id: 'md-d2', titre: 'Fractions', objectifs: 'Représenter, comparer, additionner à même dénominateur.', semaines: '4-6', fait: false },
          { id: 'md-d3', titre: 'Figures usuelles', objectifs: 'Construire et reconnaître les figures de base.', semaines: '7-9', fait: false },
        ],
        statut: 'soumis', motif: '', auteurId: 'demo-enseignant', auteurNom: 'Jean Kamga',
        creeLe: new Date().toISOString(), majLe: new Date().toISOString(), valideLe: '', validePar: '',
      },
      {
        id: 'pr-demo2', matiere: 'Français', classe: '6ème A', periode,
        modules: [
          { id: 'md-d4', titre: 'Types et formes de phrases', objectifs: 'Identifier et transformer.', semaines: '1-2', fait: true },
          { id: 'md-d5', titre: 'Le récit', objectifs: 'Comprendre la structure d’un récit court.', semaines: '3-6', fait: false },
        ],
        statut: 'valide', motif: '', auteurId: '', auteurNom: 'Claire Ngo',
        creeLe: new Date().toISOString(), majLe: new Date().toISOString(),
        valideLe: new Date().toISOString(), validePar: 'Teussop Michel',
      },
    ]
  }

  return {
    fiches, loaded, enAttente,
    load, save, trouver, ouvrirFiche,
    ajouterModule, modifierModule, retirerModule, deplacerModule,
    soumettre, valider, renvoyer, marquerFait, avancement,
  }
})
