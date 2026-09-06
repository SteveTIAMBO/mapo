/**
 * Jauge de progression — franchir un palier doit se mériter.
 *
 * Défaut d'origine (Steve, 22/08) : un SEUL quiz à 80 % faisait monter d'un
 * palier, donc quatre bonnes séances suffisaient pour quitter le programme de
 * sa classe. Ces tests fixent le RYTHME décidé, pas seulement l'absence de
 * plantage : un nombre de séances qui dérive est une régression silencieuse.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  noteQuestion, deltaJauge, appliquerSeance,
  JAUGE_MAX, JAUGE_APRES_CHUTE, SEUIL_GAIN, SEUIL_PERTE,
} from '../utils/jaugeNiveau'

/** Combien de séances à ce score pour remplir la jauge ? */
function seancesPourUnPalier(score) {
  const d = deltaJauge(score)
  return d > 0 ? Math.ceil(JAUGE_MAX / d) : Infinity
}

describe('Note d’une question selon l’aide utilisée', () => {
  it('trouver seul vaut plus que trouver aidé, qui vaut plus que trouver après un échec', () => {
    const seul = noteQuestion({ juste: true, premierEssai: true, indiceOuvert: false, coursOuvert: false })
    const indice = noteQuestion({ juste: true, premierEssai: true, indiceOuvert: true, coursOuvert: false })
    const cours = noteQuestion({ juste: true, premierEssai: true, indiceOuvert: true, coursOuvert: true })
    const rattrape = noteQuestion({ juste: true, premierEssai: false, indiceOuvert: false, coursOuvert: false })
    expect(seul).toBeGreaterThan(indice)
    expect(indice).toBeGreaterThan(cours)
    expect(cours).toBeGreaterThan(rattrape)
    expect(rattrape).toBeGreaterThan(0)
  })

  it('consulter l’indice coûte peu : c’est un réflexe à encourager, pas une triche', () => {
    const seul = noteQuestion({ juste: true, premierEssai: true })
    const indice = noteQuestion({ juste: true, premierEssai: true, indiceOuvert: true })
    expect(seul - indice).toBeLessThanOrEqual(0.2)
  })

  it('une question ratée ne rapporte rien, quelle que soit l’aide', () => {
    expect(noteQuestion({ juste: false, premierEssai: true })).toBe(0)
    expect(noteQuestion({ juste: false, indiceOuvert: true, coursOuvert: true })).toBe(0)
    expect(noteQuestion(null)).toBe(0)
  })
})

describe('Trois zones : gain, neutre, perte', () => {
  it('la zone d’apprentissage normal ne fait ni gagner ni perdre', () => {
    for (const s of [31, 45, 60, 74, 79]) expect(deltaJauge(s)).toBe(0)
  })

  it('au-dessus du seuil on gagne, en dessous on perd', () => {
    expect(deltaJauge(SEUIL_GAIN + 5)).toBeGreaterThan(0)
    expect(deltaJauge(SEUIL_PERTE - 5)).toBeLessThan(0)
  })

  it('le gain récompense l’excellence, pas seulement le passage du seuil', () => {
    // 100 % doit valoir BEAUCOUP plus que 80 %, sinon viser juste au-dessus du
    // seuil devient la stratégie rationnelle.
    expect(deltaJauge(100)).toBeGreaterThan(deltaJauge(80) * 4)
  })

  it('la perte s’aggrave à mesure qu’on approche de zéro', () => {
    expect(Math.abs(deltaJauge(0))).toBeGreaterThan(Math.abs(deltaJauge(15)) * 2)
  })
})

describe('Rythme décidé : ~40 séances pour un élève régulier', () => {
  // ⚠️ RÉANCRÉ le 06/09/2026 (écart E9). Ce test visait 82 % : c'était le
  // rythme du seuil de gain à 75 %. Depuis que la difficulté vise la fourchette
  // de réussite 80-85 %, 82 % est le MILIEU de la cible — un apprenant qui s'y
  // trouve est exactement où il doit être, et le pousser n'aurait pas de sens.
  // Le repère des ~40 séances est donc porté au HAUT de la fourchette. Ce n'est
  // pas une régression, c'est l'arbitrage rendu : la progression ralentit, et
  // c'est le prix de la cible.
  it('un élève au haut de la fourchette franchit un palier en 30 à 50 séances', () => {
    const n = seancesPourUnPalier(85)
    expect(n).toBeGreaterThanOrEqual(30)
    expect(n).toBeLessThanOrEqual(50)
  })

  it('un élève parfait n’attend pas : une dizaine de séances suffit', () => {
    expect(seancesPourUnPalier(100)).toBeLessThanOrEqual(12)
  })

  it('les 4 séances qui suffisaient autrefois ne suffisent plus', () => {
    // L'ancienne règle : 4 quiz à 80 % → palier 5. Désormais, largement plus.
    expect(seancesPourUnPalier(80)).toBeGreaterThan(20)
  })
})

describe('Passage de palier', () => {
  const MAX = 5

  it('la jauge pleine fait monter d’un palier et REPORTE le trop-plein', () => {
    const r = appliquerSeance({ palier: 2, jauge: 95 }, 100, MAX)
    expect(r.monte).toBe(true)
    expect(r.palier).toBe(3)
    expect(r.jauge).toBeGreaterThan(0) // le surplus n'est pas perdu
    expect(r.jauge).toBeLessThan(JAUGE_MAX)
  })

  it('au sommet de la classe on ne passe pas au palier 6 : on reste plein', () => {
    const r = appliquerSeance({ palier: MAX, jauge: 98 }, 100, MAX)
    expect(r.palier).toBe(MAX)
    expect(r.jauge).toBe(JAUGE_MAX)
    expect(r.auSommet).toBe(true) // c'est ce qui déclenche la proposition
  })

  it('une chute fait redescendre d’un palier sans anéantir le travail', () => {
    const r = appliquerSeance({ palier: 3, jauge: 2 }, 0, MAX)
    expect(r.descend).toBe(true)
    expect(r.palier).toBe(2)
    expect(r.jauge).toBe(JAUGE_APRES_CHUTE) // pas zéro
  })

  it('au palier 1, une mauvaise séance ne peut pas descendre plus bas', () => {
    const r = appliquerSeance({ palier: 1, jauge: 1 }, 0, MAX)
    expect(r.palier).toBe(1)
    expect(r.jauge).toBe(0)
    expect(r.descend).toBe(false)
  })

  it('une séance moyenne ne bouge rien du tout', () => {
    const r = appliquerSeance({ palier: 3, jauge: 40 }, 60, MAX)
    expect(r.palier).toBe(3)
    expect(r.jauge).toBe(40)
    expect(r.delta).toBe(0)
  })
})

/**
 * Barre du module « Ma progression ».
 *
 * Elle valait `niveau × 20`, donc PLEINE dès le palier 5 — alors qu'il reste
 * toute la jauge de ce palier à remplir avant d'être prêt pour l'année
 * suivante. Steve : « je vois juste qu'elle est déjà au niveau 5 en anglais ».
 */
function avancementPct(level, jauge, paliers = 5) {
  const acquis = Math.max(0, Math.min(paliers, level) - 1)
  const encours = Math.max(0, Math.min(100, jauge)) / 100
  return Math.round(((acquis + encours) / paliers) * 100)
}

describe('Avancement affiché dans le programme de la classe', () => {
  it('arriver au palier 5 ne remplit PAS la barre : la jauge reste à faire', () => {
    expect(avancementPct(5, 0)).toBe(80)
    expect(avancementPct(5, 0)).toBeLessThan(100)
  })

  it('la barre n’est pleine qu’au sommet ET jauge pleine', () => {
    expect(avancementPct(5, 100)).toBe(100)
  })

  it('la jauge fait bouger la barre à l’intérieur d’un palier', () => {
    expect(avancementPct(3, 50)).toBeGreaterThan(avancementPct(3, 0))
  })

  it('un profil hérité sans jauge repart du début de son palier', () => {
    expect(avancementPct(5, 0)).toBe(80) // palier conservé, jauge à zéro
  })
})

// ── Cible de réussite (écart E9, arbitrage du 06/09/2026) ───────────────────
//
// Le seuil de gain valait 75 % : la difficulté montait tant que l'apprenant
// dépassait 75 %, donc la réussite d'équilibre s'établissait juste en dessous —
// sous la fourchette de 80 à 85 % retenue par le référentiel.
describe('⭐⭐ la difficulté vise la fourchette 80-85 %', () => {
  it('en dessous de la fourchette, la difficulté ne monte pas', () => {
    // 78 % : l'apprenant est en dessous de la cible, le pousser plus haut
    // aggraverait les choses.
    expect(deltaJauge(78)).toBe(0)
    expect(deltaJauge(79)).toBe(0)
  })

  it('dans la fourchette, on avance mais très lentement', () => {
    // C'est le sens même d'une cible : à 82 % la difficulté est BIEN réglée,
    // l'apprenant est là où il doit être. On ne le pousse pas.
    expect(deltaJauge(82)).toBeGreaterThan(0)
    expect(seancesPourUnPalier(82)).toBeGreaterThan(50)
  })

  it('au-dessus de la fourchette, la montée s’accélère nettement', () => {
    // 92 % : la difficulté est manifestement trop basse, il faut monter vite
    // sous peine d'ennuyer quelqu'un qui maîtrise.
    expect(seancesPourUnPalier(92)).toBeLessThan(seancesPourUnPalier(85) / 2)
    expect(seancesPourUnPalier(100)).toBeLessThanOrEqual(10)
  })

  it('⚠️ la fourchette est une HEURISTIQUE, et le code le dit', () => {
    // Wilson (2019) a dérivé la « règle des 85 % » pour des réseaux de
    // neurones, pas pour des élèves. Le référentiel interdit de la présenter
    // comme un fait sur l'apprentissage humain.
    const SRC = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../utils/jaugeNiveau.js'), 'utf8')
    expect(SRC).toContain('HEURISTIQUE')
    expect(SRC).toContain('réseaux de neurones')
  })
})
