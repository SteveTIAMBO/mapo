import { describe, it, expect } from 'vitest'
import { fmtMontant, symboleDevise, DEVISES } from '../utils/monnaie'

/**
 * Devise de l'école.
 *
 * Le défaut : l'écran Paramètres proposait sept devises, enregistrait le choix,
 * et huit formateurs écrivaient « FCFA » ou « XAF » en dur. Une école de Kinshasa
 * choisissait le franc congolais et imprimait quand même des reçus en FCFA. Le
 * réglage confirmait la sauvegarde et n'avait aucun effet : c'est le pire genre
 * de faux paramètre, parce que le prospect a vu le menu déroulant en démonstration.
 */

describe('symbole de la devise', () => {
  it('les deux zones franc CFA affichent FCFA, mais ne sont pas la même monnaie', () => {
    // XAF = Afrique centrale (BEAC), XOF = Afrique de l'Ouest (BCEAO). Même
    // sigle à l'écran, deux devises distinctes dans les données.
    expect(symboleDevise('XAF')).toBe('FCFA')
    expect(symboleDevise('XOF')).toBe('FCFA')
    expect(DEVISES).toContain('XAF')
    expect(DEVISES).toContain('XOF')
  })

  it('le franc congolais n’est pas le franc CFA', () => {
    expect(symboleDevise('CDF')).not.toBe('FCFA')
  })

  it('couvre les sept devises du menu déroulant', () => {
    for (const d of ['XAF', 'XOF', 'CDF', 'EUR', 'USD', 'GHS', 'NGN']) {
      expect(DEVISES, `${d} doit être proposable`).toContain(d)
    }
  })

  it('un code inconnu s’affiche tel quel plutôt que de mentir', () => {
    expect(symboleDevise('ZZZ')).toBe('ZZZ')
  })
})

describe('montants', () => {
  it('respecte la devise de l’école', () => {
    expect(fmtMontant(150000, 'XAF')).toContain('FCFA')
    expect(fmtMontant(150000, 'CDF')).toContain('FC')
    expect(fmtMontant(150000, 'EUR')).toContain('€')
  })

  it('ne laisse pas passer l’espace fine insécable, illisible dans les PDF', () => {
    // Le séparateur fr-FR est U+202F, qui s'affiche parfois comme « / » selon la
    // police, notamment dans jsPDF. Piège déjà rencontré ailleurs dans l'app.
    const s = fmtMontant(1234567, 'XAF')
    expect(s).not.toMatch(/[   ]/)
    expect(s).toBe('1 234 567 FCFA')
  })

  it('pas de centimes sur les monnaies qui n’en ont pas l’usage', () => {
    expect(fmtMontant(150000, 'XAF')).toBe('150 000 FCFA')
    expect(fmtMontant(1500.5, 'XAF')).toBe('1 501 FCFA')
  })

  it('des centimes sur l’euro quand il y en a', () => {
    expect(fmtMontant(9.99, 'EUR')).toBe('9,99 €')
    expect(fmtMontant(10, 'EUR')).toBe('10 €')
  })

  it('une école qui n’a rien choisi ne voit pas des euros', () => {
    // MAPO est un produit d'Afrique centrale d'abord : le repli doit rester XAF.
    expect(fmtMontant(1000, undefined)).toContain('FCFA')
    expect(fmtMontant(1000, '')).toContain('FCFA')
  })

  it('ne casse pas sur une valeur absente', () => {
    expect(fmtMontant(null, 'XAF')).toBe('0 FCFA')
    expect(fmtMontant(undefined, 'XAF')).toBe('0 FCFA')
  })
})
