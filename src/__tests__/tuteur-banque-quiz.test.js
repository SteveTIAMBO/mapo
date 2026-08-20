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
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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
// L'enfant porte son PAYS : c'est lui qui décide s'il existe un programme
// officiel pour (pays, classe, matière), donc la provenance annoncée.
let enfantCourant = { id: 'e1', pays: 'FR' }
vi.mock('../stores/enfantsAutonomes', () => ({
  useEnfantsAutonomesStore: () => ({ linkedOwnerUid: null, get enfants() { return [enfantCourant] } }),
}))

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


/**
 * Clé de banque, sans présumer du préfixe de VERSION.
 *
 * La clé est versionnée (`v2__…`) : c'est ce qui rend une purge instantanée
 * quand on renforce le contrôle qualité. Figer le littéral dans un test
 * obligerait à retoucher le test à chaque purge — et un test qu'on retouche
 * pour le faire passer ne protège plus rien. On vérifie donc le SUFFIXE.
 */
const finit = (cles, suffixe) => cles.some((k) => k.endsWith(suffixe))
const finitAucune = (cles, suffixe) => !finit(cles, suffixe)
const cleBanque = (banque, suffixe) => Object.keys(banque).find((k) => k.endsWith(suffixe))

// La banque de test doit être remplie sous la MÊME clé que celle que le store
// va lire — préfixe de version compris. On LIT donc la version dans la source :
// la recopier à la main ferait tomber ce test à chaque purge, et un test qu'on
// retouche pour le faire passer ne protège plus rien.
const VERSION_BANQUE = (() => {
  const ici = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(resolve(ici, '../stores/tuteur.js'), 'utf8')
  const m = src.match(/const BANQUE_VERSION = '([a-z0-9]+)'/)
  return m ? m[1] : ''
})()
const cleTest = (suffixe) => VERSION_BANQUE + '__' + suffixe

describe('Banque de quiz — la difficulté ne doit plus être plafonnée', () => {
  it('deux niveaux distincts au-delà de 5 lisent DEUX documents différents', async () => {
    const tuteur = useTuteurStore()
    await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 6 })
    await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 7 })

    const lues = clesLues.filter((k) => k.includes('anglais__5eme'))
    expect(finit(lues, 'anglais__5eme__d6')).toBe(true)
    expect(finit(lues, 'anglais__5eme__d7')).toBe(true)
    // Le symptôme exact du bug : tout retombait sur d5.
    expect(finitAucune(lues, 'anglais__5eme__d5')).toBe(true)
  })

  it('le niveau 12 ne réutilise pas la banque du niveau 5', async () => {
    banque[cleTest('anglais__5eme__d5')] = questions('Niveau 5', 10)
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
    banque[cleTest('anglais__5eme__d3')] = dejaJouees
    historique('enf1', 'Anglais', dejaJouees)

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(finit(clesLues, 'anglais__5eme__d3')).toBe(true) // la banque a bien été consultée
    expect(res.mode).toBe('ia')                      // …et écartée : elle n'avait que du déjà-vu
    expect(appelsIA).toHaveLength(1)
  })

  it('la banque reste utilisée quand elle a assez de questions neuves', async () => {
    historique('enf1', 'Anglais', questions('Déjà vue', 5))
    banque[cleTest('anglais__5eme__d3')] = [...questions('Déjà vue', 5), ...questions('Neuve', 10)]

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
    banque[cleTest('anglais__5eme__d3')] = questions('Déjà vue', 10)

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(res.mode).toBe('banque') // rien à écarter en anglais → la banque sert
    expect(appelsIA).toHaveLength(0)
  })
})


describe('La banque partagée est VERSIONNÉE (purge instantanée)', () => {
  it('une version est bien définie dans le store', () => {
    // Sans préfixe de version, purger la banque exigerait de supprimer des
    // documents Firestore — donc la clé de service, qu'on ne manipule pas.
    expect(VERSION_BANQUE).toMatch(/^v\d+$/)
  })

  it('toute clé lue porte ce préfixe', () => {
    expect(cleTest('maths__6eme__d1').startsWith(VERSION_BANQUE + '__')).toBe(true)
  })
})


/**
 * La provenance annoncée doit être VRAIE, y compris pour une question
 * réutilisée.
 *
 * Le 19/08, la génération fraîche avait été corrigée pour ne plus annoncer
 * « referentiel » quand aucun programme officiel n'existe. La branche BANQUE,
 * elle, était restée : elle annonçait toujours « referentiel », dans toutes les
 * matières et tous les pays. Une question ressortie de la banque n'est pourtant
 * pas mieux sourcée qu'une neuve — elle a la provenance de sa matière.
 */
describe('Provenance — la banque ne doit pas s’attribuer un programme qu’elle n’a pas', () => {
  it('matière SANS référentiel : la banque annonce « ia », pas « referentiel »', async () => {
    enfantCourant = { id: 'e1', pays: 'FR' }
    banque[cleTest('arts-plastiques__4e__d3')] = questions('Banque', 10)
    const tuteur = useTuteurStore()
    const r = await tuteur.generateQuiz({ matiere: 'Arts plastiques', niveau: '4e', nombre: 10, difficulte: 3, studentId: 'e1' })
    expect(r.mode).toBe('banque')
    expect(r.source).toBe('ia')
  })

  it('matière AVEC référentiel : la banque peut l’annoncer', async () => {
    enfantCourant = { id: 'e1', pays: 'FR' }
    banque[cleTest('mathematiques__5e__d3')] = questions('Banque', 10)
    const tuteur = useTuteurStore()
    const r = await tuteur.generateQuiz({ matiere: 'Mathématiques', niveau: '5e', nombre: 10, difficulte: 3, studentId: 'e1' })
    expect(r.mode).toBe('banque')
    expect(r.source).toBe('referentiel')
  })

  it('le PAYS de l’enfant compte : « 5e » n’existe pas au Cameroun', async () => {
    // Même matière, même intitulé de classe, autre pays : le Cameroun écrit
    // « 5ème ». Annoncer un programme officiel ici serait faux.
    enfantCourant = { id: 'e1', pays: 'CM' }
    banque[cleTest('mathematiques__5e__d3')] = questions('Banque', 10)
    const tuteur = useTuteurStore()
    const r = await tuteur.generateQuiz({ matiere: 'Mathématiques', niveau: '5e', nombre: 10, difficulte: 3, studentId: 'e1' })
    expect(r.source).toBe('ia')
  })
})

/**
 * Une question validée coûte DEUX appels IA (génération + vérification par le
 * solveur aveugle). La jeter parce qu'il en manque une autre est le gaspillage
 * le plus cher du produit — et c'est exactement ce que faisait la lecture en
 * tout-ou-rien : 6 questions prêtes étaient ignorées quand il en fallait 7.
 */
describe('Banque partagée — lecture PARTIELLE et complément', () => {
  it('une banque incomplète est SERVIE puis complétée par l’IA, pas jetée', async () => {
    banque[cleTest('anglais__5eme__d3')] = questions('Neuve', 6)

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(res.questions).toHaveLength(10)
    // Les 6 de la banque d'abord (déjà validées), le complément ensuite.
    expect(res.questions.filter((q) => q.q.startsWith('Neuve'))).toHaveLength(6)
    expect(res.questions.filter((q) => q.q.startsWith('IA'))).toHaveLength(4)
  })

  it('l’IA n’est sollicitée que pour le COMPLÉMENT, avec une marge de rejet', async () => {
    banque[cleTest('anglais__5eme__d3')] = questions('Neuve', 6)

    const tuteur = useTuteurStore()
    await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    const demande = appelsIA[0].data.nombre
    expect(demande).toBeGreaterThan(4)   // marge : le solveur va en rejeter
    expect(demande).toBeLessThan(10)     // mais on ne repaie pas la séance entière
  })

  it('les questions déjà fournies par la banque ne sont pas redemandées à l’IA', async () => {
    banque[cleTest('anglais__5eme__d3')] = questions('Neuve', 6)

    const tuteur = useTuteurStore()
    await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(appelsIA[0].data.exclure.filter((t) => t.startsWith('Neuve'))).toHaveLength(6)
  })

  it('aucun doublon entre le socle de la banque et le complément', async () => {
    banque[cleTest('anglais__5eme__d3')] = questions('IA', 4) // mêmes intitulés que le mock IA

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    const vus = new Set(res.questions.map((q) => q.q))
    expect(vus.size).toBe(res.questions.length)
  })
})

/**
 * Le repli local est GÉNÉRIQUE : 4 questions de méthode, sans rapport avec la
 * matière ni le niveau. Une séance courte mais conforme au programme vaut mieux
 * qu'une séance complète mais hors sujet.
 */
describe('Panne IA — la banque passe avant le repli générique', () => {
  it('IA injoignable et banque partielle : on sert la banque', async () => {
    banque[cleTest('anglais__5eme__d3')] = questions('Neuve', 3)
    global.fetch = vi.fn(async () => { throw new Error('proxy injoignable') })

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(res.mode).toBe('banque')
    expect(res.questions).toHaveLength(3)
    expect(res.questions.every((q) => q.q.startsWith('Neuve'))).toBe(true)
  })

  it('IA injoignable et banque VIDE : ÉCHEC assumé, aucun contenu de remplacement', async () => {
    let appels = 0
    global.fetch = vi.fn(async () => { appels++; throw new Error('proxy injoignable') })

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    // Plus AUCUNE question fabriquée : servir du hors-programme faisait croire
    // à l'apprenant qu'il avait révisé sa leçon.
    expect(res.ok).toBe(false)
    expect(res.mode).toBe('echec')
    expect(res.questions).toHaveLength(0)
    expect(appels).toBe(2) // on redemande à l'IA avant d'abandonner
  })

  it('un lot ENTIÈREMENT rejeté par le solveur déclenche une seconde génération', async () => {
    let appels = 0
    global.fetch = vi.fn(async () => {
      appels++
      // 1re tentative : le solveur a tout rejeté (questions vide). 2e : ça passe.
      const questionsRendues = appels === 1 ? [] : questions('IA', 10)
      return { json: async () => ({ ok: true, text: JSON.stringify({ source: 'ia', questions: questionsRendues }) }) }
    })

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(appels).toBe(2)
    expect(res.questions).toHaveLength(10)
  })

  it('crédits épuisés : AUCUNE seconde tentative (elle serait facturée)', async () => {
    let appels = 0
    global.fetch = vi.fn(async () => { appels++; return { json: async () => ({ ok: false, error: 'credits_epuises' }) } })

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(appels).toBe(1)
    expect(res.reason).toBe('credits_epuises')
  })

  it('IA non configurée : échec DÉFINITIF, on ne retente pas', async () => {
    let appels = 0
    global.fetch = vi.fn(async () => { appels++; return { json: async () => ({ ok: false, error: 'not_configured' }) } })

    const tuteur = useTuteurStore()
    const res = await tuteur.generateQuiz({ matiere: 'Anglais', niveau: '5ème', nombre: 10, difficulte: 3, studentId: 'enf1' })

    expect(appels).toBe(1)
    expect(res.mode).toBe('echec')
  })
})
