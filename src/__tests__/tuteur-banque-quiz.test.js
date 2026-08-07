/**
 * Test de non-régression — banque de quiz partagée (store tuteur).
 *
 * Bug d'origine (signalé par Steve, 06/08) : « à partir du niveau 5-6 les
 * questions se répètent au lieu de monter en difficulté ». Cause : la clé de la
 * banque plafonnait la difficulté à 5, donc TOUS les niveaux >= 5 partageaient
 * un unique document. Dès qu'il contenait 10 questions, l'IA n'était plus
 * jamais appelée et l'apprenant rejouait le même lot à difficulté gelée.
 *
 * Ces tests exigent une décision FERME (la clé effectivement lue, l'appel IA
 * effectivement émis), et pas seulement « ça ne plante pas » — leçon du
 * 05/08 : un test qui ne vérifie que l'absence d'incident ne prouve rien.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ── Firestore mocké : on capture les clés de documents réellement demandées ──
const clesLues = []
let banque = {} // clé de banque → tableau de questions

vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'u-parent', getIdToken: async () => 'jeton' } },
  db: {},
}))
vi.mock('firebase/firestore', () => ({
  doc: (_db, collection, key) => ({ collection, key }),
  getDoc: async (ref) => {
    if (ref.collection === 'quizBank') clesLues.push(ref.key)
    const questions = banque[ref.key]
    return { exists: () => Array.isArray(questions), data: () => ({ questions }) }
  },
  setDoc: async () => {},
  deleteDoc: async () => {},
}))

// ── Dépendances périphériques neutralisées (aucune n'intervient dans le bug) ──
vi.mock('../utils/tenantContext', () => ({ isMapoPlusTenant: () => true }))
vi.mock('../utils/recompenses', () => ({ enregistrerActivite: () => {} }))
vi.mock('../utils/elo', () => ({ enregistrerResultatElo: () => {} }))
vi.mock('../stores/miapoAnalytics', () => ({ useMiapoAnalyticsStore: () => ({ recordQuiz: () => {} }) }))
vi.mock('../stores/auth', () => ({ useAuthStore: () => ({ isB2C: true }) }))
vi.mock('../stores/abonnement', () => ({ useAbonnementStore: () => ({ majJauge: () => {}, marquerEpuise: () => {} }) }))
vi.mock('../stores/usage', () => ({ useUsageStore: () => ({ consume: () => {} }), COUT_ACTION: { quiz: 1 } }))
vi.mock('../stores/miapoRef', () => ({ useMiapoRefStore: () => ({ load: async () => {}, getExemples: () => '' }) }))
vi.mock('../stores/enfantsAutonomes', () => ({ useEnfantsAutonomesStore: () => ({ linkedOwnerUid: null }) }))

import { useTuteurStore } from '../stores/tuteur'

/** Fabrique n questions valides (4 choix), intitulés distincts. */
function questions(prefixe, n) {
  return Array.from({ length: n }, (_, i) => ({
    q: `${prefixe} question ${i + 1} ?`,
    choices: ['a', 'b', 'c', 'd'],
    answer: 0,
    hint: 'indice',
    explanation: 'explication',
  }))
}

let appelsIA = []

beforeEach(() => {
  setActivePinia(createPinia())
  clesLues.length = 0
  banque = {}
  appelsIA = []
  localStorage.clear()
  global.fetch = vi.fn(async (_url, opts) => {
    appelsIA.push(JSON.parse(opts.body))
    return {
      json: async () => ({
        ok: true,
        text: JSON.stringify({ source: 'referentiel', questions: questions('IA', 10) }),
      }),
    }
  })
})

describe('Banque de quiz — la difficulté ne doit plus être plafonnée', () => {
  it('deux niveaux distincts au-delà de 5 lisent DEUX documents différents', async () => {
    const tuteur = useTuteurStore()
    await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 6 })
    await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 7 })

    const lues = clesLues.filter((k) => k.startsWith('anglais__5eme'))
    expect(lues).toContain('anglais__5eme__d6')
    expect(lues).toContain('anglais__5eme__d7')
    // Le symptôme exact du bug : tout retombait sur d5.
    expect(lues).not.toContain('anglais__5eme__d5')
  })

  it('le niveau 12 ne réutilise pas la banque du niveau 5', async () => {
    banque['anglais__5eme__d5'] = questions('Niveau 5', 10)
    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 12 })

    expect(res.ok).toBe(true)
    // Décision ferme : l'IA a bien été appelée, avec la difficulté 12 intacte.
    expect(appelsIA).toHaveLength(1)
    expect(appelsIA[0].data.difficulte).toBe(12)
    expect(res.mode).toBe('ia')
    expect(res.questions[0].q).not.toContain('Niveau 5')
  })
})

describe('Banque de quiz — un apprenant ne rejoue pas ses propres questions', () => {
  /** Écrit un historique de séance tel que le composant TuteurQuiz l'enregistre. */
  function historique(studentId, matiere, qs) {
    localStorage.setItem(
      `mapo_revision_history_v1_${studentId}`,
      JSON.stringify([{ id: 'rs-1', date: new Date().toISOString(), subjectName: matiere, questions: qs }]),
    )
  }

  it('si la banque ne contient que du déjà-vu, on régénère au lieu de resservir', async () => {
    const dejaJouees = questions('Déjà vue', 10)
    banque['anglais__5eme__d3'] = dejaJouees
    historique('enf1', 'Anglais', dejaJouees)

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(clesLues).toContain('anglais__5eme__d3') // la banque a bien été consultée
    expect(res.mode).toBe('ia')                      // …et écartée : elle n'avait que du déjà-vu
    expect(appelsIA).toHaveLength(1)
  })

  it('la banque reste utilisée quand elle a assez de questions neuves', async () => {
    historique('enf1', 'Anglais', questions('Déjà vue', 5))
    banque['anglais__5eme__d3'] = [...questions('Déjà vue', 5), ...questions('Neuve', 10)]

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(res.mode).toBe('banque')
    expect(appelsIA).toHaveLength(0) // 0 token : c'est tout l'intérêt de la banque
    expect(res.questions.every((q) => q.q.startsWith('Neuve'))).toBe(true)
  })

  it("les questions déjà vues sont transmises à l'IA pour qu'elle produise du neuf", async () => {
    historique('enf1', 'Anglais', questions('Déjà vue', 3))

    const tuteur = useTuteurStore()
    await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(appelsIA[0].data.exclure).toHaveLength(3)
    expect(appelsIA[0].data.exclure[0]).toContain('Déjà vue')
  })

  it("l'historique d'une AUTRE matière n'écarte rien", async () => {
    historique('enf1', 'Mathématiques', questions('Déjà vue', 10))
    banque['anglais__5eme__d3'] = questions('Déjà vue', 10)

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(res.mode).toBe('banque') // rien à écarter en anglais → la banque sert
    expect(appelsIA).toHaveLength(0)
  })
})
