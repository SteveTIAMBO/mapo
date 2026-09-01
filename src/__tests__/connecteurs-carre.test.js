/**
 * Le store Carré, EXÉCUTÉ — pas seulement relu.
 *
 * ⚠️⚠️ POURQUOI CE FICHIER EXISTE (29/08). `carre-modules.test.js` lit
 * `connecteurs.js` comme du TEXTE (readFileSync + expect().toContain()). Le
 * jour où une fonction s'est retrouvée collée AU MILIEU du `return {}` du
 * store, les 1 399 tests sont restés verts : un fichier qui ne compile pas
 * passe très bien un `toContain`. Seul `vite build` a hurlé.
 *
 * Encore la même famille de piège que d'habitude : **mesurer avec le mauvais
 * instrument**. Un test qui IMPORTE le module le fait passer par le
 * transformeur, donc par le parseur — la faute de syntaxe devient rouge tout
 * de suite, au lieu d'attendre le build.
 *
 * On en profite pour éprouver le comportement réel des deux fonctions, avec un
 * `fetch` simulé : c'est la seule façon de vérifier qu'on demande bien un
 * `folderId` et pas un mot-clé.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'u-1', getIdToken: async () => 'jeton' } },
  db: {},
}))

const BRANCHE = {
  ok: true,
  data: {
    folders: [
      { id: 'f0', name: 'MBA', parentId: null },
      { id: 'f1', name: 'Gouvernance', parentId: 'f0' },
      { id: 'f2', name: 'Stratégie financière', parentId: 'f0' },
      { id: 'f3', name: 'Gouvernance', parentId: 'f0' }, // doublon
    ],
  },
}

/** Journalise les URL appelées, et répond selon l'action demandée. */
function simulerCarre({ folders = BRANCHE, notes = { ok: true, data: [] } } = {}) {
  const appels = []
  global.fetch = vi.fn(async (url) => {
    appels.push(String(url))
    const u = String(url)
    if (u.includes('action=folders')) return { json: async () => folders }
    if (u.includes('action=notes')) return { json: async () => notes }
    if (u.includes('action=note&')) return { json: async () => ({ ok: true, data: { content: 'Contenu de la note.' } }) }
    return { json: async () => ({ ok: true, data: {} }) }
  })
  return appels
}

async function storeRelie() {
  const { useConnecteursStore } = await import('../stores/connecteurs')
  const s = useConnecteursStore()
  s.linked = true
  return s
}

describe('⭐⭐ le store Carré s’importe vraiment (garde-fou de syntaxe)', () => {
  beforeEach(() => { setActivePinia(createPinia()); localStorage.clear() })

  it('le module se charge sans exploser', async () => {
    const mod = await import('../stores/connecteurs')
    expect(typeof mod.useConnecteursStore).toBe('function')
  })

  it('les deux fonctions Carré sont bien EXPOSÉES par le store', async () => {
    // Une fonction définie mais absente du `return` du store est invisible pour
    // les composants — et aucun test textuel ne le voit.
    simulerCarre()
    const s = await storeRelie()
    expect(typeof s.carreArborescence).toBe('function')
    expect(typeof s.carreNotesModule).toBe('function')
    expect(typeof s.carreNotesText).toBe('function')
  })
})

describe('carreArborescence — la branche autorisée', () => {
  beforeEach(() => { setActivePinia(createPinia()); localStorage.clear() })

  it('sépare la racine de ses modules', async () => {
    simulerCarre()
    const { racine, modules } = await (await storeRelie()).carreArborescence()
    expect(racine.nom).toBe('MBA')
    expect(modules.map((m) => m.nom)).toEqual(['Gouvernance', 'Stratégie financière'])
  })

  it('⚠️ non relié : aucune requête, et une réponse vide explicite', async () => {
    const appels = simulerCarre()
    const { useConnecteursStore } = await import('../stores/connecteurs')
    const s = useConnecteursStore()
    s.linked = false
    expect(await s.carreArborescence()).toEqual({ racine: null, modules: [] })
    expect(appels).toHaveLength(0)
  })

  it('⚠️ un lien rompu côté serveur délie le connecteur', async () => {
    simulerCarre({ folders: { ok: false, error: 'non_relie' } })
    const s = await storeRelie()
    await s.carreArborescence()
    expect(s.linked).toBe(false)
  })

  it('un serveur en panne ne fait pas tomber l’appelant', async () => {
    global.fetch = vi.fn(async () => { throw new Error('réseau') })
    const s = await storeRelie()
    await expect(s.carreArborescence()).resolves.toEqual({ racine: null, modules: [] })
  })
})

describe('⭐⭐ carreNotesModule — on cible un DOSSIER, plus un mot-clé', () => {
  beforeEach(() => { setActivePinia(createPinia()); localStorage.clear() })

  it('le folderId du module part bien dans la requête', async () => {
    const appels = simulerCarre({ notes: { ok: true, data: [{ id: 'n1', title: 'Séance 1' }] } })
    const txt = await (await storeRelie()).carreNotesModule('Gouvernance')
    const req = appels.find((u) => u.includes('action=notes'))
    expect(req).toContain('folderId=f1')
    expect(txt).toContain('Séance 1')
  })

  it('la correspondance ignore la casse et les accents', async () => {
    const appels = simulerCarre({ notes: { ok: true, data: [{ id: 'n1', title: 'N' }] } })
    await (await storeRelie()).carreNotesModule('strategie FINANCIERE')
    expect(appels.find((u) => u.includes('action=notes'))).toContain('folderId=f2')
  })

  it('⚠️ matière SANS dossier : on ne renvoie RIEN, on n’invente pas', async () => {
    // Renvoyer les notes d'un autre module ancrerait le quiz sur le mauvais
    // cours — bien pire qu'un quiz cadré par le seul référentiel.
    const appels = simulerCarre()
    expect(await (await storeRelie()).carreNotesModule('Astrophysique')).toBe('')
    expect(appels.some((u) => u.includes('action=notes'))).toBe(false)
  })

  it('non relié : réponse vide immédiate', async () => {
    const appels = simulerCarre()
    const { useConnecteursStore } = await import('../stores/connecteurs')
    const s = useConnecteursStore()
    s.linked = false
    expect(await s.carreNotesModule('Gouvernance')).toBe('')
    expect(appels).toHaveLength(0)
  })
})

describe('carreNotesText — le repli mot-clé ne sert plus qu’aux anciens jetons', () => {
  beforeEach(() => { setActivePinia(createPinia()); localStorage.clear() })

  it('⚠️ avec un folderId, AUCUN mot-clé n’est ajouté', async () => {
    // Sinon un jeton cloisonné se verrait quand même filtré sur un vieux mot
    // enregistré dans le navigateur — et remonterait 0 note sans rien dire.
    localStorage.setItem('mapo_carre_scope', 'MBA')
    const appels = simulerCarre({ notes: { ok: true, data: [] } })
    await (await storeRelie()).carreNotesText({ folderId: 'f1' })
    const req = appels.find((u) => u.includes('action=notes'))
    expect(req).toContain('folderId=f1')
    expect(req).not.toContain('q=MBA')
  })

  it('sans folderId ni requête, l’ancien périmètre est encore appliqué', async () => {
    localStorage.setItem('mapo_carre_scope', 'MBA')
    const appels = simulerCarre({ notes: { ok: true, data: [] } })
    await (await storeRelie()).carreNotesText()
    expect(appels.find((u) => u.includes('action=notes'))).toContain('q=MBA')
  })
})
