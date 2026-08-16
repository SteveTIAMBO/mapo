/**
 * Test — aucune question n'atteint un élève sans vérification.
 *
 * Erreur fondatrice (prod, 16/08) : « quadrilatère aux côtés opposés
 * parallèles et de même longueur, SANS avoir forcément quatre angles droits »
 * → réponse marquée « rectangle ». Le modèle SAIT ce qu'est un
 * parallélogramme ; il a lâché la contrainte négative de son propre énoncé.
 *
 * Ce n'était pas un incident isolé : la banque de questions est PARTAGÉE, donc
 * une question fausse est resservie indéfiniment à tous les élèves suivants.
 *
 * Le contrôle vit CÔTÉ SERVEUR (server/mapo-ia.php). On ne peut pas exécuter
 * PHP ici, mais on peut : rejouer la logique déterministe, et exiger que le
 * serveur contienne bien les garanties qu'on annonce.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const IA = readFileSync(resolve(RACINE, 'server/mapo-ia.php'), 'utf8')

/** Rejoue mapo_quiz_forme_ok() : contrôles mécaniques, sans appel de modèle. */
function formeOk(q) {
  if (!q || typeof q !== 'object') return false
  const enonce = String(q.q || '').trim()
  if (enonce.length < 10) return false
  if (!Array.isArray(q.choices) || q.choices.length !== 4) return false
  const vus = new Set()
  for (const c of q.choices) {
    const t = String(c || '').trim()
    if (!t) return false
    if (vus.has(t.toLowerCase())) return false
    vus.add(t.toLowerCase())
  }
  const a = Number(q.answer)
  return Number.isInteger(a) && a >= 0 && a <= 3
}

const BONNE = {
  q: 'Quel est le périmètre d’un carré de côté 5 cm ?',
  choices: ['10 cm', '20 cm', '25 cm', '15 cm'], answer: 1,
}

describe('Contrôles mécaniques — ce qui se voit sans rien savoir', () => {
  it('une question saine passe', () => {
    expect(formeOk(BONNE)).toBe(true)
  })

  it('deux propositions identiques : rejet', () => {
    // Si la bonne réponse figure deux fois, l'élève a raison en cliquant sur
    // celle qu'on compte comme fausse. La question est insoluble.
    expect(formeOk({ ...BONNE, choices: ['20 cm', '20 cm', '25 cm', '15 cm'] })).toBe(false)
  })

  it('un nombre de propositions différent de 4 : rejet', () => {
    expect(formeOk({ ...BONNE, choices: ['10 cm', '20 cm', '25 cm'] })).toBe(false)
  })

  it('un index de réponse hors bornes : rejet', () => {
    expect(formeOk({ ...BONNE, answer: 4 })).toBe(false)
    expect(formeOk({ ...BONNE, answer: -1 })).toBe(false)
  })

  it('une proposition vide : rejet', () => {
    expect(formeOk({ ...BONNE, choices: ['10 cm', '', '25 cm', '15 cm'] })).toBe(false)
  })

  it('un énoncé absent ou trop court : rejet', () => {
    expect(formeOk({ ...BONNE, q: '' })).toBe(false)
    expect(formeOk({ ...BONNE, q: 'Et ?' })).toBe(false)
  })
})

describe('Le serveur applique bien le solveur aveugle', () => {
  it('la vérification existe et s’applique au quiz', () => {
    expect(IA).toMatch(/function mapo_quiz_valider/)
    expect(IA).toMatch(/if \(\$task === 'tutor_quiz'\)/)
  })

  it('le vérificateur ne reçoit JAMAIS la réponse marquée', () => {
    // C'est tout l'intérêt : un modèle qui se relit est juge et partie ; un
    // solveur qui ignore ce qu'il doit confirmer est un vrai contrôle.
    const bloc = IA.slice(IA.indexOf('function mapo_quiz_solveur_aveugle'))
      .slice(0, IA.slice(IA.indexOf('function mapo_quiz_solveur_aveugle')).indexOf('\n}'))
    expect(bloc).not.toMatch(/\$q\['answer'\]/)
    expect(bloc).toMatch(/\$q\['choices'\]/)
  })

  it('une question n’est gardée QUE si le solveur retrouve la même réponse', () => {
    expect(IA).toMatch(/\$choix\[\$i\] === \(int\) \$q\['answer'\]/)
  })

  it('le solveur peut répondre « aucune ne convient »', () => {
    // Sans cette issue, il choisirait la « moins fausse » et validerait une
    // question dont aucune proposition n'est juste — exactement notre cas.
    expect(IA).toMatch(/AUCUNE proposition ne convient/)
  })

  it('vérificateur injoignable : on ne sert RIEN plutôt que du non vérifié', () => {
    expect(IA).toMatch(/return \[\[\], \$rejets \+ count\(\$saines\)\]/)
  })

  it('le tri est annoncé au client (vérifiées / rejetées)', () => {
    expect(IA).toMatch(/'verifies'/)
    expect(IA).toMatch(/'rejetes'/)
  })
})
