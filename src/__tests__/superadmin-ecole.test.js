import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Un super-admin EDUFREM peut AUSSI être rattaché à une école (25/08/2026).
 *
 * Défaut vécu : `contact@edufrem.com` a été invité comme administrateur de la
 * première école réelle. L'invitation est restée « en attente » indéfiniment,
 * et renvoyer l'e-mail n'y changeait rien — parce que `loadUserProfile`
 * court-circuite tout le flux école dès qu'un document `superAdmins/{uid}`
 * existe, et RETOURNE avant l'étape de provisionnement par invitation.
 *
 * Écrire le profil à la main n'aurait pas aidé davantage : il n'était pas lu.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(racine, 'stores/auth.js'), 'utf8')

const brancheSuper = (() => {
  const i = src.indexOf("getDoc(doc(db, 'superAdmins'")
  return src.slice(i, src.indexOf('Lecture réussie et aucun document', i))
})()

describe('le court-circuit super-admin ne masque plus l’école', () => {
  it('le profil d’école est lu même pour un super-admin', () => {
    expect(brancheSuper).toContain("getDoc(doc(db, 'users', firebaseUser.uid))")
  })

  it('un rattachement existant fournit schoolId et role', () => {
    expect(brancheSuper).toContain('profilEcole.schoolId')
    expect(brancheSuper).toContain('profilEcole.role')
  })

  it('⚠️ le drapeau super-admin reste vrai — l’accès au méga-admin est conservé', () => {
    // Le remplacer par un rôle d'école ferait perdre la console EDUFREM à
    // l'équipe au moment même où elle entre dans une école pour dépanner.
    expect(brancheSuper).toContain('isSuperAdmin.value = true')
  })

  it('sans profil d’école, le comportement est INCHANGÉ', () => {
    // Le changement est additif : `schoolId: null` reste le défaut, et n'est
    // remplacé que si un rattachement existe réellement.
    expect(brancheSuper).toContain('schoolId: null')
    expect(brancheSuper).toContain('profilEcole ?')
  })

  it('une lecture impossible ne retire pas l’accès acquis', () => {
    // Hors ligne ou règle refusée : on garde le profil super-admin seul plutôt
    // que de rejeter quelqu'un dont les droits sont valides.
    expect(brancheSuper).toMatch(/catch\s*\([^)]*\)\s*\{/)
  })
})

describe('⚠️ « déjà membre » ne se dit pas « invitation déjà envoyée »', () => {
  /**
   * Écran vu par Steve le 27/08 : il était rattaché à epc1, et « + Admin »
   * répondait « une invitation est déjà en attente », en proposant un renvoi
   * sans objet. La fonction ne regardait que la collection `invitations` — elle
   * décrivait la boîte aux lettres alors que la question portait sur la serrure.
   */
  const store = fs.readFileSync(path.join(racine, 'stores/megaAdmin.js'), 'utf8')
  const vue = fs.readFileSync(path.join(racine, 'views/MegaAdminView.vue'), 'utf8')
  const bloc = (() => {
    const i = store.indexOf('async function ajouterAdministrateur')
    return store.slice(i, store.indexOf('\n  }\n', store.indexOf('return { ok: true, role, mailEnvoye', i)))
  })()

  it('l’appartenance est vérifiée AVANT les invitations', () => {
    const iMembres = bloc.indexOf("collection(db, 'users')")
    const iInvit = bloc.indexOf("collection(db, 'invitations')")
    expect(iMembres).toBeGreaterThan(0)
    expect(iInvit).toBeGreaterThan(0)
    expect(iMembres).toBeLessThan(iInvit)
  })

  it('seul un membre ACTIF compte comme rattaché', () => {
    // Un profil `status: 'pending'` ne donne aucun accès : le confondre avec un
    // membre ferait refuser l'invitation dont la personne a précisément besoin.
    expect(bloc).toContain("'active'")
    expect(bloc).toContain("reason: 'deja_membre'")
  })

  it('l’invitation devenue inutile est clôturée, pas laissée « en attente »', () => {
    expect(bloc).toContain('cloturerInvitations(')
    expect(store).toContain("status: 'accepted'")
  })

  it('l’écran l’annonce comme une réussite, sans proposer de renvoi', () => {
    const i = vue.indexOf("r.reason === 'deja_membre'")
    expect(i).toBeGreaterThan(0)
    const suite = vue.slice(i, i + 400)
    expect(suite).toContain('d.ok =')
    expect(suite).not.toContain('dejaInvite = true')
  })
})
