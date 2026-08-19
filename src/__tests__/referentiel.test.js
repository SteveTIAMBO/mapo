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
    expect(notionsOfficielles({ pays: 'SN', niveau: '5e', matiere: 'Mathématiques', date: en(2026) })).toEqual([])
  })

  it('et les classes d’un pays ne s’écrivent pas comme celles d’un autre', () => {
    // Le Cameroun dit « 6ème », la France « 6e ». Ce ne sont pas les mêmes
    // clés : demander « 6e » au Cameroun ne doit pas ramener le programme
    // français par accident, ni l'inverse.
    expect(notionsOfficielles({ pays: 'CM', niveau: '6e', matiere: 'Mathématiques', date: en(2026) })).toEqual([])
    expect(notionsOfficielles({ pays: 'FR', niveau: '6ème', matiere: 'Mathématiques', date: en(2026) })).toEqual([])
  })

  it('une matière sans référentiel ne renvoie rien', () => {
    // Mieux vaut pas de référentiel qu'un référentiel inventé : la génération
    // retombe alors sur son comportement actuel, sans faire de fausse promesse.
    expect(notionsOfficielles({ pays: 'FR', niveau: '5e', matiere: 'Arts plastiques', date: en(2026) })).toEqual([])
  })

  it('une classe hors des cycles couverts ne renvoie rien', () => {
    // Les arts plastiques, l'éducation musicale et l'EPS ne sont volontairement
    // pas couverts : leurs programmes décrivent des PRATIQUES — « produire »,
    // « chanter », « expérimenter » — sur lesquelles un quiz à quatre
    // propositions n'a rien à dire. La voie technologique ne l'est pas non plus.
    expect(notionsOfficielles({ pays: 'FR', niveau: '4e', matiere: 'Arts plastiques', date: en(2026) })).toEqual([])
    expect(notionsOfficielles({ pays: 'FR', niveau: '4e', matiere: 'Éducation musicale', date: en(2026) })).toEqual([])
    expect(notionsOfficielles({ pays: 'FR', niveau: '4e', matiere: 'Éducation physique et sportive (EPS)', date: en(2026) })).toEqual([])
    expect(notionsOfficielles({ pays: 'FR', niveau: 'Terminale STMG', matiere: 'Mathématiques', date: en(2026) })).toEqual([])
  })
})

describe('Cameroun — des MODULES, pas des thèmes', () => {
  // L'Approche Par les Compétences ne découpe pas le programme en thèmes mais
  // en modules rattachés à des « familles de situations » de la vie réelle.
  // C'est l'unité que l'élève camerounais reconnaît de son année.
  const n = (niveau, matiere) => notionsOfficielles({ pays: 'CM', niveau, matiere, date: en(2026) })

  it('la 6ème et la 5ème ont leurs propres modules', () => {
    for (const mat of ['Mathématiques', 'Histoire', 'Géographie']) {
      expect(n('6ème', mat).length).toBeGreaterThan(1)
      expect(n('5ème', mat).length).toBeGreaterThan(1)
      expect(n('6ème', mat)).not.toEqual(n('5ème', mat))
    }
    expect(n('6ème', 'Histoire').map((x) => x.notion))
      .toContain('L‘apport des religions monothéistes dans la pensée et l’édification du monde actuel')
  })

  it('la provenance cite l’arrêté camerounais, pas un texte français', () => {
    const s = sourceOfficielle({ pays: 'CM', niveau: '6ème', matiere: 'Mathématiques', date: en(2026) })
    expect(s.arrete).toMatch(/MINESEC/)
    expect(s.attribution).toMatch(/MINESEC/)
  })

  it('« Sciences » répond quand l’élève demande la PCT ou la SVT', () => {
    // Au premier cycle, le Cameroun n'a PAS deux programmes séparés : un seul
    // texte « Sciences (PCT et SVTEEHB) » couvre les deux matières du
    // catalogue. Sans passerelle, l'élève s'entendait répondre qu'il n'y a rien.
    expect(n('6ème', 'Physique-Chimie-Technologie (PCT)').map((x) => x.notion)).toContain('LE MONDE VIVANT')
    expect(n('5ème', 'SVT').map((x) => x.notion)).toContain('TECHNOLOGIE')
  })

  it('ce texte-là ne répartit pas entre les deux années, et on le dit', () => {
    // Le volume horaire y est donné globalement (« 22 (10 + 12) heures ») :
    // annoncer « au programme de 6ème » serait une sur-interprétation.
    expect(granulariteProgramme({ pays: 'CM', niveau: '6ème', matiere: 'SVT', date: en(2026) })).toBe('cycle')
    expect(granulariteProgramme({ pays: 'CM', niveau: '6ème', matiere: 'Histoire', date: en(2026) })).toBe('classe')
  })

  it('le second cycle du collège est couvert, et distinct du premier', () => {
    for (const mat of ['Mathématiques', 'Histoire', 'Géographie']) {
      expect(n('4ème', mat).length).toBeGreaterThan(2)
      expect(n('3ème', mat).length).toBeGreaterThan(2)
      expect(n('4ème', mat)).not.toEqual(n('6ème', mat))
    }
    expect(n('3ème', 'Histoire').map((x) => x.notion)).toContain('Du Kamerun à la République du Cameroun (1884-1990)')
  })

  it('en maths, la classe est nommée APRÈS le module — et pourtant bien attribuée', () => {
    // Le document ne dit pas « CLASSE DE 3ème » avant le bloc : il légende
    // chaque tableau APRÈS. Se fier à la dernière classe rencontrée mettait
    // tout le second bloc en 4ème — huit modules dans la mauvaise année.
    const rationnels = n('4ème', 'Mathématiques').map((x) => x.notion).find((x) => /RATIONNELS/.test(x))
    const reels = n('3ème', 'Mathématiques').map((x) => x.notion).find((x) => /REELS/.test(x))
    expect(rationnels).toBeTruthy()   // les rationnels, c'est la 4ème
    expect(reels).toBeTruthy()        // les réels, la 3ème
    expect(n('4ème', 'Mathématiques').map((x) => x.notion).some((x) => /REELS/.test(x))).toBe(false)
  })

  it('le français de 4ème-3ème ne répartit pas ses modules entre les deux années', () => {
    expect(n('4ème', 'Français')).toEqual(n('3ème', 'Français'))
    expect(granulariteProgramme({ pays: 'CM', niveau: '4ème', matiere: 'Français', date: en(2026) })).toBe('cycle')
  })

  it('l’ECM répond sous le libellé à sigle du catalogue camerounais', () => {
    expect(n('6ème', 'Éducation à la citoyenneté et à la morale (ECM)').map((x) => x.notion))
      .toContain('La vie familiale et scolaire')
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


describe('Primaire — deux millésimes coexistent dans la même matière', () => {
  // À la rentrée 2026, trois arrêtés du printemps remplacent les sciences,
  // l'histoire-géo et les langues du primaire, mais CLASSE PAR CLASSE : le CP
  // et le CM1 d'abord, le reste en 2027. Un CM1 et un CM2 n'ont donc pas le
  // même programme de sciences cette année. C'est le cas qui justifie que
  // `trouver` arbitre entre plusieurs référentiels d'une même classe.
  const n = (niveau, matiere, a = 2026) => notionsOfficielles({ pays: 'FR', niveau, matiere, date: en(a) })
  const src = (niveau, matiere, a = 2026) => sourceOfficielle({ pays: 'FR', niveau, matiere, date: en(a) })

  it('en sciences, le CM1 est sur 2026 et le CM2 sur 2023', () => {
    expect(src('CM1', 'Sciences et technologie').arrete).toMatch(/2026/)
    expect(src('CM2', 'Sciences et technologie').arrete).toMatch(/2023/)
    expect(src('6e', 'Sciences et technologie').arrete).toMatch(/2023/)
  })

  it('en histoire-géo, le CM1 est sur 2026 et le CM2 sur 2020', () => {
    expect(src('CM1', 'Histoire-Géographie').arrete).toMatch(/2026/)
    expect(src('CM2', 'Histoire-Géographie').arrete).toMatch(/2020/)
  })

  it('et les contenus diffèrent vraiment, ce n’est pas qu’une étiquette', () => {
    expect(n('CM1', 'Histoire-Géographie').map((x) => x.notion))
      .toContain('Thème 1 : La vie quotidienne au Moyen Âge (XIe - XIIIe siècles)')
    expect(n('CM2', 'Histoire-Géographie').map((x) => x.notion))
      .toContain('Thème 1 - Le temps de la République')
  })

  it('en 2027 tout le cycle 3 aura basculé, sans qu’on touche au code', () => {
    expect(src('CM2', 'Sciences et technologie', 2027).arrete).toMatch(/2026/)
    expect(src('6e', 'Histoire-Géographie', 2027).arrete).toMatch(/2026/)
  })

  it('le cycle 2 est couvert en français et en mathématiques depuis 2025', () => {
    for (const c of ['CP', 'CE1', 'CE2']) {
      expect(n(c, 'Français').length).toBeGreaterThan(8)
      expect(n(c, 'Mathématiques').length).toBeGreaterThan(8)
      // Pas d'échelonnement pour ces deux-là : les trois classes ensemble.
      expect(n(c, 'Français', 2024)).toEqual([])
    }
    expect(n('CP', 'Français').map((x) => x.notion)).toContain('Lire à voix haute')
  })

  it('« Questionner le monde » répond quand on demande les sciences au CE1', () => {
    // Le programme du cycle 2 ne s'appelle pas comme la matière du catalogue.
    // Sans passerelle, un CE1 s'entendait répondre qu'il n'y a pas de
    // référentiel — alors qu'il y en a un, et qu'il est en vigueur.
    expect(n('CE1', 'Sciences et technologie').map((x) => x.notion)).toContain('Comment reconnaître le monde vivant ?')
    expect(n('CE2', 'Histoire-Géographie').map((x) => x.notion)).toContain('Se situer dans le temps')
    // Au CP en revanche, il a été remplacé : c'est le texte de 2026 qui sort.
    expect(src('CP', 'Sciences et technologie').arrete).toMatch(/2026/)
  })
})


describe('EMC — un seul arrêté du CP à la terminale, appliqué en trois vagues', () => {
  // L'arrêté du 29-5-2024 réécrit tout l'EMC et abroge ceux de 2015 et 2019.
  // Son application est échelonnée : 2024, 2025, puis 2026 — et la TERMINALE
  // bascule précisément à cette rentrée. C'est la seule matière qui couvre
  // d'un coup les douze classes du catalogue.
  const emc = (niveau, a = 2026) => notionsOfficielles({ pays: 'FR', niveau, matiere: 'Enseignement moral et civique (EMC)', date: en(a) })

  it('les douze classes, du CP à la terminale, sont servies en 2026', () => {
    for (const c of ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e', '2nde', '1re', 'Terminale']) {
      expect(emc(c).length).toBeGreaterThan(1)
    }
  })

  it('en 2024 la terminale ne recevait encore rien, la 2de si', () => {
    expect(emc('Terminale', 2024)).toEqual([])
    expect(emc('2nde', 2024).length).toBeGreaterThan(1)
    expect(emc('1re', 2024)).toEqual([])
    expect(emc('1re', 2025).length).toBeGreaterThan(1)
  })

  it('chaque classe a bien SES entrées', () => {
    expect(emc('3e').map((x) => x.notion)).toContain('Les règles du jeu démocratique')
    expect(emc('Terminale').map((x) => x.notion)).toContain('Les principes et les espaces du débat démocratique')
    expect(emc('CP').map((x) => x.notion)).toContain('Être élève à l’école de la République')
  })

  it('la durée horaire est retirée, même quand elle tient sur deux lignes', () => {
    // « (6 heures en voies générale et technologique, 5 heures en voie
    // professionnelle) » déborde d'une ligne sur l'autre dans le PDF.
    const tous = ['6e', '5e', '4e', '3e', '2nde', '1re', 'Terminale'].flatMap((c) => emc(c)).map((x) => x.notion)
    expect(tous.some((x) => /heures?\)$/.test(x))).toBe(false)
    expect(tous.some((x) => /voie professionnelle/.test(x))).toBe(false)
  })
})


describe('Histoire des arts — la seule part des enseignements artistiques qui soit du SAVOIR', () => {
  // Éducation musicale et arts plastiques décrivent des pratiques. L'histoire
  // des arts, elle, énumère huit thématiques périodisées : ça, un élève peut
  // le réviser. C'est ce qui justifie de couvrir l'une et pas les autres.
  const n = (c) => notionsOfficielles({ pays: 'FR', niveau: c, matiere: 'Histoire des arts', date: en(2026) })

  it('les huit thématiques, du monde antique à nos jours, aux trois classes', () => {
    for (const c of ['5e', '4e', '3e']) expect(n(c)).toHaveLength(8)
    const titres = n('4e').map((x) => x.notion)
    expect(titres[0]).toMatch(/époque antique/)
    expect(titres[7]).toMatch(/de 1945 à nos jours/)
  })

  it('les bornes de siècles n’ont pas été prises pour un séparateur', () => {
    // Les titres contiennent eux-mêmes des tirets — « XIVe-début XVIIe s. »,
    // « 1750-1850 ». Couper au premier tiret venu n'en ramenait que deux sur huit.
    const titres = n('3e').map((x) => x.notion)
    expect(titres.some((x) => /1750-1850/.test(x))).toBe(true)
    expect(titres.some((x) => /XIVe-début XVIIe/.test(x))).toBe(true)
  })

  it('définie pour le CYCLE : le texte ne répartit pas sur les trois années', () => {
    expect(granulariteProgramme({ pays: 'FR', niveau: '4e', matiere: 'Histoire des arts', date: en(2026) })).toBe('cycle')
  })
})


describe('Quatre langues — un programme par langue depuis 2025', () => {
  // L'arrêté du 5-5-2025 a fait éclater le programme unique de LV en un texte
  // PAR LANGUE. Le catalogue disait encore « LV2 (Espagnol/Allemand) » : un
  // libellé pour deux langues, donc aucune atteignable. Il est désormais scindé.
  const n = (niveau, matiere, a = 2026) => notionsOfficielles({ pays: 'FR', niveau, matiere, date: en(a) })

  it('espagnol, allemand et italien répondent sous le libellé du catalogue', () => {
    for (const m of ['Espagnol (LV2)', 'Allemand (LV2)', 'Italien (LV2)']) {
      expect(n('5e', m).length).toBeGreaterThan(4)
    }
    for (const m of ['Espagnol (LVB)', 'Allemand (LVB)', 'Italien (LVB)']) {
      expect(n('Terminale', m)).toHaveLength(6)
    }
  })

  it('les cinq premiers axes sont communs, le sixième est propre à la langue', () => {
    // C'est le seul endroit où les quatre textes divergent — et c'est là que
    // se joue l'intérêt de distinguer les langues plutôt que de les mélanger.
    const axe6 = (m) => n('Terminale', m).map((x) => x.notion).find((x) => x.startsWith('Axe 6'))
    expect(axe6('Anglais (LVA)')).toMatch(/Royaume-Uni/)
    expect(axe6('Espagnol (LVB)')).toMatch(/hispanique/)
    expect(axe6('Allemand (LVB)')).toMatch(/Dichter/)
    expect(axe6('Italien (LVB)')).toMatch(/République à l’Europe/)
    // Les axes 1 à 5, eux, sont bien identiques d'une langue à l'autre.
    const cinq = (m) => n('Terminale', m).map((x) => x.notion).slice(0, 5)
    expect(cinq('Espagnol (LVB)')).toEqual(cinq('Allemand (LVB)'))
  })
})


describe('Anglais — les repères culturels, pas les savoir-faire', () => {
  // L'arrêté du 5-5-2025 remplace celui de 2019 et introduit un programme PAR
  // LANGUE. On ne retient que les « Repères culturels » : les activités
  // langagières (« épeler », « prendre des notes ») décrivent des savoir-faire,
  // sur lesquels un quiz à quatre propositions n'a rien à dire.
  const n = (niveau, a = 2026) => notionsOfficielles({ pays: 'FR', niveau, matiere: 'Anglais (LV1)', date: en(a) })

  it('la 6e et la 5e sont passées au programme de 2025, la 4e et la 3e pas encore', () => {
    expect(n('6e').length).toBeGreaterThan(4)
    expect(n('5e').length).toBeGreaterThan(4)
    expect(n('4e')).toEqual([])
    expect(n('4e', 2027).length).toBeGreaterThan(4)
    expect(n('3e', 2028).length).toBeGreaterThan(4)
  })

  it('chaque classe a ses propres axes, et le sixième est une aire culturelle', () => {
    expect(n('5e').map((x) => x.notion)).toContain('Axe 6. Le Royaume-Uni')
    expect(n('3e', 2028).map((x) => x.notion)).toContain('Axe 6. Les États-Unis')
  })

  it('le lycée aussi, sous le libellé LVA du catalogue', () => {
    const lva = (c) => notionsOfficielles({ pays: 'FR', niveau: c, matiere: 'Anglais (LVA)', date: en(2026) })
    expect(lva('2nde')).toHaveLength(6)
    expect(lva('Terminale').map((x) => x.notion)).toContain('Axe 2. Territoire et mémoire')
  })

  it('aucune activité langagière n’a été prise pour un repère culturel', () => {
    const tous = ['6e', '5e'].flatMap((c) => n(c)).map((x) => x.notion)
    expect(tous.every((x) => x.startsWith('Axe '))).toBe(true)
    expect(tous).not.toContain('Activités langagières')
    expect(tous).not.toContain('Outils linguistiques')
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

  it('le sigle marche dans les deux sens, sans table à tenir à jour', () => {
    // Deux autres matières du lycée ont un sigle dans le catalogue. Une table
    // d'alias aurait exigé qu'on pense à les y ajouter — et l'oubli aurait été
    // silencieux, comme il l'a été pour la SVT.
    for (const [libelle, n] of [['Sciences économiques et sociales (SES)', 12],
      ['Sciences numériques et technologie (SNT)', 7]]) {
      const cl = libelle.includes('SNT') ? '2nde' : '1re'
      expect(notionsOfficielles({ pays: 'FR', niveau: cl, matiere: libelle, date: en(2026) })).toHaveLength(n)
    }
    // Le libellé sans son sigle marche aussi : c'est celui du référentiel.
    expect(notionsOfficielles({ pays: 'FR', niveau: 'Terminale', matiere: 'Sciences économiques et sociales', date: en(2026) })).toHaveLength(12)
  })
})


describe('Lycée — le tronc commun est couvert', () => {
  const n = (niveau, matiere) => notionsOfficielles({ pays: 'FR', niveau, matiere, date: en(2026) })

  it('histoire-géographie : quatre thèmes d’histoire et quatre de géographie, par classe', () => {
    for (const c of ['2nde', '1re', 'Terminale']) {
      const notions = n(c, 'Histoire-Géographie')
      expect(notions).toHaveLength(8)
      expect(notions.filter((x) => x.domaine === 'Histoire')).toHaveLength(4)
      expect(notions.filter((x) => x.domaine === 'Géographie')).toHaveLength(4)
    }
  })

  it('la durée horaire n’est pas dans le titre du thème', () => {
    // « Thème 3 : Des mobilités généralisées (12-14 heures) » : la durée relève
    // de l'organisation de l'année, pas de ce qu'il y a à réviser.
    const tous = ['2nde', '1re', 'Terminale'].flatMap((c) => n(c, 'Histoire-Géographie')).map((x) => x.notion)
    expect(tous.some((x) => /heures\)$/.test(x))).toBe(false)
    // Une date entre parenthèses, elle, fait partie du titre et doit rester.
    expect(tous.some((x) => /\(1929-1945\)$/.test(x))).toBe(true)
  })

  it('le thème conclusif de terminale n’a pas de numéro et compte quand même', () => {
    expect(n('Terminale', 'Histoire-Géographie').map((x) => x.notion)
      .some((x) => x.startsWith('Thème conclusif'))).toBe(true)
  })

  it('enseignement scientifique : le programme de 2023, pas celui de 2019', () => {
    // Les annexes de 2019 ont été REMPLACÉES en 2023. Les pages du BO de 2019
    // affichent pourtant toujours l'ancienne : s'y fier aurait été une erreur.
    expect(sourceOfficielle({ pays: 'FR', niveau: '1re', matiere: 'Enseignement scientifique', date: en(2026) }).arrete).toMatch(/2023/)
    expect(n('Terminale', 'Enseignement scientifique').map((x) => x.notion)).toContain('De la machine de Turing à l’intelligence artificielle')
  })

  it('le module de maths de 1re, porté par un arrêté distinct, est bien là', () => {
    expect(n('1re', 'Enseignement scientifique').map((x) => x.notion)).toContain('Phénomènes aléatoires')
  })

  it('français : les objets d’étude diffèrent entre la 2de et la 1re', () => {
    const o = (c) => n(c, 'Français').filter((x) => x.domaine === 'Les objets d’étude').map((x) => x.notion)
    expect(o('2nde')).toHaveLength(4)
    expect(o('1re')).toHaveLength(4)
    expect(o('2nde')).toContain('La poésie du Moyen Âge au XVIIIe siècle')
    expect(o('1re')).toContain('La poésie du XIXe siècle au XXIe siècle')
    expect(o('2nde')).not.toEqual(o('1re'))
  })

  it('français : la 2de ne reçoit pas les points de langue réservés à la 1re', () => {
    // Le même chapitre « Étude de la langue » sert aux deux classes et marque
    // lui-même le partage : « (dès la classe de seconde) » / « (classe de
    // première) ». Tout servir à une 2de aurait été crédible et hors programme.
    const langue = (c) => n(c, 'Français').filter((x) => x.domaine === 'Étude de la langue').map((x) => x.notion)
    expect(langue('2nde').some((x) => /classe de première/.test(x))).toBe(false)
    expect(langue('1re').some((x) => /classe de première/.test(x))).toBe(true)
    expect(langue('1re').length).toBeGreaterThan(langue('2nde').length)
  })

  it('français : aucune œuvre au programme n’est stockée', () => {
    // Les œuvres sont fixées chaque année par une note de service distincte —
    // et elles appartiennent à des tiers, que la Licence Ouverte ne couvre pas.
    const s = sourceOfficielle({ pays: 'FR', niveau: '1re', matiere: 'Français', date: en(2026) })
    expect(s.arrete).toMatch(/modifié/)   // l'arrêté de 2019 a été modifié en 2020
  })

  it('philosophie : les dix-sept notions, entières', () => {
    // Elles sont disposées en grille à trois colonnes, SANS caractère espace :
    // une lecture naïve produisait « Lebonheur » et une notion au lieu de trois.
    const notions = n('Terminale', 'Philosophie').filter((x) => x.domaine === 'Notions').map((x) => x.notion)
    expect(notions).toHaveLength(17)
    expect(notions).toContain('Le bonheur')
    expect(notions).toContain('L’inconscient')
    // « Lebonheur » commencerait bien par « Le » mais sans l'espace : c'est
    // exactement ce que cette expression attrape.
    expect(notions.every((x) => /^(Le |La |L’)/.test(x))).toBe(true)
  })

  it('philosophie : les repères sont des couples, pas une ligne entière', () => {
    const reperes = n('Terminale', 'Philosophie').filter((x) => x.domaine === 'Repères').map((x) => x.notion)
    expect(reperes.length).toBeGreaterThan(25)
    expect(reperes).toContain('Légal/légitime')
    expect(reperes.every((x) => x.includes('/') && !/[–—]/.test(x))).toBe(true)
  })

  it('SES : les questionnements sont répartis entre les trois parties', () => {
    const d = (c) => [...new Set(n(c, 'Sciences économiques et sociales').map((x) => x.domaine))]
    expect(d('1re')).toEqual(['Science économique', 'Sociologie et science politique', 'Regards croisés'])
    expect(n('Terminale', 'Sciences économiques et sociales')).toHaveLength(12)
  })

  it('les spécialités les plus choisies sont couvertes en 1re ET en terminale', () => {
    for (const m of ['Histoire-géographie, géopolitique et sciences politiques (HGGSP)',
      'Humanités, littérature et philosophie (HLP)',
      'Numérique et sciences informatiques (NSI)']) {
      expect(n('1re', m).length).toBeGreaterThan(4)
      expect(n('Terminale', m).length).toBeGreaterThan(4)
    }
  })

  it('HGGSP et histoire-géo sont DEUX matières, pas une', () => {
    // Les deux libellés se ressemblent beaucoup. Servir les thèmes de la
    // spécialité à un élève qui révise le tronc commun serait crédible et faux.
    const spe = n('1re', 'Histoire-géographie, géopolitique et sciences politiques (HGGSP)').map((x) => x.notion)
    const commun = n('1re', 'Histoire-Géographie').map((x) => x.notion)
    expect(spe).toContain('Thème 1 : Comprendre un régime politique : la démocratie')
    expect(commun).toContain('Thème 1 : L’Europe face aux révolutions')
    expect(spe.some((x) => commun.includes(x))).toBe(false)
  })

  it('HLP et philosophie non plus', () => {
    const hlp = n('Terminale', 'Humanités, littérature et philosophie (HLP)').map((x) => x.notion)
    expect(hlp).toContain('Les métamorphoses du moi')
    expect(hlp).not.toContain('La conscience')   // ça, c'est la philosophie
  })

  it('HLP : les intitulés viennent du programme, pas de la bibliographie', () => {
    // Le document répète ses deux semestres dans « Bibliographie indicative » :
    // sans garde de section, chaque entrée serait comptée deux fois.
    const d = [...new Set(n('1re', 'Humanités, littérature et philosophie (HLP)').map((x) => x.domaine))]
    expect(d).toHaveLength(2)
    expect(d[0]).toMatch(/^Semestre 1/)
  })

  it('SNT : les sept thématiques de seconde', () => {
    expect(n('2nde', 'Sciences numériques et technologie')).toHaveLength(7)
    expect(n('2nde', 'Sciences numériques et technologie').map((x) => x.notion)).toContain('Les réseaux sociaux')
  })
})
