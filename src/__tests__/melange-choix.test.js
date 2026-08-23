/**
 * Biais de position de la bonne réponse — MESURÉ EN PRODUCTION le 23/08/2026.
 *
 * Sur les 166 questions de la banque partagée `quizBank`, la bonne réponse
 * tombait ainsi : position 1 → 19 %, position 2 → **52 %**, position 3 → 27 %,
 * position 4 → **2 %**. χ² = 84,6 pour 3 degrés de liberté, là où le seuil à
 * 0,1 % est 16,3 : ce n'est pas du hasard.
 *
 * Et le pire n'est pas la moyenne. Plusieurs lots avaient TOUTES leurs
 * réponses au même rang — 7 sur 7, 10 sur 10. Un apprenant qui coche toujours
 * la même colonne « réussit » sa séance, fait monter sa jauge et change de
 * classe sans rien savoir. Le score ne voulait plus rien dire, et la jauge
 * livrée le même jour reposait justement sur lui.
 *
 * Personne ne mélangeait : `shuffleLocal` ne sert qu'au jeu de paires, et le
 * tri de `readBankQuiz` ne brasse que l'ORDRE DES QUESTIONS.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { melangerChoix, melangerLot } from '../stores/tuteur'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const TUTEUR = readFileSync(resolve(RACINE, 'src/stores/tuteur.js'), 'utf8')

const question = (bonne = 1) => ({
  q: 'Combien font 3 + 4 ?',
  choices: ['6', '7', '8', '9'],
  answer: bonne,
  hint: 'Compte sur tes doigts.',
  explanation: '3 + 4 = 7.',
})

describe('la bonne réponse suit son déplacement', () => {
  it('le TEXTE de la bonne réponse reste le même après mélange', () => {
    // Le vrai risque du correctif : déplacer les choix sans bouger l'index,
    // ce qui transformerait des questions justes en questions fausses. Pire
    // que le défaut d'origine.
    for (let i = 0; i < 500; i++) {
      const avant = question(1)
      const apres = melangerChoix(avant)
      expect(apres.choices[apres.answer]).toBe('7')
      expect([...apres.choices].sort()).toEqual(['6', '7', '8', '9'])
    }
  })

  it('fonctionne quelle que soit la position de départ', () => {
    for (const depart of [0, 1, 2, 3]) {
      const attendu = question(depart).choices[depart]
      for (let i = 0; i < 100; i++) {
        const apres = melangerChoix(question(depart))
        expect(apres.choices[apres.answer]).toBe(attendu)
      }
    }
  })

  it('le reste de la question est intact', () => {
    const apres = melangerChoix(question(1))
    expect(apres.q).toBe('Combien font 3 + 4 ?')
    expect(apres.hint).toBe('Compte sur tes doigts.')
    expect(apres.explanation).toBe('3 + 4 = 7.')
  })

  it('la question d’origine n’est pas modifiée sur place', () => {
    // Les questions de la banque sont partagées : les muter en mémoire ferait
    // dériver le cache d'un apprenant à l'autre.
    const avant = question(1)
    melangerChoix(avant)
    expect(avant.choices).toEqual(['6', '7', '8', '9'])
    expect(avant.answer).toBe(1)
  })
})

describe('le biais de position disparaît', () => {
  it('2 000 questions toutes marquées en position 2 se répartissent', () => {
    const positions = [0, 0, 0, 0]
    for (let i = 0; i < 2000; i++) positions[melangerChoix(question(1)).answer]++
    // χ² contre l'uniforme, 3 degrés de liberté. Seuil à 0,1 % = 16,27.
    // La production mesurait 84,6 ; on exige largement mieux.
    const attendu = 2000 / 4
    const chi2 = positions.reduce((s, o) => s + (o - attendu) ** 2 / attendu, 0)
    expect(chi2).toBeLessThan(16.27)
    // Et aucune position ne doit rester quasi vide, comme l'était la 4e (2 %).
    for (const p of positions) expect(p).toBeGreaterThan(2000 * 0.15)
  })

  it('un lot entier passe par le mélange', () => {
    const lot = Array.from({ length: 400 }, () => question(1))
    const positions = [0, 0, 0, 0]
    for (const q of melangerLot(lot)) positions[q.answer]++
    expect(positions.filter((p) => p > 0)).toHaveLength(4)
  })
})

describe('questions mal formées : on ne fabrique rien', () => {
  it('une question sans choix valides ressort telle quelle', () => {
    // Le contrôle de forme vit ailleurs (serveur). Ici, « réparer » une
    // question cassée reviendrait à inventer une bonne réponse.
    for (const cassee of [
      { q: 'x', choices: null, answer: 0 },
      { q: 'x', choices: ['a'], answer: 0 },
      { q: 'x', choices: ['a', 'b'], answer: 5 },
      { q: 'x', choices: ['a', 'b'], answer: -1 },
    ]) {
      expect(melangerChoix(cassee)).toEqual(cassee)
    }
    expect(melangerLot(null)).toBe(null)
  })

  it('une réponse de type CHAÎNE n’est pas convertie en douce', () => {
    // Première version : `Number(q.answer)` — donc `'1'` devenait 1, passait le
    // contrôle d'entier, et la question ressortait avec un type modifié. On ne
    // répare pas une question mal formée, donc on ne la convertit pas non plus.
    const cassee = { q: 'x', choices: ['a', 'b', 'c', 'd'], answer: '1' }
    expect(melangerChoix(cassee)).toEqual(cassee)
    expect(melangerChoix(cassee).answer).toBe('1')
  })
})

/**
 * Le mélange ne sert à rien s'il n'est pas BRANCHÉ. Ces vérifications portent
 * sur le code source parce que les trois sorties de `generateQuiz` passent par
 * le réseau : c'est la même méthode que `quiz-verification.test.js`, qui
 * contrôle les garanties du serveur sans pouvoir exécuter PHP.
 */
describe('le mélange est branché sur TOUS les chemins', () => {
  it('les trois sorties de generateQuiz mélangent', () => {
    for (const sortie of ['socleBanque.slice(0, nombre)', 'retenues.slice(0, nombre)', 'banqueDispo.slice(0, nombre)']) {
      expect(TUTEUR).toContain(`melangerLot(${sortie})`)
    }
  })

  it('aucune sortie ne renvoie de questions sans passer par le mélange', () => {
    const sorties = TUTEUR.match(/return \{ ok: true, questions: [^,]+,/g) || []
    expect(sorties.length).toBeGreaterThan(0)
    for (const s of sorties) expect(s).toMatch(/melangerLot\(/)
  })

  it('le test de positionnement mélange aussi', () => {
    // Il ne passe PAS par generateQuiz, et c'est lui qui fixe le niveau de
    // départ de l'apprenant dans la matière : le biais y coûtait le plus cher.
    expect(TUTEUR).toContain('return { ok: true, questions: melangerLot(valides) }')
  })
})
