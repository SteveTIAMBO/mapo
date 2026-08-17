/**
 * Test — référentiels de programmes officiels.
 *
 * Le piège central n'est pas l'extraction, c'est le MILLÉSIME. Les réformes
 * s'appliquent classe par classe : le programme de mathématiques du cycle 4
 * entre en vigueur en 5e à la rentrée 2026, en 4e en 2027, en 3e en 2028.
 *
 * Servir le nouveau programme à une 4e en 2026 produirait un contenu
 * parfaitement crédible et pourtant hors programme — exactement le type
 * d'erreur qu'on ne repère jamais en testant vite.
 */
import { describe, it, expect } from 'vitest'
import { notionsOfficielles, notionsPourPrompt, sourceOfficielle, anneeScolaire } from '../utils/referentiel'

const en = (a, m = 9) => new Date(a, m, 15)

describe('Année scolaire — septembre ouvre l’année, pas janvier', () => {
  it('septembre 2026 → année 2026', () => {
    expect(anneeScolaire(new Date(2026, 8, 15))).toBe(2026)
  })

  it('mars 2027 → toujours l’année 2026', () => {
    // Un élève de 5e en mars 2027 suit le programme entré en vigueur en 2026.
    expect(anneeScolaire(new Date(2027, 2, 15))).toBe(2026)
  })
})

describe('Millésime — on ne sert QUE ce qui est applicable', () => {
  it('5e en 2026 : le nouveau programme s’applique', () => {
    const n = notionsOfficielles({ pays: 'FR', niveau: '5e', matiere: 'Mathématiques', date: en(2026) })
    expect(n.length).toBeGreaterThan(10)
    expect(n.map((x) => x.notion)).toContain('Nombres relatifs')
  })

  it('4e en 2026 : RIEN — le programme n’entre en vigueur qu’en 2027', () => {
    expect(notionsOfficielles({ pays: 'FR', niveau: '4e', matiere: 'Mathématiques', date: en(2026) })).toEqual([])
  })

  it('3e en 2026 : RIEN non plus — entrée en vigueur en 2028', () => {
    expect(notionsOfficielles({ pays: 'FR', niveau: '3e', matiere: 'Mathématiques', date: en(2026) })).toEqual([])
  })

  it('4e en 2027 : le programme devient applicable, sans rien changer au code', () => {
    const n = notionsOfficielles({ pays: 'FR', niveau: '4e', matiere: 'Mathématiques', date: en(2027) })
    expect(n.length).toBeGreaterThan(10)
    expect(n.map((x) => x.notion)).toContain('Racine carrée')
  })

  it('3e en 2028 : idem', () => {
    expect(notionsOfficielles({ pays: 'FR', niveau: '3e', matiere: 'Mathématiques', date: en(2028) }).length).toBeGreaterThan(10)
  })
})

describe('Absence de référentiel — un résultat vide est LÉGITIME', () => {
  it('un pays sans référentiel ne renvoie rien', () => {
    expect(notionsOfficielles({ pays: 'CM', niveau: '5e', matiere: 'Mathématiques', date: en(2026) })).toEqual([])
  })

  it('une matière sans référentiel ne renvoie rien', () => {
    // Mieux vaut pas de référentiel qu'un référentiel inventé : la génération
    // retombe alors sur son comportement actuel, sans faire de fausse promesse.
    expect(notionsOfficielles({ pays: 'FR', niveau: '5e', matiere: 'Français', date: en(2026) })).toEqual([])
  })

  it('une classe hors du cycle couvert ne renvoie rien', () => {
    expect(notionsOfficielles({ pays: 'FR', niveau: '6e', matiere: 'Mathématiques', date: en(2026) })).toEqual([])
  })
})

describe('Attribution — obligation de la Licence Ouverte', () => {
  it('la provenance accompagne toute notion servie', () => {
    const s = sourceOfficielle({ pays: 'FR', niveau: '5e', matiere: 'Mathématiques', date: en(2026) })
    expect(s.arrete).toMatch(/2026/)
    expect(s.bo).toMatch(/BO/)
    expect(s.url).toMatch(/^https:\/\/www\.education\.gouv\.fr\//)
    expect(s.attribution).toMatch(/ministère de l’Éducation nationale|ministère de l'Éducation nationale/)
  })

  it('pas de notion servie, pas de provenance affichée', () => {
    expect(sourceOfficielle({ pays: 'FR', niveau: '4e', matiere: 'Mathématiques', date: en(2026) })).toBeNull()
  })
})

describe('Mise en forme pour le prompt', () => {
  it('chaque ligne porte le domaine ET la notion', () => {
    const l = notionsPourPrompt({ pays: 'FR', niveau: '5e', matiere: 'Mathématiques', date: en(2026) })
    expect(l[0]).toContain(' — ')
    expect(l.some((x) => x.startsWith('Espace et géométrie'))).toBe(true)
  })
})
