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
import { notionsOfficielles, notionsPourPrompt, sourceOfficielle, anneeScolaire, granulariteProgramme } from '../utils/referentiel'

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

  it('une classe hors des cycles couverts ne renvoie rien', () => {
    // Cycles 3 et 4 seulement pour l'instant : le lycée n'est pas couvert.
    expect(notionsOfficielles({ pays: 'FR', niveau: 'Terminale', matiere: 'Mathématiques', date: en(2026) })).toEqual([])
    expect(notionsOfficielles({ pays: 'FR', niveau: '2nde', matiere: 'Mathématiques', date: en(2026) })).toEqual([])
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

describe('Cycle 3 — la 6e est couverte, et le bon référentiel est choisi', () => {
  it('6e en 2026 : notions du cycle 3', () => {
    const n = notionsOfficielles({ pays: 'FR', niveau: '6e', matiere: 'Mathématiques', date: en(2026) })
    expect(n.map((x) => x.notion)).toContain('Les fractions')
  })

  it('la 6e cite l’arrêté du CYCLE 3, pas celui du cycle 4', () => {
    // Deux référentiels couvrent la même matière : se tromper de cycle
    // afficherait une provenance fausse tout en paraissant sourcé.
    expect(sourceOfficielle({ pays: 'FR', niveau: '6e', matiere: 'Mathématiques', date: en(2026) }).arrete).toMatch(/2025/)
    expect(sourceOfficielle({ pays: 'FR', niveau: '5e', matiere: 'Mathématiques', date: en(2026) }).arrete).toMatch(/2026/)
  })

  it('CM2 : applicable seulement à partir de 2026', () => {
    expect(notionsOfficielles({ pays: 'FR', niveau: 'CM2', matiere: 'Mathématiques', date: en(2025) })).toEqual([])
    expect(notionsOfficielles({ pays: 'FR', niveau: 'CM2', matiere: 'Mathématiques', date: en(2026) }).length).toBeGreaterThan(10)
  })
})

describe('Histoire-géographie — programme NON réformé, applicable aux trois classes', () => {
  it('5e, 4e et 3e sont couvertes dès aujourd’hui', () => {
    // Contrairement aux maths, ce programme n'est pas en cours de refonte :
    // il s'applique depuis 2020 aux trois niveaux, sans échelonnement.
    for (const c of ['5e', '4e', '3e']) {
      expect(notionsOfficielles({ pays: 'FR', niveau: c, matiere: 'Histoire-Géographie', date: en(2026) }).length).toBe(6)
    }
  })

  it('les thèmes sont bien ceux de la classe, pas du cycle', () => {
    const cinq = notionsOfficielles({ pays: 'FR', niveau: '5e', matiere: 'Histoire-Géographie', date: en(2026) })
    const trois = notionsOfficielles({ pays: 'FR', niveau: '3e', matiere: 'Histoire-Géographie', date: en(2026) })
    expect(cinq.some((n) => /islam/i.test(n.notion))).toBe(true)
    expect(trois.some((n) => /1914|guerres totales/i.test(n.notion))).toBe(true)
    expect(cinq.map((n) => n.notion)).not.toEqual(trois.map((n) => n.notion))
  })

  it('la provenance cite l’arrêté de 2015 modifié, pas celui des maths', () => {
    expect(sourceOfficielle({ pays: 'FR', niveau: '5e', matiere: 'Histoire-Géographie', date: en(2026) }).arrete).toMatch(/2015/)
  })
})

describe('Granularité — ne pas attribuer à une classe ce que le texte dit du cycle', () => {
  it('les maths et l’histoire-géo sont définies par CLASSE', () => {
    expect(granulariteProgramme({ pays: 'FR', niveau: '5e', matiere: 'Mathématiques' })).toBe('classe')
    expect(granulariteProgramme({ pays: 'FR', niveau: '5e', matiere: 'Histoire-Géographie' })).toBe('classe')
  })

  it('la physique-chimie est définie pour le CYCLE', () => {
    // Le programme officiel laisse la répartition sur les trois années à
    // l'établissement : annoncer « au programme de 5e » serait inventer.
    expect(granulariteProgramme({ pays: 'FR', niveau: '5e', matiere: 'Physique-Chimie' })).toBe('cycle')
  })

  it('ses quatre thèmes sont proposés aux trois classes', () => {
    for (const c of ['5e', '4e', '3e']) {
      expect(notionsOfficielles({ pays: 'FR', niveau: c, matiere: 'Physique-Chimie', date: en(2026) })).toHaveLength(4)
    }
  })
})
