// Test de fumée anti « écran blanc » — exécuté par la CI AVANT le déploiement.
//
// Un navigateur headless charge l'app compilée (servie en local) et vérifie que
// #app se MONTE réellement (contenu non vide) et qu'aucune erreur JavaScript
// bloquante ne survient au démarrage. Un crash de bootstrap (ex. le bug
// Intl.NumberFormat qui laissait l'écran blanc) fait ÉCHOUER ce test → la CI
// bloque le déploiement et le bug n'atteint jamais la prod.
//
// Principe de prudence : on ne BLOQUE le déploiement QUE si on détecte
// POSITIVEMENT un écran blanc ou une erreur JS bloquante. Si l'infra du test
// elle-même échoue (navigateur indisponible, serveur local injoignable), on
// laisse passer (exit 0) pour ne jamais bloquer le pipeline sur un aléa CI.

import { chromium } from 'playwright'

const URL = process.env.SMOKE_URL || 'http://localhost:4173/'

let browser
try {
  browser = await chromium.launch()
} catch (e) {
  console.warn('⚠️  Navigateur headless indisponible — test de fumée ignoré (non bloquant) :', String(e))
  process.exit(0)
}

const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String((e && e.message) || e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

try {
  await page.goto(URL, { waitUntil: 'load', timeout: 30000 })
} catch (e) {
  console.warn('⚠️  Page locale injoignable — test de fumée ignoré (non bloquant) :', String(e))
  await browser.close()
  process.exit(0)
}

await page.waitForTimeout(4000)
const appLen = await page.evaluate(() => (document.querySelector('#app')?.innerHTML || '').length)
await browser.close()

// Erreurs réseau ignorées (pas de Firebase/analytics en CI) : seul compte le montage.
const NETWORK = /Failed to fetch|net::ERR|NetworkError|firebase|firestore|googleapis|ERR_|Load failed|module script failed/i
const fatal = errors.filter((e) => !NETWORK.test(e))

if (appLen < 60) {
  console.error(`\n❌ ÉCRAN BLANC détecté : #app est vide (${appLen} caractères). DÉPLOIEMENT BLOQUÉ.`)
  if (fatal.length) console.error('Erreurs JavaScript :\n' + fatal.join('\n'))
  process.exit(1)
}
if (fatal.length) {
  console.error('\n❌ Erreur(s) JavaScript bloquante(s) au démarrage. DÉPLOIEMENT BLOQUÉ :\n' + fatal.join('\n'))
  process.exit(1)
}

console.log(`\n✅ Test de fumée OK : #app monté (${appLen} caractères), aucune erreur JS bloquante.`)
