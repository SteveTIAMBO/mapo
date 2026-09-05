/**
 * Épreuve sans assistance — écart E10 du référentiel.
 *
 * Ce que ces tests protègent : la mesure elle-même. Une épreuve dont le rythme
 * dérape, dont l'instantané de révision est pris après coup, ou qui commente un
 * écart calculé sur une seule épreuve ne mesure plus rien — elle fabrique un
 * chiffre, ce qui est pire que de ne pas mesurer.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  historiqueEpreuves, enregistrerEpreuve, effacerEpreuves, remplacerEpreuves,
  epreuveOuverte, progressionEpreuves, comparaisonTravaillees,
} from '../utils/examenBlanc'

const JOUR = 86400000
const epreuve = (matiere, reussi, total, seances = 0) => ({
  matiere, reussi, total, dureeSec: 600, etatRevision: { seances, maitrise: 40, palier: 2 },
})

describe('enregistrement', () => {
  beforeEach(() => localStorage.clear())

  it("garde le score, la durée et l'état de révision d'AVANT l'épreuve", () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 7, 10, 5))
    const [x] = historiqueEpreuves('e1')
    expect(x.reussi).toBe(7)
    expect(x.total).toBe(10)
    expect(x.dureeSec).toBe(600)
    expect(x.seancesAvant).toBe(5)
    expect(x.maitriseAvant).toBe(40)
  })

  it('refuse une épreuve sans questions : il n’y a rien à mesurer', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 0, 0))
    enregistrerEpreuve('e1', { matiere: 'Français' })
    expect(historiqueEpreuves('e1')).toHaveLength(0)
  })

  it('cloisonne les apprenants', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 7, 10))
    expect(historiqueEpreuves('e2')).toHaveLength(0)
  })

  it('efface tout à la suppression du profil', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 7, 10))
    effacerEpreuves('e1')
    expect(historiqueEpreuves('e1')).toHaveLength(0)
  })

  // Une fonction d'effacement que personne n'appelle ne protège personne : le
  // 03/09, `effacerCalibration` était exactement dans ce cas.
  it('et le store l’appelle vraiment quand un profil part', () => {
    const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
    const store = readFileSync(resolve(racine, 'src/stores/enfantsAutonomes.js'), 'utf8')
    expect(store).toContain('effacerEpreuves(id)')
  })

  it('survit à un cache illisible', () => {
    localStorage.setItem('mapo_b2c_examens_e1', '{ pas du json')
    expect(historiqueEpreuves('e1')).toEqual([])
  })
})

// Le composant n'a pas de test de rendu dans ce dépôt : on verrouille la source,
// comme seance-courte.test.js. Ce sont des garanties, pas du style — une épreuve
// qui laisse passer un indice ou qui fait monter un palier ne mesure plus rien.
describe('l’épreuve ne laisse aucune aide et ne fait rien monter', () => {
  const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const QUIZ = readFileSync(resolve(racine, 'src/components/TuteurQuiz.vue'), 'utf8')
  const VUE = readFileSync(resolve(racine, 'src/views/ParentMiapoView.vue'), 'utf8')

  it('le bouton d’indice et le cours sont retirés', () => {
    expect(QUIZ).toContain('<button v-if="!epreuve" type="button" class="tq-info"')
    expect(QUIZ).toContain('v-if="showCourse && !epreuve"')
  })

  it('le chat « Approfondir » est retiré', () => {
    expect(QUIZ).toContain('v-if="revealed && !firstTry && !epreuve" class="tq-deepen"')
  })

  it('un seul essai : le deuxième s’accompagne d’un indice', () => {
    expect(QUIZ).toContain('attempts.value >= 2 || props.epreuve')
  })

  it('le score d’épreuve ne touche NI la maîtrise NI le palier', () => {
    const sortie = QUIZ.indexOf('if (props.epreuve) {\n    if (props.studentId) {')
    const record = QUIZ.indexOf('tuteur.recordResult(')
    expect(sortie).toBeGreaterThan(-1)
    expect(record).toBeGreaterThan(sortie) // la sortie anticipée précède la progression
    expect(QUIZ).toContain('enregistrerEpreuve(props.studentId, {')
  })

  it('l’apprenant ne choisit ni le chapitre ni son niveau de départ', () => {
    expect(VUE).toContain('goRevise(reviseMatiere.value, \'\', { epreuve: true })')
    expect(VUE).toMatch(/if \(epreuve\) \{\s*\n\s*positionnementAFaire\.value = false\s*\n\s*chapitreADemander\.value = false/)
  })
})

// La mesure ne vaut que si elle survit au téléphone qui la produit : un cache
// vidé effaçait la seule preuve d'apprentissage que MIAPO sache produire.
describe('le registre suit l’apprenant d’un appareil à l’autre', () => {
  const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  beforeEach(() => localStorage.clear())

  it('le registre rapatrié remplace le local', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 3, 10))
    remplacerEpreuves('e1', [{ at: '2026-09-01T10:00:00.000Z', matiere: 'Français', reussi: 9, total: 10 }])
    const h = historiqueEpreuves('e1')
    expect(h).toHaveLength(1)
    expect(h[0].matiere).toBe('Français')
  })

  it('une liste absurde ne casse rien', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 3, 10))
    remplacerEpreuves('e1', null)
    remplacerEpreuves('e1', 'nawak')
    expect(historiqueEpreuves('e1')).toHaveLength(1)
  })

  it('l’épreuve terminée est poussée dans le nuage', () => {
    const quiz = readFileSync(resolve(racine, 'src/components/TuteurQuiz.vue'), 'utf8')
    const ecrit = quiz.indexOf('enregistrerEpreuve(props.studentId, {')
    const pousse = quiz.indexOf('tuteur.pousserEpreuves(props.studentId)')
    expect(ecrit).toBeGreaterThan(-1)
    expect(pousse).toBeGreaterThan(ecrit) // le local d'abord : hors ligne, la mesure existe quand même
  })

  it('le compte enfant a le droit d’écrire ses épreuves', () => {
    const regles = readFileSync(resolve(racine, 'firestore.rules'), 'utf8')
    expect(regles).toContain("docId == 'epreuves_' + monEnfantId()")
  })

  it('et tout part avec le profil, jusque dans le nuage', () => {
    const store = readFileSync(resolve(racine, 'src/stores/enfantsAutonomes.js'), 'utf8')
    expect(store).toContain('`epreuves_${id}`')
  })
})

describe('rythme mensuel', () => {
  beforeEach(() => localStorage.clear())

  it('la première épreuve d’une matière est toujours ouverte', () => {
    expect(epreuveOuverte('e1', 'Mathématiques').ouverte).toBe(true)
  })

  it('refermée le lendemain, rouverte après trente jours', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 7, 10))
    const t0 = Date.now()
    expect(epreuveOuverte('e1', 'Mathématiques', t0 + JOUR).ouverte).toBe(false)
    expect(epreuveOuverte('e1', 'Mathématiques', t0 + JOUR).joursRestants).toBe(29)
    expect(epreuveOuverte('e1', 'Mathématiques', t0 + 30 * JOUR).ouverte).toBe(true)
  })

  it('le rythme est par matière : passer en français ne referme pas les maths', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 7, 10))
    expect(epreuveOuverte('e1', 'Français').ouverte).toBe(true)
  })
})

describe('progression', () => {
  beforeEach(() => localStorage.clear())

  it('ne dit rien sur une seule épreuve : un point n’est pas une tendance', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 5, 10))
    expect(progressionEpreuves('e1', 'Mathématiques')).toBeNull()
  })

  it('compare la dernière à la précédente, en points de pourcentage', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 5, 10))
    enregistrerEpreuve('e1', epreuve('Mathématiques', 8, 10))
    const p = progressionEpreuves('e1', 'Mathématiques')
    expect(p).toEqual({ dernier: 80, precedent: 50, ecart: 30 })
  })

  it('ne mélange pas les matières', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 5, 10))
    enregistrerEpreuve('e1', epreuve('Français', 9, 10))
    expect(progressionEpreuves('e1', 'Mathématiques')).toBeNull()
  })
})

describe('travaillé avec MIAPO contre pas encore travaillé', () => {
  beforeEach(() => localStorage.clear())

  it('se tait tant qu’un des deux groupes est trop maigre', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 8, 10, 4))
    enregistrerEpreuve('e1', epreuve('Français', 7, 10, 3))
    enregistrerEpreuve('e1', epreuve('Histoire', 4, 10, 0))
    expect(comparaisonTravaillees('e1')).toBeNull()
  })

  it('agrège les questions, pas les moyennes de moyennes', () => {
    enregistrerEpreuve('e1', epreuve('Mathématiques', 8, 10, 4))
    enregistrerEpreuve('e1', epreuve('Français', 7, 10, 3))
    enregistrerEpreuve('e1', epreuve('Histoire', 4, 10, 0))
    enregistrerEpreuve('e1', epreuve('Géographie', 6, 10, 0))
    const c = comparaisonTravaillees('e1')
    expect(c.travaillees).toBe(75)
    expect(c.vierges).toBe(50)
    expect(c.ecart).toBe(25)
    expect(c.epreuves).toBe(4)
  })
})
