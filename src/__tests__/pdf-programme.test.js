/**
 * Import du programme depuis un PDF — sélection de la partie utile.
 *
 * ⚠️ CE QUI REND CE FICHIER NÉCESSAIRE. Le serveur ne garde que 4 000
 * caractères du descriptif. Un PDF de programme en fait dix fois plus, et ses
 * premières pages sont une COUVERTURE, un mot du directeur, une charte
 * graphique. Tronquer au début aurait donc envoyé à l'IA très exactement la
 * partie qui ne contient aucun module — et elle serait retombée sur son
 * comportement par défaut : inventer un programme plausible. L'import aurait
 * eu l'air de marcher.
 */
import { describe, it, expect } from 'vitest'
import {
  densiteProgramme, resumerProgramme, refusFichier,
  BUDGET_TEXTE, MAX_OCTETS,
} from '../utils/pdfProgramme'

// Un PDF d'école réaliste : beaucoup de préambule, la maquette au milieu.
const COUVERTURE = 'INSTITUT SUPERIEUR DE MANAGEMENT. Excellence, ambition, avenir. '
  + 'Le mot du directeur. Depuis sa fondation, notre institut accompagne des femmes et des '
  + 'hommes vers les plus hautes responsabilites. Notre campus, nos partenariats '
  + 'internationaux et notre reseau d anciens font la force de notre pedagogie. '
const MAQUETTE = 'Maquette pedagogique. Semestre 1 : UE1 Strategie d entreprise 6 ECTS, '
  + 'UE2 Comptabilite analytique 4 credits, UE3 Marketing digital 5 ECTS. '
  + 'Semestre 2 : UE4 Droit des affaires, UE5 Gestion de projet, volume horaire 30h, '
  + 'coefficient 2. Modules optionnels : Negociation, Data analytics. '
const ANNEXES = 'Modalites d inscription. Les frais de dossier sont a regler avant le 30 septembre. '
  + 'Les candidats etrangers joindront une traduction assermentee de leurs diplomes. '

const bourrage = (s, n) => s.repeat(n)

describe('reconnaître une maquette d’une page de garde', () => {
  it('la maquette est plus dense que la couverture', () => {
    expect(densiteProgramme(MAQUETTE)).toBeGreaterThan(densiteProgramme(COUVERTURE))
  })

  it('un texte vide vaut zéro, sans exploser', () => {
    for (const x of ['', '   ', null, undefined]) expect(densiteProgramme(x)).toBe(0)
  })

  it('les accents ne changent rien : « unité » compte comme « unite »', () => {
    expect(densiteProgramme('Unité d’enseignement, crédits')).toBeGreaterThan(0)
  })
})

describe('⚠️ on garde la maquette, pas la couverture', () => {
  it('la partie retenue contient les modules, pas le mot du directeur', () => {
    const doc = bourrage(COUVERTURE, 40) + MAQUETTE + bourrage(ANNEXES, 40)
    expect(doc.length).toBeGreaterThan(BUDGET_TEXTE * 3)
    const retenu = resumerProgramme(doc)
    expect(retenu).toContain('Strategie d entreprise')
    expect(retenu).toContain('Droit des affaires')
    expect(retenu.length).toBeLessThanOrEqual(BUDGET_TEXTE)
  })

  it('tronquer au début aurait échoué — c’est le défaut qu’on évite', () => {
    const doc = bourrage(COUVERTURE, 40) + MAQUETTE + bourrage(ANNEXES, 40)
    const naif = doc.slice(0, BUDGET_TEXTE)
    expect(naif).not.toContain('Strategie d entreprise')
    expect(resumerProgramme(doc)).toContain('Strategie d entreprise')
  })

  it('un texte déjà court passe tel quel', () => {
    expect(resumerProgramme(MAQUETTE)).toContain('UE1')
    expect(resumerProgramme(MAQUETTE).length).toBeLessThanOrEqual(BUDGET_TEXTE)
  })

  it('les espaces multiples et les sauts de ligne sont normalisés', () => {
    expect(resumerProgramme('UE1   Strategie\n\n\tMarketing')).toBe('UE1 Strategie Marketing')
  })

  it('rien n’entre, rien ne sort', () => {
    for (const x of [null, undefined, '']) expect(resumerProgramme(x)).toBe('')
  })

  it('le budget est respecté même sur un document énorme', () => {
    const enorme = bourrage(MAQUETTE + COUVERTURE, 400)
    expect(enorme.length).toBeGreaterThan(200000) // ~230 000 caractères
    expect(resumerProgramme(enorme).length).toBeLessThanOrEqual(BUDGET_TEXTE)
  })
})

describe('ce qu’on refuse, et ce qu’on en dit', () => {
  const fichier = (nom, type, size = 1000) => ({ name: nom, type, size })

  it('un PDF est accepté, par son type comme par son extension', () => {
    expect(refusFichier(fichier('programme.pdf', 'application/pdf'))).toBe('')
    expect(refusFichier(fichier('programme.PDF', ''))).toBe('')
  })

  it('un document Word est refusé pour son FORMAT', () => {
    expect(refusFichier(fichier('programme.docx', 'application/msword'))).toBe('format')
  })

  it('un fichier trop lourd est refusé pour sa TAILLE, pas son format', () => {
    // Deux refus différents, deux messages différents : « ce n'est pas un PDF »
    // et « ce PDF est trop lourd » n'appellent pas la même action.
    expect(refusFichier(fichier('programme.pdf', 'application/pdf', MAX_OCTETS + 1))).toBe('taille')
  })

  it('aucun fichier du tout se dit aussi', () => {
    expect(refusFichier(null)).toBe('aucun')
  })
})
