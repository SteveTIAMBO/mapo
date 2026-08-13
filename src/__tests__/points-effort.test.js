/**
 * Test — points d'effort et ligues.
 *
 * Décision produit (Steve, 13/08) : on classe sur l'EFFORT, pas sur la
 * maîtrise. Un classement au score fait toujours gagner les mêmes et répète
 * chaque semaine aux élèves en difficulté qu'ils sont derniers — MAPO+
 * deviendrait un second bulletin, exactement ce que les familles fuient.
 *
 * Ces tests verrouillent cet arbitrage : ils échouent si quelqu'un réintroduit
 * le score dans le calcul.
 */
import { describe, it, expect } from 'vitest'
import {
  pointsSeance, idLigue, zoneClassement,
  POINTS_REVISION, POINTS_PALIER, MAX_POINTS_COMBO, MAX_JOURS_SERIE_COMPTES,
  TAILLE_LIGUE, MIN_LIGUE_CLASSANTE,
} from '../utils/pointsEffort'

describe('Points — le score n’entre PAS dans le calcul', () => {
  it('terminer une révision rapporte pareil, quel que soit le résultat', () => {
    // Le signal produit : on paie la présence et la constance, pas la réussite.
    const base = pointsSeance({})
    expect(base.total).toBe(POINTS_REVISION)
    // La fonction n'accepte même pas de score : il n'y a rien à passer.
    expect(pointsSeance({ score: 100 }).total).toBe(POINTS_REVISION)
    expect(pointsSeance({ score: 20 }).total).toBe(POINTS_REVISION)
  })

  it('la régularité, elle, rapporte gros', () => {
    const seul = pointsSeance({ serieJours: 1 }).total
    const assidu = pointsSeance({ serieJours: 5 }).total
    expect(assidu).toBeGreaterThan(seul * 2)
  })

  it('un palier franchi est l’événement le mieux payé', () => {
    const p = pointsSeance({ palierFranchi: true })
    expect(p.total).toBe(POINTS_REVISION + POINTS_PALIER)
  })
})

describe('Points — les plafonds empêchent de farmer', () => {
  it('la série de jours est plafonnée', () => {
    const a = pointsSeance({ serieJours: MAX_JOURS_SERIE_COMPTES }).total
    const b = pointsSeance({ serieJours: 400 }).total
    expect(b).toBe(a)
  })

  it('le combo est plafonné', () => {
    const enorme = pointsSeance({ meilleureSerie: 500 })
    const ligne = enorme.detail.find((d) => d.libelle.includes('Série'))
    expect(ligne.points).toBe(MAX_POINTS_COMBO)
  })

  it('une série de 2 ne donne pas encore de bonus de combo', () => {
    expect(pointsSeance({ meilleureSerie: 2 }).total).toBe(POINTS_REVISION)
  })

  it('résiste aux entrées absurdes', () => {
    expect(pointsSeance({ serieJours: -5, meilleureSerie: -3 }).total).toBe(POINTS_REVISION)
    expect(pointsSeance().total).toBe(POINTS_REVISION)
    expect(pointsSeance({ serieJours: NaN }).total).toBe(POINTS_REVISION)
  })
})

describe('Points — le détail est renvoyé pour être MONTRÉ', () => {
  it('chaque ligne dit ce qui a été gagné et pourquoi', () => {
    const p = pointsSeance({ serieJours: 3, meilleureSerie: 5, palierFranchi: true })
    expect(p.detail.length).toBe(4)
    expect(p.detail.every((d) => d.libelle && d.points > 0)).toBe(true)
    expect(p.total).toBe(p.detail.reduce((s, d) => s + d.points, 0))
  })
})

describe('Ligues — une par semaine et par niveau', () => {
  it('deux niveaux différents ne partagent jamais la même ligue', () => {
    const d = new Date('2026-08-13T10:00:00Z')
    expect(idLigue('6ème', d)).not.toBe(idLigue('5ème', d))
  })

  it('la même semaine donne la même ligue, deux semaines non', () => {
    expect(idLigue('6ème', new Date('2026-08-10T00:00:00Z')))
      .toBe(idLigue('6ème', new Date('2026-08-14T23:00:00Z')))
    expect(idLigue('6ème', new Date('2026-08-13T10:00:00Z')))
      .not.toBe(idLigue('6ème', new Date('2026-08-20T10:00:00Z')))
  })

  it('les accents et la casse ne créent pas deux ligues pour une classe', () => {
    const d = new Date('2026-08-13T10:00:00Z')
    expect(idLigue('6ème', d)).toBe(idLigue('6EME', d))
  })

  it('une classe absente ne plante pas', () => {
    expect(idLigue('', new Date())).toContain('sans-niveau')
    expect(idLigue(null, new Date())).toContain('sans-niveau')
  })
})

describe('Ligues — on ne relègue pas dans une cohorte qui démarre', () => {
  it('dans une ligue pleine, les derniers descendent', () => {
    expect(zoneClassement(1, TAILLE_LIGUE)).toBe('promotion')
    expect(zoneClassement(TAILLE_LIGUE, TAILLE_LIGUE)).toBe('relegation')
    expect(zoneClassement(15, TAILLE_LIGUE)).toBe('maintien')
  })

  it('dans une ligue de trois, personne ne monte NI ne descend', () => {
    // Au lancement d'un pays, les cohortes sont minuscules. Être dernier de
    // trois n'a aucun sens — et être « promu » quand on est troisième sur trois
    // n'en a pas davantage. Une promotion que tout le monde obtient ne
    // récompense rien.
    expect(zoneClassement(1, 3)).toBe('maintien')
    expect(zoneClassement(3, 3)).toBe('maintien')
  })

  it('le classement s’active dès que la place se dispute', () => {
    expect(zoneClassement(1, MIN_LIGUE_CLASSANTE)).toBe('promotion')
    expect(zoneClassement(MIN_LIGUE_CLASSANTE, MIN_LIGUE_CLASSANTE)).toBe('maintien')
  })
})
