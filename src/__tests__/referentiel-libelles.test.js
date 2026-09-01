/**
 * Le référentiel se trouve quelle que soit L'ÉCRITURE de la classe.
 *
 * ⚠️ DÉFAUT MESURÉ LE 01/09/2026, resté muet des mois. `trouver()` comparait la
 * classe par ÉGALITÉ STRICTE (`x.classes[cl]`) alors que la matière, elle,
 * passait par une normalisation. Or nos référentiels portent les DEUX écritures :
 * « 5e » côté France, « 5ème » côté Cameroun. Un profil français dont la classe
 * était saisie « 5ème » ne rencontrait donc JAMAIS le programme français.
 *
 * Avant correctif : `{FR, '5ème', Mathématiques}` → **0 notion**, `{FR, '5e', …}`
 * → 14. Et l'échec ne se voit pas : la séance part en génération libre et
 * ressemble à une séance normale.
 *
 * LE PRIX, mesuré dans le registre qualité serveur (`mapo-qualite.json`) :
 *   — avec référentiel : 49 questions gardées, 8 rejetées → **14 % de rejet** ;
 *   — sans référentiel : 89 gardées, 64 rejetées → **42 % de rejet**.
 * Trois fois plus de déchet, et des séances qui reviennent courtes.
 *
 * Même famille que le bug SVT (l'app disait « Sciences de la vie et de la Terre
 * (SVT) », le référentiel disait « SVT ») — mais côté CLASSE cette fois.
 */
import { describe, it, expect } from 'vitest'
import { notionsPourPrompt, sourceOfficielle, granulariteProgramme } from '../utils/referentiel'

const notions = (pays, niveau, matiere) => notionsPourPrompt({ pays, niveau, matiere })

describe('⭐⭐ variantes d’écriture d’une classe française', () => {
  it('⚠️ « 5ème » trouve le même programme que « 5e »', () => {
    const a = notions('FR', '5ème', 'Mathématiques')
    const b = notions('FR', '5e', 'Mathématiques')
    expect(a.length).toBeGreaterThan(0)
    expect(a).toEqual(b)
  })

  it('la même chose vaut pour 3ème, 4ème et 6ème', () => {
    for (const [long, court] of [['3ème', '3e'], ['4ème', '4e'], ['6ème', '6e']]) {
      const a = notions('FR', long, 'Mathématiques')
      expect(a.length, `classe ${long}`).toBeGreaterThan(0)
      expect(a).toEqual(notions('FR', court, 'Mathématiques'))
    }
  })

  it('« Seconde », « 2de » et « 2nde » désignent la même classe', () => {
    const ref = notions('FR', '2nde', 'Mathématiques')
    expect(ref.length).toBeGreaterThan(0)
    expect(notions('FR', 'Seconde', 'Mathématiques')).toEqual(ref)
    expect(notions('FR', '2de', 'Mathématiques')).toEqual(ref)
  })

  it('« 1ère » et « 1re » aussi', () => {
    const ref = notions('FR', '1re', 'Mathématiques')
    expect(ref.length).toBeGreaterThan(0)
    expect(notions('FR', '1ère', 'Mathématiques')).toEqual(ref)
  })

  it('« Terminale » est trouvée', () => {
    expect(notions('FR', 'Terminale', 'Mathématiques').length).toBeGreaterThan(0)
  })

  it('la source et la granularité suivent, pas seulement les notions', () => {
    // Sinon on servirait les bonnes notions en annonçant une mauvaise
    // attribution — la licence Etalab impose de citer le texte officiel.
    expect(sourceOfficielle({ pays: 'FR', niveau: '5ème', matiere: 'Mathématiques' })).toBeTruthy()
    expect(granulariteProgramme({ pays: 'FR', niveau: '5ème', matiere: 'Mathématiques' })).toBe('classe')
  })

  it('⚠️ trouver le référentiel ne doit pas ensuite LEVER une exception', () => {
    // Piège rencontré en corrigeant : `trouver()` rendu tolérant, mais
    // `notionsOfficielles` relisait encore `classes[niveau]` au libellé brut →
    // `undefined.notions`. Un correctif à moitié appliqué transforme un échec
    // muet en plantage.
    expect(() => notions('FR', '5ème', 'Mathématiques')).not.toThrow()
    expect(() => sourceOfficielle({ pays: 'FR', niveau: '1ère', matiere: 'Mathématiques' })).not.toThrow()
  })
})

describe('⚠️ les SÉRIES camerounaises ne se confondent pas', () => {
  it('« 2nde A » reste distincte de « 2nde »', () => {
    // Normaliser trop fort mélangerait des séries qui ont des programmes
    // différents — l'erreur serait invisible et le contenu crédible.
    const a = notions('CM', '2nde A', 'Informatique')
    expect(a.length).toBeGreaterThan(0)
    expect(notions('CM', '2nde', 'Informatique')).not.toEqual(a)
  })

  it('« Tle A » et « Tle C » gardent chacune son programme', () => {
    const a = notions('CM', 'Tle A', 'Informatique')
    const c = notions('CM', 'Tle C', 'Informatique')
    expect(a.length).toBeGreaterThan(0)
    expect(c.length).toBeGreaterThan(0)
  })

  it('un profil camerounais reste sur le programme camerounais', () => {
    // `trouver()` filtre par pays AVANT de comparer la classe : fusionner les
    // écritures ne peut donc pas faire traverser une frontière.
    const cm = notions('CM', '5ème', 'Mathématiques')
    const fr = notions('FR', '5ème', 'Mathématiques')
    expect(cm.length).toBeGreaterThan(0)
    expect(fr.length).toBeGreaterThan(0)
    expect(cm).not.toEqual(fr)
  })

  it('et « 5e » écrit à la française trouve quand même le programme camerounais', () => {
    expect(notions('CM', '5e', 'Mathématiques')).toEqual(notions('CM', '5ème', 'Mathématiques'))
  })
})

describe('⭐ « Sciences » est le nom courant de « Sciences et technologie »', () => {
  it('⚠️ la matière « Sciences » trouvait AUCUN programme', () => {
    // Vu dans le registre : `2026-08|Sciences|6ème|sans` → 5 questions servies,
    // la séance la plus courte de tout le journal.
    const a = notions('FR', '6e', 'Sciences')
    expect(a.length).toBeGreaterThan(0)
    expect(a).toEqual(notions('FR', '6e', 'Sciences et technologie'))
  })

  it('l’alias vaut aussi en CM1 et CM2 (même cycle)', () => {
    expect(notions('FR', 'CM1', 'Sciences').length).toBeGreaterThan(0)
    expect(notions('FR', 'CM2', 'Sciences').length).toBeGreaterThan(0)
  })

  it('⚠️ l’alias ne déborde PAS sur le cycle 4', () => {
    // Au collège, « Sciences » ne désigne plus une matière unique : il y a
    // physique-chimie, SVT et technologie. Répondre « Sciences et technologie »
    // à un élève de 4e serait une réponse fausse, pas une approximation.
    expect(notions('FR', '4e', 'Sciences')).toEqual([])
  })
})

describe('une classe inconnue reste un échec PROPRE', () => {
  it('renvoie une liste vide, sans exception', () => {
    expect(notions('FR', 'Zorglub', 'Mathématiques')).toEqual([])
    expect(notions('FR', '', 'Mathématiques')).toEqual([])
    expect(sourceOfficielle({ pays: 'FR', niveau: 'Zorglub', matiere: 'Mathématiques' })).toBeNull()
  })

  it('⚠️ une liste vide reste un résultat LÉGITIME', () => {
    // Mieux vaut pas de référentiel qu'un référentiel faux : un pays sans
    // programme intégré (Côte d'Ivoire aujourd'hui) doit renvoyer vide.
    expect(notions('CI', '5e', 'Mathématiques')).toEqual([])
  })
})
