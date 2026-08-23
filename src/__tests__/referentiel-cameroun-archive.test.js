/**
 * Programmes camerounais tirés de l'ARCHIVE COMPLÈTE du MINESEC (23-8-2026).
 *
 * POURQUOI CES TESTS. Extraire un référentiel ne sert à rien s'il n'est jamais
 * TROUVÉ : le défaut classique de ce système est muet — `notionsOfficielles`
 * renvoie [] et la génération repart en roue libre, sans le moindre signal.
 * Chaque test ci-dessous passe donc par `notionsOfficielles`, c'est-à-dire par
 * le vrai chemin d'appel, et jamais par le JSON directement.
 *
 * ⚠️ CE QUE L'ARCHIVE NE CONTIENT PAS est testé aussi, en bas de fichier. Ces
 * trous sont réels et documentés ; les figer évite qu'on croie plus tard les
 * avoir comblés.
 */
import { describe, it, expect } from 'vitest'
import { notionsOfficielles, sourceOfficielle, granulariteProgramme } from '../utils/referentiel'
import { matieresPourNiveau } from '../stores/enfantsAutonomes'

// Postérieure à toutes les mises en vigueur retenues (2014, 2018, 2020).
const EN_2026 = new Date('2026-11-15')
const notions = (niveau, matiere) =>
  notionsOfficielles({ pays: 'CM', niveau, matiere, date: EN_2026 })
const titres = (niveau, matiere) => notions(niveau, matiere).map((n) => n.notion)

describe('Cameroun — second cycle, sciences de 2nde C', () => {
  it('la SVT de 2nde C a ses quatre modules', () => {
    expect(titres('2nde C', 'SVT')).toEqual([
      'LE MONDE VIVANT',
      'ÉDUCATION A LA SANTÉ',
      'EDUCATION A L’ENVIRONNEMENT ET AU DEVELOPPEMENT DURABLE',
      'LA BIOTECHNOLOGIE',
    ])
  })

  it('la physique retrouve son module coupé par la mise en colonnes', () => {
    // Le titre du module 4 est rejeté à la ligne suivante, la durée s'étant
    // intercalée : « LES RESISTORS, LES DIODES, DUREE : 24 HEURES … » puis
    // « LES TRANSISTORS ET PORTES LOGIQUES ». Sans recouture, on stockait un
    // intitulé tronqué qui se terminait par une virgule.
    expect(titres('2nde C', 'Physique')).toContain(
      'LES RESISTORS, LES DIODES, LES TRANSISTORS ET PORTES LOGIQUES')
    expect(titres('2nde C', 'Physique')).toHaveLength(4)
  })

  it('la chimie de 2nde C est là', () => {
    expect(titres('2nde C', 'Chimie')).toHaveLength(2)
  })

  it('⚠️ ces trois programmes disent « SECONDE C » : on ne les sert pas à la 2nde D', () => {
    for (const m of ['SVT', 'Physique', 'Chimie']) {
      expect(notions('2nde D', m)).toEqual([])
    }
  })
})

describe('Cameroun — terminale, histoire et géographie', () => {
  it('l’histoire de terminale vaut pour les trois séries', () => {
    for (const s of ['Tle A', 'Tle C', 'Tle D']) {
      expect(titres(s, 'Histoire')).toHaveLength(3)
    }
    expect(titres('Tle A', 'Histoire')).toContain('Le Cameroun : de la tutelle à nos jours')
  })

  it('la géographie de terminale aussi', () => {
    expect(titres('Tle D', 'Géographie')).toEqual(['le Cameroun', 'La libéralisation des échanges'])
  })
})

describe('Cameroun — anglais et informatique du second cycle', () => {
  it('l’anglais de 2nde est bien « English to francophones »', () => {
    expect(titres('2nde A', 'Anglais')).toHaveLength(5)
    expect(titres('2nde A', 'Anglais')[0]).toMatch(/^Using language to talk about locations/)
  })

  it('l’informatique diffère entre la série A et la série C', () => {
    expect(titres('2nde A', 'Informatique')).toContain('ALGORITHMIQUE ET MULTIMEDIA')
    expect(titres('2nde C', 'Informatique')).toContain('PROGRAMMATION ET MULTIMEDIA')
    expect(titres('2nde A', 'Informatique')).not.toEqual(titres('2nde C', 'Informatique'))
  })
})

describe('Cameroun — premier cycle, matières nouvellement couvertes', () => {
  it('l’informatique de 6ème et de 5ème n’a pas les mêmes modules', () => {
    expect(titres('6ème', 'Informatique')).toContain('ENVIRONNEMENT INFORMATIQUE')
    expect(titres('5ème', 'Informatique')).toContain('RECHERCHE ET COMMUNICATION SUR INTERNET')
    expect(titres('6ème', 'Informatique')).not.toEqual(titres('5ème', 'Informatique'))
  })

  it('l’éducation artistique est au catalogue de 4ème-3ème ET a son programme', () => {
    expect(matieresPourNiveau('4ème', 'CM')).toContain('Éducation artistique')
    expect(titres('4ème', 'Éducation artistique')).toContain('ARTS MUSICAUX I')
    expect(titres('3ème', 'Éducation artistique')).toContain('ARTS MUSICAUX II')
  })

  it('⚠️ mais PAS en 6ème-5ème : le ministère n’y publie qu’un guide pédagogique', () => {
    expect(matieresPourNiveau('6ème', 'CM')).not.toContain('Éducation artistique')
    expect(notions('6ème', 'Éducation artistique')).toEqual([])
  })
})

describe('Cameroun — les langues secondes du MINESEC', () => {
  it('allemand et espagnol répondent aussi au libellé générique du catalogue', () => {
    // Le catalogue propose « Deuxième langue (Espagnol/Allemand) » ; un profil
    // enregistré sous ce libellé doit tomber sur un programme réel.
    expect(notions('4ème', 'Deuxième langue (Espagnol/Allemand)').length).toBeGreaterThan(0)
  })

  it('arabe, chinois, latin et grec existent, hors catalogue', () => {
    expect(titres('4ème', 'Arabe')).toHaveLength(5)
    expect(titres('3ème', 'Chinois')).toHaveLength(5)
    expect(titres('4ème', 'Latin')).toHaveLength(2)
    expect(titres('3ème', 'Grec')).toHaveLength(1)
  })

  it('latin et grec ne se mélangent pas, alors qu’ils partagent UN seul PDF', () => {
    // Le fichier Latin_Grec.pdf porte les deux langues ; seul le bandeau
    // « CLASSE DE 4E, LATIN » / « … GREC » les sépare.
    expect(titres('4ème', 'Latin')).not.toEqual(titres('4ème', 'Grec'))
    expect(titres('4ème', 'Grec')).toEqual(['COMMUNICATION DANS LA VIE FAMILIALE ET SOCIOCULTURELLE'])
  })

  it('les LV2 sont de granularité CYCLE : leurs modules ne sont pas datés d’une année', () => {
    // Arabe, chinois et espagnol listent leurs cinq modules UNE fois, avant
    // toute mention de classe. Annoncer « au programme de 4ème » serait une
    // sur-interprétation.
    for (const m of ['Arabe', 'Chinois', 'Espagnol']) {
      expect(granulariteProgramme({ pays: 'CM', niveau: '4ème', matiere: m, date: EN_2026 }))
        .toBe('cycle')
      expect(titres('4ème', m)).toEqual(titres('3ème', m))
    }
    // L'allemand, lui, distingue bien les deux années.
    expect(titres('4ème', 'Allemand')).not.toEqual(titres('3ème', 'Allemand'))
  })
})

describe('Cameroun — attribution', () => {
  it('la provenance MINESEC reste affichable, obligation de la licence', () => {
    const s = sourceOfficielle({ pays: 'CM', niveau: '2nde C', matiere: 'SVT', date: EN_2026 })
    expect(s.arrete).toMatch(/MINESEC/)
    expect(s.attribution).toMatch(/MINESEC/)
  })
})

/**
 * ⚠️ TROUS RÉELS DE L'ARCHIVE — mesurés, pas supposés.
 *
 * Les dossiers correspondants existent sur le site du ministère mais sont
 * VIDES. Ces tests ne demandent pas qu'on s'en contente : ils empêchent de
 * croire le chantier terminé, et signaleront le jour où une source arrive.
 */
describe('Cameroun — ce que le ministère ne publie pas', () => {
  it('la 1ère n’a AUCUN programme, dans aucune matière', () => {
    for (const s of ['1ère A', '1ère C', '1ère D']) {
      for (const m of ['Mathématiques', 'Français', 'Histoire', 'Physique', 'SVT']) {
        expect(notions(s, m)).toEqual([])
      }
    }
  })

  it('les sciences de terminale non plus', () => {
    for (const m of ['Mathématiques', 'Physique', 'Chimie', 'SVT']) {
      expect(notions('Tle C', m)).toEqual([])
    }
  })

  it('PCT et SVT de 4ème-3ème restent introuvables', () => {
    expect(notions('4ème', 'Physique-Chimie-Technologie (PCT)')).toEqual([])
    expect(notions('3ème', 'SVT')).toEqual([])
  })

  it('français et anglais de 6ème-5ème aussi', () => {
    expect(notions('6ème', 'Français')).toEqual([])
    expect(notions('5ème', 'Anglais')).toEqual([])
  })

  it('l’anglais de terminale : le PDF ainsi nommé est du FRANÇAIS pour anglophones', () => {
    expect(notions('Tle A', 'Anglais')).toEqual([])
  })
})
