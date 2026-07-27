/**
 * Test de composant — MiapoAppariement (jeu de paires).
 * Vérifie la logique cœur SANS navigateur : tap-to-match relie les bonnes paires,
 * le score de maîtrise se calcule, une mauvaise association ne valide pas, et la
 * partie se termine quand toutes les paires sont reliées.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// ── Dépendances mockées (pas de réseau, pas de firebase) ──
const tuteurMock = {
  genererAppariement: vi.fn(async () => ({
    ok: true, titre: 'Animaux',
    paires: [{ a: 'chat', b: 'cat' }, { a: 'chien', b: 'dog' }, { a: 'oiseau', b: 'bird' }],
  })),
  getLevel: () => 1,
  syncFromCloud: vi.fn(async () => {}),
  getAllRevisionStates: () => ({}),
  recordResult: vi.fn(() => ({ level: 1, levelChange: 0 })),
  saveRevisionSession: vi.fn(),
}
vi.mock('../stores/tuteur', () => ({ useTuteurStore: () => tuteurMock }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k, locale: { value: 'fr' } }) }))
vi.mock('../utils/coursPerso', () => ({ coursTexteMatiere: () => '' }))
vi.mock('../utils/digestApprenant', () => ({ digestApprenant: () => '' }))
vi.mock('../stores/enfantsAutonomes', () => ({ NIVEAUX_PRIMAIRE: [], NIVEAUX_PRIMAIRE_FR: [] }))
vi.mock('../utils/humeur', () => ({
  enregistrerSeance: () => {}, peutDemanderFeedback: () => false,
  marquerFeedbackMontre: () => {}, enregistrerFeedback: () => {},
}))

import MiapoAppariement from '../components/MiapoAppariement.vue'

async function mountJeu() {
  const w = mount(MiapoAppariement, { props: { enfant: { id: 'e1', niveau: '5ème' }, matiere: 'Anglais' } })
  await flushPromises() // laisse onMounted→start()→genererAppariement se résoudre
  await flushPromises()
  return w
}

beforeEach(() => { vi.clearAllMocks() })

describe('MiapoAppariement — tap-to-match', () => {
  it('charge 3 paires et affiche le plateau', async () => {
    const w = await mountJeu()
    expect(tuteurMock.genererAppariement).toHaveBeenCalledOnce()
    expect(w.findAll('.appa-card').length).toBe(6) // 3 à gauche + 3 à droite
  })

  it('relie toutes les paires → résultat 100 % (aucune erreur)', async () => {
    const w = await mountJeu()
    // pairId = p0,p1,p2 ; cartes gauche = L+pairId, droite = R+pairId.
    for (const p of ['p0', 'p1', 'p2']) {
      await w.get(`[data-key="L${p}"]`).trigger('click')
      await w.get(`[data-key="R${p}"]`).trigger('click')
    }
    await flushPromises()
    expect(w.text()).toContain('100%')
    expect(tuteurMock.recordResult).toHaveBeenCalled()
    // la maîtrise passée à recordResult doit être 100 (3/3 du 1er coup)
    expect(tuteurMock.recordResult.mock.calls[0][3]).toBe(100)
  })

  it('une mauvaise association ne valide pas la paire', async () => {
    const w = await mountJeu()
    await w.get('[data-key="Lp0"]').trigger('click') // chat
    await w.get('[data-key="Rp1"]').trigger('click') // dog (mauvais)
    await flushPromises()
    // p0 non résolu → sa carte gauche reste active (non disabled)
    expect(w.get('[data-key="Lp0"]').attributes('disabled')).toBeUndefined()
    expect(w.text()).not.toContain('100%')
  })

  it('une erreur puis correction → maîtrise < 100 (pas du 1er coup)', async () => {
    const w = await mountJeu()
    // p0 : d'abord une erreur, puis la bonne
    await w.get('[data-key="Lp0"]').trigger('click')
    await w.get('[data-key="Rp1"]').trigger('click') // faux
    await w.get('[data-key="Lp0"]').trigger('click')
    await w.get('[data-key="Rp0"]').trigger('click') // juste
    await w.get('[data-key="Lp1"]').trigger('click')
    await w.get('[data-key="Rp1"]').trigger('click')
    await w.get('[data-key="Lp2"]').trigger('click')
    await w.get('[data-key="Rp2"]').trigger('click')
    await flushPromises()
    const mastery = tuteurMock.recordResult.mock.calls[0][3]
    expect(mastery).toBeLessThan(100)
    expect(mastery).toBeGreaterThanOrEqual(66) // 2/3 du 1er coup
  })
})
