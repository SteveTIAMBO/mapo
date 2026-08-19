import { describe, it, expect } from 'vitest'
import { COUNTRY_DEFAULTS } from '../stores/school'
import { LEVELS, LEVELS_TOUS, levelsPrimairePour } from '../stores/classes'
import { EXAM_TYPES_PAR_PAYS, examTypesPays } from '../stores/examens'
import { baremePour, cycleDe } from '../data/baremes'
import { HOLIDAYS_BY_COUNTRY } from '../stores/emploi-du-temps'

/**
 * Congo-Brazzaville (CG) — pas la RD Congo (CD).
 *
 * Quand on ajoute un pays, l'échec est presque toujours MUET : le niveau
 * importé est silencieusement recalé sur celui d'un autre pays, la devise
 * retombe sur le défaut, la liste d'examens répond quand même parce qu'elle a
 * un repli. Rien ne casse, rien n'alerte, ça a l'air de marcher.
 *
 * Ces tests interrogent donc le système avec les LIBELLÉS QUE VERRA L'ÉCOLE
 * CONGOLAISE (« CP1 », « CEPE », « Congo-Brazzaville »), jamais avec les
 * constantes internes. Un test qui compare une constante à elle-même ne
 * prouve rien.
 */

describe('Congo-Brazzaville : identité du pays', () => {
  it('facture en franc CFA d’Afrique centrale, pas en franc congolais', () => {
    // Le piège : CG et CD s'écrivent tous les deux « Congo ». XAF (CEMAC) pour
    // Brazzaville, CDF pour Kinshasa. Se tromper fausse toute la comptabilité.
    expect(COUNTRY_DEFAULTS.CG.currency).toBe('XAF')
    expect(COUNTRY_DEFAULTS.CD.currency).toBe('CDF')
  })

  it('ne retombe pas sur le défaut camerounais', () => {
    expect(COUNTRY_DEFAULTS.CG).toBeDefined()
    expect(COUNTRY_DEFAULTS.CG.phoneFormat).not.toBe(COUNTRY_DEFAULTS.CM.phoneFormat)
  })
})

describe('Congo-Brazzaville : classes', () => {
  it('le primaire commence à CP1, et la SIL camerounaise n’apparaît jamais', () => {
    const niveaux = levelsPrimairePour('CG').map((l) => l.label)
    expect(niveaux).toEqual(['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'])
    expect(niveaux).not.toContain('SIL')
  })

  it('n’impose pas CP1 aux autres pays', () => {
    expect(levelsPrimairePour('CM').map((l) => l.label)).toContain('SIL')
    expect(levelsPrimairePour(undefined).map((l) => l.label)).toContain('SIL')
  })

  it('le secondaire congolais est déjà servi tel quel, de la 6ème à la Terminale', () => {
    // Le Congo n'a PAS d'« humanités » (ça, c'est la RD Congo) : il dit bien
    // collège 6e-3e puis lycée 2nde-Tle. Rien à ajouter, mais il faut le vérifier
    // plutôt que le supposer.
    const values = LEVELS.map((l) => l.value)
    for (const n of ['6e', '5e', '4e', '3e', '2nde', '1ere', 'Tle']) {
      expect(values).toContain(n)
    }
    expect(LEVELS.map((l) => l.label).join(' ')).not.toMatch(/humanit/i)
  })

  it('CP1 et CP2 sont reconnus à l’import, et ne sont pas confondus avec le CP', () => {
    // Le défaut vécu : le rapprochement par préfixe transformait « CP1 » en
    // « CP » camerounais. Le niveau changeait sans le moindre message.
    const connus = LEVELS_TOUS.map((l) => l.value)
    expect(connus).toContain('CP1')
    expect(connus).toContain('CP2')
    expect(LEVELS_TOUS.find((l) => l.value === 'CP1').label).toBe('CP1')
  })
})

describe('Congo-Brazzaville : notation', () => {
  it('le secondaire est noté sur 20 (décret n° 2013-295, admission à 10/20)', () => {
    expect(baremePour({ pays: 'CG', niveau: '3e' })).toMatchObject({ bareme: 'note20', aVerifier: false })
    expect(baremePour({ pays: 'CG', niveau: 'Tle' })).toMatchObject({ bareme: 'note20', aVerifier: false })
  })

  it('le primaire est annoncé « à vérifier » plutôt que présenté comme officiel', () => {
    // Aucun texte accessible ne fixe le barème du primaire congolais. On applique
    // /20 mais on le DIT, au lieu de fabriquer une fausse certitude.
    expect(baremePour({ pays: 'CG', niveau: 'CP1' })).toMatchObject({ bareme: 'note20', aVerifier: true })
    expect(baremePour({ pays: 'CG', niveau: 'CM2' })).toMatchObject({ aVerifier: true })
  })

  it('CP1 est bien traité comme du primaire, pas comme un niveau inconnu', () => {
    expect(cycleDe('CP1', 'CG')).toBe('primaire')
    expect(cycleDe('CP2', 'CG')).toBe('primaire')
  })

  it('n’applique pas le pourcentage kinois à une école de Brazzaville', () => {
    expect(baremePour({ pays: 'CG', niveau: '3e' }).bareme).not.toBe('pourcent')
    expect(baremePour({ pays: 'CD', niveau: '3e' }).bareme).toBe('pourcent')
  })
})

describe('Congo-Brazzaville : examens nationaux', () => {
  it('propose CEPE, BEPC et Baccalauréat', () => {
    const labels = examTypesPays('CG').map((e) => e.label)
    expect(labels).toEqual(['CEPE', 'BEPC', 'Baccalauréat'])
  })

  it('n’affiche ni le Probatoire camerounais ni l’EXETAT congolais de Kinshasa', () => {
    const labels = examTypesPays('CG').map((e) => e.label)
    expect(labels).not.toContain('Probatoire')
    expect(labels).not.toContain('EXETAT')
    expect(labels).not.toContain('ENAFEP')
  })

  it('rattache chaque examen à la classe où il se passe', () => {
    const parCle = Object.fromEntries(EXAM_TYPES_PAR_PAYS.CG.map((e) => [e.label, e.niveau]))
    expect(parCle).toEqual({ CEPE: 'CM2', BEPC: '3e', 'Baccalauréat': 'Tle' })
  })

  it('un pays inconnu ne doit pas se faire passer pour le Congo', () => {
    // `examTypesPays` a un repli camerounais : sans ce test, la liste congolaise
    // pourrait ne jamais être servie sans que rien ne le signale.
    expect(examTypesPays('CG')).not.toBe(examTypesPays('XX'))
  })
})

describe('Congo-Brazzaville : calendrier', () => {
  it('connaît les six jours fériés à date fixe de la loi n° 2-94', () => {
    const feries = HOLIDAYS_BY_COUNTRY.CG
    expect(feries).toHaveLength(6)
    expect(feries.find((f) => f.month === 6 && f.day === 10)).toBeDefined()
    expect(feries.find((f) => f.month === 8 && f.day === 15).name).toBe('Fête nationale')
  })

  it('n’importe pas les fêtes d’un autre pays', () => {
    const noms = HOLIDAYS_BY_COUNTRY.CG.map((f) => f.name).join(' ')
    expect(noms).not.toMatch(/Jeunesse/i) // 11 février, Cameroun
    expect(HOLIDAYS_BY_COUNTRY.CG.find((f) => f.month === 8 && f.day === 7)).toBeUndefined() // 7 août, Côte d'Ivoire
  })
})
