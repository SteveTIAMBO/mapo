/**
 * CÔTE D'IVOIRE — premier référentiel du pays (02/09/2026).
 *
 * ⚠️ POURQUOI ÇA COMPTAIT. Le catalogue MAPO+ proposait la Côte d'Ivoire depuis
 * le début avec **0 % de couverture** : chaque séance y partait en génération
 * libre, sans cadrage officiel, et rien ne le signalait. Le registre qualité
 * serveur donne le prix de cette absence — **42 % de questions rejetées sans
 * référentiel contre 14 % avec** (cf. project_qualite_contenu_quiz).
 *
 * SOURCE : DPFC (Direction de la Pédagogie et de la Formation Continue),
 * https://dpfc-ci.net/?page_id=283 — PDF en accès direct, un par classe,
 * millésime CND 09/2023.
 *
 * ⚠️⚠️ LE PIÈGE ÉVITÉ, et il aurait été invisible. Chaque PDF s'ouvre sur un
 * TABLEAU SYNOPTIQUE « MATHÉMATIQUES 6e À LA 3e » qui donne les quatre classes
 * d'un coup — très tentant. Mais c'est un TABLEAU : l'extraction texte
 * entrelace ses colonnes, et les leçons seraient parties dans la mauvaise
 * classe, avec un résultat parfaitement crédible. Seul le CORPS du programme,
 * classe par classe, fait foi. Même décision qu'au Cameroun.
 *
 * ⚠️ Divergences relevées entre le synoptique et le corps (le corps l'emporte) :
 *   — 4e : le synoptique dit « Équations et inéquations dans ℚ », le corps
 *     « … du premier degré dans ℚ » ;
 *   — 3e : le synoptique liste des leçons de « Transformations du plan », le
 *     corps n'ouvre pas ce thème ;
 *   — 5e : l'ordre des leçons de géométrie diffère.
 */
import { describe, it, expect } from 'vitest'
import { notionsOfficielles, notionsPourPrompt, sourceOfficielle, granulariteProgramme } from '../utils/referentiel'
import ci from '../data/referentiels/ci-mathematiques-premier-cycle.json'

const en = (a) => new Date(`${a}-10-01T00:00:00Z`)
const maths = (niveau, date = en(2026)) => notionsOfficielles({ pays: 'CI', niveau, matiere: 'Mathématiques', date })

describe('⭐ la Côte d’Ivoire n’est plus à zéro', () => {
  it('les quatre classes du premier cycle ont un programme', () => {
    for (const c of ['6e', '5e', '4e', '3e']) {
      expect(maths(c).length, `classe ${c}`).toBeGreaterThan(9)
    }
  })

  it('50 leçons au total, réparties 13 / 12 / 11 / 14', () => {
    expect([maths('6e').length, maths('5e').length, maths('4e').length, maths('3e').length]).toEqual([13, 12, 11, 14])
  })

  it('chaque classe a un programme DIFFÉRENT', () => {
    // Le piège du tableau synoptique aurait pu donner quatre fois la même liste.
    const listes = ['6e', '5e', '4e', '3e'].map((c) => JSON.stringify(maths(c)))
    expect(new Set(listes).size).toBe(4)
  })

  it('⚠️ les variantes d’écriture de la classe fonctionnent', () => {
    // Le portail ivoirien écrit « 6è », les écoles « 6ème », l'app « 6e ».
    expect(maths('6ème')).toEqual(maths('6e'))
    expect(maths('6è')).toEqual(maths('6e'))
  })

  it('la source officielle est citée — c’est une obligation, pas un confort', () => {
    const s = sourceOfficielle({ pays: 'CI', niveau: '6e', matiere: 'Mathématiques' })
    expect(s).toBeTruthy()
    expect(s.url).toContain('dpfc-ci.net')
    expect(s.attribution).toContain('DPFC')
  })

  it('le programme est défini par CLASSE, pas par cycle', () => {
    expect(granulariteProgramme({ pays: 'CI', niveau: '5e', matiere: 'Mathématiques' })).toBe('classe')
  })
})

describe('⚠️ pas de contamination entre pays ni entre classes', () => {
  it('un profil ivoirien ne reçoit pas le programme français', () => {
    const ci6 = maths('6e')
    const fr6 = notionsOfficielles({ pays: 'FR', niveau: '6e', matiere: 'Mathématiques', date: en(2026) })
    expect(fr6.length).toBeGreaterThan(0)
    expect(ci6).not.toEqual(fr6)
  })

  it('ni le programme camerounais', () => {
    const cm = notionsOfficielles({ pays: 'CM', niveau: '6ème', matiere: 'Mathématiques', date: en(2026) })
    expect(cm.length).toBeGreaterThan(0)
    expect(maths('6e')).not.toEqual(cm)
  })

  it('⚠️ une classe de LYCÉE ivoirien ne renvoie encore RIEN', () => {
    // Le second cycle (2nde/1re/Tle, séries A1/A2/C/D) existe sur le portail
    // mais n'est pas intégré. Un résultat vide est légitime ; inventer ne l'est
    // pas — surtout pour des séries dont les programmes DIFFÈRENT.
    expect(maths('2nde')).toEqual([])
    expect(maths('Tle D')).toEqual([])
  })

  it('les autres matières ivoiriennes restent vides', () => {
    expect(notionsOfficielles({ pays: 'CI', niveau: '6e', matiere: 'Français', date: en(2026) })).toEqual([])
    expect(notionsOfficielles({ pays: 'CI', niveau: '6e', matiere: 'SVT', date: en(2026) })).toEqual([])
  })
})

describe('fidélité de l’extraction', () => {
  it('⚠️ les coquilles du texte officiel sont CONSERVÉES', () => {
    // « GEOMÉTRIE » sans accent sur le premier E : c'est ainsi dans le corps du
    // PDF. Corriger serait s'écarter de la source, et rendre la vérification
    // mot-pour-mot impossible.
    const domaines = new Set(ci.classes['6e'].notions.map((n) => n.domaine))
    expect(domaines.has('GEOMÉTRIE DU PLAN')).toBe(true)
    expect(domaines.has('GÉOMÉTRIE DE L’ESPACE')).toBe(true)
  })

  it('le point final de « Figures symétriques par rapport à une droite. » est gardé', () => {
    expect(ci.classes['5e'].notions.map((n) => n.notion)).toContain('Figures symétriques par rapport à une droite.')
  })

  it('⚠️ la 3e suit le CORPS, pas le tableau synoptique', () => {
    // Le synoptique liste « Symétries et translations » en 3e ; le corps n'ouvre
    // pas le thème « Transformations du plan ». On suit le corps.
    const n3 = ci.classes['3e'].notions
    expect(n3.map((x) => x.domaine)).not.toContain('TRANSFORMATIONS DU PLAN')
    // Et la 3e est la seule à porter le thème « FONCTIONS ».
    expect(n3.map((x) => x.domaine)).toContain('FONCTIONS')
    for (const c of ['6e', '5e', '4e']) {
      expect(ci.classes[c].notions.map((x) => x.domaine)).not.toContain('FONCTIONS')
    }
  })

  it('la 4e garde l’intitulé LONG du corps', () => {
    expect(ci.classes['4e'].notions.map((n) => n.notion))
      .toContain('Équations et inéquations du premier degré dans ℚ')
  })

  it('aucune notion vide, aucun doublon dans une classe', () => {
    for (const [c, v] of Object.entries(ci.classes)) {
      const noms = v.notions.map((n) => `${n.domaine}|${n.notion}`)
      expect(noms.every((x) => x.trim().length > 3), `classe ${c}`).toBe(true)
      expect(new Set(noms).size, `doublon en ${c}`).toBe(noms.length)
    }
  })

  it('chaque classe pointe vers SON pdf source', () => {
    for (const [c, v] of Object.entries(ci.classes)) {
      expect(v.urlPdf, `classe ${c}`).toContain('dpfc-ci.net')
      expect(v.enVigueurRentree).toBe(2023)
    }
  })

  it('le texte prêt pour le prompt garde « domaine — notion »', () => {
    const t = notionsPourPrompt({ pays: 'CI', niveau: '3e', matiere: 'Mathématiques' })
    expect(t[0]).toContain(' — ')
    expect(t.join(' ')).toContain('Applications affines')
  })
})

describe('⭐⭐ le CATALOGUE rencontre bien le RÉFÉRENTIEL', () => {
  /**
   * ⚠️ LE TEST QUI MANQUAIT LES DEUX FOIS PRÉCÉDENTES. Un référentiel peut être
   * parfaitement extrait et n'être JAMAIS servi, parce que le catalogue de
   * l'élève l'écrit autrement — c'est arrivé avec « Sciences de la vie et de la
   * Terre (SVT) » contre « SVT », puis avec « 5ème » contre « 5e ». Dans les
   * deux cas l'échec était muet : « pas de référentiel » est un cas légitime.
   * On vérifie donc la RENCONTRE, pas seulement l'extraction.
   */
  it('« Mathématiques » du catalogue ivoirien trouve son programme, dans les 4 classes', async () => {
    const { matieresCI } = await import('../stores/enfantsAutonomes')
    for (const classe of ['6e', '5e', '4e', '3e']) {
      const matieres = matieresCI(classe)
      expect(matieres, `catalogue ${classe}`).toContain('Mathématiques')
      expect(maths(classe).length, `référentiel ${classe}`).toBeGreaterThan(0)
    }
  })

  it('⚠️ et les matières SANS référentiel renvoient vide, sans planter', () => {
    // Le catalogue ivoirien propose bien plus que les maths aujourd'hui. Chacune
    // doit répondre « je ne sais pas » proprement — pas inventer, pas lever.
    for (const m of ['Français', 'SVT', 'Physique-Chimie', 'Histoire-Géographie', 'Anglais']) {
      expect(() => notionsOfficielles({ pays: 'CI', niveau: '6e', matiere: m, date: en(2026) })).not.toThrow()
      expect(notionsOfficielles({ pays: 'CI', niveau: '6e', matiere: m, date: en(2026) }), m).toEqual([])
    }
  })
})

describe('⚠️ le millésime reste respecté', () => {
  it('le programme de 2023 ne s’applique pas à la rentrée 2022', () => {
    // Règle générale du module : un programme n'est jamais servi par
    // anticipation. Ici il l'est depuis 2023, donc rien avant.
    expect(maths('6e', en(2022))).toEqual([])
    expect(maths('6e', en(2023)).length).toBeGreaterThan(0)
  })
})
