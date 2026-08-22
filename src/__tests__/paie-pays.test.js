import { describe, it, expect } from 'vitest'
import { BAREMES_PAIE, baremePaie, paysCouvert, calculPaie, fmtTaux } from '../utils/paie'

/**
 * Fiches de paie par pays.
 *
 * Le défaut : les DEUX générateurs de bulletin du dépôt appliquaient les taux
 * camerounais à toute école, quel que soit son pays. Pire, `SalaireView`
 * imprimait « Ce bulletin est conforme à la réglementation CEMAC en vigueur » —
 * une affirmation de conformité fausse.
 */

describe('Congo-Brazzaville : cotisations sourcées (CLEISS, 1er janvier 2023)', () => {
  it('retient la pension à 4 % et la santé à 2,27 %, pas la CNPS camerounaise', () => {
    const d = calculPaie({ brut: 300000, pays: 'CG' })
    const pension = d.lignes.find((l) => l.code === 'CNSS_PVID')
    const sante = d.lignes.find((l) => l.code === 'CAMU_RAMU')
    expect(pension.montant).toBe(12000)   // 300 000 × 4 %
    expect(sante.montant).toBe(6810)      // 300 000 × 2,27 %
    expect(d.totalCotisations).toBe(18810)
  })

  it('respecte DEUX plafonds différents : 1 200 000 pour la pension, 600 000 pour la santé', () => {
    // C'est le piège du barème congolais : un plafond unique donnerait faux.
    const d = calculPaie({ brut: 2000000, pays: 'CG' })
    expect(d.lignes.find((l) => l.code === 'CNSS_PVID').montant).toBe(48000)  // 1 200 000 × 4 %
    expect(d.lignes.find((l) => l.code === 'CAMU_RAMU').montant).toBe(13620)  // 600 000 × 2,27 %
    expect(d.lignes.every((l) => l.plafonne)).toBe(true)
  })

  it('⚠️ n’invente AUCUN impôt : deux sources se contredisent sur l’ITS', () => {
    const d = calculPaie({ brut: 300000, pays: 'CG' })
    expect(d.impot).toBe(0)
    expect(d.impotNonParametre).toBe(true) // l'écran DOIT le dire
  })

  it('utilise le taux de l’école quand elle en a saisi un', () => {
    const d = calculPaie({ brut: 300000, pays: 'CG', tauxImpotEcole: 0.05 })
    expect(d.impotNonParametre).toBe(false)
    expect(d.impot).toBe(Math.round((300000 - 18810) * 0.05))
  })

  it('les charges patronales congolaises totalisent bien 27,33 % sous plafond', () => {
    const d = calculPaie({ brut: 100000, pays: 'CG' })
    expect(d.totalEmployeur).toBe(27330)
  })
})

describe('Cameroun : le barème historique est conservé', () => {
  it('CNPS 4,2 % plafonnée à 750 000, IRPP progressif, CAC sur l’IRPP', () => {
    const d = calculPaie({ brut: 300000, pays: 'CM' })
    expect(d.lignes[0].montant).toBe(12600)
    expect(d.impotLibelle).toBe('IRPP')
    expect(d.impot).toBeGreaterThan(0)
    expect(d.additionnelle.montant).toBe(Math.round(d.impot * 0.10))
  })

  it('reste marqué SIMPLIFIÉ : le bulletin ne doit pas se prétendre officiel', () => {
    expect(calculPaie({ brut: 300000, pays: 'CM' }).simplifie).toBe(true)
    expect(calculPaie({ brut: 300000, pays: 'CG' }).simplifie).toBe(false)
  })
})

describe('un pays sans barème ne reçoit pas celui du voisin', () => {
  it('aucune retenue inventée pour la Côte d’Ivoire ou le Sénégal', () => {
    for (const pays of ['CI', 'SN', 'CD', '']) {
      const d = calculPaie({ brut: 300000, pays })
      expect(d.paysCouvert).toBe(false)
      expect(d.net).toBe(300000)      // on n'invente rien
      expect(d.lignes).toHaveLength(0)
    }
  })

  it('paysCouvert permet à l’écran de le DIRE plutôt que d’afficher un faux bulletin', () => {
    expect(paysCouvert('CG')).toBe(true)
    expect(paysCouvert('cg')).toBe(true) // insensible à la casse
    expect(paysCouvert('CI')).toBe(false)
  })

  it('chaque barème porte sa source : un taux sans source ne se vérifie pas', () => {
    for (const b of Object.values(BAREMES_PAIE)) expect(b.source.length).toBeGreaterThan(20)
    expect(baremePaie('CG').source).toContain('cleiss')
  })
})

describe('affichage des taux', () => {
  it('à la française, sans zéro inutile', () => {
    expect(fmtTaux(0.0227)).toBe('2,27 %')
    expect(fmtTaux(0.04)).toBe('4 %')
    expect(fmtTaux(0.1003)).toBe('10,03 %')
  })
})
