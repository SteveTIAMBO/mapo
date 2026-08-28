import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codePays, codeTypeEcole, codeDevise, normaliserConfigEcole } from '../utils/normaliserConfigEcole'

/**
 * L'école écrit des LIBELLÉS, l'application lit des CODES (28/08/2026).
 *
 * Steve, après l'import réel : « l'import n'a pas rempli les infos de
 * l'établissement ». La donnée ÉTAIT là — `country: "Cameroun"`,
 * `schoolType: "École primaire"`, `currency: "FCFA"` — mais les trois listes
 * déroulantes de Paramètres attendent `CM`, `ecole_primaire`, `XAF`. Elles
 * s'affichaient donc vides.
 *
 * C'est pire qu'une absence : une valeur illisible occupe la place, et
 * `country` pilote AUSSI le programme du primaire, le barème de paie et les
 * niveaux. L'école camerounaise recevait l'amorce neutre au lieu du programme
 * MINEDUB, sans que rien ne le signale.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8')

describe('pays : du libellé au code ISO', () => {
  it('reconnaît le nom, le code et les variantes usuelles', () => {
    for (const v of ['Cameroun', 'cameroun', 'CAMEROUN', 'Cameroon', 'CM', 'cm', ' Cameroun ']) {
      expect(codePays(v), String(v)).toBe('CM')
    }
    expect(codePays('Sénégal')).toBe('SN')
    expect(codePays("Côte d'Ivoire")).toBe('CI')
    expect(codePays('Congo')).toBe('CG')
  })

  it('⚠️ un pays inconnu rend vide — on ne devine pas', () => {
    // Deviner « CM » par défaut donnerait un barème de paie camerounais à une
    // école qui n'est pas au Cameroun : un bulletin de paie faux, plausible.
    for (const v of ['', null, undefined, 'Zorglubie', 'XX']) {
      expect(codePays(v), String(v)).toBe('')
    }
  })
})

describe('type d’établissement', () => {
  it('reconnaît le libellé affiché comme la clé', () => {
    expect(codeTypeEcole('École primaire')).toBe('ecole_primaire')
    expect(codeTypeEcole('ecole primaire')).toBe('ecole_primaire')
    expect(codeTypeEcole('ecole_primaire')).toBe('ecole_primaire')
    expect(codeTypeEcole('Collège privé')).toBe('college_prive')
  })

  it('un type inconnu rend vide', () => {
    expect(codeTypeEcole('École géniale')).toBe('')
  })
})

describe('⚠️ « FCFA » ne désigne pas UNE monnaie', () => {
  it('c’est le pays qui tranche entre XAF et XOF', () => {
    // Afrique centrale et Afrique de l'Ouest emploient le même mot pour deux
    // monnaies distinctes.
    expect(codeDevise('FCFA', 'CM')).toBe('XAF')
    expect(codeDevise('FCFA', 'CG')).toBe('XAF')
    expect(codeDevise('FCFA', 'SN')).toBe('XOF')
    expect(codeDevise('FCFA', 'CI')).toBe('XOF')
  })

  it('sans pays reconnu, on rend vide plutôt qu’une monnaie tirée au sort', () => {
    // Une devise fausse se propage dans les reçus et les fiches de paie.
    expect(codeDevise('FCFA', '')).toBe('')
    expect(codeDevise('CFA', 'XX')).toBe('')
  })

  it('un code ISO déjà correct passe tel quel', () => {
    expect(codeDevise('XAF', 'CM')).toBe('XAF')
    expect(codeDevise('eur', '')).toBe('EUR')
  })
})

describe('normaliserConfigEcole', () => {
  it('convertit les trois champs du classeur réel', () => {
    const { valeurs } = normaliserConfigEcole({
      country: 'Cameroun', schoolType: 'École primaire', currency: 'FCFA',
    })
    expect(valeurs).toEqual({ country: 'CM', schoolType: 'ecole_primaire', currency: 'XAF' })
  })

  it('⚠️ ce qui n’est pas reconnu est DIT, pas avalé', () => {
    // Sinon l'école ne sait pas qu'il lui reste trois champs à choisir.
    const { valeurs, avertissements } = normaliserConfigEcole({
      country: 'Zorglubie', schoolType: 'École géniale', currency: 'Cauris',
    })
    expect(valeurs).toEqual({})
    expect(avertissements).toHaveLength(3)
    expect(avertissements.join(' ')).toContain('Zorglubie')
  })

  it('un champ vide ne produit pas d’avertissement', () => {
    const { avertissements } = normaliserConfigEcole({})
    expect(avertissements).toEqual([])
  })
})

describe('l’import utilise bien cette normalisation', () => {
  const vue = lire('views/ImportView.vue')

  it('plus d’écriture brute de country / schoolType / currency', () => {
    expect(vue).not.toContain("set('country', row.country)")
    expect(vue).not.toContain("set('schoolType', row.schoolType)")
    expect(vue).not.toContain("set('currency', row.currency)")
    expect(vue).toContain('normaliserConfigEcole(row)')
  })

  it('les avertissements remontent dans le compte rendu', () => {
    expect(vue).toContain('alertes.push(...avertissements)')
    const i = vue.indexOf('function resume(')
    expect(vue.slice(i, i + 420)).toContain('alertes')
  })
})

describe('⚠️ la liste des matières de l’école REMPLACE l’amorce au premier import', () => {
  const store = lire('stores/disciplinesPrimaire.js')
  const vue = lire('views/ImportView.vue')

  it('le store sait définir la liste entière', () => {
    expect(store).toContain('function definir(')
    expect(store).toMatch(/ajouter,\s*definir,/)
  })

  it('mais REFUSE d’écraser une liste déjà personnalisée', () => {
    // Un fichier où un seul enseignant déclare « EPS » réduirait sinon le
    // programme de l'école à une ligne.
    const i = store.indexOf('function definir(')
    expect(store.slice(i, i + 200)).toContain('if (personnalise.value) return false')
  })

  it('l’import essaie « définir » d’abord, « ajouter » ensuite', () => {
    const i = vue.indexOf('discPrimaire.definir(')
    expect(i).toBeGreaterThan(0)
    expect(vue.indexOf('discPrimaire.ajouter(')).toBeGreaterThan(i)
  })
})
