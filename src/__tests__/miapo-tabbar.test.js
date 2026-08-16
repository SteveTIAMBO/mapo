/**
 * Test — barre d'onglets MAPO+ (mobile).
 *
 * Contexte du bug corrigé : MAPO+ n'avait AUCUNE barre basse sur mobile.
 * `MobileBottomBar` (l'ERP) navigue par ROUTES, or tout MAPO+ vit sur une seule
 * route dont les écrans sont pilotés par une variable `section` — la barre de
 * l'ERP ne pouvait donc rien piloter, et elle était de toute façon masquée pour
 * le B2C. Steve l'a remarqué en testant hors ligne, mais le manque était
 * permanent : l'hypothèse « bug hors ligne » était fausse.
 *
 * Ce que ces tests verrouillent : un onglet ne doit JAMAIS pointer vers une
 * section que le persona courant n'a pas.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { markRaw } from 'vue'
import { createI18n } from 'vue-i18n'
import MiapoTabBar from '../components/MiapoTabBar.vue'

const i18n = createI18n({ legacy: false, locale: 'fr', messages: { fr: { mia: { more: 'Plus' } } } })
// markRaw : sans lui, Vue avertit qu'un composant est rendu réactif par les props.
const Ic = markRaw({ render: () => null })
const S = (key) => ({ key, label: key, icon: Ic })

function monter(sections, isApprenant, section = 'accueil') {
  return mount(MiapoTabBar, {
    props: { sections, section, isApprenant },
    global: { plugins: [i18n] },
  })
}

const CLES = (w) => w.findAll('.mtab-it').map((b) => b.text())

describe('Onglets — choisis dans les sections réellement disponibles', () => {
  it('apprenant : réviser et récompenses sont proposés', () => {
    const w = monter([S('accueil'), S('tuteur'), S('historique'), S('progression'), S('recompenses')], true)
    const txt = CLES(w)
    expect(txt).toContain('tuteur')
    expect(txt).toContain('recompenses')
  })

  it('parent : ses enfants, pas le tuteur (il ne révise pas à leur place)', () => {
    const w = monter([S('accueil'), S('enfants'), S('progression'), S('planning'), S('edt')], false)
    const txt = CLES(w)
    expect(txt).toContain('enfants')
    expect(txt).not.toContain('tuteur')
  })

  it('une section ABSENTE n’apparaît jamais en onglet', () => {
    // Écolier relié à MAPO : « Mes notes » (enfants) disparaît du menu. La barre
    // ne doit pas continuer à l'afficher — le clic mènerait à un écran vide.
    const w = monter([S('accueil'), S('tuteur'), S('progression')], true)
    expect(CLES(w)).not.toContain('recompenses')
  })
})

describe('Onglets — la barre reste utilisable', () => {
  it('jamais plus de 5 onglets', () => {
    const many = ['accueil', 'tuteur', 'progression', 'recompenses', 'historique', 'cours', 'edt'].map(S)
    expect(monter(many, true).findAll('.mtab-it')).toHaveLength(5)
  })

  it('aucun onglet « Plus » : le hamburger ouvre déjà le menu complet', () => {
    // Deux chemins vers la même chose = une place gâchée sur la barre.
    const w = monter(['accueil', 'tuteur', 'progression'].map(S), true)
    expect(CLES(w)).not.toContain('Plus')
  })

  it('persona inattendu : on affiche les premières sections plutôt que rien', () => {
    const w = monter([S('zzz'), S('yyy')], true)
    expect(w.findAll('.mtab-it').length).toBeGreaterThan(1)
  })

  it('aucune section : pas de barre vide', () => {
    expect(monter([], true).find('.mtab').exists()).toBe(false)
  })
})

describe('Onglets — navigation', () => {
  it('cliquer émet la section visée, pas une route', () => {
    const w = monter([S('accueil'), S('tuteur'), S('progression'), S('recompenses')], true)
    w.findAll('.mtab-it')[1].trigger('click')
    expect(w.emitted('aller')[0]).toEqual(['tuteur'])
  })

  it('l’onglet courant est signalé aux lecteurs d’écran', () => {
    const w = monter([S('accueil'), S('tuteur')], true, 'tuteur')
    expect(w.findAll('.mtab-it')[1].attributes('aria-current')).toBe('page')
    expect(w.findAll('.mtab-it')[0].attributes('aria-current')).toBeUndefined()
  })
})
