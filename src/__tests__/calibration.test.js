/**
 * Calibration métacognitive — pilier P11, écart E7 du référentiel.
 *
 * L'EEF classe la métacognition en impact élevé, coût faible, preuve solide.
 * Ces tests vérifient les trois choses qui peuvent réellement mal tourner :
 * le calcul, la retenue (ne rien dire quand on ne sait pas), et la formulation
 * (sur la tâche, jamais sur la personne — Kluger et DeNisi 1996).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  historiqueCalibration, enregistrerSeanceCalibration, effacerCalibration,
  calibration, messageCalibration,
} from '../utils/calibration'

const seance = (prevu, reussi, total, reponses = []) => ({ matiere: 'Mathématiques', prevu, reussi, total, reponses })
const rep = (sur, juste) => ({ sur, juste })

describe('enregistrement', () => {
  beforeEach(() => localStorage.clear())

  it('une séance est stockée avec ses compteurs, pas le détail', () => {
    enregistrerSeanceCalibration('e1', seance(8, 6, 10, [rep(true, true), rep(true, false), rep(false, true)]))
    const [s] = historiqueCalibration('e1')
    expect(s.prevu).toBe(8)
    expect(s.reussi).toBe(6)
    expect(s.surTotal).toBe(2)
    expect(s.surJustes).toBe(1)
    expect(s.pasSurTotal).toBe(1)
    // ⚠️ Minimisation (référentiel 5.4) : aucune trace question par question.
    expect(s.reponses).toBeUndefined()
  })

  it('⚠️ une séance sans total valide est ignorée, sans planter', () => {
    expect(() => enregistrerSeanceCalibration('e1', seance(5, 3, 0))).not.toThrow()
    expect(historiqueCalibration('e1')).toEqual([])
  })

  it('une prédiction absente reste absente — on n’invente pas un zéro', () => {
    enregistrerSeanceCalibration('e1', seance(null, 6, 10))
    expect(historiqueCalibration('e1')[0].prevu).toBeNull()
  })

  it('les profils ne se mélangent pas, et un cache illisible vaut vide', () => {
    enregistrerSeanceCalibration('e1', seance(8, 6, 10))
    expect(historiqueCalibration('e2')).toEqual([])
    localStorage.setItem('mapo_b2c_calibration_e3', 'pas du JSON')
    expect(historiqueCalibration('e3')).toEqual([])
  })

  it('⭐ RGPD : la calibration s’efface', () => {
    enregistrerSeanceCalibration('e1', seance(8, 6, 10))
    effacerCalibration('e1')
    expect(historiqueCalibration('e1')).toEqual([])
  })

  it('l’historique est borné', () => {
    for (let i = 0; i < 50; i++) enregistrerSeanceCalibration('e1', seance(5, 5, 10))
    expect(historiqueCalibration('e1').length).toBeLessThanOrEqual(40)
  })
})

describe('⭐⭐ la synthèse se tait quand elle ne sait pas', () => {
  beforeEach(() => localStorage.clear())

  it('⚠️ une seule séance ne fait pas une tendance', () => {
    // Même règle que le seuil de la ligue : afficher une tendance calculée sur
    // un point, c'est donner du bruit pour un fait.
    enregistrerSeanceCalibration('e1', seance(9, 3, 10))
    expect(calibration('e1')).toBeNull()
    expect(messageCalibration('e1')).toBe('')
  })

  it('à partir de deux séances, la synthèse existe', () => {
    enregistrerSeanceCalibration('e1', seance(8, 6, 10))
    enregistrerSeanceCalibration('e1', seance(8, 6, 10))
    expect(calibration('e1').seances).toBe(2)
  })

  it('⚠️ un écart de 1 sur 10 ne déclenche AUCUN message', () => {
    // C'est du bruit. Commenter reviendrait à fabriquer du sens.
    enregistrerSeanceCalibration('e1', seance(7, 6, 10))
    enregistrerSeanceCalibration('e1', seance(7, 6, 10))
    expect(calibration('e1').ecartMoyen).toBe(1)
    expect(messageCalibration('e1')).toBe('')
  })
})

describe('les deux mesures', () => {
  beforeEach(() => localStorage.clear())

  it('⭐ surestimation : écart positif', () => {
    enregistrerSeanceCalibration('e1', seance(9, 5, 10))
    enregistrerSeanceCalibration('e1', seance(9, 5, 10))
    const c = calibration('e1')
    expect(c.ecartMoyen).toBe(4)
    expect(messageCalibration('e1')).toContain('moins de questions que tu ne l’annonçais')
  })

  it('sous-estimation : écart négatif, et le message encourage à viser plus haut', () => {
    enregistrerSeanceCalibration('e1', seance(4, 8, 10))
    enregistrerSeanceCalibration('e1', seance(4, 8, 10))
    expect(calibration('e1').ecartMoyen).toBe(-4)
    expect(messageCalibration('e1')).toContain('plus que tu ne le crois')
  })

  it('⭐⭐ justesse quand il se dit sûr — la mesure la plus actionnable', () => {
    // Elle distingue une lacune (il sait qu'il ne sait pas) d'une illusion
    // (il croit savoir). C'est le mécanisme décrit par Bastani et al. 2025.
    const faux = Array.from({ length: 6 }, () => rep(true, false))
    const justes = Array.from({ length: 4 }, () => rep(true, true))
    enregistrerSeanceCalibration('e1', seance(null, 4, 10, [...faux, ...justes]))
    enregistrerSeanceCalibration('e1', seance(null, 4, 10, [...faux, ...justes]))
    const c = calibration('e1')
    expect(c.surTotal).toBe(20)
    expect(c.tauxQuandSur).toBe(40)
    expect(messageCalibration('e1')).toContain('40 %')
  })

  it('⚠️ moins de 5 réponses « sûr » : pas de message sur ce point', () => {
    enregistrerSeanceCalibration('e1', seance(null, 1, 10, [rep(true, false), rep(true, false)]))
    enregistrerSeanceCalibration('e1', seance(null, 1, 10, []))
    expect(messageCalibration('e1')).toBe('')
  })

  it('une calibration fiable est dite comme telle, et sert à planifier', () => {
    const r = Array.from({ length: 10 }, () => rep(true, true))
    enregistrerSeanceCalibration('e1', seance(null, 10, 10, r))
    enregistrerSeanceCalibration('e1', seance(null, 10, 10, r))
    expect(messageCalibration('e1')).toContain('organiser tes révisions')
  })
})

describe('⭐⭐ formulation : sur la tâche, jamais sur la personne', () => {
  beforeEach(() => localStorage.clear())

  it('⚠️ aucun message ne porte de jugement sur l’apprenant', () => {
    // Kluger et DeNisi 1996 : c'est le déplacement vers le soi qui dégrade.
    // « Tu te surestimes » et « tu es lucide » sont deux jugements, pas un.
    const cas = [
      [seance(9, 5, 10), seance(9, 5, 10)],
      [seance(4, 8, 10), seance(4, 8, 10)],
      [seance(null, 4, 10, Array.from({ length: 8 }, () => rep(true, false))),
       seance(null, 4, 10, Array.from({ length: 8 }, () => rep(true, false)))],
    ]
    const interdits = /tu te surestimes|tu es lucide|tu es (bon|fort|faible|nul|doué)|tu manques de/i
    for (const paire of cas) {
      localStorage.clear()
      paire.forEach((s) => enregistrerSeanceCalibration('e1', s))
      const m = messageCalibration('e1')
      expect(m, m).not.toMatch(interdits)
    }
  })

  it('chaque message dit quoi FAIRE, pas seulement ce qui est constaté', () => {
    enregistrerSeanceCalibration('e1', seance(9, 5, 10))
    enregistrerSeanceCalibration('e1', seance(9, 5, 10))
    expect(messageCalibration('e1')).toContain('teste-toi')
  })

  it('parité FR/EN', () => {
    enregistrerSeanceCalibration('e1', seance(9, 5, 10))
    enregistrerSeanceCalibration('e1', seance(9, 5, 10))
    const en = messageCalibration('e1', { en: true })
    expect(en).toContain('lower than you predicted')
    expect(en).not.toMatch(/tu /)
  })
})
