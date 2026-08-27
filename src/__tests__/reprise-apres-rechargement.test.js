/**
 * Recharger la page ne doit pas tout recommencer.
 *
 * ⚠️ SIGNALÉ PAR STEVE LE 27/08 : « à chaque fois que je recharge la page il
 * repart sur la page d'accueil et me redemande mon humeur ». Deux défauts
 * distincts, qui se ressemblaient à l'écran :
 *
 *  1. MAPO+ tient sur UNE seule route (`/mon-espace`). La « page » courante
 *     n'est qu'un `ref`, invisible de l'URL, donc perdue à chaque F5.
 *  2. « Plus tard » sur le check-in d'humeur n'enregistrait RIEN. Le garde qui
 *     devait éviter d'insister (`humeurOffered`) vivait en mémoire, donc mourait
 *     au rechargement — et `humeurDemandeeAujourdhui` ne regardait que les
 *     humeurs RÉPONDUES. Refuser garantissait donc qu'on redemanderait.
 *     Le seul moyen d'être tranquille était de répondre : une question
 *     facultative devenue péage.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  humeurDemandeeAujourdhui, marquerHumeurProposee, enregistrerHumeur, dayKey,
} from '../utils/humeur'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const VUE = readFileSync(resolve(RACINE, 'src/views/ParentMiapoView.vue'), 'utf8')
const sansCommentaires = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')

beforeEach(() => { localStorage.clear() })

describe('⚠️ un refus compte comme une demande', () => {
  it('sans rien, la question est légitime', () => {
    expect(humeurDemandeeAujourdhui('e1')).toBe(false)
  })

  it('⭐ après « Plus tard », on ne redemande plus aujourd’hui', () => {
    marquerHumeurProposee('e1')
    expect(humeurDemandeeAujourdhui('e1')).toBe(true)
  })

  it('répondre suffit aussi, évidemment', () => {
    enregistrerHumeur('e1', 7)
    expect(humeurDemandeeAujourdhui('e1')).toBe(true)
  })

  it('le refus est daté : demain, on peut redemander', () => {
    localStorage.setItem('mapo_b2c_humeur_proposee_v1_e1', '2020-01-01')
    expect(humeurDemandeeAujourdhui('e1')).toBe(false)
    marquerHumeurProposee('e1')
    expect(localStorage.getItem('mapo_b2c_humeur_proposee_v1_e1')).toBe(dayKey())
  })

  it('chaque apprenant a son propre refus', () => {
    // Un parent qui prête l'appareil : refuser pour l'un ne parle pas pour l'autre.
    marquerHumeurProposee('e1')
    expect(humeurDemandeeAujourdhui('e2')).toBe(false)
  })

  it('⚠️ la trace est posée à la PROPOSITION, pas à la réponse', () => {
    // Sinon le rechargement rouvre la question avant qu'on ait pu y répondre :
    // c'est exactement le défaut qu'on corrige.
    const code = sansCommentaires(VUE)
    const i = code.indexOf('function maybeAskHumeur()')
    const bloc = code.slice(i, code.indexOf('}', code.indexOf('showHumeur.value = true', i)))
    expect(bloc).toContain('marquerHumeurProposee(activeEnfant.value.id)')
  })
})

describe('la page où l’on était est retrouvée', () => {
  it('la section est écrite à chaque changement', () => {
    const code = sansCommentaires(VUE)
    expect(code).toContain("const CLE_SECTION = 'mapo_miapo_section'")
    expect(code).toContain('localStorage.setItem(CLE_SECTION, v)')
  })

  it('et relue au montage', () => {
    expect(sansCommentaires(VUE)).toContain('restaurerSection()')
  })

  it('⚠️ on ne restaure QUE ce qui est encore atteignable dans le menu', () => {
    // Le menu dépend du mode et du niveau : restaurer une section disparue
    // afficherait une page vide, ce qui ressemble à une panne.
    expect(sansCommentaires(VUE)).toContain('if (!SECTIONS.value.some((s) => s.key === voulue)) return')
  })

  it('⚠️ ni les écrans de passage, ni les Paramètres', () => {
    // `fiches` s'atteint depuis un quiz : y rouvrir hors contexte n'a aucun sens.
    // `profil` = les réglages : y rouvrir laisse croire qu'il y a un problème.
    expect(VUE).toContain("const SECTIONS_NON_RESTAURABLES = new Set(['fiches', 'profil'])")
  })
})
