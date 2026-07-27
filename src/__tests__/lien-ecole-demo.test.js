/**
 * Test — parcours de liaison en mode DÉMO (aucun serveur/clé requis).
 * Vérifie que le code démo relie Awa au Collège EDUFREM et que les 4 modules
 * (devoirs, cours, bulletins par période, messagerie reçus/envoyés) répondent.
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

  it('devoirs : liste non vide, un rendu noté, un à faire en ligne', async () => {
    const s = useLienEcoleStore()
    const r = await s.fetchDevoirs('edufrem-demo', 'demo-awa')
    expect(r.ok).toBe(true)
    expect(r.devoirs.length).toBeGreaterThan(0)
    expect(r.devoirs.some((d) => d.submission && d.submission.grade != null)).toBe(true)
    // Au moins un devoir en ligne non encore rendu (cliquable → à faire).
    expect(r.devoirs.some((d) => d.isDigital && !d.submission)).toBe(true)
  })

  it('rendre un devoir en ligne renvoie une soumission', async () => {
    const s = useLienEcoleStore()
    const sub = await s.submitDevoir('edufrem-demo', 'demo-awa', 'dv4', 'family = famille')
    expect(sub.ok).toBe(true)
    expect(sub.submission.text).toContain('famille')
  })

  it('cours : au moins un PDF consultable + une carte-leçon', async () => {
    const s = useLienEcoleStore()
    const r = await s.fetchCours('edufrem-demo', 'demo-awa')
    expect(r.ok).toBe(true)
    expect(r.cours.some((c) => c.fileData && c.fileViewable)).toBe(true)
    expect(r.cours.some((c) => !c.hasFile && c.contenu)).toBe(true)
  })

  it('bulletins : plusieurs moments + format école (rang, mention, appréciation)', async () => {
    const s = useLienEcoleStore()
    const per = await s.fetchPeriodes('edufrem-demo', 'demo-awa')
    expect(per.ok).toBe(true)
    expect(per.periodes.length).toBeGreaterThan(1)
    const r = await s.fetchNotes('edufrem-demo', 'demo-awa', 'trim1')
    expect(r.ok).toBe(true)
    expect(r.bulletin.periode).toBe('1er Trimestre')
    expect(r.bulletin.matieres.length).toBeGreaterThan(3)
    expect(r.bulletin.rang).toBeGreaterThan(0)
    expect(r.bulletin.moyenneGenerale).toBeGreaterThan(0)
    expect(r.bulletin.directeur).toBeTruthy()
    expect(r.bulletin.appreciationGenerale).toBeTruthy()
    expect(r.bulletin.verifCode).toBeTruthy()
    // Le trimestre expose 2 séquences (format complet).
    expect(r.bulletin.sequences.length).toBe(2)
  })

  it('messagerie : reçus + envoyés, et l\'envoi ajoute un message', async () => {
    const s = useLienEcoleStore()
    const before = (await s.fetchMessages('edufrem-demo', 'demo-awa')).messages
    expect(before.some((m) => m.from === 'ecole')).toBe(true)
    expect(before.some((m) => m.from === 'moi')).toBe(true)
    const sent = await s.sendMessage('edufrem-demo', 'demo-awa', { text: 'Bonjour, merci pour le suivi.', subject: 'Suivi', to: 'Administration' })
    expect(sent.ok).toBe(true)
    const after = (await s.fetchMessages('edufrem-demo', 'demo-awa')).messages
    expect(after.length).toBe(before.length + 1)
    const last = after[after.length - 1]
    expect(last.body).toContain('Bonjour')
    expect(last.from).toBe('moi')
  })

  it('destinataires : services + enseignants disponibles', async () => {
    const s = useLienEcoleStore()
    const r = await s.fetchDestinataires('edufrem-demo', 'demo-awa')
    expect(r.ok).toBe(true)
    expect(r.destinataires.length).toBeGreaterThan(2)
    expect(r.destinataires.some((d) => d.type === 'enseignant')).toBe(true)
  })
})
