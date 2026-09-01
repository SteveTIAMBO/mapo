import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * `/site` n'appartient pas à cette application (01/09/2026).
 *
 * Le site vitrine d'une école est un AUTRE produit, servi sur le même
 * sous-domaine sous `/site/`. Mesuré sur epc1 : `curl` recevait bien la vitrine
 * — le serveur fait son travail — mais le navigateur affichait le TABLEAU DE
 * BORD de l'ERP. Le service worker répondait à la place du serveur, parce que
 * `navigateFallback` vaut `index.html` par défaut.
 *
 * ⚠️ Le défaut ne touche que les personnes ayant DÉJÀ ouvert MAPO sur cette
 * origine — donc l'équipe de l'école, exactement celles qui vérifient si leur
 * site est en ligne. Un visiteur extérieur, lui, voyait la bonne page : c'est
 * ce qui rend ce genre de bogue si facile à démentir.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
const conf = fs.readFileSync(path.join(racine, 'vite.config.js'), 'utf8')

describe('le service worker ne répond plus pour /site', () => {
  it('/site est hors du repli de navigation', () => {
    expect(conf).toContain('navigateFallbackDenylist')
    const i = conf.indexOf('navigateFallbackDenylist')
    expect(conf.slice(i, i + 80)).toContain('/site')
  })

  it('et hors du cache « app-shell »', () => {
    // Sinon la coquille de l'ERP serait servie sous l'URL du site public.
    const i = conf.indexOf("cacheName: 'app-shell'")
    const bloc = conf.slice(Math.max(0, i - 900), i)
    expect(bloc).toContain("!url.pathname.startsWith('/site')")
  })

  it('les exclusions existantes sont préservées', () => {
    // Les proxies PHP et le pont scolarité ne sont pas des navigations d'app :
    // les recouvrir casserait les paiements.
    const i = conf.indexOf("cacheName: 'app-shell'")
    const bloc = conf.slice(Math.max(0, i - 900), i)
    expect(bloc).toContain("!url.pathname.endsWith('.php')")
    expect(bloc).toContain("!url.pathname.startsWith('/scolarite-bridge')")
  })
})
