import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codePays, codeTypeEcole, codeDevise, codeSystemes, codeSysteme, normaliserConfigEcole } from '../utils/normaliserConfigEcole'

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

describe('⚠️ les écoles DÉJÀ importées se réparent seules', () => {
  const store = lire('stores/school.js')

  it('la migration a lieu au chargement des réglages', () => {
    // Demander à chaque école de réimporter serait lui faire payer notre
    // défaut. On répare à la lecture.
    const i = store.indexOf('const loadSettings')
    const fin = store.indexOf('\n  const saveSettings', i)
    expect(store.slice(i, fin)).toContain('await migrerLibellesEnCodes()')
  })

  it('elle réécrit UNE fois, et seulement si quelque chose change', () => {
    // Sinon chaque ouverture de l'application déclencherait une écriture.
    const i = store.indexOf('async function migrerLibellesEnCodes')
    const bloc = store.slice(i, i + 1400)
    expect(bloc).toContain('if (!Object.keys(patch).length) return')
    expect(bloc).toContain('saveSettings(patch)')
  })

  it('un échec d’écriture ne rend pas l’école inutilisable', () => {
    const i = store.indexOf('async function migrerLibellesEnCodes')
    const bloc = store.slice(i, i + 1400)
    // La valeur est corrigée en mémoire AVANT la tentative d'écriture.
    expect(bloc.indexOf('schoolSettings.value = { ...schoolSettings.value, ...patch }'))
      .toBeLessThan(bloc.indexOf('saveSettings(patch)'))
    expect(bloc).toMatch(/catch \(e\)/)
  })

  it('⚠️ import DIFFÉRÉ : pas de cycle avec le store', () => {
    // `normaliserConfigEcole` lit COUNTRY_DEFAULTS et SCHOOL_TYPES exportés par
    // school.js. Un cycle ne casse pas le build — il casse au rendu.
    expect(store).not.toMatch(/^import .*normaliserConfigEcole/m)
    const i = store.indexOf('async function migrerLibellesEnCodes')
    expect(store.slice(i, i + 700)).toContain("await import('../utils/normaliserConfigEcole')")
  })

  it('rien n’est écrasé quand la valeur est déjà un code', () => {
    // `normaliserConfigEcole` rend le code tel quel : la comparaison
    // `valeur !== s[cle]` empêche toute écriture inutile.
    const i = store.indexOf('async function migrerLibellesEnCodes')
    expect(store.slice(i, i + 1400)).toContain('valeur !== s[cle]')
  })
})

/**
 * SYSTÈMES d'un établissement bilingue (06/09/2026).
 *
 * Le champ ouvre — ou n'ouvre pas — toute une fonctionnalité : un filtre et une
 * colonne dans une dizaine d'écrans. Deviner un second système à partir d'un
 * intitulé mal orthographié le ferait apparaître chez une école qui n'en a
 * qu'un. D'où : on reconnaît large, on refuse net, on n'invente jamais.
 */
describe('systèmes d’un établissement', () => {
  it('reconnaît les écritures que les écoles emploient vraiment', () => {
    expect(codeSystemes('francophone;anglophone').systemes).toEqual(['francophone', 'anglophone'])
    expect(codeSystemes('Francophone, Anglophone').systemes).toEqual(['francophone', 'anglophone'])
    expect(codeSystemes('FR / EN').systemes).toEqual(['francophone', 'anglophone'])
    expect(codeSystemes('français').systemes).toEqual(['francophone'])
    expect(codeSystemes('English').systemes).toEqual(['anglophone'])
  })

  it('« bilingue » vaut les deux — c’est le mot des écoles', () => {
    expect(codeSystemes('bilingue').systemes).toEqual(['francophone', 'anglophone'])
  })

  it('ne renvoie jamais de doublon', () => {
    expect(codeSystemes('francophone;francophone;FR').systemes).toEqual(['francophone'])
    expect(codeSystemes('bilingue;anglophone').systemes).toEqual(['francophone', 'anglophone'])
  })

  it('⚠️ un intitulé inconnu est SIGNALÉ, jamais deviné', () => {
    const r = codeSystemes('francophone;germanophone')
    expect(r.systemes).toEqual(['francophone'])
    expect(r.inconnus).toEqual(['germanophone'])
  })

  it('vide reste vide : pas de système par défaut', () => {
    expect(codeSystemes('').systemes).toEqual([])
    expect(codeSystemes(null).systemes).toEqual([])
    expect(codeSystemes(undefined).systemes).toEqual([])
  })

  it('sur UNE ligne, le système est unique ou absent', () => {
    expect(codeSysteme('anglophone')).toBe('anglophone')
    expect(codeSysteme('EN')).toBe('anglophone')
    expect(codeSysteme('')).toBe('')
    // Une classe ne peut pas être dans les deux : ambigu → vide, pas un choix au hasard.
    expect(codeSysteme('bilingue')).toBe('')
    expect(codeSysteme('germanophone')).toBe('')
  })

  it('la configuration remonte les systèmes et signale l’intrus', () => {
    const { valeurs, avertissements } = normaliserConfigEcole({ systemes: 'francophone;anglophone' })
    expect(valeurs.systemes).toEqual(['francophone', 'anglophone'])
    expect(avertissements).toEqual([])

    const r2 = normaliserConfigEcole({ systemes: 'francophone;klingon' })
    expect(r2.valeurs.systemes).toEqual(['francophone'])
    expect(r2.avertissements.some((a) => a.includes('klingon'))).toBe(true)
  })

  it('⚠️ une école qui ne déclare rien n’a PAS le champ — donc pas de mode bilingue', () => {
    const { valeurs } = normaliserConfigEcole({ schoolName: 'École ordinaire' })
    expect('systemes' in valeurs).toBe(false)
  })
})
