import { describe, it, expect } from 'vitest'
import {
  destinataireParCycle, inviteParentEnSecond, lienInvitation, canauxDisponibles,
  typeDeCode, normaliserCode, lienWhatsapp,
  CODE_ECOLE, CODE_FAMILLE, MAPOPLUS_ORIGINE,
} from '../utils/invitationMapoPlus'

/**
 * Invitation MAPO+ émise par l'école (23/08/2026).
 *
 * MAPO gère l'école, MAPO+ les familles. Ce qui relie les deux ne doit rien
 * demander à l'établissement : à la validation d'une inscription, l'invitation
 * part seule et la famille arrive sur un espace déjà rattaché à son école.
 */

describe('qui reçoit l’accès', () => {
  it('au primaire, c’est le parent', () => {
    expect(destinataireParCycle('primaire')).toBe('parent')
    expect(inviteParentEnSecond('primaire')).toBe(false)
  })

  it('à partir du secondaire, c’est l’apprenant — et le parent en second', () => {
    for (const c of ['secondaire', 'superieur']) {
      expect(destinataireParCycle(c)).toBe('apprenant')
      expect(inviteParentEnSecond(c)).toBe(true)
    }
  })

  it('⚠️ un cycle inconnu retombe sur le PARENT, pas sur l’apprenant', () => {
    // Le choix prudent : un compte parent mal ciblé se transmet à l'enfant ;
    // l'inverse donne les bulletins à un enfant dont personne n'a voulu ça.
    for (const c of ['', null, undefined, 'college', 'inconnu']) {
      expect(destinataireParCycle(c)).toBe('parent')
    }
  })

  it('la casse du cycle n’a pas d’effet', () => {
    expect(destinataireParCycle('SECONDAIRE')).toBe('apprenant')
  })
})

describe('⚠️ les deux formes de code ne doivent pas être confondues', () => {
  it('reconnaît le code de l’école et celui de la famille', () => {
    expect(typeDeCode('stjoseph~KMPQ2R7X')).toBe(CODE_ECOLE)
    expect(typeDeCode('demo~ABCD2345')).toBe(CODE_ECOLE)
    expect(typeDeCode('KMPQ2R7X')).toBe(CODE_FAMILLE)
    expect(typeDeCode('')).toBe('')
    expect(typeDeCode('pas de code du tout')).toBe('')
    expect(typeDeCode('ab~X')).toBe('') // partie aléatoire trop courte
  })

  it('le slug de l’école reste en MINUSCULES à la normalisation', () => {
    // Le défaut d'origine : la page d'arrivée passait tout en majuscules, ce qui
    // faisait refuser le code par le serveur en accusant la famille.
    expect(normaliserCode('StJoseph~kmpq2r7x')).toBe('stjoseph~KMPQ2R7X')
    expect(normaliserCode('  stjoseph~KMPQ2R7X  ')).toBe('stjoseph~KMPQ2R7X')
  })

  it('un code famille, lui, passe bien en majuscules', () => {
    expect(normaliserCode('kmpq2r7x')).toBe('KMPQ2R7X')
  })

  it('un code méconnaissable est rendu tel quel, jamais transformé au hasard', () => {
    expect(normaliserCode('n’importe quoi')).toBe('n’importe quoi')
  })
})

describe('le lien envoyé à la famille', () => {
  it('pointe vers MAPO+, pas vers l’ERP', () => {
    const l = lienInvitation('stjoseph~KMPQ2R7X', 'Awa')
    expect(l.startsWith(MAPOPLUS_ORIGINE + '/rejoindre?')).toBe(true)
    expect(l).toContain('c=stjoseph%7EKMPQ2R7X')
    expect(l).toContain('p=Awa')
  })

  it('sans code, aucun lien — plutôt qu’une URL qui mène à une erreur', () => {
    expect(lienInvitation('')).toBe('')
    expect(lienInvitation(null)).toBe('')
  })

  it('le prénom est facultatif', () => {
    expect(lienInvitation('demo~ABCD2345')).not.toContain('p=')
  })
})

describe('⚠️ ce qui peut réellement partir tout seul', () => {
  it('sans adresse e-mail, rien n’est automatique — et on le dit', () => {
    // L'e-mail du parent est FACULTATIF à l'inscription, et rare sur le marché
    // visé (MAPO se connecte au téléphone en priorité). Prétendre l'envoi
    // automatique laisserait l'école croire à un message jamais parti.
    const c = canauxDisponibles({ parentEmail: '', parentPhone: '+237 699 12 34 56' })
    expect(c.automatique).toBe(false)
    expect(c.email).toBe('')
    expect(c.whatsapp).toBeTruthy()
  })

  it('avec une adresse valide, l’envoi est automatique', () => {
    const c = canauxDisponibles({ parentEmail: 'parent@example.com', parentPhone: '' })
    expect(c.automatique).toBe(true)
    expect(c.email).toBe('parent@example.com')
    expect(c.whatsapp).toBe('')
  })

  it('une adresse mal formée ne compte pas comme une adresse', () => {
    for (const bad of ['parent', 'parent@', '@example.com', 'a@b', 'a b@c.com']) {
      expect(canauxDisponibles({ parentEmail: bad }).automatique).toBe(false)
    }
  })

  it('un numéro trop court n’ouvre pas WhatsApp', () => {
    expect(canauxDisponibles({ parentPhone: '1234' }).whatsapp).toBe('')
  })

  it('aucun contact du tout : les deux canaux sont vides, sans exception', () => {
    const c = canauxDisponibles()
    expect(c).toEqual({ email: '', whatsapp: '', automatique: false })
  })
})

describe('partage WhatsApp en un geste', () => {
  it('construit un lien wa.me avec le message pré-écrit', () => {
    const l = lienWhatsapp('+237 699 12 34 56', 'Bonjour, voici votre accès')
    expect(l.startsWith('https://wa.me/237699123456?text=')).toBe(true)
    expect(l).toContain('Bonjour')
  })

  it('sans numéro, pas de lien', () => {
    expect(lienWhatsapp('', 'x')).toBe('')
  })
})
