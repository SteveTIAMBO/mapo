/**
 * Parent, enfant autonome, apprenant : trois rôles, ÉCRITS dans Firestore.
 *
 * ⚠️ CE QUE CES TESTS PROTÈGENT. Le 26/08, le compte de Djany (adulte inscrite
 * seule) était affiché comme un compte parent, sans aucun moyen de le corriger.
 * Trois causes empilées, toutes vérifiées dans le code :
 *
 *   1. `loadUserProfile` écrivait `role: 'parent'` EN DUR quand aucun document
 *      `users/{uid}` n'existait ;
 *   2. il ne persistait rien — le faux profil était donc reconstruit à
 *      l'identique à CHAQUE connexion, indéfiniment ;
 *   3. la fiche de révision s'appelle `b2c/enfant_<id>` même pour un adulte, et
 *      rien à l'intérieur ne disait qui elle décrivait.
 *
 * Le vocabulaire est celui de Steve (27/08) : « enfant autonome » = un enfant à
 * qui le parent a généré un code d'accès ; « apprenant » = le majeur qui crée
 * son compte seul et gère tout, abonnement compris.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  deduireRoleCompte, typeProfilPour, typeProfilDe, roleB2C,
  ROLE_PARENT, ROLE_ENFANT, ROLE_APPRENANT, PROFIL_ENFANT, PROFIL_APPRENANT,
} from '../utils/typeProfil'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, 'src', p), 'utf8')
/** Les assertions portent sur le CODE : ce fichier cite les chaînes fautives. */
const sansCommentaires = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')
const AUTH = lire('stores/auth.js')
const EA = lire('stores/enfantsAutonomes.js')

describe('classer un compte quand users/{uid} manque', () => {
  it('un enfant autonome se reconnaît à l’enfantId de son lien', () => {
    expect(deduireRoleCompte({ lien: { ownerUid: 'P1', enfantId: 'ea-7' } })).toBe(ROLE_ENFANT)
  })

  it('⚠️ un CO-PARENT porte le même lien, sans enfantId : il reste parent', () => {
    // Tester `ownerUid` au lieu de `enfantId` ferait passer tous les co-parents
    // pour des enfants — et leur retirerait la gestion du compte.
    expect(deduireRoleCompte({ lien: { ownerUid: 'P1' } })).toBe(ROLE_PARENT)
  })

  it('sans lien, le persona écrit à l’inscription tranche', () => {
    expect(deduireRoleCompte({ persona: 'apprenant' })).toBe(ROLE_APPRENANT)
    expect(deduireRoleCompte({ persona: 'parent' })).toBe(ROLE_PARENT)
  })

  it('⚠️ le lien PRIME sur le persona : un enfant n’est jamais un apprenant', () => {
    // L'enfant autonome ne paie pas. Le confondre avec l'apprenant majeur lui
    // ouvrirait les écrans d'abonnement.
    expect(deduireRoleCompte({ lien: { enfantId: 'ea-7' }, persona: 'apprenant' })).toBe(ROLE_ENFANT)
  })

  it('aucun indice → parent, le cas le plus courant', () => {
    expect(deduireRoleCompte()).toBe(ROLE_PARENT)
    expect(deduireRoleCompte({ lien: null, persona: '' })).toBe(ROLE_PARENT)
  })

  it('une valeur inconnue ne devient pas un rôle', () => {
    expect(roleB2C('directeur')).toBe(ROLE_PARENT)
    expect(roleB2C(undefined)).toBe(ROLE_PARENT)
    expect(roleB2C('APPRENANT')).toBe(ROLE_APPRENANT) // casse ignorée
  })
})

describe('type d’une fiche b2c', () => {
  it('un compte apprenant n’héberge que sa PROPRE fiche', () => {
    expect(typeProfilPour(ROLE_APPRENANT)).toBe(PROFIL_APPRENANT)
  })

  it('un compte parent, comme un compte enfant, n’héberge que des fiches d’enfant', () => {
    expect(typeProfilPour(ROLE_PARENT)).toBe(PROFIL_ENFANT)
    expect(typeProfilPour(ROLE_ENFANT)).toBe(PROFIL_ENFANT)
  })

  it('une fiche DÉJÀ typée fait foi, même si le compte dit autre chose', () => {
    // Sinon un parent qui prête son appareil retyperait la fiche de son enfant.
    expect(typeProfilDe({ typeProfil: PROFIL_ENFANT }, ROLE_APPRENANT)).toBe(PROFIL_ENFANT)
    expect(typeProfilDe({ typeProfil: PROFIL_APPRENANT }, ROLE_PARENT)).toBe(PROFIL_APPRENANT)
  })

  it('une fiche non typée (créée avant le champ) est déduite du compte', () => {
    expect(typeProfilDe({}, ROLE_APPRENANT)).toBe(PROFIL_APPRENANT)
    expect(typeProfilDe(null, ROLE_PARENT)).toBe(PROFIL_ENFANT)
  })
})

describe('⚠️ le repli de loadUserProfile ne ment plus, et il PERSISTE', () => {
  /** Le bloc 4) : « Aucune école / invitation ». */
  const repli = () => {
    const code = sansCommentaires(AUTH)
    const i = code.indexOf('const nomComplet =')
    expect(i).toBeGreaterThan(0)
    return code.slice(i, code.indexOf('notProvisioned.value = false', i))
  }

  it('plus aucun rôle en dur dans le profil de repli', () => {
    expect(repli()).not.toMatch(/role:\s*'parent'/)
  })

  it('le rôle est classé à partir des indices disponibles', () => {
    expect(repli()).toContain('deduireRoleCompte({ lien, persona })')
  })

  it('les deux indices sont réellement lus', () => {
    const b = repli()
    expect(b).toContain("'b2c', 'link'")
    expect(b).toContain("'mapoplus_users'")
  })

  it('⭐ le profil réparé est ÉCRIT — sans quoi la panne se rejoue à chaque connexion', () => {
    expect(repli()).toMatch(/setDoc\(doc\(db, 'users', firebaseUser\.uid\), \{ \.\.\.profilB2C/)
  })

  it('⚠️ mais UNIQUEMENT sur MAPO+, pour ne pas condamner une invitation d’école', () => {
    // L'étape 3) (provisioning par invitation) ne s'exécute que tant qu'aucun
    // `users/{uid}` n'existe. Figer un profil B2C sur le domaine de l'ERP
    // interdirait à jamais le rattachement à une école.
    const b = repli()
    const g = b.indexOf('if (isMapoPlusTenant())')
    expect(g).toBeGreaterThan(0)
    expect(b.indexOf('setDoc(doc(db, \'users\', firebaseUser.uid)')).toBeGreaterThan(g)
  })
})

describe('la fiche dit qui elle décrit', () => {
  it('le type est posé à la création', () => {
    expect(EA).toContain('typeProfil: typeProfilPour(authStore.userProfile?.role)')
  })

  it('⭐ et répété à la RACINE du document, lisible dans la console Firestore', () => {
    // C'est la demande exacte de Steve : voir la différence sans déplier la carte.
    expect(EA).toMatch(/setDoc\(enfantDocRef\(uid, e\.id\), \{ enfant: e, typeProfil: typeProfilDe\(/)
  })

  it('les fiches antérieures sont rattrapées une fois, puis persistées', () => {
    const code = sansCommentaires(EA)
    expect(code).toContain('const manquants = profils.filter((p) => !p.typeProfil)')
    expect(code).toContain('for (const p of manquants) persist(p.id)')
  })
})

describe('⚠️ deux rôles apprennent, pas un seul', () => {
  it('l’enfant autonome ouvre le mode apprenant comme le majeur', () => {
    const code = sansCommentaires(EA)
    expect(code).toContain("ROLES_APPRENANTS.includes(authStore.userProfile?.role) ? 'apprenant' : 'parent'")
    expect(code).toContain('const ROLES_APPRENANTS = [ROLE_APPRENANT, ROLE_ENFANT]')
  })

  it('le choix local reste prioritaire sur le rôle du compte', () => {
    // Il porte la bascule « je confie le téléphone », que le profil ne doit pas annuler.
    const code = sansCommentaires(EA)
    const i = code.indexOf('function loadMode()')
    const bloc = code.slice(i, i + 600)
    expect(bloc.indexOf("if (local === 'apprenant'")).toBeLessThan(bloc.indexOf('ROLES_APPRENANTS'))
  })
})
