/**
 * Exemple travaillé avant la pratique — écart E8 du référentiel.
 *
 * Un novice qui découvre une notion entrait directement en récupération. Sans
 * modèle de résolution, la question ne teste rien : elle sature la mémoire de
 * travail (Sweller et al. 2019).
 *
 * Trois choses à ne pas perdre, et c'est ce que ces tests verrouillent :
 *  1. l'exemple ne s'affiche QUE sur une notion jamais rencontrée — l'effet
 *     s'inverse chez qui maîtrise déjà (Kalyuga et al. 2003) ;
 *  2. il ne coûte AUCUN appel supplémentaire : on prélève une question de la
 *     séance et on la montre résolue ;
 *  3. la question prélevée SORT du lot — la reposer juste après mesurerait la
 *     mémoire des trois dernières secondes, pas un apprentissage.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const QUIZ = readFileSync(resolve(RACINE, 'src/components/TuteurQuiz.vue'), 'utf8')
const PRELEVE = (QUIZ.match(/function preleverExemple\(\)[\s\S]*?\n}/) || [''])[0]

describe('⭐⭐ seulement pour une notion jamais rencontrée', () => {
  it('la décision se prend sur le suivi par notion de CET apprenant', () => {
    expect(PRELEVE).toContain('etatNotions(props.studentId, subjectId.value)')
    expect(PRELEVE).toContain('q.notion && !connues[q.notion]')
  })

  it('une question sans notion ne peut pas servir d’exemple', () => {
    // Sans programme officiel, rien n'est tagué : on ne devine pas ce qui est
    // nouveau, et on se contente de la séance normale.
    expect(PRELEVE).toMatch(/q\.notion &&/)
  })
})

describe('⭐⭐ l’exemple ne coûte rien et ne fausse rien', () => {
  it('aucun appel au modèle : la question est prélevée de la séance', () => {
    expect(PRELEVE).toContain('exemple.value = questions.value[i]')
    expect(PRELEVE).not.toMatch(/generateQuiz|chatTuteur|fetch\(/)
  })

  it('la question montrée est RETIRÉE du lot', () => {
    expect(PRELEVE).toContain('questions.value = questions.value.filter((_, k) => k !== i)')
  })

  it('une séance courte n’y laisse pas une question', () => {
    expect(PRELEVE).toContain('questions.value.length < 5')
  })

  it('jamais pendant une épreuve : elle mesure, elle n’enseigne pas', () => {
    expect(PRELEVE).toContain('props.epreuve')
  })
})

describe('⭐ l’écran s’insère avant la pratique', () => {
  it('le mode exemple précède la prédiction et le quiz', () => {
    const lancer = (QUIZ.match(/function lancerSeance\(\)[\s\S]*?\n}/) || [''])[0]
    expect(lancer).toContain('preleverExemple()')
    expect(lancer).toMatch(/if \(exemple\.value\) \{ mode\.value = 'exemple'; return \}/)
  })

  it('et rend la main au parcours normal une fois lu', () => {
    const apres = (QUIZ.match(/function apresExemple\(\)[\s\S]*?\n}/) || [''])[0]
    expect(apres).toContain("demandePrediction.value) ? 'predire' : 'quiz'")
  })

  it('l’écran montre la réponse ET son explication', () => {
    expect(QUIZ).toContain('exemple.choices[exemple.answer]')
    expect(QUIZ).toContain('exemple.explanation')
  })
})
