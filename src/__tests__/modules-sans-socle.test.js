import { describe, it, expect } from 'vitest'
import {
  MODULES_INFO, MODULES_VERSION, MODULES_STRUCTURE, MODULES_PEDAGOGIE, MODULES_SERVICES,
  EDITIONS, packModules,
} from '../stores/megaAdmin'
import { SOCLE_MODULES } from '../stores/permissions'

/**
 * Suppression du socle : chaque module se coche individuellement.
 *
 * Le danger n'est pas la fonctionnalité, il est dans la MIGRATION. Les écoles
 * créées avant ce changement ont un `modulesActifs` qui ne liste QUE les modules
 * optionnels, le socle étant implicite. Si l'on se met à filtrer toutes les clés
 * sur cette liste, ces écoles perdent d'un coup Élèves, Classes, Paramètres et
 * Accès, sans un message. D'où le marqueur `modulesVersion`, que ces tests
 * protègent.
 */

// Reproduction fidèle de `isModuleActif` (schoolIdentity.js), sans Firestore.
function isModuleActif(school, key) {
  const trialActif = school.trialUntil ? new Date(school.trialUntil).getTime() > Date.now() : false
  if (trialActif) return true
  const m = school.modulesActifs || null
  if (!m) return true
  const version = Number(school.modulesVersion) || 1
  if (version < 2 && SOCLE_MODULES.includes(key)) return true
  return m.includes(key)
}

describe('catalogue des modules', () => {
  it('tout module proposé porte un libellé et une description', () => {
    for (const k of [...MODULES_STRUCTURE, ...MODULES_PEDAGOGIE, ...MODULES_SERVICES]) {
      expect(MODULES_INFO[k], `le module ${k} doit être décrit`).toBeTruthy()
      expect(MODULES_INFO[k].label).toBeTruthy()
      expect(MODULES_INFO[k].description).toBeTruthy()
    }
  })

  it('l’ancien socle est devenu cochable, il n’est plus caché', () => {
    // C'est le cœur de la demande : plus rien n'est imposé et invisible.
    for (const k of ['eleves', 'classes', 'parametres', 'roles', 'dashboard', 'cantine']) {
      expect(EDITIONS.secondaire.modulesDisponibles, `${k} doit être proposé`).toContain(k)
    }
  })

  it('le cahier de préparation est proposé', () => {
    expect(EDITIONS.secondaire.modulesDisponibles).toContain('preparation')
  })

  it('un pack inclut la structure, sinon l’école naîtrait sans ses élèves', () => {
    const free = packModules('secondaire', 'free')
    for (const k of MODULES_STRUCTURE) expect(free).toContain(k)
    expect(free).toContain('presences')
  })

  it('un pack ne contient pas de doublon', () => {
    const p = packModules('secondaire', 'premium')
    expect(p.length).toBe(new Set(p).size)
  })
})

describe('migration des écoles existantes', () => {
  // École créée AVANT : sa liste ne contient que les modules optionnels.
  const ancienne = { modulesActifs: ['notes', 'presences'] }
  // École créée APRÈS : sa liste fait foi pour tout.
  const nouvelle = { modulesActifs: ['notes', 'presences'], modulesVersion: MODULES_VERSION }

  it('une ancienne école GARDE sa structure, malgré une liste qui ne la mentionne pas', () => {
    for (const k of ['eleves', 'classes', 'parametres', 'roles']) {
      expect(isModuleActif(ancienne, k), `${k} ne doit pas disparaître`).toBe(true)
    }
  })

  it('une ancienne école garde aussi ses services', () => {
    expect(isModuleActif(ancienne, 'cantine')).toBe(true)
    expect(isModuleActif(ancienne, 'bibliotheque')).toBe(true)
  })

  it('une ancienne école n’obtient pas pour autant les modules non cochés', () => {
    expect(isModuleActif(ancienne, 'facturation')).toBe(false)
    expect(isModuleActif(ancienne, 'discipline')).toBe(false)
  })

  it('une nouvelle école obéit strictement à sa liste', () => {
    expect(isModuleActif(nouvelle, 'notes')).toBe(true)
    expect(isModuleActif(nouvelle, 'eleves')).toBe(false)
    expect(isModuleActif(nouvelle, 'parametres')).toBe(false)
    expect(isModuleActif(nouvelle, 'cantine')).toBe(false)
  })

  it('une école sans liste du tout n’est enfermée nulle part', () => {
    // Cas d'une école pas encore configurée : on ne lui coupe pas l'accès.
    expect(isModuleActif({}, 'eleves')).toBe(true)
    expect(isModuleActif({}, 'facturation')).toBe(true)
  })

  it('l’essai version complète ouvre tout, quel que soit le modèle', () => {
    const dans2mois = new Date(Date.now() + 60 * 86400000).toISOString()
    const bridee = { modulesActifs: [], modulesVersion: 2, trialUntil: dans2mois }
    expect(isModuleActif(bridee, 'facturation')).toBe(true)
    expect(isModuleActif(bridee, 'eleves')).toBe(true)
  })

  it('un essai EXPIRÉ ne rouvre rien', () => {
    const hier = new Date(Date.now() - 86400000).toISOString()
    const expiree = { modulesActifs: ['notes'], modulesVersion: 2, trialUntil: hier }
    expect(isModuleActif(expiree, 'notes')).toBe(true)
    expect(isModuleActif(expiree, 'facturation')).toBe(false)
  })
})

describe('tout décocher est un choix, pas une absence de choix', () => {
  it('une liste vide en version 2 ne réactive rien', () => {
    const vide = { modulesActifs: [], modulesVersion: 2 }
    for (const k of ['eleves', 'notes', 'dashboard', 'parametres']) {
      expect(isModuleActif(vide, k)).toBe(false)
    }
  })
})
