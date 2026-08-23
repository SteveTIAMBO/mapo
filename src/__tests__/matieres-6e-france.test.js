/**
 * La 6e est la DERNIÈRE ANNÉE DU CYCLE 3, pas la première année du collège.
 *
 * Défaut repéré par Steve (22/08) sur le compte de Marie, en 6e : « c'est
 * normal qu'elle ait italien, espagnol et allemand dans ses matières à
 * réviser ? ». Non. `matieresFR('6e')` renvoyait la liste du cycle 4.
 *
 * L'erreur est facile à refaire : la 6e se passe au collège, donc on lui sert
 * le programme du collège. Ces tests l'empêchent de revenir.
 */
import { describe, it, expect } from 'vitest'
import { matieresPourNiveau } from '../stores/enfantsAutonomes'

const en6e = () => matieresPourNiveau('6e', 'FR')
const en5e = () => matieresPourNiveau('5e', 'FR')

describe('6e France — pas de LV2', () => {
  it('aucune deuxième langue vivante n’est proposée', () => {
    const lv2 = en6e().filter((m) => /LV2|Espagnol|Allemand|Italien/i.test(m))
    expect(lv2).toEqual([])
  })

  it('l’anglais, lui, est bien là : c’est la LV1', () => {
    expect(en6e().some((m) => /Anglais/i.test(m))).toBe(true)
  })

  it('la LV2 apparaît dès la 5e, où elle commence réellement', () => {
    expect(en5e().some((m) => /Espagnol/i.test(m))).toBe(true)
    expect(en5e().some((m) => /Allemand/i.test(m))).toBe(true)
  })
})

describe('6e France — les sciences ne sont pas encore séparées', () => {
  it('« Sciences et technologie » est UNE matière', () => {
    expect(en6e()).toContain('Sciences et technologie')
  })

  it('ni SVT, ni Physique-Chimie, ni Technologie séparément', () => {
    const separees = en6e().filter((m) => /^(SVT|Physique-Chimie|Technologie)|Sciences de la vie/i.test(m))
    expect(separees).toEqual([])
  })

  it('elles se séparent au cycle 4, comme le disent les référentiels', () => {
    expect(en5e().some((m) => /Sciences de la vie et de la Terre/i.test(m))).toBe(true)
    expect(en5e()).toContain('Physique-Chimie')
    expect(en5e()).toContain('Technologie')
  })
})

describe('6e France — enseignements de cycle 4 exclus', () => {
  it('l’histoire des arts est un enseignement de cycle 4', () => {
    expect(en6e()).not.toContain('Histoire des arts')
    expect(en5e()).toContain('Histoire des arts')
  })

  it('le tronc commun de la 6e reste complet', () => {
    for (const m of ['Français', 'Mathématiques', 'Histoire-Géographie']) {
      expect(en6e()).toContain(m)
    }
  })
})
