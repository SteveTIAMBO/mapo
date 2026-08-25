import { describe, it, expect } from 'vitest'
import {
  genererVitrine, phrasePresentation, piliersFactuels, sigleDeSecours,
  manquesVitrine, PRIMAIRE_DEFAUT, ACCENT_DEFAUT,
} from '../utils/vitrineGeneration'

/**
 * Génération de la vitrine publique d'une école (25/08/2026).
 *
 * Une page publique porte le NOM d'un établissement réel. Tout ce qui y figure
 * l'engage. La règle est donc : n'écrire que du sourcé, et laisser un bloc
 * absent plutôt que meublé.
 */

const EPC1 = {
  id: 'epc1',
  schoolName: 'EPPI « LES CHAMPIONS-FCB » DE GAROUA G1',
  schoolType: 'École primaire',
  edition: 'primaire',
  city: 'Garoua',
  country: 'Cameroun',
  address: 'Plateau',
  academicYear: '2026-2027',
  primaryColor: '#8E1B3A',
  currency: 'FCFA',
  directorLastName: 'Moussa',
}

describe('⚠️ ce qu’on n’invente JAMAIS', () => {
  const cfg = genererVitrine(EPC1, { niveaux: ['SIL', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'], effectif: 447, personnel: 11 })

  it('aucune citation attribuée au directeur', () => {
    // Ce seraient des mots qu'une personne réelle n'a pas prononcés, sur une
    // page qui porte son nom.
    expect(cfg.directeur.citation).toBe('')
  })

  it('aucun tarif, aucune date d’inscription, aucune activité, aucune photo', () => {
    expect(cfg.tarifs.lignes).toEqual([])
    expect(cfg.inscription.rentree).toBe('')
    expect(cfg.inscription.procedure).toEqual([])
    expect(cfg.activites).toEqual([])
    expect(cfg.galerie).toEqual([])
  })

  it('les contacts publics ne sont pas devinés', () => {
    // Le portable et l'e-mail personnels du directeur ne sont pas les contacts
    // publics de l'école : les publier n'appartient pas à l'outil.
    expect(cfg.contact.telephone).toBe('')
    expect(cfg.contact.email).toBe('')
    expect(cfg.contact.adresse).toBe('Plateau, Garoua, Cameroun')
  })

  it('⚠️ le statut est TOUJOURS brouillon à la génération', () => {
    // Les règles Firestore refusent une création directement en « valide », et
    // surtout : on ne met pas en ligne la page d'une école par inadvertance.
    expect(cfg.statut).toBe('brouillon')
  })
})

describe('ce qui est repris, parce que sourcé', () => {
  const cfg = genererVitrine(EPC1, { niveaux: ['SIL', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'], effectif: 447, personnel: 11 })

  it('l’identité vient de l’école', () => {
    expect(cfg.identite.nom).toContain('CHAMPIONS-FCB')
    expect(cfg.identite.ville).toBe('Garoua')
    expect(cfg.identite.anneeScolaire).toBe('2026-2027')
    expect(cfg.id).toBe('epc1')
  })

  it('la couleur de l’école prime sur la marque EDUFREM', () => {
    expect(cfg.couleurs.primaire).toBe('#8E1B3A')
    expect(cfg.couleurs.accent).toBe(ACCENT_DEFAUT)
  })

  it('une couleur absente ou mal formée retombe sur la marque', () => {
    expect(genererVitrine({ ...EPC1, primaryColor: '' }).couleurs.primaire).toBe(PRIMAIRE_DEFAUT)
    expect(genererVitrine({ ...EPC1, primaryColor: 'bordeaux' }).couleurs.primaire).toBe(PRIMAIRE_DEFAUT)
  })

  it('un sigle absent devient des initiales', () => {
    expect(sigleDeSecours('EPPI « LES CHAMPIONS-FCB » DE GAROUA G1')).toBe('EL')
    expect(genererVitrine({ ...EPC1, sigle: 'EPC1' }).identite.sigle).toBe('EPC1')
  })

  it('le mot juste selon l’édition : écoliers au primaire', () => {
    expect(cfg.vision.texte).toContain('447 écoliers')
    const sup = genererVitrine({ ...EPC1, edition: 'superieur' }, { effectif: 300 })
    expect(sup.vision.texte).toContain('300 étudiants')
    const sec = genererVitrine({ ...EPC1, edition: 'secondaire' }, { effectif: 300 })
    expect(sec.vision.texte).toContain('300 élèves')
  })
})

describe('⚠️ zéro n’est pas un effectif', () => {
  it('une école fraîchement créée n’annonce pas « 0 écoliers »', () => {
    // Ce serait faux ET humiliant sur une page publique. Zéro ici ne mesure
    // rien : il dit seulement que l'import n'a pas encore eu lieu.
    const cfg = genererVitrine(EPC1, { effectif: 0, personnel: 0, niveaux: [] })
    expect(cfg.vision.texte).not.toContain('0 ')
    expect(cfg.vision.piliers).toEqual([])
  })

  it('les piliers n’apparaissent que pour ce qui est connu', () => {
    const p = piliersFactuels({ niveaux: ['SIL', 'CM2'], effectif: 447, personnel: 0, edition: 'primaire' })
    expect(p).toHaveLength(2)
    expect(p.map((x) => x.titre)).toEqual(['2 niveaux', '447 écoliers'])
  })

  it('aucun pilier du tout est une réponse acceptable', () => {
    expect(piliersFactuels({})).toEqual([])
  })
})

describe('la phrase de présentation reste vraie même incomplète', () => {
  it('sans ville ni type, elle ne bafouille pas', () => {
    const t = phrasePresentation({ nom: 'École X' })
    expect(t).toBe('École X.')
    expect(t).not.toContain('undefined')
    expect(t).not.toContain('null')
  })

  it('les niveaux ne sont cités qu’à partir de deux', () => {
    expect(phrasePresentation({ nom: 'X', niveaux: ['CP'] })).not.toContain('de CP')
    expect(phrasePresentation({ nom: 'X', niveaux: ['SIL', 'CM2'] })).toContain('de SIL à CM2')
  })
})

describe('une école sans nom ne produit pas de page', () => {
  it('plutôt rien qu’une vitrine anonyme', () => {
    expect(genererVitrine({ id: 'x' })).toBeNull()
    expect(genererVitrine({ schoolName: 'Sans identifiant' })).toBeNull()
    expect(genererVitrine(null)).toBeNull()
  })
})

describe('ce qui manque est DIT à l’opérateur', () => {
  it('la liste des manques est explicite', () => {
    // Sans elle, on croirait la page terminée parce qu'elle s'affiche.
    const m = manquesVitrine(genererVitrine(EPC1, { effectif: 447 }))
    expect(m).toContain('les tarifs')
    expect(m).toContain('les photos')
    expect(m).toContain('un contact public')
    expect(m).toContain('le logo')
  })

  it('un contact renseigné disparaît de la liste', () => {
    const cfg = genererVitrine({ ...EPC1, phone: '+237 222 00 00 00' })
    expect(manquesVitrine(cfg)).not.toContain('un contact public')
  })
})
