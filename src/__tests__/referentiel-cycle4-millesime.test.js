/**
 * Cycle 4 : deux millésimes coexistent, et c'est voulu.
 *
 * Les nouveaux programmes de français, mathématiques et langues entrent par
 * paliers — 5e à la rentrée 2026, 4e en 2027, 3e en 2028. Seuls les nouveaux
 * étaient intégrés : `trouver()` les écartait donc correctement pour la 4e et
 * la 3e… qui se retrouvaient SANS AUCUN programme applicable. Deux classes
 * entières révisaient en génération libre, sans que rien ne le signale.
 *
 * Ces tests vérifient que chaque classe reçoit le millésime EN VIGUEUR pour
 * elle — pas le plus récent, pas le plus ancien.
 */
import { describe, it, expect } from 'vitest'
import { sourceOfficielle, notionsOfficielles } from '../utils/referentiel'

const REN_2026 = new Date('2026-10-01') // année scolaire 2026-2027
const src = (niveau, matiere) => sourceOfficielle({ pays: 'FR', niveau, matiere, date: REN_2026 })
const notions = (niveau, matiere) => notionsOfficielles({ pays: 'FR', niveau, matiere, date: REN_2026 }) || []

const MATIERES = ['Mathématiques', 'Français', 'Anglais (LV1)', 'Espagnol (LV2)']

describe('4e et 3e ne révisent plus sans programme', () => {
  for (const cl of ['4e', '3e']) {
    it(`${cl} : les quatre matières fondamentales sont cadrées`, () => {
      for (const m of MATIERES) {
        expect(src(cl, m), `${cl} · ${m}`).toBeTruthy()
        expect(notions(cl, m).length).toBeGreaterThan(5)
      }
    })

    it(`${cl} : c'est bien le programme EN VIGUEUR (2020), pas celui à venir`, () => {
      for (const m of MATIERES) {
        expect(src(cl, m).bo).toMatch(/2020/)
      }
    })
  }
})

describe('la 5e garde le programme neuf : aucune régression', () => {
  it('elle ne bascule pas sur le millésime 2020', () => {
    for (const m of MATIERES) {
      expect(src('5e', m)).toBeTruthy()
      expect(src('5e', m).bo).not.toMatch(/2020/)
    }
  })
})

describe('LV1 et LV2 ne visent pas le même niveau', () => {
  it('la LV2 ne reçoit pas les attendus B1 réservés à la LV1', () => {
    const lv1 = notions('4e', 'Anglais (LV1)').map((n) => n.notion).join(' ')
    const lv2 = notions('4e', 'Espagnol (LV2)').map((n) => n.notion).join(' ')
    expect(lv1).not.toBe(lv2)
    // Le descripteur A1 le plus élémentaire appartient à la LV2, pas à la LV1.
    expect(lv2).toMatch(/expressions et phrases simples isolées/i)
    expect(lv1).not.toMatch(/expressions et phrases simples isolées/i)
  })

  it('allemand et italien suivent le même programme que l’espagnol', () => {
    for (const m of ['Allemand (LV2)', 'Italien (LV2)']) {
      expect(src('4e', m), m).toBeTruthy()
      expect(notions('4e', m).length).toBe(notions('4e', 'Espagnol (LV2)').length)
    }
  })
})
