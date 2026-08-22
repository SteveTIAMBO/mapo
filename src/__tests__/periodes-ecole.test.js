import { describe, it, expect } from 'vitest'
import {
  DECOUPAGES,
  periodesParDefaut,
  listePeriodes,
  listeSequences,
  listeSignPeriodes,
  libellePeriode,
  ajouterPeriode,
  retirerDernierePeriode,
} from '../utils/periodes'

/**
 * Découpage de l'année scolaire.
 *
 * Le défaut d'origine : l'onboarding n'écrivait jamais `periods`, et la section
 * « Périodes scolaires » n'avait aucun bouton d'ajout. Une vraie école ne pouvait
 * donc PAS saisir son calendrier — seule la démo en avait, parce qu'il est écrit
 * en dur dans le jeu de démonstration. Le découpage était en prime figé à trois
 * trimestres et six séquences.
 */

describe('périodes par défaut', () => {
  it('trois périodes au trimestre, deux au semestre', () => {
    expect(Object.keys(periodesParDefaut({ decoupage: 'trimestres' }))).toHaveLength(3)
    expect(Object.keys(periodesParDefaut({ decoupage: 'semestres' }))).toHaveLength(2)
    expect(DECOUPAGES.semestres).toBe(2)
  })

  it('couvre l’année scolaire déclarée, de septembre à juin', () => {
    const p = periodesParDefaut({ academicYear: '2025-2026' })
    expect(p.T1.start.startsWith('2025-09')).toBe(true)
    expect(p.T3.end).toBe('2026-06-30')
  })

  it('les périodes ne se chevauchent pas et restent dans l’ordre', () => {
    const p = periodesParDefaut({ academicYear: '2025-2026' })
    expect(p.T1.end < p.T2.start).toBe(true)
    expect(p.T2.end < p.T3.start).toBe(true)
  })

  it('pas de séquences quand l’école évalue une fois par période', () => {
    // Le primaire APC note une fois par trimestre : lui imposer deux séquences
    // afficherait deux colonnes vides sur chaque bulletin.
    const p = periodesParDefaut({ evaluationType: '1_evaluation' })
    expect(Object.keys(p.T1.sequences)).toHaveLength(0)
  })

  it('numérote les séquences en continu d’une période à l’autre', () => {
    const p = periodesParDefaut({ evaluationType: '2_sequences' })
    expect(Object.keys(p.T1.sequences)).toEqual(['S1', 'S2'])
    expect(Object.keys(p.T3.sequences)).toEqual(['S5', 'S6'])
  })

  it('un conseil de classe est proposé après la fin de chaque période', () => {
    const p = periodesParDefaut({ academicYear: '2025-2026' })
    expect(p.T1.conseil > p.T1.end).toBe(true)
  })
})

describe('libellés : le mot suit le découpage', () => {
  it('trimestre ou semestre, jamais le code brut', () => {
    expect(libellePeriode('T1', 'trimestres')).toBe('1er trimestre')
    expect(libellePeriode('T2', 'semestres')).toBe('2ème semestre')
  })

  it('passe par la traduction quand elle est fournie', () => {
    const t = (cle, params) => (cle === 'periode.semestre' ? `Semester ${params.n}` : cle)
    expect(libellePeriode('T1', 'semestres', t)).toBe('Semester 1')
  })

  it('⚠️ les CODES ne changent pas au semestre : les notes déjà saisies survivent', () => {
    // Renommer T1 en SEM1 invaliderait toutes les clés `classe_matiere_periode`.
    // Un changement de découpage ne doit jamais effacer des notes en silence.
    const p = periodesParDefaut({ decoupage: 'semestres' })
    expect(Object.keys(p)).toEqual(['T1', 'T2'])
  })
})

describe('listes dérivées des paramètres de l’école', () => {
  const ecole = {
    decoupage: 'semestres',
    evaluationType: '2_sequences',
    periods: {
      T1: { start: '', end: '', sequences: { S1: {}, S2: {} } },
      T2: { start: '', end: '', sequences: { S3: {}, S4: {} } },
    },
  }

  it('les périodes suivent ce que l’école a déclaré', () => {
    expect(listePeriodes(ecole).map((p) => p.value)).toEqual(['T1', 'T2'])
    expect(listePeriodes(ecole)[0].label).toBe('1er semestre')
  })

  it('chaque séquence sait à quelle période elle appartient', () => {
    expect(listeSequences(ecole).map((s) => s.value)).toEqual(['S1', 'S2', 'S3', 'S4'])
    expect(listeSequences(ecole)[2].trimester).toBe('T2')
  })

  it('les périodes signables suivent l’ordre du calendrier, bilan annuel à la fin', () => {
    expect(listeSignPeriodes(ecole).map((p) => p.value)).toEqual(['S1', 'S2', 'T1', 'S3', 'S4', 'T2', 'annual'])
  })

  it('une école sans période déclarée reçoit un repli utilisable, pas une liste vide', () => {
    // Une liste déroulante vide sur l'écran de notes est un cul-de-sac muet.
    expect(listePeriodes({}).length).toBe(3)
    expect(listePeriodes({ periods: {} }).length).toBe(3)
  })

  it('trie par rang, pas par ordre alphabétique', () => {
    const dix = { periods: {} }
    for (let i = 1; i <= 10; i++) dix.periods['T' + i] = { sequences: {} }
    expect(listePeriodes(dix).map((p) => p.value).slice(0, 3)).toEqual(['T1', 'T2', 'T3'])
  })
})

describe('ajouter et retirer une période', () => {
  it('ajoute à la fin, avec des séquences numérotées à la suite', () => {
    const p = periodesParDefaut({ decoupage: 'semestres' })
    const code = ajouterPeriode(p, { evaluationType: '2_sequences' })
    expect(code).toBe('T3')
    expect(Object.keys(p.T3.sequences)).toEqual(['S5', 'S6'])
  })

  it('n’ajoute pas de séquence si l’école n’en utilise pas', () => {
    const p = periodesParDefaut({ evaluationType: '1_evaluation' })
    ajouterPeriode(p, { evaluationType: '1_evaluation' })
    expect(Object.keys(p.T4.sequences)).toHaveLength(0)
  })

  it('retire la DERNIÈRE période, jamais celle du milieu', () => {
    // Supprimer T2 laisserait un trou : les notes de T3 se retrouveraient
    // rattachées à une période qui n'a plus de sens.
    const p = periodesParDefaut({})
    expect(retirerDernierePeriode(p)).toBe('T3')
    expect(Object.keys(p)).toEqual(['T1', 'T2'])
  })

  it('refuse de retirer la dernière période restante', () => {
    const p = { T1: { sequences: {} } }
    expect(retirerDernierePeriode(p)).toBeNull()
    expect(Object.keys(p)).toEqual(['T1'])
  })
})
