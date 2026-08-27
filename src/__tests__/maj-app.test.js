/**
 * Recevoir une nouvelle version sans Cmd+Shift+R — et sans perdre son quiz.
 *
 * ⚠️ CE QUI EXISTAIT DÉJÀ, mesuré AVANT d'écrire une ligne (27/08) : le service
 * worker est en `autoUpdate`, `cleanupOutdatedCaches` est à `true` (workbox
 * supprime donc l'ancien précache à chaque activation), les navigations sont en
 * `NetworkFirst`, et le serveur envoie `no-cache, no-store, must-revalidate`
 * sur `index.html`, `sw.js` et `registerSW.js`. Le cache EST déjà vidé à chaque
 * déploiement — ajouter un vidage général aurait détruit le hors-ligne pour
 * rien, et fait retélécharger 8 Mo à des gens qui paient leur data.
 *
 * Le vrai trou était ailleurs : rien n'allait CHERCHER la nouvelle version tant
 * que l'application restait ouverte, ce qui est le cas normal d'une PWA
 * installée.
 *
 * ⚠️ Et le danger introduit par le correctif : vérifier souvent, c'est
 * recharger souvent. Un rechargement au milieu d'une séance effacerait le
 * travail en cours — on aurait « réparé » un cache au prix d'un quiz perdu.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { doitRecharger, doitVerifier, INTERVALLE_VERIF_MS, INTERVALLE_POLL_MS } from '../utils/majApp'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const VITE = readFileSync(resolve(RACINE, 'vite.config.js'), 'utf8')
const HTACCESS = readFileSync(resolve(RACINE, 'public/.htaccess'), 'utf8')
const MAIN = readFileSync(resolve(RACINE, 'src/main.js'), 'utf8')

describe('⭐ on PROPOSE, on n’impose pas (choix de Steve, 27/08)', () => {
  it('sans mise à jour, on ne touche à rien', () => {
    expect(doitRecharger({ majPrete: false, visible: false })).toBe(false)
    expect(doitRecharger({ majPrete: false, visible: true })).toBe(false)
  })

  it('⭐⭐ onglet VISIBLE : on ne recharge JAMAIS de soi-même', () => {
    // C'est la garantie qui protège une séance de révision commencée : c'est le
    // bouton « Recharger » qui décide, parce que la personne sait, elle, si elle
    // est au milieu de quelque chose.
    expect(doitRecharger({ majPrete: true, visible: true })).toBe(false)
  })

  it('onglet MASQUÉ : on recharge, personne ne le voit', () => {
    // Seule exception, invisible par construction : à son retour la nouvelle
    // version est simplement là, sans qu'on ait eu à lui demander quoi que ce soit.
    expect(doitRecharger({ majPrete: true, visible: false })).toBe(true)
  })

  it('le bandeau existe et porte le bouton', () => {
    const BANDEAU = readFileSync(resolve(RACINE, 'src/components/BandeauMaj.vue'), 'utf8')
    expect(BANDEAU).toContain("t('maj.reload')")
    expect(BANDEAU).toContain('@click="appliquerMaj"')
    expect(BANDEAU).toContain('v-if="majDisponible')
  })

  it('⚠️ et il est monté à la RACINE, pas dans une vue', () => {
    // La mise à jour concerne l'ERP comme MAPO+ ; le monter dans une vue
    // laisserait la moitié des utilisateurs sans moyen d'appliquer la version.
    expect(readFileSync(resolve(RACINE, 'src/App.vue'), 'utf8')).toContain('<BandeauMaj />')
  })
})

describe('on n’interroge pas le serveur en boucle', () => {
  it('la première fois, oui', () => {
    expect(doitVerifier(0, 1_000_000)).toBe(true)
  })

  it('juste après, non', () => {
    const t = 1_000_000
    expect(doitVerifier(t, t + 1000)).toBe(false)
  })

  it('passé le délai, de nouveau', () => {
    const t = 1_000_000
    expect(doitVerifier(t, t + INTERVALLE_VERIF_MS)).toBe(true)
  })

  it('⭐ une vérification par JOUR tant que l’app reste ouverte', () => {
    // Steve, 27/08 : « on n'est pas obligé de mettre la nouvelle version toutes
    // les 30 min, on peut tester tous les jours ». Le retour dans l'application
    // déclenche une vérification en plus, throttlée à 30 min.
    expect(INTERVALLE_POLL_MS).toBe(24 * 60 * 60 * 1000)
    expect(INTERVALLE_VERIF_MS).toBeLessThan(INTERVALLE_POLL_MS)
  })
})

describe('⚠️ ce qui était DÉJÀ en place — à ne pas défaire en croyant réparer', () => {
  it('le service worker se met à jour tout seul', () => {
    expect(VITE).toContain("registerType: 'autoUpdate'")
  })

  it('⭐ workbox supprime l’ancien précache à chaque activation', () => {
    // C'est ÇA, « vider le cache à chaque déploiement ». Inutile d'en rajouter.
    expect(VITE).toContain('cleanupOutdatedCaches: true')
  })

  it('les navigations vont chercher le réseau d’abord', () => {
    expect(VITE).toContain("handler: 'NetworkFirst'")
    expect(VITE).toContain("cacheName: 'app-shell'")
  })

  it('le serveur interdit la mise en cache de l’index et du service worker', () => {
    expect(HTACCESS).toContain('Cache-Control "no-cache, no-store, must-revalidate"')
  })
})

describe('la surveillance est bien branchée au démarrage', () => {
  it('main.js l’appelle', () => {
    expect(MAIN).toContain('surveillerMisesAJour()')
  })

  it('⚠️ et ne recharge plus en dur au controllerchange', () => {
    // L'ancien bloc rechargeait sans condition : c'est lui qui aurait effacé
    // une séance dès qu'on a rendu les vérifications fréquentes.
    const code = MAIN
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')
    expect(code).not.toContain("navigator.serviceWorker.addEventListener('controllerchange'")
  })
})
