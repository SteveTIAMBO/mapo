/**
 * Que donnerait CE PDF s'il était importé dans MAPO+ ?
 *
 *   node outils/verifier-pdf-programme.mjs <fichier.pdf>
 *
 * POURQUOI CET OUTIL. L'import d'un programme enchaîne trois décisions, et
 * seule la dernière se voit à l'écran : le PDF a-t-il une couche de texte ?
 * liste-t-il vraiment des modules, ou n'est-ce qu'une plaquette commerciale ?
 * et quelle fenêtre de 4 000 caractères part au modèle ?
 *
 * Répondre « essaie, tu verras » coûte une manipulation dans un vrai compte et
 * des crédits. Ce script rejoue EXACTEMENT la même chaîne, hors ligne et sans
 * toucher à quoi que ce soit — il importe les mêmes fonctions que l'appli.
 *
 * ⚠️ Il ne parle à AUCUN modèle : il montre ce qu'on lui enverrait.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resumerProgramme, contientMaquette, densiteProgramme, BUDGET_TEXTE } from '../src/utils/pdfProgramme.js'

const ICI = dirname(fileURLToPath(import.meta.url))
const chemin = process.argv[2]
if (!chemin) {
  console.error('Usage : node outils/verifier-pdf-programme.mjs <fichier.pdf>')
  process.exit(1)
}

// pdfjs en Node : pas de worker, on le désactive explicitement.
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
pdfjs.GlobalWorkerOptions.workerSrc = resolve(ICI, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')

const data = new Uint8Array(readFileSync(chemin))
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise

const morceaux = []
const nb = Math.min(doc.numPages, 40)
for (let p = 1; p <= nb; p++) {
  const page = await doc.getPage(p)
  const contenu = await page.getTextContent()
  morceaux.push(contenu.items.map((it) => it.str || '').join(' '))
}
const texte = morceaux.join('\n').replace(/[ \t]+/g, ' ').trim()

const ligne = (etiquette, valeur) => console.log(`  ${etiquette.padEnd(34)} ${valeur}`)
console.log(`\nPDF : ${chemin}`)
ligne('pages', `${doc.numPages}${nb < doc.numPages ? ` (${nb} lues)` : ''}`)
ligne('caractères extraits', texte.length)

if (!texte) {
  console.log('\n  VERDICT : PDF SCANNÉ — aucune couche de texte.')
  console.log('  L\'app dirait : « Ce PDF est un scan… Collez le programme, ou saisissez vos modules. »\n')
  process.exit(0)
}

const maquette = contientMaquette(texte)
ligne('densité de vocabulaire', densiteProgramme(texte))
ligne('ressemble à une maquette ?', maquette ? 'OUI' : 'NON')

if (!maquette) {
  console.log('\n  VERDICT : PLAQUETTE — le document présente la formation mais ne liste pas ses modules.')
  console.log('  L\'app REFUSERAIT et dirait de demander le programme détaillé à l\'école.')
  console.log('  (C\'est voulu : sans ça, le modèle inventerait en ayant l\'air d\'avoir lu.)\n')
  process.exit(0)
}

const retenu = resumerProgramme(texte)
console.log(`\n  VERDICT : EXPLOITABLE. Voici les ${Math.min(retenu.length, BUDGET_TEXTE)} caractères`)
console.log('  qui partiraient au modèle — c\'est de CE texte que sortiraient les modules :\n')
console.log('  ' + retenu.slice(0, 1500).replace(/\n/g, '\n  '))
if (retenu.length > 1500) console.log(`\n  […] ${retenu.length - 1500} caractères de plus`)
console.log()
