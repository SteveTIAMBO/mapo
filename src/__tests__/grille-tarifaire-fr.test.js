/**
 * Grille tarifaire FRANCE — décidée par Steve le 25/08/2026 : 5 / 12 / 19 €.
 *
 * ⚠️ CE QUE CES TESTS PROTÈGENT VRAIMENT. `prix` (XAF) et `prixEur` sont deux
 * DÉCISIONS COMMERCIALES, pas un taux de change. Le Cameroun reste à
 * 3 500 / 6 500 / 10 000 XAF, soit environ 5,3 / 9,9 / 15,2 € : le Français paie
 * donc PLUS cher le même quota de jetons, et c'est voulu.
 *
 * Sans ce fichier, quelqu'un finira par « harmoniser » les deux grilles en
 * croyant réparer une incohérence.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DATA = readFileSync(resolve(RACINE, 'server/mapo-offres-data.php'), 'utf8')

/** Lit une ligne d'offre/pack du catalogue PHP. */
function tarif(id) {
  const l = DATA.split('\n').find((x) => x.includes(`'id' => '${id}'`))
  if (!l) return null
  const nb = (cle) => {
    const m = l.match(new RegExp(`'${cle}' => ([0-9.]+)`))
    return m ? Number(m[1]) : null
  }
  return { prix: nb('prix'), prixEur: nb('prixEur'), tokens: nb('capTokens') ?? nb('tokens') }
}

describe('les trois paliers français', () => {
  it('le plancher est à 5 €', () => {
    expect(tarif('essentiel').prixEur).toBe(5)
  })

  it('le palier intermédiaire est à 12 €', () => {
    expect(tarif('avance').prixEur).toBe(12)
  })

  it('le plafond est à 19 €', () => {
    expect(tarif('illimite').prixEur).toBe(19)
  })

  it('la découverte reste gratuite des deux côtés', () => {
    expect(tarif('decouverte').prixEur).toBe(0)
    expect(tarif('decouverte').prix).toBe(0)
  })

  it('la grille monte, sans palier qui double un autre', () => {
    const p = ['decouverte', 'essentiel', 'avance', 'illimite'].map((x) => tarif(x).prixEur)
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThan(p[i - 1])
  })
})

describe('⚠️ les deux marchés ne se convertissent PAS l’un dans l’autre', () => {
  it('le Cameroun garde ses prix en francs, inchangés', () => {
    expect(tarif('essentiel').prix).toBe(3500)
    expect(tarif('avance').prix).toBe(6500)
    expect(tarif('illimite').prix).toBe(10000)
  })

  it('le Français paie PLUS cher le même quota, et c’est délibéré', () => {
    // ~656 XAF pour 1 €. Premium : 10 000 XAF ≈ 15,2 €, vendu 19 € en France.
    const premium = tarif('illimite')
    expect(premium.prixEur).toBeGreaterThan(premium.prix / 656)
    // Et le quota de jetons est bien le MÊME des deux côtés : une seule offre,
    // deux prix. Aligner les prix reviendrait à effacer la décision.
    expect(premium.tokens).toBe(600000)
  })

  it('le fichier dit pourquoi, pour qu’on ne « corrige » pas l’écart', () => {
    expect(DATA).toMatch(/NE SE CONVERTISSENT PAS L'UNE DANS L'AUTRE/)
  })
})

describe('ce que Stripe exige', () => {
  it('chaque palier payant dépasse le minimum de 0,50 €', () => {
    // En dessous, `mapo-pay-stripe.php` refuse avec `montant_invalide`.
    for (const id of ['essentiel', 'avance', 'illimite']) {
      expect(Math.round(tarif(id).prixEur * 100), id).toBeGreaterThanOrEqual(50)
    }
  })

  it('⚠️ la petite recharge reste à 1,99 €, sous le plancher annoncé', () => {
    // Constaté et signalé le 25/08 : Steve a choisi de ne changer QUE les
    // abonnements. À 1,99 €, les frais Stripe (0,25 € + 1,5 %) prennent ~15 %
    // de la vente. Le test fige le choix pour qu'il reste visible, pas pour
    // le valider.
    expect(tarif('pack_s').prixEur).toBe(1.99)
  })
})
