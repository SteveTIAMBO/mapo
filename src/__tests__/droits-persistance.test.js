/**
 * Rôles et accès — les droits doivent être ÉCRITS, et l'écran doit le dire.
 *
 * Constat de l'audit du 02/09 : `loadRoles()` et `saveRoles()` n'avaient de
 * corps que sous `if (isDemo)`. Hors démonstration, le directeur retirait un
 * accès, le bandeau confirmait, et rien n'était persisté — au rechargement les
 * défauts revenaient. Pire, `handleSave()` n'appelait même pas `saveRoles()`.
 * Un faux paramètre, sur des DROITS : le cloisonnement d'une école reposait sur
 * un écran qui mentait.
 *
 * Ces tests visent le comportement du store contre un faux Firestore, plus
 * quelques assertions de source sur la vue (pas de moteur de rendu ici).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const lire = (p) => readFileSync(resolve(ICI, '..', p), 'utf-8')

// ── Faux Firestore : un seul document, on observe ce qui y est écrit ────────
const disque = { roles: null, ecritures: 0, echecEcriture: false, echecLecture: false }

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null } }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, ...seg) => ({ path: seg.join('/') }),
  getDoc: async (ref) => {
    if (disque.echecLecture) throw Object.assign(new Error('nope'), { code: 'permission-denied' })
    return {
      exists: () => disque.roles !== null,
      data: () => ({ roles: disque.roles }),
      _path: ref.path,
    }
  },
  setDoc: async (ref, data) => {
    if (disque.echecEcriture) throw Object.assign(new Error('nope'), { code: 'permission-denied' })
    disque.ecritures++
    disque.roles = JSON.parse(JSON.stringify(data.roles))
    disque.dernierChemin = ref.path
  },
}))

// Profil pilotable : c'est la direction d'une vraie école, pas la démo.
const profil = { isDemo: false, schoolId: 'ecole-1', isDirecteur: true, userProfile: { role: 'directeur' } }
vi.mock('../stores/auth', () => ({ useAuthStore: () => profil }))

const { usePermissionsStore, DEFAULT_ROLES } = await import('../stores/permissions')

describe('Droits : persistance en mode école', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    disque.roles = null
    disque.ecritures = 0
    disque.echecEcriture = false
    disque.echecLecture = false
    profil.isDemo = false
    profil.schoolId = 'ecole-1'
    profil.isDirecteur = true
  })

  it('enregistre la matrice dans le document de l’école', async () => {
    const p = usePermissionsStore()
    p.updatePermission('comptable', 'eleves', 'none')
    const res = await p.saveRoles()

    expect(res.ok).toBe(true)
    expect(disque.ecritures).toBe(1)
    expect(disque.dernierChemin).toBe('schools/ecole-1/config/roles')
    expect(disque.roles.comptable.permissions.eleves).toBe('none')
  })

  it('relit ce qui a été enregistré : le droit retiré le reste', async () => {
    const p1 = usePermissionsStore()
    p1.updatePermission('comptable', 'eleves', 'none')
    await p1.saveRoles()

    // Nouvelle session, store neuf.
    setActivePinia(createPinia())
    const p2 = usePermissionsStore()
    expect(p2.roles.comptable.permissions.eleves).not.toBe('none') // avant chargement
    await p2.loadRoles()
    expect(p2.roles.comptable.permissions.eleves).toBe('none')
  })

  it('un refus d’écriture est RAPPORTÉ, pas avalé', async () => {
    disque.echecEcriture = true
    const p = usePermissionsStore()
    p.updatePermission('comptable', 'eleves', 'none')
    const res = await p.saveRoles()

    expect(res.ok).toBe(false)
    expect(res.reason).toBeTruthy()
    expect(p.erreur).toBe('permission-denied')
    expect(disque.roles).toBe(null)
  })

  it('un échec de LECTURE est signalé : « défauts » ≠ « je n’ai pas pu lire »', async () => {
    disque.echecLecture = true
    const p = usePermissionsStore()
    await p.loadRoles()
    expect(p.erreur).toBe('permission-denied')
  })

  it('hors direction, l’enregistrement est refusé et le dit', async () => {
    profil.isDirecteur = false
    const p = usePermissionsStore()
    const res = await p.saveRoles()
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('interdit')
    expect(disque.ecritures).toBe(0)
  })

  it('sans école, on ne prétend pas avoir enregistré', async () => {
    profil.schoolId = null
    const p = usePermissionsStore()
    const res = await p.saveRoles()
    expect(res.ok).toBe(false)
    expect(disque.ecritures).toBe(0)
  })

  it('un rôle disparu du produit ne ressuscite pas à la lecture', async () => {
    disque.roles = { comptable: { label: 'x', permissions: { eleves: 'none' } }, role_fantome: { label: 'Fantôme', permissions: {} } }
    const p = usePermissionsStore()
    await p.loadRoles()
    expect(p.roles.role_fantome).toBeUndefined()
    expect(p.roles.comptable.permissions.eleves).toBe('none')
  })
})

describe('Droits : la constante par défaut ne doit jamais être mutée', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    disque.roles = null
    profil.isDemo = false
    profil.isDirecteur = true
    profil.schoolId = 'ecole-1'
  })

  it('modifier un rôle ne réécrit pas DEFAULT_ROLES', () => {
    const avant = DEFAULT_ROLES.comptable.permissions.eleves
    const p = usePermissionsStore()
    p.updatePermission('comptable', 'eleves', 'none')
    expect(DEFAULT_ROLES.comptable.permissions.eleves).toBe(avant)
  })

  it('« remettre par défaut » remet vraiment la valeur d’origine', () => {
    const p = usePermissionsStore()
    const origine = DEFAULT_ROLES.comptable.permissions.eleves
    p.updatePermission('comptable', 'eleves', 'none')
    expect(p.roles.comptable.permissions.eleves).toBe('none')
    p.resetRole('comptable')
    expect(p.roles.comptable.permissions.eleves).toBe(origine)
  })
})

describe('Droits : un seul chemin d’écriture', () => {
  it('updatePermission et resetRole ne déclenchent PLUS d’écriture cachée', async () => {
    setActivePinia(createPinia())
    disque.roles = null
    disque.ecritures = 0
    const p = usePermissionsStore()
    p.updatePermission('comptable', 'eleves', 'none')
    p.resetRole('comptable')
    // Laisse tourner d'éventuelles promesses lancées sans await.
    await new Promise((r) => setTimeout(r, 0))
    expect(disque.ecritures).toBe(0)
  })
})

describe('Droits : ce que l’écran fait du résultat', () => {
  const vue = lire('views/RolesView.vue')
  const code = vue.slice(vue.indexOf('<script setup>'))

  it('handleSave appelle saveRoles et attend son retour', () => {
    const bloc = code.slice(code.indexOf('const handleSave'), code.indexOf('const handleCancel'))
    expect(bloc).toMatch(/await\s+permissionsStore\.saveRoles\(\)/)
  })

  it('en cas d’échec, le bandeau ne disparaît pas', () => {
    const bloc = code.slice(code.indexOf('const handleSave'), code.indexOf('const handleCancel'))
    // `dirty = false` ne doit apparaître QUE dans la branche de succès.
    const succes = bloc.slice(bloc.indexOf('if (res?.ok)'), bloc.indexOf('return'))
    expect(succes).toContain('dirty.value = false')
    const apres = bloc.slice(bloc.indexOf('return') + 6)
    expect(apres).not.toContain('dirty.value = false')
  })

  it('« Annuler » relit la matrice enregistrée', () => {
    const debut = code.indexOf('const handleCancel')
    // ⚠️ `indexOf('onMounted')` tombait sur l'IMPORT, en tête de fichier : la
    // tranche était vide et le test échouait sur du néant. On borne après.
    const bloc = code.slice(debut, code.indexOf('onMounted(', debut))
    expect(bloc).toMatch(/await\s+permissionsStore\.loadRoles\(\)/)
  })

  it('les trois retours possibles ont un message, et un échec de lecture aussi', () => {
    for (const cle of ['rolesv.saved', 'rolesv.saveFailed', 'rolesv.saveForbidden']) {
      expect(code).toContain(cle)
    }
    expect(vue).toContain('rolesv.loadFailed')
    expect(vue).toContain('permissionsStore.erreur')
  })

  it('le message est réellement affiché dans le bandeau', () => {
    const tpl = vue.slice(0, vue.indexOf('<script setup>'))
    expect(tpl).toContain('enregistrement')
  })

  it('la remise à zéro passe par « Enregistrer »', () => {
    const bloc = code.slice(code.indexOf('const handleReset'), code.indexOf('const resetSelectedRole'))
    expect(bloc).toContain('dirty.value = true')
  })
})
