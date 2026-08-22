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
  it('aucune retenue inventée pour la Côte d’Ivoire ou la RD Congo', () => {
    // Le Sénégal figurait ici avant le 22/08 ; il est désormais sourcé.
    for (const pays of ['CI', 'CD', '']) {
      const d = calculPaie({ brut: 300000, pays })
      expect(d.paysCouvert).toBe(false)
      expect(d.net).toBe(300000)      // on n'invente rien
      expect(d.lignes).toHaveLength(0)
    }
  })

  it('paysCouvert permet à l’écran de le DIRE plutôt que d’afficher un faux bulletin', () => {
    expect(paysCouvert('CG')).toBe(true)
    expect(paysCouvert('cg')).toBe(true) // insensible à la casse
    expect(paysCouvert('SN')).toBe(true)
    expect(paysCouvert('FR')).toBe(true)
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

describe('Sénégal : cotisations CLEISS 2026 + impôt du CGI', () => {
  it('IPRES 5,6 % plafonnée à 432 000', () => {
    expect(calculPaie({ brut: 400000, pays: 'SN' }).totalCotisations).toBe(22400)
    expect(calculPaie({ brut: 1000000, pays: 'SN' }).totalCotisations).toBe(24192) // plafonnée
  })

  it('⚠️ la cotisation maladie IPM n’est PAS codée : c’est une FOURCHETTE', () => {
    // Le CLEISS donne 2 % à 7,5 % côté salarié, selon l'institution dont relève
    // l'entreprise. Une fourchette n'est pas un taux : en retenir un au hasard
    // donnerait un net faux avec l'apparence de l'exactitude.
    const codes = calculPaie({ brut: 400000, pays: 'SN' }).lignes.map((l) => l.code)
    expect(codes).toEqual(['IPRES'])
  })

  it('applique un barème ANNUEL à un salaire mensuel', () => {
    // L'appliquer tel quel placerait tout le monde dans la tranche à 0 %.
    const d = calculPaie({ brut: 400000, pays: 'SN' })
    expect(d.impot).toBeGreaterThan(0)
    // 400 000 − 22 400 = 377 600/mois → 4 531 200/an ; abattement plafonné à
    // 900 000 → assiette 3 631 200 ; barème → 813 360/an, soit 67 780/mois.
    expect(d.impot).toBe(67780)
  })

  it('l’abattement de 30 % est PLAFONNÉ à 900 000 par an', () => {
    // Sans plafond, les hauts salaires seraient nettement sous-imposés.
    const petit = calculPaie({ brut: 150000, pays: 'SN' })
    const gros = calculPaie({ brut: 2000000, pays: 'SN' })
    expect(gros.impot / gros.brut).toBeGreaterThan(petit.impot / petit.brut)
  })
})

describe('France : tranches et assiette partielle', () => {
  it('la CSG porte sur 98,25 % du brut, pas sur 100 %', () => {
    const csg = calculPaie({ brut: 3000, pays: 'FR' }).lignes.find((l) => l.code === 'CSG_CRDS')
    expect(csg.assiette).toBeCloseTo(3000 * 0.9825, 2)
    expect(csg.montant).toBe(Math.round(3000 * 0.9825 * 0.097))
  })

  it('la tranche 2 de retraite ne porte QUE sur la part au-dessus du plafond', () => {
    // Sans plancher, elle porterait sur le salaire entier : un cadre verrait une
    // retenue largement surestimée.
    const sous = calculPaie({ brut: 3000, pays: 'FR' }).lignes.find((l) => l.code === 'RETR_T2')
    const dessus = calculPaie({ brut: 5000, pays: 'FR' }).lignes.find((l) => l.code === 'RETR_T2')
    expect(sous.montant).toBe(0)
    expect(dessus.montant).toBe(Math.round((5000 - 4005) * 0.0864))
  })

  it('un net plausible : environ 21 % de retenues sur un salaire courant', () => {
    const d = calculPaie({ brut: 3000, pays: 'FR' })
    expect(d.totalCotisations / d.brut).toBeGreaterThan(0.19)
    expect(d.totalCotisations / d.brut).toBeLessThan(0.23)
  })

  it('⚠️ pas de barème d’impôt, et ce n’est pas un manque', () => {
    // Prélèvement à la source : l'employeur applique un taux PROPRE À CHAQUE
    // salarié, transmis par l'administration. Aucun barème ne peut le remplacer.
    const d = calculPaie({ brut: 3000, pays: 'FR' })
    expect(d.impotNonParametre).toBe(true)
    expect(calculPaie({ brut: 3000, pays: 'FR', tauxImpotEcole: 0.06 }).impot).toBeGreaterThan(0)
  })

  it('les charges patronales françaises ne sont pas affirmées', () => {
    // Leurs taux dépendent du salaire, de l'effectif et du secteur : une liste
    // « moyenne » serait fausse pour tout le monde.
    expect(calculPaie({ brut: 3000, pays: 'FR' }).employeur).toEqual([])
  })
})
