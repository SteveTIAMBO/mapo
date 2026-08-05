import { describe, it, expect } from 'vitest'
import {
  CYCLES, niveauxPourCycle, cycleDuNiveau, NIVEAU_HORS_CATALOGUE,
} from '../stores/enfantsAutonomes'

/**
 * Cycle → classes. Le menu unique qui mélangeait CM1, Terminale et Master est
 * remplacé par un choix de cycle qui filtre les classes.
 *
 * Le point délicat n'est pas le filtrage : c'est `cycleDuNiveau`. Les profils
 * déjà créés portent une classe mais rarement un cycle — le champ ne leur avait
 * jamais été demandé. Si la déduction échoue, ouvrir leur profil afficherait un
 * cycle vide, donc une liste de classes vide, et confirmer effacerait leur
 * niveau. On teste donc surtout qu'aucun élève existant ne se retrouve orphelin.
 */

describe('cycle → classes', () => {
  it('ne propose que les classes du cycle demandé', () => {
    const primaire = niveauxPourCycle('primaire', 'CM')
    const secondaire = niveauxPourCycle('secondaire', 'CM')
    expect(primaire).toContain('CM1')
    expect(primaire.some((n) => secondaire.includes(n))).toBe(false)
    expect(secondaire).not.toContain('CM1')
  })

  it('suit le pays : la France n’a ni SIL ni 6ème avec accent', () => {
    expect(niveauxPourCycle('primaire', 'FR')).not.toContain('SIL')
    expect(niveauxPourCycle('primaire', 'CM')).toContain('SIL')
    expect(niveauxPourCycle('secondaire', 'FR')).toContain('Terminale')
  })

  it('renvoie une liste vide pour un cycle inconnu, jamais une liste fourre-tout', () => {
    // Le repli dangereux serait de tout renvoyer : l'écran réafficherait le
    // mélange qu'on vient de supprimer.
    expect(niveauxPourCycle('', 'CM')).toEqual([])
    expect(niveauxPourCycle('college', 'CM')).toEqual([])
  })

  it('couvre les trois cycles annoncés', () => {
    for (const c of CYCLES) expect(niveauxPourCycle(c, 'CM').length).toBeGreaterThan(0)
  })
})

describe('cycle déduit d’une classe (profils déjà créés)', () => {
  it('retrouve le cycle des classes de chaque pays servi', () => {
    expect(cycleDuNiveau('CM1', 'CM')).toBe('primaire')
    expect(cycleDuNiveau('CM1', 'FR')).toBe('primaire')
    expect(cycleDuNiveau('5e', 'FR')).toBe('secondaire')
    expect(cycleDuNiveau('Terminale', 'FR')).toBe('secondaire')
    expect(cycleDuNiveau('Licence 2', 'CM')).toBe('superieur')
    expect(cycleDuNiveau('3e primaire', 'CD')).toBe('primaire')
  })

  it('rattache la formation hors catalogue au supérieur', () => {
    expect(cycleDuNiveau(NIVEAU_HORS_CATALOGUE, 'CM')).toBe('superieur')
  })

  it('retrouve le cycle même si l’enfant a changé de pays', () => {
    // Une classe camerounaise sur un profil passé en France : sans ce repli, le
    // cycle serait vide et la classe de l'enfant disparaîtrait de l'écran.
    expect(cycleDuNiveau('6ème', 'FR')).toBe('secondaire')
    expect(cycleDuNiveau('SIL', 'FR')).toBe('primaire')
  })

  it('ne devine rien sur une classe vide ou inconnue', () => {
    expect(cycleDuNiveau('', 'CM')).toBe('')
    expect(cycleDuNiveau('Classe de Poudlard', 'CM')).toBe('')
  })

  // La garantie qui compte vraiment : toute classe proposée par un écran doit
  // pouvoir être reconnue ensuite. Sinon un parent choisit une classe, revient,
  // et la trouve vide.
  it('reconnaît TOUTES les classes qu’il propose, pour chaque pays', () => {
    for (const pays of ['CM', 'FR', 'SN', 'CI', 'CD']) {
      for (const cycle of CYCLES) {
        for (const niveau of niveauxPourCycle(cycle, pays)) {
          expect(cycleDuNiveau(niveau, pays), `${pays} / ${niveau}`).toBe(cycle)
        }
      }
    }
  })
})
