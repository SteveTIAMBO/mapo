/**
 * Suivi des révisions — jamais de note inventée sur un vrai élève.
 *
 * Constat de l'audit du 02/09 : `RevisionSuiviView.vue` n'avait AUCUN garde
 * `isDemo`. `buildDemoSample()` construisait jusqu'à 16 lignes à partir des
 * VRAIS inscrits — nom, prénom, classe réels — avec une note fabriquée
 * (`4 + ((i * 3 + k * 5) % 6)`) affichée « 7/20 ». Elle partait dès que
 * `real.length === 0`, donc au premier rendu TOUJOURS, et toute l'année dans
 * une école qui n'a pas encore saisi de notes. Le plan de remédiation IA était
 * bâti là-dessus : un enseignant pouvait convoquer un parent pour une note qui
 * n'existe pas.
 *
 * Deux exigences, donc :
 *  1. l'échantillon fabriqué reste derrière `isDemo` ;
 *  2. un tableau vide DIT lequel des trois vides c'est — « pas encore chargé »,
 *     « lecture impossible », « rien à signaler ». Sans quoi « je ne sais pas »
 *     et « tout va bien » s'affichent pareil.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const vue = readFileSync(resolve(ICI, '..', 'views/RevisionSuiviView.vue'), 'utf-8')
const tpl = vue.slice(0, vue.indexOf('<script setup>'))
const code = vue.slice(vue.indexOf('<script setup>'))
// Les commentaires citent le défaut corrigé : les exclure des assertions,
// sinon un test échouerait sur son propre texte d'explication.
const codeNu = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('Suivi révisions : l’échantillon fabriqué', () => {
  it('n’est utilisé que sous isDemo', () => {
    const ligne = codeNu.split('\n').find((l) => l.includes('buildDemoSample()') && !l.includes('function'))
    expect(ligne).toBeTruthy()
    expect(ligne).toContain('isDemo')
  })

  it('hors démo, une liste vide reste vide — aucun repli', () => {
    // La seule affectation de la liste affichée doit retomber sur `[]`.
    const ligne = codeNu.split('\n').find((l) => l.includes('buildDemoSample()') && !l.includes('function'))
    expect(ligne).toMatch(/:\s*\[\]/)
  })

  it('le plan de remédiation IA ne part pas d’un échantillon', () => {
    // Aucun appel à buildDemoSample ailleurs que dans cette unique affectation
    // (la déclaration `function buildDemoSample()` ne compte pas).
    const appels = codeNu.match(/(?<!function\s)buildDemoSample\(\)/g) || []
    expect(appels.length).toBe(1)
  })
})

describe('Suivi révisions : un vide doit se nommer', () => {
  it('distingue « pas encore chargé » de « rien à signaler »', () => {
    expect(code).toContain('notesChargees')
    expect(tpl).toContain('notesLoading')
    expect(tpl).toContain('noDifficulty')
  })

  it('dit quand la lecture des notes a ÉCHOUÉ', () => {
    expect(code).toContain('notesEnEchec')
    expect(tpl).toContain('notesFailed')
  })

  it('les deux drapeaux sont réellement posés par le chargement', () => {
    expect(codeNu).toMatch(/notesChargees\.value\s*=\s*true/)
    expect(codeNu).toMatch(/notesEnEchec\.value\s*=\s*true/)
    // Le succès et l'échec ne doivent pas poser le même drapeau.
    expect(codeNu).toMatch(/\.catch\(/)
  })

  it('l’ordre des messages ne peut pas masquer l’échec', () => {
    // `noDifficulty` (« tout va bien ») doit être le DERNIER recours.
    const iEchec = tpl.indexOf('notesFailed')
    const iCharge = tpl.indexOf('notesLoading')
    const iRien = tpl.indexOf('noDifficulty')
    expect(iEchec).toBeGreaterThan(-1)
    expect(iEchec).toBeLessThan(iRien)
    expect(iCharge).toBeLessThan(iRien)
  })
})

describe('Suivi révisions : les libellés existent dans les deux langues', () => {
  const fr = JSON.parse(readFileSync(resolve(ICI, '..', 'i18n/locales/fr.json'), 'utf-8'))
  const en = JSON.parse(readFileSync(resolve(ICI, '..', 'i18n/locales/en.json'), 'utf-8'))

  it.each(['notesLoading', 'notesFailed', 'noDifficulty', 'scopeUnknown'])('revsuivi.%s', (cle) => {
    expect(fr.revsuivi?.[cle]).toBeTruthy()
    expect(en.revsuivi?.[cle]).toBeTruthy()
  })
})
