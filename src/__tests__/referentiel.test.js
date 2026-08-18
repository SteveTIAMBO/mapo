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
    expect(notionsOfficielles({ pays: 'FR', niveau: '5e', matiere: 'Arts plastiques', date: en(2026) })).toEqual([])
  })

  it('une classe hors des cycles couverts ne renvoie rien', () => {
    // Le lycée général est couvert en maths, physique-chimie et SVT. Les autres
    // matières du lycée ne le sont pas, et la voie technologique non plus.
    expect(notionsOfficielles({ pays: 'FR', niveau: 'Terminale', matiere: 'Histoire-Géographie', date: en(2026) })).toEqual([])
    expect(notionsOfficielles({ pays: 'FR', niveau: 'Terminale STMG', matiere: 'Mathématiques', date: en(2026) })).toEqual([])
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

describe('SVT — trois thématiques de cycle', () => {
  it('les trois classes reçoivent les mêmes thématiques', () => {
    for (const c of ['5e', '4e', '3e']) {
      expect(notionsOfficielles({ pays: 'FR', niveau: c, matiere: 'SVT', date: en(2026) })).toHaveLength(3)
    }
  })

  it('définies au niveau du CYCLE, comme la physique-chimie', () => {
    expect(granulariteProgramme({ pays: 'FR', niveau: '4e', matiere: 'SVT' })).toBe('cycle')
  })

  it('les intitulés sont ceux du texte officiel', () => {
    const n = notionsOfficielles({ pays: 'FR', niveau: '5e', matiere: 'SVT', date: en(2026) }).map((x) => x.notion)
    expect(n).toContain('Le vivant et son évolution')
    expect(n).toContain('Le corps humain et la santé')
  })
})

describe('Technologie — le titre coupé en fin de ligne est recollé', () => {
  it('les quatre thématiques sont là, entières', () => {
    const n = notionsOfficielles({ pays: 'FR', niveau: '4e', matiere: 'Technologie', date: en(2026) })
    expect(n).toHaveLength(4)
    // Ce titre-là s'étalait sur deux lignes du PDF : une extraction naïve
    // le tronquait à « … induits dans la ».
    expect(n.map((x) => x.notion)).toContain('Les objets techniques, les services et les changements induits dans la société')
  })

  it('définie au niveau du cycle', () => {
    expect(granulariteProgramme({ pays: 'FR', niveau: '3e', matiere: 'Technologie' })).toBe('cycle')
  })
})


describe('Français — intitulés d’entrées seulement, jamais d’extraits d’œuvres', () => {
  it('la 6e et la 5e sont couvertes', () => {
    expect(notionsOfficielles({ pays: 'FR', niveau: '6e', matiere: 'Français', date: en(2026) }).length).toBeGreaterThan(3)
    expect(notionsOfficielles({ pays: 'FR', niveau: '5e', matiere: 'Français', date: en(2026) })).toHaveLength(4)
  })

  it('le millésime du cycle 4 s’applique aussi au français', () => {
    // Même arrêté que les maths : 5e en 2026, 4e en 2027, 3e en 2028.
    expect(notionsOfficielles({ pays: 'FR', niveau: '4e', matiere: 'Français', date: en(2026) })).toEqual([])
    expect(notionsOfficielles({ pays: 'FR', niveau: '4e', matiere: 'Français', date: en(2027) })).toHaveLength(4)
  })

  it('la réserve de licence est portée par le référentiel', () => {
    // Les œuvres citées dans le programme appartiennent à des tiers : la
    // Licence Ouverte ne les couvre pas. On ne stocke que les intitulés.
    const s = sourceOfficielle({ pays: 'FR', niveau: '5e', matiere: 'Français', date: en(2026) })
    expect(s).not.toBeNull()
  })
})


describe('Maths au lycée — le programme de 2019 n’est PLUS celui de la rentrée 2026', () => {
  // Les arrêtés du 26-2-2026 (BO n° 14 du 2-4-2026) REMPLACENT l'annexe des
  // arrêtés de 2019 sans les abroger : le véhicule juridique survit, son
  // contenu change. Continuer à servir le programme de 2019 en 2de et en 1re
  // aurait été parfaitement crédible — et faux depuis la rentrée.
  const notions = (c, a = 2026) => notionsOfficielles({ pays: 'FR', niveau: c, matiere: 'Mathématiques', date: en(a) }).map((x) => x.notion)

  it('la 2nde et la 1re servent le programme de 2026', () => {
    expect(sourceOfficielle({ pays: 'FR', niveau: '2nde', matiere: 'Mathématiques', date: en(2026) }).arrete).toMatch(/2026/)
    expect(sourceOfficielle({ pays: 'FR', niveau: '1re', matiere: 'Mathématiques', date: en(2026) }).bo).toMatch(/n° 14/)
    expect(notions('2nde')).toContain('Automatismes')
    expect(notions('1re')).toContain('Suites numériques, modèles discrets')
  })

  it('la Terminale garde 2019 en 2026 et bascule TOUTE SEULE en 2027', () => {
    // Le nouveau programme de terminale est déjà dans le dépôt, daté de la
    // rentrée 2027. Le servir un an trop tôt serait la même erreur en miroir.
    expect(sourceOfficielle({ pays: 'FR', niveau: 'Terminale', matiere: 'Mathématiques', date: en(2026) }).arrete).toMatch(/2019/)
    expect(sourceOfficielle({ pays: 'FR', niveau: 'Terminale', matiere: 'Mathématiques', date: en(2027) }).arrete).toMatch(/2026/)
    expect(notions('Terminale', 2026)).not.toContain('Combinatoire et dénombrement')
    expect(notions('Terminale', 2027)).toContain('Combinatoire et dénombrement')
  })

  it('les notions sont plus fines qu’avant : deux niveaux, pas un', () => {
    // L'ancienne extraction ne retenait que les grands domaines. Le sommaire
    // du nouveau texte est indenté : on descend d'un cran sans rien inventer.
    const n = notionsOfficielles({ pays: 'FR', niveau: '2nde', matiere: 'Mathématiques', date: en(2026) })
    expect(n.length).toBeGreaterThan(10)
    expect(n.some((x) => x.domaine === 'Géométrie' && x.notion === 'Droites du plan')).toBe(true)
  })

  it('écarter une rubrique ne doit pas emporter son domaine', () => {
    // En terminale, la seule entrée sous « Algorithmique et programmation » est
    // « Histoire des mathématiques ». L'écarter vidait le domaine, qui sortait
    // du référentiel sans un mot : un pan du programme disparu en silence.
    const dom = (c, a) => [...new Set(notionsOfficielles({ pays: 'FR', niveau: c, matiere: 'Mathématiques', date: en(a) }).map((x) => x.domaine))]
    expect(dom('Terminale', 2027)).toContain('Algorithmique et programmation')
    expect(dom('2nde', 2026)).toContain('Automatismes')
  })

  it('ni rubrique de préambule, ni rubrique de cadrage, prise pour une notion', () => {
    // « Objectifs » et « Histoire des mathématiques » sont au même niveau
    // d'indentation que les notions : rien ne les distingue sauf leur nom.
    for (const c of ['2nde', '1re', 'Terminale']) {
      for (const a of [2026, 2027]) {
        const n = notions(c, a)
        expect(n).not.toContain('Organisation du programme')
        expect(n).not.toContain('Intentions majeures')
        expect(n).not.toContain('Objectifs')
        expect(n).not.toContain('Histoire des mathématiques')
      }
    }
  })
})


describe('Lycée — physique-chimie et SVT, de la 2nde à la Terminale', () => {
  const pc = (c) => notionsOfficielles({ pays: 'FR', niveau: c, matiere: 'Physique-Chimie', date: en(2026) })
  const svt = (c) => notionsOfficielles({ pays: 'FR', niveau: c, matiere: 'SVT', date: en(2026) })

  it('les trois classes sont couvertes dans les deux matières', () => {
    for (const c of ['2nde', '1re', 'Terminale']) {
      expect(pc(c).length).toBeGreaterThan(4)
      expect(svt(c).length).toBeGreaterThan(4)
    }
  })

  it('la 2nde de physique-chimie n’a que TROIS parties, la 1re en a quatre', () => {
    // L'énergie n'apparaît qu'au cycle terminal. Proposer « L'énergie » à une
    // 2de serait hors programme tout en sonnant juste.
    const parties = (c) => [...new Set(pc(c).map((x) => x.domaine))]
    expect(parties('2nde')).toHaveLength(3)
    expect(parties('2nde').some((d) => /énergie/i.test(d))).toBe(false)
    expect(parties('1re')).toHaveLength(4)
    expect(parties('1re').some((d) => /énergie/i.test(d))).toBe(true)
  })

  it('les intitulés de thématique SVT changent d’une classe à l’autre', () => {
    // « Les enjeux contemporains de la planète » (2de), « Enjeux contemporains
    // de la planète » (1re), « Enjeux planétaires contemporains » (Tle) : trois
    // libellés voisins pour trois textes. On rend celui de la classe demandée.
    const d = (c) => [...new Set(svt(c).map((x) => x.domaine))]
    expect(d('2nde')).toContain('Les enjeux contemporains de la planète')
    expect(d('1re')).toContain('Enjeux contemporains de la planète')
    expect(d('Terminale')).toContain('Enjeux planétaires contemporains')
  })

  it('au lycée ces programmes sont définis par CLASSE, pas par cycle', () => {
    // Au collège c'est l'inverse : le texte y laisse la répartition à
    // l'établissement. Au lycée, chaque classe a son propre arrêté.
    expect(granulariteProgramme({ pays: 'FR', niveau: '1re', matiere: 'Physique-Chimie', date: en(2026) })).toBe('classe')
    expect(granulariteProgramme({ pays: 'FR', niveau: '5e', matiere: 'Physique-Chimie', date: en(2026) })).toBe('cycle')
  })

  it('aucun en-tête de tableau n’a été pris pour une section', () => {
    // « Connaissances », « Capacités exigibles », « Activités expérimentales
    // support de la formation » sont dans la même police grasse que les titres.
    const tous = ['2nde', '1re', 'Terminale'].flatMap((c) => [...pc(c), ...svt(c)]).map((x) => x.notion)
    for (const piege of ['Connaissances', 'Capacités', 'Capacités exigibles', 'Activités expérimentales support de la formation']) {
      expect(tous).not.toContain(piege)
    }
    expect(tous.some((x) => /^Notions (abordées|étudiées)/.test(x))).toBe(false)
  })
})


describe('Nom de matière — le référentiel SVT était livré mais jamais trouvé', () => {
  it('le libellé du catalogue élève ramène bien le référentiel', () => {
    // Le catalogue dit « Sciences de la vie et de la Terre (SVT) », le
    // référentiel s'appelle « SVT ». Les deux ne se rencontraient jamais :
    // la recherche échouait en silence et retombait sur « pas de référentiel ».
    const long = 'Sciences de la vie et de la Terre (SVT)'
    expect(notionsOfficielles({ pays: 'FR', niveau: '5e', matiere: long, date: en(2026) })).toHaveLength(3)
    expect(notionsOfficielles({ pays: 'FR', niveau: '1re', matiere: long, date: en(2026) })).toHaveLength(5)
    expect(sourceOfficielle({ pays: 'FR', niveau: '2nde', matiere: long, date: en(2026) })).not.toBeNull()
  })
})
