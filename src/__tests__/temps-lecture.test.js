/**
 * Test — temps de lecture accordé avant le décompte du quiz.
 *
 * Défaut signalé par Steve (09/08) : « en 10 secondes je n'ai même pas le temps
 * de lire la question ». Le minuteur démarrait à l'affichage, donc l'énoncé et
 * ses quatre propositions consommaient l'essentiel du temps imparti : on
 * mesurait la vitesse de lecture, pas la maîtrise.
 */
import { describe, it, expect } from 'vitest'
import { tempsLectureSecondes } from '../utils/tempsLecture'

describe('Temps de lecture — il suit la longueur réelle du texte', () => {
  it('une question longue laisse plus de temps qu’une question courte', () => {
    const court = tempsLectureSecondes('2 + 2 ?', ['3', '4', '5', '6'])
    const long = tempsLectureSecondes(
      'Identifie la phrase où le past continuous et le past simple se combinent correctement pour marquer une interruption.',
      [
        'While she was reading, the phone rang.',
        'While she read, the phone was ringing.',
        'She was reading when the phone was ringing.',
        'She read while the phone rang.',
      ],
    )
    expect(long).toBeGreaterThan(court)
  })

  it('le cas signalé par Steve : une question d’anglais réaliste dépasse largement 3 s', () => {
    const t = tempsLectureSecondes(
      'Choose the correct modal verb to express a strong logical deduction about a past impossibility:',
      ['He must have known', 'He can’t have known', 'He should have known', 'He might know'],
    )
    // Sans ce délai, ces ~200 caractères étaient lus SUR les 10 secondes de
    // réponse — d'où « je n'ai même pas le temps de lire ».
    expect(t).toBeGreaterThanOrEqual(8)
  })
})

describe('Temps de lecture — les bornes protègent des deux côtés', () => {
  it('jamais moins de 3 s, même sur une question minuscule', () => {
    expect(tempsLectureSecondes('Vrai ?', ['Oui', 'Non'])).toBe(3)
    expect(tempsLectureSecondes('', [])).toBe(3)
  })

  it('jamais plus de 10 s, même sur un texte démesuré', () => {
    expect(tempsLectureSecondes('A'.repeat(5000), ['B'.repeat(500)])).toBe(10)
  })

  it('ne plante pas sur des données incomplètes', () => {
    // L'IA renvoie parfois un choix vide ou nul : le minuteur ne doit pas être
    // ce qui casse le quiz.
    expect(tempsLectureSecondes(undefined, undefined)).toBe(3)
    expect(tempsLectureSecondes(null, [null, undefined, ''])).toBe(3)
    expect(Number.isFinite(tempsLectureSecondes('Question ?', [null, 'a']))).toBe(true)
  })
})
