import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { demoKey } from '../utils/demoScope'

/**
 * Store "examens" — examens nationaux et taux de réussite.
 *
 * Système francophone (Cameroun / Sénégal / Côte d'Ivoire / France) :
 *   CEP/CFEE (primaire), BEPC/BFEM (fin 1er cycle), Probatoire, Baccalauréat.
 * Permet d'inscrire les candidats (depuis les classes du niveau), de saisir
 * les résultats (admis / ajourné / absent + mention), et d'afficher les
 * statistiques de réussite — l'argument de vente clé pour une école.
 *
 * Démo : persistance localStorage + jeu de données réaliste auto-généré.
 */

/**
 * Examens nationaux, PAR PAYS.
 *
 * Ce module s'appelle « Examens nationaux » : lui faire afficher un Probatoire à
 * une école sénégalaise, où cet examen n'existe pas, disqualifie le produit en
 * démo. Chaque liste vient donc du ministère concerné, pas d'une généralisation
 * du cas camerounais.
 *
 * Sources : Cameroun (MINEDUC/MINESEC) ; Sénégal — CFEE, BFEM, Baccalauréat,
 * organisés par le ministère de l'Éducation nationale et l'Office du bac ;
 * Côte d'Ivoire — CEPE, BEPC, Baccalauréat (DECO, men-deco.org) ; RD Congo —
 * ENAFEP, TENASOSP, EXETAT (edu-nc.gouv.cd) ; France — DNB et Baccalauréat.
 */
export const EXAM_TYPES_PAR_PAYS = {
  CM: [
    { key: 'cep', label: 'CEP', niveau: 'CM2', cycle: 'primaire', desc: "Certificat d'études primaires (fin du primaire)" },
    { key: 'bepc', label: 'BEPC', niveau: '3e', cycle: 'college', desc: "Brevet d'études du premier cycle" },
    { key: 'probatoire', label: 'Probatoire', niveau: '1ere', cycle: 'lycee', desc: 'Avant le baccalauréat' },
    { key: 'bac', label: 'Baccalauréat', niveau: 'Tle', cycle: 'lycee', desc: 'Fin du secondaire' },
  ],
  SN: [
    { key: 'cfee', label: 'CFEE', niveau: 'CM2', cycle: 'primaire', desc: "Certificat de fin d'études élémentaires" },
    { key: 'bfem', label: 'BFEM', niveau: '3e', cycle: 'college', desc: "Brevet de fin d'études moyennes" },
    { key: 'bac', label: 'Baccalauréat', niveau: 'Tle', cycle: 'lycee', desc: 'Fin du secondaire' },
  ],
  CI: [
    { key: 'cepe', label: 'CEPE', niveau: 'CM2', cycle: 'primaire', desc: "Certificat d'études primaires élémentaires" },
    { key: 'bepc', label: 'BEPC', niveau: '3e', cycle: 'college', desc: "Brevet d'études du premier cycle" },
    { key: 'bac', label: 'Baccalauréat', niveau: 'Tle', cycle: 'lycee', desc: 'Fin du secondaire' },
  ],
  CD: [
    { key: 'enafep', label: 'ENAFEP', niveau: '6e primaire', cycle: 'primaire', desc: 'Évaluation nationale de fin d’études primaires' },
    { key: 'tenasosp', label: 'TENASOSP', niveau: '8e année', cycle: 'college', desc: "Test national de fin d'études du cycle terminal" },
    { key: 'exetat', label: "EXETAT", niveau: '4e humanités', cycle: 'lycee', desc: "Examen d'État (fin des humanités)" },
  ],
  FR: [
    { key: 'dnb', label: 'DNB', niveau: '3e', cycle: 'college', desc: 'Diplôme national du brevet' },
    { key: 'bac', label: 'Baccalauréat', niveau: 'Terminale', cycle: 'lycee', desc: 'Fin du secondaire' },
  ],
}

/** Examens du pays d'une école. Pays inconnu → Cameroun (marché historique). */
export function examTypesPays(pays) {
  return EXAM_TYPES_PAR_PAYS[pays] || EXAM_TYPES_PAR_PAYS.CM
}

// Compatibilité : les appelants qui n'ont pas de contexte pays gardent la liste
// camerounaise. `examTypesPays` est ce qu'il faut utiliser dans les écrans.
export const EXAM_TYPES = EXAM_TYPES_PAR_PAYS.CM

// Tous les types, tous pays confondus — pour retrouver un examen enregistré même
// si l'école a changé de pays entre-temps (sinon son historique devient illisible).
export const EXAM_TYPES_TOUS = Object.values(EXAM_TYPES_PAR_PAYS).flat()

export const RESULT_STATUS = [
  { value: 'inscrit', label: 'Inscrit', color: '#8E8E93' },
  { value: 'admis', label: 'Admis', color: '#1B8A5A' },
  { value: 'ajourne', label: 'Ajourné', color: '#C0392B' },
  { value: 'absent', label: 'Absent', color: '#D69E2E' },
]

export const MENTIONS = ['Passable', 'Assez bien', 'Bien', 'Très bien', 'Excellent']

const EXAMS_KEY = 'mapo_demo_examens'
const CAND_KEY = 'mapo_demo_candidatures'

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

// Hash déterministe d'un id → 0..99 (pour générer des résultats démo stables)
function hash01(str) {
  let h = 0
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000
  return h % 100
}

export const useExamensStore = defineStore('examens', () => {
  const exams = ref(loadJSON(demoKey(EXAMS_KEY), []))
  // candidatures : { [examId]: [{ eleveId, eleveName, numeroTable, statut, mention, note }] }
  const candidatures = ref(loadJSON(demoKey(CAND_KEY), {}))

  function persist() {
    try {
      localStorage.setItem(demoKey(EXAMS_KEY), JSON.stringify(exams.value))
      localStorage.setItem(demoKey(CAND_KEY), JSON.stringify(candidatures.value))
    } catch { /* silencieux */ }
  }

  const examsSorted = computed(() =>
    [...exams.value].sort((a, b) => (b.annee || '').localeCompare(a.annee || '') || a.label.localeCompare(b.label))
  )

  // Recherche dans TOUS les pays : un examen déjà enregistré doit rester
  // lisible même si l'école change de pays dans ses paramètres.
  function getType(key) { return EXAM_TYPES_TOUS.find(t => t.key === key) }

  function addExam({ type, annee }) {
    const t = getType(type)
    if (!t) return null
    const id = 'ex-' + type + '-' + (annee || '').replace(/\W/g, '') + '-' + Date.now().toString().slice(-4)
    const exam = { id, type, label: t.label, niveau: t.niveau, cycle: t.cycle, annee: annee || '', createdAt: new Date().toISOString() }
    exams.value.push(exam)
    candidatures.value[id] = candidatures.value[id] || []
    persist()
    return exam
  }

  function removeExam(id) {
    exams.value = exams.value.filter(e => e.id !== id)
    delete candidatures.value[id]
    persist()
  }

  function getCandidats(examId) { return candidatures.value[examId] || [] }

  /** Inscrit les élèves d'un niveau (toutes classes) comme candidats. */
  function inscrireNiveau(examId, eleves) {
    const exam = exams.value.find(e => e.id === examId)
    if (!exam) return 0
    const existing = new Set((candidatures.value[examId] || []).map(c => c.eleveId))
    const niveauEleves = eleves.filter(e =>
      (e.status || 'inscrit') === 'inscrit' && matchNiveau(e.className, exam.niveau)
    )
    let added = 0
    const list = candidatures.value[examId] ? [...candidatures.value[examId]] : []
    for (const e of niveauEleves) {
      if (existing.has(e.id)) continue
      list.push({
        eleveId: e.id,
        eleveName: `${e.lastName} ${e.firstName}`,
        className: e.className,
        numeroTable: '',
        statut: 'inscrit',
        mention: '',
        note: '',
      })
      added++
    }
    candidatures.value = { ...candidatures.value, [examId]: list }
    persist()
    return added
  }

  function updateCandidat(examId, eleveId, patch) {
    const list = candidatures.value[examId]
    if (!list) return
    const c = list.find(x => x.eleveId === eleveId)
    if (c) { Object.assign(c, patch); persist() }
  }

  /** Statistiques d'un examen : candidats, présents, admis, taux, mentions. */
  function getStats(examId) {
    const list = getCandidats(examId)
    const inscrits = list.length
    const presents = list.filter(c => c.statut === 'admis' || c.statut === 'ajourne').length
    const admis = list.filter(c => c.statut === 'admis').length
    const absents = list.filter(c => c.statut === 'absent').length
    const taux = presents > 0 ? Math.round((admis / presents) * 100) : 0
    const mentions = {}
    for (const m of MENTIONS) mentions[m] = 0
    for (const c of list) if (c.statut === 'admis' && c.mention) mentions[c.mention] = (mentions[c.mention] || 0) + 1
    return { inscrits, presents, admis, absents, ajournes: presents - admis, taux, mentions }
  }

  /**
   * Crée un jeu de démonstration réaliste si aucun examen n'existe encore :
   * Bac (Tle) + BEPC (3e) de l'année précédente, candidats = élèves du niveau,
   * résultats générés de façon déterministe (≈ taux réalistes).
   */
  function seedDemo(eleves) {
    if (exams.value.length || !eleves || !eleves.length) return
    const now = new Date()
    const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
    const annee = `${y - 1}-${y}`
    const seeds = [
      { type: 'bac', tauxCible: 72 },
      { type: 'bepc', tauxCible: 64 },
    ]
    for (const s of seeds) {
      const exam = addExam({ type: s.type, annee })
      if (!exam) continue
      inscrireNiveau(exam.id, eleves)
      const list = candidatures.value[exam.id] || []
      for (const c of list) {
        const h = hash01(c.eleveId + s.type)
        if (h < 4) { c.statut = 'absent'; continue }
        if (h < s.tauxCible) {
          c.statut = 'admis'
          const m = hash01(c.eleveId + 'm')
          c.mention = m > 92 ? 'Très bien' : m > 80 ? 'Bien' : m > 55 ? 'Assez bien' : 'Passable'
        } else {
          c.statut = 'ajourne'
        }
        c.numeroTable = String(10000 + (hash01(c.eleveId + 't') * 7) + list.indexOf(c))
      }
    }
    candidatures.value = { ...candidatures.value }
    persist()
  }

  return {
    exams, candidatures, examsSorted,
    getType, addExam, removeExam,
    getCandidats, inscrireNiveau, updateCandidat, getStats, seedDemo,
  }
})

// Vrai si className appartient au niveau (ex: '3e' → '3ème A/B/C', 'Tle' → 'Tle A/C/D')
function matchNiveau(className, niveau) {
  const c = (className || '').toLowerCase().replace('è', 'e').replace('é', 'e')
  const n = (niveau || '').toLowerCase().replace('è', 'e')
  if (n === 'tle') return c.startsWith('tle') || c.startsWith('terminale')
  if (n === '1ere') return c.startsWith('1ere') || c.startsWith('1re') || c.startsWith('1ère')
  if (n === '2nde') return c.startsWith('2nde') || c.startsWith('2de')
  if (n === 'cm2') return c.startsWith('cm2')
  // 6e/5e/4e/3e
  return c.startsWith(n)
}
