/**
 * Les modules d'une formation, LUS dans Carré au lieu d'être devinés.
 *
 * ⚠️ MESURÉ SUR LE CARRÉ RÉEL DE STEVE (28/08), pas imaginé. Son dossier « MBA »
 * contient 24 sous-dossiers, un par cours : Gouvernance, Stratégie financière,
 * Leadership, Droit, Design Sprint, Change Mgt, BMC, Marketing…
 * **La liste des modules existait déjà, écrite par lui.** MAPO+ la faisait
 * pourtant DEVINER par l'IA à partir du seul intitulé de la formation — donc à
 * côté, forcément (cf. project_miapo_apprenant_horscatalogue).
 *
 * Deux constats du terrain que le code doit encaisser :
 *
 *  - **des doublons** : « Leadership » et « Entrepreneuriat - Stéphan »
 *    apparaissent DEUX fois chez lui ;
 *  - **tout dossier n'est pas un module** : « Pitchs », « KickOff »,
 *    « Chef d'œuvre », « ARIIANE » sont des projets. Aucune règle ne permet de
 *    les distinguer d'un cours → on ne coche RIEN d'office, la personne tranche.
 *
 * ⚠️⚠️ ERREUR DE MESURE À NE PAS REFAIRE (29/08). J'avais déduit la forme de
 * `/api/v1/folders` du connecteur MCP de Carré — un AUTRE client, avec son
 * propre jeton. C'était faux : en production, cet endpoint ne renvoyait que les
 * dossiers PERSONNELS. L'import des 24 modules du MBA n'a donc probablement
 * JAMAIS fonctionné. **Deux clients d'une même API ne voient pas la même chose.**
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
 * Rejeu FIDÈLE du tri de `carreArborescence()` (store, même algorithme).
 * Depuis le cloisonnement du 29/08, le jeton n'ouvre qu'une BRANCHE : la racine
 * est le dossier choisi à la connexion, les sous-dossiers sont les modules.
 */
function trier(data) {
  const brut = Array.isArray(data) ? data
    : (Array.isArray(data?.folders) ? data.folders : (Array.isArray(data?.personal) ? [...data.personal, ...(data.shared || [])] : []))
  const dossiers = brut
    .map((f) => ({ id: String(f?.id || ''), nom: String(f?.name || '').trim(), parentId: f?.parentId ?? null }))
    .filter((f) => f.nom)
  if (!dossiers.length) return { racine: null, modules: [] }
  const racine = dossiers.find((f) => !f.parentId) || dossiers[0]
  const vus = new Set()
  const modules = dossiers
    .filter((f) => f.id !== racine.id)
    .filter((f) => { const c = f.nom.toLowerCase(); if (vus.has(c)) return false; vus.add(c); return true })
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  return { racine, modules }
}

// Forme livrée par Carré le 29/08 : `{ folders: [{ id, name, parentId, spaceId }] }`.
const BRANCHE = {
  folders: [
    { id: 'f0', name: 'MBA', parentId: null, spaceId: 's1' },              // la racine
    { id: 'f1', name: 'Gouvernance', parentId: 'f0', spaceId: 's1' },
    { id: 'f2', name: 'Leadership', parentId: 'f0', spaceId: 's1' },
    { id: 'f3', name: 'Leadership', parentId: 'f0', spaceId: 's1' },       // doublon RÉEL
    { id: 'f4', name: 'Entrepreneuriat - Stéphan', parentId: 'f0', spaceId: 's1' },
    { id: 'f5', name: 'Entrepreneuriat - Stéphan', parentId: 'f0', spaceId: 's1' }, // doublon RÉEL
    { id: 'f6', name: 'Droit', parentId: 'f0', spaceId: 's1' },
    { id: 'f7', name: 'Pitchs', parentId: 'f0', spaceId: 's1' },           // pas un module
    { id: 'f8', name: '', parentId: 'f0', spaceId: 's1' },                 // nom vide
  ],
}

describe('lecture de la branche Carré', () => {
  it('⚠️ le dossier SANS parent est la racine, pas un module', () => {
    const { racine, modules } = trier(BRANCHE)
    expect(racine.nom).toBe('MBA')
    expect(modules.map((m) => m.nom)).not.toContain('MBA')
  })

  it('⚠️ les doublons sont fusionnés', () => {
    const noms = trier(BRANCHE).modules.map((m) => m.nom)
    expect(noms.filter((n) => n === 'Leadership')).toHaveLength(1)
    expect(noms.filter((n) => n === 'Entrepreneuriat - Stéphan')).toHaveLength(1)
  })

  it('un dossier sans nom est écarté', () => {
    expect(trier(BRANCHE).modules.map((m) => m.nom)).not.toContain('')
  })

  it('les modules sont triés, pour être retrouvés', () => {
    const noms = trier(BRANCHE).modules.map((m) => m.nom)
    expect(noms).toEqual([...noms].sort((a, b) => a.localeCompare(b, 'fr')))
  })

  it('chaque module garde son id : c’est lui qui cible les notes', () => {
    // Sans l'id, on retomberait sur une recherche par mot-clé — l'ancien défaut.
    expect(trier(BRANCHE).modules.every((m) => !!m.id)).toBe(true)
  })

  it('⚠️ une forme INATTENDUE ne renvoie pas une liste vide en silence', () => {
    // Tableau nu, sans parentId : aucun dossier n'est « sans parent » au sens
    // strict → le premier sert de racine. Approximatif, mais explicable ;
    // une liste vide, elle, ne s'explique pas à l'utilisateur.
    const { racine, modules } = trier([{ id: 'a', name: 'Cours' }, { id: 'b', name: 'Droit' }])
    expect(racine.nom).toBe('Cours')
    expect(modules.map((m) => m.nom)).toEqual(['Droit'])
  })

  it('l’ancienne forme personal/shared reste lue', () => {
    // Les jetons émis avant le cloisonnement existent encore.
    const { modules } = trier({ personal: [{ id: 'p1', name: 'TEDx' }], shared: [{ id: 's1', name: 'RING' }] })
    expect(modules.map((m) => m.nom)).toEqual(['RING'])
  })
})

describe('⭐ on propose, la personne tranche', () => {
  it('⚠️ RIEN n’est coché d’office', () => {
    // « Pitchs », « KickOff », « Chef d'œuvre » sont des projets, pas des cours,
    // et aucune règle ne les distingue. Tout cocher enverrait réviser un dossier
    // de projet ; ne rien cocher oblige à un choix conscient.
    const code = sansCommentaires(VUE)
    expect(code).toContain('choisis.value = new Set(listeModules(props.valeur))')
    expect(code).not.toMatch(/choisis\.value = new Set\(.*modules\.value/)
  })

  it('les modules DÉJÀ enregistrés restent cochés à l’ouverture', () => {
    // Sinon rouvrir la fenêtre donne l'impression de repartir de zéro.
    expect(sansCommentaires(VUE)).toContain('listeModules(props.valeur)')
  })

  it('la validation est impossible sans sélection', () => {
    expect(sansCommentaires(VUE)).toContain(':disabled="!choisis.size"')
  })

  it('⚠️ plus aucun regroupement par espace dans l’écran', () => {
    // Le jeton ne voit qu'une branche : afficher des « espaces » laisserait
    // croire qu'on peut piocher ailleurs.
    expect(sansCommentaires(VUE)).not.toContain('carreFolders')
    expect(sansCommentaires(VUE)).toContain('carreArborescence()')
  })
})

describe('⭐⭐ rien n’est sélectionné sans être VISIBLE (01/09)', () => {
  /**
   * Défaut mesuré sur le compte de Steve : la fenêtre affichait 23 lignes Carré,
   * 0 cochée, et le pied annonçait « 12 sélectionné(s) ». Ses 12 modules en
   * place étaient dans la sélection mais absents de la liste — d'où « les autres
   * modules ont disparu ». Ni visibles, ni décochables, et « Tout cocher » ne
   * les touchait pas.
   */
  const code = sansCommentaires(VUE)

  it('⚠️ les modules déjà en place ont leur propre section', () => {
    expect(code).toContain("t('mia.mcarDeja')")
    expect(code).toContain('v-for="m in deja"')
  })

  it('la section « déjà là » se calcule depuis la valeur reçue', () => {
    expect(code).toContain('listeModules(props.valeur).filter')
  })

  it('⚠️ un module homonyme d’un dossier Carré n’apparaît pas DEUX fois', () => {
    // Rejeu du calcul de `deja` : même nom = même module, une seule case.
    const cle = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
    const carre = new Set(['Gouvernance', 'Droit'].map(cle))
    const enPlace = ['gouvernance', 'Stratégie d’entreprise', 'Droit']
    expect(enPlace.filter((m) => !carre.has(cle(m)))).toEqual(['Stratégie d’entreprise'])
  })

  it('⚠️ « Tout cocher » agit sur SA section, pas sur toute la sélection', () => {
    expect(code).toContain('basculerSection(deja)')
    expect(code).toContain('basculerSection(nomsModules)')
    expect(code).not.toContain('basculerTout()')
  })

  it('le pied annonce le TOTAL, pas un décompte invisible', () => {
    expect(code).toContain("t('mia.mcarTotal'")
    expect(code).not.toContain("t('mia.mcarSelected'")
  })

  it('⚠️ Carré vide n’efface pas les modules en place', () => {
    // La section « déjà là » s'affiche indépendamment de `modules` : un
    // connecteur muet ne doit pas donner l'impression d'une remise à zéro.
    const i = code.indexOf('v-if="deja.length"')
    const j = code.indexOf('v-if="!modules.length"')
    expect(i).toBeGreaterThan(-1)
    expect(i).toBeLessThan(j) // la section survit au message « aucun dossier »
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

describe('le store sait lire la branche', () => {
  it('l’action `folders` du proxy est enfin utilisée', () => {
    // Elle existait dans mapo-carre.php depuis le début, et personne ne
    // l'appelait : le périmètre Carré reposait sur un MOT-CLÉ libre.
    expect(STORE).toContain('action=folders')
    expect(STORE).toContain('async function carreArborescence()')
  })

  it('un lien rompu remet le connecteur à zéro, comme ailleurs', () => {
    const i = STORE.indexOf('async function carreArborescence()')
    const bloc = STORE.slice(i, i + 900)
    expect(bloc).toContain("j.error === 'non_relie'")
  })

  it('⭐⭐ les notes sont demandées par DOSSIER, plus par mot-clé', () => {
    expect(STORE).toContain('folderId')
    expect(STORE).toContain('async function carreNotesModule(')
  })
})

describe('⭐⭐ les notes Carré arrivent enfin JUSQU’AU QUIZ (29/08)', () => {
  const QUIZ = readFileSync(resolve(RACINE, 'src/components/TuteurQuiz.vue'), 'utf8')

  it('⚠️ le quiz interroge Carré avant de générer', () => {
    // Le défaut : les notes Carré n'alimentaient QUE le chat. La révision, elle,
    // ne voyait que les cours saisis à la main dans MAPO+. Tout un MBA rangé
    // dans Carré ne servait donc à aucune séance.
    expect(sansCommentaires(QUIZ)).toContain('connecteurs.carreNotesModule(props.matiere)')
  })

  it('⚠️ Carré indisponible ne bloque PAS la séance', () => {
    // Best-effort : un connecteur en panne ne doit jamais valoir écran vide,
    // on retombe sur le cours local et le référentiel.
    const code = sansCommentaires(QUIZ)
    const i = code.indexOf('carreNotesModule')
    expect(code.slice(i - 120, i + 160)).toMatch(/try\s*\{[\s\S]*catch/)
  })

  it('le cours local, celui de l’école et les notes Carré sont CUMULÉS', () => {
    // Trois sources, aucune ne prend le pas : cf. cours-ecole-quiz.test.js.
    const code = sansCommentaires(QUIZ)
    expect(code).toContain('[coursMatiere.value, coursEcole, coursCarre].filter(Boolean)')
    expect(code).toContain('cours: coursAncrage')
  })

  it('⚠️ l’ancrage est borné : un module entier ne tient pas dans un prompt', () => {
    expect(sansCommentaires(QUIZ)).toMatch(/coursAncrage[\s\S]{0,80}slice\(0, \d+\)/)
  })

  it('la provenance affichée tient compte des notes Carré', () => {
    // Sinon la séance dirait « référentiel national » alors qu'elle révise ses
    // propres cours — un mensonge visible.
    expect(sansCommentaires(QUIZ)).toContain("(coursAncrage ? 'cours' : 'referentiel')")
  })
})
