import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PAYS_DEMO, CODES_PAYS_DEMO, packPays, localiserNom, localiserNomComplet } from '../data/paysDemo'
import { NOMS_REFERENCE } from '../data/nomsDemo'

/**
 * Démonstration multi-pays : on choisit un pays sur l'écran de connexion et
 * TOUTE la démo bascule.
 *
 * Les deux risques réels, tous deux muets :
 *   - l'HYBRIDE : une école de Pointe-Noire remplie d'élèves camerounais, parce
 *     que les données déjà enregistrées auraient été relues telles quelles ;
 *   - l'IDENTITÉ INSTABLE : le même professeur affiché sous deux noms selon
 *     l'écran, parce que la substitution de nom ne serait pas déterministe.
 */

describe('packs pays', () => {
  it('le Cameroun est la RÉFÉRENCE : il ne renomme rien et ne suffixe rien', () => {
    // Sinon la démo camerounaise validée depuis des mois changerait de contenu.
    expect(PAYS_DEMO.CM.suffixe).toBe('')
    expect(PAYS_DEMO.CM.nomsFamille).toBeNull()
    expect(PAYS_DEMO.CM.classesPrimaire).toBeNull()
  })

  it('chaque pays a un espace de stockage distinct', () => {
    const suffixes = CODES_PAYS_DEMO.map((c) => PAYS_DEMO[c].suffixe)
    expect(new Set(suffixes).size).toBe(suffixes.length)
  })

  it('un code inconnu retombe sur le Cameroun plutôt que de casser la démo', () => {
    expect(packPays('XX').code).toBe('CM')
    expect(packPays('').code).toBe('CM')
    expect(packPays('cg').code).toBe('CG') // insensible à la casse
  })

  it('le Congo a son identité propre : ville, indicatif, directeur', () => {
    const e = PAYS_DEMO.CG.ecole
    expect(e.city).toBe('Pointe-Noire')
    expect(e.phone.startsWith('+242')).toBe(true)
    expect(e.country).toBe('CG')
  })

  it('le primaire congolais commence à CP1, jamais à la SIL', () => {
    const niveaux = PAYS_DEMO.CG.classesPrimaire.map((c) => c.level)
    expect(niveaux[0]).toBe('CP1')
    expect(niveaux).not.toContain('SIL')
  })

  it('⚠️ le primaire congolais n’est PAS mis en mode APC', () => {
    // L'APC est le bulletin camerounais. Rien ne dit que le Congo l'applique,
    // et son barème du primaire est introuvable : on n'affirme rien.
    expect(PAYS_DEMO.CG.ecolePrimaire.gradingMode).toBe('notes')
  })
})

describe('substitution des noms : déterministe, donc stable', () => {
  it('un nom donne toujours le même équivalent', () => {
    const a = localiserNom('Kamga', NOMS_REFERENCE, PAYS_DEMO.CG)
    const b = localiserNom('Kamga', NOMS_REFERENCE, PAYS_DEMO.CG)
    expect(a).toBe(b)
    expect(a).not.toBe('Kamga')
  })

  it('deux noms différents ne se confondent pas', () => {
    // Sans cela, deux professeurs distincts porteraient le même nom au Congo.
    const vus = NOMS_REFERENCE.map((n) => localiserNom(n, NOMS_REFERENCE, PAYS_DEMO.CG))
    expect(new Set(vus).size).toBe(NOMS_REFERENCE.length)
  })

  it('la liste du Congo couvre toute la liste de référence', () => {
    // Une liste plus courte ferait boucler la substitution et créerait des
    // homonymes silencieux entre un élève et un membre du personnel.
    expect(PAYS_DEMO.CG.nomsFamille.length).toBe(NOMS_REFERENCE.length)
  })

  it('ne touche qu’au nom de famille, jamais au prénom', () => {
    const r = localiserNomComplet('Jean Kamga', NOMS_REFERENCE, PAYS_DEMO.CG)
    expect(r.startsWith('Jean ')).toBe(true)
    expect(r).not.toContain('Kamga')
  })

  it('un nom inconnu est laissé tel quel, pas remplacé au hasard', () => {
    expect(localiserNom('Dupont', NOMS_REFERENCE, PAYS_DEMO.CG)).toBe('Dupont')
    expect(localiserNomComplet('Marie Dupont', NOMS_REFERENCE, PAYS_DEMO.CG)).toBe('Marie Dupont')
  })

  it('le Cameroun ne modifie rien du tout', () => {
    expect(localiserNom('Kamga', NOMS_REFERENCE, PAYS_DEMO.CM)).toBe('Kamga')
    expect(localiserNomComplet('Jean Kamga', NOMS_REFERENCE, PAYS_DEMO.CM)).toBe('Jean Kamga')
  })

  it('résiste à un nom vide ou à un prénom seul, sans planter', () => {
    expect(localiserNomComplet('', NOMS_REFERENCE, PAYS_DEMO.CG)).toBe('')
    expect(localiserNomComplet('Madame', NOMS_REFERENCE, PAYS_DEMO.CG)).toBe('Madame')
  })
})

describe('liste de référence', () => {
  it('ne contient aucun doublon : l’ordre est la clé de correspondance', () => {
    expect(new Set(NOMS_REFERENCE).size).toBe(NOMS_REFERENCE.length)
  })

  it('les 35 premiers restent les noms d’élèves', () => {
    // Le tirage des élèves ne prend que ces 35 : décaler cette frontière ferait
    // apparaître des noms réservés au personnel parmi les élèves.
    expect(NOMS_REFERENCE.slice(0, 35)).toContain('Kamga')
    expect(NOMS_REFERENCE.slice(0, 35)).not.toContain('Tiambo')
  })
})

describe('isolation du stockage par pays', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('les clés de démo portent le suffixe du pays', async () => {
    const { demoKey, setPaysDemo, paysDemo } = await import('../utils/demoScope')
    expect(paysDemo()).toBe('CM')
    expect(demoKey('mapo_demo_classes')).toBe('mapo_demo_classes')
    setPaysDemo('CG')
    expect(demoKey('mapo_demo_classes')).toBe('mapo_demo_classes_cg')
  })

  it('un pays inconnu ne fabrique pas un suffixe fantaisiste', async () => {
    const { demoKey, setPaysDemo } = await import('../utils/demoScope')
    setPaysDemo('XX')
    expect(demoKey('mapo_demo_classes')).toBe('mapo_demo_classes')
  })
})
