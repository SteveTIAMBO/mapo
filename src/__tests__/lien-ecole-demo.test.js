/**
 * Test — parcours de liaison en mode DÉMO (aucun serveur/clé requis).
 * Vérifie que le code démo relie Awa au Collège EDUFREM et que les 4 modules
 * (devoirs, cours, bulletin, messagerie) répondent, y compris l'envoi d'un message.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../stores/auth', () => ({ useAuthStore: () => ({ isDemo: true }) }))
vi.mock('../firebase', () => ({ auth: { currentUser: null } }))

import { useLienEcoleStore } from '../stores/lienEcole'
import { DEMO_LINK_CODE } from '../data/demoEcoleLiee'

beforeEach(() => { setActivePinia(createPinia()) })

describe('lienEcole — mode démo', () => {
  it('le code démo relie au Collège EDUFREM', async () => {
    const s = useLienEcoleStore()
    const r = await s.redeemCode(DEMO_LINK_CODE)
    expect(r.ok).toBe(true)
    expect(r.lien.ecole).toBe('Collège EDUFREM')
    expect(r.lien.className).toBe('5ème')
    expect(r.lien.schoolId).toBeTruthy()
  })

  it('un code vide est refusé', async () => {
    const s = useLienEcoleStore()
    expect((await s.redeemCode('')).reason).toBe('code_vide')
  })

  it('devoirs : liste non vide + un rendu noté', async () => {
    const s = useLienEcoleStore()
    const r = await s.fetchDevoirs('edufrem-demo')
    expect(r.ok).toBe(true)
    expect(r.devoirs.length).toBeGreaterThan(0)
    expect(r.devoirs.some((d) => d.submission && d.submission.grade != null)).toBe(true)
  })

  it('bulletin : matières + rang + mention', async () => {
    const s = useLienEcoleStore()
    const r = await s.fetchNotes('edufrem-demo')
    expect(r.ok).toBe(true)
    expect(r.bulletin.matieres.length).toBeGreaterThan(3)
    expect(r.bulletin.rang).toBeGreaterThan(0)
    expect(r.bulletin.moyenneGenerale).toBeGreaterThan(0)
  })

  it('cours : au moins un cours avec contenu', async () => {
    const s = useLienEcoleStore()
    const r = await s.fetchCours('edufrem-demo')
    expect(r.ok).toBe(true)
    expect(r.cours.some((c) => c.contenu)).toBe(true)
  })

  it('messagerie : lecture puis envoi ajoute le message', async () => {
    const s = useLienEcoleStore()
    const before = (await s.fetchMessages('edufrem-demo')).messages.length
    const sent = await s.sendMessage('edufrem-demo', 'Bonjour, merci pour le suivi.')
    expect(sent.ok).toBe(true)
    const after = await s.fetchMessages('edufrem-demo')
    expect(after.messages.length).toBe(before + 1)
    expect(after.messages[after.messages.length - 1].text).toContain('Bonjour')
    expect(after.messages[after.messages.length - 1].from).toBe('moi')
  })
})
