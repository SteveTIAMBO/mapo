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

  it('⚠️ une classe de lycée SANS SÉRIE ne renvoie rien', () => {
    // Au lycée ivoirien, « 2nde » tout court n'existe pas : il y a 2nde A et
    // 2nde C, aux programmes très différents. Répondre quelque chose à une
    // classe sans série serait deviner laquelle.
    expect(maths('2nde')).toEqual([])
    expect(maths('1re')).toEqual([])
    expect(maths('Terminale')).toEqual([])
  })

  it('les matières NON intégrées restent vides', () => {
    // L'anglais, l'espagnol et l'allemand existent sur le portail mais ne sont
    // pas extraits : les programmes de langues listent des activités
    // langagières, pas des savoirs quizzables (même décision qu'en France).
    expect(notionsOfficielles({ pays: 'CI', niveau: '6e', matiere: 'Anglais', date: en(2026) })).toEqual([])
    expect(notionsOfficielles({ pays: 'CI', niveau: '4e', matiere: 'Espagnol (LV2)', date: en(2026) })).toEqual([])
  })
})

describe('⭐⭐ les CINQ autres matières du premier cycle (02/09)', () => {
  const M = (matiere, niveau) => notionsOfficielles({ pays: 'CI', niveau, matiere, date: en(2026) })
  const CLASSES = ['6e', '5e', '4e', '3e']

  it.each([
    ['Français', [17, 17, 18, 19]],
    ['Histoire-Géographie', [17, 12, 12, 12]],
    ['Physique-Chimie', [13, 13, 13, 14]],
    ['SVT', [8, 8, 9, 11]],
    ['EDHC', [12, 14, 13, 13]],
  ])('%s : le compte par classe est celui du corps du programme', (matiere, attendus) => {
    expect(CLASSES.map((c) => M(matiere, c).length)).toEqual(attendus)
  })

  it('⚠️ chaque matière a un programme DIFFÉRENT par classe', () => {
    for (const m of ['Français', 'Histoire-Géographie', 'Physique-Chimie', 'SVT', 'EDHC']) {
      const listes = CLASSES.map((c) => JSON.stringify(M(m, c)))
      expect(new Set(listes).size, `matière ${m}`).toBe(4)
    }
  })

  it('⚠️ et deux matières ne se confondent jamais', () => {
    // Le catalogue ivoirien a « Physique-Chimie » ET « SVT » : si l'une servait
    // le programme de l'autre, l'élève réviserait la mauvaise discipline sans
    // que rien ne le signale.
    expect(M('SVT', '3e')).not.toEqual(M('Physique-Chimie', '3e'))
    expect(M('Français', '6e')).not.toEqual(M('EDHC', '6e'))
  })

  it('⭐ histoire et géographie sont distinguées dans le domaine', () => {
    // Les PDF séparent nettement les deux disciplines : perdre l'information
    // ferait réviser de la géographie sous l'étiquette « histoire ».
    const d = new Set(M('Histoire-Géographie', '4e').map((n) => n.domaine.split(' — ')[0]))
    expect(d.has('HISTOIRE')).toBe(true)
    expect(d.has('GÉOGRAPHIE')).toBe(true)
  })

  it('⚠️ le français porte des ACTIVITÉS, pas des thèmes', () => {
    // Structure propre à cette matière : COMPÉTENCE → Activité → Leçon.
    const d = new Set(M('Français', '6e').map((n) => n.domaine.toLowerCase()))
    for (const a of ['lecture', 'grammaire', 'orthographe']) expect(d.has(a)).toBe(true)
  })

  it('⭐⭐ AUCUNE œuvre littéraire n’est stockée', () => {
    // Contrainte de droits : les extraits et titres d'œuvres appartiennent à
    // des tiers. Le programme ivoirien n'en prescrit d'ailleurs aucun — il
    // laisse « l'œuvre intégrale » en pointillés.
    const tout = CLASSES.flatMap((c) => M('Français', c).map((n) => n.notion))
    expect(tout.filter((n) => /œuvre intégrale/i.test(n)).length).toBeGreaterThan(0)
    // Une œuvre serait citée entre guillemets ou suivie d'un nom d'auteur.
    expect(tout.some((n) => /[«"]|, (de|par) [A-ZÉÈ]/.test(n))).toBe(false)
  })

  it('⭐⭐ le CATALOGUE ivoirien atteint les cinq nouvelles matières', async () => {
    // Le test qui manquait à chaque fois : la rencontre, pas l'extraction.
    const { matieresCI } = await import('../stores/enfantsAutonomes')
    for (const c of CLASSES) {
      const cat = matieresCI(c)
      for (const m of ['Français', 'Histoire-Géographie', 'Physique-Chimie', 'SVT', 'EDHC']) {
        expect(cat, `catalogue ${c}`).toContain(m)
        expect(M(m, c).length, `${m} en ${c}`).toBeGreaterThan(0)
      }
    }
  })

  it('les variantes d’écriture de la classe marchent pour toutes', () => {
    for (const m of ['Français', 'Histoire-Géographie', 'Physique-Chimie', 'SVT', 'EDHC']) {
      expect(M(m, '5ème'), m).toEqual(M(m, '5e'))
    }
  })

  it('aucune notion vide, aucun doublon dans une classe', () => {
    for (const m of ['Français', 'Histoire-Géographie', 'Physique-Chimie', 'SVT', 'EDHC']) {
      for (const c of CLASSES) {
        const noms = M(m, c).map((n) => `${n.domaine}|${n.notion}`)
        expect(noms.every((x) => x.trim().length > 3), `${m} ${c}`).toBe(true)
        expect(new Set(noms).size, `doublon ${m} ${c}`).toBe(noms.length)
      }
    }
  })

  it('⚠️ les coquilles du texte officiel sont conservées', () => {
    // Corriger rendrait impossible la vérification mot-pour-mot contre la source.
    expect(M('Physique-Chimie', '4e').map((n) => n.notion)).toContain('Sources et récepteursde lumière')
    expect(M('SVT', '6e').map((n) => n.domaine)[0]).toContain('vertèbres')
  })

  it('⚠️ la leçon « alternante » de 3e est bien DOUBLE', () => {
    // Le corps détaille la guerre du Biafra ET celle du Rwanda sous le même
    // numéro : l'enseignant choisit l'une OU l'autre. Les deux sont au
    // programme, une seule est enseignée — on les garde donc toutes les deux.
    const n = M('Histoire-Géographie', '3e').map((x) => x.notion)
    expect(n.filter((x) => /alternante/.test(x))).toHaveLength(2)
  })
})

describe('⭐⭐ SECOND CYCLE — dix séries, dix programmes différents', () => {
  const SERIES = ['2nde A', '2nde C', '1re A1', '1re A2', '1re C', '1re D', 'Tle A1', 'Tle A2', 'Tle C', 'Tle D']

  it('les dix séries du catalogue ont un programme de maths', () => {
    for (const s of SERIES) expect(maths(s).length, s).toBeGreaterThan(0)
  })

  it('le compte par série est celui du corps du programme', () => {
    expect(SERIES.map((s) => maths(s).length)).toEqual([8, 15, 7, 7, 17, 15, 8, 7, 19, 12])
  })

  it('⚠️⚠️ AUCUNE série n’a le même programme qu’une autre', () => {
    // Le risque central du second cycle : servir le programme de la C à un
    // élève de la A. Ce serait invisible — les questions auraient l'air justes.
    const listes = SERIES.map((s) => JSON.stringify(maths(s)))
    expect(new Set(listes).size).toBe(SERIES.length)
  })

  it('⚠️ A1 et A2 se ressemblent mais ne sont PAS identiques', () => {
    // Piège le plus vraisemblable : deux séries littéraires très proches.
    // En 1re, elles diffèrent d'un accent sur une leçon et d'un thème ;
    // en Tle, A1 a « Primitives et Calcul intégral » que A2 n'a pas.
    expect(maths('1re A1')).not.toEqual(maths('1re A2'))
    expect(maths('Tle A1')).not.toEqual(maths('Tle A2'))
    expect(maths('Tle A1').map((n) => n.notion)).toContain('Primitives et Calcul intégral')
    expect(maths('Tle A2').map((n) => n.notion)).not.toContain('Primitives et Calcul intégral')
  })

  it('⚠️ C et D non plus : la géométrie les sépare', () => {
    const c = maths('1re C').map((n) => n.notion)
    const d = maths('1re D').map((n) => n.notion)
    expect(c).toContain('Géométrie analytique du plan')
    expect(d).not.toContain('Géométrie analytique du plan')
    expect(c).toContain('Vecteurs de l’espace')
    expect(d).not.toContain('Vecteurs de l’espace')
    // Et en terminale, seule la C porte l'arithmétique.
    expect(maths('Tle C').map((n) => n.domaine)).toContain('ARITHMÉTIQUE')
    expect(maths('Tle D').map((n) => n.domaine)).not.toContain('ARITHMÉTIQUE')
  })

  it('⭐ le CATALOGUE atteint les dix séries', async () => {
    const { NIVEAUX_SECONDAIRE_CI, matieresCI } = await import('../stores/enfantsAutonomes')
    for (const s of SERIES) {
      expect(NIVEAUX_SECONDAIRE_CI, `niveau ${s}`).toContain(s)
      expect(matieresCI(s), `catalogue ${s}`).toContain('Mathématiques')
      expect(maths(s).length, `référentiel ${s}`).toBeGreaterThan(0)
    }
  })

  it('⚠️ le premier cycle n’est pas contaminé par le second', () => {
    for (const c of ['6e', '5e', '4e', '3e']) {
      for (const s of SERIES) expect(maths(c), `${c} vs ${s}`).not.toEqual(maths(s))
    }
  })

  it('les coquilles du texte officiel sont conservées', () => {
    // « GÉOMETRIE » sans accent sur le 2e E, « PHENOMENES » sans accents,
    // « DONNEÉS » avec l'accent déplacé en Tle D : toutes du document.
    const d = new Set(SERIES.flatMap((s) => maths(s).map((n) => n.domaine)))
    expect(d.has('GÉOMETRIE DU PLAN')).toBe(true)
    expect(d.has('MODÉLISATION DE PHENOMENES ALÉATOIRES')).toBe(true)
    expect(d.has('ORGANISATION ET TRAITEMENT DES DONNEÉS')).toBe(true)
  })

  it('aucune notion vide, aucun doublon dans une série', () => {
    for (const s of SERIES) {
      const noms = maths(s).map((n) => `${n.domaine}|${n.notion}`)
      expect(noms.every((x) => x.trim().length > 3), s).toBe(true)
      expect(new Set(noms).size, `doublon ${s}`).toBe(noms.length)
    }
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
    // Chacune doit répondre « je ne sais pas » proprement — pas inventer, pas lever.
    // ⚠️ Cette liste comptait Français, SVT, Physique-Chimie et Histoire-Géo il
    // y a une heure ; les quatre ont reçu leur programme dans la foulée et le
    // test est passé au rouge. Il ne reste que les matières volontairement
    // écartées : les langues (activités langagières, pas des savoirs), l'EPS et
    // les arts (programmes de pratiques).
    for (const m of ['Anglais', 'Éducation physique et sportive (EPS)', 'Arts plastiques', 'Éducation musicale']) {
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
