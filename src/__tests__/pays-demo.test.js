import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PAYS_DEMO, CODES_PAYS_DEMO, packPays, localiserNom, localiserNomComplet, localiserTexte, localiserDonnees, appliquerSeries } from '../data/paysDemo'
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

describe('localisation en profondeur des données de démo', () => {
  const cg = PAYS_DEMO.CG

  it('remplace les noms dans une phrase, sans toucher au reste', () => {
    // Les noms camerounais apparaissent dans 285 endroits sur 32 fichiers de
    // seed (incidents, messages, inscriptions…). Les traiter champ par champ
    // garantissait d'en oublier — et de les oublier EN SILENCE.
    const r = localiserTexte('Abega Cédric, signalé par Mme Tchinda', NOMS_REFERENCE, cg)
    expect(r).not.toContain('Abega')
    expect(r).not.toContain('Tchinda')
    expect(r).toContain('Cédric')
    expect(r).toContain('signalé par Mme')
  })

  it('ne touche pas aux adresses e-mail en minuscules', () => {
    expect(localiserTexte('a.abega@edufrem.com', NOMS_REFERENCE, cg)).toBe('a.abega@edufrem.com')
  })

  it('ne remplace que des mots ENTIERS', () => {
    // « Ngo » ne doit pas transformer « Ngoumou » ni « Congo ».
    const r = localiserTexte('Congo Ngoumou', NOMS_REFERENCE, cg)
    expect(r).toBe('Congo Ngoumou')
  })

  it('descend dans les tableaux et les objets imbriqués', () => {
    const src = [{ nom: 'Belibi', enfants: [{ n: 'Kamga', age: 12 }] }]
    const r = localiserDonnees(src, NOMS_REFERENCE, cg)
    expect(r[0].nom).not.toBe('Belibi')
    expect(r[0].enfants[0].n).toBe(localiserNom('Kamga', NOMS_REFERENCE, cg))
    expect(r[0].enfants[0].age).toBe(12) // les nombres sont laissés tels quels
  })

  it('le Cameroun ne modifie rien, même en profondeur', () => {
    const src = [{ nom: 'Belibi' }]
    expect(localiserDonnees(src, NOMS_REFERENCE, PAYS_DEMO.CM)[0].nom).toBe('Belibi')
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

describe('garde-fou : le helper de localisation est défini là où il est appelé', () => {
  /**
   * Défaut vécu le 22/08 : dans `stores/eleves.js`, l'appel à `localiser()` a été
   * posé sans son import ni sa définition — parce que le fichier importait DÉJÀ
   * `data/paysDemo`, ce qui a fait sauter l'insertion.
   *
   * Conséquence : `localiser is not defined`, l'exception remontait dans un
   * chargement asynchrone, et l'écran Élèves affichait une LISTE VIDE, sans le
   * moindre message. Ni le build ni les tests unitaires ne l'ont vu — seule la
   * démo l'a montré. Ce test est le filet.
   */
  it('aucun store n’appelle localiser() sans le définir', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'stores')

    const fautifs = []
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8')
      if (!/[^a-zA-Z]localiser\s*\(/.test(src)) continue
      if (!/function localiser\s*\(/.test(src)) fautifs.push(f)
    }
    expect(fautifs).toEqual([])
  })
})

describe('Sénégal et France', () => {
  it('quatre pays, quatre espaces de stockage', () => {
    expect(CODES_PAYS_DEMO).toEqual(['CM', 'CG', 'SN', 'FR'])
  })

  it('le Sénégal est en zone UEMOA : XOF, pas XAF', () => {
    // Même valeur face à l'euro, deux monnaies distinctes. Facturer une
    // scolarité dakaroise en franc CFA d'Afrique CENTRALE serait faux.
    expect(PAYS_DEMO.SN.ecole.currency).toBe('XOF')
    expect(PAYS_DEMO.CG.ecole.currency).toBe('XAF')
    expect(PAYS_DEMO.FR.ecole.currency).toBe('EUR')
  })

  it('l’élémentaire sénégalais commence au CI, jamais à la SIL ni au CP1', () => {
    const n = PAYS_DEMO.SN.classesPrimaire.map((c) => c.level)
    expect(n[0]).toBe('CI')
    expect(n).not.toContain('SIL')
    expect(n).not.toContain('CP1')
  })

  it('⚠️ l’élémentaire français a CINQ niveaux, pas six', () => {
    // Une année de moins que partout ailleurs : la grande section de maternelle
    // n'est pas de l'élémentaire. Six niveaux feraient inventer une classe.
    const n = PAYS_DEMO.FR.classesPrimaire.map((c) => c.level)
    expect(new Set(n).size).toBe(5)
    expect(n[0]).toBe('CP')
  })

  it('chaque pays couvre toute la liste de référence, sans doublon', () => {
    for (const code of CODES_PAYS_DEMO) {
      const noms = PAYS_DEMO[code].nomsFamille
      if (!noms) continue
      expect(noms.length).toBe(NOMS_REFERENCE.length)
      expect(new Set(noms).size).toBe(noms.length)
    }
  })
})

describe('séries du lycée : elles changent de pays en pays', () => {
  const classes = [
    { id: 'c-1a', name: '1ère A', level: '1ere', serie: 'A', section: 'A' },
    { id: 'c-tc', name: 'Tle C', level: 'Tle', serie: 'C', section: 'C' },
    { id: 'c-6a', name: '6ème A', level: '6e', section: 'A' },
  ]

  it('le Sénégal a L2, S1, S2 — pas A, C, D', () => {
    const r = appliquerSeries(classes, PAYS_DEMO.CM, PAYS_DEMO.SN)
    expect(r[0].name).toBe('1ère L2')
    expect(r[1].name).toBe('Tle S1')
  })

  it('⚠️ la France n’a PLUS de séries depuis le bac 2021 : on numérote', () => {
    // Afficher « 1ère A » à un lycée français serait daté de trente ans.
    const r = appliquerSeries(classes, PAYS_DEMO.CM, PAYS_DEMO.FR)
    expect(r[0].name).toBe('1ère 1')
    expect(r[0].serie).toBe('')
  })

  it('les IDENTIFIANTS ne bougent jamais', () => {
    // Emplois du temps, notes et affectations référencent ces identifiants :
    // les renommer viderait la démo sans afficher la moindre erreur.
    for (const code of ['CG', 'SN', 'FR']) {
      const r = appliquerSeries(classes, PAYS_DEMO.CM, PAYS_DEMO[code])
      expect(r.map((c) => c.id)).toEqual(['c-1a', 'c-tc', 'c-6a'])
    }
  })

  it('ne touche pas aux classes sans série', () => {
    const r = appliquerSeries(classes, PAYS_DEMO.CM, PAYS_DEMO.SN)
    expect(r[2].name).toBe('6ème A')
  })

  it('le Congo garde A, C, D : rien à renommer', () => {
    expect(appliquerSeries(classes, PAYS_DEMO.CM, PAYS_DEMO.CG)).toBe(classes)
  })
})
