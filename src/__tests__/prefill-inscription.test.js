/**
 * L'inscription ne doit pas reposer les questions qu'elle vient de poser.
 *
 * Défaut rapporté par Steve (23/08) : « la création de compte demande des
 * informations et une fois la personne connectée on lui demande encore
 * d'entrer les mêmes informations. »
 *
 * La cause n'était PAS la relecture : elle était à l'écriture. Le select de
 * classe part avec une valeur vide et n'était pas `required` ; un apprenant qui
 * ne l'ouvrait pas créait son compte avec un niveau vide. La préconfiguration
 * partait donc incomplète, `prefillComplet` la rejetait, et l'onboarding
 * redemandait pays, classe et prénom.
 *
 * Le formulaire promettait pourtant, dans son propre commentaire, de « demander
 * le rôle, le pays et la classe, sans quoi l'onboarding n'a rien à quoi
 * s'accrocher ». Le code contredisait son commentaire.
 *
 * D'où l'invariant tenu ici : **ce que l'inscription ÉCRIT doit toujours
 * satisfaire ce que l'espace RELIT.**
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prefillComplet, CLE_PREFILL } from '../utils/prefillInscription'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, p), 'utf8')
const INSCRIPTION = lire('src/views/InscriptionMapoPlusView.vue')
const ESPACE = lire('src/views/ParentMiapoView.vue')
const ONBOARDING = lire('src/components/MiapoOnboarding.vue')

describe('préconfiguration : ce qui suffit à ne rien redemander', () => {
  it('un apprenant avec prénom et classe se passe d’onboarding', () => {
    expect(prefillComplet({ persona: 'apprenant', firstName: 'Awa', niveau: '3ème', pays: 'CM' })).toBe(true)
  })

  it('une formation libre tient lieu de classe (hors catalogue)', () => {
    // MBA, concours, permis… : l'apprenant adulte n'a pas de « classe ».
    expect(prefillComplet({ persona: 'apprenant', firstName: 'Awa', formation: 'MBA', pays: 'CM' })).toBe(true)
  })

  it('⚠️ LE DÉFAUT : classe vide → tout est redemandé', () => {
    expect(prefillComplet({ persona: 'apprenant', firstName: 'Awa', niveau: '', formation: '', pays: 'CM' })).toBe(false)
  })

  it('un prénom fait d’espaces ne compte pas', () => {
    expect(prefillComplet({ persona: 'apprenant', firstName: '   ', niveau: '3ème' })).toBe(false)
  })

  it('un PARENT n’est jamais « complet » : il doit décrire son enfant', () => {
    // Ce n'est pas une question redondante — on ne lui a rien demandé sur
    // l'enfant à l'inscription.
    expect(prefillComplet({ persona: 'parent', firstName: 'Awa', niveau: '3ème' })).toBe(false)
  })

  it('rien, ou n’importe quoi, ne casse pas', () => {
    for (const x of [null, undefined, {}, 'texte', 42, []]) expect(prefillComplet(x)).toBe(false)
  })
})

describe('l’inscription EXIGE ce qu’elle promet de demander', () => {
  it('le select de classe est obligatoire', () => {
    // Sans `required`, la valeur de départ étant vide, le formulaire se
    // soumettait sans classe. C'est la cause exacte du double questionnement.
    expect(INSCRIPTION).toMatch(/<select v-model="signupNiveau"[^>]*\srequired/)
  })

  it('le champ formation l’est aussi (cas hors catalogue)', () => {
    expect(INSCRIPTION).toMatch(/<input v-model="signupFormation"[^>]*\srequired/)
  })

  it('les champs déjà obligatoires le restent', () => {
    for (const champ of ['signupFirstName', 'signupLastName', 'signupEmail', 'signupPassword']) {
      expect(INSCRIPTION).toMatch(new RegExp(`v-model="${champ}"[^>]*\\srequired`))
    }
  })
})

describe('une seule source de vérité pour la préconfiguration', () => {
  it('personne ne manipule la clé de stockage à la main', () => {
    // Trois fichiers lisaient ou effaçaient `mapo_signup_prefill` chacun de son
    // côté, avec trois façons de juger si elle était exploitable. Un prédicat
    // partagé est la seule manière de garantir que l'écriture et la relecture
    // parlent de la même chose.
    for (const [nom, src] of [['inscription', INSCRIPTION], ['espace', ESPACE], ['onboarding', ONBOARDING]]) {
      expect(`${nom}: ${src.includes("'mapo_signup_prefill'")}`).toBe(`${nom}: false`)
      expect(src).toContain('prefillInscription')
    }
  })

  it('la clé exposée est bien celle attendue', () => {
    // Changer cette valeur abandonnerait en route les comptes créés juste avant
    // une mise en ligne.
    expect(CLE_PREFILL).toBe('mapo_signup_prefill')
  })

  it('l’espace décide avec le prédicat partagé, pas avec sa propre règle', () => {
    expect(ESPACE).toContain('prefillComplet(_pf)')
  })
})
