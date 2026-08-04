import { describe, it, expect } from 'vitest'
import fr from '../i18n/locales/fr.json'
import en from '../i18n/locales/en.json'

/**
 * Garde-fou sur la SYNTAXE des traductions.
 *
 * Pourquoi : une adresse e-mail écrite telle quelle dans une traduction
 * (`contact@edufrem.com`) fait planter vue-i18n — il lit le `@` comme le début
 * d'un « message lié » (`@:autre.cle`) et lève `Invalid linked format`. Le
 * composant qui affiche ce texte ne rend alors RIEN : pas d'écran d'erreur, pas
 * de page blanche, juste un panneau vide. C'est arrivé sur la page « Vos données
 * personnelles » — le build passait, la chaîne était bien dans le bundle
 * déployé, et l'écran était vide.
 *
 * Le `@` doit donc être échappé : `contact{'@'}edufrem.com`.
 */

function aplatir(objet, prefixe = '') {
  const sortie = []
  for (const [cle, valeur] of Object.entries(objet)) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle
    if (valeur && typeof valeur === 'object') sortie.push(...aplatir(valeur, chemin))
    else if (typeof valeur === 'string') sortie.push([chemin, valeur])
  }
  return sortie
}

describe.each([['fr', fr], ['en', en]])('traductions %s — syntaxe vue-i18n', (langue, dict) => {
  const entrees = aplatir(dict)

  it('ne contient aucun « @ » non échappé', () => {
    const fautives = entrees
      .filter(([, v]) => /@/.test(v.replace(/\{'@'\}/g, '')))
      .map(([k, v]) => `${k} : ${v}`)
    expect(fautives, `Échapper le @ ainsi : contact{'@'}edufrem.com`).toEqual([])
  })

  it('n’ouvre pas d’accolade sans la refermer', () => {
    // `{name` non fermé casse aussi l'analyse du message.
    const fautives = entrees
      .filter(([, v]) => (v.match(/\{/g) || []).length !== (v.match(/\}/g) || []).length)
      .map(([k]) => k)
    expect(fautives).toEqual([])
  })

  it('a au moins quelques centaines de clés (le fichier n’est pas tronqué)', () => {
    expect(entrees.length).toBeGreaterThan(500)
  })
})

describe('traductions — parité FR / EN', () => {
  it('les deux langues ont exactement les mêmes clés', () => {
    const clesFr = new Set(aplatir(fr).map(([k]) => k))
    const clesEn = new Set(aplatir(en).map(([k]) => k))
    expect([...clesFr].filter((k) => !clesEn.has(k)), 'clés absentes en anglais').toEqual([])
    expect([...clesEn].filter((k) => !clesFr.has(k)), 'clés absentes en français').toEqual([])
  })
})
