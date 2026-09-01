import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useDisciplinesPrimaireStore,
  amorcePays,
  programmeOfficiel,
  DISCIPLINES_PRIMAIRE_NEUTRE,
} from '../stores/disciplinesPrimaire'
import { DISCIPLINES_PRIMAIRE } from '../data/primaire'

/**
 * Disciplines du primaire : celles de l'ÉCOLE, pas celles du Cameroun.
 *
 * Défaut vérifié en démonstration le 23/08/2026 : une école primaire de Dakar
 * recevait les dix disciplines camerounaises — « Langues et cultures
 * nationales », « Développement personnel » — et l'écran Matières n'avait aucun
 * bouton d'ajout en édition primaire. Elle ne pouvait NI reconnaître son
 * programme, NI le corriger.
 */

vi.mock('../firebase', () => ({ db: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  getDoc: async () => ({ exists: () => false, data: () => ({}) }),
  setDoc: async () => {},
}))

describe('amorce par pays', () => {
  it('le Cameroun reçoit son programme officiel, sourcé', () => {
    expect(amorcePays('CM').map((d) => d.name)).toEqual(DISCIPLINES_PRIMAIRE.map((d) => d.name))
    expect(programmeOfficiel('CM')).toBe(true)
  })

  it('⚠️ les autres pays reçoivent une amorce NEUTRE, pas le programme camerounais', () => {
    // Servir une amorce en disant que c'en est une est honnête ; la servir en
    // la présentant comme « le programme officiel » ne l'est pas.
    for (const pays of ['SN', 'FR', 'CG', 'CI', '']) {
      const noms = amorcePays(pays).map((d) => d.name)
      expect(noms).not.toContain('Langues et cultures nationales')
      expect(noms).not.toContain('Développement personnel')
      expect(programmeOfficiel(pays)).toBe(false)
    }
  })

  it('l’amorce neutre ne rattache aucune discipline à un domaine APC', () => {
    // Les cinq domaines pondérés (60/20/10/5/5) sont une construction
    // camerounaise : les afficher ailleurs serait une affirmation de plus.
    expect(DISCIPLINES_PRIMAIRE_NEUTRE.every((d) => !d.domaine)).toBe(true)
  })

  it('l’amorce est une COPIE : la modifier ne contamine pas le programme source', () => {
    const a = amorcePays('CM')
    a[0].name = 'Bidouillé'
    expect(DISCIPLINES_PRIMAIRE[0].name).not.toBe('Bidouillé')
  })
})

describe('l’école modifie sa liste', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDisciplinesPrimaireStore()
    store.liste = null
  })

  it('part de l’amorce tant que rien n’a été modifié', () => {
    expect(store.personnalise).toBe(false)
    expect(store.disciplines.length).toBeGreaterThan(0)
  })

  it('ajoute une discipline, et refuse un doublon', () => {
    expect(store.ajouter('Wolof')).toBe(true)
    expect(store.noms).toContain('Wolof')
    expect(store.personnalise).toBe(true)
    // Refus DIT : sans retour, le bouton paraîtrait sans effet.
    expect(store.ajouter('Wolof')).toBe(false)
    expect(store.ajouter('  wolof  ')).toBe(false) // insensible à la casse et aux espaces
    expect(store.ajouter('   ')).toBe(false)
  })

  it('renomme, sans écraser un intitulé déjà pris', () => {
    store.ajouter('Wolof')
    expect(store.renommer('Wolof', 'Langue nationale')).toBe(true)
    expect(store.noms).toContain('Langue nationale')
    expect(store.renommer('Langue nationale', 'Français')).toBe(false) // déjà pris
    expect(store.renommer('Inexistante', 'Peu importe')).toBe(false)
  })

  it('retire une discipline', () => {
    const avant = store.disciplines.length
    expect(store.retirer('Français')).toBe(true)
    expect(store.disciplines.length).toBe(avant - 1)
    expect(store.noms).not.toContain('Français')
  })

  it('⚠️ refuse de retirer la DERNIÈRE discipline', () => {
    // Une liste vide donnerait un emploi du temps et des bulletins sans contenu,
    // sans rien afficher qui l'explique.
    store.liste = [{ name: 'Français', domaine: '' }]
    expect(store.retirer('Français')).toBe(false)
    expect(store.disciplines).toHaveLength(1)
  })

  it('l’ordre se modifie : c’est celui des bulletins', () => {
    store.liste = [
      { name: 'A', domaine: '' },
      { name: 'B', domaine: '' },
      { name: 'C', domaine: '' },
    ]
    expect(store.deplacer('B', 'haut')).toBe(true)
    expect(store.noms).toEqual(['B', 'A', 'C'])
    expect(store.deplacer('B', 'haut')).toBe(false) // déjà en tête, et on le DIT
    expect(store.deplacer('C', 'bas')).toBe(false)
  })

  it('la réinitialisation ramène l’amorce', () => {
    store.ajouter('Wolof')
    store.reinitialiser()
    expect(store.personnalise).toBe(false)
    expect(store.noms).not.toContain('Wolof')
  })
})

describe('⚠️ « je ne sais pas » n’est pas « Cameroun »', () => {
  /**
   * Défaut vu à l'écran le 23/08 : sur un accès direct à /matieres, les réglages
   * de l'école n'étaient pas chargés. `country` vaut « CM » dans l'état initial
   * du store — une école de Dakar se voyait donc servir les domaines pondérés de
   * l'APC camerounais, avec la mention « référentiel officiel ».
   *
   * Tant que rien n'est chargé, on répond « je ne sais pas », ce qui fait tomber
   * du côté prudent : liste modifiable, aucune affirmation de conformité.
   */
  it('un pays vide ou inconnu ne déclenche jamais le programme officiel', () => {
    expect(programmeOfficiel('')).toBe(false)
    expect(programmeOfficiel(null)).toBe(false)
    expect(programmeOfficiel(undefined)).toBe(false)
  })

  it('et son amorce est la liste neutre, pas la camerounaise', () => {
    const noms = amorcePays('').map((d) => d.name)
    expect(noms).toEqual(DISCIPLINES_PRIMAIRE_NEUTRE.map((d) => d.name))
  })
})

// ── Branchements vérifiés sur le code source ──────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const racineSrc = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('⚠️ aucun écran ne sert la liste camerounaise en dur', () => {
  /**
   * Défaut mesuré le 01/09/2026 : `EmploiDuTempsView` court-circuitait le store
   * avec `DISCIPLINES_PRIMAIRE.map(d => d.name)`. Une école de Dakar qui avait
   * renommé ses matières voyait quand même « TIC » et « Langues et cultures
   * nationales » dans sa grille horaire. Le contournement avait été mis parce que
   * la classification par cycle rangeait SIL-CM2 en « lycée » — mais il a survécu
   * à sa cause, `niveaux.js` sachant désormais répondre.
   */
  const edt = fs.readFileSync(path.join(racineSrc, 'views/EmploiDuTempsView.vue'), 'utf8')
  // ⚠️ On dépouille les commentaires : celui qui explique la correction CITE
  // forcément le nom fautif. Sans ce filtre, le test échouerait sur la
  // documentation du correctif lui-même.
  const edtCode = edt
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')

  it('la grille horaire lit le store, pas la constante', () => {
    expect(edtCode).not.toContain('DISCIPLINES_PRIMAIRE')
    expect(edtCode).toContain('discPrimaireStore.noms')
  })

  it('et elle charge la liste de l’école avant de l’afficher', () => {
    // Sans ça, les matières renommées clignotent vers l'amorce du pays.
    expect(edt).toContain('discPrimaireStore.load()')
  })
})
