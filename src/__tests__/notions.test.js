/**
 * Suivi par notion — écarts E2 et E5 du référentiel.
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *  1. qu'une notion ratée REVIENNE (E5 : rien ne le garantissait) ;
 *  2. qu'un tag inventé par le modèle n'entre JAMAIS dans le suivi — ranger un
 *     résultat sous une notion qui n'existe pas au programme est pire que ne
 *     rien ranger ;
 *  3. qu'on se taise quand le programme est inconnu, au lieu de proposer au
 *     hasard.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  etatNotions, enregistrerResultatsNotions, notionsAReprendre, notionsJamaisVues,
  couvertureNotions, suiviNotions, remplacerNotions, effacerNotions,
} from '../utils/notions'
import { validerNotions } from '../stores/tuteur'

const PROG = [
  'Nombres et calculs — Fractions',
  'Nombres et calculs — Pourcentages',
  'Espace et géométrie — Théorème de Pythagore',
]

describe('enregistrement', () => {
  beforeEach(() => localStorage.clear())

  it('compte les passages et les réussites, par matière', () => {
    enregistrerResultatsNotions('e1', 'auto-Maths', [
      { notion: PROG[0], juste: true },
      { notion: PROG[0], juste: false },
      { notion: PROG[1], juste: true },
    ])
    const m = etatNotions('e1', 'auto-Maths')
    expect(m[PROG[0]].vues).toBe(2)
    expect(m[PROG[0]].justes).toBe(1)
    expect(m[PROG[1]].vues).toBe(1)
    expect(etatNotions('e1', 'auto-Français')).toEqual({})
  })

  it('ignore les questions sans notion : mieux vaut ne rien savoir que mal ranger', () => {
    enregistrerResultatsNotions('e1', 'auto-Maths', [
      { notion: '', juste: false },
      { notion: '   ', juste: true },
    ])
    expect(etatNotions('e1', 'auto-Maths')).toEqual({})
  })

  it('cloisonne les apprenants et s’efface avec le profil', () => {
    enregistrerResultatsNotions('e1', 'auto-Maths', [{ notion: PROG[0], juste: true }])
    expect(etatNotions('e2', 'auto-Maths')).toEqual({})
    effacerNotions('e1')
    expect(etatNotions('e1', 'auto-Maths')).toEqual({})
  })

  it('survit à un cache illisible', () => {
    localStorage.setItem('mapo_b2c_notions_e1', 'pas du json')
    expect(etatNotions('e1', 'auto-Maths')).toEqual({})
  })
})

describe('une notion ratée revient (E5)', () => {
  beforeEach(() => localStorage.clear())

  it('la dernière séance ratée suffit à la faire remonter', () => {
    enregistrerResultatsNotions('e1', 'auto-Maths', [
      { notion: PROG[0], juste: true },
      { notion: PROG[1], juste: false },
    ])
    expect(notionsAReprendre('e1', 'auto-Maths')).toEqual([PROG[1]])
  })

  it('une notion réussie plusieurs fois ne revient pas', () => {
    for (let i = 0; i < 3; i++) {
      enregistrerResultatsNotions('e1', 'auto-Maths', [{ notion: PROG[0], juste: true }])
    }
    expect(notionsAReprendre('e1', 'auto-Maths')).toEqual([])
  })

  it('une notion durablement faible revient, même sans échec tout récent', () => {
    // Trois passages, une seule réussite : sous le seuil, donc à reprendre.
    enregistrerResultatsNotions('e1', 'auto-Maths', [{ notion: PROG[2], juste: false }])
    enregistrerResultatsNotions('e1', 'auto-Maths', [{ notion: PROG[2], juste: false }])
    enregistrerResultatsNotions('e1', 'auto-Maths', [{ notion: PROG[2], juste: true }])
    expect(notionsAReprendre('e1', 'auto-Maths')).toContain(PROG[2])
  })

  it('la liste est bornée', () => {
    for (let i = 0; i < 12; i++) {
      enregistrerResultatsNotions('e1', 'auto-Maths', [{ notion: 'Notion ' + i, juste: false }])
    }
    expect(notionsAReprendre('e1', 'auto-Maths')).toHaveLength(6)
    expect(notionsAReprendre('e1', 'auto-Maths', { max: 2 })).toHaveLength(2)
  })
})

describe('ce qui n’a jamais été touché', () => {
  beforeEach(() => localStorage.clear())

  it('rend les notions du programme jamais rencontrées', () => {
    enregistrerResultatsNotions('e1', 'auto-Maths', [{ notion: PROG[0], juste: true }])
    expect(notionsJamaisVues('e1', 'auto-Maths', PROG)).toEqual([PROG[1], PROG[2]])
  })

  // Le cas le plus fréquent : la plupart des couples (pays, classe, matière)
  // n'ont AUCUN programme officiel dans le dépôt. Se taire est la bonne réponse.
  it('se tait quand le programme est inconnu', () => {
    expect(notionsJamaisVues('e1', 'auto-Maths', [])).toEqual([])
    expect(notionsJamaisVues('e1', 'auto-Maths', null)).toEqual([])
    expect(couvertureNotions('e1', 'auto-Maths', [])).toBeNull()
  })

  it('la couverture compte le couvert, le fragile et le jamais vu', () => {
    enregistrerResultatsNotions('e1', 'auto-Maths', [
      { notion: PROG[0], juste: true },
      { notion: PROG[1], juste: false },
    ])
    expect(couvertureNotions('e1', 'auto-Maths', PROG)).toEqual({
      total: 3, vues: 2, fragiles: 1, jamais: 1,
    })
  })
})

describe('le tag du modèle est vérifié, jamais cru sur parole', () => {
  it('garde une notion de la liste, malgré casse et accents', () => {
    const r = validerNotions([{ q: 'x', notion: 'nombres et calculs - fractions' }], PROG)
    expect(r[0].notion).toBe(PROG[0])
  })

  it('jette une notion inventée', () => {
    const r = validerNotions([{ q: 'x', notion: 'Trigonométrie sphérique' }], PROG)
    expect(r[0].notion).toBe('')
  })

  it('jette tout quand aucun programme n’a été envoyé', () => {
    const r = validerNotions([{ q: 'x', notion: 'Fractions' }], [])
    expect(r[0].notion).toBe('')
  })

  it('ne touche à rien d’autre dans la question', () => {
    const q = { q: 'x', choices: ['a', 'b', 'c', 'd'], answer: 2, hint: 'h', explanation: 'e', notion: 'inventée' }
    expect(validerNotions([q], PROG)[0]).toEqual({ ...q, notion: '' })
  })
})

describe('le suivi part dans le nuage et revient', () => {
  const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  beforeEach(() => localStorage.clear())

  it('le suivi complet est lisible et remplaçable', () => {
    enregistrerResultatsNotions('e1', 'auto-Maths', [{ notion: PROG[0], juste: true }])
    expect(suiviNotions('e1')['auto-Maths'][PROG[0]].vues).toBe(1)
    remplacerNotions('e1', { 'auto-Français': { 'X — Y': { vues: 3, justes: 3, dernier: '', rateLe: '' } } })
    expect(etatNotions('e1', 'auto-Maths')).toEqual({})
    expect(etatNotions('e1', 'auto-Français')['X — Y'].vues).toBe(3)
  })

  it('une donnée absurde ne remplace rien', () => {
    enregistrerResultatsNotions('e1', 'auto-Maths', [{ notion: PROG[0], juste: true }])
    remplacerNotions('e1', null)
    remplacerNotions('e1', ['liste'])
    expect(etatNotions('e1', 'auto-Maths')[PROG[0]].vues).toBe(1)
  })

  it('la séance terminée pousse le suivi, et le profil supprimé l’emporte', () => {
    const quiz = readFileSync(resolve(racine, 'src/components/TuteurQuiz.vue'), 'utf8')
    expect(quiz).toContain('enregistrerResultatsNotions(props.studentId, subjectId.value, resultats)')
    expect(quiz).toContain('tuteur.pousserNotions(props.studentId)')
    const store = readFileSync(resolve(racine, 'src/stores/enfantsAutonomes.js'), 'utf8')
    expect(store).toContain('effacerNotions(id)')
    expect(store).toContain('`notions_${id}`')
    const regles = readFileSync(resolve(racine, 'firestore.rules'), 'utf8')
    expect(regles).toContain("docId == 'notions_' + monEnfantId()")
  })

  it('les notions à reprendre partent bien au générateur', () => {
    const tuteur = readFileSync(resolve(racine, 'src/stores/tuteur.js'), 'utf8')
    expect(tuteur).toContain('prioritaires,')
    const php = readFileSync(resolve(racine, 'server/mapo-ia.php'), 'utf8')
    expect(php).toContain("d['prioritaires']")
    expect(php).toContain('À reprendre')
  })
})
