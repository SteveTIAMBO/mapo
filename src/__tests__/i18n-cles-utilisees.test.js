/**
 * GARDE-FOU : toute clé de traduction écrite EN DUR dans le code doit exister,
 * en français ET en anglais.
 *
 * ⚠️ POURQUOI IL EXISTE (03/09/2026). Le commit « Indisponibilités : journée /
 * matin / après-midi » a réécrit `fr.json` et `en.json` à partir d'une version
 * antérieure et a **perdu 9 clés** au passage — tout le bilan de calibration
 * métacognitive (`mia.calibTitre`, `calibEcart`, `calibSur`, `calibAide`,
 * `calibMoins`, `calibPlus`, et les trois variantes `*Moi`).
 *
 * L'écran est donc parti EN PRODUCTION avec des libellés vides. Rien ne l'a
 * signalé : vue-i18n ne casse pas sur une clé absente, il rend la clé ou du
 * vide. Aucun test ne l'a vu non plus, parce que les tests visaient chacun leur
 * propre écran — celui de la calibration l'a attrapé, mais par accident : il
 * vérifiait la FORMULATION, pas l'existence.
 *
 * Deux chats travaillent sur ce dépôt (cf. mémoire « deux chats, même dépôt » :
 * l'écrasement s'est déjà produit trois fois). Un test par écran ne suffit donc
 * pas : il faut un test qui couvre TOUTES les clés d'un coup, pour que la perte
 * soit rouge avant d'être en ligne, quel que soit l'écran touché.
 *
 * ⚠️ On ne vérifie QUE les clés littérales. `t('mia.rt_' + rt.key)` est
 * assemblée à l'exécution : la contrôler demanderait d'exécuter le code, et
 * l'approximer produirait des faux positifs — pires qu'une absence de test,
 * parce qu'on finirait par les ignorer.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import fr from '../i18n/locales/fr.json'
import en from '../i18n/locales/en.json'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function fichiers(dir, acc = []) {
  for (const nom of readdirSync(dir)) {
    if (nom === 'node_modules' || nom === '__tests__' || nom === 'locales') continue
    const p = join(dir, nom)
    if (statSync(p).isDirectory()) fichiers(p, acc)
    else if (/\.(vue|js)$/.test(nom)) acc.push(p)
  }
  return acc
}

/** `t('section.cle')` — apostrophes simples ou doubles, littéral uniquement. */
const MOTIF = /\bt\(\s*(['"])([a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z0-9_]+)\1\s*[),]/g

const SOURCES = fichiers(resolve(RACINE, 'src'))

function clesUtilisees() {
  const trouvees = new Map()   // cle → fichier (le premier qui l'utilise)
  for (const f of SOURCES) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(MOTIF)) {
      if (!trouvees.has(m[2])) trouvees.set(m[2], f.slice(RACINE.length + 1))
    }
  }
  return trouvees
}

const existe = (dico, cle) => {
  const [sec, k] = cle.split('.')
  return !!(dico[sec] && Object.prototype.hasOwnProperty.call(dico[sec], k))
}

describe('⭐⭐ aucune clé littérale ne manque', () => {
  const utilisees = clesUtilisees()

  it('le balayage trouve bien des clés (l’instrument fonctionne)', () => {
    // Sans ce contrôle, une regex cassée rendrait le test vert sur zéro clé —
    // un test qui ne vérifie rien et qui rassure.
    expect(utilisees.size).toBeGreaterThan(300)
  })

  it('⚠️ toutes existent en FRANÇAIS', () => {
    const manquantes = [...utilisees].filter(([c]) => !existe(fr, c))
      .map(([c, f]) => `${c}  (${f})`)
    expect(manquantes, `Clés absentes de fr.json :\n${manquantes.join('\n')}`).toEqual([])
  })

  it('⚠️ toutes existent en ANGLAIS — la parité est une règle du projet', () => {
    const manquantes = [...utilisees].filter(([c]) => !existe(en, c))
      .map(([c, f]) => `${c}  (${f})`)
    expect(manquantes, `Clés absentes de en.json :\n${manquantes.join('\n')}`).toEqual([])
  })
})

describe('⭐ les deux dictionnaires portent les mêmes clés', () => {
  it('⚠️ aucune section ne diverge entre FR et EN', () => {
    // Une clé présente d'un seul côté, c'est un écran muet dans une langue.
    const ecarts = []
    for (const sec of new Set([...Object.keys(fr), ...Object.keys(en)])) {
      const a = fr[sec], b = en[sec]
      if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) continue
      for (const k of Object.keys(a)) if (!(k in b)) ecarts.push(`${sec}.${k} : absente de EN`)
      for (const k of Object.keys(b)) if (!(k in a)) ecarts.push(`${sec}.${k} : absente de FR`)
    }
    expect(ecarts, ecarts.join('\n')).toEqual([])
  })
})

describe('⭐⭐ la perte du 03/09 est rejouée', () => {
  it('les 9 clés du bilan de calibration sont là, FR et EN', () => {
    // Elles avaient disparu d'un commit à l'autre, sans que rien ne le dise.
    for (const k of ['calibTitre', 'calibEcart', 'calibMoins', 'calibPlus', 'calibSur',
      'calibAide', 'calibTitreMoi', 'calibEcartMoi', 'calibSurMoi']) {
      expect(existe(fr, 'mia.' + k), 'fr.mia.' + k).toBe(true)
      expect(existe(en, 'mia.' + k), 'en.mia.' + k).toBe(true)
    }
  })
})
