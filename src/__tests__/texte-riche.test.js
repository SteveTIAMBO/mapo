/**
 * Mise en forme des explications — retour de Steve du 16/08/2026.
 *
 * « Arrêter de mettre des apostrophes partout autour des exemples, mettre en
 * gras à la place. » Le défaut était double : le modèle entourait les termes
 * d'apostrophes, ET l'application n'aurait rien pu afficher d'autre, les
 * explications étant interpolées en texte brut.
 *
 * Ce que ces tests protègent :
 *  1. le découpage, y compris ses cas tordus (marque non refermée, gras vide) ;
 *  2. l'ABSENCE de `v-html` — le texte vient d'un modèle, l'injecter comme du
 *     HTML ouvrirait une porte à du script dans l'écran d'un enfant ;
 *  3. le fait que le prompt demande bien du gras et interdise les apostrophes.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import TexteRiche from '../components/TexteRiche.vue'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const rendu = (texte) => mount(TexteRiche, { props: { texte } })

describe('⭐⭐ le gras est rendu, le reste est du texte', () => {
  it('met en gras ce qui est entre doubles astérisques', () => {
    const w = rendu('Le dénominateur indique en combien de **parts égales** le tout est divisé.')
    expect(w.findAll('strong')).toHaveLength(1)
    expect(w.find('strong').text()).toBe('parts égales')
    expect(w.text()).toBe('Le dénominateur indique en combien de parts égales le tout est divisé.')
  })

  it('gère plusieurs passages en gras', () => {
    const w = rendu('**Numérateur** en haut, **dénominateur** en bas.')
    expect(w.findAll('strong').map((s) => s.text())).toEqual(['Numérateur', 'dénominateur'])
  })

  it('un texte sans marque reste intact', () => {
    const w = rendu('Une fraction représente une part d’un tout.')
    expect(w.findAll('strong')).toHaveLength(0)
    expect(w.text()).toBe('Une fraction représente une part d’un tout.')
  })

  it('une marque jamais refermée n’avale pas la fin de la phrase', () => {
    const w = rendu('Attention au **dénominateur qui reste affiché.')
    expect(w.findAll('strong')).toHaveLength(0)
    expect(w.text()).toBe('Attention au **dénominateur qui reste affiché.')
  })

  it('ne fabrique pas un gras vide', () => {
    const w = rendu('Deux astérisques ****  isolées.')
    expect(w.findAll('strong')).toHaveLength(0)
  })

  it('un texte vide ne casse rien', () => {
    expect(rendu('').text()).toBe('')
  })
})

describe('⭐⭐ aucune porte ouverte à l’injection', () => {
  it('le HTML du modèle reste du texte, jamais du balisage', () => {
    const w = rendu('Avant <script>alert(1)</script> et **après**')
    expect(w.find('script').exists()).toBe(false)
    expect(w.text()).toContain('<script>alert(1)</script>')
  })

  it('le composant n’utilise pas v-html', () => {
    // On cherche l'USAGE, pas le mot : l'en-tête du fichier explique justement
    // pourquoi `v-html` est proscrit ici.
    const src = readFileSync(resolve(RACINE, 'src/components/TexteRiche.vue'), 'utf8')
    expect(src).not.toMatch(/v-html\s*=/)
    expect(src).not.toMatch(/innerHTML\s*=/)
  })
})

describe('⭐ l’explication passe bien par ce rendu', () => {
  const QUIZ = readFileSync(resolve(RACINE, 'src/components/TuteurQuiz.vue'), 'utf8')

  it('l’explication, l’indice et l’exemple travaillé sont mis en forme', () => {
    expect(QUIZ).toContain('<TexteRiche :texte="current.explanation')
    expect(QUIZ).toContain('<TexteRiche :texte="current.hint" />')
    expect(QUIZ).toContain('<TexteRiche :texte="exemple.explanation" />')
  })

  it('le dos des cartes mémoire aussi', () => {
    const FICHES = readFileSync(resolve(RACINE, 'src/components/MiapoFiches.vue'), 'utf8')
    expect(FICHES).toContain('<TexteRiche :texte="cards[cardIdx].verso" />')
  })

  it('le prompt demande du gras et interdit les apostrophes de mise en valeur', () => {
    const PHP = readFileSync(resolve(RACINE, 'server/mapo-ia.php'), 'utf8')
    expect(PHP).toContain('la SEULE marque autorisée est le gras')
    expect(PHP).toContain("N'entoure PAS les exemples ni les termes d'apostrophes")
    // Le LaTeX reste interdit : l'application n'en affiche toujours pas.
    expect(PHP).toContain('AUCUN LaTeX')
  })
})
