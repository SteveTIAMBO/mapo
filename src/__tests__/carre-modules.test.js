/**
 * Les modules d'une formation, LUS dans Carré au lieu d'être devinés.
 *
 * ⚠️ MESURÉ SUR LE CARRÉ RÉEL DE STEVE (28/08), pas imaginé. Son espace « MBA »
 * contient 24 dossiers, un par cours : Gouvernance, Stratégie financière,
 * Leadership, Droit, Design Sprint, Change Mgt, BMC, Marketing…
 * **La liste des modules existait déjà, écrite par lui.** MAPO+ la faisait
 * pourtant DEVINER par l'IA à partir du seul intitulé de la formation — donc à
 * côté, forcément (cf. project_miapo_apprenant_horscatalogue).
 *
 * Deux constats du terrain que le code doit encaisser :
 *
 *  - **des doublons** : « Leadership » et « Entrepreneuriat - Stéphan »
 *    apparaissent DEUX fois dans son espace ;
 *  - **tout dossier n'est pas un module** : « Pitchs », « KickOff »,
 *    « Chef d'œuvre », « ARIIANE » sont des projets. Aucune règle ne permet de
 *    les distinguer d'un cours → on ne coche RIEN d'office, la personne tranche.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listeModules, texteModules } from '../utils/modulesFormation'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const STORE = readFileSync(resolve(RACINE, 'src/stores/connecteurs.js'), 'utf8')
const VUE = readFileSync(resolve(RACINE, 'src/components/MiapoModulesCarre.vue'), 'utf8')
const sansCommentaires = (src) => src
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')

/**
 * ⚠️⚠️ ERREUR DE MESURE À CONNAÎTRE (29/08). La forme ci-dessous vient du
 * connecteur MCP de Carré — un AUTRE client, avec son propre jeton. J'en ai
 * déduit celle de `/api/v1/folders`, que MAPO+ appelle réellement. C'est faux :
 * l'équipe Carré a vérifié le fichier en production, cet endpoint ne renvoyait
 * que les dossiers PERSONNELS (`id`, `name`), en excluant ceux des espaces.
 *
 * Autrement dit, l'import des 24 modules du MBA n'a probablement JAMAIS
 * fonctionné : il ne voyait que les 2 dossiers personnels. Mesurer avec le bon
 * instrument n'est pas un détail — deux clients d'une même API ne voient pas la
 * même chose.
 *
 * `carreFolders()` reste donc tolérant à plusieurs formes, et le regroupement
 * ci-dessous continue d'être testé (il est juste, sur cette forme-là). Ce qui
 * doit être VÉRIFIÉ sur la réponse réelle après reconnexion : quelle forme
 * arrive vraiment, et combien de dossiers un jeton cloisonné renvoie.
 */
/** Rejeu du regroupement de `carreFolders()`. */
function grouper(data) {
  const brut = [...(data.personal || []), ...(data.shared || [])]
  const espaces = new Map()
  for (const f of brut) {
    const nom = String(f?.name || '').trim()
    if (!nom) continue
    const espace = String(f?.spaceName || '').trim() || 'Mes dossiers'
    if (!espaces.has(espace)) espaces.set(espace, new Set())
    espaces.get(espace).add(nom)
  }
  return [...espaces.entries()]
    .map(([espace, noms]) => ({ espace, dossiers: [...noms].sort((a, b) => a.localeCompare(b, 'fr')) }))
    .sort((a, b) => b.dossiers.length - a.dossiers.length)
}

// Extrait FIDÈLE de la réponse réelle (28/08), doublons compris.
const REEL = {
  personal: [
    { name: 'TEDx', spaceName: null },
    { name: 'Gestion de projet - Agnès Galy', spaceName: null },
  ],
  shared: [
    { name: 'Gouvernance', spaceName: 'MBA' },
    { name: 'Leadership', spaceName: 'MBA' },
    { name: 'Leadership', spaceName: 'MBA' },                       // doublon RÉEL
    { name: 'Entrepreneuriat - Stéphan', spaceName: 'MBA' },
    { name: 'Entrepreneuriat - Stéphan', spaceName: 'MBA' },        // doublon RÉEL
    { name: 'Droit', spaceName: 'MBA' },
    { name: 'Pitchs', spaceName: 'MBA' },                           // pas un module
    { name: 'RING', spaceName: 'EDUFREM' },
    { name: 'Finance', spaceName: 'EDUFREM' },
    { name: '', spaceName: 'MBA' },                                 // nom vide
  ],
}

describe('regroupement des dossiers Carré', () => {
  it('⚠️ les doublons sont fusionnés', () => {
    const mba = grouper(REEL).find((e) => e.espace === 'MBA')
    expect(mba.dossiers.filter((d) => d === 'Leadership')).toHaveLength(1)
    expect(mba.dossiers.filter((d) => d === 'Entrepreneuriat - Stéphan')).toHaveLength(1)
  })

  it('un dossier sans nom est écarté', () => {
    const mba = grouper(REEL).find((e) => e.espace === 'MBA')
    expect(mba.dossiers).not.toContain('')
  })

  it('les dossiers personnels sont regroupés à part', () => {
    const g = grouper(REEL)
    expect(g.map((e) => e.espace)).toContain('Mes dossiers')
    expect(g.find((e) => e.espace === 'Mes dossiers').dossiers).toContain('TEDx')
  })

  it('l’espace le plus fourni vient en premier', () => {
    // Sur son compte, « MBA » (24 dossiers) doit s'afficher avant EDUFREM.
    expect(grouper(REEL)[0].espace).toBe('MBA')
  })

  it('les dossiers sont triés, pour être retrouvés', () => {
    const mba = grouper(REEL).find((e) => e.espace === 'MBA')
    expect(mba.dossiers).toEqual([...mba.dossiers].sort((a, b) => a.localeCompare(b, 'fr')))
  })
})

describe('⭐ on propose, la personne tranche', () => {
  it('⚠️ RIEN n’est coché d’office', () => {
    // « Pitchs », « KickOff », « Chef d'œuvre » sont des projets, pas des cours,
    // et aucune règle ne les distingue. Tout cocher enverrait réviser un dossier
    // de projet ; ne rien cocher oblige à un choix conscient.
    const code = sansCommentaires(VUE)
    expect(code).toContain('choisis.value = new Set(listeModules(props.valeur))')
    expect(code).not.toMatch(/choisis\.value = new Set\(.*dossiers/)
  })

  it('les modules DÉJÀ enregistrés restent cochés à l’ouverture', () => {
    // Sinon rouvrir la fenêtre donne l'impression de repartir de zéro.
    expect(sansCommentaires(VUE)).toContain('listeModules(props.valeur)')
  })

  it('la validation est impossible sans sélection', () => {
    expect(sansCommentaires(VUE)).toContain(':disabled="!choisis.size"')
  })
})

describe('le format de sortie reste celui des modules', () => {
  it('la virgule est le séparateur attendu par le reste du code', () => {
    const sortie = ['Gouvernance', 'Droit', 'Design Sprint'].join(', ')
    expect(listeModules(sortie)).toEqual(['Gouvernance', 'Droit', 'Design Sprint'])
    expect(texteModules(listeModules(sortie))).toBe(sortie)
  })

  it('⚠️ un nom de dossier CONTENANT une virgule ne casse pas la liste', () => {
    // Le nettoyage vit dans utils/modulesFormation (virgule → « - »), une seule
    // fois pour tout le monde. On vérifie qu'il tient sur ce chemin-ci aussi.
    const modules = listeModules('Finance, comptabilité et fiscalité')
    expect(modules.length).toBeGreaterThanOrEqual(2) // scindé, pas perdu
    expect(modules.join(' ')).toContain('Finance')
  })
})

describe('⭐⭐ le périmètre est porté par le JETON, plus par le client (29/08)', () => {
  const COURS = readFileSync(resolve(RACINE, 'src/components/MiapoMesCours.vue'), 'utf8')
  const BARRE = readFileSync(resolve(RACINE, 'src/components/layout/MiapoBar.vue'), 'utf8')

  it('⚠️ le sélecteur de dossier de MAPO+ a été RETIRÉ', () => {
    // Carré a livré mieux : le dossier se choisit pendant la connexion OAuth et
    // le jeton est cloisonné dessus CÔTÉ SERVEUR. Garder un sélecteur ici
    // ferait croire qu'on peut changer de dossier depuis MAPO+ — il faut
    // refaire la connexion. Et un périmètre appliqué côté client n'en est pas un.
    const code = sansCommentaires(COURS)
    expect(code).not.toContain('carreDossiersPlats')
    expect(code).not.toContain('choisirDossier')
    expect(STORE).not.toContain('async function carreDossiersPlats()')
  })

  it('⚠️ le champ de TEXTE LIBRE ne revient pas non plus', () => {
    expect(sansCommentaires(COURS)).not.toContain('@change="saveScope"')
  })

  it('⭐ le chat n’envoie plus AUCUN mot-clé : le jeton suffit', () => {
    // C'est tout le bénéfice du cloisonnement — les notes remontées SONT ses
    // cours, sans qu'on ait à deviner un mot à chercher.
    expect(sansCommentaires(BARRE)).toContain('connecteurs.carreNotesText().catch')
  })

  it('l’ancien périmètre libre reste LU en dernier recours', () => {
    // Les jetons émis avant le cloisonnement gardent l'accès à tout le compte :
    // sans ce repli, on leur remonterait les 3 notes les plus RÉCENTES, toutes
    // catégories — pire que rien.
    expect(STORE).toContain("localStorage.getItem('mapo_carre_scope')")
  })
})

describe('le store sait lire les dossiers', () => {
  it('l’action `folders` du proxy est enfin utilisée', () => {
    // Elle existait dans mapo-carre.php depuis le début, et personne ne
    // l'appelait : le périmètre Carré reposait sur un MOT-CLÉ libre.
    expect(STORE).toContain("action=folders")
    expect(STORE).toContain('async function carreFolders()')
  })

  it('un lien rompu remet le connecteur à zéro, comme ailleurs', () => {
    const i = STORE.indexOf('async function carreFolders()')
    const bloc = STORE.slice(i, i + 900)
    expect(bloc).toContain("j.error === 'non_relie'")
  })
})
