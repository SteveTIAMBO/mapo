/**
 * Le rôle choisi à l'inscription doit être celui qu'on enregistre.
 *
 * Mesuré sur un vrai compte MAPO+ créé en mode apprenant (24/08) : son profil
 * Firestore portait `role: "parent"`. La cause était écrite en clair dans
 * `signUpWithEmail` — `role: 'parent'` EN DUR, `meta.role` ignoré.
 *
 * ⚠️ CE QUI REND LA CORRECTION DÉLICATE. Le confinement de MAPO+ s'appuyait sur
 * `role === 'parent'`, donc il ne marchait que par ACCIDENT : c'est parce que
 * tout le monde était étiqueté « parent » que personne ne sortait de son espace.
 * Rendre le rôle sincère aurait laissé l'apprenant errer dans l'ERP, où le RBAC
 * l'aurait renvoyé au Dashboard — une boucle, sans la moindre erreur à l'écran.
 * Le garde teste donc désormais ce qui définit vraiment ces comptes : `b2c`.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, 'src', p), 'utf8')
const AUTH = lire('stores/auth.js')
const ROUTEUR = lire('router/index.js')
const STORE = lire('stores/enfantsAutonomes.js')

describe('l’inscription enregistre le rôle réellement choisi', () => {
  it('le profil reçoit « apprenant » quand c’est ce qui a été coché', () => {
    expect(AUTH).toContain("role: meta.role === 'apprenant' ? 'apprenant' : 'parent',")
  })

  it('⚠️ plus aucun rôle écrit en dur dans la création de compte B2C', () => {
    const i = AUTH.indexOf('async function signUpWithEmail')
    const bloc = AUTH.slice(i, AUTH.indexOf('async function', i + 40))
    expect(bloc).not.toContain("role: 'parent',")
  })

  it('le suivi d’adoption reste cohérent avec le profil', () => {
    // `mapoplus_users.persona` disait déjà vrai : c'est le profil qui mentait.
    expect(AUTH).toContain("persona: meta.role === 'apprenant' ? 'apprenant' : 'parent',")
  })
})

describe('le confinement MAPO+ ne repose plus sur le libellé du rôle', () => {
  it('il teste la nature B2C du compte', () => {
    expect(ROUTEUR).toContain("const isB2C = authStore.userProfile?.b2c === true || isParent")
  })

  it('un apprenant reste enfermé dans son espace, comme un parent', () => {
    expect(ROUTEUR).toContain("if (isB2C && !routePublique && to.name !== 'ParentMiapo' && to.name !== 'Profil')")
  })

  it('et n’est pas soumis au contrôle de permissions de l’ERP', () => {
    // Sinon : refus d'accès, renvoi au Dashboard, lui-même interdit — la boucle.
    expect(ROUTEUR).toContain('if (isLoggedIn && !isB2C) {')
  })

  it('les comptes créés AVANT le champ b2c restent couverts', () => {
    // Leur profil n'a que `role: 'parent'` : les exclure les aurait libérés
    // dans l'ERP du jour au lendemain.
    expect(ROUTEUR).toMatch(/isB2C = [^\n]*\|\| isParent/)
  })
})

describe('le point de vue suit l’apprenant d’un appareil à l’autre', () => {
  it('à défaut de choix local, le rôle du profil décide', () => {
    expect(STORE).toContain("mode.value = authStore.userProfile?.role === 'apprenant' ? 'apprenant' : 'parent'")
  })

  it('⚠️ mais le choix LOCAL reste prioritaire', () => {
    // C'est lui qui porte « je confie le téléphone à mon enfant » : le profil
    // du parent annulerait cette bascule à chaque rechargement.
    expect(STORE).toContain("if (local === 'apprenant' || local === 'parent') mode.value = local")
  })
})
