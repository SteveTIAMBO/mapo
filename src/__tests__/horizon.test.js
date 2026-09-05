/**
 * Horizon de restitution — écart E1 du référentiel.
 *
 * Ce que ces tests protègent : qu'un pas de révision ne tombe jamais APRÈS
 * l'examen (réviser après coup ne sert personne), qu'un examen officiel
 * concerne bien toutes les matières, et qu'en l'absence d'échéance on retombe
 * proprement sur le forfait au lieu de calculer sur du vide.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { horizonJours, pasRevision } from '../utils/horizon'
import { enregistrerResultatsNotions, etatNotions } from '../utils/notions'

const JOUR = 86400000
const dans = (j) => new Date(Date.now() + j * JOUR).toISOString().slice(0, 10)
const poser = (sid, examens) => localStorage.setItem('mapo_b2c_exams_' + sid, JSON.stringify(examens))

describe('trouver l’échéance', () => {
  beforeEach(() => localStorage.clear())

  it('retient l’examen de la matière', () => {
    poser('e1', [{ label: 'Contrôle', date: dans(10), matiere: 'Mathématiques' }])
    expect(horizonJours('e1', 'Mathématiques')).toBe(10)
  })

  it('ignore l’examen d’une autre matière', () => {
    poser('e1', [{ label: 'Contrôle', date: dans(10), matiere: 'Français' }])
    expect(horizonJours('e1', 'Mathématiques')).toBeNull()
  })

  it('un examen officiel concerne toutes les matières', () => {
    // Le brevet ne se révise pas qu'en maths, même s'il a été saisi là.
    poser('e1', [{ label: 'Brevet', date: dans(40), official: true, matiere: 'Français' }])
    expect(horizonJours('e1', 'Mathématiques')).toBe(40)
  })

  it('prend la plus PROCHE des échéances à venir', () => {
    poser('e1', [
      { label: 'Bac', date: dans(60), official: true },
      { label: 'Contrôle', date: dans(5), matiere: 'Mathématiques' },
    ])
    expect(horizonJours('e1', 'Mathématiques')).toBe(5)
  })

  it('ignore une échéance passée', () => {
    poser('e1', [{ label: 'Vieux contrôle', date: dans(-3), matiere: 'Mathématiques' }])
    expect(horizonJours('e1', 'Mathématiques')).toBeNull()
  })

  it('ne casse pas sur un cache absent ou illisible', () => {
    expect(horizonJours('e1', 'Mathématiques')).toBeNull()
    localStorage.setItem('mapo_b2c_exams_e1', 'pas du json')
    expect(horizonJours('e1', 'Mathématiques')).toBeNull()
    expect(horizonJours('', 'Mathématiques')).toBeNull()
  })
})

describe('calculer le pas', () => {
  it('vise environ 20 % des jours restants (Cepeda 2008)', () => {
    expect(pasRevision(30)).toBe(6)
    expect(pasRevision(50)).toBe(10)
  })

  it('jamais moins d’un jour, jamais au-delà de l’examen', () => {
    expect(pasRevision(2)).toBe(1)
    expect(pasRevision(1)).toBe(1)
  })

  it('sans échéance connue, le forfait s’applique', () => {
    expect(pasRevision(null)).toBe(7)
    expect(pasRevision(0)).toBe(7)
    expect(pasRevision(undefined, 3)).toBe(3)
  })
})

describe('l’échéance pilote vraiment la reprise', () => {
  beforeEach(() => localStorage.clear())

  it('contrôle proche : la notion réussie revient plus vite que le forfait', () => {
    enregistrerResultatsNotions('e1', 'auto-Maths', [{ notion: 'A — B', juste: true }], { horizon: 10 })
    const due = etatNotions('e1', 'auto-Maths')['A — B'].due
    expect(Math.round((Date.parse(due) - Date.now()) / JOUR)).toBe(2)
  })

  it('une notion ratée revient demain, même avec un examen lointain', () => {
    // L'horizon dit quand il faudra savoir, pas quand il faut réparer.
    enregistrerResultatsNotions('e1', 'auto-Maths', [{ notion: 'A — B', juste: false }], { horizon: 200 })
    const due = etatNotions('e1', 'auto-Maths')['A — B'].due
    expect(Math.round((Date.parse(due) - Date.now()) / JOUR)).toBe(1)
  })
})
